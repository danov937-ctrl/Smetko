<?php
/* Сметко – админ панел: кодове за достъп.
   При първо отваряне се създава парола. Адрес: https://smetko.com/admin/ */
declare(strict_types=1);
require __DIR__ . '/../api/lib.php';

session_name('smetko_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/admin/', 'secure' => !empty($_SERVER['HTTPS']), 'httponly' => true, 'samesite' => 'Strict']);
session_start();
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');

function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function csrf(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16)); return $_SESSION['csrf']; }
function csrf_ok(): bool { return isset($_POST['csrf']) && hash_equals($_SESSION['csrf'] ?? '', (string)$_POST['csrf']); }
function go(string $q = ''): void { header('Location: ./' . $q); exit; }
// Ключ за първоначална настройка (пази се само хешът; самият ключ е даден на собственика)
const SETUP_KEY_HASH = 'a05b48a0679ebe9e9bf783406cd9e83ac058473dfb79059735d2a5e3fd47c268';
function school_year_end(): string { $y = (int)date('Y'); if ((int)date('n') >= 7) $y++; return $y . '-06-30'; }

$hash = setting('admin_hash');
$action = $_POST['action'] ?? $_GET['action'] ?? '';
$msg = $_SESSION['msg'] ?? ''; unset($_SESSION['msg']);

// ---------- първоначална парола ----------
if (!$hash) {
    if ($action === 'setup' && csrf_ok()) {
        $p = (string)($_POST['password'] ?? '');
        if (too_many('admin_setup', 8, 900)) { $msg = 'Твърде много опити. Изчакайте 15 минути.'; }
        elseif (!hash_equals(SETUP_KEY_HASH, hash('sha256', strtoupper(trim((string)($_POST['key'] ?? '')))))) { note_attempt('admin_setup'); $msg = 'Грешен ключ за настройка.'; }
        elseif (mb_strlen($p) < 10 || $p !== ($_POST['password2'] ?? '')) { $msg = 'Паролата трябва да е поне 10 знака и двете полета да съвпадат.'; }
        else { set_setting('admin_hash', password_hash($p, PASSWORD_DEFAULT)); session_regenerate_id(true); $_SESSION['admin'] = 1; $_SESSION['msg'] = 'Паролата е създадена. Добре дошли!'; go(); }
    }
    page('Създай парола', '<form method="post" class="box narrow"><h2>Първо влизане</h2><p>Въведете ключа за настройка (получихте го от Claude) и създайте парола за админ панела.</p>' .
        ($msg ? '<p class="err">' . h($msg) . '</p>' : '') .
        '<input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="action" value="setup">' .
        '<label>Ключ за настройка<input name="key" required autocomplete="off" placeholder="XXXXX-XXXXX-XXXXX-XXXXX"></label>' .
        '<label>Нова парола (мин. 10 знака)<input type="password" name="password" required minlength="10" autocomplete="new-password"></label>' .
        '<label>Повтори паролата<input type="password" name="password2" required minlength="10" autocomplete="new-password"></label><button>Създай</button></form>');
}

// ---------- вход ----------
if ($action === 'logout') { $_SESSION = []; session_destroy(); go(); }
if (empty($_SESSION['admin'])) {
    if ($action === 'login' && csrf_ok()) {
        if (too_many('admin_login', 8, 900)) { $msg = 'Твърде много опити. Изчакайте 15 минути.'; }
        elseif (password_verify((string)($_POST['password'] ?? ''), $hash)) { session_regenerate_id(true); $_SESSION['admin'] = 1; go(); }
        else { note_attempt('admin_login'); $msg = 'Грешна парола.'; }
    }
    page('Вход', '<form method="post" class="box narrow"><h2>Админ панел</h2>' . ($msg ? '<p class="err">' . h($msg) . '</p>' : '') .
        '<input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="action" value="login">' .
        '<label>Парола<input type="password" name="password" required autofocus autocomplete="current-password"></label><button>Вход</button></form>');
}

$pdo = db();

