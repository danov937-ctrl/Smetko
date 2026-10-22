<?php
/* Домашни с краен срок (клас = партида).
   Ученик:  POST {token, action: mine}                       → домашните на класа и моят резултат
            POST {token, action: submit, id, correct, answered} → предаване (пази се най-добрият опит)
   Учител:  POST {code, pin, action: list}                   → домашните с резултатите на учениците
            POST {code, pin, action: create, grade, topic, title, count, level, due}
            POST {code, pin, action: delete, id} */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
if (too_many('hw', 240, 600)) json_out(['ok' => false, 'error' => 'Твърде чести заявки.'], 429);
note_attempt('hw');
$in = json_in();
$action = (string)($in['action'] ?? '');
$pdo = db();
$rid = 0; $teacher = false;
if (!empty($in['token'])) {
    $t = read_token((string)$in['token']);
    if (!$t) json_out(['ok' => false, 'error' => 'Невалиден токен.'], 401);
    $st = $pdo->prepare('SELECT id FROM redemptions WHERE code = ? AND device = ?'); $st->execute([$t['c'], $t['d']]);
    $rid = (int)$st->fetchColumn();
    $code = $t['c'];
} else {
    if (too_many('pin_fail', 10, 900)) json_out(['ok' => false, 'error' => 'Твърде много грешни опити. Опитайте пак след 15 минути.'], 429);
    $code = normalize_code((string)($in['code'] ?? ''));
}
$row = $code ? get_code($code) : null;
$batch = $row ? batch_of($code) : null;
if (empty($in['token'])) {
    $pin = (string)($batch['pin'] ?? '') ?: (string)($row['pin'] ?? '');
    if (!$row || $pin === '' || !hash_equals($pin, trim((string)($in['pin'] ?? '')))) { note_attempt('pin_fail'); json_out(['ok' => false, 'error' => 'Грешен код или ПИН.'], 403); }
    $teacher = true;
}
if (!$row || $row['type'] !== 'class' || !$batch) json_out(['ok' => true, 'list' => [], 'class' => false]); // домашните са само за класове
if ((int)$row['revoked'] || $row['expires_at'] < today()) json_out(['ok' => false, 'error' => 'Кодът не е активен.'], 403);
$bid = (int)$batch['id'];
$hwOut = fn(array $h) => ['id' => (int)$h['id'], 'grade' => (int)$h['grade'], 'topic' => $h['topic'], 'title' => $h['title'], 'count' => (int)$h['count'], 'level' => (int)$h['level'], 'due' => $h['due'], 'created' => substr((string)$h['created_at'], 0, 10)];
function hw_get(int $bid, $id): array {
    $st = db()->prepare('SELECT * FROM homework WHERE id = ? AND batch_id = ?'); $st->execute([(int)$id, $bid]);
    $h = $st->fetch(); if (!$h) json_out(['ok' => false, 'error' => 'Няма такава домашна.'], 404); return $h;
}

