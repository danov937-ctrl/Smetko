<?php
/* Активност на тестващите: кой с код реално играе, задържане, най-трудни задачи и мисии.
   Данните идват от прогреса на децата (profiles.state за родители, redemptions.state/stats за ученици от клас).
   Имената на мисиите и примерите за задачи са от _names.json (tools/admin_names.js). */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$N = json_decode((string)@file_get_contents(__DIR__ . '/_names.json'), true) ?: ['missions' => [], 'books' => [], 'skills' => []];
$all = isset($_GET['all']);
$T = date('Y-m-d');
$dayN = fn(string $d) => (int)floor(strtotime($d . ' 12:00') / 86400);
$tn = $dayN($T);
$types = ['single' => 'Индивидуален', 'family' => 'Семеен', 'class' => 'Клас', 'school' => 'Училище'];
$roles = ['parent' => 'родител', 'teacher' => 'учител'];

/* ---------- деца ---------- */
function kid_from(array $st, ?array $stats): array {
    $days = (array)($st['days'] ?? ($stats['d'] ?? []));
    $skills = (array)($st['skills'] ?? ($stats['s'] ?? []));
    return ['days' => $days, 'skills' => $skills, 'adv' => (array)($st['adventure'] ?? [])];
}
$kids = []; // [acc => [kid...]]
$testers = [];
if ($all) {
    foreach ($pdo->query('SELECT id, name, email, role, created_at FROM accounts WHERE disabled = 0') as $a) $testers[(int)$a['id']] = $a + ['codes' => []];
}
foreach ($pdo->query('SELECT c.code, c.type, c.activated_at, c.expires_at, a.id AS aid, a.name, a.email, a.role, a.created_at FROM codes c JOIN accounts a ON a.id = c.account_id WHERE c.account_id IS NOT NULL AND c.revoked = 0') as $r) {
    $aid = (int)$r['aid'];
    $testers[$aid] ??= ['id' => $aid, 'name' => $r['name'], 'email' => $r['email'], 'role' => $r['role'], 'created_at' => $r['created_at'], 'codes' => []];
    $testers[$aid]['codes'][] = $r;
}
foreach ($testers as $aid => $t) {
    $st = $pdo->prepare('SELECT name, state, updated_at FROM profiles WHERE account_id = ?'); $st->execute([$aid]);
    foreach ($st->fetchAll() as $p) $kids[$aid][] = ['name' => $p['name'], 'src' => 'дете'] + kid_from(json_decode((string)$p['state'], true) ?: [], null);
    foreach ($t['codes'] as $c) if ($c['type'] === 'class' || $c['type'] === 'school') {
        $s2 = $pdo->prepare('SELECT nickname, state, stats FROM redemptions WHERE code = ? AND username IS NOT NULL'); $s2->execute([$c['code']]);
        foreach ($s2->fetchAll() as $r) $kids[$aid][] = ['name' => $r['nickname'], 'src' => 'ученик'] + kid_from(json_decode((string)$r['state'], true) ?: [], json_decode((string)$r['stats'], true) ?: null);
    }
}
// метрики за всяко дете
$K = []; $perDay = array_fill(0, 28, 0); $skillAgg = []; $advAgg = [];
foreach ($kids as $aid => $list) foreach ($list as $i => $k) {
    $ds = []; $t7 = 0; $c7 = 0;
    foreach ($k['days'] as $d => $v) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$d) || empty($v[0])) continue;
        $n = $dayN($d); $ds[] = $n; $ago = $tn - $n;
        if ($ago >= 0 && $ago < 7) { $t7 += (int)$v[0]; $c7 += (int)($v[1] ?? 0); }
        if ($ago >= 0 && $ago < 28) $perDay[27 - $ago]++;
    }
    sort($ds);
    $m = ['aid' => $aid, 'days' => count($ds), 'first' => $ds[0] ?? null, 'last' => $ds ? end($ds) : null, 'd7' => count(array_filter($ds, fn($n) => $tn - $n < 7)), 't7' => $t7, 'c7' => $c7];
    $m['back'] = count($ds) >= 2; // върнало се поне още един ден
    $m['w2'] = $m['first'] !== null && $tn - $m['first'] >= 14 ? count(array_filter($ds, fn($n) => $n - $m['first'] >= 7 && $n - $m['first'] < 14)) > 0 : null;
    $K[] = $m; $kids[$aid][$i]['m'] = $m;
    foreach ($k['skills'] as $sk => $v) { if (!is_array($v)) continue; $skillAgg[$sk] ??= [0, 0, 0]; $skillAgg[$sk][0] += (int)($v[0] ?? 0); $skillAgg[$sk][1] += (int)($v[1] ?? 0); $skillAgg[$sk][2]++; }
    foreach ($k['adv'] as $key => $ms) {
        if (!is_array($ms)) continue; $key = preg_replace('/\.\d+$/', '', (string)$key);
        $advAgg[$key] ??= ['kids' => 0, 'm' => []]; $advAgg[$key]['kids']++;
        $mx = -1;
        foreach ($ms as $idx => $stars) { $idx = (int)$idx; $advAgg[$key]['m'][$idx] ??= [0, 0]; if ((int)$stars > 0) { $advAgg[$key]['m'][$idx][0]++; $advAgg[$key]['m'][$idx][1] += (int)$stars; $mx = max($mx, $idx); } }
        $advAgg[$key]['stop'][$mx + 1] = ($advAgg[$key]['stop'][$mx + 1] ?? 0) + 1; // докъде е стигнало детето (следващата незавършена мисия)
    }
}

