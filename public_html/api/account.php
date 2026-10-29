<?php
/* Акаунти за родители и учители.
   GET                         → {account|null, profiles, classes}
   POST {action: ...}          → register, login, logout, forgot, reset, password, delete,
                                 profile_add, profile_update, profile_delete, profile_get, save_state,
                                 activate (код за абонамент – веднъж, от страница „Абонаменти“), profile_plan
   Вход с бисквитка (HttpOnly). Учениците от клас влизат с потребител и парола от учителя (api/student.php). */
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
function class_name_of(array $b): string { return trim(($b['class_name'] ? $b['class_name'] . ' клас' : ($b['label'] ?: 'Клас')) . (!empty($b['school']) ? ' · ' . $b['school'] . (!empty($b['town']) ? ', ' . $b['town'] : '') : '')); }
function acc_classes(int $aid): array {
    $st = db()->prepare("SELECT b.*, c.code, c.expires_at AS cexp, c.max_uses, s.name AS school, s.town, (SELECT COUNT(*) FROM redemptions r WHERE r.code = c.code) AS students
        FROM codes c JOIN batches b ON b.id = c.batch_id LEFT JOIN schools s ON s.id = b.school_id WHERE c.account_id = ? AND c.type = 'class' AND c.revoked = 0 ORDER BY b.class_name, b.id");
    $st->execute([$aid]);
    return array_map(fn($r) => ['id' => (int)$r['id'], 'name' => class_name_of($r), 'className' => (string)$r['class_name'], 'grade' => (int)$r['grade'], 'expires' => $r['cexp'], 'valid' => $r['cexp'] >= today(),
        'students' => (int)$r['students'], 'seats' => (int)($r['max_uses'] ?: 30)], $st->fetchAll());
}
function acc_subs(int $aid): array { // абонаментите на акаунта (и изтеклите – за напомняне)
    $st = db()->prepare('SELECT c.*, (SELECT COUNT(*) FROM profiles p WHERE p.code = c.code) AS used_p, (SELECT COUNT(*) FROM redemptions r WHERE r.code = c.code) AS used_r FROM codes c WHERE c.account_id = ? AND c.revoked = 0 ORDER BY c.expires_at DESC');
    $st->execute([$aid]);
    $pn = site_config()['planNames'] ?? [];
    return array_map(fn($c) => ['code' => $c['code'], 'type' => $c['type'], 'typeName' => TYPE_NAMES[$c['type']] ?? $c['type'], 'planName' => $pn[$c['type']] ?? '', 'expires' => $c['expires_at'], 'valid' => code_valid($c),
        'seats' => code_seats($c), 'used' => $c['type'] === 'class' ? (int)$c['used_r'] : (int)$c['used_p'], 'activated' => substr((string)$c['activated_at'], 0, 10)], $st->fetchAll());
}
function acc_me(?array $a): array {
    if (!$a) return ['ok' => true, 'account' => null];
    $profiles = acc_profiles((int)$a['id']); // първо профилите – там се разпределят свободните места
    return ['ok' => true, 'account' => ['email' => $a['email'], 'name' => $a['name'], 'role' => $a['role'], 'since' => substr((string)$a['created_at'], 0, 10), 'hasPass' => (string)$a['pass'] !== '', 'google' => !empty($a['google_sub']), 'weekly' => (int)($a['weekly'] ?? 1) === 1],
        'profiles' => $profiles, 'classes' => acc_classes((int)$a['id']), 'subs' => acc_subs((int)$a['id'])];
}
function need(): array { $a = auth_account(); if (!$a) json_out(['ok' => false, 'error' => 'Влезте в акаунта си.', 'auth' => false], 401); return $a; }
function my_profile(array $a, $id): array {
    $st = db()->prepare('SELECT * FROM profiles WHERE id = ? AND account_id = ?'); $st->execute([(int)$id, (int)$a['id']]);
    $p = $st->fetch(); $st->closeCursor(); if (!$p) json_out(['ok' => false, 'error' => 'Няма такъв профил.'], 404); return $p;
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

case 'google': // вход или регистрация с Google профила (Google Identity Services → ID token)
    if (too_many('google_fail', 20, 900)) json_out(['ok' => false, 'error' => 'Твърде много опити. Опитайте след 15 минути.'], 429);
    $cid = (string)(site_config()['google']['clientId'] ?? '');
    $g = google_verify((string)($in['credential'] ?? ''), $cid);
    if (!$g) { note_attempt('google_fail'); json_out(['ok' => false, 'error' => 'Входът с Google не успя. Опитайте отново или влезте с имейл и парола.'], 403); }
    $gEmail = mb_strtolower((string)$g['email']);
    $st = $pdo->prepare('SELECT * FROM accounts WHERE google_sub = ? OR email = ? ORDER BY google_sub = ? DESC LIMIT 1'); $st->execute([(string)$g['sub'], $gEmail, (string)$g['sub']]);
    $a = $st->fetch(); $st->closeCursor();
    if ($a) {
        if ((int)$a['disabled']) json_out(['ok' => false, 'error' => 'Акаунтът е спрян. Пишете ни на ' . site_config()['contactEmail'] . '.'], 403);
        if (!$a['google_sub']) $pdo->prepare('UPDATE accounts SET google_sub = ? WHERE id = ?')->execute([(string)$g['sub'], (int)$a['id']]);
        auth_login((int)$a['id']);
        json_out(acc_me(auth_account(true)) + ['google' => 'login']);
    }
    if (empty($in['terms'])) json_out(['ok' => false, 'need_terms' => true, 'error' => 'Нов акаунт: отметнете съгласието с Общите условия и натиснете „Продължи с Google“ отново.'], 400);
    $role = ($in['role'] ?? '') === 'teacher' ? 'teacher' : 'parent';
    $name = clean_name((string)($g['name'] ?? ''), 60) ?: explode('@', $gEmail)[0];
    $pdo->prepare('INSERT INTO accounts(email, pass, name, role, created_at, google_sub) VALUES(?, ?, ?, ?, ?, ?)')->execute([$gEmail, '', $name, $role, now(), (string)$g['sub']]);
    auth_login((int)$pdo->lastInsertId());
    mail_welcome($gEmail, $name, $role);
    json_out(acc_me(auth_account(true)) + ['google' => 'register']);

case 'login':
    if (too_many('login_fail', 10, 900)) json_out(['ok' => false, 'error' => 'Твърде много грешни опити. Опитайте след 15 минути или възстановете паролата си.'], 429);
    $st = $pdo->prepare('SELECT * FROM accounts WHERE email = ?'); $st->execute([$email]);
    $a = $st->fetch(); $st->closeCursor();
    if ($a && (string)$a['pass'] === '' && $a['google_sub']) json_out(['ok' => false, 'error' => 'Този акаунт е създаден с Google – натиснете „Вход с Google“. (Можете да си зададете и парола чрез „Забравена парола“.)'], 403);
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
    $a = $st->fetch(); $st->closeCursor();
    if ($a) {
        $tok = bin2hex(random_bytes(24));
        $pdo->prepare('UPDATE accounts SET reset_hash = ?, reset_until = ? WHERE id = ?')->execute([hash('sha256', $tok), time() + 3600, (int)$a['id']]);
        mail_reset($email, (string)$a['name'], SITE_URL . "/zabravena-parola.html?t=$tok");
    }
    json_out(['ok' => true]);

case 'reset':
    if (too_many('reset_fail', 10, 900)) json_out(['ok' => false, 'error' => 'Твърде много опити. Опитайте след 15 минути.'], 429);
    $tok = (string)($in['token'] ?? '');
    $st = $pdo->prepare('SELECT * FROM accounts WHERE reset_hash = ? AND reset_until > ?'); $st->execute([hash('sha256', $tok), time()]);
    $a = preg_match('/^[a-f0-9]{48}$/', $tok) ? $st->fetch() : null; $st->closeCursor();
    if (!$a) { note_attempt('reset_fail'); json_out(['ok' => false, 'error' => 'Връзката е изтекла или вече е използвана. Поискайте нова.'], 400); }
    if ($e = check_pass((string)($in['password'] ?? ''))) json_out(['ok' => false, 'error' => $e, 'field' => 'password'], 400);
    $pdo->prepare('UPDATE accounts SET pass = ?, reset_hash = NULL, reset_until = 0 WHERE id = ?')->execute([password_hash((string)$in['password'], PASSWORD_DEFAULT), (int)$a['id']]);
    $pdo->prepare('DELETE FROM auth_sessions WHERE account_id = ?')->execute([(int)$a['id']]);
    auth_login((int)$a['id']);
    json_out(acc_me(auth_account()));

case 'password':
    $a = need();
    if ((string)$a['pass'] !== '' && !password_verify((string)($in['old'] ?? ''), (string)$a['pass'])) json_out(['ok' => false, 'error' => 'Грешна текуща парола.', 'field' => 'old'], 403); // акаунт само с Google: първа парола без стара
    if ($e = check_pass((string)($in['password'] ?? ''))) json_out(['ok' => false, 'error' => $e, 'field' => 'password'], 400);
    $pdo->prepare('UPDATE accounts SET pass = ? WHERE id = ?')->execute([password_hash((string)$in['password'], PASSWORD_DEFAULT), (int)$a['id']]);
    $pdo->prepare('DELETE FROM auth_sessions WHERE account_id = ?')->execute([(int)$a['id']]);
    auth_login((int)$a['id']);
    json_out(['ok' => true]);

case 'weekly': // седмичен имейл с напредъка – вкл./изкл.
    $a = need();
    $pdo->prepare('UPDATE accounts SET weekly = ? WHERE id = ?')->execute([empty($in['on']) ? 0 : 1, (int)$a['id']]);
    json_out(['ok' => true]);

case 'update':
    $a = need();
    $name = clean_name((string)($in['name'] ?? ''), 60);
    if ($name === '') json_out(['ok' => false, 'error' => 'Напишете името си.'], 400);
    $pdo->prepare('UPDATE accounts SET name = ? WHERE id = ?')->execute([$name, (int)$a['id']]);
    json_out(['ok' => true]);

case 'delete': // самостоятелно изтриване на акаунта и профилите (GDPR)
    $a = need();
    if ((string)$a['pass'] === '') { if (mb_strtolower(trim((string)($in['password'] ?? ''))) !== mb_strtolower((string)$a['email'])) json_out(['ok' => false, 'error' => 'Напишете имейла на акаунта, за да потвърдите.', 'field' => 'password'], 403); }
    elseif (!password_verify((string)($in['password'] ?? ''), (string)$a['pass'])) json_out(['ok' => false, 'error' => 'Грешна парола.', 'field' => 'password'], 403);
    $aid = (int)$a['id'];
    foreach (['profiles', 'auth_sessions'] as $t) $pdo->prepare("DELETE FROM $t WHERE account_id = ?")->execute([$aid]);
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

case 'activate': // код за абонамент – въвежда се веднъж, на страница „Абонаменти“, от влязъл акаунт
    $a = need();
    if (too_many('redeem_fail', 20, 900)) json_out(['ok' => false, 'error' => 'Твърде много грешни опити. Опитайте след 15 минути.'], 429);
    $code = normalize_code((string)($in['code'] ?? ''));
    $row = $code ? get_code($code) : null;
    if (!$row) { note_attempt('redeem_fail'); json_out(['ok' => false, 'error' => 'Няма такъв код. Проверете буквите и цифрите.', 'field' => 'code'], 404); }
    if ((int)$row['revoked'] === 1) json_out(['ok' => false, 'error' => 'Този код е спрян. Пишете ни на ' . site_config()['contactEmail'] . '.'], 403);
    if ($row['expires_at'] < today()) json_out(['ok' => false, 'error' => 'Кодът е изтекъл на ' . date('d.m.Y', strtotime($row['expires_at'])) . '.'], 410);
    if ((int)$row['account_id'] === (int)$a['id']) json_out(['ok' => false, 'error' => 'Този абонамент вече е активен във вашия акаунт.'], 409);
    $pdo->exec('BEGIN IMMEDIATE');
    $st = $pdo->prepare('SELECT account_id FROM codes WHERE code = ?'); $st->execute([$code]);
    $used = (int)$st->fetchColumn();
    if (!$used) { $st = $pdo->prepare('SELECT COUNT(*) FROM redemptions WHERE code = ?'); $st->execute([$code]); $used = (int)$st->fetchColumn(); }
    if ($used) { $pdo->exec('ROLLBACK'); note_attempt('redeem_fail'); json_out(['ok' => false, 'error' => 'Този код вече е използван. Всеки код се активира само веднъж.'], 409); }
    $pdo->prepare('UPDATE codes SET account_id = ?, activated_at = ?, max_uses = COALESCE(NULLIF(max_uses, 0), ?) WHERE code = ?')->execute([(int)$a['id'], now(), PLAN_SEATS[$row['type']] ?? 1, $code]);
    if ($row['type'] === 'class') {
        $pdo->prepare('UPDATE batches SET account_id = ? WHERE id = ?')->execute([(int)$a['id'], (int)$row['batch_id']]);
        if ($a['role'] !== 'teacher') $pdo->prepare("UPDATE accounts SET role = 'teacher' WHERE id = ?")->execute([(int)$a['id']]);
    }
    $pdo->exec('COMMIT');
    $res = acc_me(auth_account(true)); $res['activated'] = ['type' => $row['type'], 'typeName' => TYPE_NAMES[$row['type']] ?? '', 'expires' => $row['expires_at'], 'classId' => $row['type'] === 'class' ? (int)$row['batch_id'] : 0];
    json_out($res);

case 'profile_plan': // индивидуален абонамент: за кое дете е (може да се премести)
    $a = need(); $p = my_profile($a, $in['id'] ?? 0);
    $subs = array_merge(account_subs((int)$a['id'], 'single'), account_subs((int)$a['id'], 'family'));
    if (!$subs) json_out(['ok' => false, 'error' => 'Нямате активен абонамент.'], 400);
    $s0 = $subs[0];
    $st = $pdo->prepare('SELECT id FROM profiles WHERE code = ? AND id <> ? ORDER BY updated_at'); $st->execute([$s0['code'], (int)$p['id']]);
    $others = array_column($st->fetchAll(), 'id');
    if (count($others) >= code_seats($s0)) $pdo->prepare('UPDATE profiles SET code = NULL WHERE id = ?')->execute([(int)$others[0]]);
    $pdo->prepare('UPDATE profiles SET code = ? WHERE id = ?')->execute([$s0['code'], (int)$p['id']]);
    json_out(acc_me(auth_account()));
}
json_out(['ok' => false, 'error' => 'Непознато действие.'], 400);
