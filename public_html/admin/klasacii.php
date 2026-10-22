<?php
/* Класации: проверка на ученици (сигнали, прякори), забранени думи, скриване. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$action = $_POST['action'] ?? '';
$rid = (int)($_POST['rid'] ?? 0);
$back = fn() => go('klasacii.php?' . http_build_query(array_intersect_key($_GET, ['f' => 1, 'q' => 1])));

if (in_array($action, ['hide', 'unhide'], true)) {
    $pdo->prepare('UPDATE redemptions SET hidden = ? WHERE id = ?')->execute([$action === 'hide' ? 1 : 0, $rid]);
    audit($action === 'hide' ? 'Скрит ученик' : 'Показан ученик', "#$rid"); flash($action === 'hide' ? 'Ученикът е скрит от класациите.' : 'Ученикът е видим отново.'); $back();
}
if ($action === 'nick') {
    $pdo->prepare('UPDATE redemptions SET nickname = NULL, nick_block = 1 WHERE id = ?')->execute([$rid]);
    audit('Изтрит прякор', "#$rid"); flash('Прякорът е изтрит – ученикът се показва като „Играч“ и не може да го върне.'); $back();
}
if ($action === 'unblock') {
    $pdo->prepare('UPDATE redemptions SET nick_block = 0 WHERE id = ?')->execute([$rid]); audit('Разрешен прякор', "#$rid"); flash('Ученикът отново може да избира прякор.'); $back();
}
if ($action === 'clearflags') {
    $pdo->prepare('UPDATE redemptions SET flags = 0 WHERE id = ?')->execute([$rid]); audit('Изчистени сигнали', "#$rid"); flash('Сигналите са изчистени.'); $back();
}
if ($action === 'resetpts') {
    $pdo->prepare('UPDATE redemptions SET join_base = points, week_base = points, flags = 0 WHERE id = ?')->execute([$rid]);
    audit('Нулирани точки в класацията', "#$rid"); flash('Точките на ученика в класациите са нулирани (личният му прогрес остава).'); $back();
}
if ($action === 'words') {
    $c = site_config(); $c['blockedWords'] = mb_substr(post('words'), 0, 5000); save_site_config($c);
    $n = 0;
    foreach ($pdo->query("SELECT id, nickname FROM redemptions WHERE nickname IS NOT NULL AND nickname <> ''") as $r)
        if (blocked_nick($r['nickname'])) { $pdo->prepare('UPDATE redemptions SET nickname = NULL WHERE id = ?')->execute([(int)$r['id']]); $n++; }
    audit('Забранени думи', $n ? "изтрити прякори: $n" : ''); flash('Списъкът е запазен.' . ($n ? " Изтрити прякори: $n." : '')); $back();
}

$f = $_GET['f'] ?? 'all';
$q = trim((string)($_GET['q'] ?? ''));
$where = ["COALESCE(c.role,'student') <> 'teacher'"]; $args = [];
if ($f === 'flags') $where[] = 'r.flags > 0';
if ($f === 'hidden') $where[] = 'r.hidden = 1';
if ($f === 'week') $where[] = "r.week = '" . week_key() . "'";
if ($q !== '') { $where[] = '(r.nickname LIKE ? OR c.code LIKE ? OR s.name LIKE ?)'; array_push($args, "%$q%", '%' . mb_strtoupper($q) . '%', "%$q%"); }
$order = $f === 'week' ? 'wk DESC' : ($f === 'flags' ? 'r.flags DESC' : 'pts DESC');
$st = $pdo->prepare('SELECT r.id, r.nickname, r.nick_block, ' . SCORE_ALL . ' AS pts, ' . score_week() . " AS wk, r.correct, r.answered, r.flags, r.hidden, r.last_seen, c.code, b.id AS bid, b.class_name, b.label, s.name AS sname, s.town
    FROM redemptions r JOIN codes c ON c.code = r.code JOIN batches b ON b.id = c.batch_id LEFT JOIN schools s ON s.id = b.school_id WHERE " . implode(' AND ', $where) . " ORDER BY $order LIMIT 300");
$st->execute($args);
$rows = '';
foreach ($st as $r) {
    $fm = '<form method="post" class="inline">' . csrf_field() . '<input type="hidden" name="rid" value="' . (int)$r['id'] . '">';
    $acc = $r['answered'] ? round($r['correct'] / $r['answered'] * 100) . '%' : '–';
    $btn = ($r['hidden'] ? $fm . '<button name="action" value="unhide" class="sm ghost">Покажи</button></form>' : $fm . '<button name="action" value="hide" class="sm ghost">Скрий</button></form>') .
        ($r['nickname'] ? ' ' . $fm . '<button name="action" value="nick" class="sm ghost" title="Изтрива прякора завинаги">Изтрий прякора</button></form>' : ($r['nick_block'] ? ' ' . $fm . '<button name="action" value="unblock" class="sm ghost">Разреши прякор</button></form>' : '')) .
        ((int)$r['flags'] ? ' ' . $fm . '<button name="action" value="clearflags" class="sm ghost">Изчисти ⚠</button></form> ' . $fm . '<button name="action" value="resetpts" class="sm red" data-confirm="Да нулираме ли точките на ученика в класациите?">Нулирай точките</button></form>' : '');
    $rows .= '<tr' . ($r['hidden'] ? ' style="opacity:.5"' : '') . '><td><b>' . h($r['nickname'] ?: '–') . '</b>' . ($r['nick_block'] ? ' <span class="tag">прякорът е блокиран</span>' : '') . '<br><small class="muted mono">' . h($r['code']) . '</small></td><td><a href="kodove.php?batch=' . (int)$r['bid'] . '">' . h(trim(($r['class_name'] ? $r['class_name'] . ' · ' : '') . ($r['sname'] ? $r['sname'] . ', ' . $r['town'] : $r['label']))) . '</a></td><td class="num">' . (int)$r['wk'] . '</td><td class="num">' . (int)$r['pts'] . '</td><td class="num">' . (int)$r['correct'] . ' / ' . (int)$r['answered'] . ' <small class="muted">' . $acc . '</small></td><td>' . ((int)$r['flags'] ? '<span class="tag tr">⚠ ' . (int)$r['flags'] . '</span>' : '') . '</td><td>' . fdate($r['last_seen']) . '</td><td class="row">' . $btn . '</td></tr>';
}
$tabs = '<div class="pill-nav">';
foreach (['all' => 'Всички', 'week' => 'Играли тази седмица', 'flags' => '⚠ Със сигнали', 'hidden' => 'Скрити'] as $k => $v) $tabs .= '<a class="btn sm ' . ($f === $k ? '' : 'ghost') . '" href="?f=' . $k . '">' . $v . '</a>';
$tabs .= '</div>';
$cfg = site_config();
$body = '<div class="card">' . $tabs . '<form class="filters" method="get"><input type="hidden" name="f" value="' . h($f) . '"><label>Търсене<input name="q" value="' . h($q) . '" placeholder="прякор, код или училище"></label><button class="blue sm">🔍</button></form>' .
    '<p class="hint">⚠ = сървърът е отрязал неправдоподобни точки (повече от 1 верен отговор в секунда или над 800 на ден). „Скрий“ маха ученика от всички класации; „Изтрий прякора“ го показва като „Играч“ завинаги.</p>' .
    ($rows ? '<div class="tw"><table><thead><tr><th>Прякор</th><th>Клас / училище</th><th class="num">Седмица</th><th class="num">Година</th><th class="num">Верни</th><th>Сигнали</th><th>Последно</th><th></th></tr></thead><tbody>' . $rows . '</tbody></table></div>' : '<p class="muted">Няма ученици по този филтър.</p>') . '</div>';
$body .= '<form method="post" class="card">' . csrf_field() . '<input type="hidden" name="action" value="words"><h2>🚫 Забранени думи в прякорите</h2><p class="hint">Разделени със запетая или на нов ред. Ако прякор съдържа такава дума, не се приема (детето се показва като „Играч“). При запазване съществуващите такива прякори се изтриват.</p>' .
    '<textarea name="words" placeholder="дума1, дума2, …">' . h($cfg['blockedWords']) . '</textarea><button>💾 Запази</button></form>';
$body .= '<div class="card"><h2>Публичните страници</h2><div class="row"><a class="btn ghost" href="../liga.html" target="_blank">🏆 Обща класация</a><a class="btn ghost" href="../klasaciya.html" target="_blank">Класация на клас (учител)</a></div></div>';
page('Класации', $body);
