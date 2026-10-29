<?php
/* Плащания през Paddle (търговец – Merchant of Record).
   POST (webhook от Paddle) → проверява подписа, издава кода(овете) за абонамент, активира го в акаунта на купувача
   (ако е поръчал от профила си), записва поръчката и изпраща кода по имейл.
   GET ?check=<txn_id> → от страницата с цените: готов ли е абонаментът след плащане (без тайни данни).
   Настройки: админ → Настройки → Paddle. Адрес за Paddle: https://smetko.com/api/paddle.php */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_once __DIR__ . '/mail.php';

const PADDLE_MONTHS = [6 => '+6 months', 12 => '+1 year'];

function pd_cfg(): array { return paddle_cfg(); }
function pd_api(): string { return (pd_cfg()['env'] ?? 'sandbox') === 'live' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com'; }
function pd_log(string $id, string $kind, string $txn, string $status, string $note = ''): void {
    db()->prepare('INSERT OR REPLACE INTO paddle_events(id, kind, txn, at, status, note) VALUES(?, ?, ?, ?, ?, ?)')->execute([$id, $kind, $txn, now(), $status, mb_substr($note, 0, 400)]);
}
/* клиентът пита дали плащането е обработено (кодът е издаден) */
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $txn = preg_replace('/[^a-zA-Z0-9_-]/', '', (string)($_GET['check'] ?? ''));
    $st = db()->prepare('SELECT status FROM paddle_events WHERE txn = ? ORDER BY at DESC LIMIT 1'); $st->execute([$txn]);
    $s = (string)$st->fetchColumn();
    json_out(['ok' => true, 'done' => $s === 'ok' || $s === 'activated', 'activated' => $s === 'activated']);
}
require_post();

$cfg = pd_cfg();
$secret = (string)($cfg['secret'] ?? '');
$raw = file_get_contents('php://input') ?: '';
if ($secret === '' || strlen($raw) > 200000) { http_response_code(503); exit; }

// подпис: Paddle-Signature: ts=…;h1=…  →  HMAC-SHA256 на „ts:тяло“
$sig = (string)($_SERVER['HTTP_PADDLE_SIGNATURE'] ?? '');
$ts = ''; $h1 = '';
foreach (explode(';', $sig) as $part) { [$k, $v] = array_pad(explode('=', $part, 2), 2, ''); if ($k === 'ts') $ts = $v; elseif ($k === 'h1') $h1 = $v; }
if ($ts === '' || $h1 === '' || !hash_equals(hash_hmac('sha256', $ts . ':' . $raw, $secret), $h1)) { http_response_code(401); echo 'bad signature'; exit; }
if (abs(time() - (int)$ts) > 86400) { http_response_code(408); echo 'stale'; exit; } // стар подпис (повторно изпращане)

$ev = json_decode($raw, true);
if (!is_array($ev)) { http_response_code(400); exit; }
$eid = (string)($ev['event_id'] ?? '');
$kind = (string)($ev['event_type'] ?? '');
$d = is_array($ev['data'] ?? null) ? $ev['data'] : [];
$txn = (string)($d['id'] ?? '');
if ($eid === '') { http_response_code(400); exit; }

// едно събитие се обработва само веднъж
$st = db()->prepare('SELECT status FROM paddle_events WHERE id = ?'); $st->execute([$eid]);
if ($st->fetchColumn() !== false) { echo 'ok (duplicate)'; exit; }

if ($kind !== 'transaction.completed') { pd_log($eid, $kind, $txn, 'skip'); echo 'ok'; exit; }

$cd = is_array($d['custom_data'] ?? null) ? $d['custom_data'] : [];
$plan = in_array($cd['plan'] ?? '', ['single', 'family', 'class'], true) ? (string)$cd['plan'] : '';
$period = (int)($cd['period'] ?? 12) === 6 ? 6 : 12;
$qty = max(0, (int)($cd['qty'] ?? 0));
foreach (($d['items'] ?? []) as $it) $qty = max($qty, (int)($it['quantity'] ?? 1)); // платеното количество е водещо
$qty = max(1, min(60, $qty));
$aid = isset($cd['acc']) ? paddle_acc_id((string)$cd['acc']) : 0;

// планът се разпознава и по price_id от настройките, ако custom_data липсва (напр. линк за плащане)
if ($plan === '') {
    $ids = [];
    foreach (($d['items'] ?? []) as $it) $ids[] = (string)($it['price']['id'] ?? $it['price_id'] ?? '');
    foreach (($cfg['prices'] ?? []) as $k => $pid) {
        if ($pid !== '' && in_array($pid, $ids, true) && preg_match('/^(single|family|class)(6|12)$/', $k, $m)) { $plan = $m[1]; $period = (int)$m[2]; break; }
    }
}
if ($plan === '') { pd_log($eid, $kind, $txn, 'err', 'Непознат план/цена'); http_response_code(200); echo 'ok (unknown plan)'; exit; }

