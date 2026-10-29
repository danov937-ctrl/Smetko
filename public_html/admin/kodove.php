<?php
/* Кодове за абонамент: един код = един абонамент. Клиентът го активира веднъж в акаунта си (smetko.com → Абонаменти).
   Индивидуален → 1 дете, семеен → до 4 деца, клас → до 30 ученици (учителят ги създава в „Табло“ с име и парола). */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$action = $_POST['action'] ?? $_GET['action'] ?? '';
$PLANS = ['single' => 'Индивидуален (1 дете)', 'family' => 'Семеен (до 4 деца)', 'class' => 'Цял клас (до 30 ученици)'];
$code = normalize_code((string)($_POST['code'] ?? $_GET['code'] ?? ''));
$back = fn(string $c = '') => go('kodove.php' . ($c ? '?code=' . urlencode($c) : ''));

/* ---------- създаване ---------- */
if ($action === 'create') {
    $type = array_key_exists($_POST['type'] ?? '', $PLANS) ? $_POST['type'] : 'single';
    $count = max(1, min(200, (int)($_POST['count'] ?? 1)));
    $exp = preg_match('/^\d{4}-\d{2}-\d{2}$/', post('expires')) ? post('expires') : date('Y-m-d', strtotime('+1 year'));
    $label = mb_substr(post('label'), 0, 120);
    $oid = (int)($_POST['order_id'] ?? 0);
    $seats = PLAN_SEATS[$type];
    $sid = $type === 'class' ? school_from_post($pdo) : null;
    $made = make_codes($type, $count, $exp, $label, $oid ?: null, $sid);
    audit('Нови кодове', TYPE_NAMES[$type] . " × $count до $exp · $label" . ($oid ? " · поръчка #$oid" : ''));
    flash("Създадени са $count кода ($PLANS[$type]). Изпратете ги на клиента – активират се в „Абонаменти“.");
    go($oid ? 'porachki.php?id=' . $oid : 'kodove.php?made=' . urlencode(implode(',', $made)));
}
$row = $code ? get_code($code) : null;
if ($row && in_array($action, ['revoke', 'restore'], true)) {
    $pdo->prepare('UPDATE codes SET revoked = ? WHERE code = ?')->execute([$action === 'revoke' ? 1 : 0, $code]);
    audit($action === 'revoke' ? 'Спрян код' : 'Възстановен код', $code); flash($action === 'revoke' ? 'Кодът е спрян – абонаментът не работи.' : 'Кодът е възстановен.'); $back($code);
}
if ($row && $action === 'extend' && preg_match('/^\d{4}-\d{2}-\d{2}$/', post('expires'))) {
    $pdo->prepare('UPDATE codes SET expires_at = ? WHERE code = ?')->execute([post('expires'), $code]);
    if ($row['type'] === 'class') $pdo->prepare('UPDATE batches SET expires_at = ? WHERE id = ?')->execute([post('expires'), (int)$row['batch_id']]);
    audit('Нова валидност', "$code → " . post('expires')); flash('Валидността е обновена.'); $back($code);
}
if ($row && $action === 'seats') {
    $n = max(1, min(200, (int)post('seats')));
    $pdo->prepare('UPDATE codes SET max_uses = ? WHERE code = ?')->execute([$n, $code]);
    audit('Места в абонамента', "$code → $n"); flash('Броят места е обновен.'); $back($code);
}
if ($row && $action === 'label') {
    $pdo->prepare('UPDATE codes SET label = ? WHERE code = ?')->execute([mb_substr(post('label'), 0, 120), $code]);
    audit('Бележка към код', $code); flash('Запазено.'); $back($code);
}
if ($row && $action === 'release') { // активиран по погрешка в чужд акаунт → може да се активира отново
    $pdo->prepare('UPDATE codes SET account_id = NULL, activated_at = NULL WHERE code = ?')->execute([$code]);
    $pdo->prepare('UPDATE profiles SET code = NULL WHERE code = ?')->execute([$code]);
    if ($row['type'] === 'class') $pdo->prepare('UPDATE batches SET account_id = NULL WHERE id = ?')->execute([(int)$row['batch_id']]);
    audit('Освободен код', $code); flash('Кодът е освободен – може да се активира отново (учениците на класа се запазват).'); $back($code);
}
if ($row && $action === 'delete') {
    if ($row['account_id']) { flash('Кодът е активиран – спрете го вместо да го триете.', 'err'); $back($code); }
    $pdo->prepare('DELETE FROM codes WHERE code = ?')->execute([$code]);
    $n = $pdo->prepare('SELECT COUNT(*) FROM codes WHERE batch_id = ?'); $n->execute([(int)$row['batch_id']]);
    if (!(int)$n->fetchColumn()) $pdo->prepare('DELETE FROM batches WHERE id = ?')->execute([(int)$row['batch_id']]);
    audit('Изтрит код', $code); flash('Кодът е изтрит.'); go('kodove.php');
}