/* ---------- обобщение ---------- */
$played = array_filter($K, fn($m) => $m['days'] > 0);
$act = fn(int $d) => count(array_filter($K, fn($m) => $m['last'] !== null && $tn - $m['last'] < $d));
$t7 = array_sum(array_column($K, 't7')); $c7 = array_sum(array_column($K, 'c7'));
$a7 = count(array_filter($K, fn($m) => $m['d7'] > 0));
$old = array_filter($played, fn($m) => $tn - $m['first'] >= 2);
$back = $old ? round(count(array_filter($old, fn($m) => $m['back'])) / count($old) * 100) : null;
$w2s = array_filter($played, fn($m) => $m['w2'] !== null);
$w2 = $w2s ? round(count(array_filter($w2s, fn($m) => $m['w2'])) / count($w2s) * 100) : null;
$kpi = fn($v, $l, $s = '') => '<div class="kpi"><b>' . $v . '</b><span>' . $l . '</span>' . ($s ? '<small>' . $s . '</small>' : '') . '</div>';
$body = '<div class="row noprint" style="margin-bottom:12px"><a class="btn sm ' . ($all ? 'ghost' : '') . '" href="aktivnost.php">Само с код за достъп</a><a class="btn sm ' . ($all ? '' : 'ghost') . '" href="?all=1">Всички акаунти</a></div>' .
    '<div class="kpis">' . $kpi(count($testers), $all ? 'акаунта' : 'тестващи с код', (($nT = count(array_filter($testers, fn($t) => $t['role'] === 'teacher'))) === 1 ? '1 учител' : $nT . ' учители')) .
    $kpi(count($K), 'деца и ученици', count($played) . ' са играли поне веднъж') . $kpi($act(1), 'играли днес') . $kpi($a7, 'играли за 7 дни') .
    $kpi($back === null ? '–' : $back . '%', 'се връщат', 'играли в поне 2 различни дни') . $kpi($w2 === null ? '–' : $w2 . '%', 'играят и 2-рата седмица', 'от тези, започнали преди 14+ дни') .
    $kpi($a7 ? round($t7 / $a7) : 0, 'задачи на активно дете', 'за 7 дни') . $kpi($t7 ? round($c7 / $t7 * 100) . '%' : '–', 'точност', 'за 7 дни') . '</div>';
