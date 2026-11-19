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
      lSel = document.getElementById('bd-level');
  var task = null, shown = 0, revealed = false;

  function E() { return S.MathEngine; }
  function fillTopics() {
    if (S.topicOptions) tSel.innerHTML = S.topicOptions(+gSel.value, true);
  }

  function next() {
    if (!E()) return;
    task = E().generate(+gSel.value, tSel.value, +lSel.value);
    revealed = false;
    shown++;
    qEl.innerHTML = String(task.q).replace('{?}', '<span class="bd-blank">?</span>');
    figEl.innerHTML = task.figure || '';
    figEl.hidden = !task.figure;
    aEl.hidden = true;
    aEl.textContent = '';
    cntEl.textContent = 'Задача ' + shown;
    document.getElementById('bd-show').textContent = 'Покажи отговора';
  }

  function reveal() {
    if (!task || revealed) return next();
    revealed = true;
    aEl.hidden = false;
    aEl.textContent = String(task.full || task.answer);
    document.getElementById('bd-show').textContent = 'Следваща задача';
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

  fillTopics();
  next();
  S.Board = { next: next, reveal: reveal, task: function () { return task; } };   // за проверките
  }
})();
