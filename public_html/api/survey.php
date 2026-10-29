<?php
/* Анкета за затворения тест (anketa.html).
   POST {sid, answers: {въпрос: отговор}} → записва или обновява отговорите (sid е случаен ключ от браузъра,
   с който човек може да промени своите отговори). Въпросите и проверките са от survey_q.json (tools/survey.py).
   Не се пазят IP адреси; имейлът е по желание. */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? ''))) json_out(['ok' => false, 'error' => 'Забранено.'], 403);
if (too_many('survey', 12, 3600)) json_out(['ok' => false, 'error' => 'Твърде много опити. Опитайте пак след малко.'], 429);
note_attempt('survey');
$in = json_in();
$spec = json_decode((string)file_get_contents(__DIR__ . '/survey_q.json'), true);
if (!$spec) json_out(['ok' => false, 'error' => 'Анкетата не е налична.'], 500);
$a = is_array($in['answers'] ?? null) ? $in['answers'] : [];
$sid = preg_match('/^[a-f0-9]{16,40}$/', (string)($in['sid'] ?? '')) ? (string)$in['sid'] : '';
if ($sid === '') json_out(['ok' => false, 'error' => 'Опреснете страницата и опитайте пак.'], 400);

$role = $a['role'] ?? null;
if (!is_int($role) || !isset($spec['roleGroup'][(string)$role])) json_out(['ok' => false, 'error' => 'Изберете кой сте.', 'field' => 'role'], 400);
$group = $spec['roleGroup'][(string)$role];
$clean = [];
foreach ($spec['questions'] as $q) {
    if ($q['who'] !== 'all' && $q['who'] !== $group) continue;
    $id = $q['id']; $v = $a[$id] ?? null; $n = count($q['opts']);
    switch ($q['kind']) {
        case 'one': $v = (is_int($v) && $v >= 0 && $v < $n) ? $v : null; break;
        case 'many': $v = is_array($v) ? array_values(array_unique(array_filter($v, fn($x) => is_int($x) && $x >= 0 && $x < $n))) : []; sort($v); if (!$v) $v = null; break;
        case 'scale': $v = (is_int($v) && $v >= 1 && $v <= 5) ? $v : null; break;
        case 'nps': $v = (is_int($v) && $v >= 0 && $v <= 10) ? $v : null; break;
        case 'text': $v = is_string($v) ? mb_substr(trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $v) ?? ''), 0, 1500) : ''; if ($v === '') $v = null; break;
        case 'email': $v = is_string($v) ? mb_strtolower(trim($v)) : ''; if ($v === '') { $v = null; break; }
            if (!filter_var($v, FILTER_VALIDATE_EMAIL) || mb_strlen($v) > 120) json_out(['ok' => false, 'error' => 'Проверете имейла.', 'field' => $id], 400); break;
        default: $v = null;
    }
    if ($q['req'] && $v === null) json_out(['ok' => false, 'error' => 'Отговорете на въпроса: ' . $q['q'], 'field' => $id], 400);
    if ($v !== null) $clean[$id] = $v;
}

$pdo = db();
$acc = auth_account();
$access = 0;
if ($acc) { $st = $pdo->prepare('SELECT COUNT(*) FROM codes WHERE account_id = ? AND expires_at >= ? AND revoked = 0'); $st->execute([(int)$acc['id'], today()]); $access = (int)$st->fetchColumn() > 0 ? 1 : 0; }
$json = json_encode($clean, JSON_UNESCAPED_UNICODE);
$st = $pdo->prepare('SELECT id FROM survey WHERE sid = ?' . ($acc ? ' OR account_id = ?' : '') . ' ORDER BY id DESC LIMIT 1');
$st->execute($acc ? [$sid, (int)$acc['id']] : [$sid]);
$old = (int)$st->fetchColumn();
$args = [$role, $group, $clean['nps'] ?? null, $clean['email'] ?? null, $acc ? (int)$acc['id'] : null, $access, $json];
if ($old) $pdo->prepare('UPDATE survey SET updated_at = ?, role = ?, grp = ?, nps = ?, email = ?, account_id = ?, access = ?, answers = ? WHERE id = ?')->execute(array_merge([now()], $args, [$old]));
else $pdo->prepare('INSERT INTO survey(sid, created_at, updated_at, role, grp, nps, email, account_id, access, answers) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute(array_merge([$sid, now(), now()], $args));
json_out(['ok' => true, 'updated' => $old > 0]);
