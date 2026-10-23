/* Сметко — генератор на задачи по учебните програми на МОН по математика за 1.–4. клас
   (учебни програми, актуализирани 2023 г., общи за всички одобрени учебници).
   Темите и редът им следват програмата. Всяка тема има 3 нива на трудност.

   Smetko.MathEngine.generate(grade, topicId, level) → задача:
   {
     q:       текст (HTML); {?} е мястото на отговора (по избор при избор от отговори)
     answer:  число или текст
     kind:    'number' | 'choice'
     choices: ['<','=','>']  или  [{v:'a', html:'...'}]  при kind:'choice'
     full:    пълният правилен запис/обяснение
     figure:  SVG (по избор), dots: визуализация с точици (по избор)
   }
   Парите са в евро и центове (от 1.1.2026 г.). */
(function () {
  'use strict';

  // ---------- помощни ----------
  function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmt(n) { var s = String(n); return Math.abs(n) >= 10000 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : s; }
  var PLUS = '+', MINUS = '−', TIMES = '.', DIV = ':';
  TIMES = '·';

  function U(n) { return n + (n === 1 ? ' единица' : ' единици'); } // 1 единица, 3 единици
  function D(n) { return n + (n === 1 ? ' десетица' : ' десетици'); }
  function H(n) { return n + (n === 1 ? ' стотица' : ' стотици'); }
  function K(n) { return fmt(n) + (n === 1 ? ' хиляда' : ' хиляди'); }
  function T(q, answer, full, extra) {
    var t = { q: q, answer: answer, kind: 'number', full: full };
    if (extra) for (var k in extra) t[k] = extra[k];
    return t;
  }
  function expr(a, op, b, ans) { return T(fmt(a) + ' ' + op + ' ' + fmt(b) + ' = {?}', ans, fmt(a) + ' ' + op + ' ' + fmt(b) + ' = ' + fmt(ans)); }
  function cmpTask(left, right, lv, rv) {
    var ans = lv < rv ? '<' : (lv > rv ? '>' : '=');
    return { q: left + ' {?} ' + right, answer: ans, kind: 'choice', choices: ['<', '=', '>'], full: left + ' ' + ans + ' ' + right };
  }
  function cmpNums(x, y) { return cmpTask(fmt(x), fmt(y), x, y); }
  function missing(a, op, b, c, pos) {
    var q = pos === 0 ? '{?} ' + op + ' ' + fmt(b) + ' = ' + fmt(c) : fmt(a) + ' ' + op + ' {?} = ' + fmt(c);
    return T(q, pos === 0 ? a : b, fmt(a) + ' ' + op + ' ' + fmt(b) + ' = ' + fmt(c));
  }
  /* избор от варианти: opts = [{v, html}], correct = v */
  function choose(q, opts, correct, full, extra) {
    var t = { q: q, answer: correct, kind: 'choice', choices: shuffle(opts), full: full };
    if (extra) for (var k in extra) t[k] = extra[k];
    return t;
  }
  function hasCarry(a, b) { while (a > 0 || b > 0) { if (a % 10 + b % 10 > 9) return true; a = Math.floor(a / 10); b = Math.floor(b / 10); } return false; }
  function hasBorrow(a, b) { while (b > 0) { if (a % 10 < b % 10) return true; a = Math.floor(a / 10); b = Math.floor(b / 10); } return false; }
  function textOpts(list) { return list.map(function (s) { return { v: s, html: s }; }); }
  function word(q, ans, full, extra) { var e = extra || {}; e.word = true; return T(q + '<br><span class="ans-line">Отговор: {?}</span>', ans, full, e); }

  var NAMES_F = ['Мария', 'Елена', 'Ани', 'Ива', 'Вики', 'Дара', 'Никол', 'Яна', 'Рая', 'Сия'];
  var NAMES_M = ['Иван', 'Никола', 'Георги', 'Петър', 'Мартин', 'Боби', 'Калоян', 'Сашо', 'Деян', 'Ники'];

  // ---------- фигури (SVG) ----------
  var INK = '#1D2B4F';
  function svg(w, h, body, cls) { return '<svg class="' + (cls || 'fig') + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' + body + '</svg>'; }
  var SHAPES = {
    'триъгълник': function (c) { return svg(100, 100, '<polygon points="50,12 90,86 10,86" fill="' + c + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>', 'opt-fig'); },
    'квадрат': function (c) { return svg(100, 100, '<rect x="16" y="16" width="68" height="68" rx="3" fill="' + c + '" stroke="' + INK + '" stroke-width="4"/>', 'opt-fig'); },
    'кръг': function (c) { return svg(100, 100, '<circle cx="50" cy="50" r="36" fill="' + c + '" stroke="' + INK + '" stroke-width="4"/>', 'opt-fig'); },
    'правоъгълник': function (c) { return svg(100, 100, '<rect x="8" y="28" width="84" height="46" rx="3" fill="' + c + '" stroke="' + INK + '" stroke-width="4"/>', 'opt-fig'); }
  };
  var FILLS = ['#FFD36B', '#8ED3FF', '#A6E07F', '#FFB3B8', '#C9B8FF'];

  function rectFig(la, lb, square) {
    var W = 220, H = 140, rw = square ? 96 : 150, rh = square ? 96 : 80, x = (W - rw) / 2, y = (H - rh) / 2 + 4;
    return svg(W, H, '<rect x="' + x + '" y="' + y + '" width="' + rw + '" height="' + rh + '" rx="3" fill="#E7F4FF" stroke="#2F80ED" stroke-width="4"/>' +
      '<text x="' + (W / 2) + '" y="' + (y - 8) + '" text-anchor="middle">' + la + '</text><text x="' + (x + rw + 8) + '" y="' + (y + rh / 2 + 5) + '">' + lb + '</text>');
  }
  function triFig(a, b, c) {
    return svg(220, 140, '<polygon points="34,118 186,118 120,22" fill="#FFF3D6" stroke="#FF7A1A" stroke-width="4" stroke-linejoin="round"/>' +
      '<text x="110" y="136" text-anchor="middle">' + a + '</text><text x="160" y="66">' + b + '</text><text x="30" y="66">' + c + '</text>');
  }
  function clockFig(h, m) {
    var s = '<circle cx="80" cy="80" r="70" fill="#fff" stroke="' + INK + '" stroke-width="6"/>';
    for (var i = 1; i <= 12; i++) {
      var a = i * Math.PI / 6, x = 80 + 52 * Math.sin(a), y = 80 - 52 * Math.cos(a) + 6;
      s += '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="middle" class="clk">' + i + '</text>';
    }
    for (var k = 0; k < 60; k++) { if (k % 5) { var b = k * Math.PI / 30; s += '<circle cx="' + (80 + 64 * Math.sin(b)).toFixed(1) + '" cy="' + (80 - 64 * Math.cos(b)).toFixed(1) + '" r="1.4" fill="#9AA6BF"/>'; } }
    var ha = ((h % 12) + m / 60) * Math.PI / 6, ma = m * Math.PI / 30;
    s += '<line x1="80" y1="80" x2="' + (80 + 34 * Math.sin(ha)).toFixed(1) + '" y2="' + (80 - 34 * Math.cos(ha)).toFixed(1) + '" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>';
    s += '<line x1="80" y1="80" x2="' + (80 + 54 * Math.sin(ma)).toFixed(1) + '" y2="' + (80 - 54 * Math.cos(ma)).toFixed(1) + '" stroke="#FF7A1A" stroke-width="4.5" stroke-linecap="round"/>';
    s += '<circle cx="80" cy="80" r="6" fill="' + INK + '"/>';
    return svg(160, 160, s, 'fig clock');
  }
  // евро монети и банкноти
  function coin(v) { // v в центове (1..200)
    var label = v >= 100 ? (v / 100) + ' €' : v + ' ц', r = v >= 100 ? 22 : (v >= 10 ? 19 : 16);
    var copper = v < 10, bi = v >= 100;
    var outer = bi ? (v === 100 ? '#E5B53A' : '#C9CED8') : (copper ? '#D0844F' : '#E9BE47');
    var inner = bi ? (v === 100 ? '#C9CED8' : '#E5B53A') : outer;
    return '<span class="coin"><svg viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="' + r + '" fill="' + outer + '" stroke="rgba(0,0,0,.25)" stroke-width="2"/>' +
      (bi ? '<circle cx="25" cy="25" r="' + (r - 7) + '" fill="' + inner + '"/>' : '') +
      '<text x="25" y="29.5" text-anchor="middle" class="coin-t">' + label + '</text></svg></span>';
  }
  function note(v) {
    var c = { 5: '#9AA4B1', 10: '#E5626A', 20: '#4F8FE0', 50: '#F2994A', 100: '#4CBB7A' }[v];
    return '<span class="note" style="--n:' + c + '"><b>' + v + '</b><small>евро</small></span>';
  }
  function money(items) { return '<div class="money" aria-hidden="true">' + items.join('') + '</div>'; }

  function lineFig(kind) {
    var b = '';
    if (kind === 'отсечка') b = '<line x1="14" y1="50" x2="86" y2="50" stroke="' + INK + '" stroke-width="4"/><circle cx="14" cy="50" r="5" fill="' + INK + '"/><circle cx="86" cy="50" r="5" fill="' + INK + '"/>';
    if (kind === 'лъч') b = '<line x1="14" y1="50" x2="92" y2="50" stroke="' + INK + '" stroke-width="4"/><circle cx="14" cy="50" r="5" fill="' + INK + '"/><path d="M84 43 l9 7 -9 7" fill="none" stroke="' + INK + '" stroke-width="4"/>';
    if (kind === 'права') b = '<line x1="10" y1="50" x2="90" y2="50" stroke="' + INK + '" stroke-width="4"/><path d="M18 43 l-9 7 9 7 M82 43 l9 7 -9 7" fill="none" stroke="' + INK + '" stroke-width="4"/>';
    if (kind === 'крива') b = '<path d="M10 60 C 30 20, 50 80, 70 40 S 90 50, 92 44" fill="none" stroke="' + INK + '" stroke-width="4"/>';
    return svg(100, 100, b, 'opt-fig');
  }
  function angleFig(deg) {
    var r = deg * Math.PI / 180, x2 = 20 + 70 * Math.cos(r), y2 = 80 - 70 * Math.sin(r);
    var arc = deg === 90 ? '<path d="M38 80 v-18 h-18" fill="none" stroke="#FF7A1A" stroke-width="3"/>' :
      '<path d="M44 80 A 24 24 0 0 0 ' + (20 + 24 * Math.cos(r)).toFixed(1) + ' ' + (80 - 24 * Math.sin(r)).toFixed(1) + '" fill="none" stroke="#FF7A1A" stroke-width="3"/>';
    return svg(110, 100, '<line x1="20" y1="80" x2="98" y2="80" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/><line x1="20" y1="80" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' + arc + '<circle cx="20" cy="80" r="4" fill="' + INK + '"/>', 'fig ang');
  }
  function triAngleFig(kind) {
    var pts = kind === 'правоъгълен' ? '30,110 30,30 160,110' : kind === 'тъпоъгълен' ? '20,110 70,70 190,110' : '40,110 105,25 170,110';
    var mark = kind === 'правоъгълен' ? '<path d="M30 94 h16 v16" fill="none" stroke="#FF7A1A" stroke-width="3"/>' : '';
    return svg(210, 130, '<polygon points="' + pts + '" fill="#E3F6E0" stroke="#2E9440" stroke-width="4" stroke-linejoin="round"/>' + mark);
  }
  function solidFig(kind) {
    var s = '', st = ' fill="#DCEBFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"';
    if (kind === 'куб') s = '<polygon points="20,40 60,40 60,80 20,80"' + st + '/><polygon points="20,40 40,22 80,22 60,40"' + st + ' fill-opacity=".7"/><polygon points="60,40 80,22 80,62 60,80"' + st + ' fill-opacity=".5"/>';
    if (kind === 'правоъгълен паралелепипед') s = '<polygon points="10,44 70,44 70,82 10,82"' + st + '/><polygon points="10,44 26,28 86,28 70,44"' + st + ' fill-opacity=".7"/><polygon points="70,44 86,28 86,66 70,82"' + st + ' fill-opacity=".5"/>';
    if (kind === 'цилиндър') s = '<path d="M22 26 v50 a28 10 0 0 0 56 0 v-50"' + st + '/><ellipse cx="50" cy="26" rx="28" ry="10"' + st + ' fill-opacity=".6"/>';
    if (kind === 'конус') s = '<path d="M50 12 L22 78 a28 10 0 0 0 56 0 Z"' + st + '/><path d="M22 78 a28 10 0 0 1 56 0" fill="none" stroke="' + INK + '" stroke-width="2" stroke-dasharray="4 4"/>';
    if (kind === 'пирамида') s = '<polygon points="50,12 16,76 60,86"' + st + '/><polygon points="50,12 60,86 86,70"' + st + ' fill-opacity=".55"/>';
    if (kind === 'сфера') s = '<circle cx="50" cy="50" r="34"' + st + '/><ellipse cx="50" cy="50" rx="34" ry="11" fill="none" stroke="' + INK + '" stroke-width="2" stroke-dasharray="4 4"/>';
    return svg(100, 100, s, 'opt-fig');
  }
  function sidesTriFig(a, b, c) { return triFig(a + ' см', b + ' см', c + ' см'); }

  // римски цифри
  function roman(n) {
    var map = [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']], s = '';
    map.forEach(function (p) { while (n >= p[0]) { s += p[1]; n -= p[0]; } });
    return s;
  }

  // ---------- умения (skills) ----------
  var S = {};

  // ===== 1. КЛАС =====
  S.count5 = function (lv) { var n = rnd(lv === 1 ? 1 : 2, lv === 1 ? 5 : 10); return T('Колко са точиците? {?}', n, 'Точиците са ' + n + '.', { dots: { a: n, b: 0, op: 'count' } }); };
  S.add5 = function (lv) { var a = rnd(0, 4), b = rnd(lv === 1 ? 1 : 0, 5 - a); var t = expr(a, PLUS, b, a + b); if (lv < 3) t.dots = { a: a, b: b, op: '+' }; return t; };
  S.sub5 = function (lv) { var a = rnd(1, 5), b = rnd(0, a); var t = expr(a, MINUS, b, a - b); if (lv < 3) t.dots = { a: a, b: b, op: '-' }; return t; };
  S.cmp5 = function () { var x = rnd(0, 5), y = Math.random() < .25 ? x : rnd(0, 5); return cmpNums(x, y); };
  S.shapes = function (lv) {
    var names = lv === 1 ? ['триъгълник', 'квадрат', 'кръг'] : ['триъгълник', 'квадрат', 'кръг', 'правоъгълник'];
    var target = pick(names), fills = shuffle(FILLS);
    return choose('Намери: <b>' + target + '</b>', names.map(function (n, i) { return { v: n, html: SHAPES[n](fills[i]) }; }), target, 'Това е ' + target + '.', { optFigs: true });
  };
  S.add10 = function (lv) { var a = rnd(lv === 1 ? 1 : 0, 9), b = rnd(lv === 1 ? 1 : 0, 10 - a); if (b < 0) b = 0; var t = expr(a, PLUS, b, a + b); if (lv === 1) t.dots = { a: a, b: b, op: '+' }; return t; };
  S.sub10 = function (lv) { var a = rnd(2, 10), b = rnd(lv === 1 ? 1 : 0, a); var t = expr(a, MINUS, b, a - b); if (lv === 1) t.dots = { a: a, b: b, op: '-' }; return t; };
  S.decomp10 = function () { var n = rnd(3, 10), a = rnd(1, n - 1); return T(n + ' = ' + a + ' + {?}', n - a, n + ' = ' + a + ' + ' + (n - a)); };
  S.three10 = function () { var a = rnd(1, 4), b = rnd(1, 4), c = rnd(1, 10 - a - b > 4 ? 4 : 10 - a - b); return T(a + ' + ' + b + ' + ' + c + ' = {?}', a + b + c, a + ' + ' + b + ' + ' + c + ' = ' + (a + b + c)); };
  S.missing10 = function () { if (Math.random() < .6) { var a = rnd(1, 8), b = rnd(1, 10 - a); return missing(a, PLUS, b, a + b, rnd(0, 1)); } var c = rnd(3, 10), d = rnd(1, c - 1); return missing(c, MINUS, d, c - d, rnd(0, 1)); };
  S.cmp10 = function (lv) { if (lv === 3) { var a = rnd(1, 6), b = rnd(1, 4), n = a + b + pick([-1, 0, 1]); n = Math.max(0, Math.min(10, n)); return cmpTask(a + ' + ' + b, String(n), a + b, n); } var x = rnd(0, 10), y = Math.random() < .2 ? x : rnd(0, 10); return cmpNums(x, y); };
  S.coins10 = function () { // монети 1, 2, 5, 10 цента
    var set = [1, 2, 5, 10], items = [], sum = 0, n = rnd(2, 3);
    for (var i = 0; i < n; i++) { var c = pick(set.filter(function (x) { return x + sum <= 10; })); if (!c) break; items.push(c); sum += c; }
    if (items.length < 2) { items = [5, 2]; sum = 7; }
    return T('Колко цента са общо? {?} ц', sum, items.join(' + ') + ' = ' + sum + ' цента', { figure: money(items.map(coin)) });
  };
  S.kg10 = function () { var a = rnd(1, 6), b = rnd(1, 10 - a), f = pick(NAMES_F); return word(f + ' купи ' + a + ' кг ябълки и ' + b + ' кг круши. Колко килограма плодове купи?', a + b, a + ' + ' + b + ' = ' + (a + b) + ' кг'); };
  S.word10 = function () {
    var m = pick(NAMES_M), a, b;
    if (Math.random() < .5) { a = rnd(2, 7); b = rnd(1, 10 - a); return word(m + ' има ' + a + ' топчета. Получава още ' + b + '. Колко топчета има сега?', a + b, a + ' + ' + b + ' = ' + (a + b)); }
    a = rnd(4, 10); b = rnd(1, a - 1); return word('На дървото има ' + a + ' птички. Отлитат ' + b + '. Колко птички остават?', a - b, a + ' ' + MINUS + ' ' + b + ' = ' + (a - b));
  };
  S.place20 = function () { var u = rnd(0, 9); if (Math.random() < .5) return T('1 десетица и ' + U(u) + ' = {?}', 10 + u, '1 десетица и ' + U(u) + ' = ' + (10 + u)); return T('В числото ' + (10 + u) + ' има 1 десетица и {?} ' + (u === 1 ? 'единица.' : 'единици.'), u, (10 + u) + ' = 10 + ' + u); };
  S.nextPrev20 = function () { var n = rnd(11, 19); return Math.random() < .5 ? T('Кое число е <b>след</b> ' + n + '? {?}', n + 1, 'След ' + n + ' е ' + (n + 1) + '.') : T('Кое число е <b>преди</b> ' + n + '? {?}', n - 1, 'Преди ' + n + ' е ' + (n - 1) + '.'); };
  S.cmp20 = function () { var x = rnd(10, 20), y = Math.random() < .2 ? x : rnd(10, 20); return cmpNums(x, y); };
  S.cm20 = function () {
    var a = rnd(3, 12), b = rnd(2, 20 - a > 8 ? 8 : 20 - a);
    if (Math.random() < .5) return T('Отсечка от ' + a + ' см и отсечка от ' + b + ' см. Общо {?} см.', a + b, a + ' см + ' + b + ' см = ' + (a + b) + ' см', { figure: segFig(a, b) });
    var c = rnd(8, 20), d = rnd(2, c - 2); return T(c + ' см ' + MINUS + ' ' + d + ' см = {?} см', c - d, c + ' см ' + MINUS + ' ' + d + ' см = ' + (c - d) + ' см');
  };
  function segFig(a, b) {
    var k = 200 / (a + b + 2), w1 = a * k, w2 = b * k;
    return svg(220, 50, '<line x1="10" y1="22" x2="' + (10 + w1) + '" y2="22" stroke="#2F80ED" stroke-width="6" stroke-linecap="round"/><line x1="' + (14 + w1) + '" y1="22" x2="' + (14 + w1 + w2) + '" y2="22" stroke="#FF7A1A" stroke-width="6" stroke-linecap="round"/>' +
      '<text x="' + (10 + w1 / 2) + '" y="44" text-anchor="middle">' + a + ' см</text><text x="' + (14 + w1 + w2 / 2) + '" y="44" text-anchor="middle">' + b + ' см</text>');
  }
  S.add20no = function (lv) { var a, b; if (Math.random() < .3) { a = 10; b = rnd(1, 9); } else { a = rnd(11, 18); b = rnd(1, 9 - (a % 10)); if (b < 1) { a = 12; b = 5; } } return Math.random() < .5 ? expr(a, PLUS, b, a + b) : expr(b, PLUS, a, a + b); };
  S.sub20no = function () { var a = rnd(11, 19), b = Math.random() < .25 ? 10 : rnd(1, a % 10 || 1); if (b > a % 10 && b !== 10) b = a % 10; if (b === 0) b = 10; return expr(a, MINUS, b, a - b); };
  S.cmpExpr20 = function () { var a = rnd(11, 16), b = rnd(1, 19 - a > 3 ? 3 : 19 - a), n = a + b + pick([-1, 0, 1]); return cmpTask(a + ' + ' + b, String(n), a + b, n); };
  S.word20 = function (lv) {
    var f = pick(NAMES_F), a, b;
    if (lv >= 2 && Math.random() < .5) { a = rnd(5, 11); b = rnd(2, 20 - a > 8 ? 8 : 20 - a); return word(f + ' има ' + a + ' стикера, а брат ѝ – с ' + b + ' повече. Колко стикера има брат ѝ?', a + b, a + ' + ' + b + ' = ' + (a + b)); }
    if (lv >= 2) { a = rnd(11, 18); b = rnd(2, 9); return word('В клас има ' + a + ' момичета, а момчетата са с ' + b + ' по-малко. Колко са момчетата?', a - b, a + ' ' + MINUS + ' ' + b + ' = ' + (a - b)); }
    a = rnd(10, 14); b = rnd(1, 5); return word(f + ' има ' + a + ' молива. Купува още ' + b + '. Колко молива има сега?', a + b, a + ' + ' + b + ' = ' + (a + b));
  };
  S.add20x = function () { var a = rnd(3, 9), b = rnd(11 - a, 9); return Math.random() < .5 ? expr(a, PLUS, b, a + b) : expr(b, PLUS, a, a + b); };
  S.sub20x = function () { var a = rnd(11, 18), b = rnd((a % 10) + 1, 9); return expr(a, MINUS, b, a - b); };
  S.clockHour = function () { var h = rnd(1, 12); return T('Колко часа показва часовникът? {?} часа', h, 'Часовникът показва ' + h + ' часа.', { figure: clockFig(h, 0) }); };
  S.tens100 = function (lv) {
    var r = Math.random();
    if (r < .35) { var a = rnd(1, 8) * 10, b = rnd(1, 10 - a / 10) * 10; return expr(a, PLUS, b, a + b); }
    if (r < .65) { var c = rnd(2, 10) * 10, d = rnd(1, c / 10 - 1) * 10; return expr(c, MINUS, d, c - d); }
    if (r < .85) { var s = rnd(1, 6) * 10; return T(s + ', ' + (s + 10) + ', ' + (s + 20) + ', {?}', s + 30, 'Броим през 10: ' + s + ', ' + (s + 10) + ', ' + (s + 20) + ', ' + (s + 30)); }
    var x = rnd(1, 10) * 10, y = Math.random() < .2 ? x : rnd(1, 10) * 10; return cmpNums(x, y);
  };
  S.notes100 = function () { var opts = [5, 10, 20, 50], a = pick(opts), b = pick(opts.filter(function (x) { return x + a <= 100; })); var items = [a, b]; if (Math.random() < .4) { var c = pick([10, 20].filter(function (x) { return x + a + b <= 100; })); if (c) items.push(c); } var sum = items.reduce(function (p, q) { return p + q; }, 0); return T('Колко евро са общо? {?} €', sum, items.join(' + ') + ' = ' + sum + ' евро', { figure: money(items.map(note)) }); };

  // ===== 2. КЛАС =====
  S.place100 = function () { var t = rnd(2, 9), u = rnd(0, 9); var r = Math.random(); if (r < .4) return T(D(t) + ' и ' + U(u) + ' = {?}', t * 10 + u, t + ' дес. и ' + u + ' ед. = ' + (t * 10 + u)); if (r < .7) return T('Колко десетици има в числото ' + (t * 10 + u) + '? {?}', t, (t * 10 + u) + ' = ' + D(t) + ' и ' + U(u)); return T('Колко единици има в числото ' + (t * 10 + u) + '? {?}', u, (t * 10 + u) + ' = ' + D(t) + ' и ' + U(u)); };
  S.cmp100 = function (lv) { var x = rnd(10, 100), y = Math.random() < .15 ? x : (lv === 1 ? rnd(10, 100) : Math.max(0, Math.min(100, x + pick([-10, -1, 1, 10, 9, -9])))); return cmpNums(x, y); };
  S.nextPrev100 = function () { var n = rnd(21, 99); return Math.random() < .5 ? T('Кое число е <b>след</b> ' + n + '? {?}', n + 1, 'След ' + n + ' е ' + (n + 1)) : T('Кое число е <b>преди</b> ' + n + '? {?}', n - 1, 'Преди ' + n + ' е ' + (n - 1)); };
  S.units2 = function () {
    var k = rnd(2, 9), r = rnd(0, 4);
    if (r === 0) return T('1 м = {?} дм', 10, '1 м = 10 дм');
    if (r === 1) return T(k + ' дм = {?} см', k * 10, k + ' дм = ' + k * 10 + ' см');
    if (r === 2) return T('1 м = {?} см', 100, '1 м = 100 см');
    if (r === 3) { var d = rnd(1, 9); return T(k + ' м ' + d + ' дм = {?} дм', k * 10 + d, k + ' м ' + d + ' дм = ' + (k * 10 + d) + ' дм'); }
    var c = rnd(1, 9); return T(k + ' дм ' + c + ' см = {?} см', k * 10 + c, k + ' дм ' + c + ' см = ' + (k * 10 + c) + ' см');
  };
  S.add100no = function (lv) { var a, b; if (lv === 1) { a = rnd(2, 9) * 10 + rnd(0, 7); b = rnd(1, 9 - (a % 10)); } else { var at = rnd(1, 7), bt = rnd(1, 8 - at), au = rnd(0, 8), bu = rnd(0, 9 - au); a = at * 10 + au; b = bt * 10 + bu; } return expr(a, PLUS, b, a + b); };
  S.sub100no = function (lv) { var a, b; if (lv === 1) { a = rnd(2, 9) * 10 + rnd(2, 9); b = rnd(1, a % 10); } else { var at = rnd(3, 9), au = rnd(3, 9); a = at * 10 + au; b = rnd(1, at - 1) * 10 + rnd(0, au); } return expr(a, MINUS, b, a - b); };
  S.brackets = function (lv) {
    var r = rnd(0, lv === 1 ? 1 : 3), a, b, c, q, ans;
    if (r === 0) { a = rnd(30, 90); b = rnd(5, 20); c = rnd(1, 9); if (b + c >= a) a = b + c + 10; q = a + ' ' + MINUS + ' (' + b + ' + ' + c + ')'; ans = a - (b + c); }
    else if (r === 1) { a = rnd(10, 40); b = rnd(20, 40); c = rnd(1, 9); q = a + ' + (' + b + ' ' + MINUS + ' ' + c + ')'; ans = a + b - c; }
    else if (r === 2) { a = rnd(20, 50); b = rnd(10, 30); c = rnd(5, 19); if (a + b - c < 0) c = 5; q = a + ' + ' + b + ' ' + MINUS + ' ' + c; ans = a + b - c; }
    else { a = rnd(50, 99); b = rnd(10, 30); c = rnd(5, 15); if (a - b - c < 0) a = b + c + 20; q = a + ' ' + MINUS + ' ' + b + ' ' + MINUS + ' ' + c; ans = a - b - c; }
    return T(q + ' = {?}', ans, q + ' = ' + ans);
  };
  S.unkAddend = function () { var a = rnd(11, 60), b = rnd(10, 99 - a); return missing(a, PLUS, b, a + b, rnd(0, 1)); };
  S.add100x = function () { var au = rnd(2, 9), bu = rnd(10 - au, 9), at = rnd(1, 7), bt = rnd(0, 8 - at); var a = at * 10 + au, b = bt * 10 + bu; return expr(a, PLUS, b, a + b); };
  S.sub100x = function () { var at = rnd(2, 9), au = rnd(0, 7); var a = at * 10 + au, b = rnd(0, at - 1) * 10 + rnd(au + 1, 9); return expr(a, MINUS, b, a - b); };
  S.triSides = function () {
    var kind = pick(['равностранен', 'равнобедрен', 'разностранен']), a = rnd(3, 9), b, c;
    if (kind === 'равностранен') { b = a; c = a; } else if (kind === 'равнобедрен') { b = a; c = rnd(2, 2 * a - 1); if (c === a) c = a + 1; } else { b = a + rnd(1, 3); c = rnd(b - a + 1, a + b - 1); if (c === a || c === b) c = a + b - 1; }
    return choose('Какъв е триъгълникът според страните си?', textOpts(['равностранен', 'равнобедрен', 'разностранен']), kind, 'Триъгълникът е ' + kind + '.', { figure: sidesTriFig(a, b, c) });
  };
  S.perim2 = function (lv) {
    var r = rnd(0, 2), a, b, c;
    if (r === 0) { a = rnd(2, 15); return T('Квадрат със страна ' + a + ' см. Обиколката е {?} см.', 4 * a, 'P = ' + a + ' + ' + a + ' + ' + a + ' + ' + a + ' = ' + 4 * a + ' см', { figure: rectFig(a + ' см', a + ' см', true) }); }
    if (r === 1) { a = rnd(4, 20); b = rnd(2, a - 1); return T('Правоъгълник ' + a + ' см на ' + b + ' см. Обиколката е {?} см.', 2 * (a + b), 'P = ' + a + ' + ' + b + ' + ' + a + ' + ' + b + ' = ' + 2 * (a + b) + ' см', { figure: rectFig(a + ' см', b + ' см') }); }
    a = rnd(3, 15); b = rnd(3, 15); c = rnd(Math.abs(a - b) + 1, a + b - 1);
    if (lv === 3) { var P = a + b + c; return T('Обиколката на триъгълник е ' + P + ' см. Две от страните са ' + a + ' см и ' + b + ' см. Третата е {?} см.', c, P + ' ' + MINUS + ' ' + a + ' ' + MINUS + ' ' + b + ' = ' + c + ' см', { figure: triFig(a + ' см', b + ' см', '? см') }); }
    return T('Триъгълник със страни ' + a + ', ' + b + ' и ' + c + ' см. Обиколката е {?} см.', a + b + c, 'P = ' + a + ' + ' + b + ' + ' + c + ' = ' + (a + b + c) + ' см', { figure: triFig(a + ' см', b + ' см', c + ' см') });
  };
  S.word2steps = function () {
    var f = pick(NAMES_F), m = pick(NAMES_M), a, b, c;
    if (Math.random() < .5) { a = rnd(20, 45); b = rnd(5, 20); c = a + (a + b); return word('В първия ден ' + f + ' прочете ' + a + ' страници, а във втория – с ' + b + ' повече. Колко страници прочете за двата дни?', c, a + ' + (' + a + ' + ' + b + ') = ' + c); }
    a = rnd(40, 90); b = rnd(10, 25); c = rnd(5, 15); if (b + c >= a) a = b + c + 10; return word(m + ' има ' + a + ' евро. Купува книга за ' + b + ' евро и топка за ' + c + ' евро. Колко евро му остават?', a - b - c, a + ' ' + MINUS + ' ' + b + ' ' + MINUS + ' ' + c + ' = ' + (a - b - c) + ' евро');
  };
  function tableSet(lv) { return lv === 1 ? [2, 3, 4, 5, 10] : lv === 2 ? [6, 7, 8, 9] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; }
  S.mulTable = function (lv) { var f = pick(tableSet(lv)), k = rnd(lv === 3 ? 0 : 1, 10); return Math.random() < .5 ? expr(f, TIMES, k, f * k) : expr(k, TIMES, f, f * k); };
  S.divTable = function (lv) { var set = tableSet(lv).filter(function (x) { return x > 0; }), f = pick(set), k = rnd(1, 10); if (lv === 3 && Math.random() < .1) return expr(0, DIV, f, 0); return Math.random() < .75 ? expr(f * k, DIV, f, k) : expr(f * k, DIV, k, f); };
  S.unkFactor = function (lv) { var f = pick(tableSet(lv).filter(function (x) { return x > 1; })), k = rnd(2, 10); return Math.random() < .7 ? missing(f, TIMES, k, f * k, rnd(0, 1)) : missing(f * k, DIV, f, k, 1); };
  S.evenOdd = function () { var n = rnd(1, 99), ans = n % 2 ? 'нечетно' : 'четно'; return choose('Числото <b>' + n + '</b> е:', textOpts(['четно', 'нечетно']), ans, n + ' е ' + ans + ' число.'); };
  S.timesWord = function (lv) {
    var f = pick(NAMES_F), m = pick(NAMES_M), a = rnd(2, 9), k = rnd(2, 5);
    if (Math.random() < .5) return word(f + ' има ' + a + ' книжки, а ' + m + ' – ' + k + ' пъти повече. Колко книжки има ' + m + '?', a * k, a + ' ' + TIMES + ' ' + k + ' = ' + a * k);
    return word('В кошницата има ' + a * k + ' ябълки, а крушите са ' + k + ' пъти по-малко. Колко са крушите?', a, a * k + ' ' + DIV + ' ' + k + ' = ' + a);
  };
  S.time2 = function () {
    var r = rnd(0, 5), k = rnd(2, 5);
    if (r === 0) return T('1 час = {?} минути', 60, '1 ч = 60 мин');
    if (r === 1) return T('1 седмица = {?} дни', 7, '1 седмица = 7 дни');
    if (r === 2) return T('1 година = {?} месеца', 12, '1 г. = 12 месеца');
    if (r === 3) return T('1 денонощие = {?} часа', 24, '1 денонощие = 24 часа');
    if (r === 4) return T(k + ' седмици = {?} дни', k * 7, k + ' ' + TIMES + ' 7 = ' + k * 7 + ' дни');
    return T(k + ' часа = {?} минути', k * 60, k + ' ' + TIMES + ' 60 = ' + k * 60 + ' мин');
  };
  function hm(h, m) { return h + ':' + ('0' + m).slice(-2); }
  S.clockHM = function () {
    var h = rnd(1, 12), m = pick([0, 5, 10, 15, 20, 30, 40, 45, 50]), ok = hm(h, m);
    var d = [hm(h % 12 + 1, m), hm(h, (m + 15) % 60), hm(m / 5 || 12, h * 5 % 60)].filter(function (x) { return x !== ok; });
    var uniq = []; d.forEach(function (x) { if (uniq.indexOf(x) < 0) uniq.push(x); });
    while (uniq.length < 3) { var z = hm(rnd(1, 12), pick([0, 15, 30, 45])); if (z !== ok && uniq.indexOf(z) < 0) uniq.push(z); }
    return choose('Колко е часът?', textOpts([ok].concat(uniq.slice(0, 3))), ok, 'Часът е ' + ok + '.', { figure: clockFig(h, m) });
  };

  // ===== 3. КЛАС =====
  S.place1000 = function () { var h = rnd(1, 9), t = rnd(0, 9), u = rnd(0, 9), n = h * 100 + t * 10 + u, r = Math.random(); if (r < .45) return T(H(h) + ', ' + D(t) + ' и ' + U(u) + ' = {?}', n, n + ' = ' + h + '00 + ' + t + '0 + ' + u); if (r < .75) return T('Колко стотици има в числото ' + n + '? {?}', h, n + ' има ' + H(h)); return T('Колко десетици има в числото ' + n + ' (без стотиците)? {?}', t, n + ' = ' + h + ' ст., ' + t + ' дес., ' + u + ' ед.'); };
  S.cmp1000 = function () { var x = rnd(100, 999), y = Math.random() < .15 ? x : x + pick([-100, -10, -1, 1, 10, 100, 90, -90]); y = Math.max(100, Math.min(1000, y)); return cmpNums(x, y); };
  S.nextPrev1000 = function () { var n = rnd(100, 998); if (Math.random() < .3) n = rnd(1, 9) * 100 - (Math.random() < .5 ? 1 : 0); return Math.random() < .5 ? T('Кое число е <b>след</b> ' + n + '? {?}', n + 1, 'След ' + n + ' е ' + (n + 1)) : T('Кое число е <b>преди</b> ' + n + '? {?}', n - 1, 'Преди ' + n + ' е ' + (n - 1)); };
  S.lines = function () { var names = ['права', 'крива', 'лъч', 'отсечка'], t = pick(names), lbl = { 'права': 'права линия', 'крива': 'крива линия', 'лъч': 'лъч', 'отсечка': 'отсечка' }[t]; return choose('Намери: <b>' + lbl + '</b>', names.map(function (n) { return { v: n, html: lineFig(n) }; }), t, 'Това е ' + t + '.', { optFigs: true }); };
  S.add1000no = function (lv) { var a, b; if (lv === 1) { a = rnd(1, 8) * 100; b = rnd(1, 9 - a / 100) * 100; if (Math.random() < .5) { a += rnd(1, 4) * 10; b += rnd(1, 4) * 10; } } else { var ah = rnd(1, 7), at = rnd(0, 8), au = rnd(0, 8); a = ah * 100 + at * 10 + au; b = rnd(1, 8 - ah) * 100 + rnd(0, 9 - at) * 10 + rnd(0, 9 - au); } return expr(a, PLUS, b, a + b); };
  S.sub1000no = function (lv) { var a, b; if (lv === 1) { a = rnd(3, 9) * 100 + rnd(5, 9) * 10; b = rnd(1, a / 100 - 1) * 100 + rnd(1, 4) * 10; } else { var ah = rnd(2, 9), at = rnd(1, 9), au = rnd(1, 9); a = ah * 100 + at * 10 + au; b = rnd(1, ah - 1) * 100 + rnd(0, at) * 10 + rnd(0, au); } return expr(a, MINUS, b, a - b); };
  S.unkMinuend = function () { var b = rnd(50, 400), c = rnd(50, 999 - b); return T('{?} ' + MINUS + ' ' + b + ' = ' + c, b + c, (b + c) + ' ' + MINUS + ' ' + b + ' = ' + c + ' (умаляемото = разлика + умалител)'); };
  S.angles = function () { var kinds = [['прав', 90], ['остър', rnd(25, 70)], ['тъп', rnd(110, 160)]], k = pick(kinds); return choose('Какъв е ъгълът?', textOpts(['прав', 'остър', 'тъп']), k[0], 'Ъгълът е ' + k[0] + '.', { figure: angleFig(k[1]) }); };
  S.units3a = function () { var k = rnd(2, 9), r = rnd(0, 4), x = rnd(1, 9); if (r === 0) return T('1 см = {?} мм', 10, '1 см = 10 мм'); if (r === 1) return T('1 км = {?} м', 1000, '1 км = 1000 м'); if (r === 2) return T(k + ' см ' + x + ' мм = {?} мм', k * 10 + x, k + ' см ' + x + ' мм = ' + (k * 10 + x) + ' мм'); if (r === 3) return T(k + ' км = {?} м', k * 1000, k + ' км = ' + k * 1000 + ' м'); return T(k + ' дм = {?} мм', k * 100, k + ' дм = ' + k * 100 + ' мм'); };
  S.add1000x = function () { var a, b; do { a = rnd(150, 700); b = rnd(100, 999 - a); } while (!hasCarry(a, b)); return expr(a, PLUS, b, a + b); };
  S.sub1000x = function () { var a, b; do { a = rnd(300, 999); b = rnd(100, a - 50); } while (!hasBorrow(a, b)); return expr(a, MINUS, b, a - b); };
  S.triAngles = function () { var k = pick(['правоъгълен', 'остроъгълен', 'тъпоъгълен']); return choose('Какъв е триъгълникът според ъглите си?', textOpts(['правоъгълен', 'остроъгълен', 'тъпоъгълен']), k, 'Триъгълникът е ' + k + '.', { figure: triAngleFig(k) }); };
  S.century = function () { var k = rnd(2, 5); return Math.random() < .5 ? T('1 век = {?} години', 100, '1 век = 100 години') : T(k + ' века = {?} години', k * 100, k + ' века = ' + k * 100 + ' години'); };
  S.mul1d = function (lv) {
    var a, b = rnd(2, 9);
    if (lv === 1) { a = Math.random() < .5 ? rnd(1, 9) * 10 : rnd(1, 3) * 100; if (a * b > 1000) b = 2; }
    else if (lv === 2) { a = rnd(12, 99); if (a * b > 999) b = 9; }
    else { a = rnd(101, Math.floor(999 / b)); }
    if (lv === 3 && Math.random() < .08) return expr(rnd(100, 900), TIMES, 0, 0);
    return Math.random() < .75 ? expr(a, TIMES, b, a * b) : expr(b, TIMES, a, a * b);
  };
  S.distrib = function () { var t = rnd(1, 9) * 10, u = rnd(1, 9), k = rnd(2, 9); if ((t + u) * k > 999) k = 2; return T('(' + t + ' + ' + u + ') ' + TIMES + ' ' + k + ' = {?}', (t + u) * k, t + ' ' + TIMES + ' ' + k + ' + ' + u + ' ' + TIMES + ' ' + k + ' = ' + t * k + ' + ' + u * k + ' = ' + (t + u) * k); };
  S.parts = function () { var parts = [['Половината', 2], ['Една трета', 3], ['Една четвърт', 4], ['Една десета', 10]], p = pick(parts), q = rnd(2, p[1] === 10 ? 10 : 12), n = p[1] * q; return T(p[0] + ' от ' + n + ' е {?}', q, n + ' ' + DIV + ' ' + p[1] + ' = ' + q); };
  S.div1d = function (lv) { var d = rnd(2, 9), q; if (lv === 1) q = Math.random() < .5 ? rnd(1, 9) * 10 : rnd(1, Math.floor(9 / d) || 1) * 100; else if (lv === 2) q = rnd(11, Math.floor(99 / d) > 11 ? Math.floor(99 / d) : 12); else q = rnd(Math.ceil(100 / d), Math.floor(999 / d)); if (d * q > 999) q = Math.floor(999 / d); return expr(d * q, DIV, d, q); };
  S.unkDividend = function () { var d = rnd(2, 9), q = rnd(11, Math.floor(999 / d)); return T('{?} ' + DIV + ' ' + d + ' = ' + q, d * q, q + ' ' + TIMES + ' ' + d + ' = ' + d * q + ' (делимото = частно · делител)'); };
  S.units3b = function () { var k = rnd(2, 9), x = rnd(1, 9) * 100, r = rnd(0, 4); if (r === 0) return T('1 кг = {?} г', 1000, '1 кг = 1000 г'); if (r === 1) return T('1 т = {?} кг', 1000, '1 т = 1000 кг'); if (r === 2) return T('1 мин = {?} сек', 60, '1 мин = 60 сек'); if (r === 3) return T(k + ' кг ' + x + ' г = {?} г', k * 1000 + x, k + ' кг ' + x + ' г = ' + (k * 1000 + x) + ' г'); return T(k + ' мин = {?} сек', k * 60, k + ' ' + TIMES + ' 60 = ' + k * 60 + ' сек'); };

  // ===== 4. КЛАС =====
  S.placeBig = function () { var th = rnd(1, 99), h = rnd(0, 9), u = rnd(0, 9), n = th * 1000 + h * 100 + u; if (Math.random() < .5) return T(K(th) + ', ' + H(h) + ' и ' + U(u) + ' = {?}', n, '= ' + fmt(n)); return T('Колко хиляди има в числото ' + fmt(n) + '? {?}', th, fmt(n) + ' има ' + K(th)); };
  S.cmpBig = function () { var x = rnd(1000, 999999), y = Math.random() < .1 ? x : x + pick([-1000, -100, -10, 10, 100, 1000, 9000, -9000]); return cmpNums(x, Math.max(1000, y)); };
  S.nextPrevBig = function () { var n = rnd(1, 99) * 1000 + (Math.random() < .5 ? 0 : rnd(1, 999)); return Math.random() < .5 ? T('Кое число е <b>след</b> ' + fmt(n) + '? {?}', n + 1, 'След ' + fmt(n) + ' е ' + fmt(n + 1)) : T('Кое число е <b>преди</b> ' + fmt(n) + '? {?}', n - 1, 'Преди ' + fmt(n) + ' е ' + fmt(n - 1)); };
  S.romanRead = function (lv) { var n = lv === 1 ? rnd(1, 12) : pick([rnd(1, 20), rnd(1, 20), 50, 100]); return T('Римското число <b class="rom">' + roman(n) + '</b> е {?}', n, roman(n) + ' = ' + n); };
  S.romanWrite = function () { var n = pick([rnd(1, 20), rnd(1, 20), 50, 100]), ok = roman(n); var d = [roman(n + 1), roman(Math.max(1, n - 1)), roman(n + 2), roman(Math.max(1, n - 2))].filter(function (x) { return x !== ok; }); var u = []; d.forEach(function (x) { if (u.indexOf(x) < 0) u.push(x); }); while (u.length < 3) { var z = roman(rnd(1, 20)); if (z !== ok && u.indexOf(z) < 0) u.push(z); } return choose('Как се пише <b>' + n + '</b> с римски цифри?', textOpts([ok].concat(u.slice(0, 3))), ok, n + ' = ' + ok, { romanOpts: true }); };
  S.addBigNo = function () { var digits = rnd(4, 5), a = 0, b = 0, p = 1; for (var i = 0; i < digits; i++) { var x = rnd(i === digits - 1 ? 1 : 0, 8), y = rnd(0, 9 - x); if (i === digits - 1 && y === 0) y = 1; if (x + y > 9) y = 9 - x; a += x * p; b += y * p; p *= 10; } return expr(a, PLUS, b, a + b); };
  S.subBigNo = function () { var digits = rnd(4, 5), a = 0, b = 0, p = 1; for (var i = 0; i < digits; i++) { var x = rnd(i === digits - 1 ? 2 : 0, 9), y = rnd(0, x); if (i === digits - 1) y = rnd(1, x - 1); a += x * p; b += y * p; p *= 10; } return expr(a, MINUS, b, a - b); };
  S.unkSubtrahend = function () { var a = rnd(2, 99) * 100, c = rnd(1, a / 100 - 1) * 100; return T(fmt(a) + ' ' + MINUS + ' {?} = ' + fmt(c), a - c, fmt(a) + ' ' + MINUS + ' ' + fmt(a - c) + ' = ' + fmt(c) + ' (умалителят = умаляемо − разлика)'); };
  S.degrees = function () { var r = rnd(0, 2); if (r === 0) return T('Правият ъгъл е {?} градуса.', 90, 'Правият ъгъл е 90°.'); var d = r === 1 ? rnd(20, 80) : rnd(100, 170); if (Math.random() < .3) d = 90; var ans = d === 90 ? 'прав' : d < 90 ? 'остър' : 'тъп'; return choose('Ъгъл от <b>' + d + '°</b> е:', textOpts(['остър', 'прав', 'тъп']), ans, d + '° е ' + ans + ' ъгъл.', { figure: angleFig(d) }); };
  S.addBigX = function () { var a, b; do { a = rnd(1000, 60000); b = rnd(1000, 99999 - a); } while (!hasCarry(a, b)); return expr(a, PLUS, b, a + b); };
  S.subBigX = function () { var a, b; do { a = rnd(2000, 99999); b = rnd(1000, a - 500); if (Math.random() < .3) { a = rnd(2, 9) * 1000 + rnd(0, 9); b = rnd(100, a - 100); } } while (!hasBorrow(a, b)); return expr(a, MINUS, b, a - b); };
  S.solidsName = function () { var names = ['куб', 'цилиндър', 'конус', 'пирамида', 'сфера', 'правоъгълен паралелепипед'], t = pick(names), others = shuffle(names.filter(function (n) { return n !== t; })).slice(0, 3); return choose('Кое тяло е <b>' + t + '</b>?', [t].concat(others).map(function (n) { return { v: n, html: solidFig(n) }; }), t, 'Това е ' + t + '.', { optFigs: true }); };
  S.solidsCount = function () { var b = pick(['кубът', 'правоъгълният паралелепипед']), q = pick([['стени', 6], ['ръба', 12], ['върха', 8]]); return T('Колко ' + q[0] + ' има ' + b + '? {?}', q[1], b.charAt(0).toUpperCase() + b.slice(1) + ' има ' + q[1] + ' ' + q[0] + '.', { figure: solidFig(b === 'кубът' ? 'куб' : 'правоъгълен паралелепипед').replace('opt-fig', 'fig solid') }); };
  S.mulBig1d = function (lv) { var a = lv === 1 ? rnd(101, 999) : rnd(1001, 9999), b = rnd(2, 9); if (a * b > 99999) b = 2; return expr(a, TIMES, b, a * b); };
  S.area = function (lv) { var a = rnd(3, 15), b = rnd(2, 12); if (Math.random() < .35) return T('Лицето на квадрат със страна ' + a + ' см е {?} кв. см.', a * a, 'S = ' + a + ' ' + TIMES + ' ' + a + ' = ' + a * a + ' кв. см', { figure: rectFig(a + ' см', a + ' см', true) }); return T('Лицето на правоъгълник ' + a + ' см на ' + b + ' см е {?} кв. см.', a * b, 'S = ' + a + ' ' + TIMES + ' ' + b + ' = ' + a * b + ' кв. см', { figure: rectFig(a + ' см', b + ' см') }); };
  S.areaUnits = function () { var r = rnd(0, 3), k = rnd(2, 9); if (r === 0) return T('1 кв. дм = {?} кв. см', 100, '1 дм² = 100 см²'); if (r === 1) return T('1 кв. м = {?} кв. дм', 100, '1 м² = 100 дм²'); if (r === 2) return T('1 дка = {?} кв. м', 1000, '1 декар = 1000 м²'); return T(k + ' кв. см = {?} кв. мм', k * 100, k + ' см² = ' + k * 100 + ' мм²'); };
  S.divBig1d = function (lv) { var d = rnd(2, 9), q = lv === 1 ? rnd(Math.ceil(100 / d), Math.floor(999 / d)) : rnd(Math.ceil(1000 / d), Math.floor(9999 / d)); return expr(d * q, DIV, d, q); };
  S.unkDivisor = function () { var d = rnd(2, 9), q = rnd(12, 400); return T(fmt(d * q) + ' ' + DIV + ' {?} = ' + q, d, fmt(d * q) + ' ' + DIV + ' ' + d + ' = ' + q + ' (делителят = делимо : частно)'); };
  S.sideFromArea = function () { var a = rnd(3, 12), b = rnd(2, 9); return T('Правоъгълник има лице ' + a * b + ' кв. см и дължина ' + a + ' см. Ширината е {?} см.', b, a * b + ' ' + DIV + ' ' + a + ' = ' + b + ' см', { figure: rectFig(a + ' см', '? см') }); };
  S.wordBig = function () {
    var f = pick(NAMES_F), a, b, c, r = rnd(0, 2);
    if (r === 0) { a = rnd(120, 480); b = rnd(3, 8); return word('Една опаковка има ' + a + ' листа. Колко листа има в ' + b + ' опаковки?', a * b, a + ' ' + TIMES + ' ' + b + ' = ' + a * b); }
    if (r === 1) { b = rnd(3, 8); a = rnd(120, 900) * b; return word('Влак изминава ' + fmt(a) + ' км за ' + b + ' дни поравно. По колко километра изминава всеки ден?', a / b, fmt(a) + ' ' + DIV + ' ' + b + ' = ' + a / b + ' км'); }
    a = rnd(2000, 6000); b = rnd(500, 1500); c = rnd(200, 900); return word('В библиотеката има ' + fmt(a) + ' книги. Купуват още ' + b + ', а ' + c + ' стари книги дават на училище. Колко книги има сега?', a + b - c, fmt(a) + ' + ' + b + ' ' + MINUS + ' ' + c + ' = ' + fmt(a + b - c));
  };
  S.mul2d = function (lv) { var a = lv === 1 ? rnd(12, 99) : lv === 2 ? rnd(101, 999) : rnd(1001, 3999), b = rnd(11, lv === 3 ? 25 : 99); if (a * b > 99999) b = 11; return expr(a, TIMES, b, a * b); };
  S.div2d = function (lv) { var d = rnd(11, lv === 1 ? 25 : 99), q = lv === 1 ? rnd(2, 9) : lv === 2 ? rnd(11, 60) : rnd(101, 400); if (d * q > 99999) q = Math.floor(99999 / d); return expr(d * q, DIV, d, q); };
  S.calcWord = function () { var a = rnd(12, 48), b = rnd(12, 30); return word('В едно училище има ' + a + ' класа по ' + b + ' ученици. Колко са учениците?', a * b, a + ' ' + TIMES + ' ' + b + ' = ' + a * b); };

  S.wordArea = function () { var a = rnd(10, 40), b = rnd(5, 20); if (Math.random() < .5) return word('Градина има форма на правоъгълник с дължина ' + a + ' м и ширина ' + b + ' м. Колко метра ограда трябват около нея?', 2 * (a + b), '2 ' + TIMES + ' (' + a + ' + ' + b + ') = ' + 2 * (a + b) + ' м'); var x = rnd(3, 7), y = rnd(3, 6); return word('Стая има форма на правоъгълник ' + x + ' м на ' + y + ' м. Колко квадратни метра е подът?', x * y, x + ' ' + TIMES + ' ' + y + ' = ' + x * y + ' кв. м'); };
  S.word3 = function () {
    var f = pick(NAMES_F), m = pick(NAMES_M), a, b, c, r = rnd(0, 3);
    if (r === 0) { a = rnd(12, 40); b = rnd(2, 5); return word('Една книга струва ' + a + ' евро. Колко струват ' + b + ' такива книги?', a * b, a + ' ' + TIMES + ' ' + b + ' = ' + a * b + ' евро'); }
    if (r === 1) { b = rnd(2, 6); a = rnd(11, 40) * b; return word('В ' + b + ' кутии има поравно общо ' + a + ' бонбона. По колко бонбона има в една кутия?', a / b, a + ' ' + DIV + ' ' + b + ' = ' + a / b); }
    if (r === 2) { a = rnd(100, 400); b = rnd(20, 99); return word(f + ' има ' + a + ' точки в играта, а ' + m + ' – с ' + b + ' по-малко. Колко точки имат двамата заедно?', a + (a - b), a + ' + (' + a + ' ' + MINUS + ' ' + b + ') = ' + (a + a - b)); }
    a = rnd(3, 9); b = rnd(20, 60); c = rnd(10, 90); return word('Училищният салон има ' + a + ' реда по ' + b + ' стола и още ' + c + ' стола отзад. Колко са всички столове?', a * b + c, a + ' ' + TIMES + ' ' + b + ' + ' + c + ' = ' + (a * b + c));
  };


  // ===== умения с параметър (за мисиите по учебници): 'име:аргумент' =====
  function list(arg) { return String(arg).split(',').map(Number); }
  S.countTo = function (lv, n) { n = +n || 5; var k = rnd(1, n); return T('Колко са точиците? {?}', k, 'Точиците са ' + k + '.', { dots: { a: k, b: 0, op: 'count' } }); };
  S.addTo = function (lv, n) { n = +n || 10; var a = rnd(0, n - 1), b = rnd(n <= 5 ? 1 : 0, n - a); var t = expr(a, PLUS, b, a + b); if (n <= 6 && lv < 3) t.dots = { a: a, b: b, op: '+' }; return t; };
  S.subTo = function (lv, n) { n = +n || 10; var a = rnd(1, n), b = rnd(0, a); var t = expr(a, MINUS, b, a - b); if (n <= 6 && lv < 3) t.dots = { a: a, b: b, op: '-' }; return t; };
  S.cmpExprTo = function (lv, n) { n = +n || 5; if (Math.random() < .5) { var a = rnd(0, n - 1), b = rnd(0, n - a), m = Math.max(0, Math.min(n, a + b + pick([-1, 0, 1]))); return cmpTask(a + ' + ' + b, String(m), a + b, m); } var c = rnd(1, n), d = rnd(0, c), k = Math.max(0, Math.min(n, c - d + pick([-1, 0, 1]))); return cmpTask(c + ' ' + MINUS + ' ' + d, String(k), c - d, k); };
  S.zero = function () { var a = rnd(1, 9), r = rnd(0, 3); if (r === 0) return expr(a, PLUS, 0, a); if (r === 1) return expr(0, PLUS, a, a); if (r === 2) return expr(a, MINUS, 0, a); return expr(a, MINUS, a, 0); };
  S.threeTo = function (lv, n) { n = +n || 10; var a = rnd(1, Math.max(1, n - 2)), b = rnd(1, Math.max(1, n - a - 1)), c = rnd(0, n - a - b); if (Math.random() < .4 && a + b <= n) { var x = a + b + c; return T(x + ' ' + MINUS + ' ' + a + ' ' + MINUS + ' ' + b + ' = {?}', c, x + ' ' + MINUS + ' ' + a + ' ' + MINUS + ' ' + b + ' = ' + c); } return T(a + ' + ' + b + ' + ' + c + ' = {?}', a + b + c, a + ' + ' + b + ' + ' + c + ' = ' + (a + b + c)); };
  S.nextPrev10 = function () { var n = rnd(1, 9); return Math.random() < .5 ? T('Кое число е <b>след</b> ' + n + '? {?}', n + 1, 'След ' + n + ' е ' + (n + 1) + '.') : T('Кое число е <b>преди</b> ' + n + '? {?}', n - 1, 'Преди ' + n + ' е ' + (n - 1) + '.'); };
  S.add10plus = function () { var b = rnd(0, 10); return Math.random() < .5 ? expr(10, PLUS, b, 10 + b) : expr(b, PLUS, 10, 10 + b); };
  S.sub10minus = function () { var u = rnd(1, 9), n = 10 + u; return Math.random() < .5 ? expr(n, MINUS, 10, u) : expr(n, MINUS, u, 10); };
  S.sub2d2d20 = function () { var a = rnd(12, 19), b = rnd(11, a); if ((b % 10) > (a % 10)) b = 10 + (a % 10); return expr(a, MINUS, b, a - b); };
  S.make20 = function () { var b = rnd(1, 9), a = 20 - b, r = rnd(0, 2); if (r === 0) return Math.random() < .5 ? expr(a, PLUS, b, 20) : expr(b, PLUS, a, 20); if (r === 1) return expr(20, MINUS, b, a); return expr(20, MINUS, a, b); };
  S.sumN = function (lv, arg) { var n = pick(list(arg || '11')), a = rnd(n - 9, 9), b = n - a; return Math.random() < .2 ? missing(a, PLUS, b, n, 1) : expr(a, PLUS, b, n); };
  S.subFromN = function (lv, arg) { var n = pick(list(arg || '11')), b = rnd((n % 10) + 1, 9); return expr(n, MINUS, b, n - b); };
  S.fillTo10 = function (lv, arg) { var f = pick(list(arg || '1')), a = 10 - f, b = rnd(f + 1, 9); var t = Math.random() < .5 ? expr(a, PLUS, b, a + b) : expr(b, PLUS, a, a + b); t.full += ' (' + a + ' + ' + f + ' = 10, 10 + ' + (b - f) + ' = ' + (a + b) + ')'; return t; };
  S.three100 = function () { var a = rnd(1, 4) * 10 + rnd(0, 3), b = rnd(1, 3) * 10 + rnd(0, 3), c = rnd(1, 2) * 10 + rnd(0, 3); return T(a + ' + ' + b + ' + ' + c + ' = {?}', a + b + c, a + ' + ' + b + ' + ' + c + ' = ' + (a + b + c)); };
  S.add2d1dNo = function () { var t = rnd(1, 9), u = rnd(0, 8), b = rnd(1, 9 - u), a = t * 10 + u; return expr(a, PLUS, b, a + b); }; // 22 + 5 (без преминаване)
  S.sub2d1dNo = function () { var t = rnd(1, 9), u = rnd(1, 9), b = rnd(1, u), a = t * 10 + u; return expr(a, MINUS, b, a - b); };  // 27 – 4
  S.add2d1dX = function () { var t = rnd(1, 8), u = rnd(2, 9), b = rnd(10 - u, 9); var a = t * 10 + u; return expr(a, PLUS, b, a + b); };
  S.sub2d1dX = function () { var t = rnd(2, 9), u = rnd(0, 7), b = rnd(u + 1, 9); var a = t * 10 + u; return expr(a, MINUS, b, a - b); };
  S.make100 = function () { var b = rnd(11, 89); if (b % 10 === 0) b++; var a = 100 - b; return Math.random() < .5 ? expr(a, PLUS, b, 100) : expr(100, MINUS, b, a); };
  S.repAdd = function () { var a = rnd(2, 9), k = rnd(2, 5), parts = []; for (var i = 0; i < k; i++) parts.push(a); return Math.random() < .5 ? T(parts.join(' + ') + ' = ' + a + ' ' + TIMES + ' {?}', k, parts.join(' + ') + ' = ' + a + ' ' + TIMES + ' ' + k + ' = ' + a * k) : T(parts.join(' + ') + ' = {?}', a * k, a + ' ' + TIMES + ' ' + k + ' = ' + a * k); };
  S.circle = function (lv) { // окръжност: радиус и диаметър
    var r = rnd(2, lv > 2 ? 25 : 12), k = Math.random();
    if (k < .4) return T('Радиусът на окръжност е ' + r + ' см. Колко е диаметърът? {?} см', 2 * r, 'Диаметърът е два пъти радиуса: ' + r + ' · 2 = ' + 2 * r + ' см');
    if (k < .8) return T('Диаметърът на окръжност е ' + 2 * r + ' см. Колко е радиусът? {?} см', r, 'Радиусът е половината от диаметъра: ' + 2 * r + ' : 2 = ' + r + ' см');
    return T('Колко радиуса се събират в един диаметър? {?}', 2, 'Диаметърът е равен на два радиуса');
  };
  S.divRem = function (lv) { // деление с остатък: 17 : 5 = 3 (ост. 2)
    var b = rnd(2, lv > 1 ? 9 : 5), q = rnd(2, lv > 2 ? 30 : 9), r = rnd(1, b - 1), a = b * q + r, why = q + ' · ' + b + ' + ' + r + ' = ' + a;
    if (Math.random() < .5) return T(a + ' : ' + b + ' = {?} (ост. ' + r + ')', q, a + ' : ' + b + ' = ' + q + ' (ост. ' + r + '), защото ' + why);
    return T('Остатъкът при ' + a + ' : ' + b + ' е {?}', r, a + ' : ' + b + ' = ' + q + ' (ост. ' + r + '), защото ' + why);
  };
  S.mulBy = function (lv, arg) { var n = pick(list(arg || '2')), k = rnd(1, 10); return Math.random() < .5 ? expr(n, TIMES, k, n * k) : expr(k, TIMES, n, n * k); };   // само умножение
  S.divBy = function (lv, arg) { var n = pick(list(arg || '2')), k = rnd(1, 10); return expr(n * k, DIV, n, k); };                                            // само деление
  S.mulDivBy = function (lv, arg) { var n = pick(list(arg || '2')), k = rnd(1, 10); if (Math.random() < .55) return Math.random() < .5 ? expr(n, TIMES, k, n * k) : expr(k, TIMES, n, n * k); return expr(n * k, DIV, n, k); };
  S.orderNoBr = function () { var r = rnd(0, 2), a, b, c; if (r === 0) { a = rnd(5, 40); b = rnd(2, 5); c = rnd(2, 9); return T(a + ' + ' + b + ' ' + TIMES + ' ' + c + ' = {?}', a + b * c, a + ' + ' + b * c + ' = ' + (a + b * c)); } if (r === 1) { c = rnd(2, 5); b = c * rnd(2, 9); a = rnd(b / c + 1, 60); return T(a + ' ' + MINUS + ' ' + b + ' ' + DIV + ' ' + c + ' = {?}', a - b / c, a + ' ' + MINUS + ' ' + b / c + ' = ' + (a - b / c)); } a = rnd(2, 5); b = rnd(2, 9); c = rnd(1, 30); return T(a + ' ' + TIMES + ' ' + b + ' + ' + c + ' = {?}', a * b + c, a * b + ' + ' + c + ' = ' + (a * b + c)); };
  S.mulEqual = function () { var a = rnd(1, 10); return Math.random() < .5 ? expr(a, DIV, a, 1) : expr(a, TIMES, 1, a); };
  S.zeroMul = function () { var a = rnd(1, 10), r = rnd(0, 2); if (r === 0) return expr(a, TIMES, 0, 0); if (r === 1) return expr(0, TIMES, a, 0); return expr(0, DIV, a, 0); };
  S.wordAddSub1000 = function () { var f = pick(NAMES_F), a = rnd(150, 600), b = rnd(100, 350); if (Math.random() < .5) return word('В едно училище има ' + a + ' момичета и ' + b + ' момчета. Колко са всички ученици?', a + b, a + ' + ' + b + ' = ' + (a + b)); var c = rnd(300, 900), d = rnd(100, c - 50); return word(f + ' събра ' + c + ' точки, а брат ѝ – с ' + d + ' по-малко. Колко точки събра брат ѝ?', c - d, c + ' ' + MINUS + ' ' + d + ' = ' + (c - d)); };
  S.make1000 = function () { var b = rnd(101, 899); if (b % 10 === 0) b += 3; var a = 1000 - b; return Math.random() < .5 ? expr(a, PLUS, b, 1000) : expr(1000, MINUS, b, a); };
  S.wordIndirect = function () { var f = pick(NAMES_F), m = pick(NAMES_M), a = rnd(120, 600), b = rnd(20, 99); if (Math.random() < .5) return word(f + ' има ' + a + ' стикера. Това е с ' + b + ' повече от стикерите на ' + m + '. Колко стикера има ' + m + '?', a - b, a + ' ' + MINUS + ' ' + b + ' = ' + (a - b) + ' (косвена форма: „с ' + b + ' повече“ → изваждаме)'); return word(m + ' пробяга ' + a + ' м. Това е с ' + b + ' м по-малко от ' + f + '. Колко метра пробяга ' + f + '?', a + b, a + ' + ' + b + ' = ' + (a + b) + ' (косвена форма: „с ' + b + ' по-малко“ → събираме)'); };
  S.divSum = function () { var d = rnd(2, 9), x = rnd(1, 9) * 10 * d, y = rnd(1, 9) * d; if (x + y > 999) x = d * 10; return T('(' + x + ' + ' + y + ') ' + DIV + ' ' + d + ' = {?}', (x + y) / d, x + ' ' + DIV + ' ' + d + ' + ' + y + ' ' + DIV + ' ' + d + ' = ' + x / d + ' + ' + y / d + ' = ' + (x + y) / d); };
  S.div0q = function () { var d = rnd(2, 9), q = rnd(1, Math.floor(9 / 1)) * 100 + rnd(1, 9); while (q * d > 999) q -= 100; if (q < 101) q = 101 + rnd(0, 8); if (q * d > 999) { d = 2; q = 104; } return expr(q * d, DIV, d, q); };
  S.makeThousand = function () { var big = pick([1000, 10000, 100000]), b = rnd(Math.floor(big / 10), big - 1); if (Math.random() < .5) return T(fmt(b) + ' + {?} = ' + fmt(big), big - b, fmt(b) + ' + ' + fmt(big - b) + ' = ' + fmt(big)); return expr(big, MINUS, b, big - b); };
  S.mulRound10 = function () { var r = rnd(0, 1), a; if (r === 0) { a = rnd(12, 999); var p = pick([10, 100, 1000]); if (a * p > 999999) p = 10; return expr(a, TIMES, p, a * p); } a = rnd(12, 299); var k = rnd(2, 9) * 10; return expr(a, TIMES, k, a * k); };
  S.divRound10 = function () { var r = rnd(0, 1), p, q; if (r === 0) { p = pick([10, 100, 1000]); q = rnd(12, 999); return expr(q * p, DIV, p, q); } p = rnd(2, 9) * 10; q = rnd(3, 99); return expr(q * p, DIV, p, q); };
  S.partsN = function (lv, n) { n = +n || 2; var name = { 2: 'Половинката', 3: 'Една трета (третинката)', 4: 'Една четвърт (четвъртинката)', 10: 'Една десета (десетинката)' }[n], q = rnd(2, 12); return T(name + ' от ' + n * q + ' е {?}', q, n * q + ' ' + DIV + ' ' + n + ' = ' + q); };

  // ---------- теми по учебните програми ----------
  /* skills: [име, тегло, от кое ниво (1..3)] */
  var GRADES = {
    1: { name: '1. клас', color: '#FF5A5F', topics: [
      { id: 'g1t1', name: 'Числата до 5 и нула', short: 'До 5', skills: [['count5', 2, 1], ['add5', 3, 1], ['sub5', 3, 1], ['cmp5', 2, 1], ['shapes', 2, 1]] },
      { id: 'g1t2', name: 'Числата до 10. Събиране и изваждане до 10', short: 'До 10', skills: [['add10', 3, 1], ['sub10', 3, 1], ['decomp10', 2, 2], ['three10', 1, 2], ['missing10', 2, 2], ['cmp10', 1, 1], ['coins10', 1, 2], ['kg10', 1, 3], ['word10', 2, 2]] },
      { id: 'g1t3', name: 'Числата от 11 до 20', short: '11 до 20', skills: [['place20', 3, 1], ['nextPrev20', 2, 1], ['cmp20', 2, 1], ['cm20', 2, 2]] },
      { id: 'g1t4', name: 'Събиране и изваждане до 20 без преминаване', short: 'До 20 без преминаване', skills: [['add20no', 3, 1], ['sub20no', 3, 1], ['cmpExpr20', 1, 2], ['word20', 2, 1], ['shapes', 1, 2]] },
      { id: 'g1t5', name: 'Събиране и изваждане до 20 с преминаване', short: 'До 20 с преминаване', skills: [['add20x', 3, 1], ['sub20x', 3, 1], ['word20', 2, 2], ['clockHour', 1, 1]] },
      { id: 'g1t6', name: 'Числата 10, 20, 30, … 100', short: 'Кръгли десетици', skills: [['tens100', 4, 1], ['notes100', 1, 2]] }
    ] },
    2: { name: '2. клас', color: '#FF9F1C', topics: [
      { id: 'g2t1', name: 'Числата до 100', short: 'До 100', skills: [['place100', 3, 1], ['cmp100', 2, 1], ['nextPrev100', 2, 1], ['units2', 2, 2]] },
      { id: 'g2t2', name: 'Събиране и изваждане до 100 без преминаване', short: 'До 100 без преминаване', skills: [['add100no', 3, 1], ['sub100no', 3, 1], ['brackets', 2, 2], ['unkAddend', 2, 2]] },
      { id: 'g2t3', name: 'Събиране и изваждане до 100 с преминаване', short: 'До 100 с преминаване', skills: [['add100x', 3, 1], ['sub100x', 3, 1], ['perim2', 2, 2], ['triSides', 1, 2], ['word2steps', 2, 3]] },
      { id: 'g2t4', name: 'Таблично умножение и деление', short: 'Таблицата за умножение', skills: [['mulTable', 4, 1], ['divTable', 3, 1], ['unkFactor', 2, 2], ['evenOdd', 1, 1], ['timesWord', 2, 2], ['time2', 1, 2], ['clockHM', 1, 3]] }
    ] },
    3: { name: '3. клас', color: '#4CBB4A', topics: [
      { id: 'g3t1', name: 'Числата до 1000', short: 'До 1000', skills: [['place1000', 3, 1], ['cmp1000', 2, 1], ['nextPrev1000', 2, 1], ['lines', 1, 2]] },
      { id: 'g3t2', name: 'Събиране и изваждане до 1000 без преминаване', short: 'До 1000 без преминаване', skills: [['add1000no', 3, 1], ['sub1000no', 3, 1], ['unkMinuend', 2, 2], ['angles', 1, 1], ['units3a', 2, 2]] },
      { id: 'g3t3', name: 'Събиране и изваждане до 1000 с преминаване', short: 'До 1000 с преминаване', skills: [['add1000x', 3, 1], ['sub1000x', 3, 1], ['triAngles', 1, 1], ['century', 1, 2], ['word3', 1, 3]] },
      { id: 'g3t4', name: 'Умножение на двуцифрено и трицифрено число с едноцифрено', short: 'Умножение с едноцифрено', skills: [['mul1d', 4, 1], ['distrib', 2, 2], ['parts', 2, 2], ['word3', 1, 3]] },
      { id: 'g3t5', name: 'Деление на двуцифрено и трицифрено число с едноцифрено', short: 'Деление с едноцифрено', skills: [['div1d', 4, 1], ['unkDividend', 2, 2], ['units3b', 2, 2], ['word3', 1, 3]] }
    ] },
    4: { name: '4. клас', color: '#2F80ED', topics: [
      { id: 'g4t1', name: 'Числата над 1000', short: 'Над 1000', skills: [['placeBig', 3, 1], ['cmpBig', 2, 1], ['nextPrevBig', 2, 1], ['romanRead', 2, 1], ['romanWrite', 1, 2]] },
      { id: 'g4t2', name: 'Събиране и изваждане на многоцифрени числа без преминаване', short: 'Многоцифрени без преминаване', skills: [['addBigNo', 3, 1], ['subBigNo', 3, 1], ['unkSubtrahend', 2, 2], ['degrees', 1, 1]] },
      { id: 'g4t3', name: 'Събиране и изваждане на многоцифрени числа с преминаване', short: 'Многоцифрени с преминаване', skills: [['addBigX', 3, 1], ['subBigX', 3, 1], ['solidsName', 1, 1], ['solidsCount', 1, 2], ['wordBig', 1, 3]] },
      { id: 'g4t4', name: 'Умножение на многоцифрено число с едноцифрено', short: 'Умножение с едноцифрено', skills: [['mulBig1d', 4, 1], ['area', 2, 1], ['areaUnits', 1, 2], ['wordArea', 1, 3]] },
      { id: 'g4t5', name: 'Деление на многоцифрено число с едноцифрено', short: 'Деление с едноцифрено', skills: [['divBig1d', 4, 1], ['unkDivisor', 2, 2], ['sideFromArea', 1, 2], ['wordBig', 1, 3]] },
      { id: 'g4t6', name: 'Умножение на многоцифрено число с двуцифрено', short: 'Умножение с двуцифрено', skills: [['mul2d', 4, 1], ['calcWord', 1, 2]] },
      { id: 'g4t7', name: 'Деление на многоцифрено число с двуцифрено', short: 'Деление с двуцифрено', skills: [['div2d', 4, 1], ['wordBig', 1, 3]] }
    ] }
  };

  // ---------- Приключение: мисии по темите, в реда на програмата ----------
  var ROMAN_LV = ['', 'I', 'II', 'III'];
  var ADVENTURE = {};
  var LEVELS_PER_TOPIC = { 1: [1, 2], 2: [1, 2, 3], 3: [1, 2, 3], 4: [1, 3] };
  [1, 2, 3, 4].forEach(function (g) {
    var list = [];
    GRADES[g].topics.forEach(function (t) { LEVELS_PER_TOPIC[g].forEach(function (lv) { list.push([t.id, lv, t.short + ' · ' + ROMAN_LV[lv]]); }); });
    list.push(['mix', 3, 'Върхът']);
    ADVENTURE[g] = list;
  });

  // изпълнява умение по спецификация 'име' или 'име:аргумент'
  function runSkill(spec, lvl) {
    var i = spec.indexOf(':'), name = i < 0 ? spec : spec.slice(0, i), arg = i < 0 ? undefined : spec.slice(i + 1);
    var t = S[name](lvl, arg); t.skill = name; t.table = /^(mulTable|divTable|unkFactor|mulDivBy|mulBy|divBy)$/.test(name);
    return t;
  }
  /* мисия по учебник: skills = [['addTo:5', тегло], ...] */
  function generateFrom(grade, skills, level) {
    var total = 0; skills.forEach(function (s) { total += s[1] || 1; });
    var r = Math.random() * total, chosen = skills[0];
    for (var i = 0; i < skills.length; i++) { r -= skills[i][1] || 1; if (r <= 0) { chosen = skills[i]; break; } }
    var t = runSkill(chosen[0], +level || 1); t.grade = +grade; t.level = +level || 1; t.topic = 'book';
    return t;
  }

  function findTopic(grade, id) { var ts = GRADES[grade].topics; for (var i = 0; i < ts.length; i++) if (ts[i].id === id) return ts[i]; return null; }

  function generate(grade, topicId, level) {
    grade = +grade || 1; level = +level || 1;
    var topic = topicId && topicId !== 'mix' ? findTopic(grade, topicId) : null;
    var lvl = level;
    if (!topic) { topic = pick(GRADES[grade].topics); lvl = level >= 3 ? rnd(2, 3) : level; }
    var pool = topic.skills.filter(function (s) { return s[2] <= lvl; }), total = 0;
    pool.forEach(function (s) { total += s[1]; });
    var r = Math.random() * total, chosen = pool[0];
    for (var i = 0; i < pool.length; i++) { r -= pool[i][1]; if (r <= 0) { chosen = pool[i]; break; } }
    var t = S[chosen[0]](lvl);
    t.topic = topic.id; t.skill = chosen[0]; t.grade = grade; t.level = lvl;
    t.table = /^(mulTable|divTable|unkFactor)$/.test(chosen[0]);
    return t;
  }

  function generateSkill(grade, skill, level) { // за тестове и линкове към конкретен тип задача
    if (!S[skill]) return generate(grade, null, level);
    var t = S[skill](+level || 1); t.skill = skill; t.grade = +grade; t.level = +level || 1; t.topic = 'skill'; t.table = /^(mulTable|divTable|unkFactor)$/.test(skill);
    return t;
  }

  function check(task, input) {
    if (input === null || input === undefined || input === '') return false;
    if (task.kind === 'choice') return String(input) === String(task.answer);
    return parseInt(String(input).replace(/\s/g, ''), 10) === task.answer;
  }

  function topicName(grade, id) { if (id === 'mix' || !id) return 'Смесени задачи'; var t = findTopic(grade, id); return t ? t.name : ''; }

  window.Smetko = window.Smetko || {};
  window.Smetko.MathEngine = { generate: generate, generateSkill: generateSkill, generateFrom: generateFrom, runSkill: runSkill, check: check, GRADES: GRADES, ADVENTURE: ADVENTURE, topicName: topicName, fmt: fmt, roman: roman, _S: S };
})();
