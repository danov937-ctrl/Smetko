<?php
/* Настройки на сайта: цени, безплатен план, банер, контакт, фирма, сигурност. Прилагат се веднага на сайта. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$action = $_POST['action'] ?? '';
$c = site_config();
$num = fn($k, $min, $max, $def) => max($min, min($max, (float)str_replace(',', '.', post($k, (string)$def))));

if ($action === 'prices') {
    foreach (array_keys(DEFAULT_CONFIG['prices']) as $k) { $v = $num($k, 0, 100000, $c['prices'][$k]); $c['prices'][$k] = rtrim(rtrim(number_format($v, 2, '.', ''), '0'), '.'); }
    save_site_config($c); audit('Цени', json_encode($c['prices'], JSON_UNESCAPED_UNICODE)); flash('Цените са запазени и вече се виждат на сайта.'); go('nastroyki.php#prices');
}
if ($action === 'names') {
    foreach (array_keys(DEFAULT_CONFIG['planNames']) as $k) { $v = mb_substr(post($k), 0, 30); $c['planNames'][$k] = $v !== '' ? $v : DEFAULT_CONFIG['planNames'][$k]; }
    save_site_config($c); audit('Имена на плановете', implode(', ', $c['planNames'])); flash('Имената на плановете са запазени.'); go('nastroyki.php#names');
}
if ($action === 'plan') {
    $c['paywall'] = !empty($_POST['paywall']);
    $c['freeMissions'] = (int)$num('freeMissions', 0, 200, 3);
    $c['freePractice'] = (int)$num('freePractice', 1, 1000, 20);
    $c['questions'] = (int)$num('questions', 5, 30, 10);
    $c['diplomas'] = in_array(post('diplomas'), ['auto', 'on', 'off'], true) ? post('diplomas') : 'auto';
    save_site_config($c); audit('Безплатен план', ($c['paywall'] ? 'платен достъп' : 'всичко безплатно') . " · мисии {$c['freeMissions']} · задачи {$c['freePractice']} · въпроси {$c['questions']}"); flash('Запазено.'); go('nastroyki.php#plan');
}
if ($action === 'banner') {
    $color = in_array(post('color'), ['orange', 'blue', 'green', 'red', 'purple'], true) ? post('color') : 'orange';
    $link = post('link'); if ($link !== '' && !preg_match('#^(https?://|/|[a-z0-9-]+\.html)#i', $link)) $link = '';
    $c['banner'] = ['on' => !empty($_POST['on']), 'text' => mb_substr(post('text'), 0, 200), 'link' => mb_substr($link, 0, 300), 'linkText' => mb_substr(post('linkText'), 0, 40), 'color' => $color];
    save_site_config($c); audit('Банер', ($c['banner']['on'] ? 'включен: ' : 'изключен: ') . $c['banner']['text']); flash('Банерът е запазен.'); go('nastroyki.php#banner');
}
if ($action === 'contact') {
    $e = post('contactEmail');
    if (!filter_var($e, FILTER_VALIDATE_EMAIL)) { flash('Невалиден имейл.', 'err'); go('nastroyki.php#contact'); }
    $c['contactEmail'] = $e; save_site_config($c); audit('Имейл за контакт', $e); flash('Запазено.'); go('nastroyki.php#contact');
}
if ($action === 'company') {
    foreach (array_keys(DEFAULT_CONFIG['company']) as $k) $c['company'][$k] = mb_substr(post($k), 0, 200);
    save_site_config($c); audit('Данни на фирмата', $c['company']['name'] . ' ' . $c['company']['eik']); flash('Данните на фирмата са запазени – вече се показват в правните документи.'); go('nastroyki.php#company');
}
if ($action === 'password') {
    $p = (string)($_POST['password'] ?? '');
    if (!password_verify((string)($_POST['old'] ?? ''), (string)setting('admin_hash'))) { flash('Грешна текуща парола.', 'err'); go('nastroyki.php#security'); }
    if (mb_strlen($p) < 10 || $p !== ($_POST['password2'] ?? '')) { flash('Новата парола трябва да е поне 10 знака и да съвпада.', 'err'); go('nastroyki.php#security'); }
    set_setting('admin_hash', password_hash($p, PASSWORD_DEFAULT));
    $v = (string)((int)setting('session_ver', '1') + 1); set_setting('session_ver', $v); $_SESSION['ver'] = $v;
    audit('Смяна на паролата'); flash('Паролата е сменена. Другите устройства са изведени от панела.'); go('nastroyki.php#security');
}
if ($action === 'logout_all') {
    $v = (string)((int)setting('session_ver', '1') + 1); set_setting('session_ver', $v); $_SESSION['ver'] = $v;
    audit('Изход от всички устройства'); flash('Всички други устройства са изведени от админ панела.'); go('nastroyki.php#security');
}

$P = $c['prices']; $B = $c['banner']; $C = $c['company'];
$pf = fn($k, $l) => '<label>' . $l . '<input name="' . $k . '" inputmode="decimal" value="' . h($P[$k]) . '"></label>';
$f = fn($a) => '<form method="post" class="card" id="' . $a . '">' . csrf_field() . '<input type="hidden" name="action" value="' . ($a === 'security' ? 'password' : $a) . '">';
$body = '<p class="hint">Промените се прилагат на сайта веднага (при следващо отваряне на страница). Не е нужно нищо да качвате.</p>';
$body .= $f('prices') . '<h2>💶 Цени</h2><div class="grid g4">' . $pf('single6', '🦉 Индивидуален · 6 месеца (€)') . $pf('single12', '🦉 Индивидуален · 1 година (€)') . $pf('family6', '🏡 Семеен · 6 месеца (€)') . $pf('family12', '🏡 Семеен · 1 година (€)') .
    $pf('class6', '🐦 Цял клас · 6 месеца (€)') . $pf('class12', '🐦 Цял клас · 1 година (€)') . $pf('disc3', 'Отстъпка за 3+ класа (%)') . $pf('disc8', 'Отстъпка за 8+ класа (%)') . '</div><p class="hint">„На месец“, „на дете“ и „на ученик“ на страницата с цените се преизчисляват автоматично.</p><button>💾 Запази цените</button></form>';
$N = $c['planNames'];
$nf = fn($k, $l) => '<label>' . $l . '<input name="' . $k . '" maxlength="30" value="' . h($N[$k]) . '"></label>';
$body .= $f('names') . '<h2>🏷️ Имена на плановете</h2><div class="grid g4">' . $nf('free', '🐣 Безплатно') . $nf('single', '🦉 Индивидуален') . $nf('family', '🏡 Семеен') . $nf('class', '🐦 Цял клас') . $nf('school', '🌳 Училище') . '</div><p class="hint">Показват се на страницата с цените и в прозореца за абонамент.</p><button>💾 Запази имената</button></form>';
$body .= $f('plan') . '<h2>🎁 Безплатен план</h2><label class="chk"><input type="checkbox" name="paywall" value="1"' . ($c['paywall'] ? ' checked' : '') . '> Пълният достъп е платен (махнете отметката, за да е всичко безплатно – напр. за промоция)</label><div class="grid g3">' .
    '<label>Безплатни мисии в началото на всеки учебник<input type="number" name="freeMissions" min="0" max="200" value="' . (int)$c['freeMissions'] . '"></label>' .
    '<label>Безплатни задачи на ден в „Тренировка“<input type="number" name="freePractice" min="1" max="1000" value="' . (int)$c['freePractice'] . '"></label>' .
    '<label>Задачи в една мисия<input type="number" name="questions" min="5" max="30" value="' . (int)$c['questions'] . '"></label>' .
    '<label>🎓 Грамоти за учители и родители<select name="diplomas">' . implode('', array_map(fn($k, $v) => '<option value="' . $k . '"' . ($c['diplomas'] === $k ? ' selected' : '') . '>' . $v . '</option>', ['auto', 'on', 'off'], ['Автоматично: 1 юни – 30 септември', 'Отворени сега', 'Затворени'])) . '</select></label></div><button>💾 Запази</button></form>';
$col = ''; foreach (['orange' => 'оранжев', 'blue' => 'син', 'green' => 'зелен', 'red' => 'червен', 'purple' => 'лилав'] as $k => $v) $col .= '<option value="' . $k . '"' . ($B['color'] === $k ? ' selected' : '') . '>' . $v . '</option>';
$body .= $f('banner') . '<h2>📣 Банер най-отгоре на сайта</h2><label class="chk"><input type="checkbox" name="on" value="1"' . ($B['on'] ? ' checked' : '') . '> Показвай банера</label><div class="grid g4">' .
    '<label class="wide">Текст<input name="text" maxlength="200" value="' . h($B['text']) . '" placeholder="🎄 Коледна промоция: учебна година за 12 €!"></label>' .
    '<label>Връзка (по желание)<input name="link" maxlength="300" value="' . h($B['link']) . '" placeholder="pricing.html"></label><label>Текст на връзката<input name="linkText" maxlength="40" value="' . h($B['linkText']) . '" placeholder="Виж цените"></label>' .
    '<label>Цвят<select name="color">' . $col . '</select></label></div><p class="hint">Посетителят може да затвори банера; при нов текст той се показва отново.</p><button>💾 Запази банера</button></form>';
$body .= $f('contact') . '<h2>✉️ Имейл за контакт</h2><div class="grid g2"><label>Имейл, който се показва на сайта<input type="email" name="contactEmail" value="' . h($c['contactEmail']) . '"></label></div><button>💾 Запази</button></form>';
$cf = fn($k, $l, $ph = '') => '<label>' . $l . '<input name="' . $k . '" maxlength="200" value="' . h($C[$k]) . '" placeholder="' . h($ph) . '"></label>';
$body .= $f('company') . '<h2>🏢 Данни на фирмата</h2><p class="hint">Показват се в Общите условия, Политиката за поверителност и другите документи на мястото на „[ПОПЪЛНЕТЕ…]“, и в проформите.</p><div class="grid g3">' .
    $cf('name', 'Наименование', 'Сметко ЕООД') . $cf('eik', 'ЕИК', '123456789') . $cf('vat', 'ДДС номер (ако има)', 'BG123456789') . '<label class="wide">Седалище и адрес на управление<input name="addr" maxlength="200" value="' . h($C['addr']) . '"></label>' .
    $cf('mol', 'Управител (МОЛ)') . $cf('phone', 'Телефон') . $cf('date', 'Дата на документите', date('d.m.Y')) . $cf('iban', 'IBAN (за проформи)') . $cf('bank', 'Банка') . '</div><button>💾 Запази</button></form>';
$body .= '<form method="post" class="card" id="security">' . csrf_field() . '<input type="hidden" name="action" value="password"><h2>🔒 Сигурност</h2><div class="grid g3"><label>Текуща парола<input type="password" name="old" autocomplete="current-password"></label><label>Нова парола (мин. 10 знака)<input type="password" name="password" minlength="10" autocomplete="new-password"></label><label>Повтори новата<input type="password" name="password2" minlength="10" autocomplete="new-password"></label></div><button>Смени паролата</button></form>' .
    '<form method="post" class="card">' . csrf_field() . '<input type="hidden" name="action" value="logout_all"><h3>Изход от всички устройства</h3><p class="hint">Ако сте влизали от чужд компютър или телефон – всички други сесии спират веднага.</p><button class="ghost">🚪 Изведи другите устройства</button></form>';
page('Настройки на сайта', $body);
