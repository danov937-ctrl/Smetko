<?php
/* „Моят клас“ за ученика: класацията на класа (само прякори и точки). POST {token}
   Учителят вижда всичко за класа в „Табло“ (api/teacher.php). */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
$in = json_in();
$teacher = false;
$t = read_token((string)($in['token'] ?? ''));
if (!$t) json_out(['ok' => false, 'error' => 'Невалиден достъп.'], 401);
$code = $t['c']; $me = $t['d'];
$row = get_code($code);
$batch = $row ? batch_of($code) : null;
if (!$row || $row['type'] !== 'class' || !$batch) json_out(['ok' => false, 'error' => 'Класацията е само за ученици от клас.'], 404);
$bid = (int)$batch['id'];
$pdo = db();
$st = $pdo->prepare("SELECT r.id, r.code, r.device, r.nickname, r.grade, MAX(0, r.points - COALESCE(r.join_base, 0)) AS points, r.correct, r.answered, r.stars, r.missions, r.last_seen, r.hidden, r.stats
    FROM redemptions r JOIN codes c ON c.code = r.code
    WHERE c.batch_id = ? AND COALESCE(c.role, 'student') <> 'teacher' AND c.revoked = 0
    ORDER BY points DESC, r.correct DESC, r.id");
$st->execute([$bid]);
$list = []; $topics = [];
$i = 0;
foreach ($st->fetchAll() as $r) {
    if (!$teacher && (int)$r['hidden'] === 1) continue;
    $i++;
    $item = ['place' => $i, 'name' => $r['nickname'] ?: 'Играч ' . $i, 'points' => (int)$r['points'], 'stars' => (int)$r['stars'], 'missions' => (int)$r['missions'], 'me' => $me && hash_equals($r['device'], $me)];
    if ($teacher) {
        $stt = $r['stats'] ? (json_decode((string)$r['stats'], true) ?: []) : [];
        $sk = is_array($stt['s'] ?? null) ? $stt['s'] : []; $dy = is_array($stt['d'] ?? null) ? $stt['d'] : [];
        $item += ['skills' => (object)$sk, 'days' => (object)$dy];
        foreach ($sk as $k => [$c, $a]) {
            $topics[$k] ??= ['c' => 0, 'a' => 0, 'n' => 0, 'weak' => []];
            $topics[$k]['c'] += $c; $topics[$k]['a'] += $a; $topics[$k]['n']++;
            if ($a >= 5 && $c / $a < 0.6 && (int)$r['hidden'] === 0) $topics[$k]['weak'][] = $r['nickname'] ?: 'Играч ' . $i;
        }
        $active7 = 0; for ($q = 0; $q < 7; $q++) if (!empty($dy[date('Y-m-d', strtotime("-$q days"))][0])) $active7++;
        $item['active7'] = $active7;
    }
    if ($teacher) $item += ['id' => (int)$r['id'], 'code' => $r['code'], 'correct' => (int)$r['correct'], 'answered' => (int)$r['answered'], 'grade' => (int)$r['grade'], 'last' => $r['last_seen'], 'hidden' => (int)$r['hidden'] === 1];
    $list[] = $item;
}
$n = $pdo->prepare('SELECT COUNT(*) FROM redemptions WHERE code = ?'); $n->execute([$code]);
$school = null;
if (!empty($batch['school_id'])) { $q = $pdo->prepare('SELECT name, town FROM schools WHERE id = ?'); $q->execute([(int)$batch['school_id']]); $school = $q->fetch() ?: null; }
json_out(['ok' => true, 'label' => $batch['label'] ?: $row['label'], 'school' => $school, 'className' => $batch['class_name'] ?? '', 'teacherName' => $batch['teacher_name'] ?? '', 'public' => (int)($batch['public'] ?? 1) === 1, 'expires' => $row['expires_at'], 'uses' => count($list), 'max' => (int)$n->fetchColumn(), 'teacher' => $teacher, 'list' => $list] + ($teacher ? ['topics' => (object)$topics] : []));
