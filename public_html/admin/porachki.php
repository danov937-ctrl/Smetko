<?php
/* Поръчки и клиенти: запис, суми с отстъпки, кодове към поръчката, имейл, проформа, CSV. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$cfg = site_config();
$P = $cfg['prices'];
$PLANS = [ // име => [ключ за цена, единица]
    'Цял клас' => ['class', 'клас'], '1 месец' => ['month', 'абонамент'], 'Учебна година' => ['schoolYear', 'абонамент'],
    '1 година' => ['year', 'абонамент'], 'Семеен' => ['family', 'семейство'], 'Друго' => ['', 'бр.'],
];
$action = $_POST['action'] ?? $_GET['action'] ?? '';
$id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);

if ($action === 'save') {
    $plan = array_key_exists(post('plan'), $PLANS) ? post('plan') : 'Друго';
    $status = array_key_exists(post('status'), ORDER_STATUS) ? post('status') : 'new';
    $paid = preg_match('/^\d{4}-\d{2}-\d{2}$/', post('paid_at')) ? post('paid_at') : ($status === 'paid' || $status === 'done' ? date('Y-m-d') : null);
    $sid = school_from_post($pdo);
    $data = [mb_substr(post('client'), 0, 160), mb_substr(post('contact'), 0, 120), mb_substr(post('email'), 0, 160), mb_substr(post('phone'), 0, 40), $sid, $plan,
        max(1, (int)post('qty', '1')), round((float)str_replace(',', '.', post('amount', '0')), 2), $status, mb_substr(post('invoice'), 0, 40), $paid, mb_substr(post('notes'), 0, 2000)];
    if ($data[0] === '') { flash('Попълнете клиента.', 'err'); go('porachki.php?' . ($id ? 'id=' . $id : 'new=1')); }
    if ($id) {
        $pdo->prepare('UPDATE orders SET client=?, contact=?, email=?, phone=?, school_id=?, plan=?, qty=?, amount=?, status=?, invoice=?, paid_at=?, notes=? WHERE id=?')->execute(array_merge($data, [$id]));
        audit('Редакция на поръчка', "#$id {$data[0]} · " . money($data[7]) . ' · ' . ORDER_STATUS[$status][0]);
    } else {
        $pdo->prepare('INSERT INTO orders(client, contact, email, phone, school_id, plan, qty, amount, status, invoice, paid_at, notes, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute(array_merge($data, [now()]));
        $id = (int)$pdo->lastInsertId();
        audit('Нова поръчка', "#$id {$data[0]} · {$plan} × {$data[6]} · " . money($data[7]));
    }
    flash('Поръчката е запазена.'); go('porachki.php?id=' . $id);
}
if ($action === 'status' && $id) {
    $s = array_key_exists(post('status'), ORDER_STATUS) ? post('status') : 'new';
    $pdo->prepare('UPDATE orders SET status = ?, paid_at = CASE WHEN ? IN (\'paid\',\'done\') AND paid_at IS NULL THEN ? ELSE paid_at END WHERE id = ?')->execute([$s, $s, date('Y-m-d'), $id]);
    audit('Статус на поръчка', "#$id → " . ORDER_STATUS[$s][0]); flash('Статусът е обновен.'); go('porachki.php?id=' . $id);
}
if ($action === 'link' && $id) {
    $pdo->prepare('UPDATE orders SET batch_id = ? WHERE id = ?')->execute([(int)post('batch') ?: null, $id]);
    audit('Партида към поръчка', "#$id → #" . (int)post('batch')); flash('Партидата е свързана.'); go('porachki.php?id=' . $id);
}
if ($action === 'delete' && $id) {
    $pdo->prepare('DELETE FROM orders WHERE id = ?')->execute([$id]); audit('Изтрита поръчка', "#$id"); flash('Поръчката е изтрита.'); go('porachki.php');
}
if ($action === 'csv') {
    $st = $pdo->query('SELECT o.*, s.name AS sname FROM orders o LEFT JOIN schools s ON s.id = o.school_id ORDER BY o.id DESC');
    csv_out('smetko-porachki.csv', ['№', 'Дата', 'Клиент', 'Лице за контакт', 'Имейл', 'Телефон', 'Училище', 'План', 'Брой', 'Сума €', 'Статус', 'Фактура', 'Платена на', 'Бележки'],
        (function () use ($st) { foreach ($st as $o) yield [$o['id'], substr($o['created_at'], 0, 10), $o['client'], $o['contact'], $o['email'], $o['phone'], $o['sname'], $o['plan'], $o['qty'], $o['amount'], ORDER_STATUS[$o['status']][0] ?? $o['status'], $o['invoice'], $o['paid_at'], $o['notes']]; })());
}

$co = $cfg['company'];
/* ---------- проформа за печат ---------- */
if ($action === 'proforma' && $id) {
    $o = $pdo->prepare('SELECT * FROM orders WHERE id = ?'); $o->execute([$id]); $o = $o->fetch();
    if (!$o) go('porachki.php');
    $unit = $o['qty'] ? $o['amount'] / $o['qty'] : $o['amount'];
    $missing = !$co['name'] || !$co['eik'] || !$co['iban'];
    echo '<!doctype html><html lang="bg"><head><meta charset="utf-8"><title>Проформа ' . (int)$o['id'] . '</title><style>body{font:14px/1.5 Arial,sans-serif;color:#111;max-width:760px;margin:30px auto;padding:0 20px}h1{font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{border:1px solid #bbb;padding:7px;text-align:left}.r{text-align:right}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0}.box{border:1px solid #ddd;padding:12px;border-radius:6px}.warn{background:#FFF2CC;padding:10px;border-radius:6px}@media print{.noprint{display:none}}</style></head><body>' .
        ($missing ? '<p class="warn noprint">⚠ Попълнете данните на фирмата (име, ЕИК, IBAN) в Настройки → Фирма.</p>' : '') .
        '<p class="noprint"><button onclick="print()">🖨️ Печат / PDF</button> <a href="porachki.php?id=' . $id . '">← Назад</a></p>' .
        '<h1>ПРОФОРМА ФАКТУРА № ' . str_pad((string)$o['id'], 6, '0', STR_PAD_LEFT) . '</h1><p>Дата: ' . date('d.m.Y') . '</p>' .
        '<div class="grid"><div class="box"><b>Доставчик</b><br>' . h($co['name'] ?: '[фирма]') . '<br>ЕИК: ' . h($co['eik'] ?: '…') . ($co['vat'] ? '<br>ДДС №: ' . h($co['vat']) : '') . '<br>' . h($co['addr'] ?: '[адрес]') . ($co['mol'] ? '<br>МОЛ: ' . h($co['mol']) : '') . '<br>' . h($cfg['contactEmail']) . ($co['phone'] ? ', ' . h($co['phone']) : '') . '</div>' .
        '<div class="box"><b>Получател</b><br>' . h($o['client']) . ($o['contact'] ? '<br>' . h($o['contact']) : '') . ($o['email'] ? '<br>' . h($o['email']) : '') . ($o['phone'] ? '<br>' . h($o['phone']) : '') . '</div></div>' .
        '<table><tr><th>Описание</th><th class="r">Кол.</th><th class="r">Ед. цена</th><th class="r">Сума</th></tr><tr><td>Достъп до образователната платформа „Сметко“ (smetko.com) – ' . h($o['plan']) . '</td><td class="r">' . (int)$o['qty'] . '</td><td class="r">' . number_format($unit, 2, '.', ' ') . ' €</td><td class="r">' . number_format((float)$o['amount'], 2, '.', ' ') . ' €</td></tr>' .
        '<tr><td colspan="3" class="r"><b>Общо за плащане</b></td><td class="r"><b>' . number_format((float)$o['amount'], 2, '.', ' ') . ' €</b></td></tr></table>' .
        '<p>Начин на плащане: банков превод' . ($co['iban'] ? '<br>IBAN: <b>' . h($co['iban']) . '</b>' . ($co['bank'] ? ', ' . h($co['bank']) : '') : '') . '<br>Основание: Проформа № ' . str_pad((string)$o['id'], 6, '0', STR_PAD_LEFT) . '</p>' .
        ($co['vat'] ? '' : '<p><small>Доставчикът не е регистриран по ЗДДС.</small></p>') .
        '<p><small>Проформата не е данъчен документ. Фактура се издава след плащането.</small></p></body></html>';
    exit;
}

