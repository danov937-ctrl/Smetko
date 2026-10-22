<?php
/* Табло: основните числа на един поглед. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$one = function (string $sql, array $a = []) use ($pdo) { $st = $pdo->prepare($sql); $st->execute($a); return $st->fetchColumn(); };
$today = today();
$stud = "COALESCE(c.role,'student') <> 'teacher'";
$ago = fn(int $d) => gmdate('Y-m-d H:i:s', time() - $d * 86400);
$syStart = ((int)date('n') >= 9 ? date('Y') : (int)date('Y') - 1) . '-09-01';

$k = [
    'codes' => (int)$one("SELECT COUNT(*) FROM codes c WHERE $stud"),
    'act' => (int)$one("SELECT COUNT(DISTINCT r.code) FROM redemptions r JOIN codes c ON c.code = r.code WHERE $stud"),
    'd1' => (int)$one('SELECT COUNT(*) FROM redemptions WHERE last_seen >= ?', [$ago(1)]),
    'd7' => (int)$one('SELECT COUNT(*) FROM redemptions WHERE last_seen >= ?', [$ago(7)]),
    'd30' => (int)$one('SELECT COUNT(*) FROM redemptions WHERE last_seen >= ?', [$ago(30)]),
    'new7' => (int)$one('SELECT COUNT(*) FROM redemptions WHERE created_at >= ?', [$ago(7)]),
    'schools' => (int)$one('SELECT COUNT(*) FROM schools'),
    'accounts' => (int)$one('SELECT COUNT(*) FROM accounts'), 'acc7' => (int)$one("SELECT COUNT(*) FROM accounts WHERE created_at >= datetime('now', '-7 days')"),
    'classes' => (int)$one("SELECT COUNT(*) FROM batches WHERE type = 'class'"),
    'answers' => (int)$one('SELECT COALESCE(SUM(answered), 0) FROM redemptions'),
    'flags' => (int)$one('SELECT COUNT(*) FROM redemptions WHERE flags > 0 AND hidden = 0'),
    'rev_m' => (float)$one("SELECT COALESCE(SUM(amount), 0) FROM orders WHERE status IN ('paid','done') AND substr(COALESCE(paid_at, created_at), 1, 7) = ?", [date('Y-m')]),
    'rev_y' => (float)$one("SELECT COALESCE(SUM(amount), 0) FROM orders WHERE status IN ('paid','done') AND COALESCE(paid_at, created_at) >= ?", [$syStart]),
    'unpaid' => (int)$one("SELECT COUNT(*) FROM orders WHERE status IN ('new','codes','sent')"),
];
$kpi = fn($v, $l, $s = '') => '<div class="kpi"><b>' . $v . '</b><span>' . $l . '</span>' . ($s ? '<small>' . $s . '</small>' : '') . '</div>';
$body = '<div class="kpis">' .
    $kpi($k['act'] . ' <small style="display:inline;color:#7A879F;font-size:.9rem">/ ' . $k['codes'] . '</small>', 'активирани кода', $k['new7'] ? '+' . $k['new7'] . ' за 7 дни' : '') .
    $kpi($k['d1'], 'играли днес') . $kpi($k['d7'], 'играли за 7 дни') . $kpi($k['d30'], 'играли за 30 дни') .
    $kpi(number_format($k['answers'], 0, '.', ' '), 'решени задачи') .
    $kpi($k['schools'] . ' / ' . $k['classes'], 'училища / класа') .
    $kpi('<a href="akaunti.php">' . $k['accounts'] . '</a>', 'акаунта (родители и учители)', $k['acc7'] ? '+' . $k['acc7'] . ' за 7 дни' : '') .
    $kpi(money($k['rev_m']), 'приходи този месец') . $kpi(money($k['rev_y']), 'приходи тази уч. година') .
    $kpi('<a href="porachki.php?status=open">' . $k['unpaid'] . '</a>', 'неприключени поръчки') .
    $kpi('<a href="klasacii.php">' . $k['flags'] . '</a>', '⚠ за проверка') . '</div>';

// активирания и активност по дни (30 дни)
$days = []; for ($i = 29; $i >= 0; $i--) $days[date('Y-m-d', strtotime("-$i days"))] = [0, 0];
foreach ([['created_at', 0], ['last_seen', 1]] as [$col, $idx]) {
    $st = $pdo->prepare("SELECT substr($col, 1, 10) AS d, COUNT(*) AS n FROM redemptions WHERE $col >= ? GROUP BY d"); $st->execute([$ago(31)]);
    foreach ($st as $r) if (isset($days[$r['d']])) $days[$r['d']][$idx] = (int)$r['n'];
}
$bars = function (int $idx, string $title) use ($days) {
    $max = max(1, max(array_map(fn($d) => $d[$idx], $days)));
    $h = '';
    foreach ($days as $d => $v) $h .= '<i style="height:' . max(2, round($v[$idx] / $max * 100)) . '%" title="' . date('d.m', strtotime($d)) . ': ' . $v[$idx] . '"></i>';
    return '<div class="card"><h3>' . $title . ' <small class="muted">(30 дни, най-много ' . $max . ' на ден)</small></h3><div class="bars">' . $h . '</div><div class="bars-x"><span>' . date('d.m', strtotime((string)array_key_first($days))) . '</span><span>днес</span></div></div>';
};
$body .= '<div class="grid g2">' . $bars(0, 'Нови активирания') . $bars(1, 'Ученици с последна игра в деня') . '</div>';

// най-активни тази седмица
$w = score_week();
$top = '';
foreach ($pdo->query("SELECT s.id, s.name, s.town, SUM($w) AS pts, COUNT(*) AS n FROM redemptions r JOIN codes c ON c.code = r.code JOIN batches b ON b.id = c.batch_id JOIN schools s ON s.id = b.school_id WHERE r.hidden = 0 GROUP BY s.id ORDER BY pts DESC LIMIT 5") as $i => $r)
    $top .= '<tr><td>' . ($i + 1) . '</td><td><a href="uchilishta.php?id=' . (int)$r['id'] . '">' . h($r['name']) . '</a> <small class="muted">' . h($r['town']) . '</small></td><td class="num">' . (int)$r['pts'] . '</td><td class="num">' . (int)$r['n'] . '</td></tr>';
$topc = '';
foreach ($pdo->query("SELECT b.id, b.label, SUM($w) AS pts, COUNT(*) AS n FROM redemptions r JOIN codes c ON c.code = r.code JOIN batches b ON b.id = c.batch_id WHERE b.type = 'class' AND r.hidden = 0 GROUP BY b.id ORDER BY pts DESC LIMIT 5") as $i => $r)
    $topc .= '<tr><td>' . ($i + 1) . '</td><td><a href="kodove.php?batch=' . (int)$r['id'] . '">' . h($r['label'] ?: '#' . $r['id']) . '</a></td><td class="num">' . (int)$r['pts'] . '</td><td class="num">' . (int)$r['n'] . '</td></tr>';
$tbl = fn($rows, $h) => $rows ? '<table><thead><tr><th>#</th><th>' . $h . '</th><th class="num">Точки</th><th class="num">Ученици</th></tr></thead><tbody>' . $rows . '</tbody></table>' : '<p class="muted">Още няма данни.</p>';
$body .= '<div class="grid g2"><div class="card"><h3>🏫 Най-активни училища тази седмица</h3>' . $tbl($top, 'Училище') . '</div><div class="card"><h3>🎒 Най-активни класове тази седмица</h3>' . $tbl($topc, 'Клас') . '</div></div>';

// изтичащи кодове и поръчки за довършване
$exp = '';
$st = $pdo->prepare('SELECT id, label, expires_at, type FROM batches WHERE expires_at BETWEEN ? AND ? ORDER BY expires_at LIMIT 8'); $st->execute([$today, date('Y-m-d', strtotime('+45 days'))]);
foreach ($st as $r) $exp .= '<tr><td><a href="kodove.php?batch=' . (int)$r['id'] . '">' . h($r['label'] ?: '#' . $r['id']) . '</a></td><td>' . h(TYPE_NAMES[$r['type']] ?? '') . '</td><td>' . fdate($r['expires_at']) . '</td></tr>';
$ord = '';
foreach ($pdo->query("SELECT id, client, plan, amount, status FROM orders WHERE status IN ('new','codes','sent') ORDER BY id DESC LIMIT 8") as $r)
    $ord .= '<tr><td><a href="porachki.php?id=' . (int)$r['id'] . '">#' . (int)$r['id'] . ' ' . h($r['client']) . '</a></td><td>' . h($r['plan']) . '</td><td class="num">' . money($r['amount']) . '</td><td>' . order_status_tag($r['status']) . '</td></tr>';
$body .= '<div class="grid g2"><div class="card"><h3>⏳ Кодове, които изтичат до 45 дни</h3>' . ($exp ? '<table><tbody>' . $exp . '</tbody></table><p class="hint">Удължава се от партидата → „Валидни до“.</p>' : '<p class="muted">Няма.</p>') . '</div>' .
    '<div class="card"><h3>🧾 Поръчки за довършване</h3>' . ($ord ? '<table><tbody>' . $ord . '</tbody></table>' : '<p class="muted">Всичко е приключено.</p>') . '<p><a class="btn sm" href="porachki.php?new=1">+ Нова поръчка</a></p></div></div>';

// последни активирания
$last = '';
foreach ($pdo->query('SELECT r.created_at, r.nickname, c.code, c.role, b.id, b.label FROM redemptions r JOIN codes c ON c.code = r.code JOIN batches b ON b.id = c.batch_id ORDER BY r.id DESC LIMIT 10') as $r)
    $last .= '<tr><td>' . h(date('d.m H:i', strtotime($r['created_at'] . ' UTC'))) . '</td><td class="mono">' . h($r['code']) . '</td><td>' . h($r['role'] === 'teacher' ? 'учител' : ($r['nickname'] ?: '–')) . '</td><td><a href="kodove.php?batch=' . (int)$r['id'] . '">' . h($r['label'] ?: '#' . $r['id']) . '</a></td></tr>';
$body .= '<div class="card"><h3>🕑 Последни активирания</h3>' . ($last ? '<div class="tw"><table><thead><tr><th>Кога</th><th>Код</th><th>Прякор</th><th>Партида</th></tr></thead><tbody>' . $last . '</tbody></table></div>' : '<p class="muted">Още никой не е въвел код.</p>') . '</div>';
page('Табло', $body, '<a class="btn" href="kodove.php">🔑 Нови кодове</a><a class="btn ghost" href="porachki.php?new=1">🧾 Нова поръчка</a>');
