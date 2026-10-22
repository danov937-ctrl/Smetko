<?php
/* Училища: списък, статистика, редакция, сливане на дубликати, класове. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$action = $_POST['action'] ?? '';
$id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);

if ($action === 'save') {
    $name = mb_substr(post('name'), 0, 120); $town = mb_substr(post('town'), 0, 60);
    if ($name === '') { flash('Попълнете името.', 'err'); go('uchilishta.php' . ($id ? '?id=' . $id : '')); }
    if ($id) { $pdo->prepare('UPDATE schools SET name = ?, town = ? WHERE id = ?')->execute([$name, $town, $id]); audit('Редакция на училище', "#$id $name, $town"); }
    else { $pdo->prepare('INSERT INTO schools(name, town, created_at) VALUES(?, ?, ?)')->execute([$name, $town, now()]); $id = (int)$pdo->lastInsertId(); audit('Ново училище', "$name, $town"); }
    // етикетите на партидите следват новото име
    foreach ($pdo->query('SELECT id, class_name FROM batches WHERE school_id = ' . $id . " AND type = 'class'") as $b) {
        $label = trim(($b['class_name'] ? $b['class_name'] . ' клас' : '') . ' · ' . $name . ($town ? ', ' . $town : ''), ' ·');
        if (!empty($_POST['relabel'])) { $pdo->prepare('UPDATE batches SET label = ? WHERE id = ?')->execute([$label, (int)$b['id']]); $pdo->prepare('UPDATE codes SET label = ? WHERE batch_id = ?')->execute([$label, (int)$b['id']]); }
    }
    flash('Училището е запазено.'); go('uchilishta.php?id=' . $id);
}
if ($action === 'merge' && $id) {
    $to = (int)post('into');
    if ($to && $to !== $id) {
        $pdo->prepare('UPDATE batches SET school_id = ? WHERE school_id = ?')->execute([$to, $id]);
        $pdo->prepare('UPDATE orders SET school_id = ? WHERE school_id = ?')->execute([$to, $id]);
        $pdo->prepare('DELETE FROM schools WHERE id = ?')->execute([$id]);
        audit('Сливане на училища', "#$id → #$to"); flash('Училищата са слети.'); go('uchilishta.php?id=' . $to);
    }
    go('uchilishta.php?id=' . $id);
}
if ($action === 'delete' && $id) {
    $n = $pdo->prepare('SELECT COUNT(*) FROM batches WHERE school_id = ?'); $n->execute([$id]);
    if ((int)$n->fetchColumn()) { flash('Училището има класове – първо ги преместете или слейте училището с друго.', 'err'); go('uchilishta.php?id=' . $id); }
    $pdo->prepare('DELETE FROM schools WHERE id = ?')->execute([$id]); audit('Изтрито училище', "#$id"); flash('Училището е изтрито.'); go('uchilishta.php');
}

$w = score_week(); $a = SCORE_ALL;
if ($id || isset($_GET['new'])) {
    $s = ['name' => '', 'town' => ''];
    if ($id) { $st = $pdo->prepare('SELECT * FROM schools WHERE id = ?'); $st->execute([$id]); $s = $st->fetch(); if (!$s) go('uchilishta.php'); }
    $body = '<form method="post" class="card">' . csrf_field() . '<input type="hidden" name="action" value="save"><input type="hidden" name="id" value="' . $id . '"><div class="grid g2">' .
        '<label>Име<input name="name" required maxlength="120" value="' . h($s['name']) . '"></label><label>Населено място<input name="town" maxlength="60" value="' . h($s['town']) . '"></label></div>' .
        ($id ? '<label class="chk"><input type="checkbox" name="relabel" value="1" checked> Обнови и бележките на картичките на класовете</label>' : '') . '<button>💾 Запази</button></form>';
    if ($id) {
        $rows = '';
        $st = $pdo->prepare("SELECT b.*, (SELECT COUNT(*) FROM codes c WHERE c.batch_id = b.id AND COALESCE(c.role,'student') <> 'teacher') AS n,
            (SELECT COUNT(*) FROM redemptions r JOIN codes c ON c.code = r.code WHERE c.batch_id = b.id AND COALESCE(c.role,'student') <> 'teacher') AS act,
            (SELECT COALESCE(SUM($w), 0) FROM redemptions r JOIN codes c ON c.code = r.code WHERE c.batch_id = b.id) AS wk,
            (SELECT COALESCE(SUM($a), 0) FROM redemptions r JOIN codes c ON c.code = r.code WHERE c.batch_id = b.id) AS al
            FROM batches b WHERE b.school_id = ? ORDER BY b.class_name, b.id");
        $st->execute([$id]);
        foreach ($st as $b) $rows .= '<tr><td><a href="kodove.php?batch=' . (int)$b['id'] . '"><b>' . h($b['class_name'] ?: $b['label'] ?: '#' . $b['id']) . '</b></a></td><td>' . h($b['teacher_name'] ?? '') . '</td><td class="num">' . (int)$b['act'] . ' / ' . (int)$b['n'] . '</td><td class="num">' . (int)$b['wk'] . '</td><td class="num">' . (int)$b['al'] . '</td><td>' . fdate($b['expires_at']) . '</td><td>' . ((int)($b['public'] ?? 1) ? '' : '<span class="tag">извън общата класация</span>') . '</td></tr>';
        $mopts = ''; foreach ($pdo->query('SELECT id, name, town FROM schools WHERE id <> ' . $id . ' ORDER BY town, name') as $o) $mopts .= '<option value="' . (int)$o['id'] . '">' . h($o['name'] . ', ' . $o['town']) . '</option>';
        $orders = ''; $st = $pdo->prepare('SELECT id, plan, qty, amount, status, created_at FROM orders WHERE school_id = ? ORDER BY id DESC'); $st->execute([$id]);
        foreach ($st as $o) $orders .= '<tr><td><a href="porachki.php?id=' . (int)$o['id'] . '">#' . (int)$o['id'] . '</a></td><td>' . fdate($o['created_at']) . '</td><td>' . h($o['plan']) . ' × ' . (int)$o['qty'] . '</td><td class="num">' . money($o['amount']) . '</td><td>' . order_status_tag($o['status']) . '</td></tr>';
        $body .= '<div class="card"><h2>Класове</h2>' . ($rows ? '<div class="tw"><table><thead><tr><th>Клас</th><th>Учител</th><th class="num">Активирани</th><th class="num">Точки седмица</th><th class="num">Точки година</th><th>Валидни до</th><th></th></tr></thead><tbody>' . $rows . '</tbody></table></div>' : '<p class="muted">Още няма класове.</p>') .
            '<p><a class="btn sm" href="kodove.php">+ Нов клас (кодове)</a></p></div>' .
            '<div class="card"><h2>Поръчки</h2>' . ($orders ? '<table><tbody>' . $orders . '</tbody></table>' : '<p class="muted">Няма поръчки.</p>') . '</div>' .
            '<div class="card"><h2>Сливане и изтриване</h2><p class="hint">Ако едно училище е въведено два пъти (напр. „ОУ Вазов“ и „ОУ „Иван Вазов“), слейте го с правилното – класовете и поръчките се преместват.</p>' .
            ($mopts ? '<form method="post" class="row">' . csrf_field() . '<input type="hidden" name="id" value="' . $id . '"><input type="hidden" name="action" value="merge"><select name="into" style="width:auto">' . $mopts . '</select><button class="ghost" data-confirm="Да слеем ли това училище с избраното? Това не може да се върне.">🔀 Слей с избраното</button></form>' : '') .
            '<form method="post" style="margin-top:10px">' . csrf_field() . '<input type="hidden" name="id" value="' . $id . '"><button name="action" value="delete" class="red sm" data-confirm="Да изтрием ли училището?">🗑 Изтрий (само ако няма класове)</button></form></div>';
    }
    page($id ? $s['name'] : 'Ново училище', $body, '<a class="btn ghost" href="uchilishta.php">← Всички училища</a>');
}

$q = trim((string)($_GET['q'] ?? ''));
$st = $pdo->prepare("SELECT s.*, (SELECT COUNT(*) FROM batches b WHERE b.school_id = s.id AND b.type = 'class') AS cls,
    (SELECT COUNT(*) FROM codes c JOIN batches b ON b.id = c.batch_id WHERE b.school_id = s.id AND COALESCE(c.role,'student') <> 'teacher') AS n,
    (SELECT COUNT(*) FROM redemptions r JOIN codes c ON c.code = r.code JOIN batches b ON b.id = c.batch_id WHERE b.school_id = s.id AND COALESCE(c.role,'student') <> 'teacher') AS act,
    (SELECT COALESCE(SUM($w), 0) FROM redemptions r JOIN codes c ON c.code = r.code JOIN batches b ON b.id = c.batch_id WHERE b.school_id = s.id) AS wk,
    (SELECT COALESCE(SUM(amount), 0) FROM orders o WHERE o.school_id = s.id AND o.status IN ('paid','done')) AS rev
    FROM schools s " . ($q !== '' ? 'WHERE s.name LIKE ? OR s.town LIKE ?' : '') . ' ORDER BY s.town, s.name');
$st->execute($q !== '' ? ["%$q%", "%$q%"] : []);
$rows = '';
foreach ($st as $s) $rows .= '<tr><td><a href="?id=' . (int)$s['id'] . '"><b>' . h($s['name']) . '</b></a></td><td>' . h($s['town']) . '</td><td class="num">' . (int)$s['cls'] . '</td><td class="num">' . (int)$s['act'] . ' / ' . (int)$s['n'] . '</td><td class="num">' . (int)$s['wk'] . '</td><td class="num">' . money($s['rev']) . '</td></tr>';
$body = '<div class="card"><form class="filters" method="get"><label>Търсене<input name="q" value="' . h($q) . '" placeholder="име или град"></label><button class="blue sm">🔍</button></form>' .
    ($rows ? '<div class="tw"><table><thead><tr><th>Училище</th><th>Град</th><th class="num">Класове</th><th class="num">Активирани</th><th class="num">Точки седмица</th><th class="num">Приходи</th></tr></thead><tbody>' . $rows . '</tbody></table></div>' : '<p>Още няма училища. Добавят се при създаване на кодове за клас или от „+ Ново училище“.</p>') . '</div>';
page('Училища', $body, '<a class="btn" href="?new=1">+ Ново училище</a>');