/* ---------- форма: нова / редакция ---------- */
if ($id || isset($_GET['new'])) {
    $o = ['client' => '', 'contact' => '', 'email' => '', 'phone' => '', 'school_id' => null, 'plan' => 'Цял клас', 'qty' => 1, 'amount' => '', 'status' => 'new', 'invoice' => '', 'paid_at' => '', 'notes' => '', 'batch_id' => null, 'created_at' => now()];
    if ($id) { $st = $pdo->prepare('SELECT * FROM orders WHERE id = ?'); $st->execute([$id]); $o = $st->fetch() ?: go('porachki.php'); }
    $popts = ''; foreach ($PLANS as $name => [$key, $unit]) $popts .= '<option value="' . h($name) . '" data-price="' . h($key ? $P[$key] : '') . '" data-unit="' . h($unit) . '"' . ($o['plan'] === $name ? ' selected' : '') . '>' . h($name) . ($key ? ' – ' . h($P[$key]) . ' €' : '') . '</option>';
    $sopts = ''; foreach (ORDER_STATUS as $k => [$t, $c]) $sopts .= '<option value="' . $k . '"' . ($o['status'] === $k ? ' selected' : '') . '>' . h($t) . '</option>';
    $body = '<form method="post" class="card">' . csrf_field() . '<input type="hidden" name="action" value="save"><input type="hidden" name="id" value="' . $id . '">' .
        '<h2>' . ($id ? 'Поръчка #' . $id . ' <small class="muted">от ' . fdate($o['created_at']) . '</small>' : 'Нова поръчка') . '</h2><div class="grid g3">' .
        '<label class="wide">Клиент (училище, учител или родител)<input name="client" required maxlength="160" value="' . h($o['client']) . '" placeholder="ОУ „Иван Вазов“ – Пловдив"></label>' .
        '<label>Лице за контакт<input name="contact" maxlength="120" value="' . h($o['contact']) . '"></label><label>Имейл<input type="email" name="email" maxlength="160" value="' . h($o['email']) . '"></label><label>Телефон<input name="phone" maxlength="40" value="' . h($o['phone']) . '"></label>' .
        school_fields($pdo, $o['school_id'] ? (int)$o['school_id'] : null, '– не е училище –') .
        '<label>План<select name="plan" id="plan">' . $popts . '</select></label><label><span id="qlbl">Брой</span><input type="number" name="qty" id="qty" min="1" value="' . (int)$o['qty'] . '"></label>' .
        '<label>Отстъпка %<input type="number" id="disc" min="0" max="100" value="0"></label>' .
        '<label>Сума за плащане (€)<input name="amount" id="amount" inputmode="decimal" value="' . h($o['amount']) . '"></label>' .
        '<label>Статус<select name="status">' . $sopts . '</select></label><label>№ на фактура<input name="invoice" maxlength="40" value="' . h($o['invoice']) . '"></label><label>Платена на<input type="date" name="paid_at" value="' . h($o['paid_at']) . '"></label>' .
        '<label class="wide">Бележки<textarea name="notes" maxlength="2000">' . h($o['notes']) . '</textarea></label></div>' .
        '<p class="hint" id="calc"></p><div class="row"><button>💾 Запази</button><a class="btn ghost" href="porachki.php">Отказ</a></div></form>' .
        '<script>(function(){var pl=document.getElementById("plan"),q=document.getElementById("qty"),d=document.getElementById("disc"),a=document.getElementById("amount"),c=document.getElementById("calc"),d3=' . (float)$P['disc3'] . ',d8=' . (float)$P['disc8'] . ',touched=' . ($id ? 'true' : 'false') . ';' .
        'function opt(){return pl.options[pl.selectedIndex];}function auto(){if(opt().value==="Цял клас"){var n=+q.value;d.value=n>=8?d8:(n>=3?d3:0);}}' .
        'function calc(){var p=parseFloat(opt().dataset.price||0),n=+q.value||1,ds=+d.value||0;document.getElementById("qlbl").textContent="Брой ("+opt().dataset.unit+")";if(!p){c.textContent="Въведете сумата ръчно.";return;}var s=Math.round(p*n*(100-ds))/100;c.textContent=n+" × "+p+" €"+(ds?" − "+ds+"%":"")+" = "+s.toFixed(2)+" €";if(!touched)a.value=s.toFixed(2);}' .
        'pl.addEventListener("change",function(){touched=false;auto();calc();});q.addEventListener("input",function(){touched=false;auto();calc();});d.addEventListener("input",function(){touched=false;calc();});a.addEventListener("input",function(){touched=true;});auto();calc();})();</script>';
    if ($id) {
        $batch = null;
        if ($o['batch_id']) { $b = $pdo->prepare('SELECT * FROM batches WHERE id = ?'); $b->execute([(int)$o['batch_id']]); $batch = $b->fetch() ?: null; }
        $f = '<form method="post" class="inline">' . csrf_field() . '<input type="hidden" name="id" value="' . $id . '">';
        $act = '<div class="card"><h2>Действия</h2><div class="row">' .
            ($batch ? '<a class="btn" href="kodove.php?batch=' . (int)$batch['id'] . '">🔑 Кодовете: ' . h($batch['label'] ?: '#' . $batch['id']) . '</a><a class="btn ghost" target="_blank" href="cards.php?batch=' . (int)$batch['id'] . '">🖨️ Картички</a>'
                : '<a class="btn" href="kodove.php?order=' . $id . '">🔑 Създай кодовете за поръчката</a>') .
            '<a class="btn ghost" target="_blank" href="porachki.php?action=proforma&amp;id=' . $id . '">📄 Проформа</a>' .
            $f . '<input type="hidden" name="status" value="sent"><button name="action" value="status" class="ghost">📨 Изпратена</button></form>' .
            $f . '<input type="hidden" name="status" value="paid"><button name="action" value="status" class="green">💶 Платена</button></form>' .
            $f . '<button name="action" value="delete" class="red" data-confirm="Да изтрием ли поръчката?">🗑</button></form></div>';
        $bopts = '<option value="0">– няма –</option>';
        foreach ($pdo->query('SELECT id, label FROM batches ORDER BY id DESC LIMIT 200') as $b) $bopts .= '<option value="' . (int)$b['id'] . '"' . ((int)$o['batch_id'] === (int)$b['id'] ? ' selected' : '') . '>#' . (int)$b['id'] . ' ' . h($b['label']) . '</option>';
        $act .= '<form method="post" class="row" style="margin-top:12px">' . csrf_field() . '<input type="hidden" name="id" value="' . $id . '"><input type="hidden" name="action" value="link"><label style="margin:0">Свържи с партида <select name="batch" style="width:auto">' . $bopts . '</select></label><button class="sm ghost">Свържи</button></form></div>';
        // текст на имейл
        $codes = '';
        if ($batch) {
            $st = $pdo->prepare("SELECT code, role, pin FROM codes WHERE batch_id = ? AND revoked = 0 ORDER BY CASE WHEN role = 'teacher' THEN 0 ELSE 1 END, created_at, code"); $st->execute([(int)$batch['id']]);
            $list = $st->fetchAll();
            if ($batch['type'] === 'class') {
                $t = array_values(array_filter($list, fn($r) => $r['role'] === 'teacher'));
                $codes = "Код на учителя: " . ($t[0]['code'] ?? '') . "\nПИН за класацията: " . ($t[0]['pin'] ?? '') . "\n\nКодове за учениците (по един на дете):\n" . implode("\n", array_map(fn($r) => $r['code'], array_filter($list, fn($r) => $r['role'] !== 'teacher')));
            } else $codes = "Код(ове) за достъп:\n" . implode("\n", array_map(fn($r) => $r['code'], $list));
        }
        $mail = "Здравейте" . ($o['contact'] ? ', ' . $o['contact'] : '') . ",\n\nБлагодарим Ви, че избрахте Сметко – математика като игра за 1.–4. клас!\n\n" .
            ($codes ?: "[Кодовете ще бъдат тук, след като създадете партидата.]") . "\n\nКак се използва:\n1. Отворете smetko.com/kod\n2. Въведете кода – пълният достъп се включва веднага.\nВсеки код е еднократен и се активира на едно устройство." .
            ($batch && $batch['type'] === 'class' ? "\n\nКласацията на класа е на smetko.com/klasaciya – с кода на учителя и ПИН-а." : '') .
            "\n\nСума за плащане: " . money($o['amount']) . ($co['iban'] ? "\nIBAN: " . $co['iban'] . ($co['bank'] ? ' (' . $co['bank'] . ')' : '') : '') . "\n\nПоздрави,\nЕкипът на Сметко\n" . $cfg['contactEmail'];
        $act .= '<div class="card"><h2>Имейл до клиента</h2><textarea id="mailtxt" style="min-height:260px" readonly>' . h($mail) . '</textarea><div class="row" style="margin-top:8px"><button type="button" class="ghost" data-copy="mailtxt">📋 Копирай текста</button>' .
            ($o['email'] ? '<a class="btn ghost" href="mailto:' . h($o['email']) . '?subject=' . rawurlencode('Сметко – кодове за достъп') . '">✉️ Отвори пощата</a>' : '') . '</div><p class="hint">Картичките за печат (PDF) може да прикачите от „🖨️ Картички“ → Печат → Запази като PDF.</p></div>';
        $body = $act . $body;
    }
    page($id ? 'Поръчка #' . $id : 'Нова поръчка', $body, '<a class="btn ghost" href="porachki.php">← Всички поръчки</a>');
}

