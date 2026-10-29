/* Имена за админ панела → Активност: заглавията на мисиите по учебници и пример за всеки вид задача.
   Записва public_html/admin/_names.json → {missions: {"2-pro2": [заглавия]}, skills: {skill: "пример"}, titles: {skill: "име за родителя"}, books: {"2-pro2": "Просвета – …"}}.
   Ползва се и от седмичния имейл (api/weekly.php).
   Стартира се от tools/build.py. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = p => fs.readFileSync(path.join(__dirname, '..', 'public_html', 'js', p), 'utf8');
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const store = {};
const ctx = { window: {}, Math: Object.create(Math), console, localStorage: { getItem: () => null, setItem: () => {} }, location: { protocol: 'file:' }, document: { dispatchEvent() {} }, CustomEvent: function () {} };
ctx.Math.random = mulberry(7);
ctx.window.localStorage = ctx.localStorage; ctx.window.location = ctx.location;
vm.createContext(ctx);
vm.runInContext(JS('math-engine.js'), ctx);
vm.runInContext(JS('lesson-map.js'), ctx);
vm.runInContext(JS('textbooks.js'), ctx);
const S = ctx.window.Smetko, E = S.MathEngine, B = S.Books;
const strip = s => String(s).replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/\{\?\}/g, '?').replace(/\s+/g, ' ').trim();
const out = { missions: {}, books: {}, skills: {}, titles: {} };
for (const g of [1, 2, 3, 4]) for (const b of B.list(g)) {
  out.missions[g + '-' + b.id] = b.missions.map(m => m[0]);
  out.books[g + '-' + b.id] = (b.id === 'mon' ? 'Учебна програма на МОН' : b.publisher + ' – ' + b.title) + ' (' + g + '. клас)';
}
for (const k of Object.keys(E._S)) {
  try { out.titles[k] = S.LessonMap && S.LessonMap.skillTitle ? S.LessonMap.skillTitle(k) : k; } catch (e) { out.titles[k] = k; }
  try { const t = E._S[k](2); out.skills[k] = strip(t.figure && !t.q ? '(фигура)' : t.q).slice(0, 90); } catch (e) { out.skills[k] = ''; }
}
fs.writeFileSync(path.join(__dirname, '..', 'public_html', 'admin', '_names.json'), JSON.stringify(out));
console.log('admin names:', Object.keys(out.missions).length, 'books,', Object.keys(out.skills).length, 'skills');
