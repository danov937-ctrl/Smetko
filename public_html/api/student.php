<?php
/* Вход за ученик от клас: потребител и парола, създадени от учителя в „Табло“.
   POST {action: login, username, password}  → достъп (token), име, клас, прогрес
   POST {action: state, token}               → прогресът от сървъра
   POST {action: save_state, token, rev, state} → запис (при конфликт връща новото състояние за сливане)
   Прогресът се пази на сървъра, за да продължи детето от училищния таблет и от телефона у дома. */
declare(strict_types=1);
const MAX_STATE = 300000;
require __DIR__ . '/lib.php';
require_post();
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? ''))) json_out(['ok' => false, 'error' => 'Забранено.'], 403);
$raw = file_get_contents('php://input') ?: '';
if (strlen($raw) > MAX_STATE + 5000) json_out(['ok' => false, 'error' => 'Прекалено голяма заявка.'], 413);
$in = json_decode($raw, true); if (!is_array($in)) $in = [];
$obj = json_decode($raw);
$pdo = db();

function student_out(array $r, array $c): array {
    $b = db()->prepare('SELECT b.*, s.name AS school, s.town FROM batches b LEFT JOIN schools s ON s.id = b.school_id WHERE b.id = ?'); $b->execute([(int)$c['batch_id']]); $b = $b->fetch() ?: [];
    return ['ok' => true, 'student' => ['id' => (int)$r['id'], 'name' => (string)$r['nickname'], 'avatar' => $r['avatar'] ?: '🦉', 'username' => $r['username']], 'adapt' => adapt_out($r['adapt'] ?? null),
        'class' => ['name' => trim(($b['class_name'] ?? '') ? $b['class_name'] . ' клас' : ''), 'school' => $b['school'] ?? '', 'grade' => (int)($b['grade'] ?? 0), 'book' => $b['book'] ?? ''],
        'access' => access_obj($c, (string)$r['device']) + ['student' => true], 'state' => $r['state'] ? json_decode((string)$r['state']) : null, 'rev' => (int)$r['rev']];
}
function by_token(array $in): array {
    $t = read_token((string)($in['token'] ?? ''));
    if (!$t) json_out(['ok' => false, 'error' => 'Влез отново.', 'auth' => false], 401);
    $st = db()->prepare('SELECT * FROM redemptions WHERE code = ? AND device = ? AND username IS NOT NULL'); $st->execute([$t['c'], $t['d']]);
    $r = $st->fetch(); $st->closeCursor(); if (!$r) json_out(['ok' => false, 'error' => 'Профилът вече не съществува. Попитай учителя.', 'auth' => false], 401);
    return $r;
}

$action = (string)($in['action'] ?? '');
if ($action === 'login') {
    if (too_many('kid_fail', 15, 900)) json_out(['ok' => false, 'error' => 'Твърде много грешни опити. Опитай пак след 15 минути.'], 429);
    $u = strtolower(trim((string)($in['username'] ?? '')));
    $st = $pdo->prepare('SELECT * FROM redemptions WHERE username = ?'); $st->execute([$u]);
    $r = $st->fetch(); $st->closeCursor();
    if (!$r || !password_verify(strtolower(trim((string)($in['password'] ?? ''))), (string)$r['pass_hash'])) { note_attempt('kid_fail'); json_out(['ok' => false, 'error' => 'Грешно име или парола. Провери картичката от учителя.'], 403); }
    $c = get_code((string)$r['code']);
    if (!$c || (int)$c['revoked']) json_out(['ok' => false, 'error' => 'Класът е спрян. Попитай учителя.'], 403);
    if ($c['expires_at'] < today()) json_out(['ok' => false, 'error' => 'Абонаментът на класа е изтекъл. Попитай учителя.'], 403);
    $pdo->prepare('UPDATE redemptions SET last_seen = ? WHERE id = ?')->execute([now(), (int)$r['id']]);
    json_out(student_out($r, $c));
}
if ($action === 'state') {
    $r = by_token($in); $c = get_code((string)$r['code']);
    json_out(student_out($r, $c ?: []));
}
if ($action === 'save_state') {
    $r = by_token($in);
    $s = is_object($obj) && isset($obj->state) && $obj->state instanceof stdClass ? $obj->state : null;
    if (!$s) json_out(['ok' => false, 'error' => 'Невалиден прогрес.'], 400);
    unset($s->access, $s->deviceId, $s->accessLost);
    $j = json_encode($s, JSON_UNESCAPED_UNICODE);
    if ($j === false || strlen($j) > MAX_STATE) json_out(['ok' => false, 'error' => 'Прогресът е твърде голям.'], 413);
    if ((int)($in['rev'] ?? -1) !== (int)$r['rev']) json_out(['ok' => true, 'conflict' => true, 'state' => $r['state'] ? json_decode((string)$r['state']) : null, 'rev' => (int)$r['rev']]);
    $st = $pdo->prepare('UPDATE redemptions SET state = ?, rev = rev + 1 WHERE id = ? AND rev = ?'); $st->execute([$j, (int)$r['id'], (int)$r['rev']]);
    if (!$st->rowCount()) json_out(['ok' => true, 'conflict' => true, 'state' => null, 'rev' => -1]);
    json_out(['ok' => true, 'rev' => (int)$r['rev'] + 1]);
}
json_out(['ok' => false, 'error' => 'Непознато действие.'], 400);
