<?php
/* „Табло“ – всичко за учителя. Достъп само от влязъл акаунт, на когото е класът (активиран абонамент за клас).
   POST {action: classes}                       → класовете с кратка статистика
   POST {action: class, id}                     → целият клас: ученици (с потребител и парола), отчет по теми, домашни, настройки
   POST {action: update, id, ...}               → име/клас/училище/учител/обща класация/учебник/съобщение до класа
   POST {action: add, id, names[]}              → нови ученици (потребител + парола се правят сами)
   POST {action: edit|reset|remove|hide|adapt, id, sid, ...}  (adapt: помощни настройки за дете със СОП)
   POST {action: hw_create|hw_delete, id, ...}  → домашни */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? ''))) json_out(['ok' => false, 'error' => 'Забранено.'], 403);
if (too_many('teacher', 400, 600)) json_out(['ok' => false, 'error' => 'Твърде чести заявки.'], 429);
note_attempt('teacher');
$acc = auth_account();
if (!$acc) json_out(['ok' => false, 'error' => 'Влезте в акаунта си.', 'auth' => false], 401);
$in = json_in();
$action = (string)($in['action'] ?? 'classes');
$pdo = db();
const AVATARS_KID = ['🦉', '🦊', '🐻', '🐰', '🐼', '🐯', '🦁', '🐸', '🐵', '🐧', '🦄', '🐙', '🐢', '🐝', '🚀', '⚽', '🐶', '🐱', '🦋', '🐬'];

