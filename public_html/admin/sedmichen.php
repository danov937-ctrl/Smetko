<?php
/* Седмичен имейл до родителите (api/weekly.php): вкл./изкл., преглед за конкретен акаунт, пробно писмо, статистика. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require __DIR__ . '/../api/weekly.php';
require_admin();
$pdo = db();
$contact = (string)(site_config()['contactEmail'] ?? 'info@smetko.com');
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $a = post('action');
    if ($a === 'toggle') { set_setting('weekly_on', weekly_on() ? '0' : '1'); audit('Седмичен имейл', weekly_on() ? 'включен' : 'изключен'); flash(weekly_on() ? 'Седмичният имейл е включен.' : 'Седмичният имейл е изключен.'); }
    if ($a === 'test') {
        $st = $pdo->prepare('SELECT * FROM accounts WHERE id = ?'); $st->execute([(int)post('aid')]); $acc = $st->fetch();
        $to = filter_var(post('to'), FILTER_VALIDATE_EMAIL) ? post('to') : $contact;
        if ($acc && weekly_send($acc, true, $to)) { audit('Пробен седмичен имейл', $to); flash('Пробното писмо е изпратено до ' . $to . '.'); } else flash('Писмото не беше изпратено (няма деца в акаунта или пощата отказа).', 'err');
    }
    go('sedmichen.php' . (post('aid') ? '?aid=' . (int)post('aid') : ''));
}
$parents = $pdo->query("SELECT a.id, a.name, a.email, COALESCE(a.weekly, 1) AS weekly, (SELECT COUNT(*) FROM profiles p WHERE p.account_id = a.id) AS kids FROM accounts a WHERE a.disabled = 0 AND a.role <> 'teacher' ORDER BY kids DESC, a.id DESC LIMIT 300")->fetchAll();
$on = count(array_filter($parents, fn($p) => (int)$p['weekly'] === 1)); $withKids = count(array_filter($parents, fn($p) => (int)$p['kids'] > 0));
$stats = json_decode((string)setting('weekly_stats', '{}'), true) ?: [];
$aid = (int)($_GET['aid'] ?? ($parents[0]['id'] ?? 0));
$prev = '';
if ($aid) {
    $st = $pdo->prepare('SELECT * FROM accounts WHERE id = ?'); $st->execute([$aid]); $acc = $st->fetch();
    $m = $acc ? weekly_build($acc, true) : null;
    $prev = $m ? '<p><b>Тема:</b> ' . h($m['subject']) . ($m['nudge'] ? ' <span class="muted">(напомняне – миналата седмица никой не е играл)</span>' : '') . '</p><iframe title="Преглед" srcdoc="' . h($m['html']) . '" style="width:100%;height:760px;border:1px solid #E2EAF6;border-radius:14px;background:#EAF6FF"></iframe>'
        : '<p class="muted">В този акаунт няма детски профили.</p>';
}
[$from, $to] = weekly_range();
$kpi = fn($v, $l, $s = '') => '<div class="kpi"><b>' . $v . '</b><span>' . $l . '</span>' . ($s ? '<small>' . $s . '</small>' : '') . '</div>';
$body = '<div class="card"><div class="row" style="justify-content:space-between"><div><h2 style="margin:0">' . (weekly_on() ? '🟢 Включен' : '⚪ Изключен') . '</h2><p class="hint" style="margin:4px 0 0">Праща се всеки понеделник след 8:00 до родителите, чиито деца са играли през предишната седмица (или по-миналата – тогава е кратко напомняне). Без деца или без игра – не се праща. Учителите не го получават.</p></div>' .
    '<form method="post">' . csrf_field() . '<button name="action" value="toggle" class="' . (weekly_on() ? 'ghost' : '') . '">' . (weekly_on() ? 'Изключи' : 'Включи') . '</button></form></div></div>' .
    '<div class="kpis">' . $kpi($withKids, 'родители с деца') . $kpi($on, 'получават', ($parents ? count($parents) - $on : 0) . ' са се отписали') .
    $kpi($stats ? (int)($stats['sent'] ?? 0) : '–', 'пратени ' . h($stats['week'] ?? ''), !empty($stats['done']) ? 'готово · ' . h($stats['at'] ?? '') : ($stats ? 'в процес · ' . h($stats['at'] ?? '') : 'още не е пращан')) . '</div>' .
    '<div class="card"><h2>Преглед</h2><form method="get" class="row"><select name="aid" onchange="this.form.submit()">' . implode('', array_map(fn($p) => '<option value="' . (int)$p['id'] . '"' . ((int)$p['id'] === $aid ? ' selected' : '') . '>' . h($p['name'] . ' · ' . $p['email'] . ' · ' . $p['kids'] . ' деца' . ((int)$p['weekly'] ? '' : ' · отписан')) . '</option>', $parents)) . '</select><noscript><button>Покажи</button></noscript></form>' .
    '<p class="hint">Седмица ' . fdate($from) . ' – ' . fdate($to) . '. Прегледът показва писмото дори когато детето не е играло (истинското писмо тогава не се праща).</p>' .
    ($aid ? '<form method="post" class="row">' . csrf_field() . '<input type="hidden" name="aid" value="' . $aid . '"><input name="to" type="email" value="' . h($contact) . '" style="min-width:240px"><button name="action" value="test" class="sm">✉️ Прати пробно</button></form>' : '') . $prev . '</div>';
page('Седмичен имейл', $parents ? $body : '<div class="card"><p class="muted">Още няма акаунти на родители.</p></div>');
