<?php
/* Седмичен имейл до родителя: всеки понеделник след 8:00 – за всяко дете в акаунта колко е играло миналата седмица,
   колко задачи и колко верни, силна тема и тема за упражнение (с линк). Ако тази седмица никой не е играл, но миналата е –
   кратко напомняне. Иначе писмо не се праща.
   Пуска се сам от api/news.php (заявката, която всяка страница прави), на порции, след като отговорът е изпратен.
   Изключване: от профила или с линка в писмото (api/unsub.php). Админ → 📬 Седмичен имейл: преглед, пробно писмо, статистика. */
declare(strict_types=1);
if (!function_exists('db')) { http_response_code(404); exit; }
require_once __DIR__ . '/mail.php';

function weekly_key(): string { return date('o-\WW'); }                       // седмицата, в която се праща (напр. 2026-W44)
function weekly_range(): array { $mon = strtotime('monday this week'); return [date('Y-m-d', $mon - 7 * 86400), date('Y-m-d', $mon - 86400), date('Y-m-d', $mon - 14 * 86400)]; } // [от, до, от предишната]
function weekly_token(int $aid): string { return substr(b64u(hash_hmac('sha256', 'weekly|' . $aid, secret(), true)), 0, 22); }
function weekly_unsub_url(int $aid): string { return SITE_URL . '/api/unsub.php?a=' . $aid . '&t=' . weekly_token($aid); }
function weekly_on(): bool { return setting('weekly_on', '1') === '1'; }
function weekly_due(): bool { return weekly_on() && (int)date('N') === 1 && (int)date('G') >= 8 && setting('weekly_done') !== weekly_key(); }
function weekly_names(): array { static $n = null; return $n ??= (json_decode((string)@file_get_contents(__DIR__ . '/../admin/_names.json'), true) ?: ['titles' => []]); }

/* обобщение за едно дете за седмицата [$from, $to] (и предишната за сравнение) */
function weekly_kid(array $p, string $from, string $to, string $prev): array {
    $s = json_decode((string)$p['state'], true) ?: [];
    $days = (array)($s['days'] ?? []); $skills = (array)($s['skills'] ?? []);
    $w = []; $a = 0; $c = 0; $pa = 0;
    for ($t = strtotime($from); $t <= strtotime($to); $t += 86400) { $k = date('Y-m-d', $t); $v = $days[$k] ?? [0, 0]; $w[] = (int)($v[0] ?? 0); $a += (int)($v[0] ?? 0); $c += (int)($v[1] ?? 0); }
    for ($t = strtotime($prev); $t < strtotime($from); $t += 86400) { $v = $days[date('Y-m-d', $t)] ?? [0, 0]; $pa += (int)($v[0] ?? 0); }
    $ok = array_filter($skills, fn($v) => is_array($v) && (int)($v[1] ?? 0) >= 8);
    $pc = fn($v) => (int)round((int)$v[0] / max(1, (int)$v[1]) * 100);
    uasort($ok, fn($x, $y) => $pc($y) <=> $pc($x) ?: (int)$y[1] <=> (int)$x[1]);
    $strong = null; foreach ($ok as $k => $v) if ($pc($v) >= 80) { $strong = [$k, $pc($v)]; break; }
    $weak = null; foreach (array_reverse($ok, true) as $k => $v) if ($pc($v) < 80) { $weak = [$k, $pc($v)]; break; }
    $stars = 0; foreach ((array)($s['adventure'] ?? []) as $g) foreach ((array)$g as $v) $stars += (int)$v;
    return ['name' => (string)$p['name'], 'avatar' => (string)($p['avatar'] ?: '🦉'), 'grade' => (int)$p['grade'], 'week' => $w, 'days' => count(array_filter($w)), 'tasks' => $a, 'correct' => $c, 'prev' => $pa,
        'strong' => $strong, 'weak' => $weak, 'stars' => $stars, 'streak' => (int)($s['streak']['count'] ?? 0)];
}

