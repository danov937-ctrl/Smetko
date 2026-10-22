/* Сметко — кодове за достъп (пълен абонамент), класации на класа.
   Сървър: /api/*.php. Достъпът се пази на устройството и се проверява веднъж дневно. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var API = '/api/';
  var online = /^https?:$/.test(location.protocol);

  function st() { return S.Game ? S.Game.state : {}; }
  function save() { if (S.Game) S.Game.save(); }
  function today() { return S.Game ? S.Game.today() : new Date().toISOString().slice(0, 10); }

  function deviceId() {
    var s = st();
    if (!s.deviceId) {
      var b = new Uint8Array(16);
      (window.crypto || window.msCrypto).getRandomValues(b);
      s.deviceId = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      save();
    }
    return s.deviceId;
  }

  function access() { var a = st().access; return a && a.expires >= today() ? a : null; }
  function isClass() { var a = access(); return !!(a && a.type === 'class'); }

  function post(path, data) {
    if (!online) return Promise.reject(new Error('Нужна е интернет връзка (отворете сайта от smetko.com).'));
    return fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { throw new Error('Сървърът не отговаря. Опитайте пак след малко.'); }); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'Грешка.'); return j; });
  }

  function redeem(code, nickname, grade) {
    return post('redeem.php', { code: code, device: deviceId(), nickname: nickname || '', grade: grade || 0 }).then(function (j) {
      var s = st();
      s.access = { code: j.code, type: j.type, typeName: j.typeName, role: j.role || 'student', expires: j.expires, token: j.token, label: j.label || '', checked: today() };
      if (nickname) s.nickname = nickname;
      save();
      sync(true);
      markLinks();
      if (S.updateChip) S.updateChip();
      return j;
    });
  }

  function verify() { // веднъж дневно; без интернет – вярваме на запазения срок
    var s = st(), a = s.access;
    if (!a || !online || a.checked === today()) return;
    post('check.php', { token: a.token }).then(function (j) {
      if (!j.valid) { s.accessLost = a.code; delete s.access; save(); if (S.toast) S.toast('Кодът за достъп вече не е активен на това устройство.'); }
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

  function classBoard() { var a = access(); return a ? post('class.php', { token: a.token }) : Promise.reject(new Error('Няма код за клас.')); }
  function teacherBoard(code, pin, hide, unhide, release) { var d = { code: code, pin: pin }; if (hide) { d.hide = hide; if (unhide) d.unhide = 1; } if (release) d.release = release; return post('class.php', d); }
  function teacherCreds() { try { var b = JSON.parse(localStorage.getItem('smetko.board') || 'null'); return b && b.c && b.p ? b : null; } catch (e) { return null; } }
  function withAccess(q) { var a = access(), t; q = q || {}; if (a) q.token = a.token; else if ((t = teacherCreds())) { q.code = t.c; q.pin = t.p; } return q; } // учител: кодът и ПИН-ът от класацията на класа
  function league(q) { return post('league.php', withAccess(q)); }
  function canSeeLeague() { return !!(access() || teacherCreds()); }
  function teacherSettings(code, pin, settings) { return post('class.php', { code: code, pin: pin, settings: settings }); }
  function setNickname(n) { st().nickname = n; save(); sync(true); }
  function forget() { var s = st(); delete s.access; save(); }

  S.Access = { deviceId: deviceId, get: access, isClass: isClass, redeem: redeem, verify: verify, sync: sync, classBoard: classBoard, teacherBoard: teacherBoard, league: league, withAccess: withAccess, canSeeLeague: canSeeLeague, teacherSettings: teacherSettings, setNickname: setNickname, forget: forget, online: online };
  S.hasAccess = function () { return !!access(); };

  function fmtDate(d) { var p = String(d).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d; }
  S.fmtDate = fmtDate;

  function markLinks() {
    var a = access();
    document.querySelectorAll('[data-code-link]').forEach(function (el) {
      if (a) { el.textContent = '✓ Пълен достъп'; el.title = 'Валиден до ' + fmtDate(a.expires); el.classList.add('has-access'); }
    });
  }
  document.addEventListener('DOMContentLoaded', function () { verify(); markLinks(); });
})();
