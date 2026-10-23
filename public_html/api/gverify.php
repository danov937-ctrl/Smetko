<?php
/* Потвърждение на собствеността в Google Search Console (метод „HTML файл“).
   Името на файла (напр. google1234abcd.html) се поставя в админ панела → Настройки → Google. */
declare(strict_types=1);
require __DIR__ . '/lib.php';
$f = (string)($_GET['f'] ?? '');
$want = (string)(site_config()['google']['gsc'] ?? '');
if ($want === '' || !hash_equals($want, $f)) { http_response_code(404); exit('Not found'); }
header('Content-Type: text/html; charset=utf-8');
echo 'google-site-verification: ' . $want;