/* писмото за един акаунт; null = няма какво да се прати */
function weekly_build(array $acc, bool $force = false): ?array {
    [$from, $to, $prev] = weekly_range();
    $st = db()->prepare('SELECT * FROM profiles WHERE account_id = ? ORDER BY id'); $st->execute([(int)$acc['id']]);
    $rows = $st->fetchAll();
    // и учениците от клас, свързани от родителя (картата от учителя)
    $sl = db()->prepare('SELECT r.nickname AS name, r.avatar, r.grade, COALESCE(r.state, \'\') AS state, r.stats FROM parent_links l JOIN redemptions r ON r.id = l.rid WHERE l.account_id = ?'); $sl->execute([(int)$acc['id']]);
    foreach ($sl->fetchAll() as $r) {
        if ($r['state'] === '' && $r['stats']) { $x = json_decode((string)$r['stats'], true) ?: []; $r['state'] = json_encode(['days' => $x['d'] ?? [], 'skills' => $x['s'] ?? []]); }
        $rows[] = $r;
    }
    $kids = array_map(fn($p) => weekly_kid($p, $from, $to, $prev), $rows);
    if (!$kids) return null;
    $played = array_filter($kids, fn($k) => $k['tasks'] > 0);
    $before = array_filter($kids, fn($k) => $k['prev'] > 0);
    if (!$played && !$before && !$force) return null;
    $nudge = !$played;
    $T = weekly_names()['titles'] ?? [];
    $title = fn($k) => $T[$k] ?? $k;
    $first = explode(' ', trim((string)$acc['name']))[0] ?: 'родител';
    $period = date('j.n', strtotime($from)) . ' – ' . date('j.n.Y', strtotime($to));
    $site = SITE_URL;
    $dn = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'];
    $names = implode(', ', array_map(fn($k) => $k['name'], $played ?: $kids));
    if ($nudge) {
        $subject = 'Липсваш ни, ' . ($kids[0]['name'] ?? '') . '! 🦉';
        $inner = m_h('Сметко скучае 🦉') . m_p('Здравейте, ' . me($first) . '! Миналата седмица ' . me($names) . ' не ' . (count($kids) > 1 ? 'играха' : 'игра') . ' в Сметко. Няма страшно – и 10 минути на ден правят чудеса.') .
            m_p('Една мисия днес връща серията от дни и носи нови звезди.') . m_btn($site . '/game.html', '🎮 Да поиграем');
        $text = "Здравейте, $first!\n\nМиналата седмица $names не " . (count($kids) > 1 ? 'играха' : 'игра') . " в Сметко. И 10 минути на ден правят чудеса.\n\nДа поиграем: $site/game.html";
    } else {
        $subject = (count($played) === 1 ? 'Седмицата на ' . reset($played)['name'] : 'Седмицата на децата') . ' в Сметко 📊';
        $inner = m_h('Седмицата в Сметко') . m_p('Здравейте, ' . me($first) . '! Ето как мина седмицата ' . $period . '.');
        $text = "Здравейте, $first!\nСедмицата $period в Сметко:\n";
        foreach ($kids as $k) {
            $dots = '';
            foreach ($k['week'] as $i => $v) $dots .= '<td align="center" style="padding:0 3px;font-family:' . MAIL_FONT . ';font-size:11px;color:#66728F"><div style="width:26px;height:26px;line-height:26px;border-radius:50%;margin:0 auto 3px;font-size:13px;font-weight:900;' . ($v ? 'background:#4CBB4A;color:#fff' : 'background:#E6ECF5;color:#A6B1C6') . '">' . ($v ? '✓' : '') . '</div>' . $dn[$i] . '</td>';
            $acc7 = $k['tasks'] ? (int)round($k['correct'] / $k['tasks'] * 100) : 0;
            $diff = $k['tasks'] - $k['prev'];
            $cmp = $k['prev'] && $k['tasks'] ? ($diff > 0 ? '↑ ' . $diff . ' задачи повече от предишната седмица' : ($diff < 0 ? '↓ ' . (-$diff) . ' по-малко от предишната седмица' : 'колкото предишната седмица')) : '';
            $box = '<div style="font-family:' . MAIL_FONT . ';font-size:18px;font-weight:900;color:' . MAIL_NAVY . ';margin:0 0 10px">' . me($k['avatar'] . ' ' . $k['name']) . ($k['grade'] ? ' <span style="font-size:13px;color:#66728F;font-weight:700">· ' . $k['grade'] . '. клас</span>' : '') . '</div>';
            if (!$k['tasks']) {
                $box .= m_p('През седмицата не е играл(а). Една кратка мисия днес ще му/ѝ хареса!', 'margin:0');
                $text .= "\n{$k['name']}: не е играл(а) през седмицата.";
            } else {
                $box .= '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px"><tr>' . $dots . '</tr></table>' .
                    m_rows(['Дни с игра' => '<b>' . $k['days'] . ' от 7</b>', 'Решени задачи' => '<b>' . $k['tasks'] . '</b>' . ($cmp ? ' <span style="color:#66728F;font-size:13px">' . $cmp . '</span>' : ''), 'Верни' => '<b>' . $acc7 . '%</b>'] +
                        ($k['strong'] ? ['💪 Силна страна' => me($title($k['strong'][0])) . ' <span style="color:#2E9440">(' . $k['strong'][1] . '%)</span>'] : []) +
                        ($k['weak'] ? ['🎯 Да поупражним' => '<a href="' . me($site . '/game.html?mode=practice&skill=' . urlencode($k['weak'][0]) . ($k['grade'] ? '&grade=' . $k['grade'] : '')) . '" style="color:#2F80ED;font-weight:800">' . me($title($k['weak'][0])) . '</a> <span style="color:#D95F00">(' . $k['weak'][1] . '%)</span>'] : []));
                $text .= "\n{$k['name']}: {$k['days']}/7 дни, {$k['tasks']} задачи, $acc7% верни" . ($cmp ? " ($cmp)" : '') . ($k['strong'] ? "\n  Силна страна: " . $title($k['strong'][0]) . " ({$k['strong'][1]}%)" : '') . ($k['weak'] ? "\n  Да поупражним: " . $title($k['weak'][0]) . " ({$k['weak'][1]}%) – $site/game.html?mode=practice&skill=" . urlencode($k['weak'][0]) : '');
            }
            $inner .= m_box($box);
        }
        $best = max(array_map(fn($k) => $k['days'], $kids));
        $inner .= m_p($best >= 5 ? '🎉 Страхотна седмица! Редовността е най-голямата сила в математиката.' : ($best >= 3 ? '👍 Добро темпо! 10 минути на ден правят навик.' : '💡 Съвет: кратко, но всеки ден – 10 минути помагат повече от един дълъг час.')) .
            m_btn($site . '/profil.html', '📊 Пълният отчет');
        $text .= "\n\nПълният отчет: $site/profil.html";
    }
    $unsub = weekly_unsub_url((int)$acc['id']);
    $why = 'Получавате това писмо, защото имате акаунт в Сметко. <a href="' . me($unsub) . '" style="color:#8A95AE">Не искам седмичния имейл</a>';
    $text .= "\n\nНе искате седмичния имейл? $unsub";
    return ['subject' => $subject, 'text' => $text, 'html' => mail_layout($nudge ? 'Една мисия днес връща серията от дни.' : 'Дни с игра, задачи и какво да поупражнява детето.', $inner, $why), 'unsub' => $unsub, 'nudge' => $nudge];
}

