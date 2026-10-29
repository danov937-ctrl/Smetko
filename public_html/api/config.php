<?php
/* GET → публичните настройки на сайта (цени, банер, безплатен план, данни на фирмата). */
declare(strict_types=1);
require __DIR__ . '/lib.php';
$c = site_config();
unset($c['blockedWords']);
if (!SALES_OPEN) unset($c['prices']); // цените не се показват, докато продажбите са спрени
$c['sales'] = SALES_OPEN;
foreach (['iban', 'bank', 'mol', 'phone'] as $k) unset($c['company'][$k]); // само за фактури в админ панела
$pd = paddle_cfg($c); // публично: само режимът, client-side token и price ID за текущия режим
$c['paddle'] = ['env' => $pd['env'], 'token' => $pd['token'], 'prices' => $pd['prices']];
header('Cache-Control: public, max-age=120');
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true, 'config' => $c], JSON_UNESCAPED_UNICODE);
