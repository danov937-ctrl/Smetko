<?php
/* Картички с кодове за печат: A4, 4 картички (A6) на страница. */
declare(strict_types=1);
require __DIR__ . '/../api/lib.php';
session_name('smetko_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => '/admin/', 'secure' => !empty($_SERVER['HTTPS']), 'httponly' => true, 'samesite' => 'Strict']);
session_start();
if (empty($_SESSION['admin'])) { header('Location: ./'); exit; }
header('Cache-Control: no-store');
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

$bid = (int)($_GET['batch'] ?? 0);
$st = db()->prepare("SELECT * FROM codes WHERE batch_id = ? AND revoked = 0 ORDER BY CASE WHEN role = 'teacher' THEN 0 ELSE 1 END, created_at, code"); $st->execute([$bid]);
$codes = $st->fetchAll();
$site = 'smetko.com';
$cards = '';
foreach ($codes as $i => $c) {
    $exp = date('d.m.Y', strtotime($c['expires_at']));
    $isT = ($c['role'] ?? '') === 'teacher';
    $qr = '<div class="qr" data-qr="https://' . $site . '/kod.html?c=' . h(urlencode($c['code'])) . '"></div>';
    if ($isT) { // картичка за учителя: личен код + ПИН за класацията
        $cards .= '<div class="card t-teach">
      <div class="sky"><div class="cl c1"></div><div class="cl c2"></div><div class="owl" data-owl="think"></div>
        <div class="brand"><span>С</span><span>м</span><span>е</span><span>т</span><span>к</span><span>о</span></div><div class="slogan">Картичка за учителя</div></div>
      <div class="body">
        <div class="ttl">Класация на класа</div>
        <div class="tk"><div><small>Код на учителя</small><b>' . h($c['code']) . '</b></div><div><small>ПИН</small><b>' . h($c['pin']) . '</b></div></div>
        <div class="row"><ol><li>Отвори <b>' . $site . '/klasaciya</b></li><li>Въведи кода и ПИН-а</li><li>Виж точките и мисиите на всички ученици</li></ol>' . $qr . '</div>
        <div class="pin">Кодът важи и като <b>твой пълен достъп</b> на едно устройство (сканирай QR кода).<small>Не показвайте ПИН-а на учениците · валидно до ' . $exp . '</small></div>' .
        ($c['label'] ? '<div class="lbl">' . h($c['label']) . '</div>' : '') . '
      </div></div>';
        continue;
    }
    $isClass = $c['type'] === 'class';
    $title = ['class' => 'Код за ученик', 'teacher' => 'Код за учител', 'single' => 'Подаръчен код', 'family' => 'Семеен код'][$c['type']] ?? 'Код за достъп';
    $what = 'Еднократен код: активира се само на едно устройство. Пази картичката!';
    $cards .= '<div class="card t-' . h($c['type']) . '">
      <div class="sky"><div class="cl c1"></div><div class="cl c2"></div><div class="owl" data-owl="' . ($i % 3 === 0 ? 'hero' : ($i % 3 === 1 ? 'cheer' : 'hello')) . '"></div>
        <div class="brand"><span>С</span><span>м</span><span>е</span><span>т</span><span>к</span><span>о</span></div><div class="slogan">Математика като игра · 1.–4. клас</div></div>
      <div class="body">
        <div class="ttl">' . h($title) . '</div>
        <div class="code">' . h($c['code']) . '</div>
        <div class="what">' . h($what) . '</div>
        <div class="row"><ol><li>Отвори <b>' . $site . '/kod</b></li><li>Въведи кода' . ($isClass ? ' и прякор' : '') . '</li><li>Играй до <b>' . $exp . '</b></li></ol>' . $qr . '</div>' .
        ($isClass ? '<div class="pin">🏆 Точките ти влизат в класацията на класа.<small>Прякор без фамилия · пълен достъп до всички мисии и игри</small></div>' : '') .
        ($c['label'] ? '<div class="lbl">' . h($c['label']) . '</div>' : '') . '
      </div></div>';
}
?><!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Картички – Сметко</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Nunito, Arial, sans-serif; background: #ccd; color: #1E3A8A; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.bar { position: sticky; top: 0; background: #1E3A8A; color: #fff; padding: 10px 16px; display: flex; gap: 12px; align-items: center; z-index: 5; font-weight: 800; }
.bar button { background: #FF7B00; color: #fff; border: 0; border-radius: 999px; padding: 8px 18px; font: inherit; cursor: pointer; }
.sheet { width: 210mm; height: 297mm; margin: 10mm auto; background: #fff; display: grid; grid-template-columns: 105mm 105mm; grid-template-rows: 148.5mm 148.5mm; page-break-after: always; }
.card { position: relative; overflow: hidden; border: 1px dashed #c7cfdc; display: flex; flex-direction: column; }
.sky { position: relative; height: 62mm; background: linear-gradient(180deg, #3D98FF, #A2D2FF); overflow: hidden; }
.sky::after { content: ''; position: absolute; left: -10%; right: -10%; bottom: -14mm; height: 26mm; background: #88D43B; border-radius: 50% 50% 0 0; box-shadow: 0 -4mm 0 #A9DF51 inset; }
.cl { position: absolute; background: #fff; border-radius: 99px; opacity: .9; } .c1 { width: 20mm; height: 6mm; top: 5mm; left: 34mm; } .c2 { width: 14mm; height: 5mm; top: 46mm; left: 8mm; opacity: .7; }
.owl { position: absolute; right: 4mm; bottom: 2mm; width: 38mm; z-index: 2; }
.brand { position: absolute; left: 7mm; top: 18mm; font-size: 30pt; font-weight: 900; background: #fff; border-radius: 99px; padding: 0 4mm; line-height: 1.25; z-index: 2; }
.brand span:nth-child(1){color:#FF5A5F}.brand span:nth-child(2){color:#FF7B00}.brand span:nth-child(3){color:#E0A500}.brand span:nth-child(4){color:#4CBB4A}.brand span:nth-child(5){color:#3299FF}.brand span:nth-child(6){color:#8E6CF0}
.slogan { position: absolute; left: 8mm; top: 36mm; color: #fff; font-weight: 900; font-size: 10pt; text-shadow: 0 1px 2px rgba(0,0,0,.25); z-index: 2; max-width: 50mm; }
.body { padding: 4mm 7mm 5mm; flex: 1; display: flex; flex-direction: column; }
.ttl { font-weight: 900; font-size: 11pt; color: #FF7B00; text-transform: uppercase; letter-spacing: .06em; }
.code { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 800; font-size: 19pt; letter-spacing: .06em; color: #1E3A8A; background: #F0F7FF; border: 2px solid #E1EDFA; border-radius: 4mm; text-align: center; padding: 2mm 0; margin: 2mm 0; }
.what { font-weight: 800; font-size: 9pt; }
.row { display: flex; gap: 3mm; align-items: center; margin-top: 2mm; }
.row ol { margin: 0; padding-left: 5mm; font-size: 9pt; font-weight: 700; flex: 1; }
.qr { width: 22mm; height: 22mm; flex: none; } .qr img, .qr canvas { width: 100% !important; height: 100% !important; }
.pin { margin-top: auto; background: #FFF4D6; border-radius: 3mm; padding: 2mm 3mm; font-size: 9.5pt; font-weight: 800; }
.pin small { display: block; font-size: 7pt; font-weight: 700; color: #6B5B2A; }
.lbl { font-size: 7pt; color: #8090A8; margin-top: 1.5mm; text-align: right; }
.t-single .sky, .t-family .sky { background: linear-gradient(180deg, #8E6CF0, #C9B8FF); }
.t-teacher .sky { background: linear-gradient(180deg, #00A88F, #7FE0CF); }
.t-teach .sky { background: linear-gradient(180deg, #FF8A2A, #FFC97A); }
.t-teach .ttl { color: #E06A00; }
.tk { display: grid; grid-template-columns: 1fr auto; gap: 2mm; margin: 2mm 0; }
.tk div { background: #FFF4D6; border: 2px solid #FFE3A3; border-radius: 4mm; padding: 1.5mm 3mm; text-align: center; }
.tk small { display: block; font-size: 7pt; font-weight: 800; color: #8A6A1E; text-transform: uppercase; letter-spacing: .05em; }
.tk b { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 15pt; letter-spacing: .05em; }
.tk div:last-child b { font-size: 19pt; color: #E06A00; }
@media print { body { background: #fff; } .bar { display: none; } .sheet { margin: 0; } }
</style></head><body>
<div class="bar"><span><?= count($codes) ?> картички<?= ($codes && $codes[0]['type'] === 'class') ? ' (първата е за учителя)' : '' ?> · печат на A4, без полета (Margins: None), с фонови цветове</span><button onclick="window.print()">🖨️ Печат</button></div>
<?php
$all = array_values(array_filter(explode('<!--CARD-->', str_replace('<div class="card ', '<!--CARD--><div class="card ', $cards))));
foreach (array_chunk($all, 4) as $page) echo '<div class="sheet">' . implode('', $page) . '</div>';
if (!$all) echo '<p style="padding:40px">Няма активни кодове в тази партида.</p>';
?>
<script src="../js/owl.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
document.querySelectorAll('[data-owl]').forEach(function (el) { el.innerHTML = Smetko.owl(el.getAttribute('data-owl')); });
if (window.QRCode) document.querySelectorAll('[data-qr]').forEach(function (el) { new QRCode(el, { text: el.getAttribute('data-qr'), width: 160, height: 160, colorDark: '#1E3A8A', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M }); });
</script>
</body></html>
