<?php
/* GET → активните новини (най-новите първи). Видяното се пази в браузъра на детето. */
declare(strict_types=1);
require __DIR__ . '/lib.php';
$t = today();
$st = db()->prepare("SELECT id, emoji, title, body, link, link_text, popup, COALESCE(starts, substr(created_at, 1, 10)) AS d FROM news
    WHERE active = 1 AND (starts IS NULL OR starts = '' OR starts <= ?) AND (ends IS NULL OR ends = '' OR ends >= ?) ORDER BY d DESC, id DESC LIMIT 30");
$st->execute([$t, $t]);
$out = array_map(fn($n) => ['id' => (int)$n['id'], 'emoji' => $n['emoji'] ?: '📣', 'title' => $n['title'], 'body' => $n['body'], 'link' => $n['link'], 'linkText' => $n['link_text'], 'popup' => (int)$n['popup'] === 1, 'date' => $n['d']], $st->fetchAll());
header('Cache-Control: public, max-age=120');
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true, 'news' => $out], JSON_UNESCAPED_UNICODE);
