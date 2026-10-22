<?php
/* GET → публичните настройки на сайта (цени, банер, безплатен план, данни на фирмата). */
declare(strict_types=1);
require __DIR__ . '/lib.php';
$c = site_config();
unset($c['blockedWords']);
foreach (['iban', 'bank', 'mol', 'phone'] as $k) unset($c['company'][$k]); // само за фактури в админ панела
header('Cache-Control: public, max-age=120');
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true, 'config' => $c], JSON_UNESCAPED_UNICODE);
