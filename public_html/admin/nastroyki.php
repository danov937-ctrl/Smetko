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
if ($action === 'google') {
    $gsc = post('gsc'); $ga = strtoupper(post('ga')); $cid = strtolower(post('clientId'));
    if ($gsc !== '') { if (preg_match('/(google[a-f0-9]{8,32})(\.html)?/i', $gsc, $m)) $gsc = strtolower($m[1]) . '.html'; else { flash('Файлът за Search Console трябва да е като google1a2b3c4d5e6f7a8b.html.', 'err'); go('nastroyki.php#google'); } }
    if ($ga !== '' && !preg_match('/^G-[A-Z0-9]{4,15}$/', $ga)) { flash('Идентификаторът за Google Analytics започва с G- (напр. G-ABC123XYZ9).', 'err'); go('nastroyki.php#google'); }
    if ($cid !== '' && !preg_match('/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/', $cid)) { flash('Client ID за вход с Google завършва на .apps.googleusercontent.com.', 'err'); go('nastroyki.php#google'); }
    $c['google'] = ['gsc' => $gsc, 'ga' => $ga, 'clientId' => $cid];
    save_site_config($c); audit('Google', trim(($gsc ? 'Search Console ' : '') . ($ga ? 'Analytics ' . $ga . ' ' : '') . ($cid ? 'вход с Google' : '')) ?: 'изключено'); flash('Настройките за Google са запазени.'); go('nastroyki.php#google');
}
if ($action === 'test_mail') {
    $to = (string)$c['contactEmail'];
    $ok = mail_admin_text($to, '✅ Тестово писмо от Сметко', "Здравейте!\n\nАко четете това писмо във „Входящи“ (а не в „Спам“), имейлите на сайта работят: писмата за добре дошли, новите пароли и поръчките.\n\nАко е в „Спам“: cPanel → Имейл → Email Deliverability → до smetko.com натиснете Repair (Поправи).\n\nЕкипът на Сметко\nsmetko.com", 'Имейлите работят! 🎉');
    audit('Тестово писмо', $to . ($ok ? '' : ' (неуспешно)'));
    flash($ok ? "Изпратено до $to. Проверете „Входящи“ и „Спам“." : 'Сървърът не успя да изпрати писмото.', $ok ? 'ok' : 'err'); go('nastroyki.php#contact');
}
if ($action === 'company') {
    foreach (array_keys(DEFAULT_CONFIG['company']) as $k) $c['company'][$k] = mb_substr(post($k), 0, 200);
    save_site_config($c); audit('Данни на собственика', $c['company']['name']); flash('Данните са запазени – вече се показват в правните документи.'); go('nastroyki.php#company');
}
if ($action === 'paddle') {
    $P = $c['paddle'];
    $P['env'] = post('env') === 'live' ? 'live' : 'sandbox';
    foreach (['token', 'secret', 'apiKey'] as $k) { $v = post($k); if ($v !== '' || post('clear_' . $k) !== '') $P[$k] = mb_substr($v, 0, 200); } // празно поле = без промяна
    foreach (array_keys(DEFAULT_CONFIG['paddle']['prices']) as $k) { if (!array_key_exists('p_' . $k, $_POST)) continue; $v = post('p_' . $k); if (preg_match('/^(pri_[a-z0-9]+)?$/i', $v)) $P['prices'][$k] = $v; }
    $c['paddle'] = $P; save_site_config($c);
    audit('Настройки на Paddle', $P['env'] . ($P['token'] ? ' · token' : '') . ($P['secret'] ? ' · secret' : ''));
    flash('Настройките на Paddle са запазени.'); go('nastroyki.php#paddle');
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
$body .= $f('contact') . '<h2>✉️ Имейл за контакт</h2><div class="grid g2"><label>Имейл, който се показва на сайта<input type="email" name="contactEmail" value="' . h($c['contactEmail']) . '"></label></div><div class="row"><button>💾 Запази</button><button class="ghost" name="action" value="test_mail">✉️ Изпрати тестово писмо</button></div><p class="hint">От този адрес сайтът праща писмата (добре дошли, нова парола, поръчки). Пощата трябва да съществува в cPanel.</p></form>';
$cf = fn($k, $l, $ph = '') => '<label>' . $l . '<input name="' . $k . '" maxlength="200" value="' . h($C[$k]) . '" placeholder="' . h($ph) . '"></label>';
$G = ($c['google'] ?? []) + ['gsc' => '', 'ga' => '', 'clientId' => ''];
$gst = fn($on) => $on ? '<span class="tag tg">✓ включено</span>' : '<span class="tag">не е настроено</span>';
$body .= $f('google') . '<h2>🔗 Google</h2><p class="hint">Поставете кодовете от вашия Google профил – всичко тръгва автоматично. Оставете празно, за да изключите. Стъпките са в <a href="pomosht.php#google">Помощ</a>.</p><div class="grid g3">' .
    '<label>🔍 Search Console – име на файла ' . $gst($G['gsc'] !== '') . '<input name="gsc" value="' . h($G['gsc']) . '" placeholder="google1a2b3c4d5e6f7a8b.html" autocomplete="off"></label>' .
    '<label>📊 Google Analytics – Measurement ID ' . $gst($G['ga'] !== '') . '<input name="ga" value="' . h($G['ga']) . '" placeholder="G-XXXXXXXXXX" autocomplete="off"></label>' .
    '<label>👤 Вход с Google – Client ID ' . $gst($G['clientId'] !== '') . '<input name="clientId" value="' . h($G['clientId']) . '" placeholder="123…-abc….apps.googleusercontent.com" autocomplete="off"></label></div>' .
    ($G['gsc'] !== '' ? '<p class="hint">Проверка: <a href="/' . h($G['gsc']) . '" target="_blank" rel="noopener">smetko.com/' . h($G['gsc']) . '</a> трябва да показва „google-site-verification: ' . h($G['gsc']) . '“. След това натиснете „Потвърждаване“ в Search Console и добавете картата на сайта: <b>sitemap.xml</b>.</p>' : '') .
    '<p class="hint">Google Analytics се зарежда само при посетители, приели „Статистика“ в банера за бисквитки (без Google Signals и без реклами). Бутонът „Вход с Google“ се появява на страниците „Вход“ и „Регистрация“.</p><button>💾 Запази</button></form>';
$body .= $f('company') . '<h2>👤 Собственик на Сметко</h2><p class="hint">Сметко се продава от физическо лице, а плащанията минават през Paddle (търговец – Merchant of Record), затова не са нужни ЕИК и ДДС номер. Името и адресът се показват в Общите условия, Политиката за поверителност и другите документи на мястото на „[ПОПЪЛНЕТЕ…]“. За одобрението от Paddle е най-добре да се впишат и в <code>tools/common.py</code> (OWNER_NAME, OWNER_ADDR) – тогава са направо в страницата.</p><div class="grid g3">' .
    $cf('name', 'Име и фамилия', 'Иван Петров Иванов') . '<label class="wide">Адрес за кореспонденция<input name="addr" maxlength="200" value="' . h($C['addr']) . '" placeholder="гр. София, ул. …"></label>' .
    $cf('phone', 'Телефон (по желание)') . '<details class="wide"><summary class="hint">Ако по-късно регистрирате фирма</summary><div class="grid g3">' . $cf('eik', 'ЕИК', '123456789') . $cf('vat', 'ДДС номер (ако има)', 'BG123456789') . $cf('mol', 'Управител (МОЛ)') . $cf('iban', 'IBAN') . $cf('bank', 'Банка') . '</div></details></div><button>💾 Запази</button></form>';
// ---------- Paddle ----------
$PD = $c['paddle'];
$st = db()->query("SELECT status, COUNT(*) n FROM paddle_events GROUP BY status")->fetchAll();
$evn = []; foreach ($st as $r) $evn[$r['status']] = (int)$r['n'];
$last = db()->query('SELECT * FROM paddle_events ORDER BY at DESC LIMIT 8')->fetchAll();
$mask = fn(string $v) => $v === '' ? '' : mb_substr($v, 0, 6) . '••••••' . mb_substr($v, -4);
$sec = fn($k, $l, $ph, $hint) => '<label>' . $l . ($PD[$k] !== '' ? ' <span class="pill ok">запазен: ' . h($mask($PD[$k])) . '</span>' : ' <span class="pill">празно</span>') .
    '<input name="' . $k . '" maxlength="200" value="" placeholder="' . h($PD[$k] !== '' ? 'оставете празно, за да не се променя' : $ph) . '" autocomplete="off"><small class="hint">' . $hint . '</small></label>';
$pf = fn($k, $l) => '<label>' . $l . '<input name="p_' . $k . '" maxlength="60" value="' . h($PD['prices'][$k]) . '" placeholder="pri_01h…" autocomplete="off"></label>';
$body .= $f('paddle') . '<h2>💳 Paddle – плащания</h2>' .
    '<p class="hint">Paddle е търговецът (Merchant of Record): приема плащането, начислява данъците, издава документа и връща парите. Ключовете се пазят в базата (не влизат в GitHub). „Client-side token“ е публичен и се вижда в страницата; другите две не излизат от сървъра.</p>' .
    '<div class="grid g3"><label>Режим<select name="env"><option value="sandbox"' . ($PD['env'] === 'sandbox' ? ' selected' : '') . '>Sandbox (проба)</option><option value="live"' . ($PD['env'] === 'live' ? ' selected' : '') . '>Live (истински плащания)</option></select><small class="hint">Ключовете за sandbox и live са различни.</small></label>' .
    $sec('token', 'Client-side token', 'test_… / live_…', 'Paddle → Developer tools → Authentication → Client-side tokens') .
    $sec('secret', 'Webhook secret key', 'pdl_ntfset_…', 'Paddle → Notifications → новата дестинация') .
    $sec('apiKey', 'API key (по желание)', 'pdl_sdbx_apikey_…', 'Само за имейла на купувача, ако Paddle не го прати в събитието') . '</div>' .
    '<h3>Цени (Price ID от Paddle)</h3><p class="hint">За всеки план направете продукт с две цени – за 6 и за 12 месеца (еднократно плащане, в евро) – и поставете тук техните <code>pri_…</code>.</p><div class="grid g3">' .
    $pf('single12', 'Индивидуален · 1 година') . $pf('family12', 'Семеен · 1 година') . $pf('class12', 'Клас · 1 година') .
    $pf('single6', 'Индивидуален · 6 месеца') . $pf('family6', 'Семеен · 6 месеца') . $pf('class6', 'Клас · 6 месеца') . '</div>' .
    '<button>💾 Запази</button></form>';
$body .= '<div class="card"><h3>Адрес за Paddle (webhook)</h3><div class="row"><input id="pd-url" readonly value="' . h(SITE_URL . '/api/paddle.php') . '" style="flex:1;min-width:240px"><button type="button" class="btn sm" data-copy="pd-url">Копирай</button></div>' .
    '<p class="hint">В Paddle → Notifications → <b>+ New destination</b>: поставете адреса, изберете <b>transaction.completed</b> и копирайте тук „secret key“.</p>' .
    '<p class="hint">Проба, докато продажбите са спрени: отворете <a href="../pricing.html?test=paddle" target="_blank">pricing.html?test=paddle</a> – бутоните за купуване се показват само на вас.</p>' .
    ($last ? '<h3>Последни събития</h3><div class="tw"><table><thead><tr><th>Кога</th><th>Събитие</th><th>Транзакция</th><th>Резултат</th></tr></thead><tbody>' .
        implode('', array_map(fn($e) => '<tr><td>' . h(substr((string)$e['at'], 0, 16)) . '</td><td>' . h($e['kind']) . '</td><td class="mono-sm">' . h($e['txn']) . '</td><td>' . ['ok' => '✅ код издаден', 'activated' => '✅ активиран в акаунт', 'skip' => '– пропуснато', 'err' => '⚠️ грешка'][$e['status']] . ' <small class="muted">' . h((string)$e['note']) . '</small></td></tr>', $last)) . '</tbody></table></div>'
        : '<p class="hint">Още няма получени събития от Paddle.</p>') .
    ($evn ? '<p class="hint">Общо: ' . h(implode(' · ', array_map(fn($k, $v) => "$k: $v", array_keys($evn), $evn))) . '</p>' : '') . '</div>';

$body .= '<form method="post" class="card" id="security">' . csrf_field() . '<input type="hidden" name="action" value="password"><h2>🔒 Сигурност</h2><div class="grid g3"><label>Текуща парола<input type="password" name="old" autocomplete="current-password"></label><label>Нова парола (мин. 10 знака)<input type="password" name="password" minlength="10" autocomplete="new-password"></label><label>Повтори новата<input type="password" name="password2" minlength="10" autocomplete="new-password"></label></div><button>Смени паролата</button></form>' .
    '<form method="post" class="card">' . csrf_field() . '<input type="hidden" name="action" value="logout_all"><h3>Изход от всички устройства</h3><p class="hint">Ако сте влизали от чужд компютър или телефон – всички други сесии спират веднага.</p><button class="ghost">🚪 Изведи другите устройства</button></form>';
page('Настройки на сайта', $body);
