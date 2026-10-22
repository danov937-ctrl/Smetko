<?php
/* Блог: статии с прост редактор (Markdown), снимки, категории, публикуване по дата. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require __DIR__ . '/../api/blog_seed.php';
require_admin();
$pdo = db();
blog_seed($pdo);
$action = $_POST['action'] ?? '';
$id = (int)($_GET['id'] ?? $_POST['id'] ?? 0);

function save_upload(array $f): ?string { // снимка → /uploads/…
    if (empty($f['tmp_name']) || !is_uploaded_file($f['tmp_name']) || $f['size'] > 4 * 1024 * 1024) return null;
    $info = @getimagesize($f['tmp_name']);
    $ext = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'][$info[2] ?? 0] ?? null;
    if (!$ext) return null;
    $dir = __DIR__ . '/../uploads'; if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $name = 'blog-' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.' . $ext;
    return move_uploaded_file($f['tmp_name'], $dir . '/' . $name) ? '/uploads/' . $name : null;
}
if ($action === 'upload') { // снимка за вмъкване в текста (fetch)
    $u = save_upload($_FILES['file'] ?? []);
    header('Content-Type: application/json'); echo json_encode($u ? ['ok' => true, 'url' => $u] : ['ok' => false, 'error' => 'Само JPG, PNG, WEBP или GIF до 4 MB.']); exit;
}
if ($action === 'save') {
    $title = mb_substr(post('title'), 0, 160);
    if ($title === '') { flash('Попълнете заглавието.', 'err'); go('blog.php?' . ($id ? 'id=' . $id : 'new=1')); }
    $slug = slugify(post('slug') !== '' ? post('slug') : $title);
    $dup = $pdo->prepare('SELECT COUNT(*) FROM posts WHERE slug = ? AND id <> ?'); $dup->execute([$slug, $id]);
    if ((int)$dup->fetchColumn()) $slug .= '-' . date('md');
    $img = post('image');
    if (!empty($_FILES['image_file']['tmp_name'])) { $u = save_upload($_FILES['image_file']); if ($u) $img = $u; else flash('Снимката не е качена (само JPG, PNG, WEBP, GIF до 4 MB).', 'err'); }
    if (!empty($_POST['remove_image'])) $img = '';
    if ($img !== '' && !preg_match('#^(/uploads/|https?://)#', $img)) $img = '';
    $cat = in_array(post('category'), BLOG_CATS, true) ? post('category') : BLOG_CATS[0];
    $pub = preg_match('/^\d{4}-\d{2}-\d{2}$/', post('published_at')) ? post('published_at') : date('Y-m-d');
    $d = [$slug, $title, mb_substr(post('excerpt'), 0, 300), mb_substr((string)($_POST['body'] ?? ''), 0, 60000), mb_substr(post('emoji'), 0, 8) ?: '🦉', $img, $cat, empty($_POST['published']) ? 0 : 1, $pub, now()];
    if ($id) { $pdo->prepare('UPDATE posts SET slug=?, title=?, excerpt=?, body=?, emoji=?, image=?, category=?, published=?, published_at=?, updated_at=? WHERE id=?')->execute(array_merge($d, [$id])); audit('Редакция на статия', $title); }
    else { $pdo->prepare('INSERT INTO posts(slug, title, excerpt, body, emoji, image, category, published, published_at, updated_at, created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')->execute(array_merge($d, [now()])); $id = (int)$pdo->lastInsertId(); audit('Нова статия', $title); }
    if (empty($_SESSION['flash'])) flash($d[7] ? ($pub > today() ? 'Статията е запазена и ще се появи на ' . fdate($pub) . '.' : 'Статията е публикувана.') : 'Чернова – не се вижда на сайта.');
    go('blog.php?id=' . $id);
}
if ($action === 'delete' && $id) { $pdo->prepare('DELETE FROM posts WHERE id = ?')->execute([$id]); audit('Изтрита статия', "#$id"); flash('Статията е изтрита.'); go('blog.php'); }

if ($id || isset($_GET['new'])) {
    $p = ['slug' => '', 'title' => '', 'excerpt' => '', 'body' => '', 'emoji' => '🦉', 'image' => '', 'category' => BLOG_CATS[0], 'published' => 1, 'published_at' => date('Y-m-d'), 'views' => 0];
    if ($id) { $st = $pdo->prepare('SELECT * FROM posts WHERE id = ?'); $st->execute([$id]); $p = $st->fetch(); if (!$p) go('blog.php'); }
    $copts = ''; foreach (BLOG_CATS as $c) $copts .= '<option' . ($p['category'] === $c ? ' selected' : '') . '>' . h($c) . '</option>';
    $tb = ''; foreach ([['## ', 'Заглавие'], ['**', 'Удебелено'], ['*', 'Курсив'], ['- ', 'Списък'], ['1. ', 'Номериран'], ['> ', 'Цитат'], ['[]()', 'Връзка']] as [$m, $t]) $tb .= '<button type="button" class="ghost sm" data-md="' . h($m) . '">' . h($t) . '</button>';
    $body = '<form method="post" enctype="multipart/form-data" class="card">' . csrf_field() . '<input type="hidden" name="action" value="save"><input type="hidden" name="id" value="' . $id . '"><div class="grid g4">' .
        '<label style="grid-column:span 3">Заглавие<input name="title" required maxlength="160" value="' . h($p['title']) . '" placeholder="Как да помогнем на детето с таблицата за умножение"></label>' .
        '<label>Иконка<input name="emoji" maxlength="8" value="' . h($p['emoji']) . '"></label>' .
        '<label class="wide">Кратко описание (показва се в списъка и в Google)<input name="excerpt" maxlength="300" value="' . h($p['excerpt']) . '"></label>' .
        '<label>Категория<select name="category">' . $copts . '</select></label><label>Дата на публикуване<input type="date" name="published_at" value="' . h($p['published_at']) . '"></label>' .
        '<label style="grid-column:span 2">Адрес (по желание)<input name="slug" maxlength="80" value="' . h($p['slug']) . '" placeholder="автоматично от заглавието"></label>' .
        '<label style="grid-column:span 2">Снимка отгоре (по желание)<input type="file" name="image_file" accept="image/*"></label>' .
        '<div style="grid-column:span 2">' . ($p['image'] ? '<img src="' . h($p['image']) . '" style="max-height:90px;border-radius:10px"><label class="chk"><input type="checkbox" name="remove_image" value="1"> Махни снимката</label>' : '<p class="hint">Без снимка се показва иконката.</p>') . '<input type="hidden" name="image" value="' . h($p['image']) . '"></div>' .
        '<div class="wide"><div class="row" style="margin-bottom:6px">' . $tb . '<label class="btn ghost sm" style="margin:0;cursor:pointer">🖼 Снимка в текста<input type="file" id="inimg" accept="image/*" hidden></label></div>' .
        '<div class="grid g2"><label>Текст<textarea name="body" id="mdbody" style="min-height:420px;font-family:ui-monospace,Menlo,monospace;font-size:.88rem">' . h($p['body']) . '</textarea></label><div><b style="font-size:.86rem">Преглед</b><div id="mdprev" class="card" style="min-height:420px;max-height:560px;overflow:auto;border:2px solid #E2EAF6;box-shadow:none"></div></div></div>' .
        '<p class="hint">Пишете нормален текст. Празен ред = нов абзац. <b>## </b> в началото = подзаглавие, <b>- </b> = точка от списък, <b>**думи**</b> = удебелено, <b>[текст](адрес)</b> = връзка.</p></div>' .
        '<label class="chk"><input type="checkbox" name="published" value="1"' . ((int)$p['published'] ? ' checked' : '') . '> Публикувана (махнете за чернова)</label></div>' .
        '<div class="row"><button>💾 Запази</button>' . ($id && $p['published'] ? '<a class="btn ghost" target="_blank" href="../blog/' . h($p['slug']) . '">Виж на сайта ↗</a>' : '') . '<a class="btn ghost" href="blog.php">Отказ</a></div></form>' .
        ($id ? '<form method="post" class="row">' . csrf_field() . '<input type="hidden" name="id" value="' . $id . '"><button name="action" value="delete" class="red sm" data-confirm="Да изтрием ли статията?">🗑 Изтрий статията</button></form>' : '') .
        '<script>(function(){var ta=document.getElementById("mdbody"),pv=document.getElementById("mdprev");' .
        'function esc(s){return s.replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];});}' .
        'function inl(s){return s.replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g,"<img src=\"$2\" alt=\"$1\" style=\"max-width:100%;border-radius:10px\">").replace(/\[([^\]]+)\]\(([^\s)]+)\)/g,"<a href=\"$2\">$1</a>").replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g,"$1<i>$2</i>");}' .
        'function md(t){var o=[],l=null,p=[];function fl(){if(p.length){o.push("<p>"+inl(p.join("<br>"))+"</p>");p=[];}}function cl(){if(l){o.push("</"+l+">");l=null;}}esc(t).split(/\r?\n/).forEach(function(x){var s=x.trim(),m;if(!s){fl();cl();return;}if((m=s.match(/^(#{2,4})\s+(.+)$/))){fl();cl();o.push("<h"+m[1].length+">"+inl(m[2])+"</h"+m[1].length+">");return;}if((m=s.match(/^&gt;\s?(.*)$/))){fl();cl();o.push("<blockquote>"+inl(m[1])+"</blockquote>");return;}if((m=s.match(/^[-*•]\s+(.+)$/))){fl();if(l!=="ul"){cl();o.push("<ul>");l="ul";}o.push("<li>"+inl(m[1])+"</li>");return;}if((m=s.match(/^\d+[.)]\s+(.+)$/))){fl();if(l!=="ol"){cl();o.push("<ol>");l="ol";}o.push("<li>"+inl(m[1])+"</li>");return;}cl();p.push(s);});fl();cl();return o.join("");}' .
        'function run(){pv.innerHTML=md(ta.value)||"<p class=muted>Прегледът се появява тук.</p>";}ta.addEventListener("input",run);run();' .
        'function ins(a,b){var s=ta.selectionStart,e=ta.selectionEnd,v=ta.value,sel=v.slice(s,e);ta.value=v.slice(0,s)+a+sel+(b||"")+v.slice(e);ta.focus();ta.selectionStart=s+a.length;ta.selectionEnd=s+a.length+sel.length;run();}' .
        'document.querySelectorAll("[data-md]").forEach(function(b){b.addEventListener("click",function(){var m=b.getAttribute("data-md");if(m==="**"||m==="*")ins(m,m);else if(m==="[]()")ins("[","](https://)");else{var s=ta.value.lastIndexOf("\n",ta.selectionStart-1)+1;ta.selectionStart=ta.selectionEnd=s;ins(m);}});});' .
        'document.getElementById("inimg").addEventListener("change",function(){var f=this.files[0];if(!f)return;var fd=new FormData();fd.append("action","upload");fd.append("csrf",document.querySelector("[name=csrf]").value);fd.append("file",f);fetch("blog.php",{method:"POST",body:fd}).then(function(r){return r.json();}).then(function(j){if(j.ok)ins("\n![]("+j.url+")\n");else alert(j.error);});});})();</script>';
    page($id ? 'Статия' : 'Нова статия', $body, '<a class="btn ghost" href="blog.php">← Всички статии</a>');
}
$rows = '';
foreach ($pdo->query('SELECT * FROM posts ORDER BY published_at DESC, id DESC') as $p) {
    $state = !(int)$p['published'] ? '<span class="tag">чернова</span>' : ($p['published_at'] > today() ? '<span class="tag ty">от ' . fdate($p['published_at']) . '</span>' : '<span class="tag tg">публикувана</span>');
    $rows .= '<tr><td style="font-size:1.3rem">' . h($p['emoji']) . '</td><td><a href="?id=' . (int)$p['id'] . '"><b>' . h($p['title']) . '</b></a><br><small class="muted">' . h($p['category']) . '</small></td><td>' . fdate($p['published_at']) . '</td><td>' . $state . '</td><td class="num">' . (int)$p['views'] . '</td><td>' . ((int)$p['published'] ? '<a href="../blog/' . h($p['slug']) . '" target="_blank">виж ↗</a>' : '') . '</td></tr>';
}
page('Блог', '<div class="card">' . ($rows ? '<div class="tw"><table><thead><tr><th></th><th>Статия</th><th>Дата</th><th>Статус</th><th class="num">Прочитания</th><th></th></tr></thead><tbody>' . $rows . '</tbody></table></div>' : '<p>Още няма статии.</p>') .
    '<p class="hint">Статиите се виждат на <a href="../blog/" target="_blank">smetko.com/blog</a> и се намират в Google. Статия с бъдеща дата се появява сама на тази дата.</p></div>', '<a class="btn" href="?new=1">+ Нова статия</a>');
