/* Сметко — коледен календар: 24 врратички, по една задача на ден.
   Задачата за даден ден и клас е една и съща за всички и не се сменя при презареждане –
   генераторът се върти с фиксиран зародиш, за да може цял клас да реши едно и също.
   Отворените дни се помнят само в браузъра на детето. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var box = document.getElementById('advent');
  if (!box) return;

  var KEY = 'smetko.advent', DAYS = 24;
  var MSG = ['Браво!', 'Точно така!', 'Супер!', 'Умник!', 'Познато!', 'Отлично!', 'Разбра го!'];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function today() { var d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; }

  /* отключено ли е: през декември – до днешния ден; извън декември – всичко */
  function openDay(n) { var t = today(); return t.m !== 12 ? true : n <= t.d; }

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } }
  function year() { var t = today(); return t.m === 12 ? t.y : t.y - (t.m < 6 ? 1 : 0); }

  /* прост генератор с зародиш (mulberry32) – същият ден дава същата задача */
  function seeded(n) {
    var a = n >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* задачата за ден N и клас G: вика генератора с подменен Math.random и го връща обратно */
  function taskFor(n, g) {
    var E = S.MathEngine; if (!E) return null;
    var orig = Math.random, out = null;
    Math.random = seeded(n * 7919 + g * 104729 + year());
    try { out = E.generate(g, null, n <= 8 ? 1 : n <= 17 ? 2 : 3); } catch (e) { out = null; }
    Math.random = orig;
    return out;
  }

  function grade() {
    var g = +(box.getAttribute('data-grade') || 0);
    if (!g) { try { g = +localStorage.getItem('smetko.grade') || 2; } catch (e) { g = 2; } }
    return Math.min(4, Math.max(1, g));
  }

  function render() {
    var g = grade(), st = load(), done = 0, t = today(), html = '';
    for (var n = 1; n <= DAYS; n++) {
      var k = g + '-' + n, solved = !!st[k], can = openDay(n);
      if (solved) done++;
      var cls = 'ac-day' + (solved ? ' solved' : '') + (can ? '' : ' locked') + (can && t.m === 12 && t.d === n ? ' today' : '');
      html += '<button type="button" class="' + cls + '" data-day="' + n + '"' + (can ? '' : ' disabled aria-disabled="true"') +
        ' aria-label="' + (can ? 'Ден ' + n : 'Ден ' + n + ' – отваря се на ' + n + ' декември') + '">' +
        '<span class="ac-num">' + n + '</span>' + (solved ? '<span class="ac-tick" aria-hidden="true">★</span>' : '') + '</button>';
    }
    var all = done === DAYS ? '<div class="ac-all">🎉 <b>Целият календар е решен!</b> Двайсет и четири задачи за двайсет и четири дни – това е сериозна работа. ' +
      '<a href="gramota.html">Направи си грамота</a> или продължи с <a href="game.html">мисиите</a>.</div>' : '';
    box.innerHTML = '<div class="ac-grid">' + html + '</div>' +
      '<p class="ac-count" aria-live="polite">Решени: <b>' + done + '</b> от 24</p>' + all +
      '<div class="ac-panel" hidden></div>';
    var sel = document.getElementById('ac-grade');
    if (sel) sel.value = String(g);
  }

  function openTask(n) {
    var g = grade(), t = taskFor(n, g), p = box.querySelector('.ac-panel');
    if (!t || !p) return;
    var st = load(), solved = !!st[g + '-' + n];
    p.hidden = false;
    p.innerHTML = '<div class="ac-head"><b>' + n + ' декември</b><button type="button" class="ac-close" aria-label="Затвори">×</button></div>' +
      '<p class="ac-q">' + String(t.q).replace('{?}', '<span class="ac-blank">?</span>') + '</p>' +
      (t.figure ? '<div class="ac-fig">' + t.figure + '</div>' : '') +
      (solved ? '<p class="ac-ok">Готово! Отговорът е <b>' + esc(String(t.full || t.answer)) + '</b></p>'
        : '<div class="ac-row"><input class="ac-in" inputmode="numeric" autocomplete="off" aria-label="Отговор" maxlength="9">' +
          '<button type="button" class="btn btn-green ac-check">Провери</button></div><p class="ac-fb" aria-live="polite"></p>');
    p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    var inp = p.querySelector('.ac-in');
    if (inp) inp.focus();
    p.setAttribute('data-day', String(n));
  }

  function answer() {
    var p = box.querySelector('.ac-panel'), n = +p.getAttribute('data-day'), g = grade();
    var t = taskFor(n, g), inp = p.querySelector('.ac-in'), fb = p.querySelector('.ac-fb');
    if (!t || !inp) return;
    if (S.MathEngine.check(t, inp.value)) {
      var st = load(); st[g + '-' + n] = 1; save(st);
      fb.className = 'ac-fb good';
      fb.textContent = MSG[n % MSG.length] + ' ' + (String(t.full || t.answer));
      if (S.Owl && S.Owl.say) S.Owl.say(MSG[n % MSG.length]);
      setTimeout(function () { render(); openTask(n); }, 900);
    } else {
      fb.className = 'ac-fb bad';
      fb.textContent = 'Не е това. Опитай пак.';
      inp.select();
    }
  }

  box.addEventListener('click', function (e) {
    var d = e.target.closest('.ac-day');
    if (d && !d.disabled) return openTask(+d.getAttribute('data-day'));
    if (e.target.closest('.ac-close')) { box.querySelector('.ac-panel').hidden = true; return; }
    if (e.target.closest('.ac-check')) return answer();
  });
  box.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.classList.contains('ac-in')) { e.preventDefault(); answer(); }
  });

  var sel = document.getElementById('ac-grade');
  if (sel) sel.addEventListener('change', function () {
    box.setAttribute('data-grade', sel.value);
    try { localStorage.setItem('smetko.grade', sel.value); } catch (e) { }
    render();
  });

  /* листът за печат: всичките 24 задачи за избрания клас, с отговорите най-долу */
  var pr = document.getElementById('ac-print');
  if (pr) pr.addEventListener('click', function () {
    var g = grade(), sheet = document.getElementById('ac-sheet');
    var li = '', key = '';
    for (var n = 1; n <= DAYS; n++) {
      var t = taskFor(n, g);
      li += '<li><b>' + n + '.</b> ' + String(t.q).replace('{?}', '<span class="ws-blank"></span>') +
        (t.figure ? '<span class="ws-fig">' + t.figure + '</span>' : '') + '</li>';
      key += '<li>' + esc(String(t.full || t.answer)) + '</li>';
    }
    sheet.innerHTML = '<div class="ws-page"><div class="ws-title"><b>Коледен календар със задачи · ' + g + '. клас</b>' +
      '<span>Име: ............................................</span></div><ol class="ac-sheet-list">' + li + '</ol>' +
      '<div class="ws-note">Изрежете задачите и ги сложете в 24 пликчета – по едно за всеки ден до Коледа.</div></div>' +
      '<div class="ws-page"><div class="ws-title"><b>Отговори</b></div><ol class="ws-keylist">' + key + '</ol></div>';
    sheet.hidden = false;
    window.print();
  });

  S.Advent = { taskFor: taskFor, grade: grade };   // за проверките
  render();
})();
