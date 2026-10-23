#!/usr/bin/env node
/* Мисии по учебници: по една мисия за всеки урок от годишното тематично разпределение (ГТР).
   Уроците са в tools/gtr/<id>.txt (първият ред: „# Издателство, Математика N. клас — линк“).
   Свързването урок → задачи е в public_html/js/lesson-map.js (същото се ползва от админ панела).
   Стартиране:  node tools/build_books.js   → генерира public_html/js/textbooks.js */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = __dirname, OUT = path.join(ROOT, '..', 'public_html', 'js', 'textbooks.js');
const LM = require(path.join(ROOT, '..', 'public_html', 'js', 'lesson-map.js'));

// id, клас, издателство, заглавие
const BOOKS = [
  ['pro1', 1, 'Просвета', 'Математика за 1. клас „Чуден свят“'],
  ['pp1', 1, 'Просвета Плюс', 'Математика за 1. клас'],
  ['bit1', 1, 'Бит и Техника', 'Математика за 1. клас'],
  ['arh1', 1, 'Архимед', 'Математика за 1. клас'],
  ['pro2', 2, 'Просвета', 'Математика за 2. клас'],
  ['pp2', 2, 'Просвета Плюс', 'Математика за 2. клас'],
  ['bit2', 2, 'Бит и Техника', 'Математика за 2. клас'],
  ['pro3', 3, 'Просвета', 'Математика за 3. клас'],
  ['pp3', 3, 'Просвета Плюс', 'Математика за 3. клас'],
  ['bit3', 3, 'Бит и Техника', 'Математика за 3. клас'],
  ['pro4', 4, 'Просвета', 'Математика за 4. клас'],
  ['pp4', 4, 'Просвета Плюс', 'Математика за 4. клас'],
  ['bit4', 4, 'Бит и Техника', 'Математика за 4. клас'],
];

const SKILL_TITLES = {
    'count5': 'Броим до 5', 'add5': 'Събиране до 5', 'sub5': 'Изваждане до 5', 'cmp5': 'Сравняване до 5', 'shapes': 'Геометрични фигури',
    'add10': 'Събиране до 10', 'sub10': 'Изваждане до 10', 'decomp10': 'Разлагане на числата до 10', 'three10': 'Три числа до 10', 'missing10': 'Липсващото число',
    'cmp10': 'Сравняване до 10', 'coins10': 'Пари: евро и центове', 'kg10': 'Килограм', 'word10': 'Текстови задачи до 10',
    'place20': 'Десетици и единици до 20', 'nextPrev20': 'Преди и след до 20', 'cmp20': 'Сравняване до 20', 'cm20': 'Сантиметър и отсечки',
    'add20no': 'Събиране до 20 без преминаване', 'sub20no': 'Изваждане до 20 без преминаване', 'cmpExpr20': 'Сравняване на изрази до 20', 'word20': 'Текстови задачи до 20',
    'add20x': 'Събиране с преминаване до 20', 'sub20x': 'Изваждане с преминаване до 20', 'clockHour': 'Час', 'tens100': 'Кръгли десетици до 100', 'notes100': 'Банкноти и монети',
    'place100': 'Числата до 100', 'cmp100': 'Сравняване до 100', 'nextPrev100': 'Преди и след до 100', 'units2': 'См, дм, м',
    'add100no': 'Събиране до 100 без преминаване', 'sub100no': 'Изваждане до 100 без преминаване', 'brackets': 'Скоби и ред на действията', 'unkAddend': 'Неизвестно събираемо',
    'add100x': 'Събиране до 100 с преминаване', 'sub100x': 'Изваждане до 100 с преминаване', 'perim2': 'Обиколка', 'triSides': 'Видове триъгълници', 'word2steps': 'Задачи с две пресмятания',
    'mulTable': 'Таблица за умножение', 'divTable': 'Таблично деление', 'unkFactor': 'Неизвестен множител', 'evenOdd': 'Четни и нечетни', 'timesWord': 'Пъти повече, пъти по-малко',
    'time2': 'Минута, час, денонощие', 'clockHM': 'Часовник: часове и минути',
    'place1000': 'Числата до 1000', 'cmp1000': 'Сравняване до 1000', 'nextPrev1000': 'Преди и след до 1000', 'lines': 'Права, крива, лъч',
    'add1000no': 'Събиране до 1000 без преминаване', 'sub1000no': 'Изваждане до 1000 без преминаване', 'unkMinuend': 'Неизвестно умаляемо', 'angles': 'Видове ъгли', 'units3a': 'Мм, см, м, км',
    'add1000x': 'Събиране до 1000 с преминаване', 'sub1000x': 'Изваждане до 1000 с преминаване', 'triAngles': 'Триъгълници според ъглите', 'century': 'Век', 'word3': 'Текстови задачи',
    'mul1d': 'Умножение с едноцифрено число', 'distrib': 'Умножение на сбор с число', 'parts': 'Половинка, третинка, четвъртинка', 'div1d': 'Деление с едноцифрено число',
    'unkDividend': 'Неизвестно делимо', 'units3b': 'Грам, тон, секунда',
    'placeBig': 'Многоцифрени числа', 'cmpBig': 'Сравняване на многоцифрени числа', 'nextPrevBig': 'Преди и след', 'romanRead': 'Римски цифри', 'romanWrite': 'Пишем с римски цифри',
    'addBigNo': 'Събиране без преминаване', 'subBigNo': 'Изваждане без преминаване', 'unkSubtrahend': 'Неизвестен умалител', 'degrees': 'Градус и ъгли',
    'addBigX': 'Събиране с преминаване', 'subBigX': 'Изваждане с преминаване', 'solidsName': 'Геометрични тела', 'solidsCount': 'Стени, ръбове, върхове', 'wordBig': 'Текстови задачи',
    'mulBig1d': 'Умножение с едноцифрено число', 'area': 'Лице на правоъгълник', 'areaUnits': 'Мерни единици за лице', 'wordArea': 'Задачи за лице',
    'divBig1d': 'Деление с едноцифрено число', 'unkDivisor': 'Неизвестен делител', 'sideFromArea': 'Страна по дадено лице', 'mul2d': 'Умножение с двуцифрено число',
    'calcWord': 'Задачи с умножение', 'div2d': 'Деление с двуцифрено число',
};

