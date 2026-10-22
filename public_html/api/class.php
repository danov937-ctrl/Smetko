<?php
/* Класация на класа. Един клас = една партида: N еднократни кода за учениците + 1 код за учителя с ПИН.
   Ученик: POST {token} → класацията на неговия клас (само прякори и точки).
   Учител: POST {code, pin} → пълна таблица; {code, pin, hide: id[, unhide: 1]} → скрива/показва ученик.
   (code може да е кодът на учителя или който и да е код от класа; ПИН-ът е общ за партидата.) */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
$in = json_in();
$teacher = false; $code = ''; $me = '';
if (!empty($in['token'])) {
    $t = read_token((string)$in['token']);
    if (!$t) json_out(['ok' => false, 'error' => 'Невалиден токен.'], 401);
    $code = $t['c']; $me = $t['d'];
} else {
    if (too_many('pin_fail', 10, 900)) json_out(['ok' => false, 'error' => 'Твърде много грешни опити. Опитай пак след 15 минути.'], 429);
    $code = normalize_code((string)($in['code'] ?? ''));
}
$row = $code ? get_code($code) : null;
$batch = $row ? batch_of($code) : null;
if (!$teacher && empty($in['token'])) {
    $pin = (string)($batch['pin'] ?? '') ?: (string)($row['pin'] ?? ''); // по-старите кодове пазят ПИН-а на самия код
    if (!$row || $pin === '' || !hash_equals($pin, trim((string)($in['pin'] ?? '')))) { note_attempt('pin_fail'); json_out(['ok' => false, 'error' => 'Грешен код или ПИН.'], 403); }
    $teacher = true;
}
if (!$row || $row['type'] !== 'class' || !$batch) json_out(['ok' => false, 'error' => 'Класацията е само за кодове за клас.'], 404);
$bid = (int)$batch['id'];
$pdo = db();
if ($teacher && isset($in['hide'])) {
    $pdo->prepare('UPDATE redemptions SET hidden = ? WHERE id = ? AND code IN (SELECT code FROM codes WHERE batch_id = ?)')
        ->execute([empty($in['unhide']) ? 1 : 0, (int)$in['hide'], $bid]);
}
if ($teacher && isset($in['settings']) && is_array($in['settings'])) { // учителят: име за общата класация и участие
    $tn = mb_substr(trim(preg_replace('/[^\p{L}\p{N} .\-„“"]/u', '', (string)($in['settings']['teacher_name'] ?? '')) ?? ''), 0, 40);
    $pdo->prepare('UPDATE batches SET teacher_name = ?, public = ? WHERE id = ?')->execute([$tn, empty($in['settings']['public']) ? 0 : 1, $bid]);
    $batch = batch_of($code);
}
if ($teacher && isset($in['release'])) { // смяна/загуба на устройство: кодът може да се въведе отново веднъж
    $pdo->prepare("DELETE FROM redemptions WHERE id = ? AND code IN (SELECT code FROM codes WHERE batch_id = ? AND COALESCE(role, 'student') <> 'teacher')")
        ->execute([(int)$in['release'], $bid]);
}
$st = $pdo->prepare("SELECT r.id, r.code, r.device, r.nickname, r.grade, MAX(0, r.points - COALESCE(r.join_base, 0)) AS points, r.correct, r.answered, r.stars, r.missions, r.last_seen, r.hidden
    FROM redemptions r JOIN codes c ON c.code = r.code
    WHERE c.batch_id = ? AND COALESCE(c.role, 'student') <> 'teacher' AND c.revoked = 0
    ORDER BY points DESC, r.correct DESC, r.id");
$st->execute([$bid]);
$list = [];
$i = 0;
foreach ($st->fetchAll() as $r) {
    if (!$teacher && (int)$r['hidden'] === 1) continue;
    $i++;
    $item = ['place' => $i, 'name' => $r['nickname'] ?: 'Играч ' . $i, 'points' => (int)$r['points'], 'stars' => (int)$r['stars'], 'missions' => (int)$r['missions'], 'me' => $me && hash_equals($r['device'], $me)];
    if ($teacher) $item += ['id' => (int)$r['id'], 'code' => $r['code'], 'correct' => (int)$r['correct'], 'answered' => (int)$r['answered'], 'grade' => (int)$r['grade'], 'last' => $r['last_seen'], 'hidden' => (int)$r['hidden'] === 1];
    $list[] = $item;
}
$n = $pdo->prepare("SELECT COUNT(*) FROM codes WHERE batch_id = ? AND COALESCE(role, 'student') <> 'teacher' AND revoked = 0"); $n->execute([$bid]);
$school = null;
if (!empty($batch['school_id'])) { $q = $pdo->prepare('SELECT name, town FROM schools WHERE id = ?'); $q->execute([(int)$batch['school_id']]); $school = $q->fetch() ?: null; }
json_out(['ok' => true, 'label' => $batch['label'] ?: $row['label'], 'school' => $school, 'className' => $batch['class_name'] ?? '', 'teacherName' => $batch['teacher_name'] ?? '', 'public' => (int)($batch['public'] ?? 1) === 1, 'expires' => $row['expires_at'], 'uses' => count($list), 'max' => (int)$n->fetchColumn(), 'teacher' => $teacher, 'list' => $list]);
