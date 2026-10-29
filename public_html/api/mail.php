<?php
/* Имейли на Сметко: красив HTML (шапка със Сметко, бутони, карета) + текстов вариант за старите пощенски програми.
   Всички писма минават през send_mail(). Шаблоните са тук – mail_welcome(), mail_reset(), mail_order_*(), mail_admin_text(). */
declare(strict_types=1);
if (!function_exists('db')) { http_response_code(404); exit; }

const MAIL_FONT = "'Nunito','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MAIL_NAVY = '#1D2B4F';

function send_mail(string $to, string $subject, string $text, ?string $html = null, string $extra = ''): bool {
    $from = (string)(site_config()['contactEmail'] ?? 'info@smetko.com');
    $enc = fn($s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
    $dom = substr(strrchr($from, '@') ?: '@smetko.com', 1);
    $h = "From: " . $enc('Сметко') . " <$from>\r\nReply-To: $from\r\nMIME-Version: 1.0\r\nMessage-ID: <" . bin2hex(random_bytes(12)) . "@$dom>\r\nX-Mailer: Smetko" . ($extra !== '' ? "\r\n" . trim($extra) : '');
    if ($html === null) {
        $h .= "\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64";
        $body = chunk_split(base64_encode($text));
    } else {
        $b = 'smetko_' . bin2hex(random_bytes(8));
        $h .= "\r\nContent-Type: multipart/alternative; boundary=\"$b\"";
        $body = "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text)) .
            "--$b\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "--$b--\r\n";
    }
    return @mail($to, $enc($subject), $body, $h, '-f' . $from);
}

/* ---------- градивни елементи ---------- */
function me(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
function m_h(string $t): string { return '<h1 style="margin:0 0 14px;font-family:' . MAIL_FONT . ';font-size:26px;line-height:1.25;color:' . MAIL_NAVY . ';font-weight:900">' . $t . '</h1>'; }
function m_p(string $t, string $extra = ''): string { return '<p style="margin:0 0 14px;font-family:' . MAIL_FONT . ';font-size:16px;line-height:1.6;color:#33405F;' . $extra . '">' . $t . '</p>'; }
function m_small(string $t): string { return '<p style="margin:14px 0 0;font-family:' . MAIL_FONT . ';font-size:13px;line-height:1.5;color:#66728F">' . $t . '</p>'; }
function m_btn(string $url, string $label, string $color = '#FF7A1A', string $shadow = '#D95F00'): string {
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px auto 22px"><tr><td align="center" bgcolor="' . $color . '" style="border-radius:999px;box-shadow:0 4px 0 ' . $shadow . '">' .
        '<a href="' . me($url) . '" target="_blank" style="display:inline-block;padding:15px 34px;font-family:' . MAIL_FONT . ';font-size:17px;font-weight:900;color:#ffffff;text-decoration:none;border-radius:999px">' . $label . '</a></td></tr></table>';
}
function m_box(string $inner, string $bg = '#F3F8FF', string $border = '#E3EBF7'): string {
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px"><tr><td style="background:' . $bg . ';border:2px solid ' . $border . ';border-radius:18px;padding:18px 20px">' . $inner . '</td></tr></table>';
}
function m_rows(array $rows): string { // [етикет => стойност (HTML)]
    $h = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">';
    foreach ($rows as $k => $v) $h .= '<tr><td style="padding:6px 0;font-family:' . MAIL_FONT . ';font-size:14px;color:#66728F;vertical-align:top;width:40%">' . me((string)$k) . '</td><td style="padding:6px 0;font-family:' . MAIL_FONT . ';font-size:15px;color:' . MAIL_NAVY . ';font-weight:800;vertical-align:top">' . $v . '</td></tr>';
    return $h . '</table>';
}
function m_steps(array $steps): string { // [[заглавие, текст], ...]
    $c = ['#FF5A5F', '#FF9F1C', '#4CBB4A', '#2F80ED', '#8E6CF0']; $h = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 8px">';
    foreach (array_values($steps) as $i => [$t, $d]) $h .= '<tr><td width="46" style="vertical-align:top;padding:6px 0"><div style="width:34px;height:34px;line-height:34px;border-radius:50%;background:' . $c[$i % 5] . ';color:#fff;text-align:center;font-family:' . MAIL_FONT . ';font-weight:900;font-size:16px">' . ($i + 1) . '</div></td>' .
        '<td style="vertical-align:top;padding:6px 0 10px;font-family:' . MAIL_FONT . '"><div style="font-size:16px;font-weight:900;color:' . MAIL_NAVY . '">' . $t . '</div><div style="font-size:14px;line-height:1.5;color:#66728F">' . $d . '</div></td></tr>';
    return $h . '</table>';
}
function m_code(string $c): string { return '<span style="display:inline-block;font-family:Consolas,Menlo,monospace;font-size:17px;font-weight:bold;letter-spacing:1px;color:' . MAIL_NAVY . ';background:#FFF6E5;border:2px dashed #FF9F1C;border-radius:10px;padding:4px 10px;margin:2px 0">' . me($c) . '</span>'; }

function mail_layout(string $preheader, string $inner, string $why = ''): string {
    $site = SITE_URL; $mail = me((string)(site_config()['contactEmail'] ?? 'info@smetko.com'));
    return '<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Сметко</title></head>' .
        '<body style="margin:0;padding:0;background:#EAF6FF;-webkit-text-size-adjust:100%">' .
        '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EAF6FF">' . me($preheader) . '&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>' .
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EAF6FF"><tr><td align="center" style="padding:24px 12px">' .
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:26px;overflow:hidden;box-shadow:0 10px 30px rgba(29,43,79,.10)">' .
        '<tr><td style="background:#5BC0FF;line-height:0"><a href="' . $site . '" target="_blank"><img src="' . $site . '/assets/images/email-header.png" width="600" alt="Сметко – математика като игра за 1.–4. клас" style="display:block;width:100%;max-width:600px;height:auto;border:0;font-family:' . MAIL_FONT . ';font-size:28px;font-weight:900;color:#ffffff;line-height:1.4"></a></td></tr>' .
        '<tr><td style="padding:30px 32px 26px">' . $inner . '</td></tr>' .
        '<tr><td style="background:#F3F8FF;padding:20px 32px;font-family:' . MAIL_FONT . ';font-size:12px;line-height:1.6;color:#66728F;text-align:center">' .
        '<b style="color:' . MAIL_NAVY . '">Сметко</b> – математика като игра за 1.–4. клас<br><a href="' . $site . '" style="color:#2F80ED;text-decoration:none">smetko.com</a> · <a href="mailto:' . $mail . '" style="color:#2F80ED;text-decoration:none">' . $mail . '</a>' .
        ($why !== '' ? '<br><span style="color:#8A95AE">' . $why . '</span>' : '') . '</td></tr></table>' .
        '</td></tr></table></body></html>';
}

/* обикновен текст (напр. написан в админ панела) → HTML: връзки, кодове SMET-…, нови редове */
function mail_text_to_html(string $t): string {
    $h = me($t);
    $h = preg_replace('~\bSMET-[A-Z0-9]{4}-[A-Z0-9]{4}\b~', '%%CODE$0%%', $h) ?? $h;
    $h = preg_replace('~(https?://[^\s<]+|\bsmetko\.com/[a-z0-9./?=&#-]*[a-z0-9/])~i', '<a href="$1" style="color:#2F80ED;font-weight:800">$1</a>', $h) ?? $h;
    $h = preg_replace_callback('~href="(smetko\.com[^"]*)"~', fn($m) => 'href="https://' . $m[1] . '"', $h) ?? $h;
    $h = preg_replace_callback('~%%CODE(SMET-[A-Z0-9-]+)%%~', fn($m) => m_code($m[1]), $h) ?? $h;
    $paras = preg_split("/\n{2,}/", trim($h)) ?: [];
    return implode('', array_map(fn($p) => m_p(nl2br($p, false)), $paras));
}

/* ---------- шаблони ---------- */
function mail_welcome(string $email, string $name, string $role): bool {
    $first = explode(' ', trim($name))[0] ?: $name; $u = SITE_URL . '/profil.html';
    $teacher = $role === 'teacher';
    $steps = $teacher
        ? [['Добавете класа си', 'В „Моят профил“ въведете кода и ПИН-а от картичката за учителя.'], ['Задавайте домашни', 'Тема, брой задачи и срок – виждате кой ги е предал.'], ['Следете класацията', 'Точки, звезди и отчет по теми за всеки ученик.']]
        : [['Добавете профил за детето', 'Име или прякор, клас и картинка – до 4 деца.'], ['Въведете кода в профила', 'Кодът за абонамент важи на телефона, таблета и компютъра на детето.'], ['Играйте и следете напредъка', 'Мисии по учебника и отчет със силните теми и темите за упражнение.']];
    $html = mail_layout('Акаунтът ви е готов – ето как да започнете.', m_h('Добре дошли, ' . me($first) . '! 🎉') .
        m_p('Акаунтът ви в Сметко е създаден. Ето как да започнете:') . m_steps($steps) . m_btn($u, $teacher ? 'Добави класа си →' : 'Добави дете →') .
        m_small('Ако не сте създавали акаунт, просто игнорирайте това писмо.'), 'Получавате това писмо, защото с този имейл беше създаден акаунт в smetko.com.');
    $text = "Здравейте, $name!\n\nАкаунтът ви в Сметко е създаден.\n" . implode('', array_map(fn($s, $i) => ($i + 1) . ". {$s[0]} – {$s[1]}\n", $steps, array_keys($steps))) . "\nЗапочнете тук: $u\n\nАко не сте създавали акаунт, игнорирайте това писмо.\n\nЕкипът на Сметко\n" . SITE_URL;
    return send_mail($email, 'Добре дошли в Сметко! 🦉', $text, $html);
}
function mail_reset(string $email, string $name, string $url, int $hours = 1): bool {
    $valid = $hours === 1 ? '1 час' : $hours . ' часа';
    $html = mail_layout('Връзка за нова парола – важи ' . $valid . '.', m_h('Нова парола 🔑') . m_p('Здравейте, ' . me($name) . '!') .
        m_p('Получихме заявка за нова парола за акаунта ви в Сметко. Натиснете бутона, за да зададете нова:') . m_btn($url, 'Задай нова парола', '#19B5A5', '#0E9184') .
        m_box(m_p('⏰ Връзката важи <b>' . $valid . '</b> и може да се използва само веднъж.', 'margin:0;font-size:14px')) .
        m_small('Ако не сте поискали нова парола, игнорирайте писмото – старата си остава. Бутонът не работи? Копирайте този адрес в браузъра:<br><a href="' . me($url) . '" style="color:#2F80ED;word-break:break-all">' . me($url) . '</a>'));
    $text = "Здравейте, $name!\n\nЗа да зададете нова парола, отворете тази връзка (важи $valid):\n$url\n\nАко не сте поискали нова парола, игнорирайте писмото – старата си остава.\n\nЕкипът на Сметко";
    return send_mail($email, 'Нова парола за Сметко', $text, $html);
}
function mail_order_client(array $o): bool { // $o: no, name, email, pname, planTxt, qty, amount, disc, plan, bank|null
    $m = fn($x) => number_format((float)$x, 2, '.', ' ') . ' €';
    $what = $o['plan'] === 'class' ? 'кодовете и картичките за класа' : 'кода за достъп';
    $rows = ['Поръчка №' => me($o['no']), 'Абонамент' => '„' . me($o['pname']) . '“ – ' . me($o['planTxt']) . ($o['qty'] > 1 ? ' × ' . (int)$o['qty'] : '')];
    if ($o['disc']) $rows['Отстъпка'] = (float)$o['disc'] . '%';
    $rows['Сума за плащане'] = '<span style="font-size:20px;color:#D95F00">' . $m($o['amount']) . '</span>';
    $b = $o['bank'];
    $pay = $b ? m_box('<div style="font-family:' . MAIL_FONT . ';font-size:15px;font-weight:900;color:' . MAIL_NAVY . ';margin-bottom:6px">🏦 Плащане по банков път</div>' .
            m_rows(['Получател' => me($b['name']), 'IBAN' => '<span style="font-family:Consolas,Menlo,monospace;letter-spacing:.5px">' . me($b['iban']) . '</span>' . ($b['bank'] ? '<br><span style="font-weight:600;color:#66728F;font-size:13px">' . me($b['bank']) . '</span>' : ''), 'Основание' => me($b['reason']), 'Сума' => $m($o['amount'])]), '#FFF6E5', '#FFE0B0')
        : m_box(m_p('📄 До 1 работен ден ще ви изпратим <b>проформа фактура</b> с данните за плащане.', 'margin:0;font-size:15px'), '#FFF6E5', '#FFE0B0');
    $steps = [['Платете', $b ? 'По банков път с основание „' . me($b['reason']) . '“.' : 'По проформата, която ще получите.'], ['Получавате ' . $what, 'На този имейл – обикновено до 1 работен ден след плащането.']];
    $steps[] = $o['plan'] === 'class' ? ['Раздайте картичките', 'Учениците въвеждат кодовете си на smetko.com/kod, а вие следите класацията на smetko.com/klasaciya.'] : ['Въведете кода', 'Най-добре в профила на детето в безплатния ви акаунт – тогава важи на всички негови устройства.'];
    $html = mail_layout('Поръчка №' . $o['no'] . ' – ' . $m($o['amount']) . '. Данните за плащане са вътре.', m_h('Благодарим за поръчката! 🛒') . m_p('Здравейте, ' . me($o['name']) . '! Приехме поръчката ви:') .
        m_box(m_rows($rows)) . $pay . m_steps($steps) .
        ($o['plan'] !== 'class' ? m_btn(SITE_URL . '/registracia.html', 'Направи безплатен акаунт') : m_btn(SITE_URL . '/uchilishta.html', 'Как работи Сметко в клас')) .
        m_small('Имате въпрос? Просто отговорете на това писмо.'), 'Получавате това писмо, защото поръчахте абонамент на smetko.com.');
    $text = "Здравейте, {$o['name']}!\n\nБлагодарим за поръчката на абонамент „{$o['pname']}“ ({$o['planTxt']}" . ($o['qty'] > 1 ? " × {$o['qty']}" : '') . ").\nПоръчка №{$o['no']}\nСума за плащане: " . $m($o['amount']) . "\n\n" .
        ($b ? "Плащане по банков път:\nПолучател: {$b['name']}\nIBAN: {$b['iban']}" . ($b['bank'] ? " ({$b['bank']})" : '') . "\nОснование: {$b['reason']}\n\n" : "До 1 работен ден ще ви изпратим проформа фактура с данните за плащане.\n\n") .
        "След плащането ще получите $what на този имейл (обикновено до 1 работен ден).\n" . ($o['plan'] !== 'class' ? "\nСъвет: направете си безплатен акаунт на " . SITE_URL . "/registracia.html и въведете кода в профила на детето.\n" : '') .
        "\nАко имате въпроси, отговорете на това писмо.\n\nЕкипът на Сметко\n" . SITE_URL;
    return send_mail($o['email'], 'Поръчка №' . $o['no'] . ' в Сметко', $text, $html);
}
function mail_order_admin(string $to, array $o, array $details, string $url): bool {
    $m = fn($x) => number_format((float)$x, 2, '.', ' ') . ' €';
    $rows = []; foreach ($details as $k => $v) if ($v !== '' && $v !== null) $rows[$k] = nl2br(me((string)$v), false);
    $html = mail_layout('Нова поръчка №' . $o['no'] . ' – ' . $m($o['amount']), m_h('💶 Нова поръчка №' . me($o['no'])) .
        m_p('<b style="font-size:22px;color:#D95F00">' . $m($o['amount']) . '</b> · „' . me($o['pname']) . '“ – ' . me($o['planTxt']) . ($o['qty'] > 1 ? ' × ' . (int)$o['qty'] : '')) .
        m_box(m_rows($rows)) . m_btn($url, 'Отвори поръчката') . m_small('Когато плащането пристигне: „⚡ Създай кода“ (или „🔑 Създай кодовете“ за клас) → „✉️ Изпрати имейла“.'));
    $text = "Нова поръчка №{$o['no']}\n" . $m($o['amount']) . " – {$o['pname']} ({$o['planTxt']}) × {$o['qty']}\n\n" . implode("\n", array_map(fn($k, $v) => "$k: $v", array_keys($details), $details)) . "\n\nОтворете я: $url\n";
    return send_mail($to, '💶 Нова поръчка №' . $o['no'] . ' – ' . $o['pname'] . ' – ' . $m($o['amount']), $text, $html);
}
/* писмо, написано в админ панела (напр. кодовете към поръчка) – текстът става красив HTML */
function mail_admin_text(string $to, string $subject, string $text, string $title = ''): bool {
    $html = mail_layout(mb_substr(preg_replace('/\s+/u', ' ', $text) ?? '', 0, 110), ($title !== '' ? m_h(me($title)) : '') . mail_text_to_html($text));
    return send_mail($to, $subject, $text, $html);
}
