/* Сборник за подготовка за НВО по математика в 4. клас.
   Строи 30 теста от генератора на Сметко (js/math-engine.js) със стабилен seed – резултатът е
   един и същ при всяко пускане, за да може сборникът да се препечатва.

   Част I  – 20 тренировъчни теста: 10 теми по 2 равностойни варианта (А и Б), по 12 задачи.
   Част II – 12 примерни изпитни теста по ДЕЙСТВАЩИЯ модел на МОН (в сила от 2024/2025):
             25 задачи, 100 точки, 60 минути – 16 с избираем отговор, 4 с кратък свободен,
             4 с разширен свободен и 1 с разширен отговор с три подусловия.
             (Старият модел 18/5/1/1 важеше до 2023/2024 – не го ползвайте.)
   Част III – ключ с отговорите, критерии за задачите с решение и скала точки → оценка.

   Стартиране:  node tools/sbornik.js   →  tools/sbornik/index.html
   PDF:         node tools/sbornik_pdf.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

// ---------- генераторът на задачи със стабилен seed ----------
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const SRC = fs.readFileSync(path.join(__dirname, '..', 'public_html', 'js', 'math-engine.js'), 'utf8');
const ctx = { window: {}, Math: Object.create(Math), console };
let RAND = mulberry(1);
ctx.Math.random = () => RAND();
vm.createContext(ctx); vm.runInContext(SRC, ctx);
const E = ctx.window.Smetko.MathEngine;
function seed(n) { RAND = mulberry(n); }
const rnd = (a, b) => Math.floor(RAND() * (b - a + 1)) + a;
const pick = a => a[Math.floor(RAND() * a.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(RAND() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const fmt = n => E.fmt(n);
const AZ = i => String.fromCharCode(1072 + i);               // а, б, в, г

// ---------- 10-те теми на тренировъчната част ----------
const THEMES = [
  { n: 'Числата над 1000', s: ['placeBig', 'cmpBig', 'nextPrevBig'], lv: 2,
    hint: 'Групирайте цифрите по три отдясно – така числото се чете без броене.' },
  { n: 'Римски цифри', s: ['romanRead', 'romanWrite'], lv: 2,
    hint: 'Отляво надясно от голямото към малкото; по-малкото пред по-голямото значи изваждане (IX = 9).' },
  { n: 'Събиране и изваждане без преминаване', s: ['addBigNo', 'subBigNo', 'unkSubtrahend'], lv: 2,
    hint: 'Подреждайте единици под единици. Проверката е обратното действие.' },
  { n: 'Събиране и изваждане с преминаване', s: ['addBigX', 'subBigX'], lv: 3,
    hint: 'Пренесеното се пише над следващата колона и се зачерква, щом се използва.' },
  { n: 'Умножение с едноцифрено число', s: ['mulBig1d'], lv: 2,
    hint: 'Първо умножавам, после добавям пренесеното – никога обратното.' },
  { n: 'Деление с едноцифрено число', s: ['divBig1d', 'unkDivisor'], lv: 2,
    hint: 'Свалям цифра – пиша цифра. Дори когато е нула.' },
  { n: 'Умножение с двуцифрено число', s: ['mul2d'], lv: 2,
    hint: 'Вторият ред се отмества с една позиция наляво, защото умножаваме по десетици.' },
  { n: 'Деление с двуцифрено число', s: ['div2d'], lv: 2,
    hint: 'Закръглете делителя, за да прецените частното: 26 е около 25.' },
  { n: 'Лице, обиколка и мерни единици', s: ['area', 'areaUnits', 'sideFromArea', 'units3b'], lv: 2,
    hint: 'Обиколката е в метри, лицето – в квадратни метри. Внимавайте с единиците.' },
  { n: 'Ъгли, фигури и геометрични тела', s: ['degrees', 'solidsName', 'solidsCount', 'triAngles'], lv: 2,
    hint: 'Прав ъгъл е 90°, тъп е над 90°, остър е под 90°.' },
];

// ---------- помощни за задачите ----------
function toMC(t) {
  const a = +t.answer, set = { [a]: 1 }, opts = [a];
  let cand = [a + 1, a - 1, a + 10, a - 10, a + 2, a - 2, a * 2, Math.round(a / 2), a + 100, a - 100,
    +String(a).split('').reverse().join('')];
  cand = shuffle(cand);
  for (let i = 0; i < cand.length && opts.length < 4; i++) {
    const c = cand[i];
    if (c >= 0 && !set[c] && isFinite(c) && Number.isInteger(c)) { set[c] = 1; opts.push(c); }
  }
  while (opts.length < 4) { const x = a + rnd(3, 20); if (!set[x]) { set[x] = 1; opts.push(x); } }
  const o = shuffle(opts);
  return { q: t.q, kind: 'choice', answer: AZ(o.indexOf(a)), full: t.full, figure: t.figure,
    choices: o.map((v, i) => AZ(i) + ') ' + fmt(v)) };
}
function clean(q, mc) {
  // при задача с избор мястото за отговор е квадратче, както на изпита
  return String(q).replace(/\{\?\}/g, mc ? '<span class="box"></span>' : '<span class="blank"></span>');
}

/* Готовите отговори се номерират с а) б) в) г) – както в изпитните материали. */
function lettered(t) {
  if (t.kind !== 'choice' || !Array.isArray(t.choices)) return t;
  if (typeof t.choices[0] === 'string' && /^[а-г]\)/.test(t.choices[0])) return t;   // вече са с букви
  const vals = t.choices.map(c => (typeof c === 'object' ? c : { v: c, html: String(c) }));
  const idx = vals.findIndex(c => String(c.v) === String(t.answer));
  return Object.assign({}, t, {
    answer: idx >= 0 ? AZ(idx) : t.answer,
    choices: vals.map((c, i) => AZ(i) + ') ' + (c.html || c.v)),
  });
}

/* взима годни задачи от списък умения, без повторения и без еднакви шаблони.
   st е общо за целия тест, за да няма повтаряща се задача между частите му. */
function newState() { return { seen: new Set(), tpl: new Set() }; }
function take(st, skills, lv, n, want) {
  const out = [], seen = st.seen, tpl = st.tpl;
  let guard = 0;
  while (out.length < n && guard++ < n * 150) {
    const t = E.generateSkill(4, pick(skills), lv);
    if (!t || t.dots) continue;
    if (t.kind === 'choice' && Array.isArray(t.choices) && typeof t.choices[0] === 'object' && !t.choices[0].html) continue;
    const key = String(t.q).replace(/<[^>]+>/g, '');
    if (seen.has(key)) continue;
    const sig = key.replace(/\d+/g, 'N');
    if (sig.length > 45) { if (tpl.has(sig)) continue; tpl.add(sig); }
    if (want === 'number' && t.kind !== 'number') continue;
    seen.add(key); out.push(t);
  }
  return out;
}

/* ---------- задачи с разширен свободен отговор (пише се решение) ----------
   Групирани по темите на задачи 21–24 от модела:
     model   – текстова задача от живота (илюстрация/схема)
     geom    – обиколка и лице
     table   – данни от таблица
     compare – умножение и сравняване (колко повече/по-малко) */
