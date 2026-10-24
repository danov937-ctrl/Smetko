<?php
/* Онлайн поръчка на абонамент: POST {plan: single|family|class, period: 6|12, qty, name, email, phone, school, town, classes, invoice{...}, notes, terms}
   → записва поръчка в админ „Поръчки“ (статус „нова“), пише на администратора и на клиента с данните за плащане.
   Сумата се смята на сървъра от цените в админ панела (с отстъпките за 3+ и 8+ класа). */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
if (!SALES_OPEN) json_out(['ok' => false, 'error' => 'Абонаментите ще бъдат пуснати скоро. Пишете ни на info@smetko.com.'], 403);
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? ''))) json_out(['ok' => false, 'error' => 'Забранено.'], 403);
if (too_many('order', 6, 3600)) json_out(['ok' => false, 'error' => 'Твърде много поръчки от тази мрежа. Пишете ни на ' . site_config()['contactEmail'] . '.'], 429);
$in = json_in();
if (!empty($in['website'])) json_out(['ok' => true, 'id' => 0]); // капан за ботове

$cfg = site_config(); $P = $cfg['prices']; $co = $cfg['company'];
$PLAN = ['single' => 'Индивидуален', 'family' => 'Семеен', 'class' => 'Цял клас'];
$plan = array_key_exists($in['plan'] ?? '', $PLAN) ? $in['plan'] : '';
$period = (int)($in['period'] ?? 12) === 6 ? 6 : 12;
$qty = max(1, min(60, (int)($in['qty'] ?? 1)));
$s = fn($k, $max) => mb_substr(trim(preg_replace('/\s+/u', ' ', (string)($in[$k] ?? '')) ?? ''), 0, $max);
$name = $s('name', 120); $email = mb_strtolower($s('email', 160)); $phone = $s('phone', 40);
$school = $s('school', 160); $town = $s('town', 60); $classes = $s('classes', 200); $notes = mb_substr(trim((string)($in['notes'] ?? '')), 0, 1000);
$inv = is_array($in['invoice'] ?? null) ? $in['invoice'] : null;

$err = fn($m, $f) => json_out(['ok' => false, 'error' => $m, 'field' => $f], 400);
if (!$plan) $err('Изберете план.', 'plan');
if ($name === '') $err('Напишете име.', 'name');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $err('Невалиден имейл.', 'email');
if ($plan === 'class' && $school === '') $err('Напишете училището.', 'school');
if ($plan === 'class' && $phone === '') $err('Напишете телефон за връзка.', 'phone');
if ($phone !== '' && !preg_match('/^[+0-9 ()\/-]{6,40}$/', $phone)) $err('Невалиден телефон.', 'phone');
if (empty($in['terms'])) $err('Нужно е съгласие с Общите условия.', 'terms');
if ($plan !== 'class') $qty = min($qty, 10);
$invTxt = '';
if ($inv && !empty($inv['on'])) {
    $f = fn($k, $max) => mb_substr(trim((string)($inv[$k] ?? '')), 0, $max);
    if ($f('company', 160) === '' || !preg_match('/^\d{9,13}$/', $f('eik', 20))) $err('За фактура попълнете фирма/училище и ЕИК (9 или 13 цифри).', 'inv-eik');
    $invTxt = "Фактура: {$f('company', 160)}, ЕИК {$f('eik', 20)}" . ($f('vat', 20) ? ", ДДС {$f('vat', 20)}" : '') . ($f('mol', 80) ? ", МОЛ {$f('mol', 80)}" : '') . ($f('addr', 200) ? ", {$f('addr', 200)}" : '');
}

$price = (float)($P[$plan . $period] ?? 0);
$disc = $plan === 'class' ? ($qty >= 8 ? (float)$P['disc8'] : ($qty >= 3 ? (float)$P['disc3'] : 0)) : 0;
$amount = round($price * $qty * (100 - $disc) / 100, 2);
$planTxt = $PLAN[$plan] . ' · ' . ($period === 12 ? '1 година' : '6 месеца');
$pname = $cfg['planNames'][$plan] ?? $PLAN[$plan];
$acc = auth_account();

note_attempt('order');
$pdo = db();
$sid = null;
if ($plan === 'class') { // училището – ако вече го има, поръчката се свързва с него
    $st = $pdo->prepare('SELECT id FROM schools WHERE lower(name) = lower(?) AND lower(COALESCE(town, \'\')) = lower(?)'); $st->execute([$school, $town]);
    $sid = $st->fetchColumn() ?: null;
}
$client = $plan === 'class' ? $school . ($town ? ', ' . $town : '') : $name;
$noteAll = trim("Поръчка от сайта" . ($acc ? " (акаунт {$acc['email']})" : '') . ".\n" . ($plan === 'class' ? "Класове: " . ($classes ?: '–') . "\n" : '') .
    ($disc ? "Отстъпка: {$disc}%\n" : '') . ($invTxt ? $invTxt . "\n" : '') . ($notes !== '' ? "Бележка: $notes" : ''));
$pdo->prepare('INSERT INTO orders(client, contact, email, phone, school_id, plan, qty, amount, status, notes, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    ->execute([$client, $name, $email, $phone, $sid, $planTxt, $qty, $amount, 'new', $noteAll, now()]);
$id = (int)$pdo->lastInsertId();
$no = str_pad((string)$id, 6, '0', STR_PAD_LEFT);
$m = fn($x) => number_format($x, 2, '.', ' ') . ' €';
$bank = !empty($co['iban']) && !empty($co['name']) ? ['name' => $co['name'], 'iban' => $co['iban'], 'bank' => $co['bank'] ?? '', 'reason' => 'Поръчка ' . $no] : null;

// писма: до администратора и потвърждение до клиента
$od = ['no' => $no, 'name' => $name, 'email' => $email, 'pname' => $pname, 'planTxt' => $planTxt, 'qty' => $qty, 'amount' => $amount, 'disc' => $disc, 'plan' => $plan, 'bank' => $bank];
mail_order_admin((string)$cfg['contactEmail'], $od, ['Клиент' => $client, 'Име' => $name, 'Имейл' => $email, 'Телефон' => $phone ?: '–', 'Класове' => $plan === 'class' ? ($classes ?: '–') : '',
    'Фактура' => $invTxt ? preg_replace('/^Фактура: /u', '', $invTxt) : '', 'Бележка' => $notes, 'Акаунт' => $acc ? (string)$acc['email'] : ''], SITE_URL . "/admin/porachki.php?id=$id");
mail_order_client($od);

json_out(['ok' => true, 'id' => $id, 'no' => $no, 'amount' => $amount, 'discount' => $disc, 'plan' => $pname, 'period' => $period, 'qty' => $qty, 'bank' => $bank]);
