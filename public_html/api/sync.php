<?php
/* POST {token, nickname?, grade?, points, correct, answered, stars, missions} → резултати за класациите.
   Точките се пазят на устройството, затова сървърът проверява дали растат правдоподобно:
   до 35 точки за верен отговор + бонус за мисия, до 1 верен отговор в секунда и до 800 верни отговора на ден. */
declare(strict_types=1);
const MAX_DAY_CORRECT = 800;
require __DIR__ . '/lib.php';
require_post();
if (too_many('sync', 120, 600)) json_out(['ok' => false, 'error' => 'Твърде чести заявки.'], 429);
note_attempt('sync');
$in = json_in();
$t = read_token((string)($in['token'] ?? ''));
if (!$t) json_out(['ok' => false, 'error' => 'Невалиден токен.'], 401);
$pdo = db();
$st = $pdo->prepare('SELECT * FROM redemptions WHERE code = ? AND device = ?'); $st->execute([$t['c'], $t['d']]);
$r = $st->fetch(); $st->closeCursor();
if (!$r) json_out(['ok' => true, 'saved' => false]);

$n = fn($k, $max) => max(0, min($max, (int)($in[$k] ?? 0)));
$points = $n('points', 10000000); $correct = $n('correct', 1000000); $answered = max($correct, $n('answered', 1000000));
$stars = $n('stars', 100000); $missions = $n('missions', 10000);
$flags = (int)$r['flags'];

// първа синхронизация: прогресът отпреди кода се приема, но в общите класации се броят само точките след активирането
if ((int)$r['synced_at'] === 0) {
    $points = min($points, $correct * 35 + $stars * 20);
    $pdo->prepare('UPDATE redemptions SET points = ?, correct = ?, stars = ?, join_base = ?, week_base = ?, week = ?, synced_at = ? WHERE id = ?')
        ->execute([$points, $correct, $stars, $points, $points, week_key(), time(), (int)$r['id']]);
    $st->execute([$t['c'], $t['d']]); $r = $st->fetch(); $st->closeCursor();
}
// правдоподобност (при изтрит прогрес числата падат – това се приема)
$elapsed = max(0, time() - (int)$r['synced_at']);
$dayCorrect = $r['day'] === today() ? (int)$r['day_correct'] : 0;
$dc = $correct - (int)$r['correct'];
if ($dc > 0) {
    $maxDc = min((int)$elapsed, max(0, MAX_DAY_CORRECT - $dayCorrect));
    if ($dc > $maxDc) { $correct = (int)$r['correct'] + $maxDc; $dc = $maxDc; $flags++; }
    $dayCorrect += $dc;
}
$ds = max(0, $stars - (int)$r['stars']);
$dp = $points - (int)$r['points'];
if ($dp > 0) {
    $maxDp = max(0, $dc) * 35 + $ds * 20 + ($elapsed >= 20 ? 60 : 0); // бонусът за мисия – най-много веднъж на 20 секунди
    if ($dp > $maxDp) { $points = (int)$r['points'] + $maxDp; $flags++; }
}

// седмични точки: базата се взима в началото на всяка седмица
$week = week_key(); $base = (int)$r['week_base'];
if ($r['week'] !== $week) $base = (int)$r['points'];
if ($points < $base) $base = $points;
$join = min((int)$r['join_base'], $points);

$nick = ((int)$r['nick_block'] || !empty($r['username'])) ? '' : clean_nick((string)($in['nickname'] ?? '')); // изтрит от админ прякор не се връща; името на ученик от клас се сменя само от учителя
$stats = isset($in['stats']) ? clean_stats($in['stats']) : null;
$sql = 'UPDATE redemptions SET last_seen = ?, synced_at = ?, points = ?, correct = ?, answered = ?, stars = ?, missions = ?, week = ?, week_base = ?, join_base = ?, flags = ?, day = ?, day_correct = ?' . ($stats ? ', stats = ?' : '') . ($nick ? ', nickname = ?' : '') . (isset($in['grade']) ? ', grade = ?' : '') . ' WHERE id = ?';
$args = [now(), time(), $points, $correct, $answered, $stars, $missions, $week, $base, $join, min($flags, 1000000), today(), $dayCorrect];
if ($stats) $args[] = $stats;
if ($nick) $args[] = $nick;
if (isset($in['grade'])) $args[] = $n('grade', 4);
$args[] = (int)$r['id'];
$pdo->prepare($sql)->execute($args);
// седмично предизвикателство: най-добрият резултат за седмицата (до 1 верен отговор в секунда → най-много 60)
if (is_array($in['ch'] ?? null) && ($in['ch']['week'] ?? '') === $week && is_array($in['ch']['best'] ?? null)) {
    $up = $pdo->prepare('INSERT INTO challenge_scores(rid, week, grade, best, at) VALUES(?, ?, ?, ?, ?) ON CONFLICT(rid, week, grade) DO UPDATE SET best = MAX(best, excluded.best), at = CASE WHEN excluded.best > best THEN excluded.at ELSE at END');
    foreach ($in['ch']['best'] as $g => $v) { $g = (int)$g; $v = max(0, min(60, (int)$v)); if ($g >= 1 && $g <= 4 && $v > 0) $up->execute([(int)$r['id'], $week, $g, $v, now()]); }
}
json_out(['ok' => true, 'saved' => true, 'points' => $points]);