$status = function (array $c): string {
    if ((int)$c['revoked']) return '<span class="tag tr">спрян</span>';
    if ($c['expires_at'] < today()) return '<span class="tag">изтекъл</span>';
    return $c['account_id'] ? '<span class="tag tg">активен</span>' : '<span class="tag">свободен</span>';
};

/* ---------- един код ---------- */
if ($row && $action === '') {
    $acc = null; if ($row['account_id']) { $a = $pdo->prepare('SELECT id, email, name FROM accounts WHERE id = ?'); $a->execute([(int)$row['account_id']]); $acc = $a->fetch() ?: null; }
    $b = $pdo->prepare('SELECT b.*, s.name AS sname, s.town FROM batches b LEFT JOIN schools s ON s.id = b.school_id WHERE b.id = ?'); $b->execute([(int)$row['batch_id']]); $b = $b->fetch() ?: [];
    $who = '';
    if ($row['type'] === 'class') {
        $st = $pdo->prepare('SELECT nickname, username, last_seen, ' . SCORE_ALL . ' AS pts FROM redemptions r WHERE code = ? ORDER BY pts DESC'); $st->execute([$code]);
        $kids = $st->fetchAll();
        $who = '<div class="card"><h2>Класът</h2><p>' . h(($b['class_name'] ?? '') ? $b['class_name'] . ' клас' : 'Класът още не е вписан') . ($b['sname'] ?? '' ? ' · ' . h($b['sname'] . ', ' . $b['town']) : '') . ($b['teacher_name'] ?? '' ? ' · ' . h($b['teacher_name']) : '') . '</p>' .
            ($kids ? '<div class="tw"><table><thead><tr><th>Ученик</th><th>Потребител</th><th class="num">Точки</th><th>Последно</th></tr></thead><tbody>' . implode('', array_map(fn($k) => '<tr><td>' . h($k['nickname']) . '</td><td class="mono">' . h($k['username']) . '</td><td class="num">' . (int)$k['pts'] . '</td><td>' . fdate($k['last_seen']) . '</td></tr>', $kids)) . '</tbody></table></div>' : '<p class="muted">Учителят още не е добавил ученици.</p>') . '</div>';
    } else {
        $st = $pdo->prepare('SELECT name, grade FROM profiles WHERE code = ?'); $st->execute([$code]);
        $kids = $st->fetchAll();
        $who = '<div class="card"><h2>Включени деца</h2>' . ($kids ? '<p>' . implode(', ', array_map(fn($k) => h($k['name']) . ' (' . (int)$k['grade'] . '. клас)', $kids)) . '</p>' : '<p class="muted">Още няма детски профили.</p>') . '</div>';
    }
    $f = '<form method="post" class="inline">' . csrf_field() . '<input type="hidden" name="code" value="' . h($code) . '">';
    $body = '<div class="card"><p><a href="kodove.php">← Всички кодове</a></p><h2 class="mono">' . h($code) . ' ' . $status($row) . '</h2>' .
        '<p>' . h($PLANS[$row['type']] ?? $row['type']) . ' · места: <b>' . code_seats($row) . '</b> · валиден до <b>' . fdate($row['expires_at']) . '</b>' . ($row['label'] ? ' · ' . h($row['label']) : '') . '</p>' .
        '<p>' . ($acc ? 'Активиран на ' . fdate($row['activated_at']) . ' от <a href="akaunti.php?id=' . (int)$acc['id'] . '">' . h($acc['email']) . '</a> (' . h($acc['name']) . ')' : 'Още не е активиран. Клиентът го въвежда на <b>smetko.com → Абонаменти</b>.') .
        ($row['order_id'] ? ' · <a href="porachki.php?id=' . (int)$row['order_id'] . '">поръчка #' . (int)$row['order_id'] . '</a>' : '') . '</p>' .
        '<div class="row">' . $f . ((int)$row['revoked'] ? '<button name="action" value="restore" class="ghost">↩️ Възстанови</button>' : '<button name="action" value="revoke" class="ghost" data-confirm="Да спрем ли абонамента?">⛔ Спри</button>') . '</form>' .
        ($acc ? $f . '<button name="action" value="release" class="ghost" data-confirm="Да освободим ли кода? Ще може да се активира в друг акаунт.">🔓 Освободи</button></form>' : $f . '<button name="action" value="delete" class="red" data-confirm="Да изтрием ли кода?">🗑 Изтрий</button></form>') .
        '<a class="btn ghost" target="_blank" href="cards.php?code=' . urlencode($code) . '">🖨️ Картичка</a></div></div>' .
        '<div class="card grid g3">' .
        '<form method="post">' . csrf_field() . '<input type="hidden" name="action" value="extend"><input type="hidden" name="code" value="' . h($code) . '"><label>Валиден до<input type="date" name="expires" value="' . h($row['expires_at']) . '"></label><button class="sm">Запази</button></form>' .
        '<form method="post">' . csrf_field() . '<input type="hidden" name="action" value="seats"><input type="hidden" name="code" value="' . h($code) . '"><label>Места (деца/ученици)<input type="number" name="seats" min="1" max="200" value="' . code_seats($row) . '"></label><button class="sm">Запази</button></form>' .
        '<form method="post">' . csrf_field() . '<input type="hidden" name="action" value="label"><input type="hidden" name="code" value="' . h($code) . '"><label>Бележка (клиент)<input name="label" maxlength="120" value="' . h($row['label']) . '"></label><button class="sm">Запази</button></form></div>' . $who;
    page('Код за абонамент', $body);
}

