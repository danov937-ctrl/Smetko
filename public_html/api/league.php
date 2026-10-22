<?php
/* Общи класации между училищата.
   POST {scope: schools|classes|teachers|students, period: week|all, grade: 0-4, token?}
   - Училища, класове и учители: видими за всички (без данни за деца).
   - Ученици: само за потребители с код (token) – прякор, клас, училище.
   Брои се само точките, спечелено след активирането на кода; класирането е по „точки на ученик“
   (всички точки ÷ броя ученици с код), за да е честно между малки и големи класове и училища. */
declare(strict_types=1);
require __DIR__ . '/lib.php';
require_post();
if (too_many('league', 240, 600)) json_out(['ok' => false, 'error' => 'Твърде чести заявки.'], 429);
note_attempt('league');
$in = json_in();
$scope = in_array($in['scope'] ?? '', ['schools', 'classes', 'teachers', 'students'], true) ? $in['scope'] : 'schools';
$period = ($in['period'] ?? '') === 'week' ? 'week' : 'all';
$grade = max(0, min(4, (int)($in['grade'] ?? 0)));
$me = null;
if (!empty($in['token'])) {
    $t = read_token((string)$in['token']);
    $c = $t ? get_code($t['c']) : null;
    if ($c && !(int)$c['revoked'] && $c['expires_at'] >= today()) $me = $t;
}
if ($scope === 'students' && !$me) json_out(['ok' => true, 'scope' => $scope, 'locked' => true, 'list' => []]);

const MIN_SCHOOL = 5;  // ученици с код, за да влезе училище в класацията
const MIN_CLASS = 3;

