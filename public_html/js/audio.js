/* Сметко — звукови ефекти, синтезирани с Web Audio API.
   Не изискват звукови файлове → по-бързо зареждане и работят офлайн.
   Ако по-късно добавите .mp3 файлове в assets/sounds/, може да ги пуснете през play(). */
(function () {
  'use strict';
  var ctx = null;

  function enabled() {
    try { return !window.Smetko.Game || window.Smetko.Game.state.settings.sound !== false; } catch (e) { return true; }
  }
  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, type, vol) {
    var c = ac(); if (!c) return;
    var t0 = c.currentTime + (start || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function seq(notes, type, vol) {
    if (!enabled()) return;
    notes.forEach(function (n) { tone(n[0], n[1], n[2], type, vol); });
  }

  var A = {
    click: function () { seq([[660, 0, 0.06]], 'triangle', 0.08); },
    key: function () { seq([[520, 0, 0.05]], 'triangle', 0.06); },
    correct: function () { seq([[784, 0, 0.12], [1175, 0.08, 0.2]], 'triangle', 0.16); },
    combo: function () { seq([[784, 0, 0.1], [988, 0.07, 0.1], [1319, 0.14, 0.22]], 'triangle', 0.15); },
    wrong: function () { seq([[330, 0, 0.16], [262, 0.12, 0.24]], 'sine', 0.14); },  // мек, не плаши
    tick: function () { seq([[1000, 0, 0.04]], 'square', 0.04); },
    levelUp: function () { seq([[523, 0, 0.14], [659, 0.1, 0.14], [784, 0.2, 0.14], [1047, 0.3, 0.35]], 'triangle', 0.17); },
    win: function () { seq([[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.18], [784, 0.54, 0.1], [1047, 0.64, 0.45]], 'triangle', 0.16); },
    badge: function () { seq([[1319, 0, 0.1], [1568, 0.08, 0.1], [2093, 0.16, 0.3]], 'sine', 0.14); },
    play: function (src) { if (!enabled()) return; try { new Audio(src).play(); } catch (e) {} },
    unlock: function () { ac(); }
  };

  window.Smetko = window.Smetko || {};
  window.Smetko.Audio = A;
})();
