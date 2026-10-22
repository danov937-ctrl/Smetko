<?php
/* GET → учебниците, добавени от админ панела (списък с уроци; мисиите се подреждат в браузъра с js/lesson-map.js). */
declare(strict_types=1);
require __DIR__ . '/lib.php';
$out = [];
foreach (db()->query('SELECT grade, bid, publisher, title, source, lessons FROM books WHERE active = 1 ORDER BY grade, publisher') as $b) {
    $out[] = ['grade' => (int)$b['grade'], 'bid' => $b['bid'], 'publisher' => $b['publisher'], 'title' => $b['title'], 'source' => $b['source'],
        'lessons' => array_values(array_filter(array_map('trim', explode("\n", (string)$b['lessons'])), fn($l) => $l !== ''))];
}
header('Cache-Control: public, max-age=300');
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true, 'books' => $out], JSON_UNESCAPED_UNICODE);
