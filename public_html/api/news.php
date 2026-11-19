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
// новината за безплатния режим – старата за затворения тест се скрива
if (FREE_MODE && !setting('news_seed_free')) {
    $pdo = db(); $pdo->exec('BEGIN IMMEDIATE');
    if (!setting('news_seed_free')) {
        set_setting('news_seed_free', '1');
        $pdo->prepare("UPDATE news SET active = 0, popup = 0 WHERE title = 'Сметко е в тестов период'")->execute();
        $pdo->prepare('INSERT INTO news(emoji, title, body, link, link_text, starts, ends, active, popup, created_at) VALUES(?, ?, ?, ?, ?, ?, NULL, 1, 1, ?)')->execute(['🎁', 'Сметко вече е безплатен за всички',
            "Затвореният тест свърши и Сметко е отворен за всички – без код, без абонамент и без карта.\n\nВсички мисии по учебника, „Бързо сметни“, неограничена „Тренировка“, точките, значките, гардеробът, класациите, онлайн тестовете, работните листове и отчетът за родителя са отключени. За неопределено време.\n\nБезплатно е и за училищата: учителят ни пише на info@smetko.com, получава код за класа си и създава учениците в „Табло“.",
            'pricing.html', '🎁 Какво влиза', $t, now()]);
    }
    $pdo->exec('COMMIT');
}
// сборникът за НВО вече е свободен за сваляне
if (!setting('news_seed_sbornik')) {
    $pdo = db(); $pdo->exec('BEGIN IMMEDIATE');
    if (!setting('news_seed_sbornik')) {
        set_setting('news_seed_sbornik', '1');
        $pdo->prepare('INSERT INTO news(emoji, title, body, link, link_text, starts, ends, active, popup, created_at) VALUES(?, ?, ?, ?, ?, ?, NULL, 1, 1, ?)')->execute(['📕', 'Сборникът за НВО е безплатен',
            "Целият сборник за подготовка за НВО по математика в 4. клас се сваля свободно – 92 страници А4, 32 теста и 564 задачи.\n\nВътре има 20 тренировъчни теста по темите от програмата (всяка тема с два равностойни варианта – А и Б), 12 примерни изпитни теста по действащия модел на МОН и ключ с отговорите на всички задачи, решения, критерии за оценяване и скала точки → оценка.\n\nПечата се у дома, в училище или в копирен център, в колкото копия ви трябват. Без регистрация.",
            'nvo-sbornik.html', '📕 Към сборника', $t, now()]);
    }
    $pdo->exec('COMMIT');
}
// коледният календар – излиза сам на 1 декември и слиза след Коледа
if (!setting('news_seed_advent')) {
    $pdo = db(); $pdo->exec('BEGIN IMMEDIATE');
    if (!setting('news_seed_advent')) {
        set_setting('news_seed_advent', '1');
        $y = (int)date('n') === 12 ? (int)date('Y') : (int)date('Y') + ((int)date('n') > 12 ? 1 : 0);
        $pdo->prepare('INSERT INTO news(emoji, title, body, link, link_text, starts, ends, active, popup, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, 1, 1, ?)')->execute(['🎄', 'Коледният календар е отворен',
            "От 1 до 24 декември всеки ден се отваря по една врата с нова задача.\n\nЗадачата за деня е една и съща за всички в класа, става по-трудна към Коледа и остава със звезда, щом я решиш. Вратите на следващите дни се отварят на своя ден – без надничане.\n\nЗа вкъщи и за класната стая има и лист с 24-те задачи за печат, с отговорите най-отзад.",
            'koleden-kalendar.html', '🎄 Към календара', $y . '-12-01', $y . '-12-26', now()]);
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
// седмичният имейл до родителите – в понеделник, на порции, след като отговорът вече е изпратен (няма отделен cron)
if (setting('weekly_on', '1') === '1' && (int)date('N') === 1 && (int)date('G') >= 8 && setting('weekly_done') !== date('o-\\WW')) {
    if (function_exists('fastcgi_finish_request')) fastcgi_finish_request(); elseif (function_exists('litespeed_finish_request')) litespeed_finish_request();
    ignore_user_abort(true); @set_time_limit(60);
    require_once __DIR__ . '/weekly.php';
    try { if (weekly_due()) weekly_run(function_exists('fastcgi_finish_request') || function_exists('litespeed_finish_request') ? 25 : 5); } catch (Throwable $e) { set_setting('weekly_lock', '0'); }
}
