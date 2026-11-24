/* Сметко — „На дъската“: една задача на цял екран за фронтална работа в час.
   Интервал показва отговора, стрелка надясно дава следваща задача. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var wrap = document.getElementById('bd');
  if (!wrap) return;
  // темите идват от js/tools.js, който се зарежда след нас – чакаме го
  var started = false;
  function start() { if (!started) { started = true; init(); } }
  if (S.topicOptions) start();
  else { document.addEventListener('DOMContentLoaded', start); window.addEventListener('load', start); }

  function init() {

  var qEl = document.getElementById('bd-q'), aEl = document.getElementById('bd-a'),
      figEl = document.getElementById('bd-fig'), cntEl = document.getElementById('bd-count'),
      gSel = document.getElementById('bd-grade'), tSel = document.getElementById('bd-topic'),
      lSel = document.getElementById('bd-level'), optEl = document.getElementById('bd-opts');
  var task = null, shown = 0, revealed = false;

  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function optVal(c) { return typeof c === 'string' ? c : c.v; }

  // Задачите с избираем отговор са 14% от всички – на дъската им трябват и самите отговори
  function drawOpts() {
    if (!optEl) return;
    var ch = task && task.kind === 'choice' && task.choices;
    optEl.hidden = !ch;
    if (!ch) { optEl.innerHTML = ''; return; }
    optEl.innerHTML = task.choices.map(function (c, i) {
      var body = typeof c === 'string' ? esc(c) : (c.html || esc(c.v));
      return '<span class="bd-opt" data-v="' + esc(optVal(c)) + '"><i>' + ('АБВГДЕЖ'.charAt(i) || (i + 1)) + '</i>' + body + '</span>';
    }).join('');
  }

  // Най-едрият шрифт, при който всичко се побира – иначе на цял екран условието излиза извън екрана
  function fits() { return wrap.scrollHeight <= wrap.clientHeight + 1; }
  function fit() {
    var fs = document.fullscreenElement === wrap;
    var hi = fs ? Math.min(window.innerWidth / 6, window.innerHeight / 3.4) : Math.min(wrap.clientWidth / 7, 88);
    var lo = 14, best = lo, hidden = aEl.hidden, i, mid;
    if (hidden && task) {           // мери се и с отговора, за да не подскача въпросът при показване
      aEl.hidden = false; aEl.style.visibility = 'hidden'; aEl.textContent = String(task.full || task.answer);
    }
    for (i = 0; i < 11 && hi - lo > 0.4; i++) {
      mid = (lo + hi) / 2;
      wrap.style.setProperty('--bq', mid + 'px');
      if (fits()) { best = mid; lo = mid; } else { hi = mid; }
    }
    wrap.style.setProperty('--bq', best + 'px');
    if (hidden) { aEl.hidden = true; aEl.style.visibility = ''; aEl.textContent = ''; }
  }

  function E() { return S.MathEngine; }
  function fillTopics() {
    if (S.topicOptions) tSel.innerHTML = S.topicOptions(+gSel.value, true);
  }

  function next() {
    if (!E()) return;
    task = E().generate(+gSel.value, tSel.value, +lSel.value);
    revealed = false;
    shown++;
    qEl.innerHTML = String(task.q).split('{?}').join('<span class="bd-blank">?</span>');
    figEl.innerHTML = task.figure || '';
    figEl.hidden = !task.figure;
    aEl.hidden = true;
    aEl.textContent = '';
    drawOpts();
    cntEl.textContent = 'Задача ' + shown;
    document.getElementById('bd-show').textContent = 'Покажи отговора';
    fit();
  }

  function reveal() {
    if (!task || revealed) return next();
    revealed = true;
    aEl.hidden = false;
    aEl.textContent = String(task.full || task.answer);
    if (optEl && !optEl.hidden) {
      Array.prototype.forEach.call(optEl.children, function (el) {
        if (el.getAttribute('data-v') === String(task.answer)) el.className = 'bd-opt right';
      });
    }
    document.getElementById('bd-show').textContent = 'Следваща задача';
    fit();
  }

  document.getElementById('bd-show').addEventListener('click', reveal);
  document.getElementById('bd-next').addEventListener('click', next);
  gSel.addEventListener('change', function () { fillTopics(); next(); });
  tSel.addEventListener('change', next);
  lSel.addEventListener('change', next);

  var full = document.getElementById('bd-full');
  full.addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (wrap.requestFullscreen) wrap.requestFullscreen();
  });

  document.addEventListener('keydown', function (e) {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test((e.target.tagName || ''))) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); }
    else if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
  });

  var tmr;
  function refit() { clearTimeout(tmr); tmr = setTimeout(fit, 60); }
  window.addEventListener('resize', refit);
  document.addEventListener('fullscreenchange', refit);

  fillTopics();
  next();
  S.Board = { next: next, reveal: reveal, fit: fit, task: function () { return task; } };   // за проверките
  }
})();