// имейл и име на купувача: от custom_data, от самото събитие или от Paddle API
$email = filter_var(trim((string)($cd['email'] ?? '')), FILTER_VALIDATE_EMAIL) ?: '';
$name = mb_substr(trim((string)($cd['name'] ?? '')), 0, 120);
if ($email === '' && is_array($d['customer'] ?? null)) {
    $email = filter_var((string)($d['customer']['email'] ?? ''), FILTER_VALIDATE_EMAIL) ?: '';
    $name = $name ?: mb_substr((string)($d['customer']['name'] ?? ''), 0, 120);
}
$apiKey = (string)($cfg['apiKey'] ?? '');
if ($email === '' && $apiKey !== '' && !empty($d['customer_id'])) {
    $ch = curl_init(pd_api() . '/customers/' . rawurlencode((string)$d['customer_id']));
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $apiKey]]);
    $r = json_decode((string)curl_exec($ch), true); curl_close($ch);
    $email = filter_var((string)($r['data']['email'] ?? ''), FILTER_VALIDATE_EMAIL) ?: '';
    $name = $name ?: mb_substr((string)($r['data']['name'] ?? ''), 0, 120);
}
if ($aid) { // поръчка от влязъл акаунт
    $st = db()->prepare('SELECT * FROM accounts WHERE id = ? AND disabled = 0'); $st->execute([$aid]); $acc = $st->fetch();
    if ($acc) { $email = $email ?: (string)$acc['email']; $name = $name ?: (string)$acc['name']; } else $aid = 0;
}

$amount = round(((float)($d['details']['totals']['grand_total'] ?? 0)) / 100, 2);
$cur = (string)($d['currency_code'] ?? 'EUR');
$pdo = db();
$exp = date('Y-m-d', strtotime(PADDLE_MONTHS[$period]));
$label = 'Paddle ' . substr($txn, 0, 20);

try {
    $pdo->beginTransaction();
    $pdo->prepare('INSERT INTO orders(created_at, client, contact, email, phone, plan, qty, amount, status, invoice, paid_at, notes) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([now(), $name ?: $email, $name, $email, '', $plan, $qty, $amount, 'paid', $txn, now(), 'Платено през Paddle (' . ($cfg['env'] ?? 'sandbox') . '), ' . $amount . ' ' . $cur . ($aid ? ', акаунт #' . $aid : '')]);
    $oid = (int)$pdo->lastInsertId();
    $codes = make_codes($plan, $qty, $exp, $label, $oid);
    $activated = false;
    if ($aid && count($codes) === 1) { // активира се направо в акаунта на купувача
        $c = get_code($codes[0]);
        $pdo->prepare('UPDATE codes SET account_id = ?, activated_at = ? WHERE code = ?')->execute([$aid, now(), $codes[0]]);
        if ($plan === 'class') {
            $pdo->prepare('UPDATE batches SET account_id = ? WHERE id = ?')->execute([$aid, (int)$c['batch_id']]);
            $pdo->prepare("UPDATE accounts SET role = 'teacher' WHERE id = ? AND role <> 'teacher'")->execute([$aid]);
        }
        $activated = true;
    }
    $pdo->prepare("UPDATE orders SET status = 'done' WHERE id = ?")->execute([$oid]);
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    pd_log($eid, $kind, $txn, 'err', $e->getMessage());
    http_response_code(500); echo 'error'; exit;
}

if ($email !== '') { try { mail_paddle_codes($email, $name, $plan, $period, $codes, $exp, $activated); } catch (Throwable $e) {} }
try { mail_admin_text((string)site_config()['contactEmail'], '💶 Плащане през Paddle: ' . TYPE_NAMES[$plan] . ' × ' . $qty,
    "Платено: $amount $cur\nПлан: " . TYPE_NAMES[$plan] . ", $period месеца, брой: $qty\nКупувач: $name <$email>" . ($activated ? "\nАктивиран автоматично в акаунт #$aid" : "\nКодове: " . implode(', ', $codes)) . "\nТранзакция: $txn", 'Ново плащане'); } catch (Throwable $e) {}
audit_add('Плащане през Paddle', TYPE_NAMES[$plan] . " × $qty · $amount $cur · $email · $txn");
pd_log($eid, $kind, $txn, $activated ? 'activated' : 'ok', implode(',', $codes) . ' · ' . $email);
echo 'ok';