// ---------- действия ----------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !csrf_ok()) { $_SESSION['msg'] = 'Сесията изтече. Опитайте отново.'; go(); }
if ($action === 'create') {
    $type = array_key_exists($_POST['type'] ?? '', TYPE_NAMES) ? $_POST['type'] : 'class';
    $count = max(1, min(500, (int)($_POST['count'] ?? 1)));
    $uses = max(1, min(1000, (int)($_POST['max_uses'] ?? 35)));
    $exp = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_POST['expires'] ?? '')) ? $_POST['expires'] : school_year_end();
    $label = mb_substr(trim((string)($_POST['label'] ?? '')), 0, 120);
    $pdo->beginTransaction();
    $pdo->prepare('INSERT INTO batches(label, type, max_uses, expires_at, created_at) VALUES(?, ?, ?, ?, ?)')->execute([$label, $type, $uses, $exp, now()]);
    $bid = (int)$pdo->lastInsertId();
    $ins = $pdo->prepare('INSERT OR IGNORE INTO codes(code, batch_id, type, max_uses, expires_at, pin, label, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)');
    $made = 0;
    while ($made < $count) { $ins->execute([random_code(), $bid, $type, $uses, $exp, $type === 'class' ? random_pin() : null, $label, now()]); $made += $ins->rowCount(); }
    $pdo->commit();
    $_SESSION['msg'] = "Създадени са $count кода."; go('?batch=' . $bid);
}
if ($action === 'revoke' || $action === 'restore') {
    $pdo->prepare('UPDATE codes SET revoked = ? WHERE code = ?')->execute([$action === 'revoke' ? 1 : 0, (string)($_POST['code'] ?? '')]);
    $_SESSION['msg'] = $action === 'revoke' ? 'Кодът е спрян.' : 'Кодът е възстановен.'; go('?batch=' . (int)($_POST['batch'] ?? 0));
}
if ($action === 'extend') {
    $exp = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_POST['expires'] ?? '')) ? $_POST['expires'] : null;
    if ($exp) { $pdo->prepare('UPDATE codes SET expires_at = ? WHERE batch_id = ?')->execute([$exp, (int)$_POST['batch']]); $pdo->prepare('UPDATE batches SET expires_at = ? WHERE id = ?')->execute([$exp, (int)$_POST['batch']]); $_SESSION['msg'] = 'Валидността е обновена.'; }
    go('?batch=' . (int)$_POST['batch']);
}
if ($action === 'csv') {
    $bid = (int)($_GET['batch'] ?? 0);
    $st = $pdo->prepare('SELECT c.code, c.pin, c.type, c.max_uses, c.expires_at, c.label, c.revoked, (SELECT COUNT(*) FROM redemptions r WHERE r.code = c.code) AS uses FROM codes c WHERE c.batch_id = ? ORDER BY c.created_at');
    $st->execute([$bid]);
    header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="smetko-kodove-' . $bid . '.csv"');
    $o = fopen('php://output', 'w'); fwrite($o, "\xEF\xBB\xBF"); fputcsv($o, ['Код', 'ПИН', 'Вид', 'Устройства (макс.)', 'Използвани', 'Валиден до', 'Бележка', 'Спрян']);
    foreach ($st as $r) fputcsv($o, [$r['code'], $r['pin'], TYPE_NAMES[$r['type']] ?? $r['type'], $r['max_uses'], $r['uses'], $r['expires_at'], $r['label'], $r['revoked'] ? 'да' : '']);
    exit;
}
if ($action === 'password') {
    $p = (string)($_POST['password'] ?? '');
    if (mb_strlen($p) >= 10 && $p === ($_POST['password2'] ?? '')) { set_setting('admin_hash', password_hash($p, PASSWORD_DEFAULT)); $_SESSION['msg'] = 'Паролата е сменена.'; }
    else $_SESSION['msg'] = 'Паролата трябва да е поне 10 знака и да съвпада.';
    go();
}

// ---------- изглед ----------
$stats = $pdo->query('SELECT (SELECT COUNT(*) FROM codes) AS codes, (SELECT COUNT(*) FROM redemptions) AS devices, (SELECT COUNT(*) FROM codes WHERE expires_at >= date("now") AND revoked = 0) AS active')->fetch();
$html = '<div class="top"><h1>Сметко · Кодове за достъп</h1><a class="btn ghost" href="?action=logout">Изход</a></div>';
if ($msg) $html .= '<p class="ok">' . h($msg) . '</p>';
$html .= '<div class="stats"><div><b>' . (int)$stats['codes'] . '</b>кода</div><div><b>' . (int)$stats['active'] . '</b>активни</div><div><b>' . (int)$stats['devices'] . '</b>устройства</div></div>';

