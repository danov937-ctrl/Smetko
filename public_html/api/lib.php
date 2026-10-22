<?php
/* Сметко – обща сървърна логика: база (SQLite), кодове за достъп, токени.
   Базата се създава автоматично в api/data/smetko.sqlite (защитена с .htaccess).
   Тайният ключ се генерира при първо стартиране и се пази в базата – няма тайни в GitHub. */
declare(strict_types=1);
date_default_timezone_set('Europe/Sofia');

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // без O, 0, I, 1, L
const CODE_PREFIX = 'SMET';

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) { @mkdir($dir, 0750, true); }
    if (!file_exists($dir . '/.htaccess')) { @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n"); }
    $pdo = new PDO('sqlite:' . $dir . '/smetko.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=4000;');
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT);
      CREATE TABLE IF NOT EXISTS batches (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT, type TEXT, max_uses INTEGER, expires_at TEXT, created_at TEXT);
      CREATE TABLE IF NOT EXISTS codes (code TEXT PRIMARY KEY, batch_id INTEGER, type TEXT, max_uses INTEGER, expires_at TEXT, pin TEXT, label TEXT, revoked INTEGER DEFAULT 0, created_at TEXT);
      CREATE TABLE IF NOT EXISTS redemptions (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, device TEXT, created_at TEXT, last_seen TEXT,
        nickname TEXT, grade INTEGER, points INTEGER DEFAULT 0, correct INTEGER DEFAULT 0, answered INTEGER DEFAULT 0, stars INTEGER DEFAULT 0, missions INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0,
        UNIQUE(code, device));
      CREATE TABLE IF NOT EXISTS attempts (ip TEXT, kind TEXT, ts INTEGER);
      CREATE INDEX IF NOT EXISTS idx_red_code ON redemptions(code);
      CREATE INDEX IF NOT EXISTS idx_att ON attempts(ip, kind, ts);");
    // миграции: ПИН на ниво партида (клас), роля на кода (ученик/учител)
    $has = fn(string $t, string $c) => in_array($c, array_column($pdo->query("PRAGMA table_info($t)")->fetchAll(), 'name'), true);
    if (!$has('batches', 'pin')) $pdo->exec('ALTER TABLE batches ADD COLUMN pin TEXT');
    if (!$has('codes', 'role')) $pdo->exec("ALTER TABLE codes ADD COLUMN role TEXT DEFAULT 'student'");
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_codes_batch ON codes(batch_id)');
    // училища и общи класации
    $pdo->exec('CREATE TABLE IF NOT EXISTS schools (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, town TEXT, created_at TEXT)');
    foreach (['school_id INTEGER', 'class_name TEXT', 'grade INTEGER', 'teacher_name TEXT', 'public INTEGER DEFAULT 1'] as $col) {
        if (!$has('batches', strtok($col, ' '))) $pdo->exec('ALTER TABLE batches ADD COLUMN ' . $col);
    }
    foreach (['week TEXT', 'week_base INTEGER DEFAULT 0', 'synced_at INTEGER DEFAULT 0', 'flags INTEGER DEFAULT 0', 'join_base INTEGER DEFAULT 0', 'nick_block INTEGER DEFAULT 0', 'day TEXT', 'day_correct INTEGER DEFAULT 0'] as $col) {
        if (!$has('redemptions', strtok($col, ' '))) $pdo->exec('ALTER TABLE redemptions ADD COLUMN ' . $col);
    }
    $pdo->exec("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, client TEXT, contact TEXT, email TEXT, phone TEXT, school_id INTEGER,
        plan TEXT, qty INTEGER DEFAULT 1, amount REAL DEFAULT 0, status TEXT DEFAULT 'new', invoice TEXT, paid_at TEXT, batch_id INTEGER, notes TEXT);
      CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, ip TEXT, action TEXT, details TEXT);
      CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY AUTOINCREMENT, grade INTEGER, bid TEXT UNIQUE, publisher TEXT, title TEXT, source TEXT, lessons TEXT, active INTEGER DEFAULT 1, created_at TEXT);");
    return $pdo;
}

function setting(string $k, ?string $default = null): ?string {
    $st = db()->prepare('SELECT v FROM settings WHERE k = ?'); $st->execute([$k]);
    $v = $st->fetchColumn();
    return $v === false ? $default : $v;
}
function set_setting(string $k, string $v): void {
    db()->prepare('INSERT INTO settings(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v')->execute([$k, $v]);
}
function secret(): string {
    $s = setting('secret');
    if (!$s) { $s = bin2hex(random_bytes(32)); set_setting('secret', $s); }
    return $s;
}

function now(): string { return gmdate('Y-m-d H:i:s'); }
function today(): string { return date('Y-m-d'); }
function week_key(): string { return date('o-\\WW'); } // седмица от понеделник до неделя, напр. 2026-W43
function client_ip(): string { return substr((string)($_SERVER['REMOTE_ADDR'] ?? '0'), 0, 64); }

/* ---------- кодове ---------- */
function random_code(): string {
    $a = CODE_ALPHABET; $n = strlen($a); $s = '';
    for ($i = 0; $i < 8; $i++) { $s .= $a[random_int(0, $n - 1)]; }
    return CODE_PREFIX . '-' . substr($s, 0, 4) . '-' . substr($s, 4, 4);
}
function normalize_code(string $raw): string {
    $c = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $raw) ?? '');
    $c = strtr($c, ['O' => '0', 'I' => '1', 'L' => '1']); // няма ги в азбуката → невалиден код, но не гърми
    if (str_starts_with($c, CODE_PREFIX)) $c = substr($c, strlen(CODE_PREFIX));
    if (strlen($c) !== 8) return '';
    return CODE_PREFIX . '-' . substr($c, 0, 4) . '-' . substr($c, 4, 4);
}
function random_pin(): string { return (string)random_int(1000, 9999); }

