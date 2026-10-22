<?php
/* Кодове за достъп: партиди, създаване, търсене, спиране, освобождаване, валидност, CSV. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$action = $_POST['action'] ?? $_GET['action'] ?? '';
$back = fn(int $b = 0) => go('kodove.php' . ($b ? '?batch=' . $b : ''));

/* ---------- действия ---------- */
if ($action === 'create') {
    $type = array_key_exists($_POST['type'] ?? '', TYPE_NAMES) ? $_POST['type'] : 'class';
    $count = max(1, min(500, (int)($_POST['count'] ?? 1)));
    $exp = preg_match('/^\d{4}-\d{2}-\d{2}$/', post('expires')) ? post('expires') : school_year_end();
    $label = mb_substr(post('label'), 0, 120);
    $pdo->beginTransaction();
    $sid = $type === 'class' ? school_from_post($pdo) : null;
    $cname = mb_substr(post('class_name'), 0, 20);
    $cgrade = max(0, min(4, (int)($_POST['grade'] ?? 0)));
    if (!$cgrade && preg_match('/^([1-4])/', $cname, $m)) $cgrade = (int)$m[1];
    $tname = mb_substr(post('teacher_name'), 0, 40);
    if ($label === '' && $type === 'class') {
        $sn = $sid ? $pdo->query('SELECT name, town FROM schools WHERE id = ' . (int)$sid)->fetch() : null;
        $label = trim(($cname ? $cname . ' клас' : '') . ($sn ? ' · ' . $sn['name'] . ($sn['town'] ? ', ' . $sn['town'] : '') : ''), ' ·');
    }
    $pin = $type === 'class' ? random_pin() : null;
    $pdo->prepare('INSERT INTO batches(label, type, max_uses, expires_at, created_at, pin, school_id, class_name, grade, teacher_name, public) VALUES(?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 1)')
        ->execute([$label, $type, $exp, now(), $pin, $sid, $cname, $cgrade ?: null, $tname]);
    $bid = (int)$pdo->lastInsertId();
    $ins = $pdo->prepare('INSERT OR IGNORE INTO codes(code, batch_id, type, max_uses, expires_at, pin, label, created_at, role) VALUES(?, ?, ?, 1, ?, ?, ?, ?, ?)');
    $teachers = $type === 'class' ? 1 + max(0, min(5, (int)($_POST['helpers'] ?? 2))) : 0; // 1 учител + помощници (по подразбиране 2)
    for ($k = 0; $k < $teachers; $k++) { do { $ins->execute([random_code(), $bid, $type, $exp, $pin, $label, now(), 'teacher']); } while ($ins->rowCount() === 0); }
    $made = 0;
    while ($made < $count) { $ins->execute([random_code(), $bid, $type, $exp, in_array($type, ['single', 'family'], true) ? random_pin() : null, $label, now(), 'student']); $made += $ins->rowCount(); }
    $oid = (int)($_POST['order_id'] ?? 0);
    if ($oid) $pdo->prepare("UPDATE orders SET batch_id = ?, status = CASE WHEN status = 'new' THEN 'codes' ELSE status END WHERE id = ?")->execute([$bid, $oid]);
    $pdo->commit();
    audit('Нови кодове', TYPE_NAMES[$type] . " × $count · $label" . ($oid ? " · поръчка #$oid" : ''));
    flash($type === 'class' ? "Създадени са $count кода за ученици + " . ($teachers === 1 ? '1 код за учителя' : $teachers . ' кода за учители (1 + ' . ($teachers - 1) . ')') . " (ПИН $pin)." : "Създадени са $count кода.");
    $back($bid);
}
$code = post('code'); $bidp = (int)($_POST['batch'] ?? 0);
if (in_array($action, ['revoke', 'restore'], true)) {
    $pdo->prepare('UPDATE codes SET revoked = ? WHERE code = ?')->execute([$action === 'revoke' ? 1 : 0, $code]);
    audit($action === 'revoke' ? 'Спрян код' : 'Възстановен код', $code);
    flash($action === 'revoke' ? 'Кодът е спрян.' : 'Кодът е възстановен.'); $back($bidp);
}
if ($action === 'release') {
    $pdo->prepare('DELETE FROM redemptions WHERE code = ?')->execute([$code]);
    audit('Освободен код', $code);
    flash('Кодът е освободен и може да се въведе отново на едно устройство.'); $back($bidp);
}
if ($action === 'revoke_batch' || $action === 'restore_batch') {
    $pdo->prepare('UPDATE codes SET revoked = ? WHERE batch_id = ?')->execute([$action === 'revoke_batch' ? 1 : 0, $bidp]);
    audit($action === 'revoke_batch' ? 'Спряна партида' : 'Възстановена партида', '#' . $bidp);
    flash($action === 'revoke_batch' ? 'Всички кодове в партидата са спрени.' : 'Всички кодове в партидата са възстановени.'); $back($bidp);
}
if ($action === 'add_codes') { // още кодове в съществуваща партида (нов ученик в класа)
    $b = $pdo->prepare('SELECT * FROM batches WHERE id = ?'); $b->execute([$bidp]); $b = $b->fetch();
    $n = max(1, min(100, (int)($_POST['count'] ?? 1)));
    if ($b) {
        $ins = $pdo->prepare('INSERT OR IGNORE INTO codes(code, batch_id, type, max_uses, expires_at, pin, label, created_at, role) VALUES(?, ?, ?, 1, ?, NULL, ?, ?, ?)');
        $made = 0; while ($made < $n) { $ins->execute([random_code(), $bidp, $b['type'], $b['expires_at'], $b['label'], now(), 'student']); $made += $ins->rowCount(); }
        audit('Добавени кодове', "#$bidp × $n"); flash("Добавени са $n нови кода в партидата.");
    }
    $back($bidp);
}
if ($action === 'newpin') {
    $pin = random_pin();
    $pdo->prepare('UPDATE batches SET pin = ? WHERE id = ?')->execute([$pin, $bidp]);
    $pdo->prepare("UPDATE codes SET pin = ? WHERE batch_id = ? AND role = 'teacher'")->execute([$pin, $bidp]);
    audit('Нов ПИН', "#$bidp"); flash("Новият ПИН на учителя е $pin. Старият вече не работи."); $back($bidp);
}
if ($action === 'info') {
    $sid = school_from_post($pdo);
    $cname = mb_substr(post('class_name'), 0, 20);
    $cgrade = max(0, min(4, (int)($_POST['grade'] ?? 0)));
    if (!$cgrade && preg_match('/^([1-4])/', $cname, $m)) $cgrade = (int)$m[1];
    $pdo->prepare('UPDATE batches SET school_id = ?, class_name = ?, grade = ?, teacher_name = ?, public = ?, label = ? WHERE id = ?')
        ->execute([$sid, $cname, $cgrade ?: null, mb_substr(post('teacher_name'), 0, 40), empty($_POST['public']) ? 0 : 1, mb_substr(post('label'), 0, 120), $bidp]);
    $pdo->prepare('UPDATE codes SET label = ? WHERE batch_id = ?')->execute([mb_substr(post('label'), 0, 120), $bidp]);
    audit('Данни за партида', "#$bidp"); flash('Данните са запазени.'); $back($bidp);
}
if ($action === 'extend') {
    $exp = preg_match('/^\d{4}-\d{2}-\d{2}$/', post('expires')) ? post('expires') : null;
    if ($exp) { $pdo->prepare('UPDATE codes SET expires_at = ? WHERE batch_id = ?')->execute([$exp, $bidp]); $pdo->prepare('UPDATE batches SET expires_at = ? WHERE id = ?')->execute([$exp, $bidp]); audit('Нова валидност', "#$bidp → $exp"); flash('Валидността е обновена.'); }
    $back($bidp);
}
if ($action === 'delete_batch') {
    $used = $pdo->prepare('SELECT COUNT(*) FROM redemptions r JOIN codes c ON c.code = r.code WHERE c.batch_id = ?'); $used->execute([$bidp]);
    if ((int)$used->fetchColumn() > 0) { flash('Партидата има активирани кодове – спрете я вместо да я триете.', 'err'); $back($bidp); }
    $pdo->prepare('DELETE FROM codes WHERE batch_id = ?')->execute([$bidp]); $pdo->prepare('DELETE FROM batches WHERE id = ?')->execute([$bidp]);
    audit('Изтрита партида', "#$bidp"); flash('Партидата е изтрита.'); go('kodove.php');
}
if ($action === 'csv') {
    $b = (int)($_GET['batch'] ?? 0);
    $st = $pdo->prepare("SELECT c.code, c.role, c.pin, c.type, c.expires_at, c.label, c.revoked, (SELECT MIN(created_at) FROM redemptions r WHERE r.code = c.code) AS act, (SELECT nickname FROM redemptions r WHERE r.code = c.code LIMIT 1) AS nick
        FROM codes c WHERE c.batch_id = ? ORDER BY CASE WHEN c.role = 'teacher' THEN 0 ELSE 1 END, c.created_at, c.code");
    $st->execute([$b]);
    csv_out('smetko-kodove-' . $b . '.csv', ['Код', 'За', 'ПИН', 'Вид', 'Активиран', 'Прякор', 'Валиден до', 'Бележка', 'Спрян'],
        (function () use ($st) { foreach ($st as $r) yield [$r['code'], $r['role'] === 'teacher' ? 'учител' : 'ученик', $r['pin'], TYPE_NAMES[$r['type']] ?? $r['type'], $r['act'] ? substr($r['act'], 0, 10) : 'не', $r['nick'], $r['expires_at'], $r['label'], $r['revoked'] ? 'да' : '']; })());
}

/* ---------- изглед: една партида ---------- */
$bid = (int)($_GET['batch'] ?? 0);
if ($bid) {
    $b = $pdo->prepare('SELECT b.*, s.name AS sname, s.town FROM batches b LEFT JOIN schools s ON s.id = b.school_id WHERE b.id = ?'); $b->execute([$bid]); $b = $b->fetch();
    if (!$b) { flash('Няма такава партида.', 'err'); go('kodove.php'); }
    $st = $pdo->prepare("SELECT c.*, r.created_at AS act, r.last_seen AS last, r.nickname AS nick, " . SCORE_ALL . " AS pts, r.flags FROM codes c LEFT JOIN redemptions r ON r.code = c.code
        WHERE c.batch_id = ? ORDER BY CASE WHEN c.role = 'teacher' THEN 0 ELSE 1 END, c.created_at, c.code");
    $st->execute([$bid]);
    $rows = ''; $used = 0; $total = 0;
    foreach ($st as $r) {
        $isT = ($r['role'] ?? '') === 'teacher';
        if (!$isT) { $total++; if ($r['act']) $used++; }
        $state = $r['revoked'] ? '<span class="tag tr">спрян</span>' : ($r['expires_at'] < today() ? '<span class="tag">изтекъл</span>' : ($r['act'] ? '<span class="tag tg">активиран</span>' : '<span class="tag">свободен</span>'));
        $f = '<form method="post" class="inline">' . csrf_field() . '<input type="hidden" name="batch" value="' . $bid . '"><input type="hidden" name="code" value="' . h($r['code']) . '">';
        $btn = $f . ($r['revoked'] ? '<button name="action" value="restore" class="sm ghost">Възстанови</button>' : '<button name="action" value="revoke" class="sm ghost" data-confirm="Да спрем ли кода? Устройството губи достъпа.">Спри</button>') . '</form>' .
            ($r['act'] && !$r['revoked'] ? ' ' . $f . '<button name="action" value="release" class="sm ghost" data-confirm="Да освободим ли кода? Старото устройство губи достъпа, а кодът може да се въведе на едно ново устройство.">Освободи</button></form>' : '');
        $rows .= '<tr' . ($isT ? ' style="background:#FFF8E6"' : '') . '><td class="mono">' . h($r['code']) . '</td><td>' . ($isT ? '<b>учител</b> · ПИН <span class="mono">' . h($r['pin']) . '</span>' : ($r['type'] === 'class' ? 'ученик' : h(TYPE_NAMES[$r['type']] ?? '') . ($r['pin'] ? ' · ПИН за родителя <span class="mono">' . h($r['pin']) . '</span>' : ''))) . '</td><td>' . fdate($r['act']) . '</td><td>' . h($r['nick'] ?? '') . ((int)$r['flags'] ? ' <span class="tag tr" title="сигнали за неправдоподобни точки">⚠</span>' : '') . '</td><td class="num">' . ($r['act'] ? (int)$r['pts'] : '') . '</td><td>' . fdate($r['last']) . '</td><td>' . $state . '</td><td class="row">' . $btn . '</td></tr>';
    }
    $order = $pdo->prepare('SELECT id, client FROM orders WHERE batch_id = ?'); $order->execute([$bid]); $order = $order->fetch();
    $f = '<form method="post" class="inline">' . csrf_field() . '<input type="hidden" name="batch" value="' . $bid . '">';
    $body = '<div class="card"><p><a href="kodove.php">← Всички партиди</a></p><h2>' . h($b['label'] ?: 'Партида #' . $bid) . '</h2>' .
        '<p>' . h(TYPE_NAMES[$b['type']] ?? $b['type']) . ' · еднократни кодове · активирани <b>' . $used . ' от ' . $total . '</b> · валидни до <b>' . fdate($b['expires_at']) . '</b>' .
        ($b['sname'] ? ' · ' . h($b['sname'] . ', ' . $b['town']) : '') . ($b['type'] === 'class' && !empty($b['pin']) ? '<br>ПИН на учителя за класацията: <b class="mono">' . h($b['pin']) . '</b>' : '') .
        ($order ? '<br>Поръчка: <a href="porachki.php?id=' . (int)$order['id'] . '">#' . (int)$order['id'] . ' ' . h($order['client']) . '</a>' : '') . '</p>' .
        '<div class="row"><a class="btn" target="_blank" href="cards.php?batch=' . $bid . '">🖨️ Картички за печат</a><a class="btn ghost" href="?action=csv&amp;batch=' . $bid . '">⬇️ CSV (Excel)</a>' .
        ($b['type'] === 'class' ? '<a class="btn ghost" href="../klasaciya.html" target="_blank">🏆 Класацията на сайта</a>' : '') . '</div></div>';
    $body .= '<div class="card"><h2>Действия</h2><div class="grid g2">' .
        '<form method="post">' . csrf_field() . '<input type="hidden" name="action" value="extend"><input type="hidden" name="batch" value="' . $bid . '"><label>Валидни до<input type="date" name="expires" value="' . h($b['expires_at']) . '"></label><button class="sm">Запази валидността</button></form>' .
        '<form method="post">' . csrf_field() . '<input type="hidden" name="action" value="add_codes"><input type="hidden" name="batch" value="' . $bid . '"><label>Още кодове (нов ученик)<input type="number" name="count" value="1" min="1" max="100"></label><button class="sm">Добави кодове</button></form>' .
        '</div><div class="row" style="margin-top:12px">' .
        ($b['type'] === 'class' ? $f . '<button name="action" value="newpin" class="sm ghost" data-confirm="Да сменим ли ПИН-а на учителя? Старият спира да работи.">🔑 Нов ПИН</button></form>' : '') .
        $f . '<button name="action" value="revoke_batch" class="sm ghost" data-confirm="Да спрем ли ВСИЧКИ кодове в партидата?">⛔ Спри всички</button></form>' .
        $f . '<button name="action" value="restore_batch" class="sm ghost">↩️ Възстанови всички</button></form>' .
        ($used === 0 ? $f . '<button name="action" value="delete_batch" class="sm red" data-confirm="Да изтрием ли партидата? Това не може да се върне.">🗑 Изтрий партидата</button></form>' : '') . '</div></div>';
    $body .= '<div class="card"><details' . ($b['type'] === 'class' && empty($b['school_id']) ? ' open' : '') . '><summary>🏫 Училище, клас, учител и бележка' . ($b['type'] === 'class' && empty($b['school_id']) ? ' – <b style="color:#B4232A">попълнете за общата класация</b>' : '') . '</summary>' .
        '<form method="post" style="margin-top:10px">' . csrf_field() . '<input type="hidden" name="action" value="info"><input type="hidden" name="batch" value="' . $bid . '"><div class="grid g3">' .
        school_fields($pdo, $b['school_id'] ? (int)$b['school_id'] : null) .
        '<label>Клас (напр. 2. б)<input name="class_name" maxlength="20" value="' . h($b['class_name'] ?? '') . '"></label>' .
        '<label>Учител (по желание)<input name="teacher_name" maxlength="40" value="' . h($b['teacher_name'] ?? '') . '"></label>' .
        '<label class="wide">Бележка на картичките<input name="label" maxlength="120" value="' . h($b['label'] ?? '') . '"></label>' .
        '<label class="chk"><input type="checkbox" name="public" value="1"' . ((int)($b['public'] ?? 1) ? ' checked' : '') . '> Участва в общата класация</label></div><button class="sm">Запази</button></form></details></div>';
    $body .= '<div class="card"><h2>Кодове</h2><p class="hint">„Освободи“ – ако дете смени или загуби устройство. Старото губи достъпа, а кодът може да се въведе отново веднъж.</p><div class="tw"><table><thead><tr><th>Код</th><th>За</th><th>Активиран</th><th>Прякор</th><th class="num">Точки</th><th>Последно</th><th>Статус</th><th></th></tr></thead><tbody>' . $rows . '</tbody></table></div></div>';
    page('Партида', $body);
}

/* ---------- търсене ---------- */
$q = trim((string)($_GET['q'] ?? ''));
$search = '';
if ($q !== '') {
    $nc = normalize_code($q);
    $st = $pdo->prepare("SELECT c.code, c.batch_id, c.role, c.revoked, c.expires_at, b.label, r.nickname, r.created_at AS act, r.last_seen FROM codes c JOIN batches b ON b.id = c.batch_id LEFT JOIN redemptions r ON r.code = c.code
        WHERE c.code = ? OR c.code LIKE ? OR r.nickname LIKE ? OR b.label LIKE ? ORDER BY c.created_at DESC LIMIT 100");
    $like = '%' . mb_strtoupper($q) . '%';
    $st->execute([$nc ?: '-', $like, '%' . $q . '%', '%' . $q . '%']);
    $rows = '';
    foreach ($st as $r) $rows .= '<tr><td class="mono"><a href="?batch=' . (int)$r['batch_id'] . '">' . h($r['code']) . '</a></td><td>' . h($r['role'] === 'teacher' ? 'учител' : 'ученик') . '</td><td>' . h($r['label']) . '</td><td>' . h($r['nickname'] ?? '') . '</td><td>' . fdate($r['act']) . '</td><td>' . fdate($r['last_seen']) . '</td><td>' . ($r['revoked'] ? '<span class="tag tr">спрян</span>' : ($r['expires_at'] < today() ? '<span class="tag">изтекъл</span>' : '<span class="tag tg">валиден</span>')) . '</td></tr>';
    $search = '<div class="card"><h2>Резултати за „' . h($q) . '“</h2>' . ($rows ? '<div class="tw"><table><thead><tr><th>Код</th><th>За</th><th>Партида</th><th>Прякор</th><th>Активиран</th><th>Последно</th><th>Статус</th></tr></thead><tbody>' . $rows . '</tbody></table></div>' : '<p>Няма намерени кодове.</p>') . '</div>';
}

/* ---------- изглед: всички партиди ---------- */
$oid = (int)($_GET['order'] ?? 0);
$ord = null;
if ($oid) { $o = $pdo->prepare('SELECT * FROM orders WHERE id = ?'); $o->execute([$oid]); $ord = $o->fetch() ?: null; }
$preType = $ord ? (str_contains((string)$ord['plan'], 'клас') ? 'class' : (str_contains((string)$ord['plan'], 'Семеен') ? 'family' : 'single')) : 'class';
$preExp = school_year_end();
$preCount = $ord ? max(1, (int)$ord['qty'] * ($preType === 'class' ? 30 : ($preType === 'family' ? 4 : 1))) : 25;
$preExp = $ord && str_contains((string)$ord['plan'], '6 месеца') ? date('Y-m-d', strtotime('+6 months')) : ($ord && str_contains((string)$ord['plan'], '1 година') ? date('Y-m-d', strtotime('+1 year')) : school_year_end());
$opt = fn($v, $t) => '<option value="' . $v . '"' . ($v === $preType ? ' selected' : '') . '>' . $t . '</option>';
$body = '<form method="get" class="card filters noprint"><label>Търсене<input name="q" value="' . h($q) . '" placeholder="код, прякор или бележка"></label><button class="blue">🔍 Търси</button>' . ($q !== '' ? '<a class="btn ghost" href="kodove.php">Изчисти</a>' : '') . '</form>' . $search;
$body .= '<form method="post" class="card"><h2>Нови кодове' . ($ord ? ' за поръчка #' . $oid . ' – ' . h($ord['client']) : '') . '</h2>' . csrf_field() . '<input type="hidden" name="action" value="create"><input type="hidden" name="order_id" value="' . $oid . '"><div class="grid g4">' .
    '<label>Вид<select name="type" id="t">' . $opt('class', 'Клас – код за всеки ученик + учител') . $opt('teacher', 'Учител – личен достъп') . $opt('single', 'Индивидуален – за едно дете') . $opt('family', 'Семеен – по един код на дете') . '</select></label>' .
    '<label><span id="cl">Брой ученици</span><input type="number" name="count" id="u" value="' . $preCount . '" min="1" max="500"></label>' .
    '<span class="forclass" style="display:contents">' . school_fields($pdo, $ord && $ord['school_id'] ? (int)$ord['school_id'] : null) .
    '<label>Клас (напр. 2. б)<input name="class_name" maxlength="20" placeholder="2. б"></label>' .
    '<label>Учител (по желание)<input name="teacher_name" maxlength="40" placeholder="г-жа Петрова"></label>' .
    '<label>Помощни учители (с картичка)<select name="helpers"><option value="2" selected>2 (1 + 2)</option><option value="1">1</option><option value="0">няма</option><option value="3">3</option></select></label></span>' .
    '<label>Валидни до<input type="date" name="expires" value="' . $preExp . '"></label>' .
    '<label class="wide">Бележка на картичките (празно = „2. б клас · училище, град“)<input name="label" maxlength="120" value="' . h($ord && $preType !== 'class' ? $ord['client'] : '') . '"></label></div>' .
    '<p class="hint">Всеки код е <b>еднократен</b> – активира се на едно устройство. За клас се създава код за всеки ученик и картички за учителя и помощниците (код + общ ПИН за класацията). Индивидуалните и семейните кодове получават <b>ПИН за родителя</b> за отчета.</p><button>Създай кодове</button></form>' .
    '<script>(function(){var t=document.getElementById("t");function f(){var v=t.value;document.getElementById("cl").textContent={class:"Брой ученици",teacher:"Брой учители",single:"Брой кодове",family:"Брой деца"}[v];document.querySelector(".forclass").style.display=v==="class"?"contents":"none";}t.addEventListener("change",function(){document.getElementById("u").value={class:25,teacher:1,single:1,family:4}[t.value];f();});f();})();</script>';
$type = in_array($_GET['type'] ?? '', array_keys(TYPE_NAMES), true) ? $_GET['type'] : '';
$where = $type ? "WHERE b.type = '" . $type . "'" : '';
$rows = '';
foreach ($pdo->query("SELECT b.*, s.name AS sname, s.town, (SELECT COUNT(*) FROM codes c WHERE c.batch_id = b.id AND COALESCE(c.role,'student') <> 'teacher') AS n,
        (SELECT COUNT(DISTINCT r.code) FROM redemptions r JOIN codes c ON c.code = r.code WHERE c.batch_id = b.id AND COALESCE(c.role,'student') <> 'teacher') AS dev,
        (SELECT COUNT(*) FROM codes c WHERE c.batch_id = b.id AND c.revoked = 1) AS rev
        FROM batches b LEFT JOIN schools s ON s.id = b.school_id $where ORDER BY b.id DESC") as $b) {
    $exp = $b['expires_at'] < today() ? '<span class="tag">изтекли</span>' : ($b['expires_at'] < date('Y-m-d', strtotime('+30 days')) ? '<span class="tag ty">изтичат скоро</span>' : '');
    $pct = $b['n'] ? round($b['dev'] / $b['n'] * 100) : 0;
    $rows .= '<tr><td><a href="?batch=' . (int)$b['id'] . '"><b>' . h($b['label'] ?: 'Партида #' . $b['id']) . '</b></a>' . ($b['sname'] ? '<br><small class="muted">' . h($b['sname'] . ', ' . $b['town']) . '</small>' : '') . '</td><td>' . h(TYPE_NAMES[$b['type']] ?? $b['type']) . '</td><td class="num">' . (int)$b['n'] . '</td><td class="num">' . (int)$b['dev'] . ' <small class="muted">(' . $pct . '%)</small></td><td>' . fdate($b['expires_at']) . ' ' . $exp . ((int)$b['rev'] ? ' <span class="tag tr">' . (int)$b['rev'] . ' спрени</span>' : '') . '</td><td class="row"><a class="btn sm ghost" href="cards.php?batch=' . (int)$b['id'] . '" target="_blank">🖨️</a><a class="btn sm ghost" href="?action=csv&amp;batch=' . (int)$b['id'] . '">CSV</a></td></tr>';
}
$tabs = '<div class="pill-nav">';
foreach (['' => 'Всички'] + TYPE_NAMES as $k => $v) $tabs .= '<a class="btn sm ' . ($type === $k ? '' : 'ghost') . '" href="?type=' . $k . '">' . h($v) . '</a>';
$tabs .= '</div>';
$body .= '<div class="card"><h2>Партиди</h2>' . $tabs . ($rows ? '<div class="tw"><table><thead><tr><th>Партида</th><th>Вид</th><th class="num">Кодове</th><th class="num">Активирани</th><th>Валидни до</th><th></th></tr></thead><tbody>' . $rows . '</tbody></table></div>' : '<p>Още няма кодове. Създайте първите горе.</p>') . '</div>';
page('Кодове за достъп', $body);
