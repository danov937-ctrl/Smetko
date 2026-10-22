<?php
/* sitemap.xml: статичните страници (sitemap-pages.xml) + статиите от блога. */
declare(strict_types=1);
require __DIR__ . '/api/lib.php';
header('Content-Type: application/xml; charset=utf-8');
$static = (string)@file_get_contents(__DIR__ . '/sitemap-pages.xml');
$urls = '';
try {
    $st = db()->prepare('SELECT slug, COALESCE(substr(updated_at, 1, 10), published_at) AS d FROM posts WHERE published = 1 AND published_at <= ? ORDER BY published_at DESC');
    $st->execute([today()]);
    foreach ($st as $p) $urls .= '  <url><loc>' . SITE_URL . '/blog/' . htmlspecialchars($p['slug']) . '</loc><lastmod>' . $p['d'] . '</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>' . "\n";
} catch (Throwable $e) {}
$urls .= '  <url><loc>' . SITE_URL . '/blog/</loc><lastmod>' . date('Y-m-d') . '</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>' . "\n";
echo str_replace('</urlset>', $urls . '</urlset>', $static);
