<?php
/* Пълни блога със статиите от api/blog_posts.php.
   Нова статия се добавя при първо извикване. Вече съществуваща се обновява САМО ако не е пипана
   от админ панела – това се познава по отпечатъка (posts.seed_hash) на текста, който сме записали.
   Редактирана от човек статия не се пренаписва никога. */
declare(strict_types=1);
require_once __DIR__ . '/blog_posts.php';
require_once __DIR__ . '/blog_posts2.php';

/* Отпечатъци на първите версии на статиите (качени, преди да има колоната seed_hash).
   Ако текстът в базата съвпада с някой от тях, статията не е пипана от човек и може да се обнови. */
const BLOG_LEGACY = ['0029f1ea8fd8bacb8578a29ca0bf2e21', 'd829012589f25de2e821b007274190f6', 'c0fe82065de476d78adabddd134b4a87',
    'eeb251f888e901fee3aed6af3362367a', '9e171ec8f4977c23e9ff81ea4133c057', '1ed2d42f782e1a4536c7a64a9a447329',
    '5b274f6eda62d19b4ec20eab8b6037a2', '487c6389fddbc6ac14e25c8cd3022e1c'];

function blog_sync(PDO $pdo): void {
    static $done = false;
    if ($done) return;
    $done = true;
    $rev = 'r4';                                   // вдигнете при промяна на текстовете
    if (setting('blog_rev') === $rev) return;
    $sel = $pdo->prepare('SELECT id, body, seed_hash FROM posts WHERE slug = ?');
    $ins = $pdo->prepare('INSERT INTO posts(slug, title, excerpt, body, emoji, category, published, published_at, created_at, updated_at, seed_hash) VALUES(?,?,?,?,?,?,1,?,?,?,?)');
    $upd = $pdo->prepare('UPDATE posts SET title = ?, excerpt = ?, body = ?, emoji = ?, category = ?, updated_at = ?, seed_hash = ? WHERE id = ?');
    foreach (blog_posts() as $p) {
        $body = trim((string)$p['body']);
        $hash = md5($body);
        $sel->execute([$p['slug']]);
        $old = $sel->fetch(); $sel->closeCursor();
        if (!$old) {
            $ins->execute([$p['slug'], $p['title'], $p['excerpt'], $body, $p['emoji'], $p['cat'],
                date('Y-m-d', strtotime($p['date'])), now(), now(), $hash]);
            continue;
        }
        $cur = (string)$old['body'];
        $mine = (string)$old['seed_hash'] !== '' ? md5(trim($cur)) === (string)$old['seed_hash']
            : (in_array(md5(trim($cur)), BLOG_LEGACY, true) || in_array(md5($cur), BLOG_LEGACY, true));
        if (!$mine) continue;                               // пипана е от админ панела – не я пипаме
        if (md5(trim($cur)) === $hash) continue;            // няма промяна
        $upd->execute([$p['title'], $p['excerpt'], $body, $p['emoji'], $p['cat'], now(), $hash, (int)$old['id']]);
    }
    set_setting('blog_rev', $rev);
}

/* старите имена – вече само извикват blog_sync() */
function blog_seed(PDO $pdo): void { blog_sync($pdo); }
function blog_seed2(PDO $pdo): void { blog_sync($pdo); }
function blog_seed3(PDO $pdo): void { blog_sync($pdo); }
