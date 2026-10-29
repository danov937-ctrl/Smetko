<?php
/* Сметко – обща сървърна логика: база (SQLite), кодове за достъп, токени.
   Базата се създава автоматично в api/data/smetko.sqlite (защитена с .htaccess).
   Тайният ключ се генерира при първо стартиране и се пази в базата – няма тайни в GitHub. */
declare(strict_types=1);
date_default_timezone_set('Europe/Sofia');

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // без O, 0, I, 1, L
const CODE_PREFIX = 'SMET';
const SITE_URL = 'https://smetko.com';
const SALES_OPEN = false; // продажбите (цени и поръчки) са спрени до края на проучването; при пускане – true и SALES_OPEN в tools/common.py

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) { @mkdir($dir, 0750, true); }
    if (!file_exists($dir . '/.htaccess')) { @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n"); }
    $pdo = new PDO('sqlite:' . $dir . '/smetko.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $pdo->setAttribute(PDO::ATTR_TIMEOUT, 8);
    $pdo->exec('PRAGMA journal_mode=WAL'); $pdo->exec('PRAGMA foreign_keys=ON'); $pdo->exec('PRAGMA busy_timeout=8000');
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
    foreach (['week TEXT', 'week_base INTEGER DEFAULT 0', 'synced_at INTEGER DEFAULT 0', 'flags INTEGER DEFAULT 0', 'join_base INTEGER DEFAULT 0', 'nick_block INTEGER DEFAULT 0', 'day TEXT', 'day_correct INTEGER DEFAULT 0', 'stats TEXT'] as $col) {
        if (!$has('redemptions', strtok($col, ' '))) $pdo->exec('ALTER TABLE redemptions ADD COLUMN ' . $col);
    }
    // абонаментите се активират от акаунт; ученикът от клас влиза с потребител и парола (ред в redemptions)
    foreach (['account_id INTEGER', 'activated_at TEXT', 'order_id INTEGER'] as $col) if (!$has('codes', strtok($col, ' '))) $pdo->exec('ALTER TABLE codes ADD COLUMN ' . $col);
    foreach (['account_id INTEGER', 'book TEXT', 'message TEXT', 'message_at TEXT'] as $col) if (!$has('batches', strtok($col, ' '))) $pdo->exec('ALTER TABLE batches ADD COLUMN ' . $col);
    foreach (['username TEXT', 'pass_hash TEXT', 'pass_enc TEXT', 'avatar TEXT', 'state TEXT', 'rev INTEGER DEFAULT 0', 'adapt TEXT'] as $col) if (!$has('redemptions', strtok($col, ' '))) $pdo->exec('ALTER TABLE redemptions ADD COLUMN ' . $col);
    $pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_red_user ON redemptions(username); CREATE INDEX IF NOT EXISTS idx_codes_acc ON codes(account_id); CREATE INDEX IF NOT EXISTS idx_batch_acc ON batches(account_id)');
    $pdo->exec("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, client TEXT, contact TEXT, email TEXT, phone TEXT, school_id INTEGER,
        plan TEXT, qty INTEGER DEFAULT 1, amount REAL DEFAULT 0, status TEXT DEFAULT 'new', invoice TEXT, paid_at TEXT, batch_id INTEGER, notes TEXT);
      CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, ip TEXT, action TEXT, details TEXT);
      CREATE TABLE IF NOT EXISTS stats_pages (day TEXT, path TEXT, views INTEGER DEFAULT 0, visits INTEGER DEFAULT 0, PRIMARY KEY(day, path));
      CREATE TABLE IF NOT EXISTS stats_refs (day TEXT, host TEXT, n INTEGER DEFAULT 0, PRIMARY KEY(day, host));
      CREATE TABLE IF NOT EXISTS stats_dev (day TEXT, kind TEXT, n INTEGER DEFAULT 0, PRIMARY KEY(day, kind));
      CREATE TABLE IF NOT EXISTS homework (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id INTEGER, grade INTEGER, topic TEXT, title TEXT, count INTEGER, level INTEGER DEFAULT 2, due TEXT, created_at TEXT);
      CREATE INDEX IF NOT EXISTS idx_hw_batch ON homework(batch_id, due);
      CREATE TABLE IF NOT EXISTS homework_done (hw_id INTEGER, rid INTEGER, correct INTEGER, answered INTEGER, tries INTEGER DEFAULT 1, done_at TEXT, PRIMARY KEY(hw_id, rid));
      CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, pass TEXT, name TEXT, role TEXT DEFAULT 'parent', created_at TEXT, last_login TEXT, reset_hash TEXT, reset_until INTEGER DEFAULT 0, disabled INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS auth_sessions (hash TEXT PRIMARY KEY, account_id INTEGER, created_at TEXT, last_seen TEXT, expires INTEGER, ua TEXT);
      CREATE TABLE IF NOT EXISTS profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER, name TEXT, grade INTEGER, avatar TEXT, device TEXT UNIQUE, code TEXT, state TEXT, rev INTEGER DEFAULT 0, updated_at TEXT, created_at TEXT);
      CREATE INDEX IF NOT EXISTS idx_prof_acc ON profiles(account_id);
      CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY AUTOINCREMENT, emoji TEXT, title TEXT, body TEXT, link TEXT, link_text TEXT, starts TEXT, ends TEXT, active INTEGER DEFAULT 1, popup INTEGER DEFAULT 1, created_at TEXT);
      CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, title TEXT, excerpt TEXT, body TEXT, emoji TEXT, image TEXT, category TEXT, published INTEGER DEFAULT 0, published_at TEXT, created_at TEXT, updated_at TEXT, views INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS challenges (week TEXT, grade INTEGER, title TEXT, skills TEXT, PRIMARY KEY(week, grade));
      CREATE TABLE IF NOT EXISTS challenge_scores (rid INTEGER, week TEXT, grade INTEGER, best INTEGER, at TEXT, PRIMARY KEY(rid, week, grade));
      CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY AUTOINCREMENT, grade INTEGER, bid TEXT UNIQUE, publisher TEXT, title TEXT, source TEXT, lessons TEXT, active INTEGER DEFAULT 1, created_at TEXT);");
    // вход с Google (след създаването на таблицата accounts – важи и за нова база)
    // сигнали „Нещо не е наред?“ и грешки в браузъра (api/feedback.php, админ → Сигнали)
    $pdo->exec('CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, last_at TEXT, kind TEXT, reason TEXT, text TEXT, data TEXT, page TEXT, ua TEXT, ver TEXT, sig TEXT UNIQUE, n INTEGER DEFAULT 1, status TEXT DEFAULT \'new\'); CREATE INDEX IF NOT EXISTS idx_rep_kind ON reports(kind, status)');
    // родител ↔ ученик от клас (родителят вижда отчета, домашните и съобщенията от учителя)
    $pdo->exec('CREATE TABLE IF NOT EXISTS parent_links (account_id INTEGER, rid INTEGER, created_at TEXT, PRIMARY KEY(account_id, rid)); CREATE INDEX IF NOT EXISTS idx_pl_rid ON parent_links(rid)');
    // плащания през Paddle: всяко събитие се обработва веднъж (webhook може да дойде няколко пъти)
    $pdo->exec('CREATE TABLE IF NOT EXISTS paddle_events (id TEXT PRIMARY KEY, kind TEXT, txn TEXT, at TEXT, status TEXT, note TEXT)');
    // анкета за затворения тест (api/survey.php, админ → Анкета)
    $pdo->exec('CREATE TABLE IF NOT EXISTS survey (id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT UNIQUE, created_at TEXT, updated_at TEXT, role INTEGER, grp TEXT, nps INTEGER, email TEXT, account_id INTEGER, access INTEGER DEFAULT 0, answers TEXT)');
    // седмичен имейл до родителя (api/weekly.php): включен по подразбиране, отписване с един клик
    foreach (['weekly INTEGER DEFAULT 1', 'weekly_sent TEXT'] as $col) if (!$has('accounts', strtok($col, ' '))) $pdo->exec('ALTER TABLE accounts ADD COLUMN ' . $col);
    if (!$has('accounts', 'google_sub')) { $pdo->exec('ALTER TABLE accounts ADD COLUMN google_sub TEXT'); $pdo->exec('CREATE INDEX IF NOT EXISTS idx_acc_gsub ON accounts(google_sub)'); }
    return $pdo;
}