const EXT = [
  () => { const a = rnd(12, 28), b = rnd(6, 11);
    return { q: `Правоъгълна градина е с дължина ${a} м и широчина ${b} м. Намерете обиколката и лицето на градината. Запишете решението.`,
      sol: `P = (${a} + ${b}) · 2 = ${a + b} · 2 = ${(a + b) * 2} м<br>S = ${a} · ${b} = ${a * b} кв. м<br><b>Отговор: обиколката е ${(a + b) * 2} м, лицето е ${a * b} кв. м.</b>`,
      crit: 'По 3 т. за всяко вярно пресметнато (обиколка и лице) и 2 т. за верни мерни единици и отговор с изречение.' }; },
  () => { const n = rnd(7, 12), p = rnd(3, 9), pay = Math.ceil((n * p + rnd(8, 40)) / 10) * 10;
    return { q: `Едно дете купува ${n} книги по ${p} евро всяка и плаща с ${pay} евро. Колко евро ще му върнат? Запишете решението.`,
      sol: `${n} · ${p} = ${n * p} евро струват книгите<br>${pay} − ${n * p} = ${pay - n * p} евро<br><b>Отговор: ще му върнат ${pay - n * p} евро.</b>`,
      crit: '4 т. за вярно намерена стойност на покупката, 2 т. за изваждането, 2 т. за отговор с изречение.' }; },
  () => { const k = rnd(8, 14), per = rnd(6, 9), left = rnd(1, per - 1); const total = k * per + left;
    return { q: `В склад има ${total} кутии. Подреждат ги на рафтове по ${per} кутии. Колко рафта ще се напълнят и колко кутии ще останат? Запишете решението.`,
      sol: `${total} : ${per} = ${k} и остатък ${left}<br><b>Отговор: ще се напълнят ${k} рафта и ще останат ${left} кутии.</b>`,
      crit: '4 т. за вярно деление, 2 т. за вярно определен остатък, 2 т. за отговор с изречение.' }; },
  () => { const a = rnd(2000, 6000), b = rnd(700, 1800), c = rnd(2, 4);
    return { q: `Намерете неизвестното число: ако към него прибавим ${fmt(b)}, се получава ${fmt(a)}. Умножете намереното число с ${c}. Запишете решението.`,
      sol: `x + ${fmt(b)} = ${fmt(a)}<br>x = ${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}<br>${fmt(a - b)} · ${c} = ${fmt((a - b) * c)}<br><b>Отговор: ${fmt((a - b) * c)}.</b>`,
      crit: '4 т. за вярно намерено неизвестно число, 3 т. за умножението, 1 т. за отговор.' }; },
  () => { const s = rnd(13, 24), S = s * rnd(5, 12);
    return { q: `Лицето на правоъгълник е ${S} кв. см, а едната му страна е ${s} см. Намерете другата страна и обиколката. Запишете решението.`,
      sol: `${S} : ${s} = ${S / s} см е другата страна<br>P = (${s} + ${S / s}) · 2 = ${(s + S / s) * 2} см<br><b>Отговор: другата страна е ${S / s} см, обиколката е ${(s + S / s) * 2} см.</b>`,
      crit: '4 т. за вярно намерената страна, 3 т. за обиколката, 1 т. за мерните единици.' }; },
  () => { const a = rnd(120, 480), b = rnd(20, 90), c = rnd(3, 6);
    return { q: `Пресметнете израза и запишете решението по действия: (${a} + ${b}) · ${c} − ${fmt(a * 2)}.`,
      sol: `1) ${a} + ${b} = ${a + b}<br>2) ${a + b} · ${c} = ${fmt((a + b) * c)}<br>3) ${fmt((a + b) * c)} − ${fmt(a * 2)} = ${fmt((a + b) * c - a * 2)}<br><b>Отговор: ${fmt((a + b) * c - a * 2)}.</b>`,
      crit: 'По 2 т. за всяко вярно действие и 2 т. за спазен ред на действията.' }; },
  () => { const w = rnd(3, 7), m = rnd(20, 60), d = rnd(2, 5);
    return { q: `Клас събира капачки. През първата седмица събрали ${fmt(m * 10)} броя, а през втората – ${d} пъти повече. Колко капачки са събрали за двете седмици? Запишете решението.`,
      sol: `${fmt(m * 10)} · ${d} = ${fmt(m * 10 * d)} през втората седмица<br>${fmt(m * 10)} + ${fmt(m * 10 * d)} = ${fmt(m * 10 + m * 10 * d)}<br><b>Отговор: събрали са ${fmt(m * 10 + m * 10 * d)} капачки.</b>`,
      crit: '4 т. за вярно намерен втори брой, 3 т. за сбора, 1 т. за отговор с изречение.' }; },
  () => { const big = rnd(7000, 9500), mid = rnd(3000, 6500), small = rnd(900, 2800);
    return { q: `Дадени са числата ${fmt(big)}, ${fmt(mid)} и ${fmt(small)}. Подредете ги по големина от най-малкото към най-голямото и намерете разликата между най-голямото и най-малкото. Запишете решението.`,
      sol: `${fmt(small)} &lt; ${fmt(mid)} &lt; ${fmt(big)}<br>${fmt(big)} − ${fmt(small)} = ${fmt(big - small)}<br><b>Отговор: разликата е ${fmt(big - small)}.</b>`,
      crit: '3 т. за вярна подредба, 4 т. за изваждането, 1 т. за отговор.' }; },
  () => { const r = rnd(14, 26), c = rnd(12, 19), free = rnd(20, 60), busy = r * c - free;
    return { q: `В салон има ${r} реда по ${c} места. На представление са заети ${fmt(busy)} места. Колко места са свободни? Запишете решението.`,
      sol: `Общо места: ${r} · ${c} = ${fmt(r * c)}<br>${fmt(r * c)} − ${fmt(busy)} = ${free}<br><b>Отговор: свободни са ${free} места.</b>`,
      crit: '4 т. за вярно намерен общ брой места, 3 т. за изваждането, 1 т. за отговор с изречение.' }; },
  () => { const d1 = rnd(180, 420), d2 = rnd(150, 380);
    return { q: `Автомобил изминал ${d1} км сутринта и ${d2} км следобед. Колко километра е изминал общо и с колко повече сутринта или следобед? Запишете решението.`,
      sol: `${d1} + ${d2} = ${d1 + d2} км общо<br>${Math.max(d1, d2)} − ${Math.min(d1, d2)} = ${Math.abs(d1 - d2)} км повече ${d1 > d2 ? 'сутринта' : 'следобед'}<br><b>Отговор: общо ${d1 + d2} км; с ${Math.abs(d1 - d2)} км повече ${d1 > d2 ? 'сутринта' : 'следобед'}.</b>`,
      crit: '3 т. за сбора, 3 т. за разликата, 2 т. за пълен отговор на двата въпроса.' }; },
  () => { const a = rnd(3, 8), b = rnd(140, 380), c = rnd(2, 5);
    return { q: `В ${a} еднакви кашона има по ${b} молива. От тях са извадени ${fmt(b * c)} молива. Колко молива остават? Запишете решението.`,
      sol: `${a} · ${b} = ${fmt(a * b)} молива общо<br>${fmt(a * b)} − ${fmt(b * c)} = ${fmt(a * b - b * c)}<br><b>Отговор: остават ${fmt(a * b - b * c)} молива.</b>`,
      crit: '2 т. за общия брой, 2 т. за изваждането, 1 т. за отговор с изречение.' }; },
  () => { const h = rnd(9, 11), m = pick([10, 15, 20, 25, 40, 45]), dur = pick([35, 50, 65, 80, 95]);
    const t0 = h * 60 + m, t1 = t0 + dur;
    return { q: `Филм започва в ${h}:${String(m).padStart(2, '0')} ч. и трае ${dur} минути. В колко часа свършва? Запишете решението.`,
      sol: `${h} ч. и ${m} мин. + ${dur} мин. = ${Math.floor(t1 / 60)} ч. и ${t1 % 60} мин.<br><b>Отговор: филмът свършва в ${Math.floor(t1 / 60)}:${String(t1 % 60).padStart(2, '0')} ч.</b>`,
      crit: '3 т. за вярно събиране с превръщане на минутите в часове, 2 т. за записан отговор.' }; },
  () => { const km = rnd(120, 460), d = rnd(2, 4);
    return { q: `Разстоянието между два града е ${km} км. Автобус го изминава ${d} пъти за седмица в двете посоки. Колко километра изминава за седмица? Запишете решението.`,
      sol: `В двете посоки: ${km} · 2 = ${fmt(km * 2)} км<br>${fmt(km * 2)} · ${d} = ${fmt(km * 2 * d)} км<br><b>Отговор: ${fmt(km * 2 * d)} км за седмица.</b>`,
      crit: '2 т. за двете посоки, 2 т. за умножението, 1 т. за отговор с изречение.' }; },
  () => { const s1 = rnd(6, 14), s2 = rnd(6, 14), s3 = rnd(6, 14);
    return { q: `Триъгълник има страни ${s1} см, ${s2} см и ${s3} см. Намерете обиколката му. Колко по-дълга е най-дългата страна от най-късата? Запишете решението.`,
      sol: `P = ${s1} + ${s2} + ${s3} = ${s1 + s2 + s3} см<br>${Math.max(s1, s2, s3)} − ${Math.min(s1, s2, s3)} = ${Math.max(s1, s2, s3) - Math.min(s1, s2, s3)} см<br><b>Отговор: обиколката е ${s1 + s2 + s3} см; най-дългата страна е с ${Math.max(s1, s2, s3) - Math.min(s1, s2, s3)} см по-дълга.</b>`,
      crit: '2 т. за обиколката, 2 т. за разликата, 1 т. за мерните единици.' }; },
  () => { const t = rnd(3, 9), kg = rnd(200, 800), taken = rnd(2, 5) * 500;
    const all = t * 1000 + kg;
    return { q: `В склад има ${t} тона и ${kg} кг брашно. Изразете количеството в килограми и пресметнете колко остава, след като се вземат ${fmt(taken)} кг. Запишете решението.`,
      sol: `1 тон = 1000 кг, значи ${t} т ${kg} кг = ${fmt(all)} кг<br>${fmt(all)} − ${fmt(taken)} = ${fmt(all - taken)} кг<br><b>Отговор: остават ${fmt(all - taken)} кг.</b>`,
      crit: '3 т. за вярно превръщане на тоновете в килограми, 2 т. за изваждането.' }; },
  () => { const n = rnd(4, 9), p1 = rnd(120, 480);
    return { q: `Числото ${fmt(p1)} се увеличава ${n} пъти, а после се намалява с ${fmt(p1)}. Кое число се получава? Запишете решението.`,
      sol: `${fmt(p1)} · ${n} = ${fmt(p1 * n)}<br>${fmt(p1 * n)} − ${fmt(p1)} = ${fmt(p1 * n - p1)}<br><b>Отговор: получава се ${fmt(p1 * n - p1)}.</b>`,
      crit: '2 т. за умножението, 2 т. за изваждането, 1 т. за отговор.' }; },
  () => { const a = rnd(14, 28), b = rnd(9, 16);
    return { q: `Квадрат има страна ${b} см, а правоъгълник – страни ${a} см и ${b} см. Коя фигура има по-голямо лице и с колко? Запишете решението.`,
      sol: `Квадрат: ${b} · ${b} = ${b * b} кв. см<br>Правоъгълник: ${a} · ${b} = ${a * b} кв. см<br>${Math.max(a * b, b * b)} − ${Math.min(a * b, b * b)} = ${Math.abs(a * b - b * b)} кв. см<br><b>Отговор: по-голямо лице има ${a > b ? 'правоъгълникът' : 'квадратът'} – с ${Math.abs(a * b - b * b)} кв. см.</b>`,
      crit: '2 т. за всяко лице и 1 т. за сравнението с отговор.' }; },
  () => { const d = rnd(6, 12), per = rnd(25, 60), eat = per - rnd(3, 8);
    return { q: `Детска градина получава по ${per} кифли на ден, а децата изяждат по ${eat}. Колко кифли получава за ${d} дни и колко остават? Запишете решението.`,
      sol: `${per} · ${d} = ${per * d} получени кифли<br>${eat} · ${d} = ${eat * d} изядени<br>${per * d} − ${eat * d} = ${per * d - eat * d}<br><b>Отговор: получава ${per * d} кифли и остават ${per * d - eat * d}.</b>`,
      crit: '2 т. за всяко вярно умножение, 1 т. за изваждането и отговора.' }; },
];


