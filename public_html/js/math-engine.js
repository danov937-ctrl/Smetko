/* Сметко — генератор на математически задачи (1.–4. клас)
   Теми по учебната програма в България. Всяка тема има 3 нива на трудност.

   Smetko.MathEngine.generate(grade, topicId, level) → задача:
   {
     q:      'текст на задачата, {?} е мястото за отговора',
     answer: число или символ ('<', '=', '>'),
     kind:   'number' | 'choice',
     choices:['<','=','>']  (само при kind:'choice'),
     full:   'пълният правилен запис, напр. 8 + 5 = 13',
     topic, grade, level, figure (SVG по избор), dots (визуализация по избор)
   }
*/
(function () {
  'use strict';

  // ---------- помощни ----------
  function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function fmt(n) { // 12345 → 12 345 (разделител за хилядите от 10 000 нагоре)
    var s = String(n);
    return Math.abs(n) >= 10000 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : s;
  }
  var PLUS = '+', MINUS = '−', TIMES = '·', DIV = ':';

  function T(q, answer, full, extra) {
    var t = { q: q, answer: answer, kind: 'number', full: full };
    if (extra) for (var k in extra) t[k] = extra[k];
    return t;
  }
  function expr(a, op, b, ans) { // "a op b = {?}"
    return T(fmt(a) + ' ' + op + ' ' + fmt(b) + ' = {?}', ans, fmt(a) + ' ' + op + ' ' + fmt(b) + ' = ' + fmt(ans));
  }
  function cmpTask(left, right, lv, rv) {
    var ans = lv < rv ? '<' : (lv > rv ? '>' : '=');
    return { q: left + ' {?} ' + right, answer: ans, kind: 'choice', choices: ['<', '=', '>'], full: left + ' ' + ans + ' ' + right };
  }
  // липсващо число: позиция 0 = първо число, 1 = второ
  function missing(a, op, b, c, pos) {
    var q, ans;
    if (pos === 0) { q = '{?} ' + op + ' ' + fmt(b) + ' = ' + fmt(c); ans = a; }
    else { q = fmt(a) + ' ' + op + ' {?} = ' + fmt(c); ans = b; }
    return T(q, ans, fmt(a) + ' ' + op + ' ' + fmt(b) + ' = ' + fmt(c));
  }

  // ---------- геометрични фигури (SVG) ----------
  function rectSVG(w, h, la, lb, square) {
    var W = 200, H = 130, rw = square ? 96 : 150, rh = square ? 96 : 84;
    var x = (W - rw) / 2, y = (H - rh) / 2;
    return '<svg class="fig" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<rect x="' + x + '" y="' + y + '" width="' + rw + '" height="' + rh + '" rx="3" fill="#E7F4FF" stroke="#2F80ED" stroke-width="4"/>' +
      '<text x="' + (W / 2) + '" y="' + (y - 7) + '" text-anchor="middle">' + la + '</text>' +
      '<text x="' + (x + rw + 8) + '" y="' + (H / 2 + 6) + '">' + lb + '</text></svg>';
  }
  function triSVG(a, b, c) {
    return '<svg class="fig" viewBox="0 0 200 130" aria-hidden="true">' +
      '<polygon points="30,112 170,112 110,18" fill="#FFF3D6" stroke="#FF7A1A" stroke-width="4" stroke-linejoin="round"/>' +
      '<text x="100" y="128" text-anchor="middle">' + a + '</text>' +
      '<text x="150" y="62">' + b + '</text>' +
      '<text x="36" y="62">' + c + '</text></svg>';
  }

  // ---------- генератори ----------
  var G = {};

  // ===== 1. клас =====
  G.add10 = function (lv) {
    var max = lv === 1 ? 6 : 10;
    var a = rnd(lv === 1 ? 1 : 0, max - 1), b = rnd(lv === 1 ? 1 : 0, max - a);
    var t = expr(a, PLUS, b, a + b);
    if (lv === 1) t.dots = { a: a, b: b, op: '+' };
    return t;
  };
  G.sub10 = function (lv) {
    var a = rnd(lv === 1 ? 2 : 1, lv === 1 ? 6 : 10), b = rnd(lv === 1 ? 1 : 0, a);
    var t = expr(a, MINUS, b, a - b);
    if (lv === 1) t.dots = { a: a, b: b, op: '-' };
    return t;
  };
  G.add20 = function (lv) {
    var a, b;
    if (lv === 1) { a = rnd(10, 18); b = rnd(1, 19 - a); if ((a % 10) + b > 9) b = 9 - (a % 10) || 1; } // без преминаване
    else if (lv === 2) { a = rnd(3, 9); b = rnd(11 - a, 9); }                                            // с преминаване
    else { if (Math.random() < .5) { a = rnd(2, 9); b = rnd(11 - a, 9); } else { var x = rnd(1, 7), y = rnd(1, 7), z = rnd(1, 20 - x - y > 6 ? 6 : 20 - x - y); return T(x + ' + ' + y + ' + ' + z + ' = {?}', x + y + z, x + ' + ' + y + ' + ' + z + ' = ' + (x + y + z)); } }
    return expr(a, PLUS, b, a + b);
  };
  G.sub20 = function (lv) {
    var a, b;
    if (lv === 1) { a = rnd(11, 19); b = rnd(1, a % 10 || 1); if (Math.random() < .25) b = 10; }        // без преминаване
    else { a = rnd(11, 18); b = rnd((a % 10) + 1, 9); }                                                   // с преминаване
    return expr(a, MINUS, b, a - b);
  };
  G.compare = function (lv) {
    if (lv === 3) {
      var a = rnd(2, 10), b = rnd(1, 10), s = a + b, n = s + pick([-2, -1, 0, 0, 1, 2]);
      if (Math.random() < .5) { var c = rnd(1, a); return cmpTask(a + ' ' + MINUS + ' ' + c, String(n - b > 0 ? n - b : 1), a - c, n - b > 0 ? n - b : 1); }
      return cmpTask(a + ' + ' + b, String(n), s, n);
    }
    var max = lv === 1 ? 10 : 20, x = rnd(0, max), y = Math.random() < .2 ? x : rnd(0, max);
    return cmpTask(String(x), String(y), x, y);
  };
  G.missing1 = function (lv) {
    var max = lv === 1 ? 10 : 20;
    if (Math.random() < .6) { var a = rnd(1, max - 1), b = rnd(1, max - a); return missing(a, PLUS, b, a + b, rnd(0, 1)); }
    var c = rnd(2, max), d = rnd(1, c - 1); return missing(c, MINUS, d, c - d, rnd(0, 1));
  };

  // ===== 2. клас =====
  G.add100 = function (lv) {
    var a, b;
    if (lv === 1) { if (Math.random() < .5) { a = rnd(1, 8) * 10; b = rnd(1, 9 - a / 10) * 10; } else { a = rnd(2, 9) * 10 + rnd(0, 7); b = rnd(1, 9 - (a % 10)); } }
    else if (lv === 2) { var at = rnd(1, 7), bt = rnd(1, 8 - at), au = rnd(0, 8), bu = rnd(0, 9 - au); a = at * 10 + au; b = bt * 10 + bu; }
    else { var au2 = rnd(2, 9), bu2 = rnd(10 - au2, 9), at2 = rnd(1, 7), bt2 = rnd(1, 8 - at2); a = at2 * 10 + au2; b = bt2 * 10 + bu2; }
    return expr(a, PLUS, b, a + b);
  };
  G.sub100 = function (lv) {
    var a, b;
    if (lv === 1) { if (Math.random() < .5) { a = rnd(3, 10) * 10; b = rnd(1, a / 10 - 1) * 10; } else { a = rnd(2, 9) * 10 + rnd(2, 9); b = rnd(1, a % 10); } }
    else if (lv === 2) { var at = rnd(3, 9), au = rnd(3, 9); a = at * 10 + au; b = rnd(1, at - 1) * 10 + rnd(0, au); }
    else { var at2 = rnd(3, 9), au2 = rnd(0, 7); a = at2 * 10 + au2; b = rnd(1, at2 - 1) * 10 + rnd(au2 + 1, 9); }
    return expr(a, MINUS, b, a - b);
  };
  G.mul2 = function (lv) {
    var f = lv === 1 ? pick([2, 10, 5]) : pick([2, 3, 4, 5, 10]), k = rnd(lv === 3 ? 0 : 1, 10);
    return Math.random() < .5 ? expr(f, TIMES, k, f * k) : expr(k, TIMES, f, f * k);
  };
  G.div2 = function (lv) {
    var f = lv === 1 ? pick([2, 10, 5]) : pick([2, 3, 4, 5, 10]), k = rnd(1, 10);
    return Math.random() < .7 || lv === 1 ? expr(f * k, DIV, f, k) : expr(f * k, DIV, k, f);
  };
  G.compare100 = function (lv) {
    if (lv === 3) {
      var a = rnd(11, 60), b = rnd(10, 39), s = a + b, n = s + pick([-10, -1, 0, 0, 1, 10]);
      return cmpTask(a + ' + ' + b, String(n), s, n);
    }
    var x = rnd(lv === 1 ? 10 : 0, 100), y = Math.random() < .15 ? x : (lv === 1 ? rnd(10, 100) : x + pick([-10, -1, 1, 10, 9, -9]));
    if (y < 0) y = 0; if (y > 100) y = 100;
    return cmpTask(String(x), String(y), x, y);
  };
  G.missing2 = function (lv) {
    var r = Math.random();
    if (lv > 1 && r < .4) { var f = pick([2, 3, 4, 5, 10]), k = rnd(1, 10); return missing(f, TIMES, k, f * k, rnd(0, 1)); }
    if (r < .7) { var a = rnd(10, 80), b = rnd(5, 100 - a); if (lv === 1) { a = rnd(1, 8) * 10; b = rnd(1, 10 - a / 10) * 10; } return missing(a, PLUS, b, a + b, rnd(0, 1)); }
    var c = rnd(20, 100), d = rnd(5, c - 5); if (lv === 1) { c = rnd(3, 10) * 10; d = rnd(1, c / 10 - 1) * 10; } return missing(c, MINUS, d, c - d, rnd(0, 1));
  };

  // ===== 3. клас =====
  G.multable = function (lv) {
    var set = lv === 1 ? [2, 3, 4, 5] : lv === 2 ? [6, 7, 8, 9] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var f = pick(set), k = rnd(lv === 3 ? 0 : 2, 10);
    return Math.random() < .5 ? expr(f, TIMES, k, f * k) : expr(k, TIMES, f, f * k);
  };
  G.divtable = function (lv) {
    var set = lv === 1 ? [2, 3, 4, 5] : lv === 2 ? [6, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var f = pick(set), k = rnd(1, 10);
    if (lv === 3 && Math.random() < .1) return expr(0, DIV, f, 0);
    return expr(f * k, DIV, f, k);
  };
  G.add1000 = function (lv) {
    var a, b;
    if (lv === 1) { a = rnd(1, 8) * 100; b = rnd(1, 9 - a / 100) * 100; if (Math.random() < .5) { a += rnd(1, 4) * 10; b += rnd(1, 4) * 10; } }
    else if (lv === 2) { var ah = rnd(1, 7), at = rnd(0, 8), au = rnd(0, 8); a = ah * 100 + at * 10 + au; b = rnd(0, 8 - ah) * 100 + rnd(0, 9 - at) * 10 + rnd(0, 9 - au); if (b < 10) b += 11; }
    else { a = rnd(150, 700); b = rnd(100, 1000 - a); if ((a % 10) + (b % 10) < 10) b = Math.min(b + (10 - (b % 10)) - 1 + (a % 10 === 0 ? 1 : 0), 1000 - a); }
    return expr(a, PLUS, b, a + b);
  };
  G.sub1000 = function (lv) {
    var a, b;
    if (lv === 1) { a = rnd(3, 10) * 100; b = rnd(1, a / 100 - 1) * 100; if (Math.random() < .5) { a += rnd(5, 9) * 10; b += rnd(1, 4) * 10; } }
    else if (lv === 2) { var ah = rnd(2, 9), at = rnd(1, 9), au = rnd(1, 9); a = ah * 100 + at * 10 + au; b = rnd(1, ah - 1) * 100 + rnd(0, at) * 10 + rnd(0, au); }
    else { a = rnd(300, 1000); b = rnd(100, a - 50); }
    return expr(a, MINUS, b, a - b);
  };
  G.mulround = function (lv) {
    var a, b;
    if (lv === 1) { a = rnd(1, 9) * 10; b = rnd(2, Math.min(9, Math.floor(100 / (a / 10)) ) ); a = (a / 10) * 10; if (a * b > 1000) b = 2; }
    else if (lv === 2) { a = rnd(1, 4) * 100; b = rnd(2, Math.floor(1000 / a)); if (Math.random() < .5) { a = rnd(2, 9) * 10; b = rnd(2, 9); } }
    else { a = rnd(12, 99); b = rnd(2, Math.min(9, Math.floor(1000 / a))); }
    return Math.random() < .7 ? expr(a, TIMES, b, a * b) : expr(b, TIMES, a, a * b);
  };
  G.divround = function (lv) {
    var d, q;
    if (lv === 1) { d = rnd(2, 9); q = rnd(1, 9) * 10; }
    else if (lv === 2) { d = rnd(2, 5); q = rnd(1, Math.floor(10 / d)) * 100; if (Math.random() < .5) { d = rnd(2, 9); q = rnd(1, 9) * 10; } }
    else { d = rnd(2, 9); q = rnd(11, Math.floor(999 / d)); }
    return expr(d * q, DIV, d, q);
  };
  G.perimeter = function (lv) {
    if (lv === 1) { var a = rnd(2, 15); return T('Квадрат със страна ' + a + ' см. Обиколката е {?} см.', 4 * a, 'P = 4 ' + TIMES + ' ' + a + ' = ' + 4 * a + ' см', { figure: rectSVG(0, 0, a + ' см', a + ' см', true) }); }
    if (lv === 2) { var w = rnd(4, 20), h = rnd(2, w - 1); return T('Правоъгълник ' + w + ' см на ' + h + ' см. Обиколката е {?} см.', 2 * (w + h), 'P = 2 ' + TIMES + ' (' + w + ' + ' + h + ') = ' + 2 * (w + h) + ' см', { figure: rectSVG(0, 0, w + ' см', h + ' см') }); }
    var x = rnd(3, 15), y = rnd(3, 15), z = rnd(Math.abs(x - y) + 1, x + y - 1);
    return T('Триъгълник със страни ' + x + ' см, ' + y + ' см и ' + z + ' см. Обиколката е {?} см.', x + y + z, 'P = ' + x + ' + ' + y + ' + ' + z + ' = ' + (x + y + z) + ' см', { figure: triSVG(x + ' см', y + ' см', z + ' см') });
  };
  G.missing3 = function (lv) {
    if (lv < 3 || Math.random() < .6) { var f = rnd(2, 10), k = rnd(2, 10); return Math.random() < .5 ? missing(f, TIMES, k, f * k, rnd(0, 1)) : missing(f * k, DIV, f, k, rnd(0, 1)); }
    var a = rnd(100, 600), b = rnd(50, 1000 - a); return missing(a, PLUS, b, a + b, rnd(0, 1));
  };

  // ===== 4. клас =====
  G.addbig = function (lv) {
    var a, b;
    if (lv === 1) { a = rnd(1000, 8999); b = rnd(100, 999); }
    else if (lv === 2) { a = rnd(1000, 6000); b = rnd(1000, 9999 - a); }
    else { a = rnd(10000, 60000); b = rnd(10000, 99999 - a); }
    return expr(a, PLUS, b, a + b);
  };
  G.subbig = function (lv) {
    var a, b;
    if (lv === 1) { a = rnd(1500, 9999); b = rnd(100, 999); }
    else if (lv === 2) { a = rnd(3000, 9999); b = rnd(1000, a - 500); }
    else { a = rnd(20000, 99999); b = rnd(10000, a - 1000); }
    return expr(a, MINUS, b, a - b);
  };
  G.mulbig = function (lv) {
    var a, b;
    if (lv === 1) { a = rnd(101, 999); b = rnd(2, 9); }
    else if (lv === 2) { a = rnd(1001, 9999); b = rnd(2, 9); if (a * b > 99999) b = 2; }
    else { a = rnd(11, 99); b = rnd(11, 99); }
    return expr(a, TIMES, b, a * b);
  };
  G.divbig = function (lv) {
    var d, q;
    if (lv === 1) { d = rnd(2, 9); q = rnd(Math.ceil(100 / d), Math.floor(999 / d)); }
    else if (lv === 2) { d = rnd(2, 9); q = rnd(Math.ceil(1000 / d), Math.floor(9999 / d)); }
    else { d = rnd(11, 25); q = rnd(4, 40); }
    return expr(d * q, DIV, d, q);
  };
  G.order = function (lv) {
    var a, b, c, d, q, ans;
    var form = lv === 1 ? rnd(0, 1) : lv === 2 ? rnd(2, 4) : rnd(3, 6);
    switch (form) {
      case 0: a = rnd(2, 30); b = rnd(2, 9); c = rnd(2, 9); q = a + ' + ' + b + ' ' + TIMES + ' ' + c; ans = a + b * c; break;
      case 1: c = rnd(2, 9); b = c * rnd(2, 9); a = rnd(b / c + 1, 60); q = a + ' ' + MINUS + ' ' + b + ' ' + DIV + ' ' + c; ans = a - b / c; break;
      case 2: a = rnd(2, 15); b = rnd(2, 15); c = rnd(2, 9); q = '(' + a + ' + ' + b + ') ' + TIMES + ' ' + c; ans = (a + b) * c; break;
      case 3: c = rnd(2, 9); ans = rnd(2, 9); b = rnd(1, 20); a = ans * c + b; q = '(' + a + ' ' + MINUS + ' ' + b + ') ' + DIV + ' ' + c; break;
      case 4: a = rnd(2, 9); b = rnd(2, 9); c = rnd(2, 9); d = rnd(2, 9); if (a * b < c * d) { var t1 = a; a = c; c = t1; t1 = b; b = d; d = t1; } q = a + ' ' + TIMES + ' ' + b + ' ' + MINUS + ' ' + c + ' ' + TIMES + ' ' + d; ans = a * b - c * d; break;
      case 5: b = rnd(2, 9); a = b * rnd(2, 9); c = rnd(2, 9); d = rnd(1, 20); q = a + ' ' + DIV + ' ' + b + ' + ' + c + ' ' + TIMES + ' ' + d; ans = a / b + c * d; break;
      default: a = rnd(2, 9); b = rnd(2, 9); c = rnd(2, 20); d = rnd(2, 5); q = '(' + a + ' ' + TIMES + ' ' + b + ' + ' + c + ') ' + TIMES + ' ' + d; ans = (a * b + c) * d;
    }
    return T(q + ' = {?}', ans, q + ' = ' + fmt(ans));
  };

  var NAMES_F = ['Мария', 'Елена', 'Ани', 'Ива', 'Вики', 'Дара', 'Никол', 'Яна'];
  var NAMES_M = ['Иван', 'Никола', 'Георги', 'Петър', 'Мартин', 'Боби', 'Калоян', 'Сашо'];
  G.word = function (lv) {
    var f = pick(NAMES_F), m = pick(NAMES_M), a, b, c, ans, q, full;
    var easy = [
      function () { a = rnd(3, 9); b = rnd(4, 9); ans = a * b; q = 'В една кутия има ' + a + ' молива. Колко молива има в ' + b + ' такива кутии?'; full = a + ' ' + TIMES + ' ' + b + ' = ' + ans + ' молива'; },
      function () { b = rnd(3, 8); ans = rnd(4, 12); a = b * ans; q = f + ' раздели ' + a + ' бонбона поравно между ' + b + ' приятели. По колко бонбона получи всеки?'; full = a + ' ' + DIV + ' ' + b + ' = ' + ans + ' бонбона'; },
      function () { a = rnd(120, 480); b = rnd(60, 300); ans = a + b; q = 'В библиотеката има ' + a + ' приказки и ' + b + ' енциклопедии. Колко книги има общо?'; full = a + ' + ' + b + ' = ' + ans + ' книги'; },
      function () { a = rnd(300, 900); b = rnd(100, a - 50); ans = a - b; q = 'Влакът трябва да измине ' + a + ' км. Вече е изминал ' + b + ' км. Колко километра остават?'; full = a + ' ' + MINUS + ' ' + b + ' = ' + ans + ' км'; }
    ];
    var hard = [
      function () { a = rnd(30, 90); b = rnd(2, 4); c = rnd(5, 15); if (b * c >= a) a = b * c + rnd(5, 30); ans = a - b * c; q = m + ' има ' + a + ' евро. Купува ' + b + ' книжки по ' + c + ' евро. Колко евро му остават?'; full = a + ' ' + MINUS + ' ' + b + ' ' + TIMES + ' ' + c + ' = ' + ans + ' евро'; },
      function () { a = rnd(12, 40); b = rnd(5, 20); ans = a + (a + b); q = 'В първия ден ' + f + ' прочете ' + a + ' страници, а във втория – с ' + b + ' повече. Колко страници прочете за двата дни?'; full = a + ' + (' + a + ' + ' + b + ') = ' + ans + ' страници'; },
      function () { b = rnd(2, 6); a = rnd(3, 9) * b; ans = a + a / b; q = 'В градината има ' + a + ' рози, а лалетата са ' + b + ' пъти по-малко. Колко цветя има общо?'; full = a + ' + ' + a + ' ' + DIV + ' ' + b + ' = ' + ans + ' цветя'; },
      function () { a = rnd(3, 8); b = rnd(4, 9); c = rnd(2, 9); ans = a * b + c; q = 'В салона има ' + a + ' реда по ' + b + ' стола и още ' + c + ' стола до сцената. Колко са всички столове?'; full = a + ' ' + TIMES + ' ' + b + ' + ' + c + ' = ' + ans + ' стола'; },
      function () { a = rnd(2, 5); b = rnd(20, 60); c = rnd(10, 40); ans = a * (b + c); q = 'Един колоездач изминава сутрин ' + b + ' км, а следобед ' + c + ' км. Колко километра ще измине за ' + a + ' такива дни?'; full = '(' + b + ' + ' + c + ') ' + TIMES + ' ' + a + ' = ' + ans + ' км'; },
      function () { c = rnd(3, 6); ans = rnd(10, 30); b = rnd(5, 25); a = ans * c - b; if (a < 1) a = 5; ans = (a + b) / c; q = m + ' имаше ' + a + ' стикера и получи още ' + b + '. Раздели всички поравно в ' + c + ' албума. По колко стикера има във всеки албум?'; full = '(' + a + ' + ' + b + ') ' + DIV + ' ' + c + ' = ' + ans + ' стикера'; }
    ];
    (lv === 1 ? pick(easy) : lv === 2 ? pick(Math.random() < .4 ? easy : hard) : pick(hard))();
    return T(q + '<br><span class="ans-line">Отговор: {?}</span>', ans, full, { word: true });
  };
  G.area = function (lv) {
    var a, b;
    if (lv === 1) { a = rnd(3, 12); b = rnd(2, 9); return T('Лицето на правоъгълник ' + a + ' см на ' + b + ' см е {?} кв. см.', a * b, 'S = ' + a + ' ' + TIMES + ' ' + b + ' = ' + a * b + ' кв. см', { figure: rectSVG(0, 0, a + ' см', b + ' см') }); }
    if (lv === 2) {
      if (Math.random() < .5) { a = rnd(2, 12); return T('Лицето на квадрат със страна ' + a + ' см е {?} кв. см.', a * a, 'S = ' + a + ' ' + TIMES + ' ' + a + ' = ' + a * a + ' кв. см', { figure: rectSVG(0, 0, a + ' см', a + ' см', true) }); }
      a = rnd(4, 15); b = rnd(2, a - 1); return T('Обиколката на правоъгълник ' + a + ' см на ' + b + ' см е {?} см.', 2 * (a + b), 'P = 2 ' + TIMES + ' (' + a + ' + ' + b + ') = ' + 2 * (a + b) + ' см', { figure: rectSVG(0, 0, a + ' см', b + ' см') });
    }
    a = rnd(3, 12); b = rnd(2, 9);
    return T('Правоъгълник има лице ' + a * b + ' кв. см и дължина ' + a + ' см. Ширината му е {?} см.', b, a * b + ' ' + DIV + ' ' + a + ' = ' + b + ' см', { figure: rectSVG(0, 0, a + ' см', '? см') });
  };
  G.logic = function (lv) {
    var seq = [], ans, start, step, i, kind = lv === 1 ? rnd(0, 1) : lv === 2 ? rnd(0, 3) : rnd(2, 5);
    switch (kind) {
      case 0: start = rnd(1, 20); step = rnd(2, 9); for (i = 0; i < 5; i++) seq.push(start + i * step); break;
      case 1: step = rnd(2, 9); start = step * 5 + rnd(1, 30); for (i = 0; i < 5; i++) seq.push(start - i * step); break;
      case 2: start = rnd(1, 5); step = pick([2, 3]); for (i = 0; i < 5; i++) seq.push(start * Math.pow(step, i)); break;
      case 3: var p = rnd(1, 5), r = rnd(6, 10); start = rnd(1, 10); seq.push(start); for (i = 1; i < 6; i++) seq.push(seq[i - 1] + (i % 2 ? p : r)); seq = seq.slice(0, 5); break;
      case 4: start = rnd(1, 4); for (i = 0; i < 5; i++) seq.push((start + i) * (start + i)); break;
      default: seq = [1, 1]; var s0 = rnd(1, 3); seq = [s0, s0]; for (i = 2; i < 6; i++) seq.push(seq[i - 1] + seq[i - 2]); seq = seq.slice(0, 5);
    }
    var hole = lv === 1 ? 4 : rnd(2, 4);
    ans = seq[hole];
    var shown = seq.map(function (v, idx) { return idx === hole ? '{?}' : fmt(v); }).join(', ');
    return T('Кое число липсва?<br><span class="seq">' + shown + '</span>', ans, seq.map(fmt).join(', '));
  };

  // ---------- каталог на темите ----------
  var GRADES = {
    1: { name: '1. клас', color: '#FF5A5F', topics: [
      { id: 'add10', name: 'Събиране до 10', icon: '+' },
      { id: 'sub10', name: 'Изваждане до 10', icon: MINUS },
      { id: 'add20', name: 'Събиране до 20', icon: '+' },
      { id: 'sub20', name: 'Изваждане до 20', icon: MINUS },
      { id: 'compare', name: 'Сравняване (<, >, =)', icon: '<>' },
      { id: 'missing1', name: 'Скритото число', icon: '?' }
    ] },
    2: { name: '2. клас', color: '#FF9F1C', topics: [
      { id: 'add100', name: 'Събиране до 100', icon: '+' },
      { id: 'sub100', name: 'Изваждане до 100', icon: MINUS },
      { id: 'mul2', name: 'Умножение по 2, 3, 4, 5 и 10', icon: TIMES },
      { id: 'div2', name: 'Деление на 2, 3, 4, 5 и 10', icon: DIV },
      { id: 'compare100', name: 'Сравняване до 100', icon: '<>' },
      { id: 'missing2', name: 'Скритото число', icon: '?' }
    ] },
    3: { name: '3. клас', color: '#4CBB4A', topics: [
      { id: 'multable', name: 'Таблицата за умножение', icon: TIMES },
      { id: 'divtable', name: 'Таблично деление', icon: DIV },
      { id: 'add1000', name: 'Събиране до 1000', icon: '+' },
      { id: 'sub1000', name: 'Изваждане до 1000', icon: MINUS },
      { id: 'mulround', name: 'Извънтаблично умножение', icon: TIMES },
      { id: 'divround', name: 'Извънтаблично деление', icon: DIV },
      { id: 'perimeter', name: 'Обиколка на фигури', icon: '▭' },
      { id: 'missing3', name: 'Скритото число', icon: '?' }
    ] },
    4: { name: '4. клас', color: '#2F80ED', topics: [
      { id: 'addbig', name: 'Събиране на многоцифрени числа', icon: '+' },
      { id: 'subbig', name: 'Изваждане на многоцифрени числа', icon: MINUS },
      { id: 'mulbig', name: 'Умножение на многоцифрени числа', icon: TIMES },
      { id: 'divbig', name: 'Деление на многоцифрени числа', icon: DIV },
      { id: 'order', name: 'Ред на действията', icon: '( )' },
      { id: 'word', name: 'Текстови задачи', icon: '✎' },
      { id: 'area', name: 'Лице и обиколка', icon: '▭' },
      { id: 'logic', name: 'Забавна логика', icon: '★' }
    ] }
  };

  // ---------- Приключение: 12 мисии за всеки клас ----------
  var ADVENTURE = {
    1: [['add10', 1, 'Първи стъпки'], ['sub10', 1, 'Горската пътека'], ['add10', 2, 'Реката'], ['sub10', 2, 'Мостът'], ['compare', 1, 'Везните'], ['missing1', 1, 'Скритото число'],
      ['add20', 1, 'Поляната'], ['sub20', 1, 'Пещерата'], ['add20', 2, 'Водопадът'], ['sub20', 2, 'Скалите'], ['compare', 3, 'Голямата везна'], ['mix', 3, 'Върхът']],
    2: [['add100', 1, 'Десетиците'], ['sub100', 1, 'Горската пътека'], ['mul2', 1, 'Двойките'], ['div2', 1, 'Поделяне'], ['add100', 2, 'Реката'], ['sub100', 2, 'Мостът'],
      ['mul2', 2, 'Таблицата'], ['div2', 2, 'Пещерата'], ['compare100', 2, 'Везните'], ['add100', 3, 'Водопадът'], ['sub100', 3, 'Скалите'], ['mix', 3, 'Върхът']],
    3: [['multable', 1, 'Малката таблица'], ['divtable', 1, 'Поделяне'], ['add1000', 1, 'Стотиците'], ['sub1000', 1, 'Горската пътека'], ['multable', 2, 'Голямата таблица'], ['divtable', 2, 'Пещерата'],
      ['mulround', 1, 'Кръглите числа'], ['perimeter', 1, 'Квадратната поляна'], ['add1000', 3, 'Водопадът'], ['perimeter', 3, 'Триъгълната скала'], ['multable', 3, 'Майсторска таблица'], ['mix', 3, 'Върхът']],
    4: [['addbig', 1, 'Хилядите'], ['subbig', 1, 'Горската пътека'], ['mulbig', 1, 'Умножение'], ['divbig', 1, 'Поделяне'], ['order', 1, 'Редът на действията'], ['word', 1, 'Първата задача'],
      ['area', 1, 'Лицето на поляната'], ['logic', 1, 'Загадката'], ['order', 2, 'Скобите'], ['word', 2, 'Голямата задача'], ['logic', 3, 'Хитрата загадка'], ['mix', 3, 'Върхът']]
  };

  function generate(grade, topicId, level) {
    grade = +grade || 1; level = +level || 1;
    var tid = topicId;
    if (!tid || tid === 'mix' || !G[tid]) tid = pick(GRADES[grade].topics).id;
    var lvl = (topicId === 'mix' || !topicId) ? (level >= 3 ? rnd(2, 3) : level) : level;
    var t = G[tid](lvl);
    t.topic = tid; t.grade = grade; t.level = lvl;
    return t;
  }

  function check(task, input) {
    if (input === null || input === undefined || input === '') return false;
    if (task.kind === 'choice') return String(input) === String(task.answer);
    return parseInt(String(input).replace(/\s/g, ''), 10) === task.answer;
  }

  function topicName(grade, id) {
    if (id === 'mix') return 'Смесени задачи';
    var g = GRADES[grade]; if (!g) return '';
    for (var i = 0; i < g.topics.length; i++) if (g.topics[i].id === id) return g.topics[i].name;
    return '';
  }

  window.Smetko = window.Smetko || {};
  window.Smetko.MathEngine = { generate: generate, check: check, GRADES: GRADES, ADVENTURE: ADVENTURE, topicName: topicName, fmt: fmt, _G: G };
})();