$bid = (int)($_GET['batch'] ?? 0);
if ($bid) {
    $b = $pdo->prepare('SELECT * FROM batches WHERE id = ?'); $b->execute([$bid]); $b = $b->fetch();
    if ($b) {
        $st = $pdo->prepare('SELECT c.*, (SELECT COUNT(*) FROM redemptions r WHERE r.code = c.code) AS uses, (SELECT MAX(last_seen) FROM redemptions r WHERE r.code = c.code) AS last FROM codes c WHERE c.batch_id = ? ORDER BY c.created_at, c.code');
        $st->execute([$bid]);
        $rows = '';
        foreach ($st as $r) {
            $state = $r['revoked'] ? '<span class="tag red">спрян</span>' : ($r['expires_at'] < today() ? '<span class="tag">изтекъл</span>' : '<span class="tag green">активен</span>');
            $btn = '<form method="post" class="inline"><input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="batch" value="' . $bid . '"><input type="hidden" name="code" value="' . h($r['code']) . '">' .
                ($r['revoked'] ? '<button name="action" value="restore" class="sm ghost">Възстанови</button>' : '<button name="action" value="revoke" class="sm ghost" onclick="return confirm(\'Да спрем ли кода?\')">Спри</button>') . '</form>';
            $rows .= '<tr><td class="mono">' . h($r['code']) . '</td><td class="mono">' . h($r['pin'] ?? '–') . '</td><td>' . (int)$r['uses'] . ' / ' . (int)$r['max_uses'] . '</td><td>' . h($r['last'] ? substr($r['last'], 0, 10) : '–') . '</td><td>' . $state . '</td><td>' . $btn . '</td></tr>';
        }
        $html .= '<div class="box"><p><a href="./">← Всички партиди</a></p><h2>' . h($b['label'] ?: 'Партида #' . $bid) . '</h2><p>' . h(TYPE_NAMES[$b['type']] ?? $b['type']) . ' · до ' . (int)$b['max_uses'] . ' устройства на код · валидни до <b>' . h(date('d.m.Y', strtotime($b['expires_at']))) . '</b></p>' .
            '<p class="actions"><a class="btn" target="_blank" href="cards.php?batch=' . $bid . '">🖨️ Картички за печат</a> <a class="btn ghost" href="?action=csv&amp;batch=' . $bid . '">⬇️ CSV (Excel)</a></p>' .
            '<form method="post" class="inline"><input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="action" value="extend"><input type="hidden" name="batch" value="' . $bid . '">Нова валидност: <input type="date" name="expires" value="' . h($b['expires_at']) . '"> <button class="sm">Запази</button></form>' .
            '<div class="tw"><table><thead><tr><th>Код</th><th>ПИН учител</th><th>Устройства</th><th>Последно</th><th>Статус</th><th></th></tr></thead><tbody>' . $rows . '</tbody></table></div></div>';
    }
} else {
    $html .= '<form method="post" class="box"><h2>Нови кодове</h2><input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="action" value="create"><div class="grid">' .
        '<label>Вид<select name="type" id="t"><option value="class">Клас – за учениците (+ ПИН за учителя)</option><option value="teacher">Учител – личен достъп</option><option value="single">Индивидуален – за едно дете</option><option value="family">Семеен – до 4 деца</option></select></label>' .
        '<label>Брой кодове<input type="number" name="count" value="10" min="1" max="500"></label>' .
        '<label>Устройства на код<input type="number" name="max_uses" id="u" value="35" min="1" max="1000"></label>' .
        '<label>Валидни до<input type="date" name="expires" value="' . school_year_end() . '"></label>' .
        '<label class="wide">Бележка (напр. „ОУ „Иван Вазов“ – колеги 2026/27“)<input name="label" maxlength="120"></label></div><button>Създай кодове</button></form>' .
        '<script>document.getElementById("t").addEventListener("change",function(e){document.getElementById("u").value={class:35,teacher:3,single:2,family:6}[e.target.value];});</script>';
    $rows = '';
    foreach ($pdo->query('SELECT b.*, (SELECT COUNT(*) FROM codes c WHERE c.batch_id = b.id) AS n, (SELECT COUNT(*) FROM redemptions r JOIN codes c ON c.code = r.code WHERE c.batch_id = b.id) AS dev FROM batches b ORDER BY b.id DESC') as $b) {
        $rows .= '<tr><td><a href="?batch=' . (int)$b['id'] . '">' . h($b['label'] ?: 'Партида #' . $b['id']) . '</a></td><td>' . h(TYPE_NAMES[$b['type']] ?? $b['type']) . '</td><td>' . (int)$b['n'] . '</td><td>' . (int)$b['dev'] . '</td><td>' . h(date('d.m.Y', strtotime($b['expires_at']))) . '</td><td><a href="cards.php?batch=' . (int)$b['id'] . '" target="_blank">картички</a></td></tr>';
    }
    $html .= '<div class="box"><h2>Партиди</h2>' . ($rows ? '<div class="tw"><table><thead><tr><th>Бележка</th><th>Вид</th><th>Кодове</th><th>Устройства</th><th>Валидни до</th><th></th></tr></thead><tbody>' . $rows . '</tbody></table></div>' : '<p>Още няма кодове. Създайте първите горе.</p>') . '</div>';
    $html .= '<details class="box"><summary>Смяна на паролата</summary><form method="post"><input type="hidden" name="csrf" value="' . csrf() . '"><input type="hidden" name="action" value="password"><label>Нова парола<input type="password" name="password" minlength="10" autocomplete="new-password"></label><label>Повтори<input type="password" name="password2" minlength="10" autocomplete="new-password"></label><button>Смени</button></form></details>';
}
page('Кодове', $html);

