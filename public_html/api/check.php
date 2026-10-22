<?php
/* POST {token} → валиден ли е още достъпът */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
$in = json_in();
$t = read_token((string)($in['token'] ?? ''));
if (!$t) json_out(['ok' => false, 'valid' => false, 'error' => 'Невалиден токен.'], 401);
$row = get_code($t['c']);
$valid = $row && (int)$row['revoked'] === 0 && $row['expires_at'] >= today();
if ($valid) {
    $st = db()->prepare('SELECT id FROM redemptions WHERE code = ? AND device = ?'); $st->execute([$t['c'], $t['d']]);
    $valid = (bool)$st->fetchColumn();
    if ($valid) db()->prepare('UPDATE redemptions SET last_seen = ? WHERE code = ? AND device = ?')->execute([now(), $t['c'], $t['d']]);
}
json_out(['ok' => true, 'valid' => $valid, 'expires' => $row['expires_at'] ?? null]);
