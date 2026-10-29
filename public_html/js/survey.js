/* Сметко — анкета за затворения тест (anketa.html → /api/survey.php).
   Въпросите се показват според ролята; номерата се пренареждат; отговорите се пазят и в браузъра,
   за да може човек да ги промени по-късно (същият ключ sid обновява записа). */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var KEY = 'smetko.survey';
  var GROUP = { 0: 'parent', 1: 'teacher', 2: 'teacher', 3: 'teacher', 4: 'all' };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function store(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function rid() { var a = new Uint8Array(12); (window.crypto || window.msCrypto).getRandomValues(a); return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }

  var form, saved;
  function role() { var r = $('input[name="role"]:checked', form); return r ? +r.value : null; }
  function visible() { return $$('.sv-q', form).filter(function (f) { return !f.hidden; }); }
  function value(f) {
    var k = f.getAttribute('data-kind'), n = f.getAttribute('data-q');
    if (k === 'many') { var v = $$('input:checked', f).map(function (i) { return +i.value; }); return v.length ? v : null; }
    if (k === 'one' || k === 'scale' || k === 'nps') { var c = $('input[name="' + n + '"]:checked', f); return c ? +c.value : null; }
    var t = $('[name="' + n + '"]', f).value.trim(); return t || null;
  }
  function refresh() {
    var r = role(), g = r === null ? null : GROUP[r];
    $$('.sv-q', form).forEach(function (f) { var w = f.getAttribute('data-for'); f.hidden = !(w === 'all' || (g && w === g)); });
    visible().forEach(function (f, i) { $('.sv-n', f).textContent = i + 1; });
    var vis = visible(), done = vis.filter(function (f) { return value(f) !== null; }).length;
    $('#sv-bar').style.width = (r === null ? 4 : Math.round(done / vis.length * 100)) + '%';
  }
  function fill(a) {
    Object.keys(a || {}).forEach(function (k) {
      var f = $('.sv-q[data-q="' + k + '"]', form); if (!f) return;
      var v = a[k], kind = f.getAttribute('data-kind');
      if (kind === 'many') $$('input', f).forEach(function (i) { i.checked = v.indexOf(+i.value) >= 0; });
      else if (kind === 'text' || kind === 'email') $('[name="' + k + '"]', f).value = v;
      else $$('input', f).forEach(function (i) { i.checked = +i.value === v; });
    });
  }
  function collect() { var o = {}; visible().forEach(function (f) { var v = value(f); if (v !== null) o[f.getAttribute('data-q')] = v; }); return o; }
  function check() {
    var first = null;
    visible().forEach(function (f) {
      var bad = f.hasAttribute('data-req') && value(f) === null;
      if (!bad && f.getAttribute('data-kind') === 'email') { var v = value(f); bad = v !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); if (bad) $('.sv-err', f).textContent = 'Проверете имейла.'; }
      else $('.sv-err', f).textContent = bad ? 'Моля, изберете отговор.' : '';
      f.classList.toggle('bad', bad);
      if (bad && !first) first = f;
    });
    return first;
  }
  function done(again) {
    form.hidden = again ? false : true; $('#sv-done').hidden = !!again;
    if (!again) { window.scrollTo({ top: 0, behavior: 'smooth' }); if (S.renderOwls) S.renderOwls($('#sv-done')); }
  }

  function init() {
    form = $('#sv-form'); if (!form) return;
    saved = load();
    if (!saved.sid) { saved.sid = rid(); store(saved); }
    if (saved.answers) fill(saved.answers);
    else { // учител от акаунта → предварително избрана роля; ?r=teacher / ?r=parent от линка
      var q = new URLSearchParams(location.search).get('r'), acct = S.Account ? S.Account.data : null;
      var r0 = q === 'teacher' ? 1 : q === 'parent' ? 0 : acct && acct.role === 'teacher' ? 1 : acct && acct.role === 'parent' ? 0 : null;
      if (r0 !== null) { var ri = $('input[name="role"][value="' + r0 + '"]', form); if (ri) ri.checked = true; }
    }
    refresh();
    if (saved.sent) done(false);
    function clear(e) { // грешката се маха още докато човек пише – без подскачане на бутона при клик
      var f = e.target.closest('.sv-q'); if (!f || !f.classList.contains('bad')) return;
      var v = value(f), k = f.getAttribute('data-kind');
      if (v !== null && (k !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))) { f.classList.remove('bad'); $('.sv-err', f).textContent = ''; }
    }
    form.addEventListener('change', function (e) { clear(e); refresh(); });
    form.addEventListener('input', function (e) { clear(e); refresh(); });
    $('#sv-again').addEventListener('click', function () { done(true); window.scrollTo({ top: 0 }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); $('#sv-err').textContent = '';
      var bad = check();
      if (bad) { bad.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#sv-err').textContent = 'Има въпроси без отговор – отбелязани са в червено.'; return; }
      var btn = $('button[type=submit]', form), ans = collect();
      btn.disabled = true; btn.textContent = 'Изпращам…';
      fetch('/api/survey.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ sid: saved.sid, answers: ans }) })
        .then(function (r) { return r.json().catch(function () { throw new Error('Сървърът не отговаря. Опитайте пак след малко.'); }); })
        .then(function (j) {
          if (!j.ok) { var f = j.field && $('.sv-q[data-q="' + j.field + '"]', form); if (f) { f.classList.add('bad'); f.scrollIntoView({ behavior: 'smooth', block: 'center' }); } throw new Error(j.error || 'Грешка.'); }
          saved.answers = ans; saved.sent = Date.now(); store(saved);
          if (window.gtag) try { window.gtag('event', 'survey_sent'); } catch (x) {}
          done(false);
        })
        .catch(function (x) { $('#sv-err').textContent = x.message === 'Failed to fetch' ? 'Няма връзка. Опитайте пак.' : x.message; })
        .then(function () { btn.disabled = false; btn.textContent = 'Изпрати отговорите'; });
    });
  }
  S.Survey = { done: function () { return !!load().sent; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
