<?php
/* Сигнали: „Нещо не е наред?“ от играта и сайта + автоматично записани грешки в браузъра (api/feedback.php). */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$tab = ($_GET['t'] ?? '') === 'js' ? 'js' : 'user';
$show = ($_GET['s'] ?? '') === 'all' ? 'all' : 'new';
$back = 'signali.php?t=' . $tab . '&s=' . $show;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = (int)post('id'); $a = post('action');
    if ($a === 'done' && $id) $pdo->prepare("UPDATE reports SET status = CASE status WHEN 'new' THEN 'done' ELSE 'new' END WHERE id = ?")->execute([$id]);
    if ($a === 'delete' && $id) { $pdo->prepare('DELETE FROM reports WHERE id = ?')->execute([$id]); audit('Изтрит сигнал', '#' . $id); }
    if ($a === 'clear_js') { $n = $pdo->exec("DELETE FROM reports WHERE kind = 'js' AND status = 'done'"); audit('Изчистени решени JS грешки', (string)$n); flash('Изчистено.'); }
    go($back);
}
function device(string $ua): string {
    $os = preg_match('/iPhone|iPad|iPod/', $ua) ? (str_contains($ua, 'iPad') ? 'iPad' : 'iPhone') : (str_contains($ua, 'Android') ? 'Android' : (str_contains($ua, 'Windows') ? 'Windows' : (str_contains($ua, 'Mac OS') ? 'Mac' : (str_contains($ua, 'CrOS') ? 'Chromebook' : (str_contains($ua, 'Linux') ? 'Linux' : '?')))));
    $br = preg_match('/Edg\//', $ua) ? 'Edge' : (preg_match('/SamsungBrowser/', $ua) ? 'Samsung' : (preg_match('/Firefox|FxiOS/', $ua) ? 'Firefox' : (preg_match('/Chrome|CriOS/', $ua) ? 'Chrome' : (str_contains($ua, 'Safari') ? 'Safari' : '?'))));
    return $os . ' · ' . $br;
}
$cnt = fn($sql) => (int)$pdo->query($sql)->fetchColumn();
$nu = $cnt("SELECT COUNT(*) FROM reports WHERE kind IN ('task','bug') AND status = 'new'");
$nj = $cnt("SELECT COUNT(*) FROM reports WHERE kind = 'js' AND status = 'new'");
$reasons = ['wrong' => '❌ Грешен отговор', 'unclear' => '🤔 Неясна задача', 'broken' => '🛠️ Не работи', 'other' => '💬 Друго'];
$modes = ['adventure' => 'Приключение', 'quick' => 'Бързо сметни', 'practice' => 'Тренировка', 'challenge' => 'Предизвикателство', 'homework' => 'Домашна'];
$where = ($tab === 'js' ? "kind = 'js'" : "kind IN ('task','bug')") . ($show === 'new' ? " AND status = 'new'" : '');
$rows = $pdo->query('SELECT * FROM reports WHERE ' . $where . ' ORDER BY ' . ($tab === 'js' ? 'last_at' : 'id') . ' DESC LIMIT 200')->fetchAll();
$btn = fn($r, $a, $l, $conf = '') => '<form method="post" class="inline">' . csrf_field() . '<input type="hidden" name="id" value="' . (int)$r['id'] . '"><button name="action" value="' . $a . '" class="sm ghost"' . ($conf ? ' data-confirm="' . h($conf) . '"' : '') . '>' . $l . '</button></form>';
$list = '';
foreach ($rows as $r) {
    $d = json_decode((string)$r['data'], true) ?: [];
    $meta = '<small class="muted">#' . (int)$r['id'] . ' · ' . fdate(substr((string)$r['created_at'], 0, 10)) . ' ' . substr((string)$r['created_at'], 11, 5) . ' UTC · ' . h(device((string)$r['ua'])) . ' · ' . h($d['vw'] ?? '') . ' · v' . h($r['ver']) . ' · ' . h($r['page']) . '</small>';
    $acts = '<div class="row">' . $btn($r, 'done', $r['status'] === 'new' ? '✓ Решено' : '↺ Отвори пак') . $btn($r, 'delete', 'Изтрий', 'Да изтрия ли сигнала?') . '</div>';
    if ($tab === 'js') {
        $list .= '<div class="card' . ($r['status'] === 'done' ? ' muted' : '') . '"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>' . h($r['text']) . '</b> <span style="background:#FFE4C7;border-radius:99px;padding:1px 8px;font-weight:800">×' . (int)$r['n'] . '</span><br><small>' . h(($d['src'] ?? '') . ':' . ($d['line'] ?? 0) . ':' . ($d['col'] ?? 0)) . ' · последно ' . fdate(substr((string)$r['last_at'], 0, 10)) . '</small><br>' . $meta . '</div>' . $acts . '</div>' .
            (!empty($d['stack']) ? '<details><summary>Stack</summary><pre style="white-space:pre-wrap;font-size:12px">' . h($d['stack']) . '</pre></details>' : '') . '</div>';
        continue;
    }
    $t = $d['task'] ?? null; $info = '';
    if ($t) {
        $try = $t['skill'] ? '<a class="btn sm ghost" target="_blank" href="../game.html?grade=' . (int)$t['grade'] . '&mode=practice&skill=' . urlencode($t['skill']) . '">▶ Пробвай този вид задача</a>' : '';
        $info = '<table><tbody>' .
            '<tr><th>Задача</th><td><b style="font-size:1.1rem">' . h($t['q']) . '</b></td></tr>' .
            '<tr><th>Верен отговор (по Сметко)</th><td>' . h($t['answer']) . ' · <span class="muted">' . h($t['full']) . '</span></td></tr>' .
            ($t['input'] !== '' ? '<tr><th>Отговор на детето</th><td>' . h($t['input']) . '</td></tr>' : '') .
            '<tr><th>Къде</th><td>' . (int)$t['grade'] . '. клас · ' . h($modes[$t['mode']] ?? $t['mode']) . ($t['mission'] ? ' · „' . h($t['mission']) . '“' : '') . ($t['book'] ? ' · учебник ' . h($t['book']) : '') . ' · трудност ' . (int)$t['level'] . '</td></tr>' .
            '<tr><th>Вид задача</th><td><code>' . h($t['skill']) . '</code>' . ($t['a11y'] ? ' · помощни настройки: ' . h($t['a11y']) : '') . ' ' . $try . '</td></tr></tbody></table>';
    }
    $list .= '<div class="card' . ($r['status'] === 'done' ? ' muted' : '') . '"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>' . ($r['kind'] === 'task' ? ($reasons[$r['reason']] ?? '') : '🐞 Проблем със сайта') . '</b><br>' . $meta . '</div>' . $acts . '</div>' .
        ($r['text'] !== '' ? '<p style="margin:8px 0;white-space:pre-wrap">' . h($r['text']) . '</p>' : '') . $info . '</div>';
}
$tabs = '<div class="row noprint" style="margin-bottom:12px">' .
    '<a class="btn sm ' . ($tab === 'user' ? '' : 'ghost') . '" href="?t=user&s=' . $show . '">🚩 От хората' . ($nu ? ' (' . $nu . ')' : '') . '</a>' .
    '<a class="btn sm ' . ($tab === 'js' ? '' : 'ghost') . '" href="?t=js&s=' . $show . '">⚠️ Грешки в браузъра' . ($nj ? ' (' . $nj . ')' : '') . '</a>' .
    '<span style="flex:1"></span><a class="btn sm ' . ($show === 'new' ? '' : 'ghost') . '" href="?t=' . $tab . '&s=new">Само нови</a><a class="btn sm ' . ($show === 'all' ? '' : 'ghost') . '" href="?t=' . $tab . '&s=all">Всички</a>' .
    ($tab === 'js' ? '<form method="post" class="inline">' . csrf_field() . '<button name="action" value="clear_js" class="sm ghost" data-confirm="Да изтрия ли всички решени грешки?">Изчисти решените</button></form>' : '') . '</div>';
$help = $tab === 'js' ? '<p class="hint">Записват се автоматично, когато нещо в сайта се счупи в браузъра на посетител. Еднаквите грешки се събират в един ред (×брой). Не се пазят IP адреси.</p>'
    : '<p class="hint">Сигнали от бутона „🚩 Нещо не е наред със задачата?“ в играта и „Съобщи за проблем“ във футъра. Към сигнала от играта се прилага самата задача, отговорът на детето и вида на устройството – без лични данни.</p>';
page('Сигнали', $tabs . $help . ($list ?: '<div class="card"><p class="muted">' . ($show === 'new' ? 'Няма нови сигнали. 🎉' : 'Още няма сигнали.') . '</p></div>'));
