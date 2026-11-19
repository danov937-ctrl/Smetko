/* Сметко — часовник: стрелките се местят с пръст или мишка.
   Два режима: „Колко е часът?“ (чете се) и „Нагласи часовника“ (нагласява се).
   Нищо не се записва – това е уред за упражнение. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var root = document.getElementById('clock');
  if (!root) return;

  var face = document.getElementById('ck-face'), hH = document.getElementById('ck-h'), hM = document.getElementById('ck-m');
  var digi = document.getElementById('ck-digi'), task = document.getElementById('ck-task'),
      fb = document.getElementById('ck-fb'), ans = document.getElementById('ck-ans'),
      modeSel = document.getElementById('ck-mode'), stepSel = document.getElementById('ck-step');

  var total = 10 * 60 + 10;          // позиция на стрелките в минути от 12
  var target = null, mode = 'read', drag = null, tmr = 0;

  function step() { return +stepSel.value || 1; }
  function hh(t) { var h = Math.floor(t / 60) % 12; return h === 0 ? 12 : h; }
  function mm(t) { return ((t % 60) + 60) % 60; }
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function text(t) { return hh(t) + ':' + two(mm(t)); }

  /* как се казва часът на български – това е половината умение */
  function words(t) {
    var h = hh(t), m = mm(t), nx = h === 12 ? 1 : h + 1;
    if (m === 0) return h + ' часа̀ точно';
    if (m === 15) return h + ' и петнайсет';
    if (m === 30) return h + ' и половина';
    if (m === 45) return nx + ' без петнайсет';
    if (m < 30) return h + ' и ' + m + ' минути';
    return nx + ' без ' + (60 - m) + ' минути';
  }

  function hands() {
    hM.setAttribute('transform', 'rotate(' + mm(total) * 6 + ' 100 100)');
    hH.setAttribute('transform', 'rotate(' + (total % 720) / 2 + ' 100 100)');
    digi.textContent = text(total);
    var w = document.getElementById('ck-words');
    if (w) w.textContent = words(total);
  }

  /* ъгъл на точка спрямо центъра, в градуси от 12 часа по часовниковата стрелка */
  function angle(ev) {
    var r = face.getBoundingClientRect();
    var x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - (r.left + r.width / 2);
    var y = (ev.touches ? ev.touches[0].clientY : ev.clientY) - (r.top + r.height / 2);
    var a = Math.atan2(x, -y) * 180 / Math.PI;
    return (a + 360) % 360;
  }

  function move(ev) {
    if (!drag) return;
    ev.preventDefault();
    var a = angle(ev);
    if (drag === 'm') {
      var m = Math.round(a / 6 / step()) * step() % 60, old = mm(total), h = Math.floor(total / 60);
      if (old > 45 && m < 15) h++; else if (old < 15 && m > 45) h--;
      total = ((h * 60 + m) % 720 + 720) % 720;
    } else {
      var hr = Math.floor(a / 30);
      total = ((hr * 60 + mm(total)) % 720 + 720) % 720;
    }
    hands();
  }

  /* далечината от центъра решава коя стрелка се мести: вътре – часовата, навън – минутната.
     Така не се налага детето да улучва тънката стрелка с пръст. */
  function radius(ev) {
    var r = face.getBoundingClientRect();
    var x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - (r.left + r.width / 2);
    var y = (ev.touches ? ev.touches[0].clientY : ev.clientY) - (r.top + r.height / 2);
    return Math.sqrt(x * x + y * y) / (r.width / 2);
  }
  function down(ev) {
    var rr = radius(ev);
    if (rr > 1.02) return;
    drag = rr < 0.58 ? 'h' : 'm';
    ev.preventDefault();
    move(ev);
  }
  function up() { drag = null; }

  face.addEventListener('mousedown', down); face.addEventListener('touchstart', down, { passive: false });
  window.addEventListener('mousemove', move); window.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('mouseup', up); window.addEventListener('touchend', up);

  /* стрелките се местят и от клавиатурата – за дъска и за достъпност */
  face.addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    total = ((total + d * step()) % 720 + 720) % 720;
    hands();
  });

  function rnd(n) { return Math.floor(Math.random() * n); }
  function randTime() {
    var h = rnd(12), m = rnd(Math.floor(60 / step())) * step();
    return h * 60 + m;
  }

  function newTask() {
    clearTimeout(tmr);                 // ако е останал пуснат таймер от предишния верен отговор
    mode = modeSel.value;
    fb.textContent = ''; fb.className = 'ck-fb';
    target = randTime();
    if (mode === 'read') {
      total = target;
      task.textContent = 'Колко е часът?';
      ans.hidden = false; ans.value = '';
      document.getElementById('ck-check').textContent = 'Провери';
      root.classList.add('read-mode');
    } else {
      total = randTime();
      while (total === target) total = randTime();
      task.textContent = 'Нагласи часовника на ' + text(target) + ' (' + words(target) + ')';
      ans.hidden = true;
      document.getElementById('ck-check').textContent = 'Готово';
      root.classList.remove('read-mode');
    }
    hands();
  }

  function check() {
    var okNow;
    if (mode === 'read') {
      var v = String(ans.value).replace(/[.,\s]/g, ':').replace(/::+/g, ':');
      var p = v.split(':'), h = +p[0], m = p.length > 1 ? +p[1] : 0;
      okNow = p[0] !== '' && isFinite(h) && isFinite(m) && (h % 12) === (hh(target) % 12) && m === mm(target);
    } else {
      okNow = total % 720 === target % 720;
    }
    fb.className = 'ck-fb ' + (okNow ? 'good' : 'bad');
    fb.textContent = okNow ? 'Браво! ' + text(target) + ' – ' + words(target)
      : (mode === 'read' ? 'Не е това. Голямата стрелка показва минутите.' : 'Още не е точно. Виж голямата стрелка.');
    if (okNow) { root.classList.remove('read-mode'); tmr = setTimeout(newTask, 1400); }
  }

  document.getElementById('ck-check').addEventListener('click', check);
  document.getElementById('ck-new').addEventListener('click', newTask);
  modeSel.addEventListener('change', newTask);
  stepSel.addEventListener('change', newTask);
  ans.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } });

  S.Clock = { set: function (t) { total = t; hands(); }, get: function () { return total; },
              target: function () { return target; }, words: words, task: newTask };   // за проверките
  newTask();
})();
