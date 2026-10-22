/* Сметко — акаунти за родители и учители (/api/account.php).
   Родител: детски профили; прогресът на профила се пази на сървъра и детето продължава от всяко устройство.
   Учител: класовете му (код + ПИН) са запомнени в акаунта. Децата от клас влизат с личния си код както досега. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var KEY = 'smetko.acct', CHK = 'smetko.acctChk';
  var online = /^https?:$/.test(location.protocol);
  var AVATARS = ['🦉', '🦊', '🐻', '🐰', '🐼', '🐯', '🦁', '🐸', '🐵', '🐧', '🦄', '🐙', '🐢', '🐝', '🚀', '⚽'];
  var c = null; // {name, email, role, since, profiles:[{id,name,avatar,grade}], classes:[], pid, rev, t, board}
  try { c = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]; }); }
  function write() { try { if (c) localStorage.setItem(KEY, JSON.stringify(c)); else localStorage.removeItem(KEY); } catch (e) {} }
  function G() { return S.Game; }
  function today() { return G() ? G().today() : new Date().toISOString().slice(0, 10); }
  function fmt(d) { return S.fmtDate ? S.fmtDate(d) : d; }
  function qs(k) { return new URLSearchParams(location.search).get(k); }
  function safeNext(n) { return n && /^[a-z0-9-]+\.html([?#][\w=&%.-]*)?$/i.test(n) ? n : ''; }

  function api(data, keepalive) {
    if (!online) return Promise.reject(new Error('Нужна е интернет връзка.'));
    var o = data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'same-origin', keepalive: !!keepalive } : { credentials: 'same-origin', cache: 'no-store' };
    return fetch('/api/account.php', o).then(function (r) { return r.json().catch(function () { throw new Error('Сървърът не отговаря. Опитайте пак след малко.'); }); })
      .then(function (j) { if (!j.ok) { var e = new Error(j.error || 'Грешка.'); e.field = j.field; e.auth = j.auth; throw e; } return j; });
  }

  /* ---------- прогрес: сливане на две състояния (на устройството и на сървъра) ---------- */
  function mx(a, b) { return Math.max(+a || 0, +b || 0); }
  function merge(a, b) {
    if (!b || typeof b !== 'object') return a; if (!a || typeof a !== 'object') return b;
    var m = JSON.parse(JSON.stringify(b)), k, i;
    ['points', 'correct', 'answered', 'practiceCorrect', 'maxCombo', 'tableStreak'].forEach(function (x) { m[x] = mx(a[x], b[x]); });
    ['badges', 'modes'].forEach(function (x) { m[x] = Object.assign({}, a[x] || {}, b[x] || {}); });
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

  /* ---------- запис на прогреса на профила ---------- */
  var timer = null, saving = false, again = false;
  function active() { var st = G() && G().state; return !!(c && c.pid && st && st.profileId === c.pid); }
  function payload() { var st = JSON.parse(JSON.stringify(G().state)); delete st.access; delete st.deviceId; delete st.accessLost; return st; }
  function pushState(keepalive) {
    if (!active() || !online) return Promise.resolve();
    if (saving) { again = true; return Promise.resolve(); }
    saving = true; clearTimeout(timer); timer = null;
    var pid = c.pid;
    return api({ action: 'save_state', id: pid, rev: c.rev || 0, state: payload() }, keepalive).then(function (j) {
      if (!c || c.pid !== pid) return;
      if (j.conflict) { // друго устройство е записало междувременно – сливаме и записваме пак
        c.rev = j.rev; write();
        if (j.state) { var keep = { access: G().state.access, deviceId: G().state.deviceId }; var m = merge(G().state, j.state); m.access = keep.access; m.deviceId = keep.deviceId; m.profileId = pid; silent(function () { G().replace(m); }); }
        again = true; return;
      }
      c.rev = j.rev; write();
    }).catch(function (e) { if (e.auth === false) localLogout(); }).then(function () { saving = false; if (again) { again = false; schedule(1500); } });
  }
  var mute = false;
  function silent(fn) { mute = true; try { fn(); } finally { mute = false; } }
  function schedule(ms) { if (!timer) timer = setTimeout(function () { timer = null; pushState(); }, ms); }
  S.onSave = function () { if (!mute && active()) schedule(8000); };
  function flush() { if (timer && active()) { clearTimeout(timer); timer = null; pushState(true); } }
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });

  /* ---------- данни за акаунта ---------- */
  function applyMe(j) {
    if (!j.account) { if (c) localLogout(); try { localStorage.setItem(CHK, String(Date.now())); } catch (e) {} return null; }
    var old = c || {};
    c = { name: j.account.name, email: j.account.email, role: j.account.role, since: j.account.since, t: Date.now(), pid: old.pid || 0, rev: old.rev || 0, board: old.board || false,
      profiles: (j.profiles || []).map(function (p) { return { id: p.id, name: p.name, avatar: p.avatar, grade: p.grade, plan: p.plan }; }), classes: j.classes || [] };
    if (c.pid && !c.profiles.some(function (p) { return p.id === c.pid; })) { c.pid = 0; c.rev = 0; }
    // учител: класацията на класа се отваря без повторно въвеждане на кода и ПИН-а
    try { if (c.classes.length && !localStorage.getItem('smetko.board')) { localStorage.setItem('smetko.board', JSON.stringify({ c: c.classes[0].code, p: c.classes[0].pin })); c.board = true; } } catch (e) {}
    write(); renderHeader();
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
    var wasProfile = active();
    try { if (c && c.board) localStorage.removeItem('smetko.board'); localStorage.removeItem('smetko.rp'); } catch (e) {}
    c = null; write();
    if (wasProfile && G()) silent(function () { G().reset(); }); // споделено устройство: прогресът на детето не остава след изход
    renderHeader();
  }

  function login(email, password) { return api({ action: 'login', email: email, password: password }).then(applyMe); }
  function register(d) { d.action = 'register'; return api(d).then(applyMe); }
  function logout() {
    var p = active() ? pushState() : Promise.resolve();
    return p.then(function () { return api({ action: 'logout' }).catch(function () {}); }).then(function () { localLogout(); });
  }

  /* избор на детски профил на това устройство */
  function selectProfile(id) {
    var before = active() ? pushState() : Promise.resolve();
    return before.then(function () { return api({ action: 'profile_get', id: id }); }).then(function (j) {
      var st = G().state, mine = st.profileId === id, anon = !st.profileId, local = JSON.parse(JSON.stringify(st));
      var localAccess = st.access, localDevice = st.deviceId;
      var next = j.state && typeof j.state === 'object' ? j.state : null;
      if (mine || anon) next = merge(local, next); // първи избор на устройството: досегашната игра влиза в профила
      next = next || G().fresh();
      delete next.accessLost; delete next.freeCleaned;
      next.profileId = id; next.deviceId = j.device;
      if (!next.nickname) next.nickname = j.profile.name;
      if (!next.lastGrade) next.lastGrade = j.profile.grade;
      if (j.access && j.access.valid) next.access = { code: j.access.code, type: j.access.type, typeName: j.access.typeName, role: j.access.role, expires: j.access.expires, token: j.access.token, label: j.access.label, checked: today() };
      else delete next.access;
      c.pid = id; c.rev = j.rev; write();
      silent(function () { G().replace(next); });
      var moved = Promise.resolve();
      if (anon && localAccess && !j.access && localAccess.expires >= today()) // код, въведен на устройството преди акаунта → прехвърля се в профила
        moved = api({ action: 'link_code', id: id, code: localAccess.code, device: localDevice }).then(function (r) {
          if (r.access) { var s = G().state; s.access = { code: r.access.code, type: r.access.type, typeName: r.access.typeName, role: r.access.role, expires: r.access.expires, token: r.access.token, label: r.access.label, checked: today() }; silent(function () { G().save(); }); applyMe(r); }
        }).catch(function () {});
      return moved.then(function () { return pushState(); }).then(function () {
        renderHeader(); if (S.updateChip) S.updateChip(); if (S.Access) S.Access.sync(true);
        return j.profile;
      });
    });
  }
  function linkCode(id, code) {
    var st = G().state;
    return api({ action: 'link_code', id: id, code: code, device: st.access && st.access.code === code ? st.deviceId : (st.deviceId || '') }).then(function (j) {
      applyMe(j);
      return selectProfile(id).then(function () { return j; });
    });
  }
  function profile() { if (!c || !c.pid) return null; for (var i = 0; i < c.profiles.length; i++) if (c.profiles[i].id === c.pid) return c.profiles[i]; return null; }

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

  /* ---------- хедър ---------- */
  function renderHeader() {
    var p = profile(), logged = !!c;
    document.querySelectorAll('[data-acct]').forEach(function (a) {
      var ico = p ? p.avatar : logged ? (c.role === 'teacher' ? '👩‍🏫' : '👤') : '👤';
      var txt = p ? p.name : logged ? (c.name || 'Профил').split(' ')[0] : 'Вход';
      a.href = logged ? 'profil.html' : 'vhod.html';
      a.title = logged ? 'Моят профил' + (p ? ' · играе ' + p.name : '') : 'Вход за родители и учители';
      a.setAttribute('aria-label', a.title);
      a.classList.toggle('in', logged);
      a.innerHTML = '<span class="acct-ico">' + esc(ico) + '</span><span class="acct-txt">' + esc(txt) + '</span>';
    });
    document.querySelectorAll('[data-acct-reg]').forEach(function (a) { a.hidden = logged; });
    document.querySelectorAll('[data-acct-m]').forEach(function (box) {
      box.innerHTML = logged ? '<a class="btn btn-ghost" href="profil.html">' + esc(p ? p.avatar + ' ' + p.name : '👤 Моят профил') + '</a>' + (c.profiles.length > 1 ? '<button class="btn btn-teal" data-who>Смени играча</button>' : '<button class="btn btn-teal" data-logout>Изход</button>')
        : '<a class="btn btn-ghost" href="vhod.html">Вход</a><a class="btn btn-teal" href="registracia.html">Регистрация</a>';
    });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-who],[data-logout]'); if (!t) return;
    e.preventDefault();
    if (t.hasAttribute('data-who')) picker({ reload: true });
    else logout().then(function () { location.href = 'index.html'; });
  });

  S.Account = { refresh: refresh, login: login, register: register, logout: logout, selectProfile: selectProfile, linkCode: linkCode, picker: picker, merge: merge, save: pushState,
    get data() { return c; }, loggedIn: function () { return !!c; }, profile: profile, api: api, applyMe: applyMe, AVATARS: AVATARS, progressOf: progressOf };

  /* ---------- страници ---------- */
  function err(el, e) { if (el) el.textContent = e.message || String(e); }
  function busy(btn, on, txt) { if (!btn) return; if (on) { btn.dataset.t = btn.textContent; btn.textContent = txt || 'Момент…'; btn.disabled = true; } else { btn.textContent = btn.dataset.t || btn.textContent; btn.disabled = false; } }
  function pwToggle(root) {
    (root || document).querySelectorAll('[data-pw]').forEach(function (b) { b.addEventListener('click', function () { var i = $(b.getAttribute('data-pw')); var show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.textContent = show ? '🙈' : '👁️'; b.setAttribute('aria-label', show ? 'Скрий паролата' : 'Покажи паролата'); }); });
  }
  function afterLogin() { location.href = safeNext(qs('next')) || 'profil.html'; }

  function initLogin() {
    var f = $('login-form'), e = $('login-err'), btn = f.querySelector('button[type=submit]');
    if (c) { location.replace(safeNext(qs('next')) || 'profil.html'); return; }
    f.addEventListener('submit', function (ev) {
      ev.preventDefault(); e.textContent = ''; busy(btn, true, 'Влизам…');
      login($('l-email').value.trim(), $('l-pass').value).then(afterLogin).catch(function (x) { err(e, x); busy(btn, false); });
    });
  }
  function initRegister() {
    var f = $('reg-form'), e = $('reg-err'), btn = f.querySelector('button[type=submit]');
    if (c) { location.replace('profil.html'); return; }
    if (qs('role') === 'teacher') { var t = f.querySelector('input[name=role][value=teacher]'); if (t) t.checked = true; }
    f.addEventListener('submit', function (ev) {
      ev.preventDefault(); e.textContent = '';
      var role = (f.querySelector('input[name=role]:checked') || {}).value || 'parent';
      if ($('r-pass').value.length < 8) { e.textContent = 'Паролата трябва да е поне 8 знака.'; $('r-pass').focus(); return; }
      busy(btn, true, 'Създавам акаунта…');
      register({ role: role, name: $('r-name').value.trim(), email: $('r-email').value.trim(), password: $('r-pass').value, terms: $('r-terms').checked ? 1 : 0 })
        .then(function () { location.href = 'profil.html?new=1'; })
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
        api({ action: 'reset', token: tok, password: $('n-pass').value }).then(applyMe).then(function () { location.href = 'profil.html'; }).catch(function (x) { err(e2, x); busy(b2, false); });
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

  /* ---------- „Моят профил“ ---------- */
  function planLine(p) {
    if (p.plan && p.plan.valid) return '<span class="pf-plan ok">✓ ' + esc(S.planName ? S.planName(p.plan.type) : p.plan.typeName) + ' · до ' + fmt(p.plan.expires) + '</span>';
    if (p.plan) return '<span class="pf-plan off">Кодът е изтекъл (' + fmt(p.plan.expires) + ')</span>';
    return '<span class="pf-plan free">Безплатен план</span>';
  }
  function avatarPick(cur, name) {
    return '<div class="av-pick" role="radiogroup" aria-label="Картинка">' + AVATARS.map(function (a, i) { return '<label><input type="radio" name="' + name + '" value="' + a + '"' + ((cur ? a === cur : i === 0) ? ' checked' : '') + '><span>' + a + '</span></label>'; }).join('') + '</div>';
  }
  function gradeSel(id, cur) { return '<select class="input" id="' + id + '">' + [1, 2, 3, 4].map(function (g) { return '<option value="' + g + '"' + (g === cur ? ' selected' : '') + '>' + g + '. клас</option>'; }).join('') + '</select>'; }

  function renderPage(j) {
    var box = $('acct-page'); if (!box) return;
    if (!j || !j.account) { location.replace('vhod.html?next=profil.html'); return; }
    var A = j.account, teacher = A.role === 'teacher', P = j.profiles || [], cur = c && c.pid;
    var h = '<div class="acct-head panel"><div><h2>Здравейте, ' + esc(A.name.split(' ')[0]) + '! 👋</h2><p class="hint">' + esc(A.email) + ' · ' + (teacher ? 'учител' : 'родител') + ' · от ' + fmt(A.since) + '</p></div><button class="btn btn-ghost btn-sm" data-logout>🚪 Изход</button></div>';
    var fresh = qs('new') && (teacher ? !j.classes.length : !P.length);
    if (qs('new') && !fresh && history.replaceState) history.replaceState(null, '', 'profil.html');
    if (fresh) h += '<div class="acct-welcome panel"><b>🎉 Акаунтът е създаден!</b> ' + (teacher ? 'Добавете класа си с кода и ПИН-а за учителя от картичката – после класацията и отчетите се отварят с едно натискане.' : 'Добавете профил за детето си. После въведете кода за абонамент в профила – той ще важи на всяко устройство, на което детето влезе.') + '</div>';

    var cls = '<section class="acct-sec" id="classes"><h2 class="lined">🏫 Моите класове</h2>' +
      (j.classes.length ? '<div class="cls-list">' + j.classes.map(function (k) {
        return '<div class="cls-card panel"><div><b>' + esc(k.name) + '</b><small>' + (k.grade ? k.grade + '. клас · ' : '') + 'код ' + esc(k.code) + ' · до ' + fmt(k.expires) + '</small></div><div class="cls-act"><button class="btn btn-sm" data-board="' + k.batch + '">🏆 Класация и отчети</button><button class="btn btn-sm btn-ghost" data-cls-del="' + k.batch + '" aria-label="Премахни класа">✕</button></div></div>';
      }).join('') + '</div>' : '<p class="hint">Още няма добавени класове.</p>') +
      '<form class="panel tool-panel" id="cls-form" autocomplete="off"><h3>Добави клас</h3><div class="tool-grid"><label>Код на учителя<input id="cls-code" class="input code-input" placeholder="SMET-XXXX-XXXX" maxlength="16" autocapitalize="characters" spellcheck="false" required></label><label>ПИН за учителя<input id="cls-pin" class="input" placeholder="4 цифри" maxlength="4" inputmode="numeric" required></label></div><div class="ws-actions"><span class="hint">От картичката за учителя. Нямате? <a href="uchilishta.html">Кодове за класа</a></span><button class="btn" type="submit">Добави</button></div><p class="code-err" id="cls-err" role="alert"></p></form></section>';

    var local = progressOf(G().state), canImport = !G().state.profileId && (local.answered > 0 || local.stars > 0);
    var kids = '<section class="acct-sec" id="kids"><h2 class="lined">' + (teacher ? '🎮 Профили за игра' : '👧 Детски профили') + ' <small>' + P.length + '/4</small></h2>' +
      (teacher && !P.length ? '<p class="hint">По желание – ако и вашите деца играят Сметко.</p>' : '') +
      '<div class="pf-grid">' + P.map(function (p) {
        var on = p.id === cur;
        return '<div class="pf-card panel' + (on ? ' on' : '') + '"><div class="pf-top"><span class="pf-av">' + esc(p.avatar) + '</span><div><b>' + esc(p.name) + '</b><small>' + p.grade + '. клас' + (on ? ' · <span class="tag">играе тук</span>' : '') + '</small></div><button class="icon-btn pf-edit" data-edit="' + p.id + '" aria-label="Редактирай профила">✏️</button></div>' +
          planLine(p) + '<div class="pf-stats"><span>★ ' + p.points + '</span><span>' + p.answered + ' задачи</span><span>' + (p.answered ? Math.round(p.correct / p.answered * 100) : 0) + '% точност</span></div>' +
          '<div class="pf-act"><button class="btn btn-sm btn-green" data-play="' + p.id + '">▶ Играй</button><button class="btn btn-sm btn-ghost" data-rep="' + p.id + '">📊 Отчет</button>' + (p.plan && p.plan.valid ? '' : '<button class="btn btn-sm btn-ghost" data-code="' + p.id + '">🔑 Въведи код</button>') + '</div></div>';
      }).join('') +
      (P.length < 4 ? '<button class="pf-card pf-add panel" id="pf-add"><span>＋</span><b>Добави ' + (teacher ? 'профил' : 'дете') + '</b></button>' : '') + '</div>' +
      '<form class="panel tool-panel" id="pf-form" hidden autocomplete="off"><h3>Нов профил</h3><div class="tool-grid"><label>Име или прякор на детето<input id="pf-name" class="input" maxlength="30" placeholder="напр. Ники" required></label><label>Клас' + gradeSel('pf-grade', G().state.lastGrade || 1) + '</label></div>' +
      '<p class="step-label">Картинка</p>' + avatarPick('', 'pf-av') +
      (canImport ? '<label class="check"><input type="checkbox" id="pf-import" checked> Прехвърли прогреса от това устройство (' + local.answered + ' задачи, ' + local.stars + ' ★)</label>' : '') +
      '<div class="ws-actions"><span class="hint">Без фамилия – името се вижда само от вас (и в класацията като прякор, ако детето има код).</span><button class="btn" type="submit">Създай профила</button></div><p class="code-err" id="pf-err" role="alert"></p></form></section>';

    var set = '<section class="acct-sec" id="settings"><h2 class="lined">⚙️ Акаунт</h2><div class="acct-set">' +
      '<details class="panel"><summary>Име</summary><form id="nm-form"><input id="nm-name" class="input" maxlength="60" value="' + esc(A.name) + '" required><button class="btn btn-sm" type="submit">Запази</button></form></details>' +
      '<details class="panel"><summary>Смяна на паролата</summary><form id="pw-form"><input id="pw-old" class="input" type="password" autocomplete="current-password" placeholder="Текуща парола" required><input id="pw-new" class="input" type="password" autocomplete="new-password" minlength="8" placeholder="Нова парола (поне 8 знака)" required><button class="btn btn-sm" type="submit">Смени</button><p class="code-err" id="pw-err" role="alert"></p></form></details>' +
      '<details class="panel"><summary>Изтриване на акаунта</summary><form id="del-form"><p class="hint">Изтриват се акаунтът, детските профили и запазеният прогрес. Активираните кодове остават към устройствата. Това не може да се върне.</p><input id="del-pass" class="input" type="password" autocomplete="current-password" placeholder="Парола за потвърждение" required><button class="btn btn-sm btn-red" type="submit">Изтрий акаунта завинаги</button><p class="code-err" id="del-err" role="alert"></p></form></details>' +
      '</div></section>';

    box.innerHTML = h + (teacher ? cls + kids : kids) + set;
    bindPage(j);
  }

  function bindPage(j) {
    var box = $('acct-page'), P = j.profiles || [];
    function byId(id) { return P.filter(function (p) { return p.id === id; })[0]; }
    function reload(r) { applyMe(r); renderPage(r); }
    var add = $('pf-add'), pf = $('pf-form');
    if (add) add.addEventListener('click', function () { pf.hidden = false; add.hidden = true; $('pf-name').focus(); pf.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    if (pf) {
      if (qs('new') && !P.length && j.account.role !== 'teacher' && add) add.click();
      pf.addEventListener('submit', function (ev) {
        ev.preventDefault(); var b = pf.querySelector('button[type=submit]'); busy(b, true);
        var imp = $('pf-import') && $('pf-import').checked;
        var d = { action: 'profile_add', name: $('pf-name').value.trim(), grade: +$('pf-grade').value, avatar: (pf.querySelector('input[name=pf-av]:checked') || {}).value };
        if (imp) d.state = payload();
        api(d).then(function (r) {
          applyMe(r);
          // първият профил на устройството (или с прехвърлен прогрес) играе тук веднага
          var go = imp || !c.pid ? selectProfile(r.id) : Promise.resolve();
          return go.then(function () { return api(); }).then(reload);
        }).catch(function (x) { err($('pf-err'), x); busy(b, false); });
      });
    }
    box.querySelectorAll('[data-play]').forEach(function (b) { b.addEventListener('click', function () {
      busy(b, true); selectProfile(+b.getAttribute('data-play')).then(function () { location.href = 'game.html'; }).catch(function (x) { busy(b, false); S.toast(esc(x.message)); });
    }); });
    box.querySelectorAll('[data-rep]').forEach(function (b) { b.addEventListener('click', function () {
      var p = byId(+b.getAttribute('data-rep')); if (!p || !S.Report) return;
      var d = S.modal('<div id="rep-m"></div><div class="modal-actions"><button class="btn btn-ghost" onclick="window.print()">🖨️ Печат</button></div>'); d.classList.add('wide-modal');
      S.Report.render(d.querySelector('#rep-m'), { nickname: p.name, grade: p.grade, answered: p.answered, correct: p.correct, stars: p.stars, missions: p.missions, skills: p.skills, days: p.days });
    }); });
    box.querySelectorAll('[data-code]').forEach(function (b) { b.addEventListener('click', function () {
      var p = byId(+b.getAttribute('data-code'));
      var d = S.modal('<h3>🔑 Код за ' + esc(p.name) + '</h3><p class="hint">Кодът от картичката или от имейла с абонамента. Важи на всяко устройство, на което ' + esc(p.name) + ' влезе в профила си.</p><form id="lc-form" autocomplete="off"><input id="lc-code" class="input code-input" placeholder="SMET-XXXX-XXXX" maxlength="16" autocapitalize="characters" spellcheck="false" required><p class="code-err" id="lc-err" role="alert"></p><div class="modal-actions"><button class="btn btn-green" type="submit">Активирай</button></div></form>');
      var inp = d.querySelector('#lc-code'); if (S.bindCodeInput) S.bindCodeInput(inp); inp.focus();
      d.querySelector('#lc-form').addEventListener('submit', function (ev) {
        ev.preventDefault(); var sb = d.querySelector('button[type=submit]'); busy(sb, true);
        linkCode(p.id, S.fmtCode ? S.fmtCode(inp.value) : inp.value.trim()).then(function () { d.close(); if (S.confetti) S.confetti(); S.toast('✓ Пълният достъп е включен за ' + esc(p.name)); return api(); }).then(reload)
          .catch(function (x) { err(d.querySelector('#lc-err'), x); busy(sb, false); });
      });
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
    var cf = $('cls-form');
    if (cf) {
      if (S.bindCodeInput) S.bindCodeInput($('cls-code'));
      cf.addEventListener('submit', function (ev) {
        ev.preventDefault(); var b = cf.querySelector('button[type=submit]'); busy(b, true);
        api({ action: 'link_class', code: S.fmtCode ? S.fmtCode($('cls-code').value) : $('cls-code').value, pin: $('cls-pin').value.trim() }).then(function (r) { S.toast('✓ Класът е добавен'); reload(r); }).catch(function (x) { err($('cls-err'), x); busy(b, false); });
      });
    }
    box.querySelectorAll('[data-board]').forEach(function (b) { b.addEventListener('click', function () {
      var k = j.classes.filter(function (x) { return x.batch === +b.getAttribute('data-board'); })[0];
      try { localStorage.setItem('smetko.board', JSON.stringify({ c: k.code, p: k.pin })); c.board = true; write(); } catch (e) {}
      location.href = 'klasaciya.html';
    }); });
    box.querySelectorAll('[data-cls-del]').forEach(function (b) { b.addEventListener('click', function () {
      if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Премахни?'; return; }
      api({ action: 'class_remove', batch: +b.getAttribute('data-cls-del') }).then(function (r) { try { localStorage.removeItem('smetko.board'); } catch (e) {} c.board = false; reload(r); });
    }); });
    $('nm-form').addEventListener('submit', function (ev) { ev.preventDefault(); api({ action: 'update', name: $('nm-name').value.trim() }).then(function () { return api(); }).then(function (r) { S.toast('Запазено ✓'); reload(r); }).catch(function (x) { S.toast(esc(x.message)); }); });
    $('pw-form').addEventListener('submit', function (ev) {
      ev.preventDefault(); $('pw-err').textContent = '';
      api({ action: 'password', old: $('pw-old').value, password: $('pw-new').value }).then(function () { S.toast('✓ Паролата е сменена. Другите устройства са изведени.'); $('pw-form').reset(); }).catch(function (x) { err($('pw-err'), x); });
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

  /* учител с няколко класа: бърз избор в „Класация на класа“ */
  function initBoardChips() {
    if (!c || !c.classes || c.classes.length < 2) return;
    var f = $('board-form'), wrap = document.createElement('div'); wrap.className = 'cls-chips';
    wrap.innerHTML = '<span class="hint">Моите класове:</span>' + c.classes.map(function (k, i) { return '<button type="button" class="chip-btn" data-i="' + i + '">' + esc(k.name) + '</button>'; }).join('');
    f.parentNode.insertBefore(wrap, f);
    wrap.querySelectorAll('[data-i]').forEach(function (b) { b.addEventListener('click', function () {
      var k = c.classes[+b.getAttribute('data-i')]; $('b-code').value = k.code; $('b-pin').value = k.pin;
      wrap.querySelectorAll('.chip-btn').forEach(function (x) { x.classList.toggle('on', x === b); });
      f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true }));
    }); });
  }

  renderHeader();
  document.addEventListener('DOMContentLoaded', function () {
    renderHeader(); pwToggle();
    if ($('login-form')) initLogin();
    if ($('reg-form')) initRegister();
    if ($('forgot-form')) initForgot();
    if ($('acct-page')) initPage();
    else refresh().then(function () {
      if ($('board-form')) initBoardChips();
      // родител влезе на ново устройство и отвори игра: „Кой играе?“
      if (c && c.profiles.length && !c.pid && document.body.classList.contains('game-page') && !document.querySelector('dialog[open]')) picker({ reload: true });
    });
  });
})();
