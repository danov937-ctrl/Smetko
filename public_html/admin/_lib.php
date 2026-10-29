<?php
/* Сметко – админ панел: общи функции (вход, защита, меню, оформление, дневник). */
declare(strict_types=1);
require __DIR__ . '/../api/lib.php';

session_name('smetko_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/admin/', 'secure' => !empty($_SERVER['HTTPS']), 'httponly' => true, 'samesite' => 'Strict']);
session_start();
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

// Ключ за първоначална настройка (пази се само хешът; самият ключ е даден на собственика)
const SETUP_KEY_HASH = 'a05b48a0679ebe9e9bf783406cd9e83ac058473dfb79059735d2a5e3fd47c268';

function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function csrf(): string { if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16)); return $_SESSION['csrf']; }
function csrf_field(): string { return '<input type="hidden" name="csrf" value="' . csrf() . '">'; }
function csrf_ok(): bool { return isset($_POST['csrf']) && hash_equals($_SESSION['csrf'] ?? '', (string)$_POST['csrf']); }
function go(string $to): void { header('Location: ' . $to); exit; }
function flash(string $m, string $type = 'ok'): void { $_SESSION['flash'] = [$m, $type]; }
function post(string $k, string $d = ''): string { return trim((string)($_POST[$k] ?? $d)); }
function school_year_end(): string { $y = (int)date('Y'); if ((int)date('n') >= 7) $y++; return $y . '-06-30'; }
function fdate(?string $d): string { return $d ? date('d.m.Y', strtotime($d)) : '–'; }
function money($x): string { return number_format((float)$x, 2, '.', ' ') . ' €'; }
function audit(string $action, string $details = ''): void {
    db()->prepare('INSERT INTO audit(ts, ip, action, details) VALUES(?, ?, ?, ?)')->execute([now(), client_ip(), $action, mb_substr($details, 0, 500)]);
}
function auto_backup(): void { // едно копие на базата на ден, пазят се последните 14
    $dir = __DIR__ . '/../api/data/backups';
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    $f = $dir . '/smetko-' . date('Y-m-d') . '.sqlite';
    if (file_exists($f)) return;
    try { db()->exec("VACUUM INTO '" . str_replace("'", "''", $f) . "'"); } catch (Throwable $e) { @copy(__DIR__ . '/../api/data/smetko.sqlite', $f); }
    $all = glob($dir . '/smetko-*.sqlite') ?: [];
    sort($all);
    while (count($all) > 14) @unlink(array_shift($all));
}

/* ---------- вход ---------- */
function require_admin(): void {
    $hash = setting('admin_hash');
    $action = $_POST['action'] ?? '';
    $msg = '';
    if (!$hash) {
        if ($action === 'setup' && csrf_ok()) {
            $p = (string)($_POST['password'] ?? '');
            if (too_many('admin_setup', 8, 900)) $msg = 'Твърде много опити. Изчакайте 15 минути.';
            elseif (!hash_equals(SETUP_KEY_HASH, hash('sha256', strtoupper(trim((string)($_POST['key'] ?? '')))))) { note_attempt('admin_setup'); $msg = 'Грешен ключ за настройка.'; }
            elseif (mb_strlen($p) < 10 || $p !== ($_POST['password2'] ?? '')) $msg = 'Паролата трябва да е поне 10 знака и двете полета да съвпадат.';
            else { set_setting('admin_hash', password_hash($p, PASSWORD_DEFAULT)); session_regenerate_id(true); $_SESSION['admin'] = 1; $_SESSION['ver'] = setting('session_ver', '1'); audit('Първоначална настройка'); flash('Паролата е създадена. Добре дошли!'); go('./'); }
        }
        bare_page('Създай парола', '<form method="post" class="card narrow"><h2>Първо влизане</h2><p>Въведете ключа за настройка (получихте го от Claude) и създайте парола за админ панела.</p>' .
            ($msg ? '<p class="err">' . h($msg) . '</p>' : '') . csrf_field() . '<input type="hidden" name="action" value="setup">' .
            '<label>Ключ за настройка<input name="key" required autocomplete="off" placeholder="XXXXX-XXXXX-XXXXX-XXXXX"></label>' .
            '<label>Нова парола (мин. 10 знака)<input type="password" name="password" required minlength="10" autocomplete="new-password"></label>' .
            '<label>Повтори паролата<input type="password" name="password2" required minlength="10" autocomplete="new-password"></label><button>Създай</button></form>');
    }
    if (($_GET['action'] ?? '') === 'logout') { $_SESSION = []; session_destroy(); go('./'); }
    $ok = !empty($_SESSION['admin']) && ($_SESSION['ver'] ?? '') === setting('session_ver', '1');
    if (!$ok) {
        if ($action === 'login' && csrf_ok()) {
            if (too_many('admin_login', 8, 900)) $msg = 'Твърде много опити. Изчакайте 15 минути.';
            elseif (password_verify((string)($_POST['password'] ?? ''), $hash)) { session_regenerate_id(true); $_SESSION['admin'] = 1; $_SESSION['ver'] = setting('session_ver', '1'); audit('Вход'); go($_SERVER['REQUEST_URI'] ?? './'); }
            else { note_attempt('admin_login'); audit('Грешна парола'); $msg = 'Грешна парола.'; }
        }
        bare_page('Вход', '<form method="post" class="card narrow"><div class="logo">Сметко <small>админ</small></div>' . ($msg ? '<p class="err">' . h($msg) . '</p>' : '') .
            csrf_field() . '<input type="hidden" name="action" value="login">' .
            '<label>Парола<input type="password" name="password" required autofocus autocomplete="current-password"></label><button>Вход</button></form>');
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !csrf_ok()) { flash('Сесията изтече. Опитайте отново.', 'err'); go($_SERVER['REQUEST_URI'] ?? './'); }
    auto_backup();
}

