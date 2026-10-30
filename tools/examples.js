/* Примерни задачи за SEO страниците: изпълнява js/math-engine.js със стабилен (seed) генератор
   и записва tools/examples.json → {topicId: [{q, a, full, word, lv}]}. Стартира се от tools/seo.py. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'public_html', 'js', 'math-engine.js'), 'utf8');
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ctx = { window: {}, Math: Object.create(Math), console };
ctx.Math.random = mulberry(20261023);
vm.createContext(ctx); vm.runInContext(src, ctx);
const E = ctx.window.Smetko.MathEngine;
const strip = s => String(s).replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const out = {};
for (const g of [1, 2, 3, 4]) {
  for (const t of E.GRADES[g].topics) {
    const seen = new Set(), tpl = new Set(), list = [];
    for (const lv of [1, 2, 3]) {
      let n = 0, guard = 0;
      while (n < (lv === 1 ? 5 : lv === 2 ? 5 : 4) && guard++ < 400) {
        const k = E.generate(g, t.id, lv);
        if (k.figure || k.dots || k.kind !== 'number' && !(k.kind === 'choice' && Array.isArray(k.choices) && typeof k.choices[0] === 'string')) continue;
        const q = strip(k.q); if (seen.has(q) || q.length > 230) continue;
        // текстовите задачи да не се повтарят с едно и също условие и различни числа
        const sig = q.replace(/\d+/g, 'N');
        if (sig.length > 40) { if (tpl.has(sig)) continue; tpl.add(sig); }
        seen.add(q); n++;
        list.push({ q, a: String(k.answer), full: strip(k.full), word: !!k.word || q.length > 60, lv, skill: k.skill });
      }
    }
    out[t.id] = list;
  }
}
// таблица за умножение – смесени задачи за пример
fs.writeFileSync(path.join(__dirname, 'examples.json'), JSON.stringify(out, null, 1));
console.log(Object.keys(out).length + ' теми, ' + Object.values(out).reduce((s, l) => s + l.length, 0) + ' задачи');