$pdo = db();
$week = week_key();
$st = $pdo->prepare("SELECT r.id, r.code, r.device, r.nickname, r.grade AS rgrade, r.points, r.join_base, r.week, r.week_base, r.hidden,
        b.id AS bid, b.type, b.class_name, b.grade AS bgrade, b.teacher_name, COALESCE(b.public, 1) AS public, s.id AS sid, s.name AS sname, s.town
    FROM redemptions r JOIN codes c ON c.code = r.code JOIN batches b ON b.id = c.batch_id LEFT JOIN schools s ON s.id = b.school_id
    WHERE c.revoked = 0 AND c.expires_at >= ? AND COALESCE(c.role, 'student') <> 'teacher'");
$st->execute([today()]);
$rows = [];
foreach ($st as $r) {
    $g = (int)($r['bgrade'] ?: $r['rgrade']);
    if ($grade && $g !== $grade) continue;
    $p = (int)$r['points'];
    $r['score'] = $period === 'week' ? ($r['week'] === $week ? max(0, $p - (int)$r['week_base']) : 0) : max(0, $p - (int)$r['join_base']);
    $r['g'] = $g;
    $rows[] = $r;
}
// брой издадени кодове за ученици (знаменател за „точки на ученик“)
$issued = ['b' => [], 's' => []];
$q = $pdo->prepare("SELECT b.id, b.school_id, COUNT(*) AS n, b.grade FROM codes c JOIN batches b ON b.id = c.batch_id
    WHERE c.revoked = 0 AND c.expires_at >= ? AND COALESCE(c.role, 'student') <> 'teacher' AND b.type = 'class' GROUP BY b.id");
$q->execute([today()]);
foreach ($q as $x) {
    if ($grade && (int)$x['grade'] && (int)$x['grade'] !== $grade) continue;
    $issued['b'][(int)$x['id']] = (int)$x['n'];
    if ($x['school_id']) $issued['s'][(int)$x['school_id']] = ($issued['s'][(int)$x['school_id']] ?? 0) + (int)$x['n'];
}
$mine = null;
if ($me) foreach ($rows as $r) if ($r['code'] === $me['c'] && hash_equals($r['device'], $me['d'])) $mine = $r;

function rank_groups(array $groups, int $min): array {
    $out = [];
    foreach ($groups as $k => $g) {
        if ($g['students'] < $min) continue;
        $g['avg'] = round($g['total'] / max(1, $g['students']), 1);
        $g['key'] = $k;
        $out[] = $g;
    }
    usort($out, fn($a, $b) => [$b['avg'], $b['total']] <=> [$a['avg'], $a['total']]);
    foreach ($out as $i => &$g) $g['place'] = $i + 1;
    return $out;
}

$list = []; $myPlace = null; $myKey = null;
if ($scope === 'schools') {
    $groups = [];
    foreach ($rows as $r) {
        if (!$r['sid']) continue;
        $k = (int)$r['sid'];
        $groups[$k] ??= ['name' => $r['sname'], 'town' => $r['town'] ?? '', 'total' => 0, 'active' => 0, 'classes' => [], 'students' => $issued['s'][$k] ?? 0];
        $groups[$k]['total'] += $r['score'];
        if ($r['score'] > 0) $groups[$k]['active']++;
        $groups[$k]['classes'][$r['bid']] = 1;
    }
    $myKey = $mine['sid'] ?? null;
    foreach (rank_groups($groups, MIN_SCHOOL) as $g) {
        $list[] = ['place' => $g['place'], 'name' => $g['name'], 'town' => $g['town'], 'avg' => $g['avg'], 'total' => $g['total'], 'active' => $g['active'], 'students' => $g['students'], 'classes' => count($g['classes']), 'mine' => $myKey !== null && (int)$g['key'] === (int)$myKey];
    }
} elseif ($scope === 'classes' || $scope === 'teachers') {
    $groups = [];
    foreach ($rows as $r) {
        if ($r['type'] !== 'class' || !(int)$r['public'] || !$r['sid']) continue;
        if ($scope === 'teachers' && trim((string)$r['teacher_name']) === '') continue;
        $k = $scope === 'classes' ? (string)$r['bid'] : $r['sid'] . '|' . mb_strtolower(trim((string)$r['teacher_name']));
        if (!isset($groups[$k])) {
            $groups[$k] = ['name' => $scope === 'classes' ? ($r['class_name'] ?: ($r['g'] ? $r['g'] . '. клас' : 'Клас')) : trim((string)$r['teacher_name']),
                'teacher' => (string)$r['teacher_name'], 'school' => $r['sname'], 'town' => $r['town'] ?? '', 'grade' => $r['g'], 'total' => 0, 'active' => 0, 'students' => 0, 'bids' => [], 'classes' => []];
        }
        $groups[$k]['total'] += $r['score'];
        if ($r['score'] > 0) $groups[$k]['active']++;
        if (!isset($groups[$k]['bids'][$r['bid']])) { $groups[$k]['bids'][$r['bid']] = 1; $groups[$k]['students'] += $issued['b'][(int)$r['bid']] ?? 0; $groups[$k]['classes'][] = $r['class_name'] ?: ''; }
    }
    if ($mine) $myKey = $scope === 'classes' ? (string)$mine['bid'] : $mine['sid'] . '|' . mb_strtolower(trim((string)$mine['teacher_name']));
    foreach (rank_groups($groups, MIN_CLASS) as $g) {
        $item = ['place' => $g['place'], 'name' => $g['name'], 'school' => $g['school'], 'town' => $g['town'], 'avg' => $g['avg'], 'total' => $g['total'], 'active' => $g['active'], 'students' => $g['students'], 'mine' => $myKey !== null && (string)$g['key'] === (string)$myKey];
        if ($scope === 'classes') $item['teacher'] = $g['teacher']; else $item['classes'] = implode(', ', array_filter($g['classes']));
        $list[] = $item;
    }
} else { // ученици
    $cand = array_values(array_filter($rows, fn($r) => !(int)$r['hidden'] && ($r['type'] !== 'class' || (int)$r['public']) && $r['score'] > 0));
    usort($cand, fn($a, $b) => [$b['score'], $a['id']] <=> [$a['score'], $b['id']]);
    foreach ($cand as $i => $r) {
        $isMe = $mine && (int)$r['id'] === (int)$mine['id'];
        if ($isMe) $myPlace = $i + 1;
        if ($i < 100 || $isMe) $list[] = ['place' => $i + 1, 'name' => $r['nickname'] ?: 'Играч', 'class' => $r['class_name'] ?: ($r['g'] ? $r['g'] . '. клас' : ''), 'school' => $r['sname'] ?: '', 'town' => $r['town'] ?? '', 'points' => $r['score'], 'mine' => (bool)$isMe];
    }
}
json_out(['ok' => true, 'scope' => $scope, 'period' => $period, 'grade' => $grade, 'week' => $week, 'list' => $list, 'myPlace' => $myPlace,
    'min' => $scope === 'schools' ? MIN_SCHOOL : MIN_CLASS]);
