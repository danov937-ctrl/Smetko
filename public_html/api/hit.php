<?php
/* Анонимна статистика за посещенията – САМО ако посетителят е приел „Статистика“ в банера за бисквитки.
   POST {p: адрес на страницата, r: сайт, от който е дошъл, n: 1 при ново посещение}
   Не се пазят IP адрес, бисквитка, идентификатор или браузър – само броячи по ден и страница. */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
$in = json_in();
$path = (string)($in['p'] ?? '/');
$path = preg_match('#^/[a-z0-9/._-]{0,80}$#i', $path) ? strtolower($path) : '/';
if ($path === '/index.html') $path = '/';
if (str_starts_with($path, '/admin') || str_starts_with($path, '/api')) json_out(['ok' => true]);
if (preg_match('#^/blog/[a-z0-9-]+$#', $path) === 0 && str_starts_with($path, '/blog/') && $path !== '/blog/') $path = '/blog/';
$ref = strtolower((string)($in['r'] ?? ''));
$ref = preg_match('/^[a-z0-9.-]{3,60}$/', $ref) ? preg_replace('/^(www\.|m\.|l\.)/', '', $ref) : '';
$new = !empty($in['n']) ? 1 : 0;
$ua = strtolower((string)($_SERVER['HTTP_USER_AGENT'] ?? ''));
if ($ua === '' || preg_match('/bot|crawl|spider|slurp|preview|headless|lighthouse/', $ua)) json_out(['ok' => true]); // роботи не се броят
$kind = preg_match('/ipad|tablet|(android(?!.*mobile))/', $ua) ? 'tablet' : (preg_match('/mobile|iphone|android/', $ua) ? 'mobile' : 'desktop');
$day = today(); $pdo = db();
try {
    $pdo->prepare('INSERT INTO stats_pages(day, path, views, visits) VALUES(?, ?, 1, ?) ON CONFLICT(day, path) DO UPDATE SET views = views + 1, visits = visits + excluded.visits')->execute([$day, $path, $new]);
    if ($new) $pdo->prepare('INSERT INTO stats_dev(day, kind, n) VALUES(?, ?, 1) ON CONFLICT(day, kind) DO UPDATE SET n = n + 1')->execute([$day, $kind]);
    if ($new && $ref !== '' && !str_ends_with($ref, 'smetko.com')) $pdo->prepare('INSERT INTO stats_refs(day, host, n) VALUES(?, ?, 1) ON CONFLICT(day, host) DO UPDATE SET n = n + 1')->execute([$day, $ref]);
} catch (Throwable $e) {}
json_out(['ok' => true]);
