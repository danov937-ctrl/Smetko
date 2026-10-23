<?php
/* Посещения: анонимна статистика от сайта (само от посетители, приели „Статистика“ в банера за бисквитки)
   + регистрации, поръчки и активирани абонаменти по дни. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$days = (int)($_GET['d'] ?? 30); if (!in_array($days, [7, 30, 90], true)) $days = 30;
$from = date('Y-m-d', strtotime('-' . ($days - 1) . ' days'));
$one = function (string $sql, array $a = []) use ($pdo) { $st = $pdo->prepare($sql); $st->execute($a); return (int)$st->fetchColumn(); };
$t = date('Y-m-d');
$k = ['today' => $one('SELECT COALESCE(SUM(visits), 0) FROM stats_pages WHERE day = ?', [$t]), 'tv' => $one('SELECT COALESCE(SUM(views), 0) FROM stats_pages WHERE day = ?', [$t]),
    'visits' => $one('SELECT COALESCE(SUM(visits), 0) FROM stats_pages WHERE day >= ?', [$from]), 'views' => $one('SELECT COALESCE(SUM(views), 0) FROM stats_pages WHERE day >= ?', [$from]),
    'reg' => $one('SELECT COUNT(*) FROM accounts WHERE created_at >= ?', [$from]), 'ord' => $one('SELECT COUNT(*) FROM orders WHERE created_at >= ?', [$from]), 'act' => $one('SELECT COUNT(*) FROM codes WHERE activated_at >= ?', [$from])];
// по дни
$byDay = [];
for ($i = $days - 1; $i >= 0; $i--) $byDay[date('Y-m-d', strtotime("-$i days"))] = ['v' => 0, 'p' => 0, 'r' => 0, 'o' => 0];
foreach ($pdo->query("SELECT day, SUM(visits) AS v, SUM(views) AS p FROM stats_pages WHERE day >= '$from' GROUP BY day") as $r) if (isset($byDay[$r['day']])) { $byDay[$r['day']]['v'] = (int)$r['v']; $byDay[$r['day']]['p'] = (int)$r['p']; }
foreach ($pdo->query("SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS n FROM accounts WHERE created_at >= '$from' GROUP BY d") as $r) if (isset($byDay[$r['d']])) $byDay[$r['d']]['r'] = (int)$r['n'];
foreach ($pdo->query("SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS n FROM orders WHERE created_at >= '$from' GROUP BY d") as $r) if (isset($byDay[$r['d']])) $byDay[$r['d']]['o'] = (int)$r['n'];
$max = max(1, max(array_column($byDay, 'p')));
$bars = '';
foreach ($byDay as $d => $x) $bars .= '<div class="sb" title="' . fdate($d) . ': ' . $x['v'] . ' посещения, ' . $x['p'] . ' прегледа' . ($x['r'] ? ', ' . $x['r'] . ' регистрации' : '') . ($x['o'] ? ', ' . $x['o'] . ' поръчки' : '') . '"><i class="p" style="height:' . round($x['p'] / $max * 100) . '%"></i><i class="v" style="height:' . round($x['v'] / $max * 100) . '%"></i>' . ($x['o'] ? '<b>🛒</b>' : ($x['r'] ? '<b>👤</b>' : '')) . '</div>';
$tbl = function (string $sql, string $h1, callable $label) use ($pdo, $from) {
    $st = $pdo->prepare($sql); $st->execute([$from]); $rows = $st->fetchAll();
    if (!$rows) return '<p class="muted">Още няма данни.</p>';
    $mx = max(1, (int)$rows[0]['n']);
    return '<table><thead><tr><th>' . $h1 . '</th><th class="num">Брой</th></tr></thead><tbody>' . implode('', array_map(fn($r) => '<tr><td>' . $label($r) . '<div class="sbar"><i style="width:' . round($r['n'] / $mx * 100) . '%"></i></div></td><td class="num">' . (int)$r['n'] . '</td></tr>', $rows)) . '</tbody></table>';
};
$names = ['/' => 'Начало', '/game.html' => 'Игра', '/pricing.html' => 'Абонаменти', '/vhod.html' => 'Вход', '/registracia.html' => 'Регистрация', '/profil.html' => 'Моят профил', '/tablo.html' => 'Табло', '/achievements.html' => 'Постижения', '/liga.html' => 'Обща класация', '/blog/' => 'Блог'];
$pages = $tbl('SELECT path, SUM(views) AS n FROM stats_pages WHERE day >= ? GROUP BY path ORDER BY n DESC LIMIT 15', 'Страница', fn($r) => h($names[$r['path']] ?? $r['path']) . ' <small class="muted">' . h($r['path']) . '</small>');
$refs = $tbl('SELECT host, SUM(n) AS n FROM stats_refs WHERE day >= ? GROUP BY host ORDER BY n DESC LIMIT 12', 'Откъде идват', fn($r) => h($r['host']));
$dev = $tbl('SELECT kind, SUM(n) AS n FROM stats_dev WHERE day >= ? GROUP BY kind ORDER BY n DESC', 'Устройство', fn($r) => ['mobile' => '📱 Телефон', 'tablet' => '📲 Таблет', 'desktop' => '💻 Компютър'][$r['kind']] ?? h($r['kind']));
$kpi = fn($v, $l, $s = '') => '<div class="kpi"><b>' . $v . '</b><span>' . $l . '</span>' . ($s ? '<small>' . $s . '</small>' : '') . '</div>';
$conv = $k['visits'] ? round($k['reg'] / $k['visits'] * 100, 1) : 0;
$body = '<div class="row noprint" style="margin-bottom:12px">' . implode('', array_map(fn($d) => '<a class="btn sm ' . ($d === $days ? '' : 'ghost') . '" href="?d=' . $d . '">' . $d . ' дни</a>', [7, 30, 90])) . '</div>' .
    '<div class="kpis">' . $kpi($k['today'], 'посещения днес', $k['tv'] . ' прегледа') . $kpi($k['visits'], 'посещения за ' . $days . ' дни', $k['views'] . ' прегледа') . $kpi($k['reg'], 'нови акаунта', $conv ? $conv . '% от посещенията' : '') . $kpi($k['ord'], 'поръчки') . $kpi($k['act'], 'активирани абонамента') . '</div>' .
    '<div class="card"><h2>По дни</h2><div class="sbars">' . $bars . '</div><p class="hint"><span class="lg p"></span> прегледи на страници · <span class="lg v"></span> посещения · 👤 регистрации · 🛒 поръчки</p></div>' .
    '<div class="grid g3"><div class="card"><h2>Най-гледани страници</h2>' . $pages . '</div><div class="card"><h2>Откъде идват</h2>' . $refs . '</div><div class="card"><h2>Устройства</h2>' . $dev . '</div></div>' .
    '<p class="hint">Броят се само посетителите, които са приели „Статистика“ в банера за бисквитки – истинският брой е по-голям. Не се пазят IP адреси и идентификатори.</p>' .
    '<style>.sbars{display:flex;align-items:flex-end;gap:3px;height:180px;padding:6px 0;border-bottom:2px solid #E2EAF6}.sb{flex:1;position:relative;height:100%;display:flex;align-items:flex-end;justify-content:center}.sb i{position:absolute;bottom:0;left:10%;right:10%;border-radius:4px 4px 0 0}.sb i.p{background:#CFE3FF}.sb i.v{background:#1F6FE0;left:28%;right:28%}.sb b{position:absolute;top:-2px;font-size:11px}.lg{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:middle}.lg.p{background:#CFE3FF}.lg.v{background:#1F6FE0}.sbar{height:5px;background:#EEF3FB;border-radius:9px;margin-top:4px}.sbar i{display:block;height:100%;background:#FF7B00;border-radius:9px}</style>';
page('Посещения', $body);
