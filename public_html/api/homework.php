<?php
/* Домашни и съобщение от учителя – за ученика от клас (учителят ги задава в „Табло“ – api/teacher.php).
   POST {token, action: mine}                         → домашните на класа, моят резултат и съобщението на учителя
   POST {token, action: submit, id, correct, answered} → предаване (пази се най-добрият опит) */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
if (too_many('hw', 240, 600)) json_out(['ok' => false, 'error' => 'Твърде чести заявки.'], 429);
note_attempt('hw');
$in = json_in();
$action = (string)($in['action'] ?? '');
$pdo = db();
$t = read_token((string)($in['token'] ?? ''));
if (!$t) json_out(['ok' => false, 'error' => 'Невалиден достъп.'], 401);
$st = $pdo->prepare('SELECT id FROM redemptions WHERE code = ? AND device = ?'); $st->execute([$t['c'], $t['d']]);
$rid = (int)$st->fetchColumn();
$row = get_code($t['c']);
$batch = $row ? batch_of($t['c']) : null;
if (!$row || $row['type'] !== 'class' || !$batch) json_out(['ok' => true, 'list' => [], 'class' => false]); // домашните са само за класове
if ((int)$row['revoked'] || $row['expires_at'] < today()) json_out(['ok' => false, 'error' => 'Абонаментът на класа не е активен.'], 403);
$bid = (int)$batch['id'];
$hwOut = fn(array $h) => ['id' => (int)$h['id'], 'grade' => (int)$h['grade'], 'topic' => $h['topic'], 'title' => $h['title'], 'count' => (int)$h['count'], 'level' => (int)$h['level'], 'due' => $h['due'], 'created' => substr((string)$h['created_at'], 0, 10)];
function hw_get(int $bid, $id): array {
    $st = db()->prepare('SELECT * FROM homework WHERE id = ? AND batch_id = ?'); $st->execute([(int)$id, $bid]);
    $h = $st->fetch(); if (!$h) json_out(['ok' => false, 'error' => 'Няма такава домашна.'], 404); return $h;
}

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
    json_out(['ok' => true, 'class' => true, 'today' => today(), 'message' => (string)($batch['message'] ?? ''), 'messageAt' => substr((string)($batch['message_at'] ?? ''), 0, 10), 'list' => array_map(fn($h) => $hwOut($h) + ['done' => $h['my_done'] !== null, 'best' => $h['my_done'] !== null ? (int)$h['my_correct'] : null], $st->fetchAll())]);