// по дни
$mx = max(1, max($perDay)); $bars = '';
foreach ($perDay as $i => $v) $bars .= '<i style="height:' . max(2, round($v / $mx * 100)) . '%" title="' . date('d.m', strtotime('-' . (27 - $i) . ' days')) . ': ' . $v . '"></i>';
$body .= '<div class="card"><h3>Деца, играли в деня <small class="muted">(28 дни, най-много ' . $mx . ')</small></h3><div class="bars">' . $bars . '</div><div class="bars-x"><span>' . date('d.m', strtotime('-27 days')) . '</span><span>днес</span></div></div>';

// тестващите
$rows = [];
foreach ($testers as $aid => $t) {
    $ms = array_column($kids[$aid] ?? [], 'm');
    $last = max(array_merge([null], array_column($ms, 'last')));
    $tt = array_sum(array_column($ms, 't7')); $cc = array_sum(array_column($ms, 'c7'));
    $ago = $last === null ? null : $tn - $last;
    $status = $last === null ? ['⚪', 'още не е играло', 3] : ($ago <= 2 ? ['🟢', 'активен', 0] : ($ago <= 7 ? ['🟡', 'отслабва', 1] : ['🔴', 'спрял', 2]));
    $act0 = $t['codes'] ? min(array_map(fn($c) => (string)$c['activated_at'], $t['codes'])) : '';
    $spark = '';
    $daysOn = []; foreach ($kids[$aid] ?? [] as $k) foreach ($k['days'] as $d => $v) if (!empty($v[0])) $daysOn[$tn - $dayN((string)$d)] = true;
    for ($d = 13; $d >= 0; $d--) $spark .= '<i class="' . (isset($daysOn[$d]) ? 'on' : '') . '"></i>';
    $rows[] = [$status[2], -($last ?? -1), '<tr><td>' . $status[0] . ' <small>' . $status[1] . '</small></td><td><a href="akaunti.php?q=' . urlencode((string)$t['email']) . '">' . h($t['name']) . '</a><br><small class="muted">' . h($t['email']) . ' · ' . h($roles[$t['role']] ?? $t['role']) . '</small></td>' .
        '<td>' . h(implode(', ', array_unique(array_map(fn($c) => $types[$c['type']] ?? $c['type'], $t['codes'])))) . ($act0 ? '<br><small class="muted">от ' . fdate(substr($act0, 0, 10)) . '</small>' : '') . '</td>' .
        '<td class="num">' . count(array_filter($ms, fn($m) => $m['d7'] > 0)) . ' / ' . count($ms) . '</td><td class="num">' . $tt . '</td><td class="num">' . ($tt ? round($cc / $tt * 100) . '%' : '–') . '</td>' .
        '<td><span class="spark" title="последните 14 дни">' . $spark . '</span></td><td>' . ($last === null ? '–' : ($ago === 0 ? 'днес' : ($ago === 1 ? 'вчера' : 'преди ' . $ago . ' дни'))) . '</td></tr>'];
}
usort($rows, fn($a, $b) => [$a[0], $a[1]] <=> [$b[0], $b[1]]);
$body .= '<div class="card"><h2>' . ($all ? 'Акаунти' : 'Тестващи') . '</h2>' . ($rows ? '<div class="tw"><table><thead><tr><th>Статус</th><th>Акаунт</th><th>Код</th><th class="num">Активни деца (7 дни)</th><th class="num">Задачи (7 дни)</th><th class="num">Точност</th><th>14 дни</th><th>Последно</th></tr></thead><tbody>' . implode('', array_column($rows, 2)) . '</tbody></table></div>'
    : '<p class="muted">Още няма акаунти с активиран код. Направете кодове от „Кодове“ и ги пратете на участниците.</p>') .
    '<p class="hint">🟢 играли до 2 дни назад · 🟡 3–7 дни · 🔴 повече от седмица · ⚪ кодът е активиран, но още не са играли. Добре е да пишете на 🔴 и ⚪ – често нещо им пречи.</p></div>';