function weekly_send(array $acc, bool $force = false, ?string $to = null): bool {
    $m = weekly_build($acc, $force); if (!$m) return false;
    return send_mail($to ?? (string)$acc['email'], $m['subject'], $m['text'], $m['html'], 'List-Unsubscribe: <' . $m['unsub'] . '>' . "\r\nList-Unsubscribe-Post: List-Unsubscribe=One-Click");
}

/* една порция: до $batch акаунта, на които още не е пратено тази седмица */
function weekly_run(int $batch = 20): array {
    $pdo = db(); $key = weekly_key(); $sent = 0; $skip = 0;
    $pdo->exec('BEGIN IMMEDIATE'); // само една порция наведнъж
    if ((int)setting('weekly_lock', '0') > time() - 120) { $pdo->exec('COMMIT'); return ['busy' => true]; }
    set_setting('weekly_lock', (string)time()); $pdo->exec('COMMIT');
    $st = $pdo->prepare("SELECT * FROM accounts WHERE disabled = 0 AND COALESCE(weekly, 1) = 1 AND role <> 'teacher' AND COALESCE(weekly_sent, '') <> ? AND email LIKE '%@%' ORDER BY id LIMIT " . max(1, $batch));
    $st->execute([$key]); $rows = $st->fetchAll();
    $mark = $pdo->prepare('UPDATE accounts SET weekly_sent = ? WHERE id = ?');
    foreach ($rows as $a) { $mark->execute([$key, (int)$a['id']]); if (weekly_send($a)) $sent++; else $skip++; }
    if (count($rows) < $batch) set_setting('weekly_done', $key);
    $stats = json_decode((string)setting('weekly_stats', '{}'), true) ?: [];
    if (($stats['week'] ?? '') !== $key) $stats = ['week' => $key, 'sent' => 0, 'skipped' => 0];
    $stats['sent'] += $sent; $stats['skipped'] += $skip; $stats['at'] = date('Y-m-d H:i'); if (count($rows) < $batch) $stats['done'] = true;
    set_setting('weekly_stats', json_encode($stats));
    set_setting('weekly_lock', '0');
    return ['sent' => $sent, 'skipped' => $skip, 'done' => count($rows) < $batch];
}
