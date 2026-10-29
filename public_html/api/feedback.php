<?php
/* Сигнали от сайта (админ → 🚩 Сигнали).
   POST {kind: task|bug, reason, text, task?, page, ver, vw}  → сигнал от бутона „Нещо не е наред?“
   POST {kind: js, msg, src, line, col, stack, page, ver, vw} → автоматичен запис на грешка в браузъра
   Еднаквите JS грешки се събират в един ред с брояч. Без IP адреси и без лични данни. */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? ''))) json_out(['ok' => false, 'error' => 'Забранено.'], 403);
$in = json_in();
$kind = (string)($in['kind'] ?? '');
if (!in_array($kind, ['task', 'bug', 'js'], true)) json_out(['ok' => false, 'error' => 'Невалиден сигнал.'], 400);
if (too_many('fb_' . ($kind === 'js' ? 'js' : 'user'), $kind === 'js' ? 60 : 15, 3600)) json_out(['ok' => false, 'error' => 'Твърде много сигнали. Опитайте пак по-късно.'], 429);
note_attempt('fb_' . ($kind === 'js' ? 'js' : 'user'));
$s = fn($k, $max) => mb_substr(trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', (string)($in[$k] ?? '')) ?? ''), 0, $max);
$page = $s('page', 200); $ver = $s('ver', 12); $vw = $s('vw', 20);
$ua = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 300);
$pdo = db();

if ($kind === 'js') {
    $msg = $s('msg', 300); if ($msg === '') json_out(['ok' => true]);
    $src = $s('src', 200); $line = (int)($in['line'] ?? 0);
    $sig = hash('sha1', $msg . '|' . preg_replace('/\?.*$/', '', $src) . '|' . $line);
    $st = $pdo->prepare('UPDATE reports SET n = n + 1, last_at = ?, ua = ?, page = ?, ver = ? WHERE sig = ?');
    $st->execute([now(), $ua, $page, $ver, $sig]);
    if (!$st->rowCount()) {
        $data = json_encode(['src' => $src, 'line' => $line, 'col' => (int)($in['col'] ?? 0), 'stack' => $s('stack', 1500), 'vw' => $vw], JSON_UNESCAPED_UNICODE);
        $pdo->prepare("INSERT INTO reports(created_at, last_at, kind, reason, text, data, page, ua, ver, sig, n, status) VALUES(?, ?, 'js', '', ?, ?, ?, ?, ?, ?, 1, 'new')")
            ->execute([now(), now(), $msg, $data, $page, $ua, $ver, $sig]);
    }
    json_out(['ok' => true]);
}

$reasons = ['wrong' => 'Отговорът е грешен', 'unclear' => 'Задачата е неясна', 'broken' => 'Нещо не работи', 'other' => 'Друго'];
$reason = (string)($in['reason'] ?? ''); if (!isset($reasons[$reason])) $reason = 'other';
$text = $s('text', 1000);
$task = null;
if (is_array($in['task'] ?? null)) {
    $t = $in['task'];
    $task = ['q' => mb_substr(strip_tags((string)($t['q'] ?? '')), 0, 400), 'full' => mb_substr(strip_tags((string)($t['full'] ?? '')), 0, 300), 'answer' => mb_substr((string)($t['answer'] ?? ''), 0, 60),
        'input' => mb_substr((string)($t['input'] ?? ''), 0, 60), 'skill' => mb_substr((string)($t['skill'] ?? ''), 0, 40), 'grade' => (int)($t['grade'] ?? 0), 'level' => (int)($t['level'] ?? 0),
        'mode' => mb_substr((string)($t['mode'] ?? ''), 0, 20), 'book' => mb_substr((string)($t['book'] ?? ''), 0, 40), 'mission' => mb_substr((string)($t['mission'] ?? ''), 0, 120), 'a11y' => mb_substr((string)($t['a11y'] ?? ''), 0, 80)];
}
if ($text === '' && !$task) json_out(['ok' => false, 'error' => 'Опишете накратко какво не е наред.'], 400);
$pdo->prepare("INSERT INTO reports(created_at, last_at, kind, reason, text, data, page, ua, ver, sig, n, status) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 'new')")
    ->execute([now(), now(), $task ? 'task' : 'bug', $reason, $text, json_encode(['task' => $task, 'vw' => $vw], JSON_UNESCAPED_UNICODE), $page, $ua, $ver]);
json_out(['ok' => true]);