// най-трудни задачи
$sk = array_filter($skillAgg, fn($v) => $v[1] >= 15);
uasort($sk, fn($a, $b) => $a[0] / $a[1] <=> $b[0] / $b[1]);
$sr = ''; foreach (array_slice($sk, 0, 15, true) as $k => $v) {
    $pc = round($v[0] / $v[1] * 100);
    $sr .= '<tr><td><code>' . h($k) . '</code><br><small class="muted">напр. ' . h($N['skills'][$k] ?? '') . '</small></td><td class="num" style="color:' . ($pc < 60 ? '#C62828' : ($pc < 75 ? '#B26A00' : '#2E7D32')) . '"><b>' . $pc . '%</b></td><td class="num">' . $v[1] . '</td><td class="num">' . $v[2] . '</td></tr>';
}
$body .= '<div class="grid g2"><div class="card"><h2>Най-трудни видове задачи</h2>' . ($sr ? '<table><thead><tr><th>Вид задача</th><th class="num">Верни</th><th class="num">Опита</th><th class="num">Деца</th></tr></thead><tbody>' . $sr . '</tbody></table><p class="hint">Само видове с поне 15 опита. Под 60% – задачата може да е твърде трудна за нивото или неясна; вижте и „Сигнали“.</p>' : '<p class="muted">Още няма достатъчно данни (нужни са поне 15 опита на вид задача).</p>') . '</div>';

// мисии: докъде стигат и кои са трудни
uasort($advAgg, fn($a, $b) => $b['kids'] <=> $a['kids']);
$mr = '';
foreach (array_slice($advAgg, 0, 4, true) as $key => $a) {
    $titles = $N['missions'][$key] ?? [];
    $hard = [];
    foreach ($a['m'] as $idx => [$n, $s]) if ($n >= 2) $hard[$idx] = $s / $n;
    asort($hard);
    $stop = $a['stop'] ?? []; arsort($stop);
    $mr .= '<h3 style="margin:12px 0 4px">' . h($N['books'][$key] ?? $key) . ' <small class="muted">· ' . $a['kids'] . ' деца</small></h3>' .
        '<p style="margin:2px 0"><b>Спират най-често пред:</b> ' . (implode(', ', array_map(fn($i, $n) => 'мисия ' . ($i + 1) . ($titles[$i] ?? '' ? ' „' . h(mb_strimwidth($titles[$i], 0, 40, '…')) . '“' : '') . ' (' . $n . ')', array_keys(array_slice($stop, 0, 3, true)), array_slice($stop, 0, 3, true))) ?: '–') . '</p>' .
        '<p style="margin:2px 0"><b>Най-малко звезди:</b> ' . (implode(', ', array_map(fn($i, $v) => 'мисия ' . ($i + 1) . ($titles[$i] ?? '' ? ' „' . h(mb_strimwidth($titles[$i], 0, 40, '…')) . '“' : '') . ' – ' . number_format($v, 1, ',', '') . '★', array_keys(array_slice($hard, 0, 3, true)), array_slice($hard, 0, 3, true))) ?: '<span class="muted">нужни са поне 2 деца на мисия</span>') . '</p>';
}
$body .= '<div class="card"><h2>Мисии</h2>' . ($mr ?: '<p class="muted">Още няма изиграни мисии.</p>') . '<p class="hint">„Спират пред“ – следващата мисия, която детето още не е минало. Ако много деца спират на едно място, мисията може да е твърде трудна или заключена в безплатния план.</p></div></div>';
$body .= '<p class="hint">Данните са от прогреса, записан в акаунтите на родителите и в профилите на учениците от клас. Децата, които играят без акаунт, не се виждат тук (вижте „Посещения“).</p>' .
    '<style>.spark{display:inline-flex;gap:2px;vertical-align:middle}.spark i{width:7px;height:16px;border-radius:2px;background:#E6ECF5}.spark i.on{background:#2E9440}</style>';
page('Активност на тестващите', $body);