/* ---------- списък ---------- */
$status = $_GET['status'] ?? '';
$q = trim((string)($_GET['q'] ?? ''));
$where = []; $args = [];
if ($status === 'open') $where[] = "o.status IN ('new','codes','sent')";
elseif (array_key_exists($status, ORDER_STATUS)) { $where[] = 'o.status = ?'; $args[] = $status; }
if ($q !== '') { $where[] = '(o.client LIKE ? OR o.email LIKE ? OR o.contact LIKE ? OR o.invoice LIKE ?)'; array_push($args, "%$q%", "%$q%", "%$q%", "%$q%"); }
$st = $pdo->prepare('SELECT o.*, s.name AS sname FROM orders o LEFT JOIN schools s ON s.id = o.school_id ' . ($where ? 'WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY o.id DESC LIMIT 500');
$st->execute($args);
$rows = ''; $sum = 0; $paid = 0;
foreach ($st as $o) {
    $sum += $o['amount']; if (in_array($o['status'], ['paid', 'done'], true)) $paid += $o['amount'];
    $rows .= '<tr><td><a href="?id=' . (int)$o['id'] . '">#' . (int)$o['id'] . '</a></td><td>' . fdate($o['created_at']) . '</td><td><a href="?id=' . (int)$o['id'] . '"><b>' . h($o['client']) . '</b></a>' . ($o['email'] ? '<br><small class="muted">' . h($o['email']) . '</small>' : '') . '</td><td>' . h($o['plan']) . ' × ' . (int)$o['qty'] . '</td><td class="num">' . money($o['amount']) . '</td><td>' . order_status_tag($o['status']) . '</td><td>' . ($o['batch_id'] ? '<a href="kodove.php?batch=' . (int)$o['batch_id'] . '">кодове</a>' : '<a href="kodove.php?order=' . (int)$o['id'] . '">създай</a>') . '</td></tr>';
}
$tabs = '<div class="pill-nav">';
foreach (['' => 'Всички', 'open' => 'Неприключени', 'new' => 'Нови', 'paid' => 'Платени', 'done' => 'Приключени', 'cancel' => 'Отказани'] as $k => $v) $tabs .= '<a class="btn sm ' . ($status === $k ? '' : 'ghost') . '" href="?status=' . $k . '">' . $v . '</a>';
$tabs .= '</div>';
$body = '<div class="card">' . $tabs . '<form class="filters" method="get"><input type="hidden" name="status" value="' . h($status) . '"><label>Търсене<input name="q" value="' . h($q) . '" placeholder="клиент, имейл, фактура"></label><button class="blue sm">🔍</button></form>' .
    ($rows ? '<div class="tw"><table><thead><tr><th>№</th><th>Дата</th><th>Клиент</th><th>План</th><th class="num">Сума</th><th>Статус</th><th>Кодове</th></tr></thead><tbody>' . $rows . '</tbody></table></div><p class="hint">Общо: <b>' . money($sum) . '</b> · платени: <b>' . money($paid) . '</b></p>' : '<p>Още няма поръчки. Когато училище или родител поиска кодове, запишете поръчката тук – сумата и отстъпката се смятат сами.</p>') . '</div>';
page('Поръчки и клиенти', $body, '<a class="btn" href="?new=1">+ Нова поръчка</a><a class="btn ghost" href="?action=csv">⬇️ CSV</a>');
