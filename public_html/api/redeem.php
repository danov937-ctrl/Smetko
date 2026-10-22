<?php
/* POST {code, device, nickname?, grade?} → активира код на устройство */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
if (too_many('redeem_fail', 12, 900)) json_out(['ok' => false, 'error' => 'Твърде много грешни опити. Опитай пак след 15 минути.'], 429);
$in = json_in();
$code = normalize_code((string)($in['code'] ?? ''));
$device = clean_device((string)($in['device'] ?? ''));
if (!$device) json_out(['ok' => false, 'error' => 'Невалидно устройство. Презареди страницата.'], 400);
$row = $code ? get_code($code) : null;
if (!$row) { note_attempt('redeem_fail'); json_out(['ok' => false, 'error' => 'Няма такъв код. Провери буквите и цифрите.'], 404); }
if ((int)$row['revoked'] === 1) json_out(['ok' => false, 'error' => 'Този код е спрян. Свържи се с нас.'], 403);
if ($row['expires_at'] < today()) json_out(['ok' => false, 'error' => 'Кодът е изтекъл на ' . date('d.m.Y', strtotime($row['expires_at'])) . '.'], 410);

$pdo = db();
$st = $pdo->prepare('SELECT id FROM redemptions WHERE code = ? AND device = ?'); $st->execute([$code, $device]);
$existing = $st->fetchColumn();
$nick = clean_nick((string)($in['nickname'] ?? ''));
$grade = max(0, min(4, (int)($in['grade'] ?? 0)));
if (!$existing) {
    $pdo->beginTransaction();
    if (code_uses($code) >= (int)$row['max_uses']) { $pdo->rollBack(); json_out(['ok' => false, 'error' => 'Кодът вече е използван на максималния брой устройства (' . (int)$row['max_uses'] . ').'], 409); }
    $pdo->prepare('INSERT INTO redemptions(code, device, created_at, last_seen, nickname, grade) VALUES(?, ?, ?, ?, ?, ?)')->execute([$code, $device, now(), now(), $nick ?: null, $grade ?: null]);
    $pdo->commit();
} elseif ($nick) {
    $pdo->prepare('UPDATE redemptions SET nickname = ?, last_seen = ? WHERE code = ? AND device = ?')->execute([$nick, now(), $code, $device]);
}
json_out([
    'ok' => true, 'code' => $code, 'type' => $row['type'], 'typeName' => TYPE_NAMES[$row['type']] ?? $row['type'],
    'expires' => $row['expires_at'], 'label' => $row['label'], 'token' => make_token($code, $device, $row['expires_at']),
    'classBoard' => $row['type'] === 'class'
]);
