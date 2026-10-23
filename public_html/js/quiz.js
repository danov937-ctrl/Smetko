/* Сметко — онлайн тест на страница (теми, таблица за умножение, римски цифри, НВО, входно ниво).
   <div class="qz" data-grade="2" data-topic="g2t4" data-n="10" data-level="2"
        data-skills="mulTable,divTable"   (по избор – конкретни умения вместо тема)
        data-gen="mul"                    (по избор – таблица за умножение с избор на число)
        data-mc="16"                      (по избор – първите N задачи с избор от 4 отговора)
        data-mix="1,2"                    (по избор – смесено от няколко класа, напр. входно ниво)
        data-timer="60"                   (по избор – минути)
        data-title="..."></div>
   Задачите идват от js/math-engine.js – всеки път са нови. Не се броят към дневния лимит на безплатния план. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  function E() { return S.MathEngine; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmt(n) { return E().fmt ? E().fmt(n) : String(n); }

  // таблица за умножение с избрани числа
  function mulTask(nums, kind) {
    var a = nums[rnd(0, nums.length - 1)], b = rnd(1, 10), p = a * b, k = kind === 'both' ? (Math.random() < .6 ? 'mul' : 'div') : kind;
    if (k === 'div') return { q: p + ' : ' + a + ' = {?}', answer: b, kind: 'number', full: p + ' : ' + a + ' = ' + b };
    return Math.random() < .5 ? { q: a + ' · ' + b + ' = {?}', answer: p, kind: 'number', full: a + ' · ' + b + ' = ' + p }
      : { q: b + ' · ' + a + ' = {?}', answer: p, kind: 'number', full: b + ' · ' + a + ' = ' + p };
  }
  // 4 възможни отговора за задача с число
  function toMC(t) {
    var a = +t.answer, set = {}, opts = [a];
    set[a] = 1;
    var cand = [a + 1, a - 1, a + 10, a - 10, a + 2, a - 2, a * 2, Math.round(a / 2), a + 100, a - 100, +String(a).split('').reverse().join('')];
    cand = shuffle(cand);
    for (var i = 0; i < cand.length && opts.length < 4; i++) { var c = cand[i]; if (c >= 0 && !set[c] && isFinite(c)) { set[c] = 1; opts.push(c); } }
    while (opts.length < 4) { var x = a + rnd(3, 20); if (!set[x]) { set[x] = 1; opts.push(x); } }
    opts = shuffle(opts);
    return { q: t.q, answer: String.fromCharCode(1072 + opts.indexOf(a)), kind: 'choice', full: t.full, figure: t.figure,
      choices: opts.map(function (o, i) { return { v: String.fromCharCode(1072 + i), html: String.fromCharCode(1072 + i) + ') ' + fmt(o) }; }), mc: true };
  }

  function build(el) {
    var d = el.dataset, n = +d.n || 10, lv = +d.level || 2, grade = +d.grade || 1, seen = {}, list = [], guard = 0;
    var skills = d.skills ? d.skills.split(',') : null, mix = d.mix ? d.mix.split(',').map(Number) : null;
    var nums = el._nums || [2, 3, 4, 5, 6, 7, 8, 9, 10];
    while (list.length < n && guard++ < n * 80) {
      var t;
      if (d.gen === 'mul') t = mulTask(nums, el._kind || 'mul');
      else if (skills) t = E().generateSkill(grade, skills[rnd(0, skills.length - 1)], lv);
      else if (mix) { var g = mix[rnd(0, mix.length - 1)]; t = E().generate(g, 'mix', g === grade ? Math.min(lv, 2) : lv); }
      else t = E().generate(grade, d.topic || 'mix', lv);
      if (!t || t.dots || seen[t.q]) continue;
      if (t.kind === 'choice' && t.choices && typeof t.choices[0] === 'object' && !t.choices[0].html) continue;
      seen[t.q] = 1; list.push(t);
    }
    var mc = +d.mc || 0;
    if (mc) list = list.map(function (t, i) { return i < mc && t.kind === 'number' ? toMC(t) : t; });
    return list;
  }

  function qHTML(t, i) {
    var inp;
    if (t.kind === 'choice') {
      var ch = t.choices.map(function (c) { var v = typeof c === 'object' ? c.v : c, h = typeof c === 'object' ? c.html : esc(c); return '<button type="button" class="qz-ch" data-v="' + esc(v) + '">' + h + '</button>'; }).join('');
      inp = t.mc ? '<span class="qz-blank">?</span>' : '<span class="qz-blank">?</span>';
      return '<li class="qz-q" data-i="' + i + '"><div class="qz-text">' + t.q.replace('{?}', inp) + '</div>' + (t.figure ? '<div class="qz-fig">' + t.figure + '</div>' : '') + '<div class="qz-chs' + (t.mc ? ' mc' : '') + '">' + ch + '</div><div class="qz-fb" aria-live="polite"></div></li>';
    }
    inp = '<input class="qz-in" inputmode="numeric" autocomplete="off" aria-label="Отговор на задача ' + (i + 1) + '" maxlength="9">';
    var q = t.q.indexOf('{?}') >= 0 ? t.q.replace('{?}', inp) : t.q + ' ' + inp;
    return '<li class="qz-q" data-i="' + i + '"><div class="qz-text">' + q + '</div>' + (t.figure ? '<div class="qz-fig">' + t.figure + '</div>' : '') + '<div class="qz-fb" aria-live="polite"></div></li>';
  }

  function play(el) {
    var d = el.dataset, tasks = build(el), done = false, timer = null, left = (+d.timer || 0) * 60;
    var cta = d.cta || ('game.html?grade=' + (d.grade || 1) + (d.topic && d.topic !== 'mix' ? '&mode=practice&topic=' + d.topic : '&mode=adventure'));
    var picks = '';
    if (d.gen === 'mul') {
      var nums = el._nums || [2, 3, 4, 5, 6, 7, 8, 9, 10];
      picks = '<div class="qz-picks" role="group" aria-label="Кои числа"><span>Числа:</span>' + [2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (k) { return '<button type="button" class="qz-pick' + (nums.indexOf(k) >= 0 ? ' on' : '') + '" data-k="' + k + '" aria-pressed="' + (nums.indexOf(k) >= 0) + '">' + k + '</button>'; }).join('') +
        '<select class="qz-kind select" aria-label="Вид задачи"><option value="mul">Умножение</option><option value="div">Деление</option><option value="both">Умножение и деление</option></select></div>';
    }
    if (d.levels) picks = '<div class="qz-picks" role="group" aria-label="Трудност"><span>Трудност:</span>' + [[1, 'Лесно'], [2, 'Средно'], [3, 'Трудно']].map(function (x) { return '<button type="button" class="qz-lv' + (+d.level === x[0] ? ' on' : '') + '" data-lv="' + x[0] + '" aria-pressed="' + (+d.level === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    el.innerHTML = '<div class="qz-head"><b>' + esc(d.title || 'Онлайн тест') + '</b><span class="qz-meta">' + tasks.length + ' задачи' + (left ? ' · <span class="qz-time">' + (+d.timer) + ':00</span>' : '') + '</span></div>' + picks +
      '<ol class="qz-list">' + tasks.map(qHTML).join('') + '</ol>' +
      '<div class="qz-foot"><button type="button" class="btn btn-green qz-check">✔ Провери</button><button type="button" class="btn btn-ghost qz-new">🔄 Нов тест</button><span class="qz-score" aria-live="polite"></span></div>' +
      '<div class="qz-done" hidden></div>';
    if (d.gen === 'mul') {
      el.querySelectorAll('.qz-pick').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = +b.dataset.k, cur = (el._nums || [2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(), i = cur.indexOf(k);
          if (i >= 0) { if (cur.length > 1) cur.splice(i, 1); } else cur.push(k);
          el._nums = cur.sort(function (a, b) { return a - b; }); play(el);
        });
      });
      var sel = el.querySelector('.qz-kind'); sel.value = el._kind || 'mul';
      sel.addEventListener('change', function () { el._kind = sel.value; play(el); });
    }
    el.querySelectorAll('.qz-lv').forEach(function (b) { b.addEventListener('click', function () { if (timer) clearInterval(timer); d.level = b.dataset.lv; play(el); }); });
    el.querySelectorAll('.qz-q').forEach(function (li) {
      li.querySelectorAll('.qz-ch').forEach(function (b) {
        b.addEventListener('click', function () { if (done) return; li.querySelectorAll('.qz-ch').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); li.dataset.v = b.dataset.v; });
      });
      var inp = li.querySelector('.qz-in');
      if (inp) {
        inp.addEventListener('input', function () { inp.value = inp.value.replace(/[^0-9 ]/g, ''); li.dataset.v = inp.value; });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var all = el.querySelectorAll('.qz-in'), idx = Array.prototype.indexOf.call(all, inp); if (all[idx + 1]) all[idx + 1].focus(); else el.querySelector('.qz-check').focus(); } });
      }
    });
    function check() {
      if (done) return; done = true; if (timer) clearInterval(timer);
      var ok = 0;
      el.querySelectorAll('.qz-q').forEach(function (li) {
        var t = tasks[+li.dataset.i], v = li.dataset.v, good = E().check(t, v);
        if (good) ok++;
        li.classList.add(good ? 'ok' : 'bad');
        li.querySelector('.qz-fb').innerHTML = good ? '✓ Вярно' : '✗ ' + (v ? 'Не е вярно. ' : 'Без отговор. ') + 'Решение: <b>' + t.full + '</b>';
        li.querySelectorAll('input,button').forEach(function (x) { x.disabled = true; });
      });
      var pct = Math.round(ok / tasks.length * 100), stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
      el.querySelector('.qz-score').innerHTML = '<b>' + ok + ' от ' + tasks.length + '</b> верни (' + pct + '%)';
      var box = el.querySelector('.qz-done');
      box.hidden = false;
      box.innerHTML = '<div class="qz-stars" aria-label="' + stars + ' звезди">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= stars ? 'on' : '') + '">★</span>'; }).join('') + '</div>' +
        '<p>' + (stars === 3 ? 'Браво! Отличен резултат! 🎉' : stars === 2 ? 'Много добре! Още малко упражнение и ще е отлично.' : stars === 1 ? 'Добро начало! Прегледай решенията и опитай пак.' : 'Нищо страшно – прегледай решенията и опитай отново.') + '</p>' +
        '<p class="qz-cta"><a class="btn btn-lg" href="' + esc(cta) + '">🎮 Упражнявай като игра в Сметко</a></p>';
      if (S.track) S.track('quiz_complete', { quiz: d.title || '', score: pct });
      el.querySelector('.qz-check').disabled = true;
      var first = el.querySelector('.qz-q.bad'); (first || box).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    el.querySelector('.qz-check').addEventListener('click', check);
    el.querySelector('.qz-new').addEventListener('click', function () { if (timer) clearInterval(timer); play(el); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    if (left) {
      var tEl = el.querySelector('.qz-time');
      timer = setInterval(function () {
        left--; if (left <= 0) { tEl.textContent = '0:00'; check(); return; }
        tEl.textContent = Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2);
        if (left === 300) tEl.classList.add('warn');
      }, 1000);
    }
  }

  function init() {
    if (!E()) return;
    document.querySelectorAll('.qz').forEach(function (el) {
      if (el.dataset.lazy) { // тестът се показва след натискане (напр. НВО с часовник)
        el.innerHTML = '<div class="qz-start"><b>' + esc(el.dataset.title || 'Онлайн тест') + '</b><p>' + esc(el.dataset.lazy) + '</p><button type="button" class="btn btn-lg btn-green">▶ Започни теста</button></div>';
        el.querySelector('button').addEventListener('click', function () { play(el); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      } else play(el);
    });
  }
  S.quiz = { init: init, play: play };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