/* ---------- списък ---------- */
$q = trim((string)($_GET['q'] ?? '')); $type = array_key_exists($_GET['type'] ?? '', $PLANS) ? $_GET['type'] : ''; $st0 = in_array($_GET['st'] ?? '', ['free', 'active', 'expired', 'revoked'], true) ? $_GET['st'] : '';
$where = ["c.type IN ('single','family','class')"]; $args = [];
if ($type) { $where[] = 'c.type = ?'; $args[] = $type; }
if ($st0 === 'free') $where[] = 'c.account_id IS NULL AND c.revoked = 0 AND c.expires_at >= date(\'now\')';
if ($st0 === 'active') $where[] = 'c.account_id IS NOT NULL AND c.revoked = 0 AND c.expires_at >= date(\'now\')';
if ($st0 === 'expired') $where[] = 'c.expires_at < date(\'now\')';
if ($st0 === 'revoked') $where[] = 'c.revoked = 1';
if ($q !== '') { $where[] = '(c.code LIKE ? OR c.label LIKE ? OR a.email LIKE ? OR b.class_name LIKE ? OR s.name LIKE ?)'; $l = '%' . $q . '%'; array_push($args, '%' . strtoupper($q) . '%', $l, $l, $l, $l); }
$sql = "SELECT c.*, a.email, b.class_name, s.name AS sname, (SELECT COUNT(*) FROM profiles p WHERE p.code = c.code) AS up, (SELECT COUNT(*) FROM redemptions r WHERE r.code = c.code) AS ur
    FROM codes c LEFT JOIN accounts a ON a.id = c.account_id LEFT JOIN batches b ON b.id = c.batch_id LEFT JOIN schools s ON s.id = b.school_id WHERE " . implode(' AND ', $where) . ' ORDER BY c.created_at DESC';
