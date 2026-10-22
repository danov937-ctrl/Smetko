<?php
/* POST {token, nickname?, grade?, points, correct, answered, stars, missions} → резултати за класацията */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
if (too_many('sync', 120, 600)) json_out(['ok' => false, 'error' => 'Твърде чести заявки.'], 429);
note_attempt('sync');
$in = json_in();
$t = read_token((string)($in['token'] ?? ''));
if (!$t) json_out(['ok' => false, 'error' => 'Невалиден токен.'], 401);
$n = fn($k, $max) => max(0, min($max, (int)($in[$k] ?? 0)));
$nick = clean_nick((string)($in['nickname'] ?? ''));
$sql = 'UPDATE redemptions SET last_seen = ?, points = ?, correct = ?, answered = ?, stars = ?, missions = ?' . ($nick ? ', nickname = ?' : '') . (isset($in['grade']) ? ', grade = ?' : '') . ' WHERE code = ? AND device = ?';
$args = [now(), $n('points', 10000000), $n('correct', 1000000), $n('answered', 1000000), $n('stars', 100000), $n('missions', 10000)];
if ($nick) $args[] = $nick;
if (isset($in['grade'])) $args[] = $n('grade', 4);
$args[] = $t['c']; $args[] = $t['d'];
$st = db()->prepare($sql); $st->execute($args);
json_out(['ok' => true, 'saved' => $st->rowCount() > 0]);
