/* Сметко — пълен достъп (абонамент) и синхронизация с класациите.
   Достъпът идва от акаунта (детски профил с абонамент) или от вход на ученик от клас (js/account.js).
   Пази се на устройството и се проверява веднъж дневно. Сървър: /api/*.php. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var API = '/api/';
  var online = /^https?:$/.test(location.protocol);

  function st() { return S.Game ? S.Game.state : {}; }
  function save() { if (S.Game) S.Game.save(); }
  function today() { return S.Game ? S.Game.today() : new Date().toISOString().slice(0, 10); }

  function access() { var a = st().access; return a && a.expires >= today() ? a : null; }
  function isClass() { var a = access(); return !!(a && a.type === 'class'); }

  function post(path, data) {
    if (!online) return Promise.reject(new Error('Нужна е интернет връзка (отворете сайта от smetko.com).'));
    return fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { throw new Error('Сървърът не отговаря. Опитайте пак след малко.'); }); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'Грешка.'); return j; });
  }

  function verify() { // веднъж дневно; без интернет – вярваме на запазения срок
    var s = st(), a = s.access;
    if (!a || !online || a.checked === today()) return;
    post('check.php', { token: a.token }).then(function (j) {
      if (!j.valid) { s.accessLost = a.code; delete s.access; save(); if (S.toast) S.toast('Абонаментът вече не е активен.'); if (S.updateChip) S.updateChip(); }
      else { a.checked = today(); if (j.expires) a.expires = j.expires; save(); }
    }).catch(function () {});
  }

  var lastSync = 0;
  function sync(force) {
    var s = st(), a = access();
    if (!a || !online) return;
    if (!force && Date.now() - lastSync < 30000) return;
    lastSync = Date.now();
    var stars = 0, missions = 0;
    for (var k in s.adventure) for (var i in s.adventure[k]) { stars += s.adventure[k][i]; if (s.adventure[k][i]) missions++; }
    var days = {}, dk = Object.keys(s.days || {}).sort().slice(-28); dk.forEach(function (k) { days[k] = s.days[k]; });
    post('sync.php', { token: a.token, nickname: s.nickname || '', grade: s.lastGrade || 0, points: s.points || 0, correct: s.correct || 0, answered: s.answered || 0, stars: stars, missions: missions,
      stats: { s: s.skills || {}, d: days }, ch: s.challenge && s.challenge.week ? s.challenge : null }).catch(function () {});
  }

  function classBoard() { var a = access(); return a ? post('class.php', { token: a.token }) : Promise.reject(new Error('Само за ученици от клас.')); }
  function withAccess(q) { var a = access(); q = q || {}; if (a) q.token = a.token; return q; } // влезлият акаунт се разпознава по бисквитката
  function league(q) { return post('league.php', withAccess(q)); }
  function canSeeLeague() { return !!(access() || (S.Account && S.Account.hasSub && S.Account.hasSub())); }
  function setNickname(n) { st().nickname = n; save(); sync(true); }

  S.Access = { get: access, isClass: isClass, verify: verify, sync: sync, classBoard: classBoard, league: league, withAccess: withAccess, canSeeLeague: canSeeLeague, setNickname: setNickname, online: online };
  S.hasAccess = function () { return !!access(); };

  function fmtDate(d) { var p = String(d).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d; }
  S.fmtDate = fmtDate;
  document.addEventListener('DOMContentLoaded', verify);
})();
