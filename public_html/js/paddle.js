/* Сметко — плащане през Paddle (търговец – Merchant of Record).
   Paddle.js се зарежда едва когато човек натисне „Купи“ (не на всяка страница).
   S.Paddle.on() – има ли настроен Paddle; S.Paddle.buy(plan, period, qty) – отваря формата за плащане.
   Настройки: админ → Настройки → Paddle. След плащането api/paddle.php издава кода и го праща по имейл. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  function cfg() { return (S.siteConfig || {}).paddle || {}; }
  function priceId(plan, period) { return (cfg().prices || {})[plan + (period === 6 ? '6' : '12')] || ''; }
  function on(plan, period) { var c = cfg(); return !!(c.token && (plan ? priceId(plan, period || 12) : true)); }

  var loading = null;
  function load() {
    if (window.Paddle) return Promise.resolve(window.Paddle);
    if (loading) return loading;
    loading = new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'; s.async = true;
      s.onload = function () {
        try {
          if ((cfg().env || 'sandbox') !== 'live') window.Paddle.Environment.set('sandbox');
          window.Paddle.Initialize({ token: cfg().token, eventCallback: event });
          ok(window.Paddle);
        } catch (e) { no(e); }
      };
      s.onerror = function () { loading = null; no(new Error('Формата за плащане не се зареди. Проверете интернет връзката или блокиращите разширения.')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  var waiting = null;
  function event(e) {
    if (!e || e.name !== 'checkout.completed') return;
    var txn = (e.data && e.data.transaction_id) || '';
    try { localStorage.setItem('smetko.paid', txn); } catch (x) {}
    if (waiting) { waiting(txn); waiting = null; }
    thanks(txn);
  }

  /* изчаква сървърът да обработи плащането (webhook от Paddle) и показва резултата */
  function thanks(txn) {
    var logged = !!(S.Account && S.Account.loggedIn && S.Account.loggedIn());
    var d = S.modal('<div data-owl="cheer"></div><h3>Благодарим за покупката! 🎉</h3><p id="pd-state">Обработваме плащането…</p>' +
      '<div class="modal-actions"><a class="btn btn-green" id="pd-go" href="' + (logged ? 'profil.html' : 'registracia.html') + '">' + (logged ? '👤 Моят профил' : 'Направи безплатен акаунт') + '</a><button class="btn btn-ghost" data-close>Затвори</button></div>');
    var st = d.querySelector('#pd-state'), n = 0;
    (function poll() {
      if (!d.open) return;
      fetch('/api/paddle.php?check=' + encodeURIComponent(txn), { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.done) {
          st.innerHTML = j.activated ? '✅ <b>Абонаментът е активен във вашия акаунт!</b> Пратихме ви и имейл с потвърждение.'
            : '📧 Готово! Кодът за активиране е на имейла ви – въведете го в „Абонаменти“.';
          if (j.activated && S.Account && S.Account.refresh) S.Account.refresh(true);
          try { localStorage.removeItem('smetko.paid'); } catch (x) {}
          return;
        }
        if (++n < 20) setTimeout(poll, 1500);
        else st.innerHTML = 'Плащането мина успешно. Кодът идва на имейла ви до няколко минути. Ако не дойде, пишете ни на <a href="mailto:info@smetko.com">info@smetko.com</a>.';
      }).catch(function () { if (++n < 20) setTimeout(poll, 2000); });
    })();
  }

  function buy(plan, period, qty) {
    var pid = priceId(plan, period);
    if (!pid) { if (S.toast) S.toast('Този план още не е свързан с Paddle.'); return Promise.reject(new Error('no price')); }
    var A = S.Account && S.Account.data;
    var cd = { plan: plan, period: period === 6 ? 6 : 12, qty: Math.max(1, qty || 1) };
    if (A) { cd.email = A.email; cd.name = A.name; }
    var who = A && S.Account.api ? S.Account.api({ action: 'paddle_token' }).then(function (j) { cd.acc = j.token; }).catch(function () {}) : Promise.resolve();
    return Promise.all([load(), who]).then(function (r) {
      var P = r[0];
      P.Checkout.open({
        items: [{ priceId: pid, quantity: Math.max(1, Math.min(60, qty || 1)) }],
        customer: A && A.email ? { email: A.email } : undefined,
        customData: cd,
        settings: { locale: 'bg', theme: 'light', displayMode: 'overlay', allowLogout: !A, successUrl: location.origin + '/pricing.html?paid=1' }
      });
    });
  }

  /* пробен режим: докато продажбите са спрени, плащането се пробва с pricing.html?test=paddle */
  function test(set) {
    try {
      if (set) localStorage.setItem('smetko.paddletest', '1');
      return localStorage.getItem('smetko.paddletest') === '1';
    } catch (e) { return !!set; }
  }
  function allowed() { return S.SALES || test(/[?&]test=paddle/.test(location.search)); }

  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function price(plan, period) { var p = (S.siteConfig || {}).prices || {}; var v = p[plan + (period === 6 ? '6' : '12')]; return v ? v + ' €' : ''; }

  /* прозорец „Купи абонамент“ – план, срок и брой класове, после формата на Paddle */
  function modal(plan, qty0) {
    plan = plan || 'single';
    var per = S.period === 6 ? 6 : 12, qty = Math.max(1, qty0 || 1);
    var name = function (k) { return S.planName ? S.planName(k) : k; };
    var opt = function (k) { return '<option value="' + k + '"' + (k === plan ? ' selected' : '') + '>' + esc(name(k)) + ' – ' + { single: 'за 1 дете', family: 'за до 4 деца', 'class': 'за цял клас (30 ученици)' }[k] + '</option>'; };
    var d = S.modal('<h3>🛒 Абонамент за Сметко</h3>' +
      (test() && !S.SALES ? '<p class="hint pd-test">🧪 Пробен режим (Paddle ' + esc(S.Paddle.env()) + '). Използвайте тестова карта – истински пари не се теглят.</p>' : '') +
      '<form id="pd-form" class="ord"><label>План<select class="input" id="pd-plan">' + opt('single') + opt('family') + opt('class') + '</select></label>' +
      '<div class="period-mini" role="group" aria-label="Срок"><button type="button" data-per="12" aria-pressed="' + (per === 12) + '">1 година</button><button type="button" data-per="6" aria-pressed="' + (per === 6) + '">6 месеца</button></div>' +
      '<label class="pd-qty" hidden>Брой класове<input class="input" id="pd-qty" type="number" min="1" max="60" value="' + qty + '"></label>' +
      '<p class="pd-sum" id="pd-sum"></p>' +
      '<div class="modal-actions"><button class="btn btn-ghost" type="button" data-close>Отказ</button><button class="btn btn-lg btn-green" type="submit">Към плащането →</button></div>' +
      '<p class="hint pd-note">Плащането се обработва от Paddle.com – търговецът (Merchant of Record) по нашите поръчки. <a href="vrashtane.html">14 дни гаранция</a> · <a href="terms.html">Общи условия</a></p>' +
      '<p class="code-err" id="pd-err" role="alert"></p></form>');
    d.classList.add('pd-modal');
    var sel = d.querySelector('#pd-plan'), qf = d.querySelector('.pd-qty'), qi = d.querySelector('#pd-qty'), sum = d.querySelector('#pd-sum');
    function draw() {
      var p = sel.value; qf.hidden = p !== 'class';
      var one = price(p, per), n = p === 'class' ? Math.max(1, +qi.value || 1) : 1;
      sum.innerHTML = esc(name(p)) + ' · ' + (per === 12 ? '1 година' : '6 месеца') + (n > 1 ? ' · ' + n + ' класа' : '') +
        (one ? ' · <b>' + esc(one) + (n > 1 ? ' за клас' : '') + '</b>' : ' · <span class="hint">цената се показва в прозореца за плащане</span>');
    }
    d.querySelectorAll('[data-per]').forEach(function (b) {
      b.addEventListener('click', function () { per = +b.getAttribute('data-per'); d.querySelectorAll('[data-per]').forEach(function (x) { x.setAttribute('aria-pressed', String(+x.getAttribute('data-per') === per)); }); draw(); });
    });
    sel.addEventListener('change', draw); qi.addEventListener('input', draw); draw();
    d.querySelector('#pd-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var b = d.querySelector('button[type=submit]'); b.disabled = true; b.textContent = 'Отварям…';
      buy(sel.value, per, sel.value === 'class' ? Math.max(1, +qi.value || 1) : 1)
        .then(function () { d.close(); })
        .catch(function (x) { d.querySelector('#pd-err').textContent = x.message || 'Нещо не се получи. Опитайте пак.'; b.disabled = false; b.textContent = 'Към плащането →'; });
    });
    return d;
  }

  S.Paddle = { on: on, buy: buy, load: load, modal: modal, priceId: priceId, allowed: allowed, test: test, env: function () { return cfg().env || 'sandbox'; } };

  document.addEventListener('DOMContentLoaded', function () {
    // пробният режим показва бутоните за купуване, докато продажбите са спрени
    if (!S.SALES && allowed()) document.querySelectorAll('[data-paddle-test]').forEach(function (el) { el.hidden = false; });
    document.querySelectorAll('[data-paddle-buy]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); modal(b.getAttribute('data-paddle-buy') || 'single', +b.getAttribute('data-qty') || 1); }); });
    // връщане от successUrl (когато плащането е в нов раздел)
    try {
      if (!/[?&]paid=1/.test(location.search)) return;
      var txn = localStorage.getItem('smetko.paid') || '';
      if (history.replaceState) history.replaceState(null, '', location.pathname + '#activate');
      setTimeout(function () { thanks(txn); }, 400);
    } catch (e) {}
  });
})();
