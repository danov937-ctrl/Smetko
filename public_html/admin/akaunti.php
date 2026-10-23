<?php
/* Акаунти на родители и учители: търсене, детски профили, класове, нова парола, спиране, изтриване, CSV. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$action = $_POST['action'] ?? '';
$id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);
$acc = null;
if ($id) { $st = $pdo->prepare('SELECT * FROM accounts WHERE id = ?'); $st->execute([$id]); $acc = $st->fetch() ?: null; if (!$acc && $action === '') go('akaunti.php'); }
$back = fn() => go('akaunti.php?id=' . $id);

if ($acc && $action === 'reset_link') {
    $tok = bin2hex(random_bytes(24));
    $pdo->prepare('UPDATE accounts SET reset_hash = ?, reset_until = ? WHERE id = ?')->execute([hash('sha256', $tok), time() + 86400, $id]);
    $sent = mail_reset((string)$acc['email'], (string)$acc['name'], SITE_URL . '/zabravena-parola.html?t=' . $tok, 24);
    audit('Връзка за нова парола', $acc['email'] . ($sent ? ' (изпратена)' : ' (имейлът не тръгна)'));
    $_SESSION['reset_link'] = SITE_URL . '/zabravena-parola.html?t=' . $tok;
    flash($sent ? 'Изпратихме връзка за нова парола на ' . $acc['email'] . '. Може да я копирате и по-долу.' : 'Имейлът не тръгна – копирайте връзката по-долу и я изпратете ръчно.', $sent ? 'ok' : 'err');
    $back();
}
if ($acc && $action === 'toggle') {
    $v = (int)$acc['disabled'] ? 0 : 1;
    $pdo->prepare('UPDATE accounts SET disabled = ? WHERE id = ?')->execute([$v, $id]);
    if ($v) $pdo->prepare('DELETE FROM auth_sessions WHERE account_id = ?')->execute([$id]);
    audit($v ? 'Спрян акаунт' : 'Пуснат акаунт', $acc['email']); flash($v ? 'Акаунтът е спрян и изведен от всички устройства.' : 'Акаунтът е пуснат отново.'); $back();
}
if ($acc && $action === 'logout_all') {
    $pdo->prepare('DELETE FROM auth_sessions WHERE account_id = ?')->execute([$id]);
    audit('Изход от всички устройства (акаунт)', $acc['email']); flash('Акаунтът е изведен от всички устройства.'); $back();
}
if ($acc && $action === 'unlink') { // кодът се маха от профила (напр. сгрешен код); активирането остава
    $pid = (int)post('pid');
    $pdo->prepare('UPDATE profiles SET code = NULL WHERE id = ? AND account_id = ?')->execute([$pid, $id]);
    audit('Код махнат от профил', $acc['email'] . " · профил #$pid"); flash('Кодът е махнат от профила.'); $back();
}
if ($acc && $action === 'delete') {
    if (mb_strtolower(post('confirm')) !== mb_strtolower($acc['email'])) { flash('За потвърждение напишете имейла на акаунта.', 'err'); $back(); }
    foreach (['profiles', 'auth_sessions'] as $t) $pdo->prepare("DELETE FROM $t WHERE account_id = ?")->execute([$id]);
    $pdo->prepare('DELETE FROM accounts WHERE id = ?')->execute([$id]);
    audit('Изтрит акаунт', $acc['email']); flash('Акаунтът и профилите са изтрити.'); go('akaunti.php');
}

$ROLE = ['parent' => 'родител', 'teacher' => 'учител'];
if ($acc) {
    $ps = $pdo->prepare('SELECT * FROM profiles WHERE account_id = ? ORDER BY id'); $ps->execute([$id]);
    $rows = '';
    foreach ($ps as $p) {
        $s = $p['state'] ? json_decode((string)$p['state'], true) : [];
        $c = $p['code'] ? get_code((string)$p['code']) : null;
        $rows .= '<tr><td>' . h($p['avatar']) . ' <b>' . h($p['name']) . '</b></td><td>' . (int)$p['grade'] . '.</td><td>' .
            ($p['code'] ? '<a href="kodove.php?q=' . urlencode((string)$p['code']) . '" class="mono">' . h($p['code']) . '</a>' . ($c ? ' <small class="muted">' . h(TYPE_NAMES[$c['type']] ?? '') . ' до ' . fdate($c['expires_at']) . '</small>' : '') .
                ' <form method="post" style="display:inline">' . csrf_field() . '<input type="hidden" name="action" value="unlink"><input type="hidden" name="pid" value="' . (int)$p['id'] . '"><button class="ghost sm" data-confirm="Да махнем ли кода от профила?">✕</button></form>' : '<span class="muted">без код</span>') . '</td>' .
            '<td class="num">' . (int)($s['points'] ?? 0) . '</td><td class="num">' . (int)($s['answered'] ?? 0) . '</td><td>' . fdate($p['updated_at']) . '</td></tr>';
    }
    $cs = $pdo->prepare('SELECT c.code, c.type, c.expires_at, c.revoked, b.class_name, (SELECT COUNT(*) FROM redemptions r WHERE r.code = c.code) AS n FROM codes c LEFT JOIN batches b ON b.id = c.batch_id WHERE c.account_id = ? ORDER BY c.expires_at DESC'); $cs->execute([$id]);
    $cls = '';
    foreach ($cs as $k) $cls .= '<li><a class="mono" href="kodove.php?code=' . urlencode($k['code']) . '">' . h($k['code']) . '</a> · ' . h(TYPE_NAMES[$k['type']] ?? $k['type']) . ($k['type'] === 'class' ? ' ' . h($k['class_name'] ?: '') . ' · ' . (int)$k['n'] . ' ученици' : '') . ' · до ' . fdate($k['expires_at']) . ((int)$k['revoked'] ? ' <span class="tag tr">спрян</span>' : ($k['expires_at'] < today() ? ' <span class="tag">изтекъл</span>' : '')) . '</li>';
    $ns = $pdo->prepare('SELECT COUNT(*) FROM auth_sessions WHERE account_id = ? AND expires > ?'); $ns->execute([$id, time()]);
    $link = $_SESSION['reset_link'] ?? ''; unset($_SESSION['reset_link']);
    $btn = fn($a, $t, $cls = 'ghost', $conf = '') => '<form method="post" style="display:inline">' . csrf_field() . '<input type="hidden" name="action" value="' . $a . '"><input type="hidden" name="id" value="' . $id . '"><button class="' . $cls . '"' . ($conf ? ' data-confirm="' . h($conf) . '"' : '') . '>' . $t . '</button></form> ';
    $body = '<div class="card"><h2>' . h($acc['name']) . ((int)$acc['disabled'] ? ' <span class="tag red">спрян</span>' : '') . '</h2><p><b>' . h($acc['email']) . '</b> · ' . ($ROLE[$acc['role']] ?? $acc['role']) .
        ' · регистриран ' . fdate($acc['created_at']) . ' · последен вход ' . fdate($acc['last_login']) . ' · активни сесии: ' . (int)$ns->fetchColumn() . '</p>' .
        '<div class="row">' . $btn('reset_link', '✉️ Изпрати връзка за нова парола', '') . $btn('logout_all', '🚪 Изведи от всички устройства') . $btn('toggle', (int)$acc['disabled'] ? '✅ Пусни акаунта' : '⛔ Спри акаунта', 'ghost', (int)$acc['disabled'] ? '' : 'Акаунтът няма да може да влиза. Продължаваме ли?') . '</div>' .
        ($link ? '<p class="hint">Връзка (важи 24 часа):</p><div class="row"><input id="rl" readonly value="' . h($link) . '" style="flex:1"><button type="button" class="ghost" data-copy="rl">📋 Копирай</button></div>' : '') . '</div>' .
        '<div class="card"><h2>Детски профили</h2>' . ($rows ? '<div class="tw"><table><thead><tr><th>Профил</th><th>Клас</th><th>Код</th><th class="num">Точки</th><th class="num">Задачи</th><th>Записан</th></tr></thead><tbody>' . $rows . '</tbody></table></div>' : '<p class="muted">Няма профили.</p>') . '</div>' .
        '<div class="card"><h2>Абонаменти</h2>' . ($cls ? '<ul>' . $cls . '</ul>' : '<p class="muted">Няма активирани кодове.</p>') . '</div>' .
        '<form method="post" class="card">' . csrf_field() . '<input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="' . $id . '"><h2>Изтриване</h2><p class="hint">Изтриват се акаунтът, детските профили и записаният прогрес (напр. по искане на родителя по GDPR). Активираните кодове и точките в класациите остават.</p><div class="row"><input name="confirm" placeholder="Напишете имейла за потвърждение" style="flex:1"><button class="red">🗑️ Изтрий акаунта</button></div></form>';
    page('Акаунт: ' . $acc['email'], $body, '<a class="btn ghost" href="akaunti.php">← Всички акаунти</a>');
}

$q = trim((string)($_GET['q'] ?? '')); $role = (string)($_GET['role'] ?? '');
$where = []; $args = [];
if ($q !== '') { $where[] = '(a.email LIKE ? OR a.name LIKE ? OR a.id IN (SELECT account_id FROM profiles WHERE name LIKE ? OR code LIKE ?))'; $l = '%' . $q . '%'; array_push($args, $l, $l, $l, '%' . strtoupper($q) . '%'); }
if (isset($ROLE[$role])) { $where[] = 'a.role = ?'; $args[] = $role; }
$sql = 'SELECT a.*, (SELECT COUNT(*) FROM profiles p WHERE p.account_id = a.id) AS np, (SELECT COUNT(*) FROM profiles p WHERE p.account_id = a.id AND p.code IS NOT NULL) AS nc,
    (SELECT COUNT(*) FROM codes k WHERE k.account_id = a.id AND k.type = \'class\') AS nk FROM accounts a' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY a.id DESC';
if (($_GET['export'] ?? '') === 'csv') {
    $st = $pdo->prepare($sql); $st->execute($args);
    csv_out('smetko-akaunti-' . date('Y-m-d') . '.csv', ['Имейл', 'Име', 'Роля', 'Профили', 'С код', 'Класове', 'Регистриран', 'Последен вход', 'Спрян'],
        (function () use ($st, $ROLE) { foreach ($st as $r) yield [$r['email'], $r['name'], $ROLE[$r['role']] ?? $r['role'], $r['np'], $r['nc'], $r['nk'], $r['created_at'], $r['last_login'], (int)$r['disabled'] ? 'да' : '']; })());
}
$st = $pdo->prepare($sql . ' LIMIT 500'); $st->execute($args);
$rows = '';
foreach ($st as $r) $rows .= '<tr><td><a href="akaunti.php?id=' . (int)$r['id'] . '"><b>' . h($r['email']) . '</b></a>' . ((int)$r['disabled'] ? ' <span class="tag red">спрян</span>' : '') . '</td><td>' . h($r['name']) . '</td><td>' . ($ROLE[$r['role']] ?? '') . '</td><td class="num">' . (int)$r['np'] . ($r['nc'] ? ' <small class="muted">(' . (int)$r['nc'] . ' с код)</small>' : '') . '</td><td class="num">' . (int)$r['nk'] . '</td><td>' . fdate($r['created_at']) . '</td><td>' . fdate($r['last_login']) . '</td></tr>';
$tot = $pdo->query("SELECT COUNT(*) AS n, SUM(role = 'parent') AS p, SUM(role = 'teacher') AS t, SUM(created_at >= datetime('now', '-7 days')) AS w FROM accounts")->fetch();
$body = '<div class="kpis"><div class="kpi"><b>' . (int)$tot['n'] . '</b><span>акаунта</span>' . ((int)$tot['w'] ? '<small>+' . (int)$tot['w'] . ' за 7 дни</small>' : '') . '</div><div class="kpi"><b>' . (int)$tot['p'] . '</b><span>родители</span></div><div class="kpi"><b>' . (int)$tot['t'] . '</b><span>учители</span></div>' .
    '<div class="kpi"><b>' . (int)$pdo->query('SELECT COUNT(*) FROM profiles')->fetchColumn() . '</b><span>детски профила</span></div></div>' .
    '<form class="card row" method="get"><input name="q" value="' . h($q) . '" placeholder="Имейл, име, име на дете или код" style="flex:1;min-width:200px"><select name="role"><option value="">Всички</option><option value="parent"' . ($role === 'parent' ? ' selected' : '') . '>Родители</option><option value="teacher"' . ($role === 'teacher' ? ' selected' : '') . '>Учители</option></select><button>🔎 Търси</button></form>' .
    '<div class="card">' . ($rows ? '<div class="tw"><table><thead><tr><th>Имейл</th><th>Име</th><th>Роля</th><th class="num">Профили</th><th class="num">Класове</th><th>Регистриран</th><th>Последен вход</th></tr></thead><tbody>' . $rows . '</tbody></table></div>' : '<p class="muted">' . ($q !== '' ? 'Няма намерени акаунти.' : 'Още няма регистрирани родители и учители. Регистрацията е на smetko.com/registracia.') . '</p>') . '</div>' .
    '<p class="hint">Родителите и учителите сами сменят паролата си („Забравена парола“). Ако някой не получава имейла, отворете акаунта и копирайте връзката за нова парола.</p>';
page('Акаунти', $body, '<a class="btn ghost" href="akaunti.php?export=csv' . ($q !== '' ? '&q=' . urlencode($q) : '') . ($role ? '&role=' . urlencode($role) : '') . '">⬇️ CSV</a>');
