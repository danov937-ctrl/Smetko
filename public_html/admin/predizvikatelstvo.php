<?php
/* Седмично предизвикателство: тема за всеки клас (автоматично по ред или избрана от вас), участници и класация. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$action = $_POST['action'] ?? '';
if ($action === 'set') {
    $week = preg_match('/^\d{4}-W\d{2}$/', post('week')) ? post('week') : week_key();
    $g = max(1, min(4, (int)post('grade')));
    $pick = post('pick');
    if ($pick === 'auto') { $pdo->prepare('DELETE FROM challenges WHERE week = ? AND grade = ?')->execute([$week, $g]); audit('Предизвикателство автоматично', "$week · $g. клас"); }
    else {
        $pool = CHALLENGE_POOL[$g]; $i = (int)$pick;
        if (isset($pool[$i])) {
            $title = mb_substr(post('title'), 0, 60) ?: $pool[$i][0];
            $pdo->prepare('INSERT INTO challenges(week, grade, title, skills) VALUES(?, ?, ?, ?) ON CONFLICT(week, grade) DO UPDATE SET title = excluded.title, skills = excluded.skills')->execute([$week, $g, $title, json_encode($pool[$i][1])]);
            audit('Предизвикателство', "$week · $g. клас · $title");
        }
    }
    flash('Запазено.'); go('predizvikatelstvo.php');
}
$weeks = []; for ($i = 0; $i < 6; $i++) $weeks[] = week_of(date('Y-m-d', strtotime("+$i week")));
$cur = week_key();
$body = '<div class="card"><p class="hint">Всеки понеделник започва нова тема за всеки клас. Децата имат 60 секунди; целта е ' . CHALLENGE_GOAL . ' верни отговора (+50 точки и значка). Темите се сменят сами по ред, но може да изберете своя за всяка седмица.</p></div>';
foreach ($weeks as $w) {
    $mon = date('d.m', strtotime(substr($w, 0, 4) . 'W' . substr($w, -2) . '1'));
    $sun = date('d.m', strtotime(substr($w, 0, 4) . 'W' . substr($w, -2) . '7'));
    $rows = '';
    for ($g = 1; $g <= 4; $g++) {
        $c = challenge_for($w, $g);
        $opts = '<option value="auto">🔄 Автоматично</option>';
        foreach (CHALLENGE_POOL[$g] as $i => [$t]) $opts .= '<option value="' . $i . '"' . ($c['custom'] && $c['title'] === $t ? ' selected' : '') . '>' . h($t) . '</option>';
        $n = $pdo->prepare('SELECT COUNT(*), MAX(best), SUM(best >= ?) FROM challenge_scores WHERE week = ? AND grade = ?'); $n->execute([CHALLENGE_GOAL, $w, $g]); [$cnt, $max, $done] = $n->fetch(PDO::FETCH_NUM);
        $rows .= '<tr><td><b>' . $g . '. клас</b></td><td>' . h($c['title']) . ' ' . ($c['custom'] ? '<span class="tag tb">избрана</span>' : '<span class="tag">автоматично</span>') . '</td>' .
            ($w <= $cur ? '<td class="num">' . (int)$cnt . '</td><td class="num">' . (int)$done . '</td><td class="num">' . (int)$max . '</td>' : '<td colspan="3" class="muted">предстои</td>') .
            '<td><form method="post" class="row">' . csrf_field() . '<input type="hidden" name="action" value="set"><input type="hidden" name="week" value="' . $w . '"><input type="hidden" name="grade" value="' . $g . '"><select name="pick" style="width:auto">' . $opts . '</select><input name="title" placeholder="свое заглавие (по желание)" style="width:180px"><button class="sm ghost">Запази</button></form></td></tr>';
    }
    $body .= '<div class="card"><h2>' . ($w === $cur ? '⚡ Тази седмица' : 'Седмица ' . substr($w, -2)) . ' <small class="muted">' . $mon . ' – ' . $sun . '</small></h2><div class="tw"><table><thead><tr><th>Клас</th><th>Тема</th><th class="num">Играли</th><th class="num">Изпълнили</th><th class="num">Рекорд</th><th>Смяна</th></tr></thead><tbody>' . $rows . '</tbody></table></div></div>';
}
$top = '';
$st = $pdo->prepare('SELECT cs.grade, cs.best, r.nickname, b.label FROM challenge_scores cs JOIN redemptions r ON r.id = cs.rid JOIN codes c ON c.code = r.code JOIN batches b ON b.id = c.batch_id WHERE cs.week = ? ORDER BY cs.best DESC LIMIT 15'); $st->execute([$cur]);
foreach ($st as $r) $top .= '<tr><td>' . (int)$r['grade'] . '.</td><td>' . h($r['nickname'] ?: 'Играч') . '</td><td>' . h($r['label']) . '</td><td class="num">' . (int)$r['best'] . '</td></tr>';
$body .= '<div class="card"><h2>🏆 Най-добри тази седмица</h2>' . ($top ? '<table><thead><tr><th>Клас</th><th>Прякор</th><th>Партида</th><th class="num">Верни</th></tr></thead><tbody>' . $top . '</tbody></table>' : '<p class="muted">Още няма резултати.</p>') . '<p class="hint">Публичната класация е на <a href="../liga.html#challenge" target="_blank">smetko.com/liga.html#challenge</a>. Пуснете новина, за да напомните на децата!</p></div>';
page('Седмично предизвикателство', $body, '<a class="btn ghost" href="novini.php?new=1">📰 Новина за предизвикателството</a>');
