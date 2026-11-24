<?php
/* Грамоти: списък с имена → отваря gramota.html за печат (A4 на ширина).
   Имената идват ръчно, от клас или от общата класация. Данните се подават през sessionStorage,
   както ги подават и „Табло“ (учител) и отчетът за родителя – js/diploma.js ги чете оттам. */
declare(strict_types=1);
require __DIR__ . '/_lib.php';
require_admin();
$pdo = db();

$LINES = [
    'Отлично представяне' => 'за отлично представяне по математика',
    'Напредък' => 'за старание и голям напредък по математика',
    'Най-много решени задачи' => 'за най-много решени задачи по математика',
    'Участие' => 'за участие в математическите мисии на Сметко',
    'Без нито един пропуснат ден' => 'за постоянство – нито един пропуснат ден',
];

/* ---------- откъде идват имената ---------- */
function from_batch(PDO $pdo, int $bid): array {
    $st = $pdo->prepare('SELECT r.nickname, ' . SCORE_ALL . ' AS pts FROM redemptions r
        JOIN codes c ON c.code = r.code WHERE c.batch_id = ? AND r.nickname IS NOT NULL AND r.nickname <> \'\'
        AND r.hidden = 0 ORDER BY pts DESC LIMIT 40');
    $st->execute([$bid]);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}
function from_league(PDO $pdo, int $n): array {
    $st = $pdo->prepare('SELECT r.nickname, ' . SCORE_ALL . ' AS pts FROM redemptions r
        WHERE r.nickname IS NOT NULL AND r.nickname <> \'\' AND r.hidden = 0 AND r.nick_block = 0
        ORDER BY pts DESC LIMIT ?');
    $st->execute([$n]);
    return $st->fetchAll(PDO::FETCH_ASSOC);
}

/* ---------- подготовка на грамотите ---------- */
if (($_POST['action'] ?? '') === 'make' && csrf_ok()) {
    $src = post('src', 'manual');
    $kind = in_array(post('kind'), ['class', 'league', 'child'], true) ? post('kind') : 'class';
    $line = mb_substr(post('line_custom') ?: post('line') ?: $LINES['Отлично представяне'], 0, 160);
    $places = post('places') === '1';
    $items = [];

    if ($src === 'batch') {
        $bid = (int)post('batch_id');
        foreach (from_batch($pdo, $bid) as $i => $r)
            $items[] = ['name' => $r['nickname'], 'place' => $places && $i < 3 ? $i + 1 : 0, 'line' => $line];
    } elseif ($src === 'league') {
        $n = max(1, min(40, (int)post('top') ?: 10));
        foreach (from_league($pdo, $n) as $i => $r)
            $items[] = ['name' => $r['nickname'], 'place' => $places && $i < 3 ? $i + 1 : 0, 'line' => $line];
    } else {
        $i = 0;
        foreach (preg_split('/\R/u', post('names')) as $raw) {
            $raw = trim($raw);
            if ($raw === '') continue;
            $parts = array_map('trim', explode('|', $raw));
            $items[] = ['name' => mb_substr($parts[0], 0, 60),
                        'place' => $places && $i < 3 ? $i + 1 : 0,
                        'line' => mb_substr($parts[1] ?? $line, 0, 160)];
            $i++;
            if ($i >= 60) break;
        }
    }

    if (!$items) { flash('Няма нито едно име – напишете имената или изберете клас.', 'err'); go('gramoti.php'); }

    $data = ['kind' => $kind, 'year' => post('year') ?: school_year_label(),
             'className' => mb_substr(post('class_name'), 0, 40), 'school' => mb_substr(post('school'), 0, 80),
             'sign1' => mb_substr(post('sign1'), 0, 60), 'sign2' => mb_substr(post('sign2'), 0, 60),
             'items' => $items];
    audit('Грамоти', count($items) . ' бр. · ' . ($data['className'] ?: $src));
    $json = json_encode($data, JSON_UNESCAPED_UNICODE);
    echo '<!doctype html><meta charset="utf-8"><title>Грамоти</title><p style="font:16px system-ui;padding:24px">Отварям грамотите…</p>'
       . '<script>try{sessionStorage.setItem("smetko.dipl", ' . json_encode($json, JSON_UNESCAPED_UNICODE) . ');}catch(e){}'
       . 'location.replace("../gramota.html");</script>';
    exit;
}

/* ---------- формата ---------- */
function school_year_label(): string { $y = (int)date('Y'); if ((int)date('n') < 9) $y--; return $y . '/' . ($y + 1); }

$batches = $pdo->query("SELECT b.id, b.class_name, b.label, s.name AS sname, s.town,
    (SELECT COUNT(*) FROM redemptions r JOIN codes c ON c.code = r.code WHERE c.batch_id = b.id AND r.nickname <> '') AS n
    FROM batches b LEFT JOIN schools s ON s.id = b.school_id ORDER BY b.id DESC LIMIT 100")->fetchAll(PDO::FETCH_ASSOC);
$withKids = array_values(array_filter($batches, fn($b) => (int)$b['n'] > 0));
$leagueN = (int)$pdo->query("SELECT COUNT(*) FROM redemptions WHERE nickname <> '' AND hidden = 0 AND nick_block = 0")->fetchColumn();

$opts = '';
foreach ($withKids as $b) {
    $nm = trim(($b['sname'] ?? '') . ($b['class_name'] ? ' · ' . $b['class_name'] . ' клас' : '') . ($b['label'] ? ' · ' . $b['label'] : ''));
    $opts .= '<option value="' . (int)$b['id'] . '">' . h($nm ?: 'Клас #' . $b['id']) . ' (' . (int)$b['n'] . ' ученици)</option>';
}
$lineOpts = '';
foreach ($LINES as $name => $txt) $lineOpts .= '<option value="' . h($txt) . '">' . h($name) . '</option>';

$body = '<form method="post" class="card grid g2">' . csrf_field() . '<input type="hidden" name="action" value="make">
<div class="wide"><h2 style="margin:0 0 4px">Грамоти за печат</h2>
<p class="muted" style="margin:0">Избирате откъде идват имената, попълвате подписите и натискате „Отвори грамотите“.
Отварят се готови за печат на A4 на ширина. Имената и подписите могат да се поправят и там, преди печат.</p></div>

<label class="wide">Откъде са имената
<select name="src" id="src">
  <option value="manual">Ръчно – пиша имената</option>' .
  ($withKids ? '<option value="batch">От клас в Сметко</option>' : '') .
  ($leagueN ? '<option value="league">От общата класация (първите N)</option>' : '') . '
</select></label>

<label class="wide src manual">Имената – по едно на ред
<textarea name="names" rows="8" placeholder="Иван Петров&#10;Мария Георгиева | за най-много решени задачи&#10;Георги Стоянов"></textarea>
<span class="hint">След „|“ може да се напише различен текст само за това дете. До 60 имена.</span></label>' .

($withKids ? '<label class="wide src batch" hidden>Клас<select name="batch_id">' . $opts . '</select>
<span class="hint">Взимат се прякорите на учениците, подредени по точки.</span></label>' : '') .

($leagueN ? '<label class="wide src league" hidden>Колко от класацията
<input type="number" name="top" value="10" min="1" max="40">
<span class="hint">В класацията в момента има ' . $leagueN . ' ученици.</span></label>' : '') . '

<label>Текст под името<select name="line" id="lineSel">' . $lineOpts . '<option value="">— друг —</option></select></label>
<label id="lineFree" hidden>Собствен текст<input name="line_custom" maxlength="160" placeholder="за…"></label>

<label>Учебна година<input name="year" value="' . h(school_year_label()) . '" maxlength="12"></label>
<label>Клас<input name="class_name" placeholder="3. а" maxlength="40"></label>
<label>Училище<input name="school" placeholder="ОУ „Иван Вазов“, Пловдив" maxlength="80"></label>
<label>Подпис отляво<input name="sign1" placeholder="Име на учителя" maxlength="60"></label>
<label>Подпис отдясно<input name="sign2" placeholder="Име на директора" maxlength="60"></label>
<label>Вид<select name="kind">
  <option value="class">Класна – подписи учител и директор</option>
  <option value="league">От Сметко – подпис „Екипът на Сметко“</option>
  <option value="child">Домашна – подпис родител</option>
</select></label>
<label class="chk wide"><input type="checkbox" name="places" value="1"> Първите трима получават I, II и III място (с медал)</label>
<div class="wide row"><button class="btn">🎓 Отвори грамотите</button>
<a class="btn ghost" href="../gramota.html" target="_blank">Как изглежда грамотата ↗</a></div>
</form>

<script>
(function () {
  var src = document.getElementById("src");
  function show() { document.querySelectorAll(".src").forEach(function (el) { el.hidden = !el.classList.contains(src.value); }); }
  src.addEventListener("change", show); show();
  var sel = document.getElementById("lineSel"), free = document.getElementById("lineFree");
  sel.addEventListener("change", function () { free.hidden = sel.value !== ""; });
})();
</script>';

page('Грамоти', $body);
