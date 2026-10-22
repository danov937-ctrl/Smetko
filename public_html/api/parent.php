<?php
/* Отчет за родителя: POST {code, pin} → напредъкът на детето (за индивидуални и семейни кодове).
   ПИН-ът за родителя е на картичката / в имейла с кода. */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
if (too_many('parent_fail', 10, 900)) json_out(['ok' => false, 'error' => 'Твърде много грешни опити. Опитайте пак след 15 минути.'], 429);
$in = json_in();
$code = normalize_code((string)($in['code'] ?? ''));
$row = $code ? get_code($code) : null;
if (!$row || $row['type'] === 'class' || !$row['pin'] || !hash_equals((string)$row['pin'], trim((string)($in['pin'] ?? '')))) {
    note_attempt('parent_fail');
    json_out(['ok' => false, 'error' => $row && $row['type'] === 'class' ? 'За кодовете на клас отчетът е при учителя (smetko.com/klasaciya).' : 'Грешен код или ПИН.'], 403);
}
$st = db()->prepare('SELECT * FROM redemptions WHERE code = ? ORDER BY id DESC LIMIT 1'); $st->execute([$code]);
$r = $st->fetch();
$stats = $r && $r['stats'] ? json_decode((string)$r['stats'], true) : ['s' => [], 'd' => []];
json_out(['ok' => true, 'code' => $code, 'typeName' => TYPE_NAMES[$row['type']] ?? '', 'expires' => $row['expires_at'], 'revoked' => (int)$row['revoked'] === 1,
    'activated' => $r['created_at'] ?? null, 'last' => $r['last_seen'] ?? null, 'nickname' => $r['nickname'] ?? '', 'grade' => (int)($r['grade'] ?? 0),
    'points' => (int)($r['points'] ?? 0), 'correct' => (int)($r['correct'] ?? 0), 'answered' => (int)($r['answered'] ?? 0), 'stars' => (int)($r['stars'] ?? 0), 'missions' => (int)($r['missions'] ?? 0),
    'skills' => $stats['s'] ?? [], 'days' => $stats['d'] ?? []]);
