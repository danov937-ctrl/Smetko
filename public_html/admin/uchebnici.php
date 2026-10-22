<?php
/* Учебници: вградените (от годишните разпределения) и добавени от тук – с поставяне на списъка с уроци. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();
$action = $_POST['action'] ?? '';
$id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);

if ($action === 'save') {
    $grade = max(1, min(4, (int)post('grade', '1')));
    $pub = mb_substr(post('publisher'), 0, 60);
    $title = mb_substr(post('title'), 0, 120) ?: 'Математика за ' . $grade . '. клас';
    $lessons = implode("\n", array_values(array_filter(array_map(fn($l) => trim(preg_replace('/^\s*\d{1,3}[.)]\s*/u', '', $l) ?? ''), preg_split('/\r?\n/', (string)($_POST['lessons'] ?? '')) ?: []), fn($l) => $l !== '')));
    if ($pub === '' || $lessons === '') { flash('Попълнете издателството и уроците.', 'err'); go('uchebnici.php?' . ($id ? 'id=' . $id : 'new=1')); }
    $bid = post('bid');
    if (!preg_match('/^[a-z0-9]{2,20}$/', $bid)) {
        $tr = ['а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e', 'ж' => 'j', 'з' => 'z', 'и' => 'i', 'й' => 'i', 'к' => 'k', 'л' => 'l', 'м' => 'm', 'н' => 'n', 'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u', 'ф' => 'f', 'х' => 'h', 'ц' => 'c', 'ч' => 'ch', 'ш' => 'sh', 'щ' => 'sht', 'ъ' => 'a', 'ь' => '', 'ю' => 'yu', 'я' => 'ya'];
        $bid = substr(preg_replace('/[^a-z0-9]/', '', strtr(mb_strtolower($pub), $tr)) ?: 'book', 0, 12) . $grade;
    }
    if ($id) {
        $pdo->prepare('UPDATE books SET grade=?, bid=?, publisher=?, title=?, source=?, lessons=?, active=? WHERE id=?')->execute([$grade, $bid, $pub, $title, mb_substr(post('source'), 0, 300), $lessons, empty($_POST['active']) ? 0 : 1, $id]);
        audit('Редакция на учебник', "$pub $grade. клас");
    } else {
        $n = $pdo->prepare('SELECT COUNT(*) FROM books WHERE bid = ?'); $n->execute([$bid]);
        if ((int)$n->fetchColumn()) $bid .= 'b';
        $pdo->prepare('INSERT INTO books(grade, bid, publisher, title, source, lessons, active, created_at) VALUES(?,?,?,?,?,?,?,?)')->execute([$grade, $bid, $pub, $title, mb_substr(post('source'), 0, 300), $lessons, empty($_POST['active']) ? 0 : 1, now()]);
        $id = (int)$pdo->lastInsertId();
        audit('Нов учебник', "$pub $grade. клас · " . substr_count($lessons, "\n") + 1 . ' урока');
    }
    flash('Учебникът е запазен' . (empty($_POST['active']) ? ' (скрит).' : ' и вече се вижда в играта.')); go('uchebnici.php?id=' . $id);
}
if ($action === 'delete' && $id) { $pdo->prepare('DELETE FROM books WHERE id = ?')->execute([$id]); audit('Изтрит учебник', "#$id"); flash('Учебникът е изтрит.'); go('uchebnici.php'); }

