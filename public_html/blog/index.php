<?php
/* Блог на Сметко: списък със статии (/blog/) и отделна статия (/blog/<адрес>). Шаблонът е blog/_layout.html (генерира се от tools/build.py). */
declare(strict_types=1);
require __DIR__ . '/../api/lib.php';
require __DIR__ . '/../api/blog_seed.php';
$pdo = db();
blog_seed($pdo);
blog_seed2($pdo);
blog_seed3($pdo);

function e($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function bdate(?string $d): string {
    if (!$d) return '';
    $m = ['', 'януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];
    $t = strtotime($d); return (int)date('j', $t) . ' ' . $m[(int)date('n', $t)] . ' ' . date('Y', $t);
}
function render(string $title, string $desc, string $canon, string $body, string $headExtra = '', int $status = 200): void {
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: public, max-age=300');
    $tpl = (string)@file_get_contents(__DIR__ . '/_layout.html');
    echo strtr($tpl, ['{{TITLE}}' => e($title), '{{DESC}}' => e($desc), '{{CANON}}' => e($canon), '{{HEAD}}' => $headExtra, '{{BODY}}' => $body]);
    exit;
}
function hero(string $h1, string $lead, string $crumb): string {
    return '<section class="page-hero"><span class="cloud c1"></span><span class="cloud c2"></span><div class="wrap"><div><div class="breadcrumbs"><a href="/">Начало</a> › ' . $crumb . '</div><h1>' . $h1 . '</h1><p class="lead">' . $lead . '</p></div><div class="owl" data-owl="think"></div></div></section>';
}
function card(array $p): string {
    $img = $p['image'] ? '<img src="' . e($p['image']) . '" alt="" loading="lazy">' : '<span class="bc-emo">' . e($p['emoji'] ?: '🦉') . '</span>';
    return '<a class="blog-card" href="blog/' . e($p['slug']) . '"><div class="bc-cover">' . $img . '</div><div class="bc-body"><span class="bc-cat">' . e($p['category']) . '</span><h3>' . e($p['title']) . '</h3><p>' . e($p['excerpt']) . '</p><span class="bc-date">' . bdate($p['published_at']) . '</span></div></a>';
}

$slug = preg_replace('/[^a-z0-9-]/', '', (string)($_GET['s'] ?? ''));
if ($slug !== '') {
    $st = $pdo->prepare('SELECT * FROM posts WHERE slug = ? AND published = 1 AND published_at <= ?'); $st->execute([$slug, today()]);
    $p = $st->fetch();
    if (!$p) render('Статията не е намерена – Сметко', 'Тази статия не съществува.', SITE_URL . '/blog/', hero('Няма такава статия', 'Може би е преместена. Вижте другите статии в блога.', '<a href="blog/">Блог</a>') . '<section class="section"><div class="wrap" style="text-align:center"><a class="btn" href="blog/">← Към блога</a></div></section>', '<meta name="robots" content="noindex">', 404);
    $pdo->prepare('UPDATE posts SET views = views + 1 WHERE id = ?')->execute([(int)$p['id']]);
    $more = $pdo->prepare('SELECT * FROM posts WHERE published = 1 AND published_at <= ? AND id <> ? ORDER BY (category = ?) DESC, published_at DESC LIMIT 3'); $more->execute([today(), (int)$p['id'], $p['category']]);
    $rel = implode('', array_map('card', $more->fetchAll()));
    $url = SITE_URL . '/blog/' . $p['slug'];
    $html = md_to_html((string)$p['body']);
    $words = count(preg_split('/\s+/u', trim(strip_tags($html))) ?: []);
    $mins = max(1, (int)round($words / 180));
    $upd = substr((string)$p['updated_at'], 0, 10);
    $meta = '<span class="bc-cat">' . e($p['category']) . '</span> · <time datetime="' . e($p['published_at']) . '">' . bdate($p['published_at']) . '</time> · ' . $mins . ' мин. четене'
        . ($upd && strtotime($upd) > strtotime((string)$p['published_at'] . ' +7 days') ? ' · <span class="bp-upd">обновена на ' . bdate($upd) . '</span>' : '');
    // съдържание: от заглавията в статията (само когато са поне три)
    preg_match_all('/<h2 id="([^"]+)">(.*?)<\/h2>/s', $html, $hs, PREG_SET_ORDER);
    $toc = '';
    if (count($hs) >= 3) {
        $li = '';
        foreach ($hs as $h) $li .= '<li><a href="#' . $h[1] . '">' . strip_tags($h[2]) . '</a></li>';
        $toc = '<nav class="bp-toc" aria-label="Съдържание на статията"><b>В статията</b><ol>' . $li . '</ol></nav>';
    }
    $ld = ['@context' => 'https://schema.org', '@type' => 'BlogPosting', 'headline' => $p['title'], 'description' => $p['excerpt'], 'datePublished' => $p['published_at'], 'dateModified' => $upd ?: $p['published_at'],
        'mainEntityOfPage' => $url, 'wordCount' => $words, 'inLanguage' => 'bg', 'articleSection' => $p['category'],
        'author' => ['@type' => 'Organization', 'name' => 'Сметко', 'url' => SITE_URL], 'publisher' => ['@type' => 'Organization', 'name' => 'Сметко', 'logo' => ['@type' => 'ImageObject', 'url' => SITE_URL . '/assets/icons/icon-512.png']]];
    if ($p['image']) $ld['image'] = (str_starts_with($p['image'], 'http') ? '' : SITE_URL) . $p['image'];
    $crumbLd = ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => [
        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Начало', 'item' => SITE_URL . '/'],
        ['@type' => 'ListItem', 'position' => 2, 'name' => 'Блог', 'item' => SITE_URL . '/blog/'],
        ['@type' => 'ListItem', 'position' => 3, 'name' => $p['title'], 'item' => $url]]];
    $body = '<article class="section"><div class="wrap prose blog-post"><div class="breadcrumbs dark"><a href="/">Начало</a> › <a href="blog/">Блог</a> › ' . e($p['category']) . '</div>' .
        '<p class="bp-meta">' . $meta . '</p><h1>' . ($p['image'] ? '' : '<span class="bp-emo">' . e($p['emoji']) . '</span> ') . e($p['title']) . '</h1>' .
        '<p class="bp-lead">' . e($p['excerpt']) . '</p>' . ($p['image'] ? '<img class="bp-cover" src="' . e($p['image']) . '" alt="">' : '') . $toc . '<div class="bp-body">' . $html . '</div>' .
        '<p class="bp-author">✍️ Написано от екипа на <a href="za-nas.html">Сметко</a> – математика като игра за 1.–4. клас.</p>' .
        '<div class="bp-cta"><div data-owl="cheer" class="bp-owl"></div><div><b>Опитайте Сметко безплатно</b><p>Мисии по учебника на детето, бързо смятане и класации – без реклами.</p><a class="btn btn-green" href="game.html">🎮 Играй сега</a></div></div>' .
        '<p class="bp-share"><button class="btn btn-ghost btn-sm" onclick="if(navigator.share){navigator.share({title:document.title,url:location.href})}else{navigator.clipboard.writeText(location.href);this.textContent=\'✓ Връзката е копирана\'}">🔗 Сподели</button> <a class="btn btn-ghost btn-sm" href="blog/">← Всички статии</a></p></div></article>' .
        ($rel ? '<section class="section soft"><div class="wrap"><div class="section-head"><h2 class="lined">Още статии</h2></div><div class="blog-grid">' . $rel . '</div></div></section>' : '');
    render($p['title'] . ' – Блог на Сметко', (string)$p['excerpt'], $url, $body, '<meta property="og:type" content="article">'
        . '<script type="application/ld+json">' . json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>'
        . '<script type="application/ld+json">' . json_encode($crumbLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>');
}

$cat = (string)($_GET['k'] ?? '');
$args = [today()];
$where = 'published = 1 AND published_at <= ?';
if (in_array($cat, BLOG_CATS, true)) { $where .= ' AND category = ?'; $args[] = $cat; }
$st = $pdo->prepare("SELECT * FROM posts WHERE $where ORDER BY published_at DESC, id DESC LIMIT 60"); $st->execute($args);
$posts = $st->fetchAll();
$used = $pdo->prepare('SELECT DISTINCT category FROM posts WHERE published = 1 AND published_at <= ?'); $used->execute([today()]);
$cats = '<a class="chip' . ($cat === '' ? ' on' : '') . '" href="blog/">Всички</a>';
foreach ($used->fetchAll(PDO::FETCH_COLUMN) as $c) $cats .= '<a class="chip' . ($cat === $c ? ' on' : '') . '" href="blog/?k=' . rawurlencode((string)$c) . '">' . e($c) . '</a>';

$h1 = $cat !== '' ? e($cat) : 'Блог за математиката в началното училище';
$lead = $cat !== '' ? 'Статии в рубриката „' . e($cat) . '“.'
    : 'Какво да правим, когато детето се запъне: обяснения стъпка по стъпка, планове за подготовка и игри с числа у дома. Пишем за 1.–4. клас, по учебната програма на МОН.';
$intro = $cat !== '' ? '' : '<section class="section"><div class="wrap narrow-wrap prose">'
    . '<p class="lead-dark">Всяка статия тук отговаря на въпрос, който сме чували от родител или учител. Ако търсите задачи, а не четиво, вижте <a href="testove-po-matematika.html">тестовете по теми</a>, '
    . '<a href="tablica-za-umnozhenie.html">таблицата за умножение</a> или <a href="nvo-4-klas-matematika.html">подготовката за НВО в 4. клас</a>.</p></div></section>';
$body = hero($h1, $lead, $cat !== '' ? '<a href="blog/">Блог</a> › ' . e($cat) : 'Блог') . $intro .
    '<section class="section"><div class="wrap"><div class="blog-cats">' . $cats . '</div>' .
    ($posts ? '<div class="blog-grid">' . implode('', array_map('card', $posts)) . '</div>' : '<p class="lead-dark" style="text-align:center">Скоро тук ще има статии.</p>') . '</div></section>';

$listLd = ['@context' => 'https://schema.org', '@type' => 'Blog', 'name' => 'Блог на Сметко', 'inLanguage' => 'bg',
    'url' => SITE_URL . '/blog/', 'publisher' => ['@type' => 'Organization', 'name' => 'Сметко', 'url' => SITE_URL],
    'blogPost' => array_map(fn($x) => ['@type' => 'BlogPosting', 'headline' => $x['title'], 'url' => SITE_URL . '/blog/' . $x['slug'],
        'datePublished' => $x['published_at'], 'description' => $x['excerpt']], array_slice($posts, 0, 20))];
$crumb = ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => array_values(array_filter([
    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Начало', 'item' => SITE_URL . '/'],
    ['@type' => 'ListItem', 'position' => 2, 'name' => 'Блог', 'item' => SITE_URL . '/blog/'],
    $cat !== '' ? ['@type' => 'ListItem', 'position' => 3, 'name' => $cat, 'item' => SITE_URL . '/blog/?k=' . rawurlencode($cat)] : null]))];
$title = $cat !== '' ? $cat . ' – блог на Сметко' : 'Блог за математиката в 1.–4. клас | Сметко';
$desc = $cat !== '' ? 'Статии в рубриката „' . $cat . '“ от блога на Сметко: математика за 1.–4. клас, съвети за родители и учители.'
    : 'Съвети за родители и учители: как детето да обикне математиката, таблицата за умножение без сълзи, текстовите задачи, подготовката за НВО и игри с числа у дома.';
render($title, $desc, SITE_URL . '/blog/' . ($cat !== '' ? '?k=' . rawurlencode($cat) : ''), $body,
    '<script type="application/ld+json">' . json_encode($listLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>'
    . '<script type="application/ld+json">' . json_encode($crumb, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . '</script>');
