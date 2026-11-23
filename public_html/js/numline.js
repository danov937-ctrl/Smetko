/* Сметко — числова ос: мястото на числото се показва с пръст.
   Три вида работа: намери числото на оста, прочети къде сочи стрелката и закръгли с оста. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var root = document.getElementById('nl');
  if (!root) return;

  var svg = document.getElementById('nl-svg'), task = document.getElementById('nl-task'),
      fb = document.getElementById('nl-fb'), ansEl = document.getElementById('nl-ans'),
      modeSel = document.getElementById('nl-mode'), spanSel = document.getElementById('nl-span');
  var W = 600, Y = 70, X = 30, L = W - 2 * X;
  var span = 20, step = 1, mark = 0, target = 0, mode = 'find', drag = false, done = false;

  function px(v) { return X + L * v / span; }
  function val(x) { return Math.round((x - X) / L * span / step) * step; }

  function draw() {
    var b = '<line x1="' + X + '" y1="' + Y + '" x2="' + (W - X) + '" y2="' + Y + '" stroke="#1D2B4F" stroke-width="3"/>' +
            '<polygon points="' + (W - X + 14) + ',' + Y + ' ' + (W - X) + ',' + (Y - 6) + ' ' + (W - X) + ',' + (Y + 6) + '" fill="#1D2B4F"/>';
    var lab = span <= 20 ? (span <= 10 ? 1 : 2) : span === 100 ? 10 : 100;
    for (var v = 0; v <= span; v += step) {
      var big = v % lab === 0;
      b += '<line x1="' + px(v) + '" y1="' + (Y - (big ? 10 : 5)) + '" x2="' + px(v) + '" y2="' + (Y + (big ? 10 : 5)) +
           '" stroke="#1D2B4F" stroke-width="' + (big ? 2.4 : 1.2) + '"/>';
      if (big) b += '<text x="' + px(v) + '" y="' + (Y + 30) + '" text-anchor="middle" class="nl-n">' + v + '</text>';
    }
    var show = mode === 'read' || (mode === 'round' && !done) ? target : mark;
    b += '<g class="nl-mk"><line x1="' + px(show) + '" y1="' + (Y - 40) + '" x2="' + px(show) + '" y2="' + (Y - 12) + '" stroke="#FF7A1A" stroke-width="3"/>' +
         '<polygon points="' + px(show) + ',' + (Y - 8) + ' ' + (px(show) - 9) + ',' + (Y - 24) + ' ' + (px(show) + 9) + ',' + (Y - 24) + '" fill="#FF7A1A" stroke="#fff" stroke-width="2"/>' +
         (mode === 'find' ? '<text x="' + px(show) + '" y="' + (Y - 46) + '" text-anchor="middle" class="nl-v">' + mark + '</text>' : '') + '</g>';
    svg.innerHTML = b;
  }

  function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

  function newTask() {
    span = +spanSel.value; mode = modeSel.value;
    step = span <= 20 ? 1 : span === 100 ? 10 : 100;
    done = false;
    fb.textContent = ''; fb.className = 'nl-fb';
    ansEl.value = '';
    ansEl.hidden = mode === 'find';
    if (mode === 'find') {
      target = rnd(1, span - 1);
      if (span > 20) target = rnd(1, span / step - 1) * step;
      mark = Math.round(span / 2 / step) * step;
      task.textContent = 'Намери числото ' + target + ' на оста – плъзни стрелката дотам.';
    } else if (mode === 'read') {
      target = span <= 20 ? rnd(1, span - 1) : rnd(1, span / step - 1) * step;
      task.textContent = 'Кое число сочи стрелката?';
    } else {
      var lo = rnd(0, span / step - 1) * step, off = rnd(1, step - 1);
      while (off === step / 2) off = rnd(1, step - 1);
      target = lo + off;
      task.textContent = 'Стрелката сочи ' + target + '. Кое кръгло число е по-близо?';
    }
    draw();
  }

  function check() {
    var okNow, right;
    if (mode === 'find') { okNow = mark === target; right = target; }
    else if (mode === 'read') { okNow = +ansEl.value === target; right = target; }
    else {
      var lo = Math.floor(target / step) * step, hi = lo + step;
      right = target - lo < hi - target ? lo : hi;
      okNow = +ansEl.value === right;
    }
    fb.className = 'nl-fb ' + (okNow ? 'good' : 'bad');
    fb.textContent = okNow ? 'Браво! ' + (mode === 'round' ? target + ' е по-близо до ' + right : 'Точно ' + right)
      : (mode === 'find' ? 'Още не. Брой делениетата от нулата.' : 'Не е това. Погледни между кои две деления е стрелката.');
    if (okNow) { done = true; draw(); setTimeout(newTask, 1400); }
  }

  function moveTo(ev) {
    if (!drag || mode !== 'find') return;
    ev.preventDefault();
    var r = svg.getBoundingClientRect(), sc = r.width / W;
    var x = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) / sc;
    var v = Math.max(0, Math.min(span, val(x)));
    if (v !== mark) { mark = v; draw(); }
  }
  svg.addEventListener('mousedown', function (e) { drag = true; moveTo(e); });
  svg.addEventListener('touchstart', function (e) { drag = true; moveTo(e); }, { passive: false });
  window.addEventListener('mousemove', moveTo);
  window.addEventListener('touchmove', moveTo, { passive: false });
  window.addEventListener('mouseup', function () { drag = false; });
  window.addEventListener('touchend', function () { drag = false; });

  document.getElementById('nl-check').addEventListener('click', check);
  document.getElementById('nl-new').addEventListener('click', newTask);
  modeSel.addEventListener('change', newTask);
  spanSel.addEventListener('change', newTask);
  ansEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } });

  S.NumLine = { set: function (v) { mark = v; draw(); }, target: function () { return target; },
                mode: function () { return mode; }, step: function () { return step; }, next: newTask };
  newTask();
})();