/* Трите групи сочат към EXT по темите на задачи 21, 22 и 24 от модела:
   21 – моделиране на житейска ситуация, 22 – обиколка и лице, 24 – умножение и сравняване. */
const EXT_GEOM  = [0, 4, 13, 16].map(i => EXT[i]);
const EXT_MODEL = [1, 2, 3, 5, 8, 10, 11, 14].map(i => EXT[i]);
const EXT_CMP   = [6, 7, 9, 12, 15, 17].map(i => EXT[i]);

// --- задачи с данни от таблица (както задача 23 на изпита) ---
function tableHTML(head, rows) {
  return '<table class="task-tbl"><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
    '</tr></thead><tbody>' + rows.map(function (r) {
      return '<tr>' + r.map(function (c, i) { return i ? '<td class="num">' + c + '</td>' : '<td>' + c + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
}
const EXT_TABLE = [
  () => { const kids = ['Ани', 'Борис', 'Вера'], p1 = rnd(2, 5), p2 = rnd(3, 7);
    const a = [rnd(2, 4), rnd(1, 3)], b = [rnd(1, 3), rnd(2, 4)];
    const sumA = a[0] * p1 + a[1] * p2, sumB = b[0] * p1 + b[1] * p2;
    return { q: 'Таблицата показва какво са купили три деца в сладкарницата. Един сладолед струва ' + p1 +
        ' евро, а едно парче торта – ' + p2 + ' евро.' +
        tableHTML(['Дете', 'Сладоледи', 'Торти'], [[kids[0], a[0], a[1]], [kids[1], b[0], b[1]]]) +
        'Колко евро е платило всяко дете и кое е платило повече? Запишете решението.',
      sol: kids[0] + ': ' + a[0] + ' · ' + p1 + ' + ' + a[1] + ' · ' + p2 + ' = ' + sumA + ' евро<br>' +
        kids[1] + ': ' + b[0] + ' · ' + p1 + ' + ' + b[1] + ' · ' + p2 + ' = ' + sumB + ' евро<br>' +
        '<b>Отговор: ' + (sumA > sumB ? kids[0] : kids[1]) + ' е платило повече – с ' + Math.abs(sumA - sumB) + ' евро.</b>',
      crit: 'По 2 т. за всяка вярно пресметната сума и 1 т. за сравнението с отговор.' }; },
  () => { const cls = ['4. а', '4. б', '4. в'], v = [rnd(18, 26), rnd(17, 25), rnd(19, 27)], abs = [rnd(1, 4), rnd(0, 3), rnd(2, 5)];
    const tot = v[0] + v[1] + v[2], ab = abs[0] + abs[1] + abs[2];
    return { q: 'Таблицата показва броя на учениците в три паралелки и колко от тях отсъстват днес.' +
        tableHTML(['Паралелка', 'Ученици', 'Отсъстващи'], [[cls[0], v[0], abs[0]], [cls[1], v[1], abs[1]], [cls[2], v[2], abs[2]]]) +
        'Колко ученици присъстват общо в трите паралелки? Запишете решението.',
      sol: 'Общо ученици: ' + v.join(' + ') + ' = ' + tot + '<br>Общо отсъстващи: ' + abs.join(' + ') + ' = ' + ab +
        '<br>' + tot + ' − ' + ab + ' = ' + (tot - ab) + '<br><b>Отговор: присъстват ' + (tot - ab) + ' ученици.</b>',
      crit: '2 т. за общия брой ученици, 2 т. за отсъстващите, 1 т. за изваждането и отговора.' }; },
  () => { const d = ['понеделник', 'вторник', 'сряда'], km = [rnd(120, 240), rnd(90, 210), rnd(140, 260)];
    const tot = km[0] + km[1] + km[2];
    return { q: 'Таблицата показва изминатите километри за три дни от една екскурзия.' +
        tableHTML(['Ден', 'Километри'], [[d[0], km[0]], [d[1], km[1]], [d[2], km[2]]]) +
        'Колко километра са изминати общо и в кой ден разстоянието е най-голямо? Запишете решението.',
      sol: km.join(' + ') + ' = ' + fmt(tot) + ' км<br>Най-голямо разстояние: ' + d[km.indexOf(Math.max.apply(null, km))] +
        ' – ' + Math.max.apply(null, km) + ' км<br><b>Отговор: общо ' + fmt(tot) + ' км; най-дълъг е ' + d[km.indexOf(Math.max.apply(null, km))] + '.</b>',
      crit: '3 т. за вярно събиране, 2 т. за намиране на най-голямото и отговор с изречение.' }; },
];

// ---------- текстова задача с три подусловия ----------
const WORD3 = [
  () => { const k = rnd(4, 7), per = rnd(18, 28), extra = rnd(25, 60), box = rnd(6, 9);
    const total = k * per + extra, sold = rnd(40, total - 40), left = total - sold, shelves = Math.ceil(left / box);
    return { q: `В магазин има ${k} каси с по ${per} кутии сок и още ${extra} кутии в склада.`,
      subs: [`Колко кутии сок има в магазина?`, `През деня са продадени ${sold} кутии. Колко остават?`,
        `Останалите кутии се подреждат по ${box} на рафт. Колко рафта са нужни?`],
      sol: [`${k} · ${per} = ${k * per}; ${k * per} + ${extra} = ${total} кутии`,
        `${total} − ${sold} = ${left} кутии`,
        `${left} : ${box} = ${Math.floor(left / box)} и остатък ${left % box}; нужни са ${shelves} рафта (остатъкът също иска рафт)`] }; },
  () => { const cl = rnd(8, 14), st = rnd(19, 26), abs = rnd(12, 30), gr = rnd(5, 8);
    const total = cl * st, here = total - abs, groups = Math.ceil(here / gr);
    return { q: `В училище има ${cl} паралелки с по ${st} ученици.`,
      subs: [`Колко ученици има в училището?`, `В един ден отсъстват ${abs} ученици. Колко присъстват?`,
        `Присъстващите се разделят на групи по ${gr}. Колко групи ще се получат?`],
      sol: [`${cl} · ${st} = ${fmt(total)} ученици`, `${fmt(total)} − ${abs} = ${fmt(here)} ученици`,
        `${fmt(here)} : ${gr} = ${Math.floor(here / gr)} и остатък ${here % gr}; ще се получат ${groups} групи`] }; },
  () => { const cr = rnd(12, 20), kg = rnd(14, 22), sold = rnd(80, 160), sh = rnd(4, 7);
    const total = cr * kg, left = total - sold;
    return { q: `В склад докарали ${cr} щайги ябълки по ${kg} кг.`,
      subs: [`Колко килограма ябълки са докарали?`, `Продадени са ${sold} кг. Колко килограма остават?`,
        `Останалите се разпределят поравно в ${sh} магазина. По колко килограма ще получи всеки магазин?`],
      sol: [`${cr} · ${kg} = ${fmt(total)} кг`, `${fmt(total)} − ${sold} = ${fmt(left)} кг`,
        `${fmt(left)} : ${sh} = ${Math.floor(left / sh)}${left % sh ? ' и остатък ' + (left % sh) : ''} кг за магазин`] }; },
  () => { const w = rnd(6, 9), week = rnd(7, 12), goal = rnd(120, 200), extra = rnd(3, 6);
    const saved = w * week;
    return { q: `Едно дете спестява по ${week} евро на седмица.`,
      subs: [`Колко евро ще събере за ${w} седмици?`, `Колко още му трябват до ${goal} евро?`,
        `За колко седмици ще събере останалите, ако започне да спестява по ${week + extra} евро?`],
      sol: [`${week} · ${w} = ${saved} евро`, `${goal} − ${saved} = ${goal - saved} евро`,
        `${goal - saved} : ${week + extra} = ${Math.floor((goal - saved) / (week + extra))} и остатък ${(goal - saved) % (week + extra)}; нужни са ${Math.ceil((goal - saved) / (week + extra))} седмици`] }; },
  () => { const sh = rnd(14, 22), bk = rnd(24, 36), nw = rnd(90, 180), per = rnd(25, 40);
    const total = sh * bk, all = total + nw;
    return { q: `В библиотека има ${sh} рафта с по ${bk} книги.`,
      subs: [`Колко книги има на рафтовете?`, `Постъпват нови ${nw} книги. Колко книги има вече библиотеката?`,
        `Новите книги се подреждат по ${per} на рафт. Колко рафта ще са нужни за тях?`],
      sol: [`${sh} · ${bk} = ${fmt(total)} книги`, `${fmt(total)} + ${nw} = ${fmt(all)} книги`,
        `${nw} : ${per} = ${Math.floor(nw / per)} и остатък ${nw % per}; нужни са ${Math.ceil(nw / per)} рафта`] }; },
  () => { const row = rnd(16, 26), pl = rnd(12, 18), ad = rnd(40, 90), pA = rnd(8, 14), pD = rnd(4, 7);
    const total = row * pl;
    return { q: `В салон има ${row} реда по ${pl} места. Билетът за възрастен е ${pA} евро, а за дете – ${pD} евро.`,
      subs: [`Колко места има в салона?`, `На представление са дошли ${ad} възрастни. Колко евро са платили?`,
        `Колко места са останали свободни, ако освен възрастните са дошли и ${Math.floor(total / 3)} деца?`],
      sol: [`${row} · ${pl} = ${fmt(total)} места`, `${ad} · ${pA} = ${fmt(ad * pA)} евро`,
        `${ad} + ${Math.floor(total / 3)} = ${fmt(ad + Math.floor(total / 3))} заети; ${fmt(total)} − ${fmt(ad + Math.floor(total / 3))} = ${fmt(total - ad - Math.floor(total / 3))} свободни места`] }; },
  () => { const bed = rnd(12, 18), pl = rnd(22, 34), dead = rnd(20, 50), rows = rnd(6, 9);
    const total = bed * pl, alive = total - dead;
    return { q: `В градина има ${bed} лехи с по ${pl} растения.`,
      subs: [`Колко растения са засадени общо?`, `Изсъхнали са ${dead} растения. Колко остават живи?`,
        `Живите се прехвърлят в ${rows} реда поравно. По колко растения ще има в един ред?`],
      sol: [`${bed} · ${pl} = ${fmt(total)} растения`, `${fmt(total)} − ${dead} = ${fmt(alive)} растения`,
        `${fmt(alive)} : ${rows} = ${Math.floor(alive / rows)}${alive % rows ? ' и остатък ' + (alive % rows) : ''} в ред`] }; },
  () => { const pk = rnd(15, 24), it = rnd(12, 20), give = rnd(60, 140), cl = rnd(5, 8);
    const total = pk * it, left = total - give;
    return { q: `За празника са купени ${pk} пакета с по ${it} балона.`,
      subs: [`Колко балона са купени?`, `Раздадени са ${give} балона. Колко остават?`,
        `Останалите се разделят поравно между ${cl} класа. По колко балона ще получи всеки клас?`],
      sol: [`${pk} · ${it} = ${fmt(total)} балона`, `${fmt(total)} − ${give} = ${fmt(left)} балона`,
        `${fmt(left)} : ${cl} = ${Math.floor(left / cl)}${left % cl ? ' и остатък ' + (left % cl) : ''} за клас`] }; },
  () => { const fl = rnd(5, 9), ap = rnd(4, 8), ppl = rnd(2, 4), empty = rnd(3, 6);
    const total = fl * ap;
    return { q: `В блок има ${fl} етажа с по ${ap} апартамента.`,
      subs: [`Колко апартамента има блокът?`, `Във всеки обитаван апартамент живеят по ${ppl} души, а в ${empty} апартамента не живее никой. Колко са обитаваните?`,
        `Колко души живеят в блока?`],
      sol: [`${fl} · ${ap} = ${total} апартамента`, `${total} − ${empty} = ${total - empty} обитавани`,
        `${total - empty} · ${ppl} = ${(total - empty) * ppl} души`] }; },
  () => { const b = rnd(7, 12), seats = rnd(40, 55), price = rnd(8, 15);
    const cap = b * seats, kids = cap - rnd(20, 90);
    return { q: `За екскурзия са наети ${b} автобуса с по ${seats} места.`,
      subs: [`Колко места има общо?`, `На екскурзията отиват ${fmt(kids)} деца. Колко места остават свободни?`,
        `Всяко дете плаща по ${price} евро. Колко евро са събрани?`],
      sol: [`${b} · ${seats} = ${fmt(cap)} места`, `${fmt(cap)} − ${fmt(kids)} = ${cap - kids} свободни места`,
        `${fmt(kids)} · ${price} = ${fmt(kids * price)} евро`] }; },
  () => { const per = rnd(12, 22), d = rnd(5, 9), pg = per * d + rnd(10, 60);
    return { q: `Книга има ${pg} страници. Дете чете по ${per} страници на ден.`,
      subs: [`Колко страници ще прочете за ${d} дни?`, `Колко страници ще му останат?`,
        `За колко дни ще прочете цялата книга?`],
      sol: [`${per} · ${d} = ${per * d} страници`, `${pg} − ${per * d} = ${pg - per * d} страници`,
        `${pg} : ${per} = ${Math.floor(pg / per)} и остатък ${pg % per}; нужни са ${Math.ceil(pg / per)} дни`] }; },
  () => { const t = rnd(14, 24), pc = rnd(15, 25), gift = rnd(40, 90), inEnv = rnd(8, 12);
    const total = t * pc, left = total - gift;
    return { q: `В клас подготвят картички: ${t} ученици правят по ${pc} картички.`,
      subs: [`Колко картички са направени?`, `Подарени са ${gift}. Колко остават?`,
        `Останалите се подреждат в пликове по ${inEnv}. Колко плика ще са нужни?`],
      sol: [`${t} · ${pc} = ${fmt(total)} картички`, `${fmt(total)} − ${gift} = ${fmt(left)} картички`,
        `${fmt(left)} : ${inEnv} = ${Math.floor(left / inEnv)} и остатък ${left % inEnv}; нужни са ${Math.ceil(left / inEnv)} плика`] }; },
];

// ---------- строеж на тестовете ----------
function training(theme, variant, idx) {
  seed(70000 + idx * 97 + variant * 13);
  const st = newState();
  const mc = take(st, theme.s, theme.lv, 8).map(t => t.kind === 'number' ? toMC(t) : t);
  const short = take(st, theme.s, theme.lv, 3, 'number');
  const w = take(st, ['wordBig', 'calcWord', 'wordArea', 'word3'], 3, 1);
  return { kind: 'train', theme: theme.n, hint: theme.hint, variant: variant === 0 ? 'А' : 'Б',
    tasks: [...mc, ...short, ...w] };
}

function exam(i) {
  seed(90000 + i * 211);
  const st = newState();
  // задачи 1–20: точно по чертежа на модела (E.NVO4), в реда на изпита
  const mc = [], short = [];
  for (const pos of E.NVO4.plan) {
    let t = null, guard = 0;
    while (!t && guard++ < 80) {
      const c = E.generateSkill(4, pick(pos.s), pos.n > 16 ? 3 : 2);
      if (!c || c.dots) continue;
      if (c.kind === 'choice' && Array.isArray(c.choices) && typeof c.choices[0] === 'object' && !c.choices[0].html) continue;
      const key = String(c.q).replace(/<[^>]+>/g, '');
      if (st.seen.has(key)) continue;
      if (pos.free && c.kind !== 'number') continue;
      st.seen.add(key); t = c;
    }
    if (!t) continue;
    t.plan = pos;
    (pos.free ? short : mc).push(pos.free ? t : (t.kind === 'number' ? toMC(t) : t));
  }
  // задачи 21–24: по темите на модела – моделиране, измерване, таблица, сравняване
  const ext = [
    EXT_MODEL[(i * 3) % EXT_MODEL.length](),
    EXT_GEOM[(i * 2) % EXT_GEOM.length](),
    EXT_TABLE[i % EXT_TABLE.length](),
    EXT_CMP[(i * 2 + 1) % EXT_CMP.length](),
  ];
  const w3 = WORD3[i % WORD3.length]();
  return { kind: 'exam', no: i + 1, tasks: [...mc, ...short], ext, w3 };
}

// ---------- оформление ----------
function taskHTML(t, n) {
  const mc = t.kind === 'choice';
  t = lettered(t);
  let h = `<li class="task"><span class="no">${n}.</span><div class="body"><div class="q">${clean(t.q, mc)}</div>`;
  if (t.figure) h += `<div class="fig">${t.figure}</div>`;
  if (mc) {
    const ch = (t.choices || []).map(c => typeof c === 'string' ? c : (c.html || c.v));
    h += `<ol class="opts">${ch.map(c => `<li>${c}</li>`).join('')}</ol>`;
  } else if (!/\{\?\}/.test(String(t.q))) {
    // мястото за отговор се добавя само ако го няма вече в самото условие
    h += `<div class="ans-line">Отговор: <span class="dots"></span></div>`;
  }
  return h + '</div></li>';
}

function blank(n) {
  let rows = '';
  for (let i = 1; i <= n; i++) rows += `<td><b>${i}</b><span></span></td>`;
  return `<table class="blanka"><tr>${rows}</tr></table>`;
}

function trainHTML(t, i) {
  return `<section class="test page"><header class="t-head"><span class="t-kind">Тренировъчен тест ${i}</span>
  <h2>${t.theme}</h2><p class="t-sub">Вариант ${t.variant} · 12 задачи · около 20 минути</p></header>
  <p class="t-hint">💡 ${t.hint}</p>
  <ol class="tasks">${t.tasks.map((x, j) => taskHTML(x, j + 1)).join('')}</ol>
  <p class="t-foot">Верни отговори: ____ от 12</p></section>`;
}

function examHTML(t) {
  const mc = t.tasks.slice(0, 16), sh = t.tasks.slice(16);
  return `<section class="test page"><header class="t-head"><span class="t-kind exam">Примерен изпитен тест ${t.no}</span>
  <h2>Национално външно оценяване · математика · 4. клас</h2>
  <p class="t-sub">25 задачи · 100 точки · 60 минути (за ученици със СОП – до 30 минути повече)</p></header>
  <p class="t-hint">Задачи <b>1–16</b> са с избираем отговор – отбелязва се един отговор (по 3 точки).
  Задачи <b>17–20</b> са с кратък свободен отговор – записва се само отговорът (по 4 точки).
  Задачи <b>21–24</b> искат записано решение (по 5 точки). Задача <b>25</b> е с три подусловия (16 точки).
  <br><span class="small">Разпределението на точките е ориентировъчно – на изпита МОН ги определя според трудността на всяка задача.</span></p>
  <ol class="tasks">${mc.map((x, j) => taskHTML(x, j + 1)).join('')}</ol>
  <h3 class="part">Задачи с кратък свободен отговор</h3>
  <ol class="tasks" start="17">${sh.map((x, j) => taskHTML(x, j + 17)).join('')}</ol>
  <h3 class="part">Задачи с разширен свободен отговор</h3>
  <ol class="tasks" start="21">${t.ext.map((e, j) => `<li class="task"><span class="no">${j + 21}.</span><div class="body">
    <div class="q">${e.q}</div><div class="work"></div></div></li>`).join('')}</ol>
  <h3 class="part">Задача с разширен отговор с три подусловия</h3>
  <ol class="tasks" start="25"><li class="task"><span class="no">25.</span><div class="body">
    <div class="q">${t.w3.q}</div>
    <ul class="subs">${t.w3.subs.map((s, j) => `<li><b>${'абв'[j]})</b> ${s}<div class="work short"></div></li>`).join('')}</ul>
  </div></li></ol>
  <div class="blanka-wrap"><b>Бланка за отговори</b>${blank(16)}
  <p class="hint">Задачи 17–25 се оценяват по написаното в теста.</p></div>
  <p class="t-foot">Точки: ____ от 100</p></section>`;
}

function keyHTML(trains, exams) {
  function ans(t) { return t.kind === 'choice' ? lettered(t).answer : fmt(t.answer); }
  let h = '<section class="page keys"><h2>Отговори</h2>';
  h += '<h3 class="part">Част I · Тренировъчни тестове</h3><div class="key-grid">';
  trains.forEach((t, i) => {
    h += `<div class="key"><b>Тест ${i + 1} · ${t.theme} (вариант ${t.variant})</b><p>` +
      t.tasks.map((x, j) => `${j + 1}. ${ans(x)}`).join(' · ') + '</p></div>';
  });
  h += '</div><h3 class="part">Част II · Примерни изпитни тестове</h3><div class="key-grid">';
  exams.forEach(t => {
    h += `<div class="key"><b>Изпитен тест ${t.no}</b><p>` +
      t.tasks.map((x, j) => `${j + 1}. ${ans(x)}`).join(' · ') + '</p>' +
      t.ext.map((e, j) => `<p class="sol"><b>${j + 21}.</b> ${e.sol}</p>`).join('') +
      `<p class="sol"><b>25.</b> ` + t.w3.sol.map((s, j) => `${'абв'[j]}) ${s}`).join('<br>') + '</p>' +
      `<p class="crit"><b>Критерии за 21–24:</b> ` + t.ext.map((e, j) => `<b>${j + 21}.</b> ${e.crit}`).join(' ') +
      `<br><b>Критерии за 25:</b> по 5–6 точки за всяко подусловие – около две трети за вярно действие и пресмятане, останалото за отговор с изречение.</p></div>`;
  });
  return h + '</div></section>';
}

// ---------- сглобяване ----------
const trains = [];
let idx = 0;
THEMES.forEach((th, i) => { for (let v = 0; v < 2; v++) trains.push(training(th, v, idx++)); });
const exams = [];
for (let i = 0; i < 12; i++) exams.push(exam(i));

const toc = `<section class="page toc"><h2>Съдържание</h2>
<p class="toc-note">Сборникът има 32 теста: 20 тренировъчни по темите от програмата за 4. клас и 12 примерни
изпитни по действащия модел на МОН. Всяка тема има два равностойни варианта – А за упражнение, Б за проверка.
Отговорите на всички задачи са най-отзад, в Част III.</p>
<h3 class="part">Част I · Тренировъчни тестове по теми</h3><ol class="toc-list">` +
  THEMES.map(t => `<li>${t.n} <span>варианти А и Б</span></li>`).join('') +
  `</ol><h3 class="part">Част II · Примерни изпитни тестове</h3><ol class="toc-list">` +
  exams.map(e => `<li>Изпитен тест ${e.no} <span>25 задачи · 100 точки · 60 минути</span></li>`).join('') +
  `</ol><h3 class="part">Част III · Отговори и критерии</h3><ol class="toc-list">
  <li>Ключ с верните отговори на всички 30 теста</li>
  <li>Критерии за задачите с решение</li>
  <li>Скала за превръщане на точките в оценка</li></ol></section>`;

const intro = `<section class="page intro"><h2>Как се работи със сборника</h2>
<div class="cols">
<div><h3>Форматът на изпита</h3>
<table class="fmt"><tr><th>Вид задача</th><th>Брой</th><th>Точки</th></tr>
<tr><td>С избираем отговор</td><td>16</td><td>48</td></tr>
<tr><td>С кратък свободен отговор</td><td>4</td><td>16</td></tr>
<tr><td>С разширен свободен отговор</td><td>4</td><td>20</td></tr>
<tr><td>С разширен отговор с три подусловия</td><td>1</td><td>16</td></tr>
<tr class="sum"><td><b>Общо</b></td><td><b>25</b></td><td><b>100</b></td></tr></table>
<p class="small">Изпитът е 60 минути. Ученици със специални образователни потребности имат до 30 минути повече.
Този модел е в сила <b>от учебната 2024/2025 г.</b> – до 2023/2024 задачите бяха 18 с избираем отговор, 5 с кратък,
1 с разширен и 1 с три подусловия, затова по-старите помагала описват друго. Разпределението на точките по-горе е
ориентировъчно: на изпита МОН определя точките според трудността на всяка задача. Моделът се обявява всяка
година – преди учебната година сверявайте с mon.bg.</p></div>
<div><h3>План за осем седмици</h3>
<ol class="plan">
<li><b>Седмици 1–2.</b> Тренировъчни тестове 1–6 (числа, римски цифри, събиране и изваждане), вариант А.</li>
<li><b>Седмици 3–4.</b> Тренировъчни тестове 7–14 (умножение и деление), вариант А.</li>
<li><b>Седмица 5.</b> Тренировъчни тестове 15–20 (лице, обиколка, мерни единици, геометрия).</li>
<li><b>Седмица 6.</b> Варианти Б на темите, в които е имало грешки.</li>
<li><b>Седмици 7–8.</b> По един изпитен тест в седмицата, с часовник и без помощ.</li>
</ol>
<h3>Правила за изпитните тестове</h3>
<ul class="rules">
<li>Маса без телефон, лист за чернова, химикал, линия и транспортир.</li>
<li>Часовникът върви. 60 минути, без прекъсване.</li>
<li>Родителят не подсказва, докато тестът тече.</li>
<li>Прегледът е заедно, след това – всяка сгрешена задача се решава наново от детето.</li>
</ul></div></div></section>`;

const scale = `<section class="page scale"><h2>Скала за оценяване</h2>
<p>Точките от изпитните тестове се превръщат в оценка по скалата по-долу. Тя е ориентировъчна – за
националното външно оценяване в 4. клас резултатът се обявява в точки, а всяко училище решава само
как да го използва.</p>
<table class="fmt wide"><tr><th>Точки</th><th>Оценка</th><th>Какво означава</th></tr>
<tr><td>0 – 29</td><td>Слаб (2)</td><td>Основите не са усвоени. Върнете се към темите от предишен клас.</td></tr>
<tr><td>30 – 49</td><td>Среден (3)</td><td>Част от темите се знаят. Работете по тренировъчните тестове на сгрешените.</td></tr>
<tr><td>50 – 69</td><td>Добър (4)</td><td>Материалът се владее, но има пропуски в по-сложните задачи.</td></tr>
<tr><td>70 – 89</td><td>Много добър (5)</td><td>Уверено владеене. Работете върху скоростта и проверката.</td></tr>
<tr><td>90 – 100</td><td>Отличен (6)</td><td>Отлична подготовка. Решавайте по-трудни задачи за поддържане.</td></tr>
</table>
<h3 class="part">Как се четат резултатите</h3>
<p>По-полезно от сравнението със скалата е сравнението със самия себе си: с колко задачи повече се
справя детето този месец спрямо миналия. Записвайте точките от всеки изпитен тест в таблицата отдолу.</p>
<table class="fmt wide track"><tr><th>Тест</th><th>Дата</th><th>Точки</th><th>Най-много грешки в</th></tr>` +
  exams.map(e => `<tr><td>Изпитен тест ${e.no}</td><td></td><td></td><td></td></tr>`).join('') +
  `</table></section>`;

/* Справочник: правилата от 1.–4. клас на две страници – другите помагала го имат, а
   на изпита най-често се губят точки точно по тези неща. */
const spravochnik = `<section class="page ref"><h2>Справочник · всичко нужно за изпита</h2>
<p class="toc-note">Две страници с правилата от 1. до 4. клас. Преди изпитен тест се прочитат за пет минути;
по време на тренировъчните тестове могат да стоят отворени, по време на изпитните – не.</p>
<div class="cols">
<div>
<h3>Мерни единици</h3>
<table class="fmt wide"><tr><th>Дължина</th><th>Маса</th><th>Време</th></tr>
<tr><td>1 м = 10 дм = 100 см</td><td>1 кг = 1000 г</td><td>1 ч = 60 мин</td></tr>
<tr><td>1 см = 10 мм</td><td>1 т = 1000 кг</td><td>1 мин = 60 сек</td></tr>
<tr><td>1 км = 1000 м</td><td>1 л = 1000 мл</td><td>1 ден = 24 ч</td></tr>
<tr><td>1 дм = 10 см</td><td></td><td>1 година = 12 месеца</td></tr></table>
<p class="small"><b>От голяма към малка единица</b> се умножава, <b>от малка към голяма</b> се дели.
Събират се само еднакви единици: 2 м + 30 см = 200 см + 30 см = 230 см.
Времето е на 60, не на 100: 1 ч 20 мин не е 1,20 ч.</p>

<h3>Обиколка и лице</h3>
<table class="fmt wide"><tr><th>Фигура</th><th>Обиколка</th><th>Лице</th></tr>
<tr><td>Правоъгълник</td><td>P = 2 · (a + b)</td><td>S = a · b</td></tr>
<tr><td>Квадрат</td><td>P = 4 · a</td><td>S = a · a</td></tr>
<tr><td>Триъгълник</td><td>P = a + b + c</td><td>–</td></tr></table>
<p class="small">Обиколката се мери в см, м, км. Лицето – в <b>квадратни</b> единици: см², дм², м².
Страна по дадена обиколка: a = P : 2 − b. Страна по дадено лице: a = S : b.</p>

<h3>Ред на действията</h3>
<p class="small"><b>1.</b> Скоби. <b>2.</b> Умножение и деление – отляво надясно.
<b>3.</b> Събиране и изваждане – отляво надясно.<br>
20 + 4 · 5 = 20 + 20 = 40 &nbsp;·&nbsp; (20 + 4) · 5 = 24 · 5 = 120</p>

<h3>Намиране на неизвестно</h3>
<p class="small">събираемо = сбор − другото събираемо · умаляемо = разлика + умалител ·
умалител = умаляемо − разлика · множител = произведение : другия множител ·
делимо = частно · делител · делител = делимо : частно</p>
</div>
<div>
<h3>Закръгляване</h3>
<p class="small">Гледа се цифрата <b>след</b> разряда, до който се закръгля: 0–4 надолу, 5–9 нагоре.
До десетици: 82 → 80, 87 → 90. До стотици: 349 → 300, 350 → 400.
При приблизително пресмятане първо се закръгля, после се смята.</p>

<h3>Деление с остатък</h3>
<p class="small">17 : 5 = 3 (ост. 2). Проверка: 3 · 5 + 2 = 17.
<b>Остатъкът винаги е по-малък от делителя.</b> При текстова задача се пита дали остатъкът се брои
(23 деца по 4 в кола → 6 коли) или се изхвърля (23 стола по 4 на маса → 5 пълни маси).</p>

<h3>Част от число</h3>
<p class="small">Половината се дели на 2, една трета – на 3, една четвърт – на 4.
Обратно: ако една четвърт е 5, цялото е 5 · 4 = 20.</p>
</div></div>
</section>

<section class="page ref"><h2>Справочник · втора страница</h2>
<div class="cols">
<div>
<h3>Ъгли и триъгълници</h3>
<p class="small">Прав ъгъл – 90°. Остър – по-малък от правия. Тъп – по-голям от правия, но по-малък от изпънат (180°).
Правият ъгъл се проверява с ъгъла на лист хартия.<br>
<b>Според ъглите:</b> остроъгълен (и трите остри), правоъгълен (един прав), тъпоъгълен (един тъп).
Повече от един прав или тъп ъгъл в триъгълник е невъзможно.<br>
<b>Според страните:</b> равностранен (три равни), равнобедрен (две равни), разностранен (всички различни).<br>
Един триъгълник има <b>две имена наведнъж</b> – гледа се за кое пита задачата.</p>

<h3>Римски цифри</h3>
<p class="small">I = 1 · V = 5 · X = 10 · L = 50 · C = 100 · D = 500 · M = 1000.
По-малък знак <b>пред</b> по-голям се изважда: IV = 4, IX = 9, XL = 40, XC = 90, CD = 400, CM = 900.
Един знак не се повтаря повече от три пъти (4 е IV, не IIII). MMXXVII = 2027.</p>

<h3>Четене на числа</h3>
<p class="small">Разредите: единици, десетици, стотици, хиляди, десетохиляди.
В 4 568: 4 хиляди, 5 стотици, 6 десетици, 8 единици.
„Колко десетици има в числото“ пита за <b>всички</b> десетици: в 836 са 83, не 3.</p>

<h3>Часовник и време</h3>
<p class="small">Малката стрелка показва часовете, голямата – минутите.
„Без петнайсет“ е 45 минути от предишния час. 14:40 е „три без двайсет“.
Разлика във времето се брои на части: от 9:50 до 11:20 са 10 мин до 10:00, после 1 ч 20 мин – общо 1 ч 30 мин.</p>
</div>
<div>
<h3>Десетте най-скъпи грешки на изпита</h3>
<ol class="plan">
<li>Отговорът е в друга единица – иска се в км, написано е в метри.</li>
<li>Прескочена задача, която не е върната. Прескача се с кръгче в полето.</li>
<li>Задача с две действия, спряна след първото – дава се междинното число.</li>
<li>Объркани обиколка и лице; лицето е в квадратни единици.</li>
<li>Събрани различни единици: 2 м + 30 см не е 32.</li>
<li>Времето смятано на 100 вместо на 60.</li>
<li>Остатък, по-голям от делителя – значи частното е твърде малко.</li>
<li>Отговор на друг въпрос – условието е прочетено наполовина.</li>
<li>Преписано грешно число от условието в черновата.</li>
<li>Задача 21–25 с верен отговор, но без записано решение – точките са за решението.</li>
</ol>

<h3>Последните пет минути</h3>
<p class="small">Връщане към прескочените задачи · проверка на задачите с избираем отговор (там грешката е безвъзвратна) ·
проверка в какви единици е всеки отговор · проверка, че на всяка задача има отбелязан отговор.</p>
</div></div>
<p class="t-foot">Преди изпита: прочети въпроса два пъти · провери в какви единици се иска отговорът · прегледай задачите с избираем отговор накрая.</p>
</section>`;

/* Карта на успеха: кои области куцат, а не колко точки е изкарано общо. */
const karta = `<section class="page karta"><h2>Карта на успеха</h2>
<p>Точките казват докъде е стигнало детето. Тази таблица казва <b>по коя област да се работи</b>.
След всеки изпитен тест отбележете колко задачи са сгрешени във всяка от четирите области на изпита.
Областта с най-много кръгчета е следващата тема за упражнение – не целият тест.</p>
<table class="fmt wide karta-tbl"><tr><th>Изпитен тест</th><th>Дата</th><th>Числа</th><th>Фигури</th>
<th>Измерване</th><th>Моделиране</th><th>Точки</th></tr>` +
  exams.map(e => `<tr><td>Тест ${e.no}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('') +
  `</table>
<h3 class="part">Какво значи всяка област</h3>
<div class="cols">
<div><p class="small"><b>Числа.</b> Четене и сравняване, разреди, римски цифри, четирите действия,
ред на действията, намиране на неизвестно, закръгляване.<br>
<b>Фигури.</b> Видове линии и ъгли, триъгълници, правоъгълник и квадрат, окръжност, тела, разпознаване по чертеж.</p></div>
<div><p class="small"><b>Измерване.</b> Мерни единици и превръщането им, обиколка, лице, време и часовник, пари.<br>
<b>Моделиране.</b> Текстови задачи – житейска ситуация, в която само детето решава кое действие е нужно и в какъв ред.</p></div>
</div>
<h3 class="part">Накъде след картата</h3>
<p class="small">Повече от 3 кръгчета в една област в два поредни теста значи, че темата не е усвоена –
върнете се на тренировъчните тестове от Част I по тази област, вариант А, и след седмица решете вариант Б.
Разпръснати единични грешки в различни области почти винаги са от бързане, а не от незнание:
там помага четене на условието два пъти и проверка на отговора на глас.</p>
</section>`;

const CSS = fs.readFileSync(path.join(__dirname, 'sbornik.css'), 'utf8');
const html = `<!DOCTYPE html><html lang="bg"><head><meta charset="utf-8">
<title>Сборник за подготовка за НВО по математика – 4. клас</title><style>${CSS}</style></head><body>
<section class="page cover"><div class="cover-in">
  <span class="brand">Сметко</span>
  <h1>Подготовка за НВО<br><span>по математика</span></h1>
  <p class="cls">4. клас</p>
  <div class="cover-facts"><div><b>32</b><span>теста</span></div><div><b>564</b><span>задачи</span></div>
  <div><b>100</b><span>точки на изпитен тест</span></div></div>
  <p class="cover-sub">20 тренировъчни теста по темите от учебната програма и 12 примерни изпитни теста
  по действащия модел на МОН (16 + 4 + 4 + 1). С пълен ключ с отговори на всяка задача,
  критерии за оценяване и скала.</p>
  <p class="cover-foot">smetko.com</p>
</div></section>
${intro}
${toc}
${spravochnik}
<section class="page part-title"><div><span>Част I</span><h2>Тренировъчни тестове по теми</h2>
<p>Двайсет теста по десет теми. Вариант А се решава, докато темата се учи. Вариант Б е проверка –
седмица по-късно, без поглеждане в отговорите.</p></div></section>
${trains.map((t, i) => trainHTML(t, i + 1)).join('')}
<section class="page part-title"><div><span>Част II</span><h2>Примерни изпитни тестове</h2>
<p>Дванайсет теста по действащия модел на МОН – 16 задачи с избираем отговор, 4 с кратък свободен,
4 с разширен свободен и 1 с три подусловия. Решават се с часовник – 60 минути, без прекъсване и без помощ.
След всеки тест прегледайте заедно само сгрешените задачи.</p></div></section>
${exams.map(examHTML).join('')}
<section class="page part-title"><div><span>Част III</span><h2>Отговори и критерии</h2>
<p>Ключ с верните отговори на <b>всяка задача от всичките 32 теста</b>, пълни решения на задачите с
разширен отговор, критерии за оценяване и скала за превръщане на точките в оценка.</p></div></section>
${keyHTML(trains, exams)}
${scale}
${karta}
</body></html>`;

const out = path.join(__dirname, 'sbornik');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html);

/* безплатна извадка за сайта: корица, увод, един тренировъчен и един изпитен тест с отговорите им */
const sampleCover = `<section class="page cover"><div class="cover-in">
  <span class="brand">Сметко</span>
  <h1>Подготовка за НВО<br><span>по математика</span></h1>
  <p class="cls">4. клас · безплатна извадка</p>
  <div class="cover-facts"><div><b>2</b><span>от 30 теста</span></div><div><b>37</b><span>задачи</span></div>
  <div><b>100</b><span>точки на изпитния</span></div></div>
  <p class="cover-sub">Това са два теста от сборника – един тренировъчен и един примерен изпитен,
  с верните отговори. Пълният сборник е с 32 теста и 564 задачи.</p>
  <p class="cover-foot">smetko.com/nvo-sbornik.html</p>
</div></section>`;
const sTrain = trains[8], sExam = exams[0];
const sample = `<!DOCTYPE html><html lang="bg"><head><meta charset="utf-8">
<title>Подготовка за НВО по математика – 4. клас (извадка)</title><style>${CSS}</style></head><body>
${sampleCover}${intro}
${spravochnik}
${trainHTML(sTrain, 5)}
${examHTML(sExam)}
${keyHTML([sTrain], [sExam])}
${scale}
</body></html>`;
fs.writeFileSync(path.join(out, 'sample.html'), sample);
const nTasks = trains.reduce((s, t) => s + t.tasks.length, 0) + exams.reduce((s, t) => s + t.tasks.length + t.ext.length + 3, 0);
console.log(`Сборник: ${trains.length + exams.length} теста, ${nTasks} задачи → tools/sbornik/index.html`);
