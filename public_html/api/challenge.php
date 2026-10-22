<?php
/* Седмично предизвикателство.
   GET → темата на седмицата за всеки клас.
   POST {token, grade} → класацията на седмицата (само за играчи с код). */
declare(strict_types=1);
require __DIR__ . '/lib.php';
$week = week_key();
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    $g = [];
    for ($i = 1; $i <= 4; $i++) { $c = challenge_for($week, $i); $g[$i] = ['title' => $c['title'], 'skills' => $c['skills']]; }
    header('Cache-Control: public, max-age=300');
    json_out(['ok' => true, 'week' => $week, 'ends' => date('Y-m-d', strtotime('sunday this week')), 'goal' => CHALLENGE_GOAL, 'grades' => $g]);
}
if (too_many('league', 240, 600)) json_out(['ok' => false, 'error' => 'Твърде чести заявки.'], 429);
note_attempt('league');
$in = json_in();
$grade = max(1, min(4, (int)($in['grade'] ?? 1)));
$acc = league_access($in);
if (!$acc) json_out(['ok' => true, 'locked' => true, 'list' => []]);
$t = $acc['t'] ?: ['c' => '', 'd' => ''];
$st = db()->prepare("SELECT cs.best, cs.at, r.id, r.device, r.code, r.nickname, b.class_name, s.name AS sname, s.town
    FROM challenge_scores cs JOIN redemptions r ON r.id = cs.rid JOIN codes c ON c.code = r.code JOIN batches b ON b.id = c.batch_id LEFT JOIN schools s ON s.id = b.school_id
    WHERE cs.week = ? AND cs.grade = ? AND r.hidden = 0 AND (b.type <> 'class' OR COALESCE(b.public, 1) = 1) AND c.revoked = 0 ORDER BY cs.best DESC, cs.at ASC");
$st->execute([$week, $grade]);
$list = []; $mine = null;
foreach ($st->fetchAll() as $i => $r) {
    $isMe = $r['code'] === $t['c'] && hash_equals($r['device'], $t['d']);
    if ($isMe) $mine = ['place' => $i + 1, 'best' => (int)$r['best']];
    if ($i < 50 || $isMe) $list[] = ['place' => $i + 1, 'name' => $r['nickname'] ?: 'Играч', 'class' => $r['class_name'] ?: '', 'school' => $r['sname'] ?: '', 'town' => $r['town'] ?? '', 'best' => (int)$r['best'], 'mine' => $isMe];
}
json_out(['ok' => true, 'week' => $week, 'grade' => $grade, 'list' => $list, 'mine' => $mine]);