function page(string $title, string $body): void {
    echo '<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>' . h($title) . ' – Сметко админ</title><style>
    *{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#F3F8FF;color:#1E3A8A}
    main{max-width:1000px;margin:0 auto;padding:20px 16px 60px}h1{font-size:1.5rem;margin:0}h2{margin:0 0 12px}
    .top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px}
    .box{background:#fff;border-radius:18px;padding:20px;margin:16px 0;box-shadow:0 6px 20px rgba(30,58,138,.07)}.narrow{max-width:420px;margin:60px auto}
    label{display:grid;gap:4px;font-weight:700;font-size:.9rem;margin:8px 0}input,select{font:inherit;padding:10px 12px;border:2px solid #E4EDF8;border-radius:10px;width:100%}
    .grid{display:grid;gap:10px}@media(min-width:720px){.grid{grid-template-columns:repeat(4,1fr)}.wide{grid-column:1/-1}}
    button,.btn{display:inline-block;background:#FF7B00;color:#fff;border:0;border-radius:999px;padding:10px 20px;font:inherit;font-weight:800;cursor:pointer;text-decoration:none;margin-top:8px}
    .ghost{background:#fff;color:#1E3A8A;box-shadow:inset 0 0 0 2px #E4EDF8}.sm{padding:6px 12px;font-size:.85rem;margin:0}
    .inline{display:inline}.actions .btn{margin-right:6px}.tw{overflow-x:auto;margin-top:12px}table{width:100%;border-collapse:collapse;font-size:.92rem}th,td{padding:8px 10px;border-bottom:1px solid #E4EDF8;text-align:left;white-space:nowrap}
    .mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700;letter-spacing:.04em}.tag{background:#EEF2F8;border-radius:999px;padding:2px 10px;font-size:.8rem;font-weight:800}.green{background:#DDF5D8;color:#22762D}.red{background:#FFE1E1;color:#B4232A}
    .stats{display:flex;gap:12px;flex-wrap:wrap}.stats div{background:#fff;border-radius:16px;padding:12px 18px;font-weight:700;box-shadow:0 6px 20px rgba(30,58,138,.07)}.stats b{display:block;font-size:1.6rem}
    .ok{background:#DDF5D8;color:#22762D;padding:10px 14px;border-radius:12px;font-weight:700}.err{background:#FFE1E1;color:#B4232A;padding:10px 14px;border-radius:12px;font-weight:700}
    summary{cursor:pointer;font-weight:800}</style></head><body><main>' . $body . '</main></body></html>';
    exit;
}
