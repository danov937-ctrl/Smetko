/* Сметко — обиколка и лице: правоъгълник на квадратчета, който детето тегли с пръст.
   Целта е да се види разликата: обиколката е пътят отвън, лицето са квадратчетата вътре. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var root = document.getElementById('ar');
  if (!root) return;

  var CELL = 34, MAXW = 12, MAXH = 8, PAD = 16;
  var svg = document.getElementById('ar-svg'), out = document.getElementById('ar-out'),
      task = document.getElementById('ar-task'), ansEl = document.getElementById('ar-ans'),
      fb = document.getElementById('ar-fb'), modeSel = document.getElementById('ar-mode');
  var w = 6, h = 4, want = 'per', drag = false;

  function per() { return 2 * (w + h); }
  function area() { return w * h; }

  function draw() {
    var W = MAXW * CELL + PAD * 2, H = MAXH * CELL + PAD * 2, g = '';
    for (var x = 0; x <= MAXW; x++) g += '<line x1="' + (PAD + x * CELL) + '" y1="' + PAD + '" x2="' + (PAD + x * CELL) + '" y2="' + (PAD + MAXH * CELL) + '" stroke="#E4EDFB" stroke-width="1"/>';
    for (var y = 0; y <= MAXH; y++) g += '<line x1="' + PAD + '" y1="' + (PAD + y * CELL) + '" x2="' + (PAD + MAXW * CELL) + '" y2="' + (PAD + y * CELL) + '" stroke="#E4EDFB" stroke-width="1"/>';
    var rw = w * CELL, rh = h * CELL;
    g += '<rect x="' + PAD + '" y="' + PAD + '" width="' + rw + '" height="' + rh + '" fill="#DCEEFF" stroke="#2F80ED" stroke-width="4"/>';
    g += '<text x="' + (PAD + rw / 2) + '" y="' + (PAD + rh + 20) + '" text-anchor="middle" class="ar-lbl">' + w + ' см</text>';
    g += '<text x="' + (PAD + rw + 14) + '" y="' + (PAD + rh / 2 + 5) + '" class="ar-lbl">' + h + ' см</text>';
    g += '<circle cx="' + (PAD + rw) + '" cy="' + (PAD + rh) + '" r="11" fill="#FF7A1A" stroke="#fff" stroke-width="3" id="ar-grip"/>';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = g;
    out.innerHTML = '<span><b>Обиколка</b>2 · (' + w + ' + ' + h + ') = <i>' + per() + ' см</i></span>' +
                    '<span><b>Лице</b>' + w + ' · ' + h + ' = <i>' + area() + ' кв. см</i></span>';
  }

  function cell(ev) {
    var r = svg.getBoundingClientRect(), sc = r.width / (MAXW * CELL + PAD * 2);
    var x = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) / sc - PAD;
    var y = ((ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top) / sc - PAD;
    return { x: Math.max(1, Math.min(MAXW, Math.round(x / CELL))), y: Math.max(1, Math.min(MAXH, Math.round(y / CELL))) };
  }
  function move(ev) {
    if (!drag) return;
    ev.preventDefault();
    var c = cell(ev);
    if (c.x !== w || c.y !== h) { w = c.x; h = c.y; draw(); }
  }
  svg.addEventListener('mousedown', function (e) { drag = true; move(e); });
  svg.addEventListener('touchstart', function (e) { drag = true; move(e); }, { passive: false });
  window.addEventListener('mousemove', move);
  window.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('mouseup', function () { drag = false; });
  window.addEventListener('touchend', function () { drag = false; });

  function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function newTask() {
    want = modeSel.value === 'mix' ? (Math.random() < .5 ? 'per' : 'area') : modeSel.value;
    w = rnd(2, MAXW); h = rnd(2, MAXH);
    draw();
    root.classList.add('hide-out');
    ansEl.value = ''; fb.textContent = ''; fb.className = 'ar-fb';
    task.textContent = want === 'per'
      ? 'Колко е обиколката на правоъгълника в сантиметри?'
      : 'Колко е лицето на правоъгълника в квадратни сантиметри?';
  }

  function check() {
    var v = parseInt(String(ansEl.value).replace(/\s/g, ''), 10), right = want === 'per' ? per() : area();
    var okNow = v === right;
    fb.className = 'ar-fb ' + (okNow ? 'good' : 'bad');
    if (okNow) {
      fb.innerHTML = want === 'per' ? 'Браво! 2 · (' + w + ' + ' + h + ') = <b>' + per() + ' см</b>'
                                    : 'Браво! ' + w + ' · ' + h + ' = <b>' + area() + ' кв. см</b>';
      root.classList.remove('hide-out');
      setTimeout(newTask, 1600);
    } else if (v === (want === 'per' ? area() : per())) {
      fb.innerHTML = want === 'per' ? 'Това е <b>лицето</b> – квадратчетата вътре. Обиколката е пътят отвън.'
                                    : 'Това е <b>обиколката</b> – пътят отвън. Лицето са квадратчетата вътре.';
    } else {
      fb.textContent = want === 'per' ? 'Не е това. Съберете четирите страни.' : 'Не е това. Умножете двете страни.';
    }
  }

  document.getElementById('ar-check').addEventListener('click', check);
  document.getElementById('ar-new').addEventListener('click', newTask);
  document.getElementById('ar-show').addEventListener('click', function () { root.classList.remove('hide-out'); });
  modeSel.addEventListener('change', newTask);
  ansEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } });

  S.Area = { set: function (a, b) { w = a; h = b; draw(); }, per: per, area: area,
             want: function () { return want; }, next: newTask };   // за проверките
  newTask();
})();
