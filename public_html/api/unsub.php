<?php
/* Отписване от седмичния имейл с един клик (линкът е в писмото; подписан е, за да не може да се отпише чужд акаунт).
   GET → страница с потвърждение; POST (List-Unsubscribe-Post от пощенската програма) → само отписва. ?on=1 – включва отново. */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require __DIR__ . '/weekly.php';
$aid = (int)($_GET['a'] ?? 0); $t = (string)($_GET['t'] ?? '');
$okTok = $aid > 0 && hash_equals(weekly_token($aid), $t);
$on = isset($_GET['on']) ? 1 : 0;
if ($okTok) db()->prepare('UPDATE accounts SET weekly = ? WHERE id = ?')->execute([$on, $aid]);
if ($_SERVER['REQUEST_METHOD'] === 'POST') { http_response_code($okTok ? 200 : 400); exit; }
header('Content-Type: text/html; charset=utf-8'); header('X-Robots-Tag: noindex');
$back = 'unsub.php?a=' . $aid . '&t=' . rawurlencode($t);
$msg = !$okTok ? ['Линкът не е валиден', 'Може да изключите седмичния имейл от <a href="/profil.html#settings">профила си</a>.']
    : ($on ? ['📬 Седмичният имейл е включен', 'Всеки понеделник ще получавате кратък отчет за напредъка. <a href="' . $back . '">Изключи го пак</a>']
           : ['Отписахте се от седмичния имейл', 'Повече няма да го получавате. Промени: <a href="' . $back . '&on=1">включи го отново</a> или от <a href="/profil.html#settings">профила</a>.']);
echo '<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Седмичен имейл – Сметко</title>' .
    '<style>body{margin:0;font-family:Nunito,"Segoe UI",Roboto,Arial,sans-serif;background:#EAF6FF;color:#33405F;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}.c{background:#fff;border-radius:26px;padding:32px 28px;max-width:440px;text-align:center;box-shadow:0 10px 30px rgba(29,43,79,.1)}h1{color:#1D2B4F;font-size:1.5rem;margin:8px 0 10px}a{color:#2F80ED;font-weight:800}.o{font-size:3rem}</style></head>' .
    '<body><div class="c"><div class="o">🦉</div><h1>' . $msg[0] . '</h1><p>' . $msg[1] . '</p><p><a href="/">← Към Сметко</a></p></div></body></html>';
