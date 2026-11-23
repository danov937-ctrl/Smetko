/* Сметко — двубой: двама играчи на едно устройство, един телефон си го подават.
   Всеки рунд двамата получават задача от едно и също умение, за да е честно. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var root = document.getElementById('du');
  if (!root) return;

  var setup = document.getElementById('du-setup'), play = document.getElementById('du-play'),
      over = document.getElementById('du-over'), qEl = document.getElementById('du-q'),
      figEl = document.getElementById('du-fig'), ansEl = document.getElementById('du-ans'),
      fb = document.getElementById('du-fb'), who = document.getElementById('du-who'),
      bar = document.getElementById('du-bar'), scoreEl = document.getElementById('du-score');

  var names = ['Играч 1', 'Играч 2'], score = [0, 0], turn = 0, round = 0, rounds = 5;
  var task = null, skill = null, t0 = 0, tick = 0;

  function E() { return S.MathEngine; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function skillsFor(g) {
    var out = [];
    (E().GRADES[g].topics || []).forEach(function (t) {
      t.skills.forEach(function (k) { if (out.indexOf(k[0]) < 0) out.push(k[0]); });
    });
    return out;
  }

  function nextTask() {
    var g = +document.getElementById('du-grade').value, lv = +document.getElementById('du-level').value;
    if (turn === 0) {                                   // новото умение се избира за двамата
      var ss = skillsFor(g);
      skill = ss[Math.floor(Math.random() * ss.length)];
    }
    var guard = 0;
    do { task = E().generateSkill(g, skill, lv); } while ((!task || task.dots) && guard++ < 20);
    if (!task) { skill = 'add10'; task = E().generateSkill(g, skill, lv); }
    qEl.innerHTML = String(task.q).replace('{?}', '<span class="du-blank">?</span>');
    figEl.innerHTML = task.figure || '';
    figEl.hidden = !task.figure;
    ansEl.value = '';
    if (task.kind === 'choice' && task.choices) {
      ansEl.hidden = true;
      document.getElementById('du-chs').innerHTML = task.choices.map(function (c) {
        var v = typeof c === 'object' ? c.v : c, h = typeof c === 'object' ? (c.html || c.v) : c;
        return '<button type="button" class="du-ch" data-v="' + esc(v) + '">' + h + '</button>';
      }).join('');
      document.getElementById('du-chs').hidden = false;
    } else {
      ansEl.hidden = false; document.getElementById('du-chs').hidden = true; ansEl.focus();
    }
    who.textContent = names[turn];
    who.className = 'du-who p' + (turn + 1);
    scoreEl.innerHTML = '<b class="p1">' + esc(names[0]) + ': ' + score[0] + '</b><b class="p2">' + esc(names[1]) + ': ' + score[1] + '</b>';
    document.getElementById('du-round').textContent = 'Рунд ' + (round + 1) + ' от ' + rounds;
    fb.textContent = ''; fb.className = 'du-fb';
    t0 = Date.now();
    clearInterval(tick);
    bar.style.width = '100%';
    tick = setInterval(function () {
      var left = Math.max(0, 1 - (Date.now() - t0) / 20000);
      bar.style.width = (left * 100).toFixed(1) + '%';
      if (left <= 0) { clearInterval(tick); answer(null, true); }
    }, 100);
  }

  function answer(v, timeout) {
    if (!task) return;
    clearInterval(tick);
    var good = !timeout && E().check(task, v === null || v === undefined ? ansEl.value : v);
    var fast = (Date.now() - t0) < 10000;
    if (good) { score[turn] += fast ? 2 : 1; fb.className = 'du-fb good'; fb.textContent = fast ? 'Вярно и бързо! +2' : 'Вярно! +1'; }
    else { fb.className = 'du-fb bad'; fb.textContent = (timeout ? 'Времето свърши. ' : 'Не е вярно. ') + String(task.full).replace(/<[^>]+>/g, ''); }
    task = null;
    setTimeout(function () {
      if (turn === 1) round++;
      turn = 1 - turn;
      if (round >= rounds) finish(); else nextTask();
    }, good ? 900 : 1800);
  }

  function finish() {
    clearInterval(tick);
    play.hidden = true; over.hidden = false;
    var win = score[0] === score[1] ? null : (score[0] > score[1] ? 0 : 1);
    over.innerHTML = '<h3>' + (win === null ? 'Равенство!' : esc(names[win]) + ' печели!') + '</h3>' +
      '<p class="du-final"><span class="p1">' + esc(names[0]) + ': <b>' + score[0] + '</b></span>' +
      '<span class="p2">' + esc(names[1]) + ': <b>' + score[1] + '</b></span></p>' +
      '<div class="du-btns"><button type="button" class="btn btn-lg btn-green" id="du-again">Още веднъж</button>' +
      '<a class="btn btn-white" href="game.html">Към мисиите</a></div>';
    document.getElementById('du-again').addEventListener('click', function () {
      score = [0, 0]; round = 0; turn = 0;
      over.hidden = true; play.hidden = false; nextTask();
    });
  }

  document.getElementById('du-start').addEventListener('click', function () {
    var n1 = document.getElementById('du-n1').value.trim(), n2 = document.getElementById('du-n2').value.trim();
    names = [n1 || 'Играч 1', n2 || 'Играч 2'];
    rounds = +document.getElementById('du-rounds').value;
    score = [0, 0]; round = 0; turn = 0;
    setup.hidden = true; play.hidden = false; over.hidden = true;
    nextTask();
  });
  document.getElementById('du-ok').addEventListener('click', function () { answer(); });
  ansEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); answer(); } });
  document.getElementById('du-chs').addEventListener('click', function (e) {
    var b = e.target.closest('.du-ch');
    if (b) answer(b.getAttribute('data-v'));
  });

  S.Duel = { task: function () { return task; }, score: function () { return score.slice(); },
             turn: function () { return turn; } };                       // за проверките
})();