/* ---------- седмично предизвикателство ---------- */
const CHALLENGE_GOAL = 10; // верни отговора за 60 секунди = изпълнено предизвикателство
const CHALLENGE_POOL = [
    1 => [['Събиране до 10', [['addTo:10', 1]]], ['Изваждане до 10', [['subTo:10', 1]]], ['Числата до 20', [['place20', 1], ['cmp20', 1], ['nextPrev20', 1]]], ['Събиране с преминаване', [['add20x', 1]]],
          ['Изваждане с преминаване', [['sub20x', 1]]], ['До 20 без преминаване', [['add20no', 1], ['sub20no', 1]]], ['Пари и часовник', [['coins10', 1], ['clockHour', 1]]], ['Кръгли десетици', [['tens100', 1]]]],
    2 => [['Таблицата за 2 и 3', [['mulDivBy:2,3', 1]]], ['Таблицата за 4 и 5', [['mulDivBy:4,5', 1]]], ['Таблицата за 6', [['mulDivBy:6', 1]]], ['Таблицата за 7', [['mulDivBy:7', 1]]],
          ['Таблицата за 8 и 9', [['mulDivBy:8,9', 1]]], ['Цялата таблица', [['mulTable', 1], ['divTable', 1]]], ['До 100 с преминаване', [['add100x', 1], ['sub100x', 1]]], ['До 100 без преминаване', [['add100no', 1], ['sub100no', 1]]], ['Неизвестно число', [['unkAddend', 1], ['unkFactor', 1]]]],
    3 => [['Събиране до 1000', [['add1000x', 1]]], ['Изваждане до 1000', [['sub1000x', 1]]], ['Умножение с едноцифрено', [['mul1d', 1]]], ['Деление с едноцифрено', [['div1d', 1]]],
          ['Таблицата наизуст', [['mulTable', 1], ['divTable', 1]]], ['Мерни единици', [['units3a', 1], ['units3b', 1]]], ['Числата до 1000', [['place1000', 1], ['cmp1000', 1]]], ['Неизвестно число', [['unkMinuend', 1], ['unkDividend', 1]]]],
    4 => [['Многоцифрени числа', [['placeBig', 1], ['cmpBig', 1]]], ['Събиране и изваждане', [['addBigX', 1], ['subBigX', 1]]], ['Умножение с едноцифрено', [['mulBig1d', 1]]], ['Деление с едноцифрено', [['divBig1d', 1]]],
          ['Умножение с двуцифрено', [['mul2d', 1]]], ['Лице на правоъгълник', [['area', 1], ['areaUnits', 1]]], ['Римски цифри', [['romanRead', 1], ['romanWrite', 1]]], ['С 10, 100, 1000', [['mulRound10', 1], ['divRound10', 1]]]],
];
function week_of(string $date): string { return date('o-\\WW', strtotime($date)); }
function challenge_for(string $week, int $grade): array { // ръчно зададено от админ панела или автоматично по ред
    $st = db()->prepare('SELECT title, skills FROM challenges WHERE week = ? AND grade = ?'); $st->execute([$week, $grade]);
    if ($r = $st->fetch()) return ['title' => $r['title'], 'skills' => json_decode((string)$r['skills'], true) ?: [], 'custom' => true];
    $pool = CHALLENGE_POOL[$grade] ?? CHALLENGE_POOL[1];
    $n = (int)substr($week, -2) + (int)substr($week, 0, 4) * 53;
    [$t, $s] = $pool[$n % count($pool)];
    return ['title' => $t, 'skills' => $s, 'custom' => false];
}

