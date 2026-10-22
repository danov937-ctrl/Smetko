<?php
/* Акаунти за родители и учители.
   GET                         → {account|null, profiles, classes}
   POST {action: ...}          → register, login, logout, forgot, reset, password, delete,
                                 profile_add, profile_update, profile_delete, profile_get, save_state,
                                 link_code, link_class, class_remove
   Вход с бисквитка (HttpOnly). Децата от клас продължават да влизат само с личния си код. */
declare(strict_types=1);
const MAX_PROFILES = 4;
const MAX_STATE = 300000;
require __DIR__ . '/lib.php';

// заявки само от собствения сайт (защита от подправени форми)
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? ''))) json_out(['ok' => false, 'error' => 'Забранено.'], 403);

$pdo = db();
function acc_profiles(int $aid): array {
    $st = db()->prepare('SELECT * FROM profiles WHERE account_id = ? ORDER BY id'); $st->execute([$aid]);
    $out = [];
    foreach ($st->fetchAll() as $p) {
        $s = $p['state'] ? json_decode((string)$p['state'], true) : [];
        $a = profile_access($p);
        $stars = 0; $missions = 0;
        foreach ((array)($s['adventure'] ?? []) as $g) foreach ((array)$g as $v) { $stars += (int)$v; if ((int)$v > 0) $missions++; }
        $out[] = ['id' => (int)$p['id'], 'name' => $p['name'], 'grade' => (int)$p['grade'], 'avatar' => $p['avatar'] ?: '🦉', 'code' => $p['code'] ?: '',
            'plan' => $a ? ['typeName' => $a['typeName'], 'expires' => $a['expires'], 'valid' => $a['valid'], 'type' => $a['type']] : null,
            'points' => (int)($s['points'] ?? 0), 'correct' => (int)($s['correct'] ?? 0), 'answered' => (int)($s['answered'] ?? 0), 'stars' => $stars, 'missions' => $missions,
            'last' => $p['updated_at'], 'skills' => $s['skills'] ?? new stdClass(), 'days' => $s['days'] ?? new stdClass()];
    }
    return $out;
}
function acc_classes(int $aid): array {
    $st = db()->prepare('SELECT ac.code, ac.batch_id, b.pin, b.class_name, b.grade, b.label, b.expires_at, s.name AS school, s.town FROM account_classes ac JOIN batches b ON b.id = ac.batch_id LEFT JOIN schools s ON s.id = b.school_id WHERE ac.account_id = ? ORDER BY ac.created_at');
    $st->execute([$aid]);
    return array_map(fn($r) => ['batch' => (int)$r['batch_id'], 'code' => $r['code'], 'pin' => (string)$r['pin'], 'name' => trim(($r['class_name'] ?: $r['label'] ?: 'Клас') . ($r['school'] ? ' · ' . $r['school'] . ($r['town'] ? ', ' . $r['town'] : '') : '')),
        'grade' => (int)$r['grade'], 'expires' => $r['expires_at']], $st->fetchAll());
}
function acc_me(?array $a): array {
    if (!$a) return ['ok' => true, 'account' => null];
    return ['ok' => true, 'account' => ['email' => $a['email'], 'name' => $a['name'], 'role' => $a['role'], 'since' => substr((string)$a['created_at'], 0, 10)],
        'profiles' => acc_profiles((int)$a['id']), 'classes' => acc_classes((int)$a['id'])];
}
function need(): array { $a = auth_account(); if (!$a) json_out(['ok' => false, 'error' => 'Влезте в акаунта си.', 'auth' => false], 401); return $a; }
function my_profile(array $a, $id): array {
    $st = db()->prepare('SELECT * FROM profiles WHERE id = ? AND account_id = ?'); $st->execute([(int)$id, (int)$a['id']]);
    $p = $st->fetch(); if (!$p) json_out(['ok' => false, 'error' => 'Няма такъв профил.'], 404); return $p;
}
function clean_name(string $n, int $max = 30): string { $n = trim(preg_replace('/\s+/u', ' ', $n) ?? ''); return mb_substr(preg_replace('/[^\p{L}\p{N} .\-\']/u', '', $n) ?? '', 0, $max); }
function clean_avatar(string $a): string { return in_array($a, AVATARS, true) ? $a : '🦉'; }
const AVATARS = ['🦉', '🦊', '🐻', '🐰', '🐼', '🐯', '🦁', '🐸', '🐵', '🐧', '🦄', '🐙', '🐢', '🐝', '🚀', '⚽'];
function clean_state($s): ?string { // прогресът на детето (обект – {"0":3} не бива да става [3]); кодът и устройството не се пазят тук
    if (!($s instanceof stdClass)) return null;
    unset($s->access, $s->deviceId, $s->accessLost);
    $j = json_encode($s, JSON_UNESCAPED_UNICODE);
    return ($j !== false && strlen($j) <= MAX_STATE) ? $j : null;
}
function check_pass(string $p): ?string {
    if (mb_strlen($p) < 8) return 'Паролата трябва да е поне 8 знака.';
    if (mb_strlen($p) > 200) return 'Паролата е твърде дълга.';
    return null;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') json_out(acc_me(auth_account()));
require_post();
if (too_many('account', 300, 600)) json_out(['ok' => false, 'error' => 'Твърде много заявки. Опитайте след малко.'], 429);
note_attempt('account');
$raw = file_get_contents('php://input') ?: '';
if (strlen($raw) > MAX_STATE + 5000) json_out(['ok' => false, 'error' => 'Прекалено голяма заявка.'], 413);
$in = json_decode($raw, true); if (!is_array($in)) $in = $_POST;
$obj = json_decode($raw); $stateIn = is_object($obj) && isset($obj->state) ? $obj->state : null;
$action = (string)($in['action'] ?? '');
$email = mb_strtolower(trim((string)($in['email'] ?? '')));

switch ($action) {
case 'register':
    if (too_many('register', 8, 3600)) json_out(['ok' => false, 'error' => 'Твърде много регистрации от тази мрежа. Опитайте след час.'], 429);
    $name = clean_name((string)($in['name'] ?? ''), 60);
    $role = ($in['role'] ?? '') === 'teacher' ? 'teacher' : 'parent';
    $pass = (string)($in['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 120) json_out(['ok' => false, 'error' => 'Невалиден имейл.', 'field' => 'email'], 400);
    if ($name === '') json_out(['ok' => false, 'error' => 'Напишете името си.', 'field' => 'name'], 400);
    if ($e = check_pass($pass)) json_out(['ok' => false, 'error' => $e, 'field' => 'password'], 400);
    if (empty($in['terms'])) json_out(['ok' => false, 'error' => 'Нужно е съгласие с Общите условия и Политиката за поверителност.', 'field' => 'terms'], 400);
    $st = $pdo->prepare('SELECT id FROM accounts WHERE email = ?'); $st->execute([$email]);
    if ($st->fetchColumn()) json_out(['ok' => false, 'error' => 'Вече има акаунт с този имейл. Влезте или възстановете паролата си.', 'field' => 'email'], 409);
    note_attempt('register');
    $pdo->prepare('INSERT INTO accounts(email, pass, name, role, created_at) VALUES(?, ?, ?, ?, ?)')->execute([$email, password_hash($pass, PASSWORD_DEFAULT), $name, $role, now()]);
    $aid = (int)$pdo->lastInsertId();
    auth_login($aid);
    mail_welcome($email, $name, $role);
    json_out(acc_me(auth_account()));

case 'login':
    if (too_many('login_fail', 10, 900)) json_out(['ok' => false, 'error' => 'Твърде много грешни опити. Опитайте след 15 минути или възстановете паролата си.'], 429);
    $st = $pdo->prepare('SELECT * FROM accounts WHERE email = ?'); $st->execute([$email]);
    $a = $st->fetch();
    if (!$a || !password_verify((string)($in['password'] ?? ''), (string)$a['pass'])) { note_attempt('login_fail'); json_out(['ok' => false, 'error' => 'Грешен имейл или парола.'], 403); }
    if ((int)$a['disabled']) json_out(['ok' => false, 'error' => 'Акаунтът е спрян. Пишете ни на ' . site_config()['contactEmail'] . '.'], 403);
    if (password_needs_rehash((string)$a['pass'], PASSWORD_DEFAULT)) $pdo->prepare('UPDATE accounts SET pass = ? WHERE id = ?')->execute([password_hash((string)$in['password'], PASSWORD_DEFAULT), (int)$a['id']]);
    auth_login((int)$a['id']);
    json_out(acc_me(auth_account()));

case 'logout':
    auth_logout();
    json_out(['ok' => true, 'account' => null]);

case 'forgot': // винаги един и същ отговор – не издава кои имейли имат акаунт
    if (too_many('forgot', 5, 3600)) json_out(['ok' => false, 'error' => 'Твърде много заявки. Опитайте след час.'], 429);
    note_attempt('forgot');
    $st = $pdo->prepare('SELECT * FROM accounts WHERE email = ? AND disabled = 0'); $st->execute([$email]);
    if ($a = $st->fetch()) {
        $tok = bin2hex(random_bytes(24));
        $pdo->prepare('UPDATE accounts SET reset_hash = ?, reset_until = ? WHERE id = ?')->execute([hash('sha256', $tok), time() + 3600, (int)$a['id']]);
        mail_reset($email, (string)$a['name'], SITE_URL . "/zabravena-parola.html?t=$tok");
    }
    json_out(['ok' => true]);

case 'reset':
    if (too_many('reset_fail', 10, 900)) json_out(['ok' => false, 'error' => 'Твърде много опити. Опитайте след 15 минути.'], 429);
    $tok = (string)($in['token'] ?? '');
    $st = $pdo->prepare('SELECT * FROM accounts WHERE reset_hash = ? AND reset_until > ?'); $st->execute([hash('sha256', $tok), time()]);
    $a = preg_match('/^[a-f0-9]{48}$/', $tok) ? $st->fetch() : null;
    if (!$a) { note_attempt('reset_fail'); json_out(['ok' => false, 'error' => 'Връзката е изтекла или вече е използвана. Поискайте нова.'], 400); }
    if ($e = check_pass((string)($in['password'] ?? ''))) json_out(['ok' => false, 'error' => $e, 'field' => 'password'], 400);
    $pdo->prepare('UPDATE accounts SET pass = ?, reset_hash = NULL, reset_until = 0 WHERE id = ?')->execute([password_hash((string)$in['password'], PASSWORD_DEFAULT), (int)$a['id']]);
    $pdo->prepare('DELETE FROM auth_sessions WHERE account_id = ?')->execute([(int)$a['id']]);
    auth_login((int)$a['id']);
    json_out(acc_me(auth_account()));

case 'password':
    $a = need();
    if (!password_verify((string)($in['old'] ?? ''), (string)$a['pass'])) json_out(['ok' => false, 'error' => 'Грешна текуща парола.', 'field' => 'old'], 403);
    if ($e = check_pass((string)($in['password'] ?? ''))) json_out(['ok' => false, 'error' => $e, 'field' => 'password'], 400);
    $pdo->prepare('UPDATE accounts SET pass = ? WHERE id = ?')->execute([password_hash((string)$in['password'], PASSWORD_DEFAULT), (int)$a['id']]);
    $pdo->prepare('DELETE FROM auth_sessions WHERE account_id = ?')->execute([(int)$a['id']]);
    auth_login((int)$a['id']);
    json_out(['ok' => true]);

case 'update':
    $a = need();
    $name = clean_name((string)($in['name'] ?? ''), 60);
    if ($name === '') json_out(['ok' => false, 'error' => 'Напишете името си.'], 400);
    $pdo->prepare('UPDATE accounts SET name = ? WHERE id = ?')->execute([$name, (int)$a['id']]);
    json_out(['ok' => true]);

case 'delete': // самостоятелно изтриване на акаунта и профилите (GDPR)
    $a = need();
    if (!password_verify((string)($in['password'] ?? ''), (string)$a['pass'])) json_out(['ok' => false, 'error' => 'Грешна парола.', 'field' => 'password'], 403);
    $aid = (int)$a['id'];
    foreach (['profiles', 'account_classes', 'auth_sessions'] as $t) $pdo->prepare("DELETE FROM $t WHERE account_id = ?")->execute([$aid]);
    $pdo->prepare('DELETE FROM accounts WHERE id = ?')->execute([$aid]);
    auth_set_cookie('', time() - 3600);
    json_out(['ok' => true, 'account' => null]);

case 'profile_add':
    $a = need();
    $st = $pdo->prepare('SELECT COUNT(*) FROM profiles WHERE account_id = ?'); $st->execute([(int)$a['id']]);
    if ((int)$st->fetchColumn() >= MAX_PROFILES) json_out(['ok' => false, 'error' => 'Може да имате до ' . MAX_PROFILES . ' детски профила.'], 400);
    $name = clean_name((string)($in['name'] ?? ''));
    if ($name === '') json_out(['ok' => false, 'error' => 'Напишете името (или прякора) на детето.', 'field' => 'name'], 400);
    $state = $stateIn !== null ? clean_state($stateIn) : null; // „вземи прогреса от това устройство“
    $pdo->prepare('INSERT INTO profiles(account_id, name, grade, avatar, device, state, rev, updated_at, created_at) VALUES(?, ?, ?, ?, ?, ?, 1, ?, ?)')
        ->execute([(int)$a['id'], $name, max(1, min(4, (int)($in['grade'] ?? 1))), clean_avatar((string)($in['avatar'] ?? '')), bin2hex(random_bytes(16)), $state, now(), now()]);
    $pid = (int)$pdo->lastInsertId();
    $res = acc_me(auth_account()); $res['id'] = $pid;
    json_out($res);

case 'profile_update':
    $a = need(); $p = my_profile($a, $in['id'] ?? 0);
    $name = clean_name((string)($in['name'] ?? $p['name']));
    $pdo->prepare('UPDATE profiles SET name = ?, grade = ?, avatar = ? WHERE id = ?')
        ->execute([$name !== '' ? $name : $p['name'], max(1, min(4, (int)($in['grade'] ?? $p['grade']))), clean_avatar((string)($in['avatar'] ?? $p['avatar'])), (int)$p['id']]);
    json_out(acc_me(auth_account()));

case 'profile_delete':
    $a = need(); $p = my_profile($a, $in['id'] ?? 0);
    $pdo->prepare('DELETE FROM profiles WHERE id = ?')->execute([(int)$p['id']]);
    json_out(acc_me(auth_account()));

case 'profile_get': // избор „Кой играе?“ – прогресът + достъпът на профила
    $a = need(); $p = my_profile($a, $in['id'] ?? 0);
    json_out(['ok' => true, 'profile' => ['id' => (int)$p['id'], 'name' => $p['name'], 'grade' => (int)$p['grade'], 'avatar' => $p['avatar'] ?: '🦉'],
        'device' => $p['device'], 'state' => $p['state'] ? json_decode((string)$p['state']) : null, 'rev' => (int)$p['rev'], 'access' => profile_access($p)]);

case 'save_state': // {id, state, rev} – ако междувременно друго устройство е записало, връща conflict и новото състояние за сливане
    $a = need(); $p = my_profile($a, $in['id'] ?? 0);
    $state = clean_state($stateIn);
    if ($state === null) json_out(['ok' => false, 'error' => 'Невалиден прогрес.'], 400);
    if ((int)($in['rev'] ?? -1) !== (int)$p['rev']) json_out(['ok' => true, 'conflict' => true, 'state' => $p['state'] ? json_decode((string)$p['state']) : null, 'rev' => (int)$p['rev']]);
    $st = $pdo->prepare('UPDATE profiles SET state = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND rev = ?');
    $st->execute([$state, now(), (int)$p['id'], (int)$p['rev']]);
    if (!$st->rowCount()) json_out(['ok' => true, 'conflict' => true, 'state' => null, 'rev' => -1]);
    json_out(['ok' => true, 'rev' => (int)$p['rev'] + 1]);

case 'link_code': // код за абонамент към детски профил – важи на всяко устройство, на което детето влезе
    $a = need(); $p = my_profile($a, $in['id'] ?? 0);
    if (too_many('redeem_fail', 30, 900)) json_out(['ok' => false, 'error' => 'Твърде много грешни опити. Опитайте след 15 минути.'], 429);
    $code = normalize_code((string)($in['code'] ?? ''));
    $row = $code ? get_code($code) : null;
    if (!$row) { note_attempt('redeem_fail'); json_out(['ok' => false, 'error' => 'Няма такъв код. Проверете буквите и цифрите.'], 404); }
    if ((int)$row['revoked'] === 1) json_out(['ok' => false, 'error' => 'Този код е спрян. Свържете се с нас.'], 403);
    if ($row['expires_at'] < today()) json_out(['ok' => false, 'error' => 'Кодът е изтекъл на ' . date('d.m.Y', strtotime($row['expires_at'])) . '.'], 410);
    if (($row['role'] ?? 'student') === 'teacher') json_out(['ok' => false, 'error' => 'Това е код на учител – добавете го в „Моите класове“ заедно с ПИН-а.'], 400);
    $dev = (string)$p['device'];
    $old = clean_device((string)($in['device'] ?? '')); // устройството, на което кодът вече е активиран (ако е това)
    $pdo->exec('BEGIN IMMEDIATE');
    $st = $pdo->prepare('SELECT id, device FROM redemptions WHERE code = ?'); $st->execute([$code]);
    $red = $st->fetchAll();
    $mine = array_filter($red, fn($r) => $r['device'] === $dev);
    if (!$mine) {
        $move = $old !== '' ? array_values(array_filter($red, fn($r) => $r['device'] === $old)) : [];
        if ($move) $pdo->prepare('UPDATE redemptions SET device = ?, last_seen = ? WHERE id = ?')->execute([$dev, now(), (int)$move[0]['id']]); // точките и класациите се запазват
        elseif (count($red) >= CODE_DEVICES) { $pdo->exec('ROLLBACK'); note_attempt('redeem_fail'); json_out(['ok' => false, 'error' => 'Този код вече е активиран на друго устройство. Ако е вашият, въведете го от устройството, на което детето играе, или ни пишете.'], 409); }
        else $pdo->prepare('INSERT INTO redemptions(code, device, created_at, last_seen, nickname, grade) VALUES(?, ?, ?, ?, ?, ?)')->execute([$code, $dev, now(), now(), clean_nick((string)$p['name']) ?: null, (int)$p['grade'] ?: null]);
    }
    $pdo->prepare('UPDATE profiles SET code = ? WHERE id = ?')->execute([$code, (int)$p['id']]);
    $pdo->exec('COMMIT');
    $p['code'] = $code;
    $res = acc_me(auth_account()); $res['access'] = profile_access($p); $res['device'] = $dev;
    json_out($res);

case 'link_class': // учител: клас с кода (на учителя или който и да е от класа) и ПИН-а
    $a = need();
    if (too_many('pin_fail', 10, 900)) json_out(['ok' => false, 'error' => 'Твърде много грешни опити. Опитайте след 15 минути.'], 429);
    $code = normalize_code((string)($in['code'] ?? ''));
    $row = $code ? get_code($code) : null; $b = $row ? batch_of($code) : null;
    $pin = (string)($b['pin'] ?? '') ?: (string)($row['pin'] ?? '');
    if (!$row || !$b || $row['type'] !== 'class' || $pin === '' || !hash_equals($pin, trim((string)($in['pin'] ?? '')))) { note_attempt('pin_fail'); json_out(['ok' => false, 'error' => 'Грешен код или ПИН. Използвайте кода и ПИН-а за учителя от картичката.'], 403); }
    $st = $pdo->prepare('SELECT COUNT(*) FROM account_classes WHERE account_id = ?'); $st->execute([(int)$a['id']]);
    if ((int)$st->fetchColumn() >= 30) json_out(['ok' => false, 'error' => 'Достигнат е максимумът от 30 класа.'], 400);
    $pdo->prepare('INSERT INTO account_classes(account_id, batch_id, code, created_at) VALUES(?, ?, ?, ?) ON CONFLICT(account_id, batch_id) DO UPDATE SET code = excluded.code')->execute([(int)$a['id'], (int)$b['id'], $code, now()]);
    json_out(acc_me(auth_account()));

case 'class_remove':
    $a = need();
    $pdo->prepare('DELETE FROM account_classes WHERE account_id = ? AND batch_id = ?')->execute([(int)$a['id'], (int)($in['batch'] ?? 0)]);
    json_out(acc_me(auth_account()));
}
json_out(['ok' => false, 'error' => 'Непознато действие.'], 400);
