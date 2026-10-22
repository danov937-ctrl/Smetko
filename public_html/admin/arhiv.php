<?php
/* Архив: резервни копия на базата (изтегляне и възстановяване) и таблици за Excel. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$dir = __DIR__ . '/../api/data/backups';
$action = $_POST['action'] ?? $_GET['action'] ?? '';

function send_file(string $path, string $name): void {
    header('Content-Type: application/vnd.sqlite3'); header('Content-Disposition: attachment; filename="' . $name . '"'); header('Content-Length: ' . filesize($path));
    readfile($path); exit;
}
if ($action === 'download') {
    $tmp = $dir . '/_now.sqlite'; @unlink($tmp);
    try { $pdo->exec("VACUUM INTO '" . str_replace("'", "''", $tmp) . "'"); } catch (Throwable $e) { copy(__DIR__ . '/../api/data/smetko.sqlite', $tmp); }
    audit('Изтеглено резервно копие'); register_shutdown_function(fn() => @unlink($tmp));
    send_file($tmp, 'smetko-' . date('Y-m-d-His') . '.sqlite');
}
if ($action === 'get') {
    $f = basename((string)($_GET['f'] ?? ''));
    if (preg_match('/^smetko-\d{4}-\d{2}-\d{2}(-pre-restore-\d+)?\.sqlite$/', $f) && is_file($dir . '/' . $f)) { audit('Изтеглено копие', $f); send_file($dir . '/' . $f, $f); }
    go('arhiv.php');
}
if ($action === 'restore' && !empty($_FILES['file']['tmp_name'])) {
    $up = $_FILES['file']['tmp_name'];
    $ok = false;
    try {
        $t = new PDO('sqlite:' . $up, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $tables = $t->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
        $ok = in_array('codes', $tables, true) && in_array('redemptions', $tables, true) && in_array('settings', $tables, true);
        $t = null;
    } catch (Throwable $e) { $ok = false; }
    if (!$ok) { flash('Файлът не е резервно копие на Сметко.', 'err'); go('arhiv.php'); }
    $safe = $dir . '/smetko-' . date('Y-m-d') . '-pre-restore-' . time() . '.sqlite';
    $pdo->exec("VACUUM INTO '" . str_replace("'", "''", $safe) . "'");
    $db = __DIR__ . '/../api/data/smetko.sqlite';
    @unlink($db . '-wal'); @unlink($db . '-shm');
    if (!move_uploaded_file($up, $db)) copy($up, $db);
    try { // записът в дневника – вече в новата база
        $n = new PDO('sqlite:' . $db, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $n->prepare('INSERT INTO audit(ts, ip, action, details) VALUES(?, ?, ?, ?)')->execute([now(), client_ip(), 'Възстановено резервно копие', 'предишното: ' . basename($safe)]);
    } catch (Throwable $e) {}
    flash('Базата е възстановена. Предишното състояние е запазено като ' . basename($safe) . '.');
    go('arhiv.php');
}
$csv = [
    'students' => ['Ученици (всички активирани кодове)', "SELECT c.code AS 'Код', COALESCE(r.nickname,'') AS 'Прякор', COALESCE(b.class_name,'') AS 'Клас', COALESCE(s.name,'') AS 'Училище', COALESCE(s.town,'') AS 'Град', b.label AS 'Партида', r.created_at AS 'Активиран', r.last_seen AS 'Последно', MAX(0, r.points - COALESCE(r.join_base,0)) AS 'Точки', r.correct AS 'Верни', r.answered AS 'Отговори', r.stars AS 'Звезди', r.missions AS 'Мисии', r.flags AS 'Сигнали', r.hidden AS 'Скрит' FROM redemptions r JOIN codes c ON c.code = r.code JOIN batches b ON b.id = c.batch_id LEFT JOIN schools s ON s.id = b.school_id ORDER BY r.id"],
    'codes' => ['Всички кодове', "SELECT c.code AS 'Код', c.role AS 'За', c.type AS 'Вид', b.label AS 'Партида', c.expires_at AS 'Валиден до', c.revoked AS 'Спрян', (SELECT MIN(created_at) FROM redemptions r WHERE r.code = c.code) AS 'Активиран' FROM codes c JOIN batches b ON b.id = c.batch_id ORDER BY c.batch_id, c.created_at"],
    'schools' => ['Училища', "SELECT s.id AS '№', s.name AS 'Училище', s.town AS 'Град', (SELECT COUNT(*) FROM batches b WHERE b.school_id = s.id) AS 'Класове', s.created_at AS 'Добавено' FROM schools s ORDER BY s.town, s.name"],
    'orders' => ['Поръчки', "SELECT o.id AS '№', o.created_at AS 'Дата', o.client AS 'Клиент', o.email AS 'Имейл', o.phone AS 'Телефон', o.plan AS 'План', o.qty AS 'Брой', o.amount AS 'Сума', o.status AS 'Статус', o.invoice AS 'Фактура', o.paid_at AS 'Платена' FROM orders o ORDER BY o.id"],
];
if ($action === 'csv' && isset($csv[$_GET['t'] ?? ''])) {
    $st = $pdo->query($csv[$_GET['t']][1]);
    $first = $st->fetch();
    $rows = (function () use ($st, $first) { if ($first) yield array_values($first); foreach ($st as $r) yield array_values($r); })();
    csv_out('smetko-' . $_GET['t'] . '-' . date('Y-m-d') . '.csv', $first ? array_keys($first) : ['(няма данни)'], $rows);
}

$files = glob($dir . '/smetko-*.sqlite') ?: []; rsort($files);
$list = '';
foreach ($files as $f) $list .= '<tr><td>' . h(basename($f)) . '</td><td class="num">' . number_format(filesize($f) / 1024, 0, '.', ' ') . ' KB</td><td><a class="btn sm ghost" href="?action=get&amp;f=' . h(rawurlencode(basename($f))) . '">⬇️ Изтегли</a></td></tr>';
$body = '<div class="card"><h2>💾 Резервно копие сега</h2><p>Цялата база (кодове, училища, ученици, поръчки, настройки) в един файл. Пазете го на компютъра или в облака – веднъж седмично е добра практика.</p><a class="btn" href="?action=download">⬇️ Изтегли резервно копие</a></div>';
$body .= '<div class="card"><h2>🗓 Автоматични копия</h2><p class="hint">Панелът прави по едно копие на ден (при първото влизане за деня) и пази последните 14.</p>' . ($list ? '<table><tbody>' . $list . '</tbody></table>' : '<p class="muted">Още няма.</p>') . '</div>';
$x = ''; foreach ($csv as $k => [$t]) $x .= '<a class="btn ghost" href="?action=csv&amp;t=' . $k . '">⬇️ ' . h($t) . '</a>';
$body .= '<div class="card"><h2>📊 Таблици за Excel (CSV)</h2><div class="row">' . $x . '</div></div>';
$body .= '<form method="post" enctype="multipart/form-data" class="card">' . csrf_field() . '<input type="hidden" name="action" value="restore"><h2>♻️ Възстановяване от копие</h2><p class="hint">Заменя текущата база с избрания файл. Преди това текущото състояние се запазва автоматично в списъка горе.</p><input type="file" name="file" accept=".sqlite" required><p><button class="red" data-confirm="Да заменим ли текущата база с файла? Текущото състояние ще бъде запазено като копие.">Възстанови</button></p></form>';
page('Архив и резервни копия', $body);