const PREV = { 1: [['count5', 2], ['cmp5', 1], ['shapes', 1]], 2: [['add20x', 2], ['sub20x', 2], ['add20no', 1], ['tens100', 1]],
  3: [['add100x', 2], ['sub100x', 2], ['mulTable', 2], ['divTable', 2]], 4: [['add1000x', 2], ['sub1000x', 2], ['mul1d', 2], ['div1d', 2], ['word3', 1]] };

/* „По учебната програма“: за всяка тема на МОН – нови знания, двойки, упражнения, трудни задачи, обобщение, блицтурнир, самопроверка */
function monBook(grade, topics) {
  const ms = [['Входно ниво', PREV[grade].map(x => x.slice()), 2]], allk = [];
  for (const t of topics) {
    const sk = t.skills, main = sk.filter(x => x[1] >= 2).length ? sk.filter(x => x[1] >= 2) : sk;
    const T = n => SKILL_TITLES[n] || t.short;
    for (const [n] of sk) ms.push([T(n), [[n, 1]], 1]);
    for (let i = 0; i + 1 < sk.length; i++) ms.push([T(sk[i][0]) + ' и ' + T(sk[i + 1][0]).toLowerCase(), [[sk[i][0], 1], [sk[i + 1][0], 1]], 2]);
    for (const [n] of sk) ms.push([T(n) + ' · упражнение', [[n, 3]].concat(main.filter(x => x[0] !== n).slice(0, 2).map(x => [x[0], 1])), 2]);
    ms.push([t.short + ' · Упражнение', sk.map(x => [x[0], x[1]]), 2]);
    for (const [n] of sk) ms.push([T(n) + ' · трудни задачи', [[n, 1]], 3]);
    ms.push([t.short + ' · Обобщение', sk.map(x => [x[0], x[1]]), 3]);
    ms.push([t.short + ' · Блицтурнир', main.map(x => [x[0], 1]), 3]);
    ms.push([t.short + ' · Самопроверка', sk.map(x => [x[0], 1]), 3]);
    main.forEach(x => allk.push(x[0]));
  }
  const step = Math.max(1, Math.floor(allk.length / 6)), every = off => allk.filter((_, i) => i >= off && (i - off) % step === 0).slice(0, 6).map(k => [k, 1]);
  ms.push(['Годишен преговор · I', every(0), 2], ['Годишен преговор · II', every(1), 3], ['Годишен преговор · III', every(2), 3], ['Изходно ниво', every(0), 3]);
  return ms;
}

