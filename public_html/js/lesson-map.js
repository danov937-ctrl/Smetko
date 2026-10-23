/* Сметко — урок → задачи. По заглавията на уроците от годишното разпределение избира умения от js/math-engine.js.
   Използва се от: tools/build_books.js (вградените учебници), админ панела (преглед) и сайта (учебници, добавени от админ панела).
   build(grade, lessons) → [[заглавие, [[умение, тегло], ...], ниво 1–3], ...] */
(function (root) {
  'use strict';
  var NUMW = { 'нула': 0, 'едно': 1, 'две': 2, 'три': 3, 'четири': 4, 'пет': 5, 'шест': 6, 'седем': 7, 'осем': 8, 'девет': 9, 'десет': 10 };
  var BND = '(?:(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}])|(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}]))'; // \b, който разбира кирилица
  var cache = {};
  function R(p, f) { var k = p + '/' + (f || ''); if (!cache[k]) cache[k] = new RegExp(p.replace(/\\b/g, BND), 'u' + (f || '')); return cache[k]; }
  var REVIEW_WORDS = 'упражнение|обобщение|обобщителен|преговор|самопроверка|знам и мога|блицтурнир|уча и играя|проект|олимпийци|светът на математиката|какво научих|завърших|какво знам|вече знам|затвърдяване|смятам';
  var DIAG_IN = 'входно ниво|ученик съм вече|нови приятели|спомени от лятото|начален преговор';
  var DIAG_MID = 'междинно ниво';
  var DIAG_END = 'изходно ниво|какво научих|завърших|годишен преговор(?!\\.)|какво знам|щастливо лято';
  var PREV = { 1: [['count5', 2], ['cmp5', 1], ['shapes', 1]], 2: [['add20x', 2], ['sub20x', 2], ['add20no', 1], ['tens100', 1]],
    3: [['add100x', 2], ['sub100x', 2], ['mulTable', 2], ['divTable', 2]], 4: [['add1000x', 2], ['sub1000x', 2], ['mul1d', 2], ['div1d', 2], ['word3', 1]] };

  function carryAdd(a, b) { var c = 0; while (a || b) { if (a % 10 + b % 10 + c >= 10) return true; a = Math.floor(a / 10); b = Math.floor(b / 10); } return false; }
  function borrowSub(a, b) { while (b) { if (a % 10 < b % 10) return true; a = Math.floor(a / 10); b = Math.floor(b / 10); } return false; }
  function all(re, s) { var out = [], m, g = new RegExp(re.source, re.flags.indexOf('g') < 0 ? re.flags + 'g' : re.flags); while ((m = g.exec(s))) { out.push(m); if (m[0] === '') g.lastIndex++; } return out; }
  function uniqSort(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }).sort(function (x, y) { return x - y; }); }

  function topicSkills(g, t, ctx) {
    var s = t.toLowerCase().replace(/ё/g, 'е'), S = [];
    function add(name, w) { S.push([name, w === undefined ? 2 : w]); }
    function has(p) { return R(p).test(s); }
    function hasK(pref) { return S.some(function (x) { return pref.some(function (p) { return x[0].indexOf(p) === 0; }); }); }
    function hasIn(list) { return S.some(function (x) { return list.indexOf(x[0]) >= 0; }); }
    var ex = all(/(\d[\d ]*)\s*([+–\-.:])\s*(\d+)/u, t).map(function (m) { return [parseInt(m[1].replace(/ /g, ''), 10), m[2], parseInt(m[3], 10)]; });

    if (g === 1) {
      var n = ctx.n || 5;
      var m = R('(?:число(?:то)?|цифра(?:та)?)\\s+(\\d+|' + Object.keys(NUMW).join('|') + ')\\b').exec(s);
      if (has('числата едно, две, три, четири и пет') || has('числата от 1 до 5')) { ctx.n = 5; add('countTo:5', 3); add('cmp5', 1); }
      else if (m && !has('10, 20') && !has('^(събиране|изваждане)')) {
        var k = /^\d+$/.test(m[1]) ? +m[1] : NUMW[m[1]];
        if (k === 0) { add('zero', 3); add('countTo:5', 1); }
        else if (k <= 10) { ctx.n = Math.max(ctx.n || 0, k, k < 3 ? 3 : k); add('countTo:' + Math.max(k, 3), 3); if (k >= 3) { add('addTo:' + k, 1); add('subTo:' + k, 1); } else add('cmp5', 1); }
      }
      var rng = /до (\d+)/u.exec(s) || /от 1 до (\d+)/u.exec(s) || /от 0 до (\d+)/u.exec(s), lim = rng ? +rng[1] : null;
      if (has('10, 20|10, 20, 30|кръгли десетици')) add('tens100', 3);
      else if (has('\\bс 0\\b|с числото 0|прибавяне на 0|равни числа|нула') && !m) add('zero', 3);
      if (has('ориентиране|групиране|подреждане|количества|местоположение|позиция')) { add('count5', 2); add('cmp5', 1); }
      if (has('килограм')) { add('kg10', 3); add('addTo:10', 1); }
      if (has('лев|стотинк|пари|монети|банкноти|именувани|магазин|пазар')) { add('coins10', 3); add('word10', 1); }
      if (has('\\bчас\\b|часовник|времето лети')) add('clockHour', 3);
      if (has('отсечка|сантиметър|измерване|чертане|дължина')) add('cm20', 3);
      if (has('триъгълник|квадрат|кръг(?!ли)|правоъгълник|фигури')) add('shapes', 2);
      var mx = R('изваждане от числото ([2-9]|10)\\b').exec(s); if (mx) add('subTo:' + mx[1], 3);
      if (has('поредно броене')) add('nextPrev10', 3);
      if (has('три (и повече )?числа')) add('threeTo:' + Math.max(5, n), 3);
      if (has('десетица|единица') && !has('преминаване')) { add('place20', 3); add('nextPrev20', 1); }
      if (has('от 11 до (15|20)|от 16 до 20|^числата до 20|едноцифрени и двуцифрени|редно значение|сбор от десетица|от 0 до 20') && !has('^(събиране|изваждане)')) { add('place20', 2); add('nextPrev20', 1); add('cmp20', 1); }
      if (has('сравняване на числата (от 11 )?до 20|сравняване на числата от 11')) add('cmp20', 3);
      if (lim && lim <= 10 && has('събиране|изваждане|смятам') && !has('10, 20')) {
        ctx.n = Math.max(ctx.n || 0, lim);
        if (has('събиране')) add('addTo:' + lim, 3);
        if (has('изваждане')) add('subTo:' + lim, 3);
        if (has('сравняване')) add('cmpExprTo:' + lim, 2);
      } else if (has('^смятам|^числата до 10|числата от 0 до 10') && !S.length) { add('addTo:10', 2); add('subTo:10', 2); add('cmp10', 1); }
      if (has('сравняване на сбор|сравняване на разлика|сбор и разлика с число|сбор със сбор|разлика с разлика')) add('cmpExprTo:' + Math.max(5, ctx.n || 5), 3);
      else if (has('сравняване') && lim && lim <= 10) { add('cmpExprTo:' + lim, 1); add(lim > 5 ? 'cmp10' : 'cmp5', 2); }
      else if (has('по-голямо, равно|сравняване на числа$|числата 1 и 2')) add('cmp5', 3);
      // заглавия-примери от „Чуден свят“: „3 < 6, 6 > 3“, „2 + 1 > 2, 2 – 1 < 2“, „8 + 1 + 1“, „Сравняване (>, <, =)“
      if (/\d\s*[+–-]\s*\d+\s*[<>]\s*\d/u.test(t)) add('cmpExprTo:' + Math.max(5, ctx.n || 5), 3);
      else if (/^\s*\d+\s*[<>]\s*\d+/u.test(t)) { var cn = Math.max.apply(null, (t.match(/\d+/g) || ['5']).map(Number)); var nums0 = (t.match(/\d+/g) || []).map(Number); add(nums0.every(function (x) { return x % 10 === 0; }) && cn >= 20 ? 'tens100' : cn > 10 ? 'cmp20' : cn > 5 ? 'cmp10' : 'cmp5', 3); }
      if (/\d\s*\+\s*\d\s*\+\s*\d/u.test(t)) add('threeTo:' + Math.max(5, ctx.n || 5), 3);
      if (has('сравняване \\(')) add('cmp5', 3);
      if (has('действие събиране|^събиране и изваждане$') && !S.length) {
        if ((ctx.n || 3) > 10) { add(ctx.x ? 'add20x' : 'add20no', 2); add(ctx.x ? 'sub20x' : 'sub20no', 2); } else { add('addTo:3', 2); add('subTo:3', 1); }
      }
      if (has('събиране на числата (0, )?1, 2')) add('addTo:5', 3);
      if (has('изваждане на числ(ото|ата) [0-5](?!\\d)')) add('subTo:5', 3);
      if (has('действие изваждане')) add('subTo:3', 3);
      if (has('разместително|вертикален запис')) add('addTo:' + Math.max(5, ctx.n || 5), 2);
      if (has('проверка на изваждането')) add((ctx.n || 5) <= 10 ? 'subTo:' + Math.max(7, ctx.n || 7) : 'sub20x', 3);
      var pats = { add10plus: '10 \\+ \\d|10 с числата|събиране на числото 10', sub10minus: '1(\\d) – (10|\\1)\\b|изваждане на числото 10',
        add20no: '1[0-7] \\+ [1-7]\\b|двуцифрено число с едноцифрено число|двуцифрено с едноцифрено', sub2d2d20: '1\\d – 1[1-9]|двуцифрено от двуцифрено|изваждане на двуцифрени числа',
        make20: 'сбор 20|от 20|20 – \\d|18 \\+ 2|16 \\+ 4' };
      Object.keys(pats).forEach(function (kk) { if (has(pats[kk]) && !has('с преминаване|по-голям')) add(kk, 3); });
      var nb = all(R('\\b1(\\d) – (\\d)\\b'), s).map(function (q) { return [+q[1], +q[2]]; });
      if (nb.length && nb.every(function (p) { return p[0] > p[1]; }) && !has('с преминаване')) add('sub20no', 3);
      if (has('сбор(?:ът)? (\\d+)') && !has('сбор 20')) {
        var vals = (s.split('сбор').slice(1).join('сбор').match(/\d+/g) || []).slice(0, 2).map(Number).filter(function (x) { return x >= 11 && x <= 18; });
        if (vals.length) add('sumN:' + vals.join(','), 3);
      }
      if (/\((\d) \+ (\d)/u.test(t) && has('преминаване') && !has('без')) {
        var sums = uniqSort(all(/(\d) \+ (\d)/u, t).map(function (q) { return +q[1] + +q[2]; }).filter(function (x) { return x > 10; }));
        if (sums.length) add('sumN:' + sums.join(','), 3);
      }
      var subs = uniqSort(all(R('(1[1-8]) – \\d\\b'), t).map(function (q) { return +q[1]; }));
      if (subs.length && has('преминаване') && !has('без')) add('subFromN:' + subs.join(','), 3);
      var mfrom = /изваждане (?:на едноцифрен\p{L}* числ\p{L}* )?от ((?:1[1-8])(?:,? (?:и )?1[1-8])*)/u.exec(s);
      if (mfrom && !has('без') && !hasK(['subFromN'])) add('subFromN:' + mfrom[1].match(/1[1-8]/g).join(','), 3);
      var mnine = /събиране на ([6-9]) с едноцифрено/u.exec(s); if (mnine) add('fillTo10:' + (10 - +mnine[1]), 3);
      // заглавия само с примери („Събиране: 9 + 2“, „9 + 3, 12 – 3“, „50 + 20, 70 – 20“): видът задачи се познава от числата
      var exA = all(/(\d+)\s*\+\s*(\d+)/u, t).map(function (q) { return [+q[1], +q[2]]; }), exS = all(/(\d+)\s*[–-]\s*(\d+)/u, t).map(function (q) { return [+q[1], +q[2]]; });
      var fills = uniqSort(exA.filter(function (p) { return p[0] < 10 && p[1] < 10 && p[0] + p[1] > 10; }).map(function (p) { return 10 - Math.max(p[0], p[1]); }));
      if (fills.length && !hasK(['fillTo10', 'sumN'])) add('fillTo10:' + fills.join(','), 3);
      var borrow = uniqSort(exS.filter(function (p) { return p[0] >= 11 && p[0] <= 18 && p[1] < 10 && p[0] % 10 < p[1]; }).map(function (p) { return p[0]; }));
      if (borrow.length && !hasK(['subFromN'])) add('subFromN:' + borrow.join(','), 3);
      if (exA.concat(exS).some(function (p) { return p[0] % 10 === 0 && p[1] % 10 === 0 && p[0] >= 20; }) && !hasIn(['tens100'])) add('tens100', 3);
      var mfill = /допълване с ([\d, и]+)/u.exec(s); if (mfill) add('fillTo10:' + mfill[1].match(/\d/g).join(','), 3);
      if (has('с преминаване|по-голям от 10|втори начин') && !hasK(['sumN', 'subFromN', 'fillTo10'])) {
        if (!has('изваждане') || has('събиране')) add('add20x', 2);
        if (has('изваждане') || !has('събиране')) add('sub20x', 2);
      }
      if (has('без преминаване|изучени случаи') && !hasIn(['add10plus', 'sub10minus', 'add20no', 'sub20no', 'sub2d2d20', 'make20'])) { add('add20no', 2); add('sub20no', 2); add('cmpExpr20', 1); }
      if (has('събираемо\\. сбор|събираемо, сбор')) add('add20no', 2);
      if (has('умаляемо|умалител')) add(ctx.x ? 'sub20x' : 'sub20no', 3);
      if (has('разликата им е едноцифрено')) add('sub20x', 3);
      if (has('едноцифрено (число )?от двуцифрено') && !has('с преминаване|разликата')) add('sub20no', 3);
      if (has('текстов|задачи$|в магазина')) add((ctx.n || 5) > 10 ? 'word20' : 'word10', 3);
      if (has('до 20') && has('събиране|изваждане') && !S.length) { add(ctx.x ? 'add20x' : 'add20no', 2); add(ctx.x ? 'sub20x' : 'sub20no', 2); }
      if (has('преминаване') && !has('без')) ctx.x = true;
      if (has('1[1-9]|20') || has('десетица')) ctx.n = Math.max(ctx.n || 5, 20);
    } else if (g === 2) {
      if (has('числата до 20') && has('10, 20')) { add('add20x', 1); add('tens100', 2); }
      else if (has('до 20 без')) { add('add20no', 2); add('sub20no', 2); }
      else if (has('до 20 с')) { add('add20x', 2); add('sub20x', 2); }
      else if (has('с числата 10, 20')) add('tens100', 3);
      if (has('от 21 до 100|числата до 100(?! без| с)')) { add('place100', 3); add('nextPrev100', 1); }
      if (has('сравняване')) add('cmp100', 3);
      if (has('дециметър|метър|сантиметър')) add('units2', 3);
      if (has('без преминаване|кръгли десетици') && !has('до 20')) { add('add100no', 3); add('sub100no', 3); }
      if (has('числов израз|сбор на три|три и повече числа')) add('three100', 3);
      if (has('разместително|съдружително') && has('събирането')) { add('three100', 2); add('add100no', 2); }
      if (has('скоби') && !has('без скоби')) add('brackets', 3);
      if (has('без скоби')) add('orderNoBr', 3);
      if (has('неизвестно събираемо')) add('unkAddend', 3);
      if (has('текстов')) add('word2steps', 3);
      if (has('обиколка')) add('perim2', 3);
      if (has('триъгълни|чертане на правоъгълник|пентамино|фигурите')) { add('triSides', 2); add('perim2', 1); }
      if (has('двуцифрени числа с едноцифрени с преминаване|събиране на двуцифрени числа с едноцифрени')) add('add2d1dX', 3);
      if (has('едноцифрени числа от двуцифрени')) add('sub2d1dX', 3);
      if (has('двуцифрени числа с едноцифрени$')) { add('add2d1dX', 2); add('sub2d1dX', 2); }
      if (has('събиране на двуцифрени числа с преминаване')) add('add100x', 3);
      if (has('изваждане на двуцифрени числа с преминаване')) add('sub100x', 3);
      if (has('с преминаване') && has('събиране и изваждане') && !has('до 20')) { add('add100x', 2); add('sub100x', 2); }
      if (has('сбор(?:а)? на три и повече числа до 100')) add('three100', 3);
      if (has('сбор 100|от 100')) add('make100', 3);
      if (has('до 100') && has('видове триъгълници')) add('add100x', 1);
      if (has('магазин|книжарницата|библиотеката')) { add('notes100', 2); add('word2steps', 2); }
      // примерите в скоби („(22 + 12)“, „(42 – 16)“) показват точно вида: с/без преминаване, с едноцифрено/двуцифрено
      if (/\(|от вида/.test(s)) {
        var kinds = [];
        all(/(\d+)\s*([+–-])\s*(\d+)/u, t).forEach(function (q) {
          var a = +q[1], op = q[2], b = +q[3]; if (a > 100 || b > 100) return;
          if (op === '+') kinds.push(a + b === 100 ? 'make100' : (a < 10 || b < 10) ? (a % 10 + b % 10 >= 10 ? 'add2d1dX' : 'add2d1dNo') : (a % 10 + b % 10 >= 10 ? 'add100x' : 'add100no'));
          else kinds.push(a === 100 ? 'make100' : b < 10 ? (a % 10 < b ? 'sub2d1dX' : 'sub2d1dNo') : (a % 10 < b % 10 ? 'sub100x' : 'sub100no'));
        });
        kinds = kinds.filter(function (k, i) { return kinds.indexOf(k) === i; });
        if (kinds.length) { S = S.filter(function (x) { return ['add2d1dX', 'sub2d1dX', 'add2d1dNo', 'sub2d1dNo', 'add100x', 'sub100x', 'add100no', 'sub100no', 'make100'].indexOf(x[0]) < 0; }); kinds.forEach(function (k) { add(k, 3); }); }
      }
      var grp = all(R('(?:умножение|деление)[^,.]*?\\b(?:с|със)\\s+(?:числ(?:ото|ата)\\s+)?((?:\\d+(?:,\\s*|\\s+и\\s+(?:с\\s+)?)?)+)'), s);
      var dl = uniqSort([].concat.apply([], grp.map(function (q) { return (q[1].match(/\d+/g) || []).map(Number); })));
      if (has('до 6$')) dl = [2, 3, 4, 5, 6];
      if (dl.length && !has('\\bс 0\\b')) { add((has('^умножение') && !has('деление') ? 'mulBy:' : has('^деление') && !has('умножение') ? 'divBy:' : 'mulDivBy:') + dl.join(','), 4); ctx.tl = uniqSort((ctx.tl || []).concat(dl)); }
      else if (has('^умножение$|^умножение и деление$') && ctx.tl && ctx.tl.length >= 2) { // упражнение след новите таблици: последните две + всичко научено
        add('mulDivBy:' + ctx.tl.slice(-2).join(','), 3); add('mulDivBy:' + ctx.tl.join(','), 2);
      }
      else if (has('^умножение$|^умножение и деление$')) { add('repAdd', 2); add('mulDivBy:2,3', 2); }
      else if (has('^деление$')) { add('mulDivBy:2', 2); add('divTable', 1); }
      if (has('разместително свойство на умножението|съдружително свойство на умножението')) add('mulTable', 3);
      if (has('пъти')) add('timesWord', 3);
      if (has('връзка между|проверка на делението')) { add('mulTable', 2); add('divTable', 2); }
      if (has('четни')) add('evenOdd', 3);
      if (has('равни числа')) add('mulEqual', 3);
      if (has('\\bс 0\\b|нулата')) add('zeroMul', 3);
      if (has('неизвестен множител')) add('unkFactor', 3);
      if (has('таблично')) { add('mulTable', 3); add('divTable', 3); }
      if (has('минута|денонощие|седмица|месец|година|\\bчас\\b')) { add('time2', 3); add('clockHM', 1); }
      if (has('действие умножение|множител\\. произведение') && !hasK(['mulDivBy', 'mulBy', 'divBy'])) { add('repAdd', 3); add('mulDivBy:2', 1); }
      if (has('действие деление|делимо\\. делител')) { add('mulDivBy:2', 2); add('divTable', 2); }
      if (has('^събиране и изваждане на числата до 100$|^числата до 100\\. събиране и изваждане$')) { add('add100x', 2); add('sub100x', 2); add('add100no', 1); }
      if (has('^геометрични фигури$')) { add('triSides', 2); add('perim2', 2); }
      if (has('мерни единици за дължина')) add('units2', 2);
      if (has('зоопарка|животните')) { add('mulTable', 2); add('timesWord', 1); }
    } else if (g === 3) {
      if (has('100, 200')) add('place1000', 3);
      if (has('от 101 до 1000|стот\\.|сбор на стотици|редицата|числата до 1000(?! с| без)') && !has('събиране|изваждане|умножение|деление')) { add('place1000', 3); add('nextPrev1000', 2); }
      if (has('сравняване')) add('cmp1000', 3);
      if (has('\\bправа\\b|\\bкрива\\b|\\bлъч|\\bлини')) add('lines', 3);
      if (has('километър|милиметър|за време и (за )?дължина|мерни единици$')) add('units3a', 3);
      if (has('\\bграм|\\bтон\\b|секунда')) add('units3b', 3);
      if (has('\\bвек\\b|миналото|имало едно време')) add('century', 3);
      if (has('неизвестно умаляемо')) add('unkMinuend', 3);
      if (has('неизвестно делимо')) add('unkDividend', 3);
      if (has('неизвестно число')) { add('unkMinuend', 2); add('unkDividend', 2); }
      if (has('триъгълници според ъглите')) add('triAngles', 3);
      else if (has('\\bъгъл|\\bъгли')) add('angles', 3);
      if (has('геометрични(те)? фигури|именуване на геометрични')) { add('angles', 2); add('lines', 1); add('triAngles', 1); }
      if (has('чертане на триъгълник')) add('triAngles', 2);
      if (has('до 100\\b') && has('без преминаване')) { add('add100no', 2); add('sub100no', 2); }
      else if (has('до 100\\b') && has('с преминаване')) { add('add100x', 2); add('sub100x', 2); }
      else if (has('без преминаване|кръгли стотици|с цифра на единиците 0') && !has('умножение|деление')) {
        if (has('събиране') || !has('изваждане')) add('add1000no', 3);
        if (has('изваждане') || !has('събиране')) add('sub1000no', 3);
      } else if (has('преминаване') && !has('умножение|деление')) {
        if (has('събиране') || !has('изваждане')) add('add1000x', 3);
        if (has('изваждане') || !has('събиране')) add('sub1000x', 3);
      }
      if (has('сбор 1000|от 1000')) add('make1000', 3);
      ex.forEach(function (e) {
        var a = e[0], op = e[1], b = e[2];
        if (op === '+' && b < 1000) add(carryAdd(a, b) ? 'add1000x' : 'add1000no', 3);
        else if ((op === '–' || op === '-') && b < 1000) add(a === 1000 ? 'make1000' : (borrowSub(a, b) ? 'sub1000x' : 'sub1000no'), 3);
        else if (op === '.') add('mul1d', 3);
        else if (op === ':') add(a === 324 ? 'div0q' : 'div1d', 3);
      });
      if (has('косвена')) add('wordIndirect', 3);
      else if (has('текстов')) add(ctx.mul ? 'word3' : 'wordAddSub1000', 3);
      if (has('таблично')) { add('mulTable', 3); add('divTable', 3); }
      if (has('остатък')) add('divRem', 3);
      if (has('разпределително свойство на делението|деление на сбор')) add('divSum', 3);
      else if (has('умножение на сбор|разпределително')) add('distrib', 3);
      else if (has('умножение') && has('до 100\\b')) { add('mulTable', 3); add('divTable', 3); }
      else if (has('умножение') && !has('таблично')) { add('mul1d', 3); ctx.mul = true; }
      if (has('деление на сбор|разпределително свойство на делението|остатък')) { /* вече е добавено */ }
      else if (has('получава 0|0 в реда')) add('div0q', 3);
      else if (has('деление') && has('до 100\\b')) { /* таблично – добавено горе */ }
      else if (has('деление') && !has('таблично')) { add('div1d', 3); ctx.mul = true; }
      [[2, 'половинка'], [3, 'третинка'], [4, 'четвъртинка'], [10, 'десетинка']].forEach(function (p) { if (has(p[1])) add('partsN:' + p[0], 3); });
      if (has('устно смятане')) { add('mul1d', 2); add('div1d', 2); add('add1000no', 1); }
      if (has('^събиране и изваждане( на числата до 1000)?$') && !S.length) { add(ctx.x ? 'add1000x' : 'add1000no', 2); add(ctx.x ? 'sub1000x' : 'sub1000no', 2); }
      if (has('преминаване') || ex.some(function (e) { return e[1] === '+' ? carryAdd(e[0], e[2]) : (e[1] === '–' || e[1] === '-') && borrowSub(e[0], e[2]); })) ctx.x = true;
    } else if (g === 4) {
      if (has('до 1000\\. преговор') && has('събиране')) { add('add1000x', 2); add('sub1000x', 2); }
      // начален преговор (Просвета, Просвета Плюс): числата, действията и фигурите до 1000
      if (has('числата до 1000') && !has('събиране|изваждане|умножение|деление')) { add('place1000', 3); add('cmp1000', 2); }
      if (has('до 1000') && has('събиране|изваждане') && !has('умножение|деление')) { add('add1000x', 3); add('sub1000x', 3); }
      if (has('до 1000') && has('умножение|деление') && !has('с едноцифрено|двуцифрено')) { add('mul1d', 3); add('div1d', 3); }
      if (has('^геометрични фигури')) { add('angles', 2); add('triAngles', 2); add('area', 1); }
      if (has('мерни единици за дължина')) { add('units3a', 3); add('units3b', 2); }
      if (has('неизвестно събираемо|неизвестно умаляемо')) add('unkMinuend', 3);
      if (has('неизвестен множител|неизвестно делимо')) add('unkDividend', 3);
      if (has('окръжност|радиус|диаметър')) add('circle', 3);
      if (has('\\bъгли\\b')) add('degrees', 3);
      if (has('декар')) { add('areaUnits', 3); add('wordArea', 1); }
      if (has('свойства на умножението|умножение на (сбор|разлика)')) { add('mulBig1d', 2); add('distrib', 2); }
      if (has('свойства на делението|деление на (сбор|разлика)')) { add('divBig1d', 2); add('divSum', 2); }
      if (has('неизвестни числа')) { add('unkSubtrahend', 2); add('unkDivisor', 2); add('unkFactor', 1); }
      if (has('остатък')) add('divRem', 3);
      if (has('преминаване') && !has('без') && !has('умножение|деление') && !has('(едно|две|повече от две) преминава')) {
        if (has('събиране') || !has('изваждане')) add('addBigX', 3);
        if (has('изваждане') || !has('събиране')) add('subBigX', 3);
      }
      if (has('събиране и изваждане на естествени|^събиране и изваждане$')) { add('addBigX', 2); add('subBigX', 2); }
      if (has('1001|10 000|100 000|\\d 000|милион|естествени|клас, ред|бройна система|редове|числата над 1000') && !has('събиране|изваждане|умножение|деление')) { add('placeBig', 3); add('nextPrevBig', 1); }
      if (has('сравняване')) add('cmpBig', 3);
      if (has('римски')) { add('romanRead', 3); add('romanWrite', 2); }
      if (has('без преминаване') && !has('умножение|деление')) { if (has('събиране') || !has('изваждане')) add('addBigNo', 3); if (has('изваждане') || !has('събиране')) add('subBigNo', 3); }
      if (has('от вида') && !has('умножение|деление')) all(/(\d[\d ]*\d|\d)\s*([+–-])\s*(\d[\d ]*\d|\d)/u, t).forEach(function (q) { // „3000 + 2000; 5000 – 2000“
        var a = +q[1].replace(/ /g, ''), b = +q[3].replace(/ /g, ''); if (a < 1000 && b < 1000) return;
        if (q[2] === '+') add(carryAdd(a, b) ? 'addBigX' : 'addBigNo', 3); else add(borrowSub(a, b) ? 'subBigX' : 'subBigNo', 3);
      });
      if (has('(едно|две|повече от две) преминава') && !has('умножение|деление')) {
        if (has('събиране') || !has('изваждане')) add('addBigX', 3);
        if (has('изваждане') || !has('събиране')) add('subBigX', 3);
      }
      if (has('кръгли хиляди')) add('makeThousand', 3);
      if (has('^събиране и изваждане на многоцифрени числа$')) { add('addBigX', 2); add('subBigX', 2); }
      if (has('неизвестен умалител')) add('unkSubtrahend', 3);
      if (has('неизвестен делител')) add('unkDivisor', 3);
      if (has('неизвестно число')) { add('unkSubtrahend', 2); add('unkDivisor', 1); }
      if (has('градус|транспортир|\\bъгъл')) add('degrees', 3);
      if (has('тела|куб|паралелепипед|пирамида|конус|цилиндър|кълбо')) { add('solidsName', 3); add('solidsCount', 2); }
      if (has('страна на правоъгълник')) add('sideFromArea', 3);
      else if (has('лице')) { add('area', 3); add('areaUnits', 2); add('wordArea', 1); }
      if (has('мерни единици$')) { add('areaUnits', 2); add('units3a', 1); add('units3b', 1); }
      var mulw = has('умножение'), divw = has('деление');
      if (has('10, 100, 1000|20, 30')) { if (mulw) add('mulRound10', 3); if (divw) add('divRound10', 3); }
      else if (has('двуцифрено')) { if (mulw) add('mul2d', 3); if (divw) add('div2d', 3); }
      else if (has('едноцифрено') || has('^деление') || has('^умножение')) { var d2 = ctx.d2 && !has('едноцифрено'); if (mulw) add(d2 ? 'mul2d' : 'mulBig1d', 3); if (divw) add(d2 ? 'div2d' : 'divBig1d', 3); }
      if (has('двуцифрено') && (mulw || divw)) ctx.d2 = true;
      if (has('до 1000\\. преговор|до 1000 с едноцифрено')) {
        S = S.filter(function (x) { return x[0] !== 'mulBig1d' && x[0] !== 'divBig1d'; });
        if (mulw) add('mul1d', 3); if (divw) add('div1d', 3);
      }
      if (has('калкулатор')) { add('calcWord', 3); add('mul2d', 1); }
      if (has('текстов|проблемна ситуация|оферти|резултатите от решена')) { add('wordBig', 3); add('calcWord', 1); }
      if (has('неизвестно число|намиране на неизвестно')) add('unkSubtrahend', 1);
    }
    var out = {}, order = [];
    S.forEach(function (x) { if (!(x[0] in out)) order.push(x[0]); out[x[0]] = Math.max(out[x[0]] || 0, x[1]); });
    return order.map(function (k) { return [k, out[k]]; });
  }

  function levelOf(t, same) {
    var s = t.toLowerCase();
    if (/обобщение|обобщителен|самопроверка|преговор|знам и мога|блицтурнир|ниво|какво научих|завърших|какво знам|вече знам|олимпийци|диагностика/u.test(s)) return 3;
    if (/упражнение|затвърдяване|уча и играя|проект/u.test(s) || same) return 2;
    return 1;
  }
  var BARE = /^(упражнение|обобщение)( (№ )?\d+)?$/iu;
  function display(t, last) {
    var s = t.trim();
    if (/^[\d\s+–\-.:,=]+$/u.test(s)) {
      var ops = s.replace(/, /g, ' ').match(/[+–\-.:]/g) || [], has = function (o) { return ops.indexOf(o) >= 0; };
      var name = (has('+') && (has('–') || has('-'))) ? 'Събиране и изваждане' : has('+') ? 'Събиране' : (has('–') || has('-')) ? 'Изваждане' : has('.') ? 'Умножение' : 'Деление';
      return name + ': ' + s.replace(/ \. /g, ' × ');
    }
    if (BARE.test(s) && last) return last.split(/[.(]/)[0].trim() + ' · ' + s;
    return s.replace(/ \. /g, ' × ');
  }
  var ROM = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

  function build(grade, lessons) {
    grade = +grade;
    var ctx = { n: grade === 1 ? 3 : 0 }, history = [], allsk = [], missions = [], last = '', prev = null, rep = 0;
    lessons.forEach(function (t, i) {
      t = String(t).trim(); if (!t) return;
      var low = t.toLowerCase(), same = t === prev;
      rep = same ? rep + 1 : 0; prev = t;
      var sk = topicSkills(grade, t.replace(/^годишен преговор[:.]?\s*/iu, ''), ctx), lvl = levelOf(t, same), kind = 'new';
      if (R(DIAG_IN).test(low) && i < 8) { if (!sk.length) sk = PREV[grade].map(function (x) { return x.slice(); }); lvl = 2; kind = 'diag'; }
      else if (R(DIAG_MID).test(low) || (R(DIAG_END).test(low) && !sk.length)) {
        var easy = /^(countTo|count5|cmp5|shapes|zero|nextPrev10)/, cand = allsk.map(function (x) { return x[0]; }).filter(function (k) { return !easy.test(k); });
        if (!cand.length) cand = allsk.map(function (x) { return x[0]; });
        var seen = {}, pick = [], n6 = Math.max(1, Math.floor(cand.length / 6));
        for (var c = 0; c < cand.length; c += n6) {
          var chunk = cand.slice(c, c + n6), cnt = {}, best = null;
          chunk.forEach(function (k) { cnt[k] = (cnt[k] || 0) + 1; if (best === null || cnt[k] > cnt[best]) best = k; });
          if (best && !seen[best]) { seen[best] = 1; pick.push([best, 2]); }
        }
        sk = pick.length ? pick : PREV[grade].map(function (x) { return x.slice(); }); lvl = 3; kind = 'diag';
      } else if (!sk.length) {
        var win = [], seen2 = {};
        for (var h = history.length - 1; h >= 0 && win.length < 5; h--) history[h].forEach(function (x) { if (!seen2[x[0]]) { seen2[x[0]] = 1; win.push([x[0], 2]); } });
        sk = win.length ? win : PREV[grade].map(function (x) { return x.slice(); }); lvl = Math.max(lvl, 2); kind = 'review';
      }
      if (kind === 'new') {
        history.push(sk); if (!BARE.test(t)) last = t;
        sk.forEach(function (x) { allsk.push(x); });
        if (R(REVIEW_WORDS).test(low)) lvl = Math.max(lvl, 2);
      }
      if (same) lvl = Math.min(3, levelOf(t, false) + rep);
      var title = display(t, last); if (same) title += ' · ' + ROM[Math.min(rep, 7)];
      missions.push([title, sk, lvl]);
    });
    return missions;
  }

  var SKILL_TITLES = { count5: 'броене до 5', countTo: 'броене', addTo: 'събиране', subTo: 'изваждане', cmpExprTo: 'сравняване на изрази', zero: 'нулата', threeTo: 'три числа', cmp5: 'сравняване до 5', cmp10: 'сравняване до 10', shapes: 'фигури',
    coins10: 'пари', kg10: 'килограм', word10: 'текстови задачи до 10', word20: 'текстови задачи до 20', place20: 'числата до 20', nextPrev20: 'преди/след до 20', nextPrev10: 'поредно броене', cmp20: 'сравняване до 20', cm20: 'сантиметър',
    add10plus: '10 + 4', sub10minus: '14 – 4, 14 – 10', add20no: 'до 20 без преминаване (+)', sub20no: 'до 20 без преминаване (–)', sub2d2d20: '17 – 14', make20: 'до 20 (18 + 2, 20 – 2)', cmpExpr20: 'сравняване до 20',
    sumN: 'събиране с преминаване', subFromN: 'изваждане с преминаване', fillTo10: 'допълване до 10', add20x: 'събиране с преминаване', sub20x: 'изваждане с преминаване', clockHour: 'час', tens100: 'кръгли десетици',
    place100: 'числата до 100', cmp100: 'сравняване до 100', nextPrev100: 'преди/след до 100', units2: 'см, дм, м', add100no: 'до 100 без преминаване (+)', sub100no: 'до 100 без преминаване (–)', three100: 'сбор на три числа', brackets: 'скоби',
    orderNoBr: 'ред на действията', unkAddend: 'неизвестно събираемо', word2steps: 'задачи с две пресмятания', perim2: 'обиколка', triSides: 'видове триъгълници', add2d1dX: '47 + 5', sub2d1dX: '52 – 7', add100x: 'до 100 с преминаване (+)',
    sub100x: 'до 100 с преминаване (–)', make100: 'до 100', notes100: 'банкноти', mulDivBy: 'таблично умножение и деление', mulBy: 'умножение', divBy: 'деление', divRem: 'деление с остатък', circle: 'окръжност', add2d1dNo: '22 + 5', sub2d1dNo: '27 – 4', repAdd: 'умножение като събиране', mulTable: 'таблица за умножение', divTable: 'таблично деление', timesWord: 'пъти повече/по-малко',
    evenOdd: 'четни/нечетни', mulEqual: 'равни числа', zeroMul: 'с нула', unkFactor: 'неизвестен множител', time2: 'мерки за време', clockHM: 'часовник', place1000: 'числата до 1000', nextPrev1000: 'преди/след до 1000', cmp1000: 'сравняване до 1000',
    lines: 'линии и лъч', units3a: 'мм, см, км', units3b: 'грам, тон, секунда', century: 'век', unkMinuend: 'неизвестно умаляемо', unkDividend: 'неизвестно делимо', triAngles: 'триъгълници по ъгли', angles: 'ъгли',
    add1000no: 'до 1000 без преминаване (+)', sub1000no: 'до 1000 без преминаване (–)', add1000x: 'до 1000 с преминаване (+)', sub1000x: 'до 1000 с преминаване (–)', make1000: 'до 1000', wordIndirect: 'задачи в косвена форма',
    wordAddSub1000: 'текстови задачи', word3: 'текстови задачи', distrib: 'умножение на сбор', mul1d: 'умножение с едноцифрено', divSum: 'деление на сбор', div0q: 'деление с 0 в частното', div1d: 'деление с едноцифрено', partsN: 'половинка, третинка, четвъртинка',
    placeBig: 'многоцифрени числа', nextPrevBig: 'преди/след', cmpBig: 'сравняване', romanRead: 'римски цифри', romanWrite: 'римски цифри (писане)', addBigNo: 'събиране без преминаване', subBigNo: 'изваждане без преминаване',
    addBigX: 'събиране с преминаване', subBigX: 'изваждане с преминаване', makeThousand: 'до кръгли хиляди', unkSubtrahend: 'неизвестен умалител', unkDivisor: 'неизвестен делител', degrees: 'градуси', solidsName: 'геометрични тела',
    solidsCount: 'стени, ръбове, върхове', sideFromArea: 'страна по лице', area: 'лице', areaUnits: 'мерки за лице', wordArea: 'задачи за лице', mulRound10: 'умножение с 10, 20…', divRound10: 'деление с 10, 20…', mul2d: 'умножение с двуцифрено',
    div2d: 'деление с двуцифрено', mulBig1d: 'умножение с едноцифрено', divBig1d: 'деление с едноцифрено', calcWord: 'задачи с умножение', wordBig: 'текстови задачи', count: 'броене' };
  function skillTitle(spec) { var i = spec.indexOf(':'), n = i < 0 ? spec : spec.slice(0, i), a = i < 0 ? '' : spec.slice(i + 1); return (SKILL_TITLES[n] || n) + (a ? (n === 'mulDivBy' || n === 'mulBy' || n === 'divBy' ? ' с ' : n === 'subFromN' ? ' от ' : n === 'sumN' ? ' със сбор ' : ' ') + a.replace(/,/g, ', ') : ''); }

  var api = { build: build, skillTitle: skillTitle, topicSkills: topicSkills };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Smetko = root.Smetko || {}; root.Smetko.LessonMap = api;
})(typeof window !== 'undefined' ? window : globalThis);