$scripts = '<script src="../js/math-engine.js"></script><script src="../js/lesson-map.js"></script><script src="../js/textbooks.js"></script>';
if ($id || isset($_GET['new'])) {
    $b = ['grade' => 1, 'bid' => '', 'publisher' => '', 'title' => '', 'source' => '', 'lessons' => '', 'active' => 1];
    if ($id) { $st = $pdo->prepare('SELECT * FROM books WHERE id = ?'); $st->execute([$id]); $b = $st->fetch(); if (!$b) go('uchebnici.php'); }
    $gopts = ''; for ($g = 1; $g <= 4; $g++) $gopts .= '<option value="' . $g . '"' . ((int)$b['grade'] === $g ? ' selected' : '') . '>' . $g . '. клас</option>';
    $body = '<form method="post" class="card">' . csrf_field() . '<input type="hidden" name="action" value="save"><input type="hidden" name="id" value="' . $id . '"><div class="grid g4">' .
        '<label>Клас<select name="grade" id="grade">' . $gopts . '</select></label><label>Издателство<input name="publisher" required maxlength="60" value="' . h($b['publisher']) . '" placeholder="Клет"></label>' .
        '<label>Заглавие<input name="title" maxlength="120" value="' . h($b['title']) . '" placeholder="Математика за 2. клас"></label><label>Код (латиница, по желание)<input name="bid" maxlength="20" value="' . h($b['bid']) . '" placeholder="klet2"></label>' .
        '<label class="wide">Източник (линк към разпределението, по желание)<input name="source" maxlength="300" value="' . h($b['source']) . '"></label>' .
        '<label class="wide">Уроци – по един на ред, в реда от годишното разпределение (номерата отпред се махат сами)<textarea name="lessons" id="lessons" style="min-height:320px" placeholder="Числата до 20. Преговор&#10;Събиране и изваждане до 20 без преминаване&#10;Входно ниво&#10;…">' . h($b['lessons']) . '</textarea></label>' .
        '<label class="chk"><input type="checkbox" name="active" value="1"' . ((int)$b['active'] ? ' checked' : '') . '> Показвай в играта</label></div>' .
        '<p class="hint">Отворете годишното разпределение (PDF/Word), копирайте колоната с темите на уроците и я поставете тук. Всеки ред става мисия; задачите се избират автоматично по заглавието. Прегледът долу се обновява, докато пишете.</p>' .
        '<div class="row"><button>💾 Запази</button><a class="btn ghost" href="uchebnici.php">Отказ</a>' . ($id ? '</div></form><form method="post" class="row" style="margin:-8px 0 16px">' . csrf_field() . '<input type="hidden" name="id" value="' . $id . '"><button name="action" value="delete" class="red sm" data-confirm="Да изтрием ли учебника? Звездите на децата по него ще се загубят.">🗑 Изтрий учебника</button></form>' : '</div></form>') .
        '<div class="card"><h2>Преглед на мисиите <small class="muted" id="pv-count"></small></h2><div class="tw"><table><thead><tr><th>#</th><th>Мисия</th><th>Ниво</th><th>Задачи</th><th>Пример</th></tr></thead><tbody id="pv"></tbody></table></div><p class="hint">Ако урок не е разпознат, той става преговор на предходните уроци (сиво). Може да уточните заглавието, напр. „Събиране до 10“ вместо „Упражнение“.</p></div>' .
        $scripts . '<script>(function(){var ta=document.getElementById("lessons"),gr=document.getElementById("grade"),pv=document.getElementById("pv"),E=Smetko.MathEngine,LM=Smetko.LessonMap;' .
        'function esc(s){return String(s).replace(/[&<>]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}' .
        'function run(){var g=+gr.value,lines=ta.value.split("\n").map(function(l){return l.replace(/^\s*\d{1,3}[.)]\s*/,"").trim();}).filter(Boolean),ms=LM.build(g,lines),h="";' .
        'ms.forEach(function(m,i){var ex="";try{var t=E.generateFrom(g,m[1],m[2]);ex=(t.q||"").replace(/<[^>]+>/g,"").replace("{?}","□").slice(0,60);}catch(e){ex="⚠ "+e.message;}' .
        'var rev=/упражнение|обобщение|преговор|ниво|блицтурнир|уча и играя|проект|знам и мога/i.test(m[0])&&m[2]>1;h+="<tr"+(rev?" style=\"color:#7A879F\"":"")+"><td>"+(i+1)+"</td><td>"+esc(m[0])+"</td><td>"+["","лесно","средно","трудно"][m[2]]+"</td><td>"+m[1].map(function(s){return esc(LM.skillTitle(s[0]));}).join(", ")+"</td><td class=\"muted\">"+esc(ex)+"</td></tr>";});' .
        'pv.innerHTML=h||"<tr><td colspan=5 class=muted>Поставете уроците горе.</td></tr>";document.getElementById("pv-count").textContent=ms.length?"("+ms.length+" мисии)":"";}' .
        'var tm;ta.addEventListener("input",function(){clearTimeout(tm);tm=setTimeout(run,300);});gr.addEventListener("change",run);run();})();</script>';
    page($id ? $b['publisher'] . ' · ' . $b['grade'] . '. клас' : 'Нов учебник', $body, '<a class="btn ghost" href="uchebnici.php">← Всички учебници</a>');
}

$own = '';
foreach ($pdo->query('SELECT * FROM books ORDER BY grade, publisher') as $b) {
    $n = count(array_filter(explode("\n", (string)$b['lessons']), fn($l) => trim($l) !== ''));
    $own .= '<tr><td>' . (int)$b['grade'] . '.</td><td><a href="?id=' . (int)$b['id'] . '"><b>' . h($b['publisher']) . '</b></a> <small class="muted">' . h($b['title']) . '</small></td><td class="num">' . $n . '</td><td>' . ((int)$b['active'] ? '<span class="tag tg">в играта</span>' : '<span class="tag">скрит</span>') . '</td><td class="mono">' . h($b['bid']) . '</td></tr>';
}
$body = '<div class="card"><h2>Добавени от тук</h2>' . ($own ? '<div class="tw"><table><thead><tr><th>Клас</th><th>Учебник</th><th class="num">Мисии</th><th>Статус</th><th>Код</th></tr></thead><tbody>' . $own . '</tbody></table></div>' : '<p>Още няма. Добавете учебник, като поставите списъка с уроците от годишното му разпределение – мисиите се правят автоматично.</p>') .
    '<p><a class="btn" href="?new=1">+ Добави учебник</a></p><p class="hint">Ако добавите учебник със същия код като вграден (напр. „bit2“), вашият го заменя.</p></div>' .
    '<div class="card"><h2>Вградени учебници</h2><div class="tw"><table><thead><tr><th>Клас</th><th>Учебник</th><th class="num">Мисии</th><th>Код</th><th>Източник</th></tr></thead><tbody id="builtin"></tbody></table></div></div>' . $scripts .
    '<script>(function(){var h="";[1,2,3,4].forEach(function(g){Smetko.Books.list(g).forEach(function(b){if(b.custom)return;h+="<tr><td>"+g+".</td><td><b>"+b.publisher+"</b> <small class=muted>"+b.title+"</small></td><td class=num>"+b.missions.length+"</td><td class=mono>"+b.id+"</td><td>"+(b.source?"<a target=_blank href=\""+b.source+"\">разпределение ↗</a>":"")+"</td></tr>";});});document.getElementById("builtin").innerHTML=h;})();</script>';
page('Учебници и мисии', $body, '<a class="btn" href="?new=1">+ Добави учебник</a>');
