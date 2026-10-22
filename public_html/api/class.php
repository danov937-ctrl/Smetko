<?php
/* Класация на класа.
   Ученик: POST {token} → класацията на неговия клас (само прякори и точки).
   Учител: POST {code, pin} → пълна таблица; {code, pin, hide: id} → скрива ученик. */
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
    $row = $code ? get_code($code) : null;
    if (!$row || !$row['pin'] || !hash_equals((string)$row['pin'], trim((string)($in['pin'] ?? '')))) { note_attempt('pin_fail'); json_out(['ok' => false, 'error' => 'Грешен код или ПИН.'], 403); }
    $teacher = true;
}
$row = get_code($code);
if (!$row || $row['type'] !== 'class') json_out(['ok' => false, 'error' => 'Класацията е само за кодове за клас.'], 404);
if ($teacher && isset($in['hide'])) {
    db()->prepare('UPDATE redemptions SET hidden = ? WHERE id = ? AND code = ?')->execute([empty($in['unhide']) ? 1 : 0, (int)$in['hide'], $code]);
}
$st = db()->prepare('SELECT id, device, nickname, grade, points, correct, answered, stars, missions, last_seen, hidden FROM redemptions WHERE code = ? ORDER BY points DESC, correct DESC');
$st->execute([$code]);
$list = [];
$i = 0;
foreach ($st->fetchAll() as $r) {
    if (!$teacher && (int)$r['hidden'] === 1) continue;
    $i++;
    $item = ['place' => $i, 'name' => $r['nickname'] ?: 'Играч ' . $i, 'points' => (int)$r['points'], 'stars' => (int)$r['stars'], 'missions' => (int)$r['missions'], 'me' => $me && hash_equals($r['device'], $me)];
    if ($teacher) $item += ['id' => (int)$r['id'], 'correct' => (int)$r['correct'], 'answered' => (int)$r['answered'], 'grade' => (int)$r['grade'], 'last' => $r['last_seen'], 'hidden' => (int)$r['hidden'] === 1];
    $list[] = $item;
}
json_out(['ok' => true, 'label' => $row['label'], 'expires' => $row['expires_at'], 'uses' => count($list), 'max' => (int)$row['max_uses'], 'teacher' => $teacher, 'list' => $list]);
