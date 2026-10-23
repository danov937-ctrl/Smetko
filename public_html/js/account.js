/* Сметко — акаунти и вход.
   Родител/учител: имейл и парола (/api/account.php). Абонаментът се активира веднъж с код на страница „Абонаменти“.
     • семеен/индивидуален → покрива детските профили; прогресът им се пази на сървъра (всяко устройство);
     • клас → учителят създава учениците в „Табло“ (tablo.html).
   Ученик от клас: потребител и парола от учителя (/api/student.php); прогресът също се пази на сървъра. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var KEY = 'smetko.acct', CHK = 'smetko.acctChk', SKEY = 'smetko.stu', PEND = 'smetko.pendingCode';
  var online = /^https?:$/.test(location.protocol);
  var AVATARS = ['🦉', '🦊', '🐻', '🐰', '🐼', '🐯', '🦁', '🐸', '🐵', '🐧', '🦄', '🐙', '🐢', '🐝', '🚀', '⚽'];
  var c = null;   // акаунт: {name, email, role, since, profiles, classes, subs, pid, rev, t}
  var stu = null; // ученик: {id, name, avatar, username, cls, rev}
  try { c = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  try { stu = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) {}

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]; }); }
  function write() { try { if (c) localStorage.setItem(KEY, JSON.stringify(c)); else localStorage.removeItem(KEY); } catch (e) {} }
  function writeStu() { try { if (stu) localStorage.setItem(SKEY, JSON.stringify(stu)); else localStorage.removeItem(SKEY); } catch (e) {} }
  function G() { return S.Game; }
  function today() { return G() ? G().today() : new Date().toISOString().slice(0, 10); }
  function fmt(d) { return S.fmtDate ? S.fmtDate(d) : d; }
  function qs(k) { return new URLSearchParams(location.search).get(k); }
  function safeNext(n) { return n && /^[a-z0-9-]+\.html([?#][\w=&%.-]*)?$/i.test(n) ? n : ''; }
  function plan(t) { return S.planName ? S.planName(t) : t; }
  function fmtCode(v) { var x = String(v).toUpperCase().replace(/[^A-Z0-9]/g, ''); if (x.indexOf('SMET') === 0) x = x.slice(4); x = x.slice(0, 8); return 'SMET-' + x.slice(0, 4) + (x.length > 4 ? '-' + x.slice(4) : ''); }
  function bindCodeInput(inp) { inp.addEventListener('input', function () { var v = inp.value.replace(/[^A-Za-z0-9]/g, ''); inp.value = !v || v.toUpperCase() === 'SMET' ? inp.value.toUpperCase() : fmtCode(inp.value); }); }
  S.fmtCode = fmtCode; S.bindCodeInput = bindCodeInput;

  function call(url, data, keepalive) {
    if (!online) return Promise.reject(new Error('Нужна е интернет връзка.'));
    var o = data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'same-origin', keepalive: !!keepalive } : { credentials: 'same-origin', cache: 'no-store' };
    return fetch(url, o).then(function (r) { return r.json().catch(function () { throw new Error('Сървърът не отговаря. Опитайте пак след малко.'); }); })
      .then(function (j) { if (!j.ok) { var e = new Error(j.error || 'Грешка.'); e.field = j.field; e.auth = j.auth; e.needTerms = !!j.need_terms; throw e; } return j; });
  }
  function api(data, keepalive) { return call('/api/account.php', data, keepalive); }
  function sapi(data, keepalive) { return call('/api/student.php', data, keepalive); }

  /* ---------- прогрес: сливане на две състояния (на устройството и на сървъра) ---------- */
  function mx(a, b) { return Math.max(+a || 0, +b || 0); }
  function merge(a, b) {
    if (!b || typeof b !== 'object') return a; if (!a || typeof a !== 'object') return b;
    var m = JSON.parse(JSON.stringify(b)), k, i;
    ['points', 'correct', 'answered', 'practiceCorrect', 'maxCombo', 'tableStreak'].forEach(function (x) { m[x] = mx(a[x], b[x]); });
    ['badges', 'modes', 'counters'].forEach(function (x) { m[x] = Object.assign({}, a[x] || {}, b[x] || {}); });
    if (a.counters && b.counters) for (k in a.counters) m.counters[k] = mx(a.counters[k], b.counters[k]);
    m.books = Object.assign({}, b.books || {}, a.books || {}); // учебникът, избран на това устройство
    m.best = m.best || {}; for (k in a.best || {}) m.best[k] = mx(a.best[k], m.best[k]);
    m.adventure = m.adventure || {};
    for (k in a.adventure || {}) { m.adventure[k] = m.adventure[k] || {}; for (i in a.adventure[k]) m.adventure[k][i] = mx(a.adventure[k][i], m.adventure[k][i]); }
    ['skills', 'days'].forEach(function (x) { m[x] = m[x] || {}; for (var q in a[x] || {}) { var p = a[x][q] || [0, 0], s = m[x][q] || [0, 0]; m[x][q] = [mx(p[0], s[0]), mx(p[1], s[1])]; } });
    var sa = a.streak || {}, sb = b.streak || {}; m.streak = (sa.last || '') > (sb.last || '') ? sa : (sa.last === sb.last ? { last: sb.last, count: mx(sa.count, sb.count) } : sb);
    if (a.daily && b.daily && a.daily.date === b.daily.date) m.daily = { date: a.daily.date, count: mx(a.daily.count, b.daily.count) }; else if (a.daily && (!b.daily || a.daily.date > b.daily.date)) m.daily = a.daily;
    if (a.practiceDay && (!b.practiceDay || a.practiceDay.date > b.practiceDay.date)) m.practiceDay = a.practiceDay;
    else if (a.practiceDay && b.practiceDay && a.practiceDay.date === b.practiceDay.date) m.practiceDay = { date: a.practiceDay.date, n: mx(a.practiceDay.n, b.practiceDay.n) };
    var ca = a.challenge || {}, cb = b.challenge || {};
    if (ca.week && ca.week === cb.week) { m.challenge = { week: ca.week, best: {}, done: Object.assign({}, ca.done, cb.done), total: mx(ca.total, cb.total) }; [ca.best, cb.best].forEach(function (o) { for (var g in o || {}) m.challenge.best[g] = mx(o[g], m.challenge.best[g]); }); }
    else if ((ca.week || '') > (cb.week || '')) m.challenge = ca;
    if (a.lastGrade) m.lastGrade = a.lastGrade;
    if (a.settings) m.settings = a.settings;
    if (!m.nickname && a.nickname) m.nickname = a.nickname;
    return m;
  }
  function progressOf(st) { var n = 0; for (var g in (st && st.adventure) || {}) for (var i in st.adventure[g]) n += st.adventure[g][i]; return { answered: (st && st.answered) || 0, stars: n }; }
  function owner(st) { return st && (st.profileId || st.studentId) ? true : false; }

  /* ---------- запис на прогреса (детски профил или ученик) на сървъра ---------- */
  var timer = null, saving = false, again = false, mute = false;
  function who() {
    var st = G() && G().state; if (!st) return null;
    if (stu && st.studentId === stu.id && st.access && st.access.token) return { kind: 'stu', rev: stu.rev || 0 };
    if (c && c.pid && st.profileId === c.pid) return { kind: 'prof', rev: c.rev || 0 };
    return null;
  }
  function payload() { var st = JSON.parse(JSON.stringify(G().state)); delete st.access; delete st.deviceId; delete st.accessLost; return st; }
  function setRev(w, r) { if (w.kind === 'stu') { stu.rev = r; writeStu(); } else { c.rev = r; write(); } }
  function pushState(keepalive) {
    var w = who();
    if (!w || !online) return Promise.resolve();
    if (saving) { again = true; return Promise.resolve(); }
    saving = true; clearTimeout(timer); timer = null;
    var st0 = G().state, idKey = w.kind === 'stu' ? 'studentId' : 'profileId', idVal = st0[idKey];
    var req = w.kind === 'stu' ? sapi({ action: 'save_state', token: st0.access.token, rev: w.rev, state: payload() }, keepalive) : api({ action: 'save_state', id: c.pid, rev: w.rev, state: payload() }, keepalive);
    return req.then(function (j) {
      if (G().state[idKey] !== idVal) return;
      if (j.conflict) { // друго устройство е записало междувременно – сливаме и записваме пак
        setRev(w, j.rev);
        if (j.state) { var cur = G().state, m = merge(cur, j.state); m.access = cur.access; m.deviceId = cur.deviceId; m[idKey] = idVal; silent(function () { G().replace(m); }); }
        again = true; return;
      }
      setRev(w, j.rev);
    }).catch(function (e) { if (e.auth === false) { if (w.kind === 'stu') studentLogout(true); else localLogout(); } })
      .then(function () { saving = false; if (again) { again = false; schedule(1500); } });
  }
  function silent(fn) { mute = true; try { fn(); } finally { mute = false; } }
  function schedule(ms) { if (!timer) timer = setTimeout(function () { timer = null; pushState(); }, ms); }
  S.onSave = function () { if (!mute && who()) schedule(8000); };
  function flush() { if (timer && who()) { clearTimeout(timer); timer = null; pushState(true); } }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  function accessFrom(a) { return a && a.valid ? { code: a.code, type: a.type, typeName: a.typeName, role: a.role || 'student', expires: a.expires, token: a.token, label: a.label || '', checked: today(), student: !!a.student } : null; }

  /* ---------- акаунт ---------- */
  function applyMe(j) {
    if (!j.account) { if (c) localLogout(); try { localStorage.setItem(CHK, String(Date.now())); } catch (e) {} return null; }
    var old = c || {};
    c = { name: j.account.name, email: j.account.email, role: j.account.role, since: j.account.since, t: Date.now(), pid: old.pid || 0, rev: old.rev || 0,
      profiles: (j.profiles || []).map(function (p) { return { id: p.id, name: p.name, avatar: p.avatar, grade: p.grade, plan: p.plan }; }), classes: j.classes || [], subs: j.subs || [] };
    if (c.pid && !c.profiles.some(function (p) { return p.id === c.pid; })) { c.pid = 0; c.rev = 0; }
    write(); renderHeader();
    // абонаментът на детето, което играе тук, се обновява веднага (напр. след активиране на код)
    var p = profile(), st = G() && G().state;
    if (p && st && st.profileId === p.id) {
      var full = (j.profiles || []).filter(function (x) { return x.id === p.id; })[0];
      if (full && !!(full.plan && full.plan.valid) !== !!st.access && !applyMe.busy) {
        if (full.plan && full.plan.valid) { applyMe.busy = true; selectProfile(p.id).catch(function () {}).then(function () { applyMe.busy = false; }); }
        else { delete st.access; silent(function () { G().save(); }); }
      }
    }
    S.accountData = j;
    return j;
  }
  function refresh(force) {
    if (!online) return Promise.resolve(c);
    var last = 0; try { last = +localStorage.getItem(CHK) || 0; } catch (e) {}
    if (!force && (c ? Date.now() - c.t < 3 * 60e3 : Date.now() - last < 30 * 60e3)) return Promise.resolve(c);
    return api().then(applyMe).catch(function () { return c; });
  }
  function localLogout() {
    var wasProfile = who() && who().kind === 'prof';
    try { localStorage.removeItem('smetko.rp'); localStorage.removeItem('smetko.board'); } catch (e) {}
    c = null; write();
    if (wasProfile && G()) silent(function () { G().reset(); }); // споделено устройство: прогресът на детето не остава след изход
    renderHeader();
  }
  function login(email, password) { return api({ action: 'login', email: email, password: password }).then(applyMe); }
  function register(d) { d.action = 'register'; return api(d).then(applyMe); }
  function logout() {
    var p = who() ? pushState() : Promise.resolve();
    return p.then(function () { return api({ action: 'logout' }).catch(function () {}); }).then(function () { localLogout(); });
  }
  function hasSub() { return !!(c && (c.subs || []).some(function (s) { return s.valid; })); }

  /* избор на детски профил на това устройство */
  function selectProfile(id) {
    var before = who() ? pushState() : Promise.resolve();
    return before.then(function () { return api({ action: 'profile_get', id: id }); }).then(function (j) {
      var st = G().state, mine = st.profileId === id, anon = !owner(st), local = JSON.parse(JSON.stringify(st));
      var next = j.state && typeof j.state === 'object' ? j.state : null;
      if (mine || anon) next = merge(local, next); // първи избор на устройството: досегашната игра влиза в профила
      next = next || G().fresh();
      delete next.accessLost; delete next.freeCleaned; delete next.studentId;
      next.profileId = id; next.deviceId = j.device;
      if (!next.nickname) next.nickname = j.profile.name;
      if (!next.lastGrade) next.lastGrade = j.profile.grade;
      var acc = accessFrom(j.access); if (acc) next.access = acc; else delete next.access;
      if (stu) { stu = null; writeStu(); }
      c.pid = id; c.rev = j.rev; write();
      silent(function () { G().replace(next); });
      return pushState().then(function () {
        renderHeader(); if (S.updateChip) S.updateChip(); if (S.Access) S.Access.sync(true);
        return j.profile;
      });
    });
  }
  function profile() { if (!c || !c.pid) return null; for (var i = 0; i < c.profiles.length; i++) if (c.profiles[i].id === c.pid) return c.profiles[i]; return null; }

  /* активиране на абонамент (страница „Абонаменти“) */
  function activate(code) {
    return api({ action: 'activate', code: code }).then(function (j) { applyMe(j); return j; }); // applyMe обновява и детето, което играе тук
  }

  /* ---------- ученик от клас ---------- */
  function studentLogin(username, password) {
    var before = who() ? pushState() : Promise.resolve();
    return before.then(function () { return sapi({ action: 'login', username: username, password: password }); }).then(function (j) {
      var st = G().state, anon = !owner(st), mine = st.studentId === j.student.id;
      var next = j.state && typeof j.state === 'object' ? j.state : null;
      if (mine || anon) next = merge(JSON.parse(JSON.stringify(st)), next);
      next = next || G().fresh();
      delete next.accessLost; delete next.freeCleaned; delete next.profileId;
      next.studentId = j.student.id; next.nickname = j.student.name;
      next.access = accessFrom(j.access);
      var g = j['class'].grade; if (g) { next.lastGrade = next.lastGrade || g; if (j['class'].book) { next.books = next.books || {}; if (!next.books[g]) next.books[g] = j['class'].book; } }
      if (c && c.pid) { c.pid = 0; write(); }
      stu = { id: j.student.id, name: j.student.name, avatar: j.student.avatar, username: j.student.username, cls: j['class'], rev: j.rev };
      writeStu();
      silent(function () { G().replace(next); });
      return pushState().then(function () { renderHeader(); if (S.updateChip) S.updateChip(); if (S.Access) S.Access.sync(true); return j; });
    });
  }
  function studentLogout(silentMode) {
    var p = !silentMode && who() ? pushState() : Promise.resolve();
    return p.then(function () {
      stu = null; writeStu();
      if (G()) silent(function () { G().reset(); });
      try { localStorage.removeItem('smetko.hw'); } catch (e) {}
      renderHeader();
    });
  }

  /* „Кой играе?“ */
  function picker(opts) {
    opts = opts || {};
    if (!c || !c.profiles.length) return;
    var d = S.modal('<h3>Кой играе?</h3><div class="who-grid">' + c.profiles.map(function (p) {
      return '<button class="who" data-pid="' + p.id + '"' + (p.id === c.pid ? ' aria-current="true"' : '') + '><span class="who-av">' + esc(p.avatar) + '</span><b>' + esc(p.name) + '</b><small>' + p.grade + '. клас</small></button>';
    }).join('') + '</div><p class="hint" style="text-align:center;margin:14px 0 0"><a href="profil.html">Управление на профилите</a></p>');
    d.classList.add('who-modal');
    d.querySelectorAll('[data-pid]').forEach(function (b) { b.addEventListener('click', function () {
      var id = +b.getAttribute('data-pid'); b.disabled = true;
      selectProfile(id).then(function (p) { d.close(); S.toast((p.avatar || '🦉') + ' Здравей, ' + esc(p.name) + '!'); if (opts.go) location.href = opts.go; else if (opts.reload) location.reload(); })
        .catch(function (e) { b.disabled = false; S.toast(esc(e.message)); });
    }); });
  }
  function studentMenu() {
    var d = S.modal('<div class="who-av" style="font-size:3rem">' + esc(stu.avatar) + '</div><h3>Здравей, ' + esc(stu.name) + '!</h3><p>' + esc([stu.cls && stu.cls.name, stu.cls && stu.cls.school].filter(Boolean).join(' · ')) + '</p>' +
      '<p class="hint">Потребител: <b>' + esc(stu.username) + '</b></p><div class="modal-actions"><a class="btn" href="game.html">Играй</a><a class="btn btn-ghost" href="achievements.html">Постижения</a><button class="btn btn-ghost" id="stu-out">🚪 Изход</button></div>');
    d.querySelector('#stu-out').addEventListener('click', function () { studentLogout().then(function () { location.href = 'index.html'; }); });
  }

  /* ---------- хедър ---------- */
  function renderHeader() {
    var p = profile(), logged = !!c, kid = !!stu && !logged;
    document.querySelectorAll('[data-acct]').forEach(function (a) {
      var ico = kid ? stu.avatar : p ? p.avatar : logged ? (c.role === 'teacher' ? '👩‍🏫' : '👤') : '👤';
      var txt = kid ? stu.name : p ? p.name : logged ? (c.name || 'Профил').split(' ')[0] : 'Вход';
      a.href = kid ? '#ученик' : logged ? (c.role === 'teacher' && c.classes && c.classes.length ? 'tablo.html' : 'profil.html') : 'vhod.html';
      a.title = kid ? 'Влязъл е ' + stu.name : logged ? (c.role === 'teacher' ? 'Табло' : 'Моят профил') + (p ? ' · играе ' + p.name : '') : 'Вход';
      a.setAttribute('aria-label', a.title);
      a.classList.toggle('in', logged || kid);
      a.toggleAttribute('data-stu', kid);
      a.innerHTML = '<span class="acct-ico">' + esc(ico) + '</span><span class="acct-txt">' + esc(txt) + '</span>';
    });
    document.querySelectorAll('[data-acct-reg]').forEach(function (a) { a.hidden = logged || kid; });
    document.querySelectorAll('[data-acct-m]').forEach(function (box) {
      box.innerHTML = kid ? '<a class="btn btn-ghost" href="achievements.html">' + esc(stu.avatar + ' ' + stu.name) + '</a><button class="btn btn-teal" data-stu-out>Изход</button>'
        : logged ? (c.role === 'teacher' ? '<a class="btn btn-ghost" href="tablo.html">📋 Табло</a>' : '<a class="btn btn-ghost" href="profil.html">' + esc(p ? p.avatar + ' ' + p.name : '👤 Моят профил') + '</a>') +
          (c.profiles.length > 1 ? '<button class="btn btn-teal" data-who>Смени играча</button>' : '<button class="btn btn-teal" data-logout>Изход</button>')
        : '<a class="btn btn-ghost" href="vhod.html">Вход</a><a class="btn btn-teal" href="registracia.html">Регистрация</a>';
    });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-who],[data-logout],[data-stu],[data-stu-out]'); if (!t) return;
    e.preventDefault();
    if (t.hasAttribute('data-who')) picker({ reload: true });
    else if (t.hasAttribute('data-stu')) studentMenu();
    else if (t.hasAttribute('data-stu-out')) studentLogout().then(function () { location.href = 'index.html'; });
    else logout().then(function () { location.href = 'index.html'; });
  });

  S.Account = { refresh: refresh, login: login, register: register, logout: logout, selectProfile: selectProfile, activate: activate, picker: picker, merge: merge, save: pushState,
    studentLogin: studentLogin, studentLogout: studentLogout, get student() { return stu; }, hasSub: hasSub,
    get data() { return c; }, loggedIn: function () { return !!c; }, profile: profile, api: api, applyMe: applyMe, AVATARS: AVATARS, progressOf: progressOf };

  /* ---------- страници ---------- */
  function err(el, e) { if (el) el.textContent = e.message || String(e); }
  function busy(btn, on, txt) { if (!btn) return; if (on) { btn.dataset.t = btn.textContent; btn.textContent = txt || 'Момент…'; btn.disabled = true; } else { btn.textContent = btn.dataset.t || btn.textContent; btn.disabled = false; } }
  function pwToggle(root) {
    (root || document).querySelectorAll('[data-pw]').forEach(function (b) { b.addEventListener('click', function () { var i = $(b.getAttribute('data-pw')); var show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.textContent = show ? '🙈' : '👁️'; b.setAttribute('aria-label', show ? 'Скрий паролата' : 'Покажи паролата'); }); });
  }
  function home() { return c && c.role === 'teacher' ? 'tablo.html' : 'profil.html'; }
  function afterLogin() { location.href = safeNext(qs('next')) || (pending() ? 'pricing.html#activate' : home()); }
  function pending() { try { return sessionStorage.getItem(PEND) || ''; } catch (e) { return ''; } }
  function setPending(v) { try { if (v) sessionStorage.setItem(PEND, v); else sessionStorage.removeItem(PEND); } catch (e) {} }

  /* ---------- вход с Google (Google Identity Services) – само ако в админ панела има Client ID ---------- */
  var GCRED = 'smetko.gcred';
  function gCid() { var g = (S.siteConfig || {}).google || {}; return /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(g.clientId || '') ? g.clientId : ''; }
  function whenCfg(fn) { if (S.siteConfig) fn(); document.addEventListener('smetko:config', fn); }
  function gis(cb) {
    var cid = gCid(); if (!cid || !/^https?:$/.test(location.protocol)) return;
    if (window.google && google.accounts && google.accounts.id) { cb(cid); return; }
    var s = document.querySelector('script[data-gis]');
    if (!s) { s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.setAttribute('data-gis', '1'); document.head.appendChild(s); }
    s.addEventListener('load', function () { cb(cid); });
  }
  function gButton(box, ctx, onCred) {
    if (!box) return;
    whenCfg(function () {
      gis(function (cid) {
        if (box.dataset.on) return; box.dataset.on = '1';
        google.accounts.id.initialize({ client_id: cid, callback: function (r) { if (r && r.credential) onCred(r.credential); }, ux_mode: 'popup', context: ctx, itp_support: true });
        if (!box.dataset.off) box.hidden = false;
        var w = Math.max(200, Math.min(400, Math.floor((box.clientWidth || box.parentNode.clientWidth || 320))));
        google.accounts.id.renderButton(box.querySelector('.g-btn'), { type: 'standard', theme: 'outline', size: 'large', text: ctx === 'signup' ? 'signup_with' : 'continue_with', shape: 'pill', logo_alignment: 'center', width: w, locale: 'bg' });
      });
    });
  }
  function gPayload(cred) { try { return JSON.parse(decodeURIComponent(escape(atob(cred.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))); } catch (e) { return null; } }
  function gStore(v) { try { if (v) sessionStorage.setItem(GCRED, v); else sessionStorage.removeItem(GCRED); } catch (e) {} }
  function gStored() { try { var v = sessionStorage.getItem(GCRED) || '', p = v && gPayload(v); return p && p.exp * 1000 > Date.now() + 60000 ? v : ''; } catch (e) { return ''; } }
  function google_(cred, extra) { var d = Object.assign({ action: 'google', credential: cred }, extra || {}); return api(d).then(function (j) { applyMe(j); return j; }); }
  S.Account && (S.Account.google = google_);

  function initLogin() {
    var tabs = document.querySelectorAll('[data-lt]');
    function tab(k) { tabs.forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-lt') === k)); }); $('login-form').hidden = k !== 'adult'; $('kid-form').hidden = k !== 'kid'; }
    tabs.forEach(function (b) { b.addEventListener('click', function () { tab(b.getAttribute('data-lt')); }); });
    if (location.hash === '#uchenik' || qs('kid')) tab('kid');
    var f = $('login-form'), e = $('login-err'), btn = f.querySelector('button[type=submit]');
    if (c && !qs('kid')) { location.replace(safeNext(qs('next')) || home()); return; }
    f.addEventListener('submit', function (ev) {
      ev.preventDefault(); e.textContent = ''; busy(btn, true, 'Влизам…');
      login($('l-email').value.trim(), $('l-pass').value).then(afterLogin).catch(function (x) { err(e, x); busy(btn, false); });
    });
    gButton($('g-login'), 'signin', function (cred) {
      e.textContent = ''; busy(btn, true, 'Влизам с Google…');
      google_(cred).then(afterLogin).catch(function (x) {
        busy(btn, false);
        if (x.needTerms) { gStore(cred); location.href = 'registracia.html?g=1' + (qs('next') ? '&next=' + encodeURIComponent(qs('next')) : ''); return; }
        err(e, x);
      });
    });
    var k = $('kid-form'), ke = $('kid-err'), kb = k.querySelector('button[type=submit]');
    k.addEventListener('submit', function (ev) {
      ev.preventDefault(); ke.textContent = ''; busy(kb, true, 'Влизам…');
      studentLogin($('k-user').value.trim().toLowerCase(), $('k-pass').value.trim().toLowerCase()).then(function (j) {
        S.toast(esc(j.student.avatar) + ' Здравей, ' + esc(j.student.name) + '!'); setTimeout(function () { location.href = 'game.html'; }, 500);
      }).catch(function (x) { err(ke, x); busy(kb, false); });
    });
  }
  function initRegister() {
    var f = $('reg-form'), e = $('reg-err'), btn = f.querySelector('button[type=submit]');
    if (c) { location.replace(home()); return; }
    if (qs('role') === 'teacher') { var t = f.querySelector('input[name=role][value=teacher]'); if (t) t.checked = true; }
    if (pending()) { var n = $('reg-pending'); if (n) { n.hidden = false; n.querySelector('b').textContent = pending(); } }
    function roleNow() { return (f.querySelector('input[name=role]:checked') || {}).value || 'parent'; }
    function done(role) { if (S.track) S.track('sign_up', { method: 'google' }); location.href = safeNext(qs('next')) || (pending() ? 'pricing.html#activate' : (role === 'teacher' ? 'tablo.html?new=1' : 'profil.html?new=1')); }
    var gWait = '', gBox = $('g-reg');
    function gGo(cred) {
      e.textContent = '';
      if (!$('r-terms').checked) { // първо съгласие с условията – после продължаваме автоматично
        gWait = cred; gStore(cred); showG(cred);
        e.textContent = 'Още една стъпка: отметнете съгласието с Общите условия по-долу.'; $('r-terms').focus(); return;
      }
      var role = roleNow(); busy(btn, true, 'Създавам акаунта…');
      google_(cred, { role: role, terms: 1 }).then(function (j) { gStore(''); if (j.google === 'login') location.href = safeNext(qs('next')) || home(); else done(role); })
        .catch(function (x) { busy(btn, false); err(e, x); if (/Google/.test(x.message)) { gWait = ''; gStore(''); } });
    }
    function showG(cred) {
      var p = gPayload(cred), n = $('reg-g'); if (!p || !n) return;
      n.hidden = false; n.querySelector('b').textContent = p.email || '';
      ['r-name', 'r-email', 'r-pass'].forEach(function (id) { var i = $(id); i.required = false; i.closest('.pw-wrap') ? i.closest('.pw-wrap').hidden = true : (i.hidden = true); var l = f.querySelector('label[for=' + id + ']'); if (l) l.hidden = true; });
      if (gBox) { gBox.hidden = true; gBox.dataset.off = '1'; }
      btn.textContent = 'Създай акаунт с Google';
    }
    $('r-terms').addEventListener('change', function () { if (this.checked && gWait) gGo(gWait); });
    gButton(gBox, 'signup', gGo);
    var g0 = gStored(); if (g0) { gWait = g0; showG(g0); }
    var gCancel = $('reg-g-x'); if (gCancel) gCancel.addEventListener('click', function () { gWait = ''; gStore(''); location.replace('registracia.html' + (qs('role') ? '?role=' + qs('role') : '')); });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault(); e.textContent = '';
      var role = roleNow();
      if (gWait) { if (!$('r-terms').checked) { e.textContent = 'Отметнете съгласието с Общите условия.'; $('r-terms').focus(); return; } gGo(gWait); return; }
      if ($('r-pass').value.length < 8) { e.textContent = 'Паролата трябва да е поне 8 знака.'; $('r-pass').focus(); return; }
      busy(btn, true, 'Създавам акаунта…');
      register({ role: role, name: $('r-name').value.trim(), email: $('r-email').value.trim(), password: $('r-pass').value, terms: $('r-terms').checked ? 1 : 0 })
        .then(function () { if (S.track) S.track('sign_up', { method: 'email' }); location.href = safeNext(qs('next')) || (pending() ? 'pricing.html#activate' : (role === 'teacher' ? 'tablo.html?new=1' : 'profil.html?new=1')); })
        .catch(function (x) { err(e, x); busy(btn, false); var fld = { email: 'r-email', name: 'r-name', password: 'r-pass', terms: 'r-terms' }[x.field]; if (fld && $(fld)) $(fld).focus(); });
    });
  }
  function initForgot() {
    var tok = qs('t'), f1 = $('forgot-form'), f2 = $('reset-form');
    if (tok && /^[a-f0-9]{48}$/.test(tok)) {
      f1.hidden = true; f2.hidden = false;
      var e2 = $('reset-err'), b2 = f2.querySelector('button[type=submit]');
      f2.addEventListener('submit', function (ev) {
        ev.preventDefault(); e2.textContent = '';
        if ($('n-pass').value.length < 8) { e2.textContent = 'Паролата трябва да е поне 8 знака.'; return; }
        busy(b2, true);
        api({ action: 'reset', token: tok, password: $('n-pass').value }).then(applyMe).then(function () { location.href = home(); }).catch(function (x) { err(e2, x); busy(b2, false); });
      });
      return;
    }
    var e1 = $('forgot-err'), b1 = f1.querySelector('button[type=submit]');
    f1.addEventListener('submit', function (ev) {
      ev.preventDefault(); e1.textContent = ''; busy(b1, true, 'Изпращам…');
      api({ action: 'forgot', email: $('f-email').value.trim() }).then(function () {
        f1.innerHTML = '<div class="acct-done"><div class="owl" data-owl="happy" style="width:120px;margin:0 auto"></div><h2>Проверете пощата си</h2><p>Ако има акаунт с <b>' + esc($('f-email').value.trim()) + '</b>, изпратихме връзка за нова парола. Тя важи 1 час. Проверете и папка „Спам“.</p><p><a class="btn btn-ghost" href="vhod.html">Към входа</a></p></div>';
        if (S.renderOwls) S.renderOwls(f1);
      }).catch(function (x) { err(e1, x); busy(b1, false); });
    });
  }

  /* ---------- „Абонаменти“: въвеждане на код (само тук) ---------- */
  function initActivate() {
    var f = $('act-form'), inp = $('act-code'), e = $('act-err'), btn = f.querySelector('button[type=submit]'), out = $('act-ok');
    if (S.bindCodeInput) S.bindCodeInput(inp);
    function state() {
      var who = $('act-who');
      if (stu && !c) { who.innerHTML = 'Влязъл си като ученик (' + esc(stu.name) + '). Абонаментът на класа е от учителя ти.'; f.hidden = true; return; }
      who.innerHTML = c ? 'Кодът ще се активира в акаунта <b>' + esc(c.email) + '</b>.' : 'За да активирате кода, ще трябва да <a href="vhod.html?next=pricing.html%23activate">влезете</a> или да си <a href="registracia.html?next=pricing.html%23activate">направите безплатен акаунт</a>.';
      var subs = c ? (c.subs || []).filter(function (s) { return s.valid; }) : [];
      $('act-subs').innerHTML = subs.length ? '<p class="act-have">✅ Активни абонаменти: ' + subs.map(function (s) { return '<b>' + esc(plan(s.type)) + '</b> (' + esc(s.typeName) + ') до ' + fmt(s.expires); }).join(', ') + '</p>' : '';
    }
    state();
    f.addEventListener('submit', function (ev) {
      ev.preventDefault(); e.textContent = '';
      var code = S.fmtCode ? S.fmtCode(inp.value) : inp.value.trim();
      if (code.replace(/[^A-Z0-9]/gi, '').length !== 12) { e.textContent = 'Кодът има 8 знака след SMET, напр. SMET-AB2C-D3EF.'; inp.focus(); return; }
      if (!c) { setPending(code); location.href = 'registracia.html?next=pricing.html%23activate'; return; }
      busy(btn, true, 'Активирам…');
      activate(code).then(function (j) {
        setPending(''); f.hidden = true; out.hidden = false;
        var a = j.activated, cls = a.type === 'class';
        out.innerHTML = '<div class="owl" data-owl="cheer" style="width:120px;margin:0 auto"></div><h2>Абонаментът е активен! 🎉</h2><p class="lead-dark"><b>' + esc(plan(a.type)) + '</b> (' + esc(a.typeName) + ') · до <b>' + fmt(a.expires) + '</b></p>' +
          (cls ? '<p>Отворете Таблото, впишете класа и добавете учениците – всеки получава потребител и парола за вход.</p><div class="hero-cta" style="justify-content:center"><a class="btn btn-lg" href="tablo.html?c=' + a.classId + '">📋 Към Таблото</a></div>'
            : '<p>' + (a.type === 'family' ? 'Абонаментът важи за до 4 деца в профила ви – на всяко устройство, на което влезете.' : 'Абонаментът важи за едно дете в профила ви – на всяко устройство.') + '</p><div class="hero-cta" style="justify-content:center">' +
              ((j.profiles || []).length ? '<a class="btn btn-lg" href="game.html">▶ Играй</a><a class="btn btn-ghost" href="profil.html">Моят профил</a>' : '<a class="btn btn-lg" href="profil.html?new=1">➕ Добави дете</a>') + '</div>');
        if (S.renderOwls) S.renderOwls(out); if (S.confetti) S.confetti(); if (S.Audio) S.Audio.win();
      }).catch(function (x) { err(e, x); busy(btn, false); });
    });
    var pc = pending();
    if (pc) { inp.value = pc; if (c) { f.scrollIntoView({ block: 'center' }); f.requestSubmit ? f.requestSubmit() : btn.click(); } }
    if (location.hash === '#activate') setTimeout(function () { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (!pc) inp.focus({ preventScroll: true }); }, 300);
  }

  /* ---------- „Моят профил“ ---------- */
  function avatarPick(cur, name) {
    return '<div class="av-pick" role="radiogroup" aria-label="Картинка">' + AVATARS.map(function (a, i) { return '<label><input type="radio" name="' + name + '" value="' + a + '"' + ((cur ? a === cur : i === 0) ? ' checked' : '') + '><span>' + a + '</span></label>'; }).join('') + '</div>';
  }
  function gradeSel(id, cur) { return '<select class="input" id="' + id + '">' + [1, 2, 3, 4].map(function (g) { return '<option value="' + g + '"' + (g === cur ? ' selected' : '') + '>' + g + '. клас</option>'; }).join('') + '</select>'; }

  function renderPage(j) {
    var box = $('acct-page'); if (!box) return;
    if (!j || !j.account) { location.replace('vhod.html?next=profil.html'); return; }
    var A = j.account, P = j.profiles || [], cur = c && c.pid, subs = (j.subs || []).filter(function (s) { return s.type !== 'class'; }), vsub = subs.filter(function (s) { return s.valid; })[0];
    var h = '<div class="acct-head panel"><div><h2>Здравейте, ' + esc(A.name.split(' ')[0]) + '! 👋</h2><p class="hint">' + esc(A.email) + ' · от ' + fmt(A.since) + '</p></div><button class="btn btn-ghost btn-sm" data-logout>🚪 Изход</button></div>';
    var fresh = qs('new') && !P.length;
    if (qs('new') && !fresh && history.replaceState) history.replaceState(null, '', 'profil.html');
    if (fresh) h += '<div class="acct-welcome panel"><b>🎉 Акаунтът е създаден!</b> Добавете профил за детето си. Ако имате абонамент, активирайте кода в <a href="pricing.html#activate">„Абонаменти“</a> – той важи за детето на всяко устройство.</div>';
    // абонамент
    h += '<section class="acct-sec"><div class="sub-card panel' + (vsub ? ' on' : '') + '">' + (vsub
      ? '<div><small>Абонамент</small><b>' + esc(plan(vsub.type)) + ' <span class="hint">(' + esc(vsub.typeName) + ')</span></b><span>до ' + fmt(vsub.expires) + ' · включени деца: ' + vsub.used + ' от ' + vsub.seats + '</span></div><a class="btn btn-sm btn-ghost" href="pricing.html">Поднови</a>'
      : '<div><small>Абонамент</small><b>Безплатен план</b><span>' + (subs.length ? 'Абонаментът изтече на ' + fmt(subs[0].expires) + '.' : 'Всички мисии, точки, значки и класации – с абонамент.') + '</span></div><a class="btn btn-sm" href="pricing.html">Абонаменти</a>') + '</div>';
    if (j.classes && j.classes.length) h += '<div class="sub-card panel on"><div><small>Класове</small><b>' + j.classes.length + (j.classes.length === 1 ? ' клас' : ' класа') + '</b><span>' + esc(j.classes.map(function (k) { return k.name; }).join(' · ')) + '</span></div><a class="btn btn-sm" href="tablo.html">📋 Табло</a></div>';
    h += '</section>';
    var local = progressOf(G().state), canImport = !owner(G().state) && (local.answered > 0 || local.stars > 0);
    h += '<section class="acct-sec" id="kids"><h2 class="lined">👧 Детски профили <small>' + P.length + '/4</small></h2>' +
      '<div class="pf-grid">' + P.map(function (p) {
        var on = p.id === cur, inc = p.plan && p.plan.valid;
        return '<div class="pf-card panel' + (on ? ' on' : '') + '"><div class="pf-top"><span class="pf-av">' + esc(p.avatar) + '</span><div><b>' + esc(p.name) + '</b><small>' + p.grade + '. клас' + (on ? ' · <span class="tag">играе тук</span>' : '') + '</small></div><button class="icon-btn pf-edit" data-edit="' + p.id + '" aria-label="Редактирай профила">✏️</button></div>' +
          (inc ? '<span class="pf-plan ok">✓ С абонамент</span>' : vsub ? '<span class="pf-plan free">Не е в абонамента</span>' : '<span class="pf-plan free">Безплатен план</span>') +
          '<div class="pf-stats"><span>★ ' + p.points + '</span><span>' + p.answered + ' задачи</span><span>' + (p.answered ? Math.round(p.correct / p.answered * 100) : 0) + '% точност</span></div>' +
          '<div class="pf-act"><button class="btn btn-sm btn-green" data-play="' + p.id + '">▶ Играй</button><button class="btn btn-sm btn-ghost" data-rep="' + p.id + '">📊 Отчет</button>' + (!inc && vsub ? '<button class="btn btn-sm btn-ghost" data-plan="' + p.id + '">Включи в абонамента</button>' : '') + '</div></div>';
      }).join('') +
      (P.length < 4 ? '<button class="pf-card pf-add panel" id="pf-add"><span>＋</span><b>Добави дете</b></button>' : '') + '</div>' +
      '<form class="panel tool-panel" id="pf-form" hidden autocomplete="off"><h3>Нов профил</h3><div class="tool-grid"><label>Име или прякор на детето<input id="pf-name" class="input" maxlength="30" placeholder="напр. Ники" required></label><label>Клас' + gradeSel('pf-grade', G().state.lastGrade || 1) + '</label></div>' +
      '<p class="step-label">Картинка</p>' + avatarPick('', 'pf-av') +
      (canImport ? '<label class="check"><input type="checkbox" id="pf-import" checked> Прехвърли прогреса от това устройство (' + local.answered + ' задачи, ' + local.stars + ' ★)</label>' : '') +
      '<div class="ws-actions"><span class="hint">Без фамилия – името се вижда само от вас (и в класацията като прякор).</span><button class="btn" type="submit">Създай профила</button></div><p class="code-err" id="pf-err" role="alert"></p></form></section>';
    h += '<section class="acct-sec" id="settings"><h2 class="lined">⚙️ Акаунт</h2><div class="acct-set">' +
      '<details class="panel"><summary>Име</summary><form id="nm-form"><input id="nm-name" class="input" maxlength="60" value="' + esc(A.name) + '" required><button class="btn btn-sm" type="submit">Запази</button></form></details>' +
      (A.google ? '<p class="hint g-note">🔗 Свързан с Google профила ви – може да влизате с бутона „Вход с Google“.</p>' : '') +
      '<details class="panel"><summary>' + (A.hasPass === false ? 'Задайте парола (по желание)' : 'Смяна на паролата') + '</summary><form id="pw-form">' + (A.hasPass === false ? '<p class="hint">Влизате с Google. Ако искате да влизате и с имейл и парола, задайте парола тук.</p>' : '<input id="pw-old" class="input" type="password" autocomplete="current-password" placeholder="Текуща парола" required>') + '<input id="pw-new" class="input" type="password" autocomplete="new-password" minlength="8" placeholder="Нова парола (поне 8 знака)" required><button class="btn btn-sm" type="submit">Смени</button><p class="code-err" id="pw-err" role="alert"></p></form></details>' +
      '<details class="panel"><summary>Изтриване на акаунта</summary><form id="del-form"><p class="hint">Изтриват се акаунтът, детските профили и запазеният прогрес. Това не може да се върне.</p>' + (A.hasPass === false ? '<input id="del-pass" class="input" type="email" autocomplete="off" placeholder="Напишете имейла си за потвърждение" required>' : '<input id="del-pass" class="input" type="password" autocomplete="current-password" placeholder="Парола за потвърждение" required>') + '<button class="btn btn-sm btn-red" type="submit">Изтрий акаунта завинаги</button><p class="code-err" id="del-err" role="alert"></p></form></details>' +
      '</div></section>';
    box.innerHTML = h;
    bindPage(j);
  }

  function bindPage(j) {
    var box = $('acct-page'), P = j.profiles || [];
    function byId(id) { return P.filter(function (p) { return p.id === id; })[0]; }
    function reload(r) { applyMe(r); renderPage(r); }
    var add = $('pf-add'), pf = $('pf-form');
    if (add) add.addEventListener('click', function () { pf.hidden = false; add.hidden = true; $('pf-name').focus(); pf.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    if (pf) {
      if (qs('new') && !P.length && add) add.click();
      pf.addEventListener('submit', function (ev) {
        ev.preventDefault(); var b = pf.querySelector('button[type=submit]'); busy(b, true);
        var imp = $('pf-import') && $('pf-import').checked;
        var d = { action: 'profile_add', name: $('pf-name').value.trim(), grade: +$('pf-grade').value, avatar: (pf.querySelector('input[name=pf-av]:checked') || {}).value };
        if (imp) d.state = payload();
        api(d).then(function (r) {
          applyMe(r);
          var go = imp || !c.pid ? selectProfile(r.id) : Promise.resolve(); // първият профил на устройството играе тук веднага
          return go.then(function () { return api(); }).then(reload);
        }).catch(function (x) { err($('pf-err'), x); busy(b, false); });
      });
    }
    box.querySelectorAll('[data-play]').forEach(function (b) { b.addEventListener('click', function () {
      busy(b, true); selectProfile(+b.getAttribute('data-play')).then(function () { location.href = 'game.html'; }).catch(function (x) { busy(b, false); S.toast(esc(x.message)); });
    }); });
    box.querySelectorAll('[data-plan]').forEach(function (b) { b.addEventListener('click', function () {
      api({ action: 'profile_plan', id: +b.getAttribute('data-plan') }).then(function (r) { S.toast('✓ Абонаментът е преместен'); reload(r); var p = profile(); if (p) selectProfile(p.id); }).catch(function (x) { S.toast(esc(x.message)); });
    }); });
    box.querySelectorAll('[data-rep]').forEach(function (b) { b.addEventListener('click', function () {
      var p = byId(+b.getAttribute('data-rep')); if (!p || !S.Report) return;
      var d = S.modal('<div id="rep-m"></div><div class="modal-actions"><button class="btn btn-ghost" onclick="window.print()">🖨️ Печат</button></div>'); d.classList.add('wide-modal');
      S.Report.render(d.querySelector('#rep-m'), { nickname: p.name, grade: p.grade, answered: p.answered, correct: p.correct, stars: p.stars, missions: p.missions, skills: p.skills, days: p.days });
    }); });
    box.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () {
      var p = byId(+b.getAttribute('data-edit'));
      var d = S.modal('<h3>✏️ ' + esc(p.name) + '</h3><form id="ed-form"><label class="step-label">Име или прякор<input id="ed-name" class="input" maxlength="30" value="' + esc(p.name) + '" required></label><label class="step-label">Клас' + gradeSel('ed-grade', p.grade) + '</label><p class="step-label">Картинка</p>' + avatarPick(p.avatar, 'ed-av') +
        '<div class="modal-actions"><button class="btn btn-ghost btn-red-text" type="button" id="ed-del">Изтрий профила</button><button class="btn" type="submit">Запази</button></div></form>');
      d.querySelector('#ed-form').addEventListener('submit', function (ev) {
        ev.preventDefault();
        api({ action: 'profile_update', id: p.id, name: d.querySelector('#ed-name').value.trim(), grade: +d.querySelector('#ed-grade').value, avatar: (d.querySelector('input[name=ed-av]:checked') || {}).value }).then(function (r) { d.close(); reload(r); }).catch(function (x) { S.toast(esc(x.message)); });
      });
      d.querySelector('#ed-del').addEventListener('click', function () {
        var sure = d.querySelector('#ed-del');
        if (!sure.dataset.sure) { sure.dataset.sure = '1'; sure.textContent = 'Сигурни ли сте? Натиснете пак'; return; }
        api({ action: 'profile_delete', id: p.id }).then(function (r) { d.close(); if (c && c.pid === p.id) { c.pid = 0; write(); silent(function () { G().reset(); }); } reload(r); }).catch(function (x) { S.toast(esc(x.message)); });
      });
    }); });
    $('nm-form').addEventListener('submit', function (ev) { ev.preventDefault(); api({ action: 'update', name: $('nm-name').value.trim() }).then(function () { return api(); }).then(function (r) { S.toast('Запазено ✓'); reload(r); }).catch(function (x) { S.toast(esc(x.message)); }); });
    $('pw-form').addEventListener('submit', function (ev) {
      ev.preventDefault(); $('pw-err').textContent = '';
      api({ action: 'password', old: $('pw-old') ? $('pw-old').value : '', password: $('pw-new').value }).then(function () { S.toast('✓ Паролата е ' + (j.account.hasPass === false ? 'зададена.' : 'сменена. Другите устройства са изведени.')); $('pw-form').reset(); if (j.account.hasPass === false) setTimeout(function () { location.reload(); }, 1200); }).catch(function (x) { err($('pw-err'), x); });
    });
    $('del-form').addEventListener('submit', function (ev) {
      ev.preventDefault(); $('del-err').textContent = '';
      api({ action: 'delete', password: $('del-pass').value }).then(function () { localLogout(); location.href = 'index.html'; }).catch(function (x) { err($('del-err'), x); });
    });
  }

  function initPage() {
    var box = $('acct-page');
    box.innerHTML = '<p class="hint" style="text-align:center">Зареждам…</p>';
    if (!online) { box.innerHTML = '<p class="lead-dark" style="text-align:center">Нужна е интернет връзка.</p>'; return; }
    api().then(function (j) { applyMe(j); renderPage(j); }).catch(function (e) { box.innerHTML = '<p class="code-err" style="text-align:center">' + esc(e.message) + '</p>'; });
  }

  renderHeader();
  document.addEventListener('DOMContentLoaded', function () {
    renderHeader(); pwToggle();
    if ($('login-form')) initLogin();
    if ($('reg-form')) initRegister();
    if ($('forgot-form')) initForgot();
    if ($('acct-page')) { initPage(); return; }
    var go = refresh();
    if ($('act-form')) go.then(initActivate);
    go.then(function () {
      // родител влезе на ново устройство и отвори игра: „Кой играе?“
      if (c && c.profiles.length && !c.pid && !stu && document.body.classList.contains('game-page') && !document.querySelector('dialog[open]')) picker({ reload: true });
    });
  });
})();
