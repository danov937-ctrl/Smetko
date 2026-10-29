<?php
/* Резултати от анкетата за затворения тест (anketa.html → api/survey.php).
   Обобщение по въпроси (с филтър родители/учители), NPS, готовност за плащане, свободни отговори, CSV. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$spec = json_decode((string)file_get_contents(__DIR__ . '/../api/survey_q.json'), true) ?: ['questions' => []];
$Q = []; foreach ($spec['questions'] as $q) $Q[$q['id']] = $q;
$roles = $Q['role']['opts'] ?? [];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && post('action') === 'delete') {
    $pdo->prepare('DELETE FROM survey WHERE id = ?')->execute([(int)post('id')]);
    audit('Изтрит отговор от анкетата', '#' . (int)post('id'));
    flash('Отговорът е изтрит.'); go('anketa.php' . (isset($_GET['g']) ? '?g=' . urlencode((string)$_GET['g']) : ''));
}

$g = (string)($_GET['g'] ?? ''); if (!in_array($g, ['', 'parent', 'teacher'], true)) $g = '';
$st = $pdo->prepare('SELECT * FROM survey' . ($g ? ' WHERE grp = ?' : '') . ' ORDER BY id DESC'); $st->execute($g ? [$g] : []);
$rows = $st->fetchAll();
foreach ($rows as &$r) $r['a'] = json_decode((string)$r['answers'], true) ?: [];
unset($r);

$label = function (array $q, $v): string {
    if (in_array($q['kind'], ['one', 'many'], true)) return implode('; ', array_map(fn($i) => $q['opts'][$i] ?? '?', (array)$v));
    return is_array($v) ? implode('; ', $v) : (string)$v;
};

// ---------- CSV ----------
if (isset($_GET['csv'])) {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="smetko-anketa-' . date('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'w'); fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, array_merge(['№', 'Дата', 'С код за достъп'], array_map(fn($q) => $q['q'], $Q)), ';');
    foreach ($rows as $r) {
        $line = [$r['id'], substr((string)$r['updated_at'], 0, 16), $r['access'] ? 'да' : 'не'];
        foreach ($Q as $id => $q) $line[] = isset($r['a'][$id]) ? $label($q, $r['a'][$id]) : '';
        fputcsv($out, $line, ';');
    }
    exit;
}

// ---------- обобщение ----------
$n = count($rows);
$cnt = fn(string $grp) => count(array_filter($rows, fn($r) => $r['grp'] === $grp));
$npsVals = array_values(array_filter(array_map(fn($r) => $r['a']['nps'] ?? null, $rows), fn($v) => $v !== null));
$nps = $npsVals ? round((count(array_filter($npsVals, fn($v) => $v >= 9)) - count(array_filter($npsVals, fn($v) => $v <= 6))) / count($npsVals) * 100) : null;
$payQ = array_values(array_filter(array_map(fn($r) => $r['a']['p_pay'] ?? null, $rows), fn($v) => $v !== null));
$payYes = $payQ ? round(count(array_filter($payQ, fn($v) => $v <= 1)) / count($payQ) * 100) : null;
$kpi = fn($v, $l, $s = '') => '<div class="kpi"><b>' . $v . '</b><span>' . $l . '</span>' . ($s ? '<small>' . $s . '</small>' : '') . '</div>';
$url = SITE_URL . '/anketa.html';
$body = '<div class="card"><h2>Линк към анкетата</h2><p>Пратете го на участниците в теста. Показва се и като покана в „Табло“, в профила на родителя и на страница „Абонаменти“.</p>' .
    '<div class="row"><input id="sv-url" readonly value="' . h($url) . '" style="flex:1;min-width:220px"><button type="button" class="btn sm" data-copy="sv-url">Копирай</button></div>' .
    '<p class="hint">За учители: <b>' . h($url) . '?r=teacher</b> · за родители: <b>' . h($url) . '?r=parent</b> (ролята е избрана предварително).</p></div>' .
    '<div class="row noprint" style="margin:12px 0">' . implode('', array_map(fn($x) => '<a class="btn sm ' . ($x[0] === $g ? '' : 'ghost') . '" href="?' . ($x[0] ? 'g=' . $x[0] : '') . '">' . $x[1] . '</a>', [['', 'Всички'], ['parent', 'Родители'], ['teacher', 'Учители']])) .
    '<a class="btn sm ghost" href="?csv=1' . ($g ? '&g=' . $g : '') . '">⬇ CSV за Excel</a></div>' .
    '<div class="kpis">' . $kpi($n, 'отговора', $g ? '' : $cnt('parent') . ' родители · ' . $cnt('teacher') . ' учители') .
    $kpi($nps === null ? '–' : ($nps > 0 ? '+' : '') . $nps, 'NPS', $npsVals ? 'препоръка, от −100 до +100 (' . count($npsVals) . ' отг.)' : '') .
    $kpi($payYes === null ? '–' : $payYes . '%', 'родители: биха платили', $payQ ? '„Да“ + „Може би“' : '') .
    $kpi(count(array_filter($rows, fn($r) => (int)$r['access'] === 1)), 'с код за достъп', 'от участниците в теста') . '</div>';

if (!$n) $body .= '<div class="card"><p class="muted">Още няма отговори.</p></div>';
else {
    $cards = '';
    foreach ($Q as $id => $q) {
        if (in_array($q['kind'], ['text', 'email'], true)) continue;
        if ($g && $q['who'] !== 'all' && $q['who'] !== $g) continue;
        $vals = array_values(array_filter(array_map(fn($r) => $r['a'][$id] ?? null, $rows), fn($v) => $v !== null));
        if (!$vals) continue;
        $tot = count($vals);
        if ($q['kind'] === 'scale' || $q['kind'] === 'nps') { $lo = $q['kind'] === 'scale' ? 1 : 0; $hi = $q['kind'] === 'scale' ? 5 : 10; $opts = []; for ($v = $lo; $v <= $hi; $v++) $opts[$v] = (string)$v; }
        else $opts = $q['opts'];
        $c = array_fill_keys(array_keys($opts), 0);
        foreach ($vals as $v) foreach ((array)$v as $x) if (isset($c[$x])) $c[$x]++;
        $mx = max(1, max($c));
        $avg = in_array($q['kind'], ['scale', 'nps'], true) ? ' · средно <b>' . number_format(array_sum($vals) / $tot, 1, ',', '') . '</b>' : '';
        $cards .= '<div class="card"><h3 style="margin:0 0 4px">' . h($q['q']) . '</h3><p class="hint" style="margin:0 0 8px">' . $tot . ' отговора' . ($q['kind'] === 'many' ? ' (може няколко)' : '') . $avg . '</p><table><tbody>' .
            implode('', array_map(fn($k) => '<tr><td>' . h($opts[$k]) . '<div class="sbar"><i style="width:' . round($c[$k] / $mx * 100) . '%"></i></div></td><td class="num">' . $c[$k] . '</td><td class="num muted">' . round($c[$k] / $tot * 100) . '%</td></tr>', array_keys($opts))) . '</tbody></table></div>';
    }
    $body .= '<div class="grid g2">' . $cards . '</div>';
    // свободни отговори
    $txt = '';
    foreach ($rows as $r) {
        $parts = [];
        foreach (['best' => 'Харесва', 'missing' => 'Липсва / да подобрим'] as $k => $l) if (!empty($r['a'][$k])) $parts[] = '<p style="margin:4px 0"><b>' . $l . ':</b> ' . nl2br(h($r['a'][$k])) . '</p>';
        if (!$parts && empty($r['email'])) continue;
        $txt .= '<div class="card" style="margin-bottom:10px"><div class="row" style="justify-content:space-between"><span class="muted">#' . (int)$r['id'] . ' · ' . h($roles[(int)$r['role']] ?? '') . ' · ' . fdate(substr((string)$r['updated_at'], 0, 10)) .
            (isset($r['a']['nps']) ? ' · NPS ' . (int)$r['a']['nps'] : '') . ($r['email'] ? ' · <a href="mailto:' . h($r['email']) . '">' . h($r['email']) . '</a>' : '') . '</span>' .
            '<form method="post" style="margin:0">' . csrf_field() . '<input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="' . (int)$r['id'] . '"><button class="btn sm ghost" data-confirm="Да изтрия ли този отговор?">Изтрий</button></form></div>' . implode('', $parts) . '</div>';
    }
    $body .= '<h2 style="margin-top:24px">Свободни отговори</h2>' . ($txt ?: '<p class="muted">Още няма.</p>');
}
$body .= '<p class="hint">Анкетата е анонимна: не се пазят IP адреси. Имейл има само ако човекът сам го е написал. Ако някой попълни анкетата пак от същия браузър или акаунт, отговорите му се обновяват (не се броят два пъти).</p>' .
    '<style>.sbar{height:6px;background:#EEF3FB;border-radius:9px;margin-top:4px}.sbar i{display:block;height:100%;background:#FF7B00;border-radius:9px}</style>';
page('Анкета', $body);