function get_code(string $code): ?array {
    $st = db()->prepare('SELECT * FROM codes WHERE code = ?'); $st->execute([$code]);
    $r = $st->fetch(); return $r ?: null;
}
/* Всеки код е еднократен: активира се на едно устройство. */
const CODE_DEVICES = 1;
function batch_of(string $code): ?array {
    $st = db()->prepare('SELECT b.* FROM batches b JOIN codes c ON c.batch_id = b.id WHERE c.code = ?'); $st->execute([$code]);
    $r = $st->fetch(); return $r ?: null;
}
function code_uses(string $code): int {
    $st = db()->prepare('SELECT COUNT(*) FROM redemptions WHERE code = ?'); $st->execute([$code]);
    return (int)$st->fetchColumn();
}

/* ---------- токен за устройство ---------- */
function b64u(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64u_dec(string $s): string { return (string)base64_decode(strtr($s, '-_', '+/')); }
function make_token(string $code, string $device, string $expires): string {
    $p = b64u(json_encode(['c' => $code, 'd' => $device, 'e' => $expires]));
    return $p . '.' . b64u(hash_hmac('sha256', $p, secret(), true));
}
function read_token(string $t): ?array {
    $parts = explode('.', $t);
    if (count($parts) !== 2) return null;
    $sig = b64u(hash_hmac('sha256', $parts[0], secret(), true));
    if (!hash_equals($sig, $parts[1])) return null;
    $d = json_decode(b64u_dec($parts[0]), true);
    return is_array($d) && isset($d['c'], $d['d'], $d['e']) ? $d : null;
}

/* ---------- защита от налучкване ---------- */
function too_many(string $kind, int $max, int $window): bool {
    $pdo = db(); $t = time();
    $pdo->prepare('DELETE FROM attempts WHERE ts < ?')->execute([$t - 86400]);
    $st = $pdo->prepare('SELECT COUNT(*) FROM attempts WHERE ip = ? AND kind = ? AND ts > ?');
    $st->execute([client_ip(), $kind, $t - $window]);
    return (int)$st->fetchColumn() >= $max;
}
function note_attempt(string $kind): void {
    db()->prepare('INSERT INTO attempts(ip, kind, ts) VALUES(?, ?, ?)')->execute([client_ip(), $kind, time()]);
}

/* ---------- JSON ---------- */
function json_out(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function json_in(): array {
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > 20000) json_out(['ok' => false, 'error' => 'Прекалено голяма заявка.'], 413);
    $d = json_decode($raw, true);
    return is_array($d) ? $d : $_POST;
}
function require_post(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(['ok' => false, 'error' => 'Позволен е само POST.'], 405);
}
function clean_device(string $d): string { return preg_match('/^[a-f0-9-]{16,64}$/i', $d) ? strtolower($d) : ''; }
function clean_nick(string $n): string {
    $n = trim(preg_replace('/\s+/u', ' ', $n) ?? '');
    $n = preg_replace('/[^\p{L}\p{N} .\-]/u', '', $n) ?? '';
    $n = mb_substr($n, 0, 20);
    return ($n !== '' && blocked_nick($n)) ? '' : $n;
}

/* ---------- настройки на сайта (редактират се от админ панела) ---------- */
const DEFAULT_CONFIG = [
    'paywall' => true, 'freeMissions' => 3, 'freePractice' => 20, 'questions' => 10, 'contactEmail' => 'info@smetko.com',
    'prices' => ['month' => '2.99', 'schoolYear' => '15', 'year' => '18', 'family' => '29', 'class' => '75', 'disc3' => '15', 'disc8' => '25'],
    'banner' => ['on' => false, 'text' => '', 'link' => '', 'linkText' => '', 'color' => 'orange'],
    'company' => ['name' => '', 'eik' => '', 'addr' => '', 'vat' => '', 'date' => '', 'phone' => '', 'iban' => '', 'bank' => '', 'mol' => ''],
    'blockedWords' => '',
];
function site_config(): array {
    $c = json_decode((string)setting('site_config', '{}'), true) ?: [];
    $out = DEFAULT_CONFIG;
    foreach ($out as $k => $v) {
        if (!array_key_exists($k, $c)) continue;
        $out[$k] = is_array($v) ? array_merge($v, is_array($c[$k]) ? $c[$k] : []) : $c[$k];
    }
    return $out;
}
function save_site_config(array $c): void { set_setting('site_config', json_encode($c, JSON_UNESCAPED_UNICODE)); }
function blocked_nick(string $n): bool { // забранени думи в прякорите (списък от админ панела)
    $words = array_filter(array_map('trim', preg_split('/[,\n]+/u', (string)(site_config()['blockedWords'] ?? '')) ?: []));
    $low = mb_strtolower($n);
    foreach ($words as $w) if ($w !== '' && mb_strpos($low, mb_strtolower($w)) !== false) return true;
    return false;
}

const TYPE_NAMES = ['class' => 'Клас', 'teacher' => 'Учител', 'single' => 'Индивидуален', 'family' => 'Семеен'];
