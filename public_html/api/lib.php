<?php
/* Сметко – обща сървърна логика: база (SQLite), кодове за достъп, токени.
   Базата се създава автоматично в api/data/smetko.sqlite (защитена с .htaccess).
   Тайният ключ се генерира при първо стартиране и се пази в базата – няма тайни в GitHub. */
declare(strict_types=1);

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
    return mb_substr($n, 0, 20);
}

const TYPE_NAMES = ['class' => 'Клас', 'teacher' => 'Учител', 'single' => 'Индивидуален', 'family' => 'Семеен'];
