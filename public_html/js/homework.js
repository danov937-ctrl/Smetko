/* Сметко — домашни от учителя (/api/homework.php).
   Ученикът с код за клас вижда домашните на класа ([data-hw-cards]) и ги решава в играта (game.html?hw=ID).
   Учителят ги задава от „Класация на класа“ (js/tools.js). */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var KEY = 'smetko.hw', cache = null, pending = null;
  try { cache = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  function online() { return /^https?:$/.test(location.protocol); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function post(d) {
    return fetch('/api/homework.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), credentials: 'same-origin' })
      .then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.error || 'Грешка.'); return j; });
  }
  function token() { var a = S.Access && S.Access.get(); return a && a.type === 'class' && a.role !== 'teacher' ? a.token : null; }
  function mine(force) {
    var t = token();
    if (!t) return Promise.resolve([]);
    if (!online()) return Promise.resolve(cache ? cache.list : []);
    if (pending && !force) return pending;
    pending = post({ token: t, action: 'mine' }).then(function (j) {
      cache = { list: j.list || [], t: Date.now() }; try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {}
      return cache.list;
    }).catch(function () { return cache ? cache.list : []; });
    return pending;
  }
  function submit(id, correct, answered) {
    var t = token(); if (!t) return Promise.reject(new Error('Няма код за клас.'));
    return post({ token: t, action: 'submit', id: id, correct: correct, answered: answered }).then(function (j) { pending = null; return j; });
  }
  function find(id) { return mine().then(function (l) { for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }); }
  function today() { return S.Game ? S.Game.today() : new Date().toISOString().slice(0, 10); }
  function dueText(h) {
    var d = Math.round((new Date(h.due) - new Date(today())) / 864e5);
    return d < 0 ? 'срокът мина (' + S.fmtDate(h.due) + ')' : d === 0 ? 'срок: днес' : d === 1 ? 'срок: утре' : 'срок: ' + S.fmtDate(h.due);
  }
  function card(h) {
    var late = h.due < today();
    return '<div class="hw-card' + (h.done ? ' done' : late ? ' late' : '') + '"><span class="hw-ico">' + (h.done ? '✅' : '📚') + '</span><div class="hw-txt"><small>Домашна от учителя · ' + h.grade + '. клас</small><b>' + esc(h.title) + '</b><span>' + h.count + ' задачи · ' +
      (h.done ? 'предадена – ' + h.best + ' от ' + h.count + ' верни' : dueText(h)) + '</span></div><a class="btn btn-sm' + (h.done ? ' btn-white' : '') + '" href="game.html?hw=' + h.id + '">' + (h.done ? 'Пак' : 'Реши') + '</a></div>';
  }
  function render() {
    var boxes = document.querySelectorAll('[data-hw-cards]'); if (!boxes.length || !token()) return;
    mine().then(function (l) {
      var open = l.filter(function (h) { return !h.done; }), list = open.concat(l.filter(function (h) { return h.done && h.due >= today(); }));
      boxes.forEach(function (b) { b.innerHTML = list.slice(0, 4).map(card).join(''); b.hidden = !list.length; });
    });
  }
  S.Homework = { mine: mine, submit: submit, find: find, render: render, dueText: dueText };
  document.addEventListener('DOMContentLoaded', render);
})();
