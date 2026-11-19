<?php
// Рутер само за местния сървър: повтаря правилата от public_html/.htaccess,
// защото вграденият сървър на PHP не чете .htaccess.
$u = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$root = __DIR__ . '/../public_html';

$short = ['testove' => '/testove-po-matematika.html', 'kod' => '/kod.html', 'klasaciya' => '/klasaciya.html',
          'otchet' => '/otchet.html', 'liga' => '/liga.html', 'novini' => '/novini.html', 'za-nas' => '/za-nas.html',
          'vhod' => '/vhod.html', 'registracia' => '/registracia.html', 'profil' => '/profil.html',
          'tablo' => '/tablo.html', 'abonamenti' => '/pricing.html'];

if (preg_match('~^/blog/?$~', $u)) { $_SERVER['SCRIPT_NAME'] = '/blog/index.php'; require $root . '/blog/index.php'; return true; }
if (preg_match('~^/blog/([a-z0-9-]+)/?$~', $u, $m)) {
    $_GET['s'] = $m[1]; $_SERVER['SCRIPT_NAME'] = '/blog/index.php';
    require $root . '/blog/index.php'; return true;
}
if (preg_match('~^/matematika-([1-4])-klas/?$~', $u, $m)) { header('Location: /matematika-' . $m[1] . '-klas.html', true, 301); return true; }
if (preg_match('~^/class-([1-4])\.html$~', $u, $m)) { header('Location: /matematika-' . $m[1] . '-klas.html', true, 301); return true; }
if ($u === '/dogovor-pilot.html') { header('Location: /dogovor-uchilishte.html', true, 301); return true; }
if ($u === '/sitemap.xml') { require $root . '/sitemap.php'; return true; }
if ($u === '/admin' || $u === '/admin/') { header('Location: /admin/index.php', true, 302); return true; }

$key = trim($u, '/');
if (isset($short[$key])) { $u = $short[$key]; $_SERVER['REQUEST_URI'] = $u; }

$file = $root . $u;
if ($u !== '/' && is_file($file)) return false;              // статичен файл
if (is_dir($file) && is_file($file . '/index.php')) { require $file . '/index.php'; return true; }
if ($u === '/' || is_dir($file)) { require $root . rtrim($u, '/') . '/index.html'; return true; }

http_response_code(404);
require $root . '/404.html';
return true;