global.window = { Smetko: {} };
require(path.join(ROOT, '..', 'public_html', 'js', 'math-engine.js'));
const E = global.window.Smetko.MathEngine;
const data = { 1: [], 2: [], 3: [], 4: [] }, mon = {}, report = [];
for (const [id, g, publisher, title] of BOOKS) {
  const lines = fs.readFileSync(path.join(ROOT, 'gtr', id + '.txt'), 'utf8').split('\n').map(s => s.trim());
  const m = (lines[0] || '').startsWith('#') ? lines[0].match(/https?:\/\/\S+/) : null;
  const missions = LM.build(g, lines.filter(s => s && !s.startsWith('#')));
  data[g].push({ id, publisher, title, source: m ? m[0] : '', missions });
  report.push(id + ': ' + missions.length + ' мисии');
}
for (const g of [1, 2, 3, 4]) {
  const topics = E.GRADES[g].topics.map(t => ({ short: t.short, skills: t.skills }));
  mon[g] = monBook(g, topics); report.push('mon' + g + ': ' + mon[g].length + ' мисии');
}
const js = `/* Сметко — мисии по учебници. ГЕНЕРИРАН ФАЙЛ – не редактирайте ръчно.
   Източник: tools/gtr/*.txt (уроците от годишните тематични разпределения) → node tools/build_books.js
   По една мисия за всеки урок. Формат: [заглавие, [[умение, тегло], ...], ниво 1–3]
   Учебниците, добавени от админ панела, се зареждат от /api/books.php и се подреждат с js/lesson-map.js.
   ⚠ Парите са в евро (от 1.1.2026 г.), дори когато разпределението е с „лев, стотинка“. */
(function () {
  'use strict';
  var BOOKS = ${JSON.stringify(data)};
  var MON = ${JSON.stringify(mon)};
  var KEY = 'smetko.books';
  function programBook(grade) { return { id: 'mon', publisher: 'Учебна програма на МОН', title: 'Общ ред, подходящ за всички учебници', missions: MON[grade] || [] }; }
  var extra = { 1: [], 2: [], 3: [], 4: [] };
  function useExtra(list) { // учебници от админ панела
    var LM = window.Smetko && window.Smetko.LessonMap; if (!LM || !Array.isArray(list)) return;
    extra = { 1: [], 2: [], 3: [], 4: [] };
    list.forEach(function (b) { var g = +b.grade; if (!extra[g] || !b.lessons || !b.lessons.length) return; extra[g].push({ id: b.bid, publisher: b.publisher, title: b.title, source: b.source || '', missions: LM.build(g, b.lessons), custom: true }); });
  }
  try { useExtra(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) {}
  function list(grade) {
    var own = (BOOKS[grade] || []).filter(function (b) { return !extra[grade].some(function (x) { return x.id === b.id; }); });
    return [programBook(grade)].concat(own, extra[grade] || []);
  }
  function get(grade, id) { var l = list(grade); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return l[0]; }
  function refresh() {
    if (!/^https?:$/.test(location.protocol)) return;
    fetch('/api/books.php', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) return;
      var s = JSON.stringify(j.books), old = null; try { old = localStorage.getItem(KEY); localStorage.setItem(KEY, s); } catch (e) {}
      if (old !== s) { useExtra(j.books); document.dispatchEvent(new CustomEvent('smetko:books')); }
    }).catch(function () {});
  }
  window.Smetko = window.Smetko || {};
  window.Smetko.Books = { list: list, get: get, BOOKS: BOOKS, refresh: refresh };
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('DOMContentLoaded', refresh);
})();
`;
fs.writeFileSync(OUT, js);
console.log(report.join('\n'));