if (!$teacher) {
    if ($action === 'submit') {
        if (!$rid) json_out(['ok' => false, 'error' => 'Кодът не е активиран на това устройство.'], 403);
        $h = hw_get($bid, $in['id'] ?? 0);
        $answered = max(0, min((int)$h['count'], (int)($in['answered'] ?? 0)));
        $correct = max(0, min($answered, (int)($in['correct'] ?? 0)));
        if ($answered < (int)$h['count']) json_out(['ok' => false, 'error' => 'Домашната не е довършена.'], 400);
        $pdo->prepare('INSERT INTO homework_done(hw_id, rid, correct, answered, tries, done_at) VALUES(?, ?, ?, ?, 1, ?)
            ON CONFLICT(hw_id, rid) DO UPDATE SET tries = tries + 1, done_at = CASE WHEN excluded.correct > correct THEN excluded.done_at ELSE done_at END, correct = MAX(correct, excluded.correct), answered = excluded.answered')
            ->execute([(int)$h['id'], $rid, $correct, $answered, date('Y-m-d H:i:s')]);
        $st = $pdo->prepare('SELECT correct, tries FROM homework_done WHERE hw_id = ? AND rid = ?'); $st->execute([(int)$h['id'], $rid]);
        $r = $st->fetch();
        json_out(['ok' => true, 'best' => (int)$r['correct'], 'tries' => (int)$r['tries'], 'late' => today() > $h['due']]);
    }
    // mine: активните домашни (до 7 дни след срока)
    $st = $pdo->prepare('SELECT h.*, d.correct AS my_correct, d.done_at AS my_done FROM homework h LEFT JOIN homework_done d ON d.hw_id = h.id AND d.rid = ? WHERE h.batch_id = ? AND h.due >= ? ORDER BY h.due, h.id');
    $st->execute([$rid, $bid, date('Y-m-d', strtotime('-7 days'))]);
    json_out(['ok' => true, 'class' => true, 'today' => today(), 'list' => array_map(fn($h) => $hwOut($h) + ['done' => $h['my_done'] !== null, 'best' => $h['my_done'] !== null ? (int)$h['my_correct'] : null], $st->fetchAll())]);
}

// ---------- учител ----------
if ($action === 'create') {
    $grade = max(1, min(4, (int)($in['grade'] ?? 1)));
    $topic = (string)($in['topic'] ?? 'mix');
    if (!preg_match('/^[A-Za-z0-9:_-]{1,40}$/', $topic)) json_out(['ok' => false, 'error' => 'Невалидна тема.'], 400);
    $title = mb_substr(trim((string)($in['title'] ?? '')), 0, 80) ?: 'Домашна';
    $count = max(5, min(50, (int)($in['count'] ?? 10)));
    $level = max(1, min(3, (int)($in['level'] ?? 2)));
    $due = (string)($in['due'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $due) || $due < today() || $due > date('Y-m-d', strtotime('+90 days'))) json_out(['ok' => false, 'error' => 'Изберете срок между днес и 90 дни напред.', 'field' => 'due'], 400);
    $n = $pdo->prepare('SELECT COUNT(*) FROM homework WHERE batch_id = ? AND due >= ?'); $n->execute([$bid, today()]);
    if ((int)$n->fetchColumn() >= 30) json_out(['ok' => false, 'error' => 'Има твърде много активни домашни (30). Изтрийте някои стари.'], 400);
    $pdo->prepare('INSERT INTO homework(batch_id, grade, topic, title, count, level, due, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)')->execute([$bid, $grade, $topic, $title, $count, $level, $due, now()]);
} elseif ($action === 'delete') {
    $h = hw_get($bid, $in['id'] ?? 0);
    $pdo->prepare('DELETE FROM homework_done WHERE hw_id = ?')->execute([(int)$h['id']]);
    $pdo->prepare('DELETE FROM homework WHERE id = ?')->execute([(int)$h['id']]);
}
// list (и след create/delete): последните 40 домашни с резултатите на всеки ученик
$students = $pdo->prepare("SELECT r.id, COALESCE(NULLIF(r.nickname, ''), 'Ученик') AS name, r.hidden FROM redemptions r JOIN codes c ON c.code = r.code WHERE c.batch_id = ? AND COALESCE(c.role, 'student') <> 'teacher' ORDER BY name");
$students->execute([$bid]); $students = $students->fetchAll();
$hs = $pdo->prepare('SELECT * FROM homework WHERE batch_id = ? ORDER BY due DESC, id DESC LIMIT 40'); $hs->execute([$bid]);
$done = $pdo->prepare('SELECT rid, correct, answered, tries, done_at FROM homework_done WHERE hw_id = ?');
$out = [];
foreach ($hs->fetchAll() as $h) {
    $done->execute([(int)$h['id']]); $d = [];
    foreach ($done->fetchAll() as $x) $d[(int)$x['rid']] = $x;
    $res = array_map(fn($s) => ['name' => $s['name'], 'done' => isset($d[(int)$s['id']]), 'correct' => isset($d[(int)$s['id']]) ? (int)$d[(int)$s['id']]['correct'] : null, 'tries' => isset($d[(int)$s['id']]) ? (int)$d[(int)$s['id']]['tries'] : 0,
        'at' => isset($d[(int)$s['id']]) ? substr((string)$d[(int)$s['id']]['done_at'], 0, 16) : null, 'late' => isset($d[(int)$s['id']]) && substr((string)$d[(int)$s['id']]['done_at'], 0, 10) > $h['due']], $students);
    $out[] = $hwOut($h) + ['doneCount' => count(array_filter($res, fn($r) => $r['done'])), 'students' => $res];
}
json_out(['ok' => true, 'class' => true, 'today' => today(), 'grade' => (int)($batch['grade'] ?? 0), 'total' => count($students), 'list' => $out]);