function my_classes(int $aid): array {
    $st = db()->prepare("SELECT b.*, c.code, c.expires_at AS cexp, c.max_uses, c.revoked, s.name AS school, s.town FROM codes c JOIN batches b ON b.id = c.batch_id LEFT JOIN schools s ON s.id = b.school_id
        WHERE c.account_id = ? AND c.type = 'class' ORDER BY c.expires_at < date('now') , b.class_name, b.id");
    $st->execute([$aid]); return $st->fetchAll();
}
function my_class(int $aid, $id): array {
    foreach (my_classes($aid) as $b) if ((int)$b['id'] === (int)$id) { if ((int)$b['revoked']) json_out(['ok' => false, 'error' => 'Класът е спрян. Пишете ни.'], 403); return $b; }
    json_out(['ok' => false, 'error' => 'Няма такъв клас във вашия акаунт.'], 404);
}
function cname(array $b): string { return $b['class_name'] ? $b['class_name'] . ' клас' : 'Моят клас'; }
function day_ago(int $n): string { return date('Y-m-d', strtotime("-$n days")); }
function students_of(array $b, bool $full): array {
    $st = db()->prepare('SELECT *, MAX(0, points - COALESCE(join_base, 0)) AS pts, (SELECT COUNT(*) FROM parent_links l WHERE l.rid = redemptions.id) AS parents FROM redemptions WHERE code = ? ORDER BY pts DESC, correct DESC, id');
    $st->execute([$b['code']]);
    $out = [];
    foreach ($st->fetchAll() as $r) {
        $stt = $r['stats'] ? (json_decode((string)$r['stats'], true) ?: []) : [];
        $dy = is_array($stt['d'] ?? null) ? $stt['d'] : [];
        $a7 = 0; $t7 = 0; $c7 = 0; for ($q = 0; $q < 7; $q++) { $d = $dy[day_ago($q)] ?? null; if (!empty($d[0])) { $a7++; $t7 += (int)$d[0]; $c7 += (int)($d[1] ?? 0); } }
        $x = ['id' => (int)$r['id'], 'name' => (string)($r['nickname'] ?: 'Ученик'), 'avatar' => $r['avatar'] ?: '🦉', 'points' => (int)$r['pts'], 'stars' => (int)$r['stars'], 'missions' => (int)$r['missions'],
            'correct' => (int)$r['correct'], 'answered' => (int)$r['answered'], 'active7' => $a7, 'tasks7' => $t7, 'correct7' => $c7, 'today' => !empty($dy[date('Y-m-d')][0]), 'last' => $r['last_seen'], 'hidden' => (int)$r['hidden'] === 1, 'grade' => (int)$r['grade'], 'username' => (string)$r['username'], 'adapt' => adapt_out($r['adapt'] ?? null), 'parents' => (int)$r['parents']];
        if ($full) $x += ['password' => kid_dec($r['pass_enc']), 'skills' => (object)(is_array($stt['s'] ?? null) ? $stt['s'] : []), 'days' => (object)$dy];
        $out[] = $x;
    }
    return $out;
}
function homework_of(array $b, array $students): array {
    $hs = db()->prepare('SELECT * FROM homework WHERE batch_id = ? ORDER BY due DESC, id DESC LIMIT 40'); $hs->execute([(int)$b['id']]);
    $done = db()->prepare('SELECT rid, correct, tries, done_at FROM homework_done WHERE hw_id = ?');
    $out = [];
    foreach ($hs->fetchAll() as $h) {
        $done->execute([(int)$h['id']]); $d = []; foreach ($done->fetchAll() as $x) $d[(int)$x['rid']] = $x;
        $res = array_map(fn($s) => ['name' => $s['name'], 'done' => isset($d[$s['id']]), 'correct' => isset($d[$s['id']]) ? (int)$d[$s['id']]['correct'] : null, 'tries' => (int)($d[$s['id']]['tries'] ?? 0),
            'at' => isset($d[$s['id']]) ? substr((string)$d[$s['id']]['done_at'], 0, 16) : null, 'late' => isset($d[$s['id']]) && substr((string)$d[$s['id']]['done_at'], 0, 10) > $h['due']], $students);
        $out[] = ['id' => (int)$h['id'], 'grade' => (int)$h['grade'], 'topic' => $h['topic'], 'title' => $h['title'], 'count' => (int)$h['count'], 'level' => (int)$h['level'], 'due' => $h['due'],
            'doneCount' => count(array_filter($res, fn($r) => $r['done'])), 'students' => $res];
    }
    return $out;
}
function class_full(array $b): array {
    $students = students_of($b, true);
    $topics = [];
    foreach ($students as $s) foreach ((array)$s['skills'] as $k => $v) {
        [$c, $a] = [(int)($v[0] ?? 0), (int)($v[1] ?? 0)];
        $topics[$k] ??= ['c' => 0, 'a' => 0, 'n' => 0, 'weak' => []];
        $topics[$k]['c'] += $c; $topics[$k]['a'] += $a; $topics[$k]['n']++;
        if ($a >= 5 && $c / $a < 0.6) $topics[$k]['weak'][] = $s['name'];
    }
    $n = count($students); $t7 = array_sum(array_column($students, 'tasks7')); $c7 = array_sum(array_column($students, 'correct7'));
    return ['ok' => true, 'today' => today(), 'class' => ['id' => (int)$b['id'], 'name' => cname($b), 'className' => (string)$b['class_name'], 'grade' => (int)$b['grade'], 'school' => (string)($b['school'] ?? ''), 'town' => (string)($b['town'] ?? ''),
            'teacherName' => (string)$b['teacher_name'], 'public' => (int)($b['public'] ?? 1) === 1, 'book' => (string)$b['book'], 'message' => (string)$b['message'], 'messageAt' => (string)$b['message_at'],
            'expires' => $b['cexp'], 'valid' => $b['cexp'] >= today(), 'seats' => (int)($b['max_uses'] ?: 30)],
        'kpi' => ['students' => $n, 'today' => count(array_filter($students, fn($s) => $s['today'])), 'week' => count(array_filter($students, fn($s) => $s['active7'] > 0)), 'tasks7' => $t7, 'acc7' => $t7 ? round($c7 / $t7 * 100) : null,
            'idle' => array_values(array_map(fn($s) => $s['name'], array_filter($students, fn($s) => $s['active7'] === 0)))],
        'students' => $students, 'topics' => (object)$topics, 'homework' => homework_of($b, $students)];
}
function clean_kid_name(string $n): string { return mb_substr(trim(preg_replace('/\s+/u', ' ', preg_replace('/[^\p{L}\p{N} .\-]/u', '', $n) ?? '') ?? ''), 0, 30); }
function student_of(array $b, $sid): array {
    $st = db()->prepare('SELECT * FROM redemptions WHERE id = ? AND code = ?'); $st->execute([(int)$sid, $b['code']]);
    $r = $st->fetch(); $st->closeCursor(); if (!$r) json_out(['ok' => false, 'error' => 'Няма такъв ученик.'], 404); return $r;
}

if ($action === 'classes') {
    $out = [];
    foreach (my_classes((int)$acc['id']) as $b) {
        if ((int)$b['revoked']) continue;
        $s = students_of($b, false);
        $out[] = ['id' => (int)$b['id'], 'name' => cname($b), 'school' => trim(($b['school'] ?? '') . (($b['town'] ?? '') ? ', ' . $b['town'] : '')), 'grade' => (int)$b['grade'], 'expires' => $b['cexp'], 'valid' => $b['cexp'] >= today(),
            'students' => count($s), 'seats' => (int)($b['max_uses'] ?: 30), 'today' => count(array_filter($s, fn($x) => $x['today'])), 'week' => count(array_filter($s, fn($x) => $x['active7'] > 0))];
    }
    json_out(['ok' => true, 'teacher' => $acc['name'], 'classes' => $out]);
}

$b = my_class((int)$acc['id'], $in['id'] ?? 0);
$bid = (int)$b['id'];
$reload = fn() => class_full(my_class((int)$acc['id'], $bid));
$writable = $b['cexp'] >= today();
if ($action !== 'class' && !$writable && !in_array($action, ['update'], true)) json_out(['ok' => false, 'error' => 'Абонаментът на класа е изтекъл – подновете го от „Абонаменти“.'], 403);

switch ($action) {
case 'class':
    json_out($reload());

case 'update':
    $txt = fn($k, $max) => mb_substr(trim(preg_replace('/\s+/u', ' ', (string)($in[$k] ?? '')) ?? ''), 0, $max);
    $cn = $txt('className', 12); $grade = max(0, min(4, (int)($in['grade'] ?? 0)));
    if (!$grade && preg_match('/^([1-4])/', $cn, $m)) $grade = (int)$m[1];
    $school = $txt('school', 120); $town = $txt('town', 60); $sid = $b['school_id'] ?: null;
    if ($school !== '') {
        $st = $pdo->prepare("SELECT id FROM schools WHERE lower(name) = lower(?) AND lower(COALESCE(town, '')) = lower(?)"); $st->execute([$school, $town]);
        $sid = (int)$st->fetchColumn() ?: null;
        if (!$sid) { $pdo->prepare('INSERT INTO schools(name, town, created_at) VALUES(?, ?, ?)')->execute([$school, $town, now()]); $sid = (int)$pdo->lastInsertId(); }
    } elseif (array_key_exists('school', $in)) $sid = null;
    $book = preg_match('/^[a-z0-9_-]{1,40}$/i', (string)($in['book'] ?? '')) ? (string)$in['book'] : '';
    $msg = mb_substr(trim((string)($in['message'] ?? '')), 0, 300);
    $tn = mb_substr(trim(preg_replace('/[^\p{L}\p{N} .\-„“"]/u', '', (string)($in['teacherName'] ?? '')) ?? ''), 0, 40);
    $label = trim(($cn ? $cn . ' клас' : '') . ($school ? ' · ' . $school . ($town ? ', ' . $town : '') : ''), ' ·') ?: $b['label'];
    $pdo->prepare('UPDATE batches SET class_name = ?, grade = ?, school_id = ?, teacher_name = ?, public = ?, book = ?, message = ?, message_at = CASE WHEN COALESCE(message, \'\') <> ? THEN ? ELSE message_at END, label = ? WHERE id = ?')
        ->execute([$cn, $grade ?: null, $sid, $tn, empty($in['public']) ? 0 : 1, $book, $msg, $msg, now(), $label, $bid]);
    json_out($reload());

case 'add':
    $names = is_array($in['names'] ?? null) ? $in['names'] : preg_split('/\r?\n/', (string)($in['names'] ?? ''));
    $names = array_values(array_filter(array_map('clean_kid_name', $names), fn($n) => $n !== ''));
    if (!$names) json_out(['ok' => false, 'error' => 'Напишете поне едно име.'], 400);
    $pdo->exec('BEGIN IMMEDIATE');
    $st = $pdo->prepare('SELECT COUNT(*) FROM redemptions WHERE code = ?'); $st->execute([$b['code']]);
    $free = (int)($b['max_uses'] ?: 30) - (int)$st->fetchColumn();
    if (count($names) > $free) { $pdo->exec('ROLLBACK'); json_out(['ok' => false, 'error' => $free > 0 ? "Има място за още $free ученици в този абонамент." : 'Класът е пълен (30 ученици).'], 400); }
    $made = [];
    $ins = $pdo->prepare('INSERT INTO redemptions(code, device, created_at, last_seen, nickname, grade, username, pass_hash, pass_enc, avatar) VALUES(?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)');
    foreach ($names as $i => $n) {
        $u = kid_username($n); $p = kid_password();
        $ins->execute([$b['code'], bin2hex(random_bytes(16)), now(), $n, (int)$b['grade'] ?: null, $u, password_hash($p, PASSWORD_DEFAULT), kid_enc($p), AVATARS_KID[($i + random_int(0, 19)) % count(AVATARS_KID)]]);
        $made[] = ['name' => $n, 'username' => $u, 'password' => $p];
    }
    $pdo->exec('COMMIT');
    json_out($reload() + ['created' => $made]);

case 'edit':
    $r = student_of($b, $in['sid'] ?? 0);
    $n = clean_kid_name((string)($in['name'] ?? $r['nickname'])) ?: (string)$r['nickname'];
    $av = in_array($in['avatar'] ?? '', AVATARS_KID, true) ? $in['avatar'] : ($r['avatar'] ?: '🦉');
    $u = strtolower(trim((string)($in['username'] ?? $r['username'])));
    if ($u !== $r['username']) {
        if (!preg_match('/^[a-z][a-z0-9]{2,19}$/', $u)) json_out(['ok' => false, 'error' => 'Потребителското име: 3–20 латински букви и цифри, започва с буква.'], 400);
        $st = $pdo->prepare('SELECT 1 FROM redemptions WHERE username = ? AND id <> ?'); $st->execute([$u, (int)$r['id']]);
        if ($st->fetchColumn()) json_out(['ok' => false, 'error' => 'Това потребителско име е заето. Опитайте друго.'], 409);
    }
    $pdo->prepare('UPDATE redemptions SET nickname = ?, avatar = ?, username = ?, nick_block = 0 WHERE id = ?')->execute([$n, $av, $u, (int)$r['id']]);
    json_out($reload());

case 'reset':
    $r = student_of($b, $in['sid'] ?? 0); $p = kid_password();
    $pdo->prepare('UPDATE redemptions SET pass_hash = ?, pass_enc = ? WHERE id = ?')->execute([password_hash($p, PASSWORD_DEFAULT), kid_enc($p), (int)$r['id']]);
    json_out($reload() + ['password' => $p, 'sid' => (int)$r['id']]);

case 'adapt': // помощни настройки (СОП) за един ученик
    $r = student_of($b, $in['sid'] ?? 0);
    $pdo->prepare('UPDATE redemptions SET adapt = ? WHERE id = ?')->execute([adapt_clean($in['adapt'] ?? null), (int)$r['id']]);
    json_out($reload());

case 'unlink_parents': // премахва връзките с родителски акаунти (напр. при грешно свързан родител)
    $r = student_of($b, $in['sid'] ?? 0);
    $pdo->prepare('DELETE FROM parent_links WHERE rid = ?')->execute([(int)$r['id']]);
    json_out($reload());

case 'hide':
    $r = student_of($b, $in['sid'] ?? 0);
    $pdo->prepare('UPDATE redemptions SET hidden = ? WHERE id = ?')->execute([empty($in['hidden']) ? 0 : 1, (int)$r['id']]);
    json_out($reload());

case 'remove':
    $r = student_of($b, $in['sid'] ?? 0);
    foreach (['DELETE FROM homework_done WHERE rid = ?', 'DELETE FROM challenge_scores WHERE rid = ?', 'DELETE FROM parent_links WHERE rid = ?', 'DELETE FROM redemptions WHERE id = ?'] as $q) $pdo->prepare($q)->execute([(int)$r['id']]);
    json_out($reload());

case 'hw_create':
    $grade = max(1, min(4, (int)($in['grade'] ?? ($b['grade'] ?: 1))));
    $topic = (string)($in['topic'] ?? 'mix');
    if (!preg_match('/^[A-Za-z0-9:_-]{1,40}$/', $topic)) json_out(['ok' => false, 'error' => 'Невалидна тема.'], 400);
    $title = mb_substr(trim((string)($in['title'] ?? '')), 0, 80) ?: 'Домашна';
    $count = max(5, min(50, (int)($in['count'] ?? 10))); $level = max(1, min(3, (int)($in['level'] ?? 2)));
    $due = (string)($in['due'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $due) || $due < today() || $due > date('Y-m-d', strtotime('+90 days'))) json_out(['ok' => false, 'error' => 'Изберете срок между днес и 90 дни напред.', 'field' => 'due'], 400);
    $n = $pdo->prepare('SELECT COUNT(*) FROM homework WHERE batch_id = ? AND due >= ?'); $n->execute([$bid, today()]);
    if ((int)$n->fetchColumn() >= 30) json_out(['ok' => false, 'error' => 'Има твърде много активни домашни (30). Изтрийте някои стари.'], 400);
    $pdo->prepare('INSERT INTO homework(batch_id, grade, topic, title, count, level, due, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)')->execute([$bid, $grade, $topic, $title, $count, $level, $due, now()]);
    json_out($reload());

case 'hw_delete':
    $st = $pdo->prepare('SELECT id FROM homework WHERE id = ? AND batch_id = ?'); $st->execute([(int)($in['hw'] ?? 0), $bid]);
    if ($hid = (int)$st->fetchColumn()) { $pdo->prepare('DELETE FROM homework_done WHERE hw_id = ?')->execute([$hid]); $pdo->prepare('DELETE FROM homework WHERE id = ?')->execute([$hid]); }
    json_out($reload());
}
json_out(['ok' => false, 'error' => 'Непознато действие.'], 400);
