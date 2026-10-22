<?php
/* Новини: излизат в прозорец при влизане в сайта; детето/родителят натиска „Видях го“ и новината не излиза повече. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$action = $_POST['action'] ?? '';
$id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);
$date = fn($k) => preg_match('/^\d{4}-\d{2}-\d{2}$/', post($k)) ? post($k) : null;

if ($action === 'save') {
    $title = mb_substr(post('title'), 0, 120);
    if ($title === '') { flash('Попълнете заглавието.', 'err'); go('novini.php?' . ($id ? 'id=' . $id : 'new=1')); }
    $link = post('link'); if ($link !== '' && !preg_match('#^(https?://|/|[a-z0-9-]+\.html)#i', $link)) $link = '';
    $d = [mb_substr(post('emoji'), 0, 8) ?: '📣', $title, mb_substr(post('body'), 0, 1500), mb_substr($link, 0, 300), mb_substr(post('link_text'), 0, 40), $date('starts'), $date('ends'), empty($_POST['active']) ? 0 : 1, empty($_POST['popup']) ? 0 : 1];
    if ($id) { $pdo->prepare('UPDATE news SET emoji=?, title=?, body=?, link=?, link_text=?, starts=?, ends=?, active=?, popup=? WHERE id=?')->execute(array_merge($d, [$id])); audit('Редакция на новина', $title); }
    else { $pdo->prepare('INSERT INTO news(emoji, title, body, link, link_text, starts, ends, active, popup, created_at) VALUES(?,?,?,?,?,?,?,?,?,?)')->execute(array_merge($d, [now()])); $id = (int)$pdo->lastInsertId(); audit('Нова новина', $title); }
    flash('Новината е запазена.'); go('novini.php');
}
if ($action === 'toggle' && $id) { $pdo->prepare('UPDATE news SET active = 1 - active WHERE id = ?')->execute([$id]); audit('Новина вкл./изкл.', "#$id"); go('novini.php'); }
if ($action === 'delete' && $id) { $pdo->prepare('DELETE FROM news WHERE id = ?')->execute([$id]); audit('Изтрита новина', "#$id"); flash('Новината е изтрита.'); go('novini.php'); }

if ($id || isset($_GET['new'])) {
    $n = ['emoji' => '📣', 'title' => '', 'body' => '', 'link' => '', 'link_text' => '', 'starts' => date('Y-m-d'), 'ends' => '', 'active' => 1, 'popup' => 1];
    if ($id) { $st = $pdo->prepare('SELECT * FROM news WHERE id = ?'); $st->execute([$id]); $n = $st->fetch(); if (!$n) go('novini.php'); }
    $emo = ''; foreach (['📣', '🎉', '🏆', '⚡', '📚', '🎄', '🌸', '☀️', '🍂', '🦉', '🎁', '⭐'] as $e) $emo .= '<button type="button" class="ghost sm" onclick="document.getElementById(\'emoji\').value=\'' . $e . '\'">' . $e . '</button>';
    $body = '<form method="post" class="card">' . csrf_field() . '<input type="hidden" name="action" value="save"><input type="hidden" name="id" value="' . $id . '"><div class="grid g4">' .
        '<label>Иконка<input name="emoji" id="emoji" maxlength="8" value="' . h($n['emoji']) . '"></label><label class="wide" style="grid-column:span 3">Заглавие<input name="title" required maxlength="120" value="' . h($n['title']) . '" placeholder="Ново: седмично предизвикателство!"></label>' .
        '<div class="wide row">' . $emo . '</div>' .
        '<label class="wide">Текст<textarea name="body" maxlength="1500" placeholder="Всяка седмица – нова тема и нова класация. Ще победиш ли?">' . h($n['body']) . '</textarea></label>' .
        '<label class="wide" style="grid-column:span 2">Връзка (по желание)<input name="link" maxlength="300" value="' . h($n['link']) . '" placeholder="game.html?mode=challenge"></label><label style="grid-column:span 2">Текст на бутона<input name="link_text" maxlength="40" value="' . h($n['link_text']) . '" placeholder="Играй сега"></label>' .
        '<label>Показва се от<input type="date" name="starts" value="' . h($n['starts']) . '"></label><label>до (празно = без край)<input type="date" name="ends" value="' . h($n['ends']) . '"></label>' .
        '<label class="chk"><input type="checkbox" name="active" value="1"' . ((int)$n['active'] ? ' checked' : '') . '> Активна</label><label class="chk"><input type="checkbox" name="popup" value="1"' . ((int)$n['popup'] ? ' checked' : '') . '> Изскача при влизане (докато не натиснат „Видях го“)</label></div>' .
        '<div class="row"><button>💾 Запази</button><a class="btn ghost" href="novini.php">Отказ</a></div></form>';
    page($id ? 'Новина' : 'Нова новина', $body, '<a class="btn ghost" href="novini.php">← Всички новини</a>');
}
$rows = '';
$t = today();
foreach ($pdo->query('SELECT * FROM news ORDER BY id DESC') as $n) {
    $live = (int)$n['active'] && (!$n['starts'] || $n['starts'] <= $t) && (!$n['ends'] || $n['ends'] >= $t);
    $f = '<form method="post" class="inline">' . csrf_field() . '<input type="hidden" name="id" value="' . (int)$n['id'] . '">';
    $rows .= '<tr><td style="font-size:1.4rem">' . h($n['emoji']) . '</td><td><a href="?id=' . (int)$n['id'] . '"><b>' . h($n['title']) . '</b></a><br><small class="muted">' . h(mb_substr((string)$n['body'], 0, 90)) . '</small></td><td>' . fdate($n['starts']) . ' – ' . ($n['ends'] ? fdate($n['ends']) : '…') . '</td><td>' . ($live ? '<span class="tag tg">показва се</span>' : ((int)$n['active'] ? '<span class="tag ty">извън периода</span>' : '<span class="tag">изключена</span>')) . ((int)$n['popup'] ? ' <span class="tag tb">изскача</span>' : '') . '</td><td class="row">' .
        $f . '<button name="action" value="toggle" class="sm ghost">' . ((int)$n['active'] ? 'Изключи' : 'Включи') . '</button></form>' . $f . '<button name="action" value="delete" class="sm ghost" data-confirm="Да изтрием ли новината?">🗑</button></form></td></tr>';
}
$body = '<div class="card"><p class="hint">Новините излизат в прозорец, когато дете или родител отвори сайта. С „Видях го“ новината не излиза повече на това устройство. Всички активни новини се виждат и на <a href="../novini.html" target="_blank">smetko.com/novini.html</a>.</p>' .
    ($rows ? '<div class="tw"><table><thead><tr><th></th><th>Новина</th><th>Период</th><th>Статус</th><th></th></tr></thead><tbody>' . $rows . '</tbody></table></div>' : '<p>Още няма новини.</p>') . '</div>';
page('Новини', $body, '<a class="btn" href="?new=1">+ Нова новина</a>');
