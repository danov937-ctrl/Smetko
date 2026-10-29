<?php
/* GET → активните новини (най-новите първи). Видяното се пази в браузъра на детето. */
declare(strict_types=1);
require __DIR__ . '/lib.php';
$t = today();
// еднократна новина за затворения тест (добавя се при първата заявка след качването; после се редактира от админ → Новини)
if (!setting('news_seed_test')) {
    $pdo = db(); $pdo->exec('BEGIN IMMEDIATE');
    if (!setting('news_seed_test')) {
        set_setting('news_seed_test', '1');
        $pdo->prepare('INSERT INTO news(emoji, title, body, link, link_text, starts, ends, active, popup, created_at) VALUES(?, ?, ?, ?, ?, ?, NULL, 1, 1, ?)')->execute(['🧪', 'Сметко е в тестов период',
            "В момента тестваме Сметко със затворена група родители, учители и училища. Безплатният план е отворен за всички, а пълният достъп засега е само с код за достъп от нас.\n\nУчаствате в теста? Отделете 3 минути за кратката анкета – вашето мнение ще реши какво да подобрим и какви да са абонаментите.\n\nИскате да се включите? Пишете ни на info@smetko.com.",
            'anketa.html', '📝 Попълни анкетата', $t, now()]);
    }
    $pdo->exec('COMMIT');
}
$st = db()->prepare("SELECT id, emoji, title, body, link, link_text, popup, COALESCE(starts, substr(created_at, 1, 10)) AS d FROM news
    WHERE active = 1 AND (starts IS NULL OR starts = '' OR starts <= ?) AND (ends IS NULL OR ends = '' OR ends >= ?) ORDER BY d DESC, id DESC LIMIT 30");
$st->execute([$t, $t]);
$out = array_map(fn($n) => ['id' => (int)$n['id'], 'emoji' => $n['emoji'] ?: '📣', 'title' => $n['title'], 'body' => $n['body'], 'link' => $n['link'], 'linkText' => $n['link_text'], 'popup' => (int)$n['popup'] === 1, 'date' => $n['d']], $st->fetchAll());
header('Cache-Control: public, max-age=120');
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true, 'news' => $out], JSON_UNESCAPED_UNICODE);