if ($action === 'csv') {
    $st = $pdo->prepare($sql); $st->execute($args);
    csv_out('smetko-kodove-' . date('Y-m-d') . '.csv', ['Код', 'Вид', 'Места', 'Използвани', 'Валиден до', 'Активиран от', 'Активиран на', 'Бележка', 'Спрян'],
        (function () use ($st) { foreach ($st as $r) yield [$r['code'], TYPE_NAMES[$r['type']] ?? $r['type'], code_seats($r), $r['type'] === 'class' ? $r['ur'] : $r['up'], $r['expires_at'], $r['email'], substr((string)$r['activated_at'], 0, 10), $r['label'], $r['revoked'] ? 'да' : '']; })());
}
$st = $pdo->prepare($sql . ' LIMIT 500'); $st->execute($args);
$rows = '';
$made = array_filter(explode(',', (string)($_GET['made'] ?? '')));
foreach ($st as $r) $rows .= '<tr' . (in_array($r['code'], $made, true) ? ' style="background:#FFF8E6"' : '') . '><td class="mono"><a href="?code=' . urlencode($r['code']) . '">' . h($r['code']) . '</a></td><td>' . h(TYPE_NAMES[$r['type']] ?? $r['type']) . '</td><td class="num">' . ($r['type'] === 'class' ? (int)$r['ur'] : (int)$r['up']) . ' / ' . code_seats($r) . '</td><td>' . fdate($r['expires_at']) . '</td><td>' . $status($r) . '</td><td>' . h((string)$r['email']) . '</td><td>' . h(trim(($r['class_name'] ? $r['class_name'] . ' · ' : '') . ($r['sname'] ?? '') . ' ' . ($r['label'] ?? ''))) . '</td></tr>';
$oid = (int)($_GET['order'] ?? 0); $ord = null;
if ($oid) { $o = $pdo->prepare('SELECT * FROM orders WHERE id = ?'); $o->execute([$oid]); $ord = $o->fetch() ?: null; }
$preType = $ord ? (str_contains((string)$ord['plan'], 'клас') ? 'class' : (str_contains((string)$ord['plan'], 'Семеен') ? 'family' : 'single')) : 'single';
$preExp = date('Y-m-d', strtotime($ord && str_contains((string)$ord['plan'], '6 месеца') ? '+6 months' : '+1 year'));
$opt = fn($v, $t) => '<option value="' . $v . '"' . ($v === $preType ? ' selected' : '') . '>' . h($t) . '</option>';
$body = '<form method="post" class="card"><h2>➕ Нови кодове' . ($ord ? ' за поръчка #' . $oid . ' – ' . h($ord['client']) : '') . '</h2>' . csrf_field() . '<input type="hidden" name="action" value="create"><input type="hidden" name="order_id" value="' . $oid . '"><div class="grid g4">' .
    '<label>Абонамент<select name="type" id="t">' . $opt('single', $PLANS['single']) . $opt('family', $PLANS['family']) . $opt('class', $PLANS['class']) . '</select></label>' .
    '<label>Брой кодове (абонаменти)<input type="number" name="count" value="' . ($ord ? max(1, (int)$ord['qty']) : 1) . '" min="1" max="200"></label>' .
    '<label>Валидни до<input type="date" name="expires" value="' . $preExp . '"></label>' .
    '<label>Бележка (клиент)<input name="label" maxlength="120" value="' . h($ord['client'] ?? '') . '"></label>' .
    '<span class="forclass" style="display:contents">' . school_fields($pdo, $ord && $ord['school_id'] ? (int)$ord['school_id'] : null) . '</span></div>' .
    '<p class="hint">Един код = един абонамент. Клиентът го въвежда <b>веднъж</b> на smetko.com → <b>Абонаменти</b> (от акаунта си). За клас всеки код е отделен клас – учителят вписва класа и учениците в „Табло“.</p><button>Създай</button></form>' .
    '<script>(function(){var t=document.getElementById("t");function f(){document.querySelector(".forclass").style.display=t.value==="class"?"contents":"none";}t.addEventListener("change",f);f();})();</script>';
$tabs = '<form method="get" class="filters noprint"><label>Търсене<input name="q" value="' . h($q) . '" placeholder="код, имейл, клиент, училище"></label><label>Вид<select name="type"><option value="">всички</option>' . implode('', array_map(fn($k) => '<option value="' . $k . '"' . ($type === $k ? ' selected' : '') . '>' . h(TYPE_NAMES[$k]) . '</option>', array_keys($PLANS))) . '</select></label>' .
    '<label>Статус<select name="st"><option value="">всички</option>' . implode('', array_map(fn($k, $v) => '<option value="' . $k . '"' . ($st0 === $k ? ' selected' : '') . '>' . $v . '</option>', ['free', 'active', 'expired', 'revoked'], ['свободни', 'активни', 'изтекли', 'спрени'])) . '</select></label><button class="blue">🔍 Покажи</button></form>';
$body .= '<div class="card"><h2>Кодове</h2>' . $tabs . ($rows ? '<div class="tw"><table><thead><tr><th>Код</th><th>Вид</th><th class="num">Използвани места</th><th>Валиден до</th><th>Статус</th><th>Акаунт</th><th>Клиент / клас</th></tr></thead><tbody>' . $rows . '</tbody></table></div>' : '<p class="muted">Няма кодове.</p>') . '</div>';
page('Кодове за абонамент', $body, '<a class="btn ghost" href="?action=csv&amp;q=' . urlencode($q) . '&amp;type=' . $type . '&amp;st=' . $st0 . '">⬇️ CSV</a>');