/* ---------- оформление ---------- */
const NAV = [
    ['index.php', '📊', 'Табло'],
    ['statistika.php', '📈', 'Посещения'],
    ['aktivnost.php', '🧪', 'Активност'],
    ['anketa.php', '📝', 'Анкета'],
    ['signali.php', '🚩', 'Сигнали'],
    ['kodove.php', '🔑', 'Кодове'],
    ['porachki.php', '🧾', 'Поръчки'],
    ['uchilishta.php', '🏫', 'Училища'],
    ['akaunti.php', '👤', 'Акаунти'],
    ['klasacii.php', '🏆', 'Класации'],
    ['predizvikatelstvo.php', '⚡', 'Предизвикателство'],
    ['novini.php', '📰', 'Новини'],
    ['blog.php', '✍️', 'Блог'],
    ['uchebnici.php', '📚', 'Учебници'],
    ['nastroyki.php', '⚙️', 'Настройки'],
    ['arhiv.php', '💾', 'Архив'],
    ['dnevnik.php', '📝', 'Дневник'],
    ['pomosht.php', '❓', 'Помощ'],
];

function css(): string {
    return '*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#F3F7FD;color:#1E3A8A}
    a{color:#1F6FE0}[hidden]{display:none!important}
    .shell{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
    .side{background:#1E3A8A;color:#fff;padding:18px 12px;position:sticky;top:0;height:100vh;overflow:auto}
    .side .logo{font-weight:900;font-size:1.3rem;padding:4px 10px 16px}.side .logo small{font-size:.7rem;opacity:.7;display:block;font-weight:700}
    .side a{display:flex;gap:10px;align-items:center;color:#DCE6FF;text-decoration:none;padding:9px 12px;border-radius:12px;font-weight:700;margin:2px 0}
    .side a:hover{background:rgba(255,255,255,.08)}.side a.on{background:#fff;color:#1E3A8A}
    .side .sep{height:1px;background:rgba(255,255,255,.15);margin:12px 6px}
    main{padding:22px 26px 60px;max-width:1240px;width:100%;min-width:0}
    .top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}h1{font-size:1.45rem;margin:0}h2{font-size:1.15rem;margin:0 0 12px}h3{margin:0 0 8px;font-size:1rem}
    .card{background:#fff;border-radius:16px;padding:18px;margin:0 0 16px;box-shadow:0 4px 16px rgba(30,58,138,.06)}.narrow{max-width:420px;margin:70px auto}
    .logo{font-weight:900;font-size:1.4rem;margin-bottom:10px}
    label{display:grid;gap:4px;font-weight:700;font-size:.86rem;margin:6px 0}input,select,textarea{font:inherit;padding:9px 11px;border:2px solid #E2EAF6;border-radius:10px;width:100%;background:#fff;color:#1E3A8A}
    select{max-width:100%;text-overflow:ellipsis}textarea{min-height:90px}.row label{max-width:100%}input:focus,select:focus,textarea:focus{outline:none;border-color:#3299FF}
    .grid{display:grid;gap:10px}@media(min-width:760px){.g2{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}.wide{grid-column:1/-1}}
    button,.btn{display:inline-flex;align-items:center;gap:6px;background:#FF7B00;color:#fff;border:0;border-radius:999px;padding:9px 18px;font:inherit;font-weight:800;cursor:pointer;text-decoration:none;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
    button:hover,.btn:hover{filter:brightness(1.05)}.ghost{background:#fff;color:#1E3A8A;box-shadow:inset 0 0 0 2px #E2EAF6}.blue{background:#1F6FE0}.red{background:#D93D43}.green{background:#2E9440}
    .sm{padding:5px 11px;font-size:.82rem}.inline{display:inline}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .tw{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:.9rem}th,td{padding:8px 9px;border-bottom:1px solid #EDF2FA;text-align:left;vertical-align:middle}th{font-size:.78rem;text-transform:uppercase;letter-spacing:.03em;color:#5B6B8C;white-space:nowrap}
    tr:hover td{background:#FAFCFF}td.num,th.num{text-align:right;white-space:nowrap}
    .mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700;letter-spacing:.03em;white-space:nowrap}
    .tag{display:inline-block;background:#EEF2F8;border-radius:999px;padding:1px 9px;font-size:.76rem;font-weight:800;white-space:nowrap}.tg{background:#DDF5D8;color:#22762D}.tr{background:#FFE1E1;color:#B4232A}.ty{background:#FFF2CC;color:#8A6400}.tb{background:#E1EEFF;color:#1F5FC0}
    .kpis{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));margin-bottom:16px}
    .kpi{background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 4px 16px rgba(30,58,138,.06)}.kpi b{display:block;font-size:1.7rem;line-height:1.1}.kpi span{font-size:.8rem;font-weight:700;color:#5B6B8C}.kpi small{display:block;font-size:.75rem;color:#2E9440;font-weight:800}
    .ok{background:#DDF5D8;color:#22762D;padding:10px 14px;border-radius:12px;font-weight:700;margin-bottom:14px}.err{background:#FFE1E1;color:#B4232A;padding:10px 14px;border-radius:12px;font-weight:700;margin-bottom:14px}
    .hint{font-size:.85rem;color:#5B6B8C;margin:6px 0}.muted{color:#7A879F}
    .chk{display:flex;align-items:center;gap:8px;font-weight:700}.chk input{width:auto}
    details>summary{cursor:pointer;font-weight:800}details.sub{margin:10px 0;padding:10px 14px;background:#F6FAFF;border-radius:12px}
    .bars{display:flex;align-items:flex-end;gap:3px;height:120px;padding-top:6px}.bars i{flex:1;background:#3299FF;border-radius:4px 4px 0 0;min-height:2px;position:relative}.bars i:hover{background:#FF7B00}
    .bars-x{display:flex;justify-content:space-between;font-size:.72rem;color:#7A879F;margin-top:4px}
    .filters{display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin-bottom:12px}.filters label{margin:0}.filters input,.filters select{width:auto;min-width:150px}
    .pill-nav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
    @media(max-width:860px){.shell{grid-template-columns:1fr}.side{position:sticky;top:0;height:auto;z-index:5;display:flex;gap:4px;overflow-x:auto;padding:8px;align-items:center}.side .logo{padding:0 8px 0 4px;font-size:1rem;white-space:nowrap}.side .logo small{display:none}.side a{padding:7px 10px;white-space:nowrap;font-size:.86rem}.side .sep,.side .lbl{display:none}main{padding:16px 12px 50px}}
    @media print{.side,.noprint{display:none!important}.shell{display:block}main{padding:0}.card{box-shadow:none}}';
}
function bare_page(string $title, string $body): void {
    echo '<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>' . h($title) . ' – Сметко админ</title><style>' . css() . '</style></head><body><main>' . $body . '</main></body></html>';
    exit;
}
function page(string $title, string $body, string $actions = ''): void {
    $cur = basename($_SERVER['SCRIPT_NAME'] ?? 'index.php');
    $nav = '';
    foreach (NAV as $i => [$f, $ico, $name]) {
        if ($f === 'nastroyki.php') $nav .= '<div class="sep"></div>';
        $nav .= '<a href="' . $f . '"' . ($f === $cur ? ' class="on"' : '') . '><span>' . $ico . '</span>' . $name . '</a>';
    }
    $nav .= '<div class="sep"></div><a href="../" target="_blank"><span>🌐</span>Сайтът ↗</a><a href="?action=logout"><span>🚪</span>Изход</a>';
    $f = $_SESSION['flash'] ?? null; unset($_SESSION['flash']);
    echo '<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>' . h($title) . ' – Сметко админ</title><style>' . css() . '</style></head><body><div class="shell">' .
        '<nav class="side"><div class="logo">Сметко<small>админ панел</small></div>' . $nav . '</nav><main><div class="top"><h1>' . h($title) . '</h1><div class="row noprint">' . $actions . '</div></div>' .
        ($f ? '<div class="' . ($f[1] === 'err' ? 'err' : 'ok') . '">' . h($f[0]) . '</div>' : '') . $body . '</main></div>' .
        '<script>document.querySelectorAll("select.sch").forEach(function(s){function f(){s.closest("form").querySelectorAll(".newsch").forEach(function(l){l.hidden=s.value!=="-1";});}s.addEventListener("change",f);f();});' .
        'document.querySelectorAll("[data-confirm]").forEach(function(b){b.addEventListener("click",function(e){if(!confirm(b.getAttribute("data-confirm")))e.preventDefault();});});' .
        'document.querySelectorAll("[data-copy]").forEach(function(b){b.addEventListener("click",function(){var t=document.getElementById(b.getAttribute("data-copy"));navigator.clipboard.writeText(t.value||t.textContent).then(function(){b.textContent="✓ Копирано";});});});</script></body></html>';
    exit;
}

/* ---------- полета за училище ---------- */
function school_from_post(PDO $pdo): ?int {
    $sid = (int)($_POST['school_id'] ?? 0);
    $name = mb_substr(post('school_name'), 0, 120);
    if ($sid === -1 || ($sid === 0 && $name !== '')) {
        if ($name === '') return null;
        $town = mb_substr(post('school_town'), 0, 60);
        $q = $pdo->prepare('SELECT id FROM schools WHERE lower(name) = lower(?) AND lower(town) = lower(?)'); $q->execute([$name, $town]);
        if ($id = $q->fetchColumn()) return (int)$id;
        $pdo->prepare('INSERT INTO schools(name, town, created_at) VALUES(?, ?, ?)')->execute([$name, $town, now()]);
        $newId = (int)$pdo->lastInsertId();
        audit('Ново училище', $name . ', ' . $town);
        return $newId;
    }
    return $sid > 0 ? $sid : null;
}
function school_fields(PDO $pdo, ?int $sel = null, string $none = '– без училище (родители) –'): string {
    $opts = '<option value="0">' . h($none) . '</option>';
    foreach ($pdo->query('SELECT id, name, town FROM schools ORDER BY town, name') as $sc) $opts .= '<option value="' . (int)$sc['id'] . '"' . ((int)$sc['id'] === $sel ? ' selected' : '') . '>' . h($sc['name'] . ($sc['town'] ? ', ' . $sc['town'] : '')) . '</option>';
    $opts .= '<option value="-1">+ ново училище…</option>';
    return '<label>Училище<select name="school_id" class="sch">' . $opts . '</select></label>' .
        '<label class="newsch" hidden>Име на училището<input name="school_name" maxlength="120" placeholder="ОУ „Иван Вазов“"></label>' .
        '<label class="newsch" hidden>Населено място<input name="school_town" maxlength="60" placeholder="Пловдив"></label>';
}
function csv_out(string $name, array $head, iterable $rows): void {
    header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="' . $name . '"');
    $o = fopen('php://output', 'w'); fwrite($o, "\xEF\xBB\xBF"); fputcsv($o, $head);
    foreach ($rows as $r) fputcsv($o, $r);
    exit;
}
/* седмични/годишни точки на ученик (точките след активирането на кода) */
const SCORE_ALL = 'MAX(0, r.points - COALESCE(r.join_base, 0))';
function score_week(): string { return "(CASE WHEN r.week = '" . week_key() . "' THEN MAX(0, r.points - COALESCE(r.week_base, 0)) ELSE 0 END)"; }

/* ---------- поръчки ---------- */
const ORDER_STATUS = ['new' => ['нова', 'ty'], 'codes' => ['кодове създадени', 'tb'], 'sent' => ['изпратена', 'tb'], 'paid' => ['платена', 'tg'], 'done' => ['приключена', 'tg'], 'cancel' => ['отказана', '']];
function order_status_tag(string $s): string { $x = ORDER_STATUS[$s] ?? [$s, '']; return '<span class="tag ' . $x[1] . '">' . h($x[0]) . '</span>'; }