/* ---------- достъп до класациите: само с платен абонамент ----------
   Активен код (token) от който и да е план или учител с код + ПИН на класа. Връща ['t' => token|null, 'code' => ред на кода] или null. */
/* достъп до класациите: ученик/профил с активен абонамент (token) или влязъл акаунт с активен абонамент */
function league_access(array $in): ?array {
    if (!empty($in['token'])) {
        $t = read_token((string)$in['token']);
        $c = $t ? get_code($t['c']) : null;
        if ($c && code_valid($c)) return ['t' => $t, 'code' => $c, 'account' => null];
    }
    $a = auth_account();
    if ($a && ($subs = account_subs((int)$a['id']))) return ['t' => null, 'code' => $subs[0], 'account' => $a];
    return null;
}

/* ---------- акаунти (родител / учител) ----------
   Вход с бисквитка smetko_auth (180 дни); в базата се пази само хешът ѝ. */
const AUTH_COOKIE = 'smetko_auth';
const AUTH_DAYS = 180;
function auth_set_cookie(string $v, int $exp): void {
    setcookie(AUTH_COOKIE, $v, ['expires' => $exp, 'path' => '/', 'secure' => !empty($_SERVER['HTTPS']), 'httponly' => true, 'samesite' => 'Lax']);
}
function auth_login(int $aid): void {
    $tok = bin2hex(random_bytes(32)); $exp = time() + AUTH_DAYS * 86400;
    db()->prepare('INSERT INTO auth_sessions(hash, account_id, created_at, last_seen, expires, ua) VALUES(?, ?, ?, ?, ?, ?)')
        ->execute([hash('sha256', $tok), $aid, now(), now(), $exp, mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 160)]);
    db()->prepare('UPDATE accounts SET last_login = ? WHERE id = ?')->execute([now(), $aid]);
    auth_set_cookie($tok, $exp);
    $_COOKIE[AUTH_COOKIE] = $tok; // важи веднага в същата заявка
}
function auth_account(bool $reload = false): ?array {
    static $cache = [];
    $tok = (string)($_COOKIE[AUTH_COOKIE] ?? '');
    if (!$reload && array_key_exists($tok, $cache)) return $cache[$tok];
    $acc = &$cache[$tok]; $acc = null;
    if (!preg_match('/^[a-f0-9]{64}$/', $tok)) return null;
    $st = db()->prepare('SELECT a.*, s.last_seen AS s_seen FROM auth_sessions s JOIN accounts a ON a.id = s.account_id WHERE s.hash = ? AND s.expires > ? AND a.disabled = 0');
    $st->execute([hash('sha256', $tok), time()]);
    $acc = $st->fetch() ?: null; $st->closeCursor(); // без отворен курсор преди запис (иначе SQLite връща „database is locked“)
    if ($acc && (string)$acc['s_seen'] < gmdate('Y-m-d H:i:s', time() - 300)) db()->prepare('UPDATE auth_sessions SET last_seen = ? WHERE hash = ?')->execute([now(), hash('sha256', $tok)]);
    return $acc;
}
function auth_logout(): void {
    $tok = (string)($_COOKIE[AUTH_COOKIE] ?? '');
    if ($tok !== '') db()->prepare('DELETE FROM auth_sessions WHERE hash = ?')->execute([hash('sha256', $tok)]);
    auth_set_cookie('', time() - 3600);
}
/* ---------- вход с Google: проверка на ID token (RS256) с публичните сертификати на Google ---------- */
function http_get(string $url, int $timeout = 6): ?array { // [тяло, заглавия]
    if (function_exists('curl_init')) {
        $h = []; $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_FOLLOWLOCATION => true, CURLOPT_HEADERFUNCTION => function ($c, $line) use (&$h) { $h[] = trim($line); return strlen($line); }]);
        $b = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        return ($b !== false && $code === 200) ? [$b, $h] : null;
    }
    $b = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => $timeout]]));
    return $b === false ? null : [$b, $http_response_header ?? []];
}
function google_certs(bool $force = false): array {
    $c = json_decode((string)setting('g_certs', '{}'), true) ?: [];
    if (!$force && !empty($c['certs']) && ($c['until'] ?? 0) > time()) return $c['certs'];
    $r = http_get('https://www.googleapis.com/oauth2/v1/certs');
    if (!$r) return $c['certs'] ?? [];
    $certs = json_decode($r[0], true) ?: [];
    $age = 3600; foreach ($r[1] as $line) if (preg_match('/max-age=(\d+)/i', $line, $m)) $age = (int)$m[1];
    set_setting('g_certs', json_encode(['certs' => $certs, 'until' => time() + min($age, 86400)]));
    return $certs;
}
function google_verify(string $jwt, string $clientId): ?array {
    $p = explode('.', $jwt);
    if (count($p) !== 3 || $clientId === '') return null;
    $head = json_decode(b64u_dec($p[0]), true); $body = json_decode(b64u_dec($p[1]), true); $sig = b64u_dec($p[2]);
    if (!is_array($head) || !is_array($body) || ($head['alg'] ?? '') !== 'RS256') return null;
    $certs = google_certs(); $kid = (string)($head['kid'] ?? '');
    if (!isset($certs[$kid])) { $certs = google_certs(true); if (!isset($certs[$kid])) return null; }
    if (openssl_verify($p[0] . '.' . $p[1], $sig, $certs[$kid], OPENSSL_ALGO_SHA256) !== 1) return null;
    if (($body['aud'] ?? '') !== $clientId || !in_array($body['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)) return null;
    if ((int)($body['exp'] ?? 0) < time() - 60 || empty($body['email']) || empty($body['email_verified']) || empty($body['sub'])) return null;
    return $body;
}

/* ---------- абонаменти ----------
   Един код = един абонамент. Активира се веднъж от акаунт (страница „Абонаменти“).
   Индивидуален → 1 детски профил, семеен → до 4, клас → до 30 ученици с потребител и парола (създава ги учителят в „Табло“). */
const PLAN_SEATS = ['single' => 1, 'family' => 4, 'class' => 30];
function code_valid(array $c): bool { return !(int)$c['revoked'] && $c['expires_at'] >= today(); }
function code_seats(array $c): int { return max(1, (int)($c['max_uses'] ?: (PLAN_SEATS[$c['type']] ?? 1))); }
function account_subs(int $aid, ?string $type = null): array { // активните абонаменти на акаунта, първо най-дългите
    $st = db()->prepare('SELECT * FROM codes WHERE account_id = ? AND revoked = 0 AND expires_at >= ?' . ($type ? ' AND type = ?' : '') . ' ORDER BY expires_at DESC');
    $st->execute($type ? [$aid, today(), $type] : [$aid, today()]);
    return $st->fetchAll();
}
function access_obj(array $c, string $device, string $role = 'student'): array { // какво пази устройството за пълния достъп
    return ['code' => $c['code'], 'type' => $c['type'], 'typeName' => TYPE_NAMES[$c['type']] ?? $c['type'], 'role' => $role, 'expires' => $c['expires_at'],
        'label' => $c['label'] ?? '', 'token' => make_token($c['code'], $device, $c['expires_at']), 'valid' => code_valid($c)];
}
function ensure_player(string $code, string $device, string $nick, int $grade): int { // ред за класациите и синхронизацията
    $st = db()->prepare('SELECT id FROM redemptions WHERE code = ? AND device = ?'); $st->execute([$code, $device]);
    $id = (int)$st->fetchColumn(); $st->closeCursor();
    if ($id) return $id;
    db()->prepare('INSERT INTO redemptions(code, device, created_at, last_seen, nickname, grade) VALUES(?, ?, ?, ?, ?, ?)')->execute([$code, $device, now(), now(), clean_nick($nick) ?: null, $grade ?: null]);
    return (int)db()->lastInsertId();
}
/* детски профил: покрит ли е от семейния/индивидуалния абонамент на акаунта (свободните места се дават автоматично) */
function profile_access(array $p): ?array {
    $pdo = db(); $c = null;
    if (!empty($p['code'])) { $c = get_code((string)$p['code']); if ($c && ((int)$c['account_id'] !== (int)$p['account_id'] || !code_valid($c))) $c = null; }
    if (!$c) {
        foreach (array_merge(account_subs((int)$p['account_id'], 'family'), account_subs((int)$p['account_id'], 'single')) as $s) {
            $n = $pdo->prepare('SELECT COUNT(*) FROM profiles WHERE code = ? AND id <> ?'); $n->execute([$s['code'], (int)$p['id']]);
            $used = (int)$n->fetchColumn(); $n->closeCursor();
            if ($used < code_seats($s)) { $c = $s; break; }
        }
        $pdo->prepare('UPDATE profiles SET code = ? WHERE id = ?')->execute([$c['code'] ?? null, (int)$p['id']]);
        if (!$c) return null;
    }
    ensure_player($c['code'], (string)$p['device'], (string)$p['name'], (int)$p['grade']);
    return access_obj($c, (string)$p['device']);
}
/* пароли на учениците: учителят може да ги види и отпечата, затова се пазят и шифровани (освен хеша за проверка) */
function kid_key(): string { return hash('sha256', secret() . '|kidpass', true); }
function kid_enc(string $p): string { $iv = random_bytes(12); $tag = ''; $c = openssl_encrypt($p, 'aes-256-gcm', kid_key(), OPENSSL_RAW_DATA, $iv, $tag); return base64_encode($iv . $tag . $c); }
function kid_dec(?string $e): string { if (!$e) return ''; $r = base64_decode($e); if (strlen($r) < 29) return ''; $p = openssl_decrypt(substr($r, 28), 'aes-256-gcm', kid_key(), OPENSSL_RAW_DATA, substr($r, 0, 12), substr($r, 12, 16)); return $p === false ? '' : $p; }
const KID_WORDS = ['slon', 'lisa', 'zaek', 'mecho', 'tigar', 'zebra', 'sova', 'kit', 'lav', 'panda', 'delfin', 'kote', 'kuche', 'papagal', 'pingvin', 'kenguru', 'zhiraf', 'katerica', 'pchela', 'raketa', 'oblak', 'slance', 'zvezda', 'yabalka', 'cheresha', 'topka', 'kubche', 'molivche'];
function kid_password(): string { return KID_WORDS[random_int(0, count(KID_WORDS) - 1)] . random_int(10, 99); }
function translit(string $s): string {
    $m = ['а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e', 'ж' => 'zh', 'з' => 'z', 'и' => 'i', 'й' => 'y', 'к' => 'k', 'л' => 'l', 'м' => 'm', 'н' => 'n', 'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u', 'ф' => 'f', 'х' => 'h', 'ц' => 'ts', 'ч' => 'ch', 'ш' => 'sh', 'щ' => 'sht', 'ъ' => 'a', 'ь' => 'y', 'ю' => 'yu', 'я' => 'ya'];
    return preg_replace('/[^a-z0-9]/', '', strtr(mb_strtolower($s), $m)) ?? '';
}
function kid_username(string $name): string { // напр. „Ани Петрова“ → ani47 (уникално)
    $base = substr(translit(explode(' ', trim($name))[0] ?? '') ?: 'uchenik', 0, 10);
    $st = db()->prepare('SELECT 1 FROM redemptions WHERE username = ?');
    for ($i = 0; $i < 200; $i++) { $u = $base . random_int($i < 50 ? 10 : 100, $i < 50 ? 99 : 9999); $st->execute([$u]); if (!$st->fetchColumn()) return $u; }
    return $base . bin2hex(random_bytes(3));
}

/* ---------- блог ---------- */
const BLOG_CATS = ['Съвети за родители', 'За учители', 'Математика у дома', 'Новини от Сметко', 'Игри и идеи'];
function slugify(string $t): string {
    $tr = ['а'=>'a','б'=>'b','в'=>'v','г'=>'g','д'=>'d','е'=>'e','ж'=>'zh','з'=>'z','и'=>'i','й'=>'y','к'=>'k','л'=>'l','м'=>'m','н'=>'n','о'=>'o','п'=>'p','р'=>'r','с'=>'s','т'=>'t','у'=>'u','ф'=>'f','х'=>'h','ц'=>'ts','ч'=>'ch','ш'=>'sh','щ'=>'sht','ъ'=>'a','ь'=>'y','ю'=>'yu','я'=>'ya'];
    $s = strtr(mb_strtolower($t), $tr);
    $s = trim(preg_replace('/[^a-z0-9]+/', '-', $s) ?? '', '-');
    return substr($s, 0, 70) ?: 'statia';
}
/* опростен Markdown → HTML (безопасен: целият текст първо се екранира) */
function md_inline(string $s): string {
    $s = preg_replace('/!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/', '<img src="$2" alt="$1" loading="lazy">', $s);
    $s = preg_replace('/\[([^\]]+)\]\(((?:https?:\/\/|\/|[a-z0-9-]+\.html)[^\s)]*)\)/', '<a href="$2">$1</a>', $s);
    $s = preg_replace('/\*\*(.+?)\*\*/', '<b>$1</b>', $s);
    $s = preg_replace('/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/u', '<i>$1</i>', $s);
    return $s;
}
function md_to_html(string $md): string {
    $lines = preg_split('/\r?\n/', htmlspecialchars($md, ENT_QUOTES, 'UTF-8'));
    $out = []; $list = null; $para = [];
    $flush = function () use (&$para, &$out) { if ($para) { $out[] = '<p>' . md_inline(implode('<br>', $para)) . '</p>'; $para = []; } };
    $close = function () use (&$list, &$out) { if ($list) { $out[] = "</$list>"; $list = null; } };
    foreach ($lines as $l) {
        $t = trim($l);
        if ($t === '') { $flush(); $close(); continue; }
        if (preg_match('/^(#{2,4})\s+(.+)$/', $t, $m)) { $flush(); $close(); $n = strlen($m[1]); $out[] = "<h$n>" . md_inline($m[2]) . "</h$n>"; continue; }
        if (preg_match('/^&gt;\s?(.*)$/', $t, $m)) { $flush(); $close(); $out[] = '<blockquote>' . md_inline($m[1]) . '</blockquote>'; continue; }
        if (preg_match('/^[-*•]\s+(.+)$/u', $t, $m)) { $flush(); if ($list !== 'ul') { $close(); $out[] = '<ul>'; $list = 'ul'; } $out[] = '<li>' . md_inline($m[1]) . '</li>'; continue; }
        if (preg_match('/^\d+[.)]\s+(.+)$/', $t, $m)) { $flush(); if ($list !== 'ol') { $close(); $out[] = '<ol>'; $list = 'ol'; } $out[] = '<li>' . md_inline($m[1]) . '</li>'; continue; }
        $close(); $para[] = $t;
    }
    $flush(); $close();
    return implode("\n", $out);
}

/* статистика за отчетите: {s: {умение: [верни, всички]}, d: {дата: [всички, верни]}} */
function clean_stats($in): ?string {
    if (!is_array($in)) return null;
    $s = []; $d = [];
    foreach ((is_array($in['s'] ?? null) ? $in['s'] : []) as $k => $v) {
        if (count($s) >= 160 || !preg_match('/^[a-zA-Z0-9]{2,24}$/', (string)$k) || !is_array($v)) continue;
        $a = max(0, min(100000, (int)($v[1] ?? 0))); $c = max(0, min($a, (int)($v[0] ?? 0)));
        if ($a) $s[$k] = [$c, $a];
    }
    foreach ((is_array($in['d'] ?? null) ? $in['d'] : []) as $k => $v) {
        if (count($d) >= 60 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$k) || !is_array($v)) continue;
        $a = max(0, min(5000, (int)($v[0] ?? 0))); $c = max(0, min($a, (int)($v[1] ?? 0)));
        if ($a) $d[$k] = [$a, $c];
    }
    return json_encode(['s' => (object)$s, 'd' => (object)$d]);
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
    $r = $st->fetch(); $st->closeCursor(); return $r ?: null;
}
function batch_of(string $code): ?array {
    $st = db()->prepare('SELECT b.* FROM batches b JOIN codes c ON c.batch_id = b.id WHERE c.code = ?'); $st->execute([$code]);
    $r = $st->fetch(); return $r ?: null;
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
/* Помощни настройки за деца със СОП (задава ги учителят за всеки ученик; детето не може да ги изключи) */
const ADAPT_KEYS = ['calm', 'read', 'big', 'spaced', 'choices', 'short', 'dots', 'retry'];
function adapt_clean($a): ?string {
    if (!is_array($a)) return null;
    $o = []; foreach (ADAPT_KEYS as $k) if (!empty($a[$k])) $o[$k] = 1;
    return $o ? json_encode($o) : null;
}
function adapt_out($json): ?object {
    $a = $json ? json_decode((string)$json, true) : null;
    if (!is_array($a)) return null;
    $o = []; foreach (ADAPT_KEYS as $k) if (!empty($a[$k])) $o[$k] = 1;
    return $o ? (object)$o : null;
}
/* Дневник на действията (показва се в админ → Дневник). Админ панелът ползва audit(), който вика тази функция. */
function audit_add(string $action, string $details = ''): void {
    db()->prepare('INSERT INTO audit(ts, ip, action, details) VALUES(?, ?, ?, ?)')->execute([now(), client_ip(), $action, mb_substr($details, 0, 500)]);
}

/* Подписан, кратко валиден ключ за акаунта – слага се в плащането през Paddle, за да може абонаментът
   да се активира направо в акаунта на купувача. Данните идват от браузъра, затова се подписват тук. */
function paddle_acc_token(int $aid): string { $p = $aid . '.' . (time() + 7200); return $p . '.' . substr(b64u(hash_hmac('sha256', 'paddle|' . $p, secret(), true)), 0, 24); }
function paddle_acc_id(string $t): int {
    $x = explode('.', $t);
    if (count($x) !== 3 || !ctype_digit($x[0]) || !ctype_digit($x[1])) return 0;
    $p = $x[0] . '.' . $x[1];
    if (!hash_equals(substr(b64u(hash_hmac('sha256', 'paddle|' . $p, secret(), true)), 0, 24), $x[2])) return 0;
    return (int)$x[1] >= time() - 86400 ? (int)$x[0] : 0; // ключът важи 2 часа, плащането – до 1 ден след това
}

/* Нови кодове за абонамент (от админ панела и от плащане през Paddle). Връща списък с кодовете. */
function make_codes(string $type, int $count, string $exp, string $label = '', ?int $orderId = null, ?int $schoolId = null): array {
    $pdo = db();
    $seats = PLAN_SEATS[$type] ?? 1;
    $own = !$pdo->inTransaction(); if ($own) $pdo->beginTransaction();
    $ins = $pdo->prepare('INSERT OR IGNORE INTO codes(code, batch_id, type, max_uses, expires_at, pin, label, created_at, role, order_id) VALUES(?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)');
    $newBatch = fn() => ($pdo->prepare('INSERT INTO batches(label, type, max_uses, expires_at, created_at, school_id, public) VALUES(?, ?, ?, ?, ?, ?, 1)')->execute([$label, $type, $seats, $exp, now(), $schoolId]) ? (int)$pdo->lastInsertId() : 0);
    $made = []; $bid = $type === 'class' ? 0 : $newBatch(); $first = 0; $guard = 0;
    while (count($made) < $count && $guard++ < $count * 20) {
        $b = $type === 'class' ? $newBatch() : $bid; // всеки клас е отделна група за класациите
        $c = random_code(); $ins->execute([$c, $b, $type, $seats, $exp, $label, now(), 'student', $orderId ?: null]);
        if ($ins->rowCount()) { $made[] = $c; $first = $first ?: $b; } elseif ($type === 'class') $pdo->prepare('DELETE FROM batches WHERE id = ?')->execute([$b]);
    }
    if ($orderId) $pdo->prepare("UPDATE orders SET batch_id = COALESCE(batch_id, ?), status = CASE WHEN status = 'new' THEN 'codes' ELSE status END WHERE id = ?")->execute([$first, $orderId]);
    if ($own) $pdo->commit();
    return $made;
}

function too_many(string $kind, int $max, int $window): bool {
    $pdo = db(); $t = time();
    if (random_int(1, 40) === 1) $pdo->prepare('DELETE FROM attempts WHERE ts < ?')->execute([$t - 86400]); // почистване от време на време
    $st = $pdo->prepare('SELECT COUNT(*) FROM attempts WHERE ip = ? AND kind = ? AND ts > ?');
    $st->execute([client_ip(), $kind, $t - $window]);
    $n = (int)$st->fetchColumn(); $st->closeCursor();
    return $n >= $max;
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
const PADDLE_KEYS = ['token' => '', 'secret' => '', 'apiKey' => '', 'prices' => ['single6' => '', 'single12' => '', 'family6' => '', 'family12' => '', 'class6' => '', 'class12' => '']];
/* Настройките на Paddle за текущия режим (sandbox или live). */
function paddle_cfg(?array $c = null): array {
    $p = ($c ?? site_config())['paddle'] ?? [];
    $env = ($p['env'] ?? 'sandbox') === 'live' ? 'live' : 'sandbox';
    $k = array_merge(PADDLE_KEYS, is_array($p[$env] ?? null) ? $p[$env] : []);
    $k['prices'] = array_merge(PADDLE_KEYS['prices'], is_array($k['prices'] ?? null) ? $k['prices'] : []);
    $k['env'] = $env;
    return $k;
}

const DEFAULT_CONFIG = [
    'paywall' => true, 'freeMissions' => 3, 'freePractice' => 20, 'questions' => 10, 'contactEmail' => 'info@smetko.com',
    'prices' => ['single6' => '10', 'single12' => '18', 'family6' => '18', 'family12' => '30', 'class6' => '45', 'class12' => '80', 'disc3' => '15', 'disc8' => '25'],
    'planNames' => ['free' => 'Пухче', 'single' => 'Бухалче', 'family' => 'Гнездо', 'class' => 'Ято', 'school' => 'Гора'],
    'banner' => ['on' => false, 'text' => '', 'link' => '', 'linkText' => '', 'color' => 'orange'],
    'company' => ['name' => '', 'eik' => '', 'addr' => '', 'vat' => '', 'date' => '', 'phone' => '', 'iban' => '', 'bank' => '', 'mol' => ''],
    'blockedWords' => '',
    'diplomas' => 'auto', // грамоти: auto = от 1 юни до 30 септември, on = винаги, off = никога
    'google' => ['gsc' => '', 'ga' => '', 'clientId' => ''], // Search Console (файл за потвърждение), Google Analytics (G-…), вход с Google (Client ID)
    // Paddle – търговец (Merchant of Record) за плащанията. token и prices са публични; secret и apiKey не излизат от сървъра.
    'paddle' => ['env' => 'sandbox', 'sandbox' => PADDLE_KEYS, 'live' => PADDLE_KEYS],
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
require_once __DIR__ . '/mail.php';
