/* Сметко — общи функции за всички страници:
   настройки, рисуване на Сметко, меню, модални прозорци, конфети, PWA регистрация. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};

  /* ---------- НАСТРОЙКИ ----------
     paywall: true → безплатен план (Бързо сметни, първите мисии, 20 задачи/ден в Тренировка);
     пълният достъп се отключва с абонамент към акаунта (js/account.js, js/access.js, админ: /admin/).
     paywall: false → всичко е отключено за всички. */
  S.config = {
    paywall: true,
    freeAdventureLevels: 3,
    freePracticePerDay: 20,
    trialDays: 14,
    contactEmail: 'info@smetko.com',
    questionsPerMission: 10,
    quickSeconds: 60
  };

  if (!S.hasAccess) S.hasAccess = function () { return !S.config.paywall; }; // истинската проверка е в access.js

  /* ---------- НАСТРОЙКИ ОТ АДМИН ПАНЕЛА ----------
     /api/config.php връща цени, банер, безплатен план и данни на фирмата.
     Пазят се в браузъра, за да работят и без интернет; обновяват се при всяко отваряне. */
  var CFG_KEY = 'smetko.cfg';
  function escH(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function money(x) { var n = Math.round(x * 100) / 100; return (n % 1 ? n.toFixed(2) : String(n)); }
  function applyCfg(c, dom) {
    if (!c) return;
    if (typeof c.paywall === 'boolean') S.config.paywall = c.paywall;
    if (+c.freeMissions >= 0 && c.freeMissions !== '') S.config.freeAdventureLevels = +c.freeMissions;
    if (+c.freePractice > 0) S.config.freePracticePerDay = +c.freePractice;
    if (c.contactEmail) S.config.contactEmail = c.contactEmail;
    if (+c.questions >= 5) S.config.questionsPerMission = +c.questions;
    S.siteConfig = c;
    if (!dom) return;
    gaLoad();
    document.querySelectorAll('[data-ga-txt]').forEach(function (el) { el.textContent = gaTxt(); });
    try { document.dispatchEvent(new CustomEvent('smetko:config', { detail: c })); } catch (e) {}
    var P = c.prices || {};
    document.querySelectorAll('[data-price]').forEach(function (el) { var v = P[el.getAttribute('data-price')]; if (v !== undefined && v !== '') el.textContent = String(v).replace('.', '.'); });
    var per = { single6: [6, 'на месец'], single12: [12, 'на месец'], family6: [4, 'на дете'], family12: [4, 'на дете'], class6: [30, 'на ученик'], class12: [30, 'на ученик'] };
    document.querySelectorAll('[data-per]').forEach(function (el) { var k = el.getAttribute('data-per'), d = per[k]; if (d && +P[k]) { var v = +P[k] / d[0], r = Math.round(v * 100) / 100; el.textContent = (Math.abs(v - r) > 1e-9 ? '≈ ' : '') + money(r) + ' € ' + d[1]; } });
    document.querySelectorAll('[data-cfg]').forEach(function (el) { var k = el.getAttribute('data-cfg'), v = k === 'freeMissions' ? S.config.freeAdventureLevels : k === 'freePractice' ? S.config.freePracticePerDay : c[k]; if (v !== undefined) el.textContent = v; });
    var PN = c.planNames || {};
    document.querySelectorAll('[data-plan]').forEach(function (el) { var v = PN[el.getAttribute('data-plan')]; if (v) el.textContent = v; });
    var co = c.company || {};
    document.querySelectorAll('[data-co]').forEach(function (el) { var v = co[el.getAttribute('data-co')]; if (v) el.innerHTML = escH(v); });
    if (c.contactEmail && c.contactEmail !== 'info@smetko.com') document.querySelectorAll('a[href^="mailto:info@smetko.com"]').forEach(function (a) { a.href = a.href.replace('info@smetko.com', c.contactEmail); if (a.textContent.indexOf('@') > 0) a.textContent = c.contactEmail; });
    var b = c.banner || {}, old = document.getElementById('site-banner');
    if (old) old.remove();
    var bid = 'b' + String(b.text || '').length + (b.text || '').slice(0, 12);
    var closed = false; try { closed = localStorage.getItem('smetko.banner') === bid; } catch (e) {}
    if (b.on && b.text && !closed) {
      var el = document.createElement('div'); el.id = 'site-banner'; el.className = 'site-banner ' + (b.color || 'orange');
      el.innerHTML = '<span>' + escH(b.text) + (b.link ? ' <a href="' + escH(b.link) + '">' + escH(b.linkText || 'Научи повече') + ' →</a>' : '') + '</span><button aria-label="Затвори">×</button>';
      el.querySelector('button').addEventListener('click', function () { el.remove(); try { localStorage.setItem('smetko.banner', bid); } catch (e) {} });
      document.body.insertBefore(el, document.body.firstChild);
    }
  }
  try { applyCfg(JSON.parse(localStorage.getItem(CFG_KEY) || 'null'), false); } catch (e) {}
  S.loadConfig = function () {
    try { applyCfg(JSON.parse(localStorage.getItem(CFG_KEY) || 'null'), true); } catch (e) {}
    if (!/^https?:$/.test(location.protocol)) return;
    fetch('/api/config.php', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) return;
      try { localStorage.setItem(CFG_KEY, JSON.stringify(j.config)); } catch (e) {}
      applyCfg(j.config, true);
    }).catch(function () {});
  };

  /* ---------- Сметко ---------- */
  S.renderOwls = function (root) {
    if (!S.owl) return;
    (root || document).querySelectorAll('[data-owl]').forEach(function (el) {
      el.innerHTML = S.owl(el.getAttribute('data-owl') || 'hello');
    });
  };
  S.setOwl = function (el, pose) {
    if (!el) return;
    el.setAttribute('data-owl', pose);
    el.innerHTML = S.owl(pose);
  };

  /* ---------- Модален прозорец ---------- */
  S.modal = function (html, opts) {
    opts = opts || {};
    var d = document.createElement('dialog');
    d.className = 'modal';
    d.innerHTML = '<button class="modal-close" aria-label="Затвори">×</button><div class="modal-body">' + html + '</div>';
    document.body.appendChild(d);
    S.renderOwls(d);
    function close() { d.close(); }
    d.addEventListener('close', function () { d.remove(); if (opts.onClose) opts.onClose(); });
    d.querySelector('.modal-close').addEventListener('click', close);
    d.addEventListener('click', function (e) { if (e.target === d) close(); });
    d.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', close); });
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    return d;
  };

  /* ---------- НОВИНИ ----------
     Изскачат при влизане, докато не се натисне „Видях го“. Видяното се пази в браузъра. */
  var NEWS_SEEN = 'smetko.newsSeen', NEWS_CACHE = 'smetko.news';
  function seenIds() { try { return JSON.parse(localStorage.getItem(NEWS_SEEN) || '[]'); } catch (e) { return []; } }
  function markSeen(ids) { var s = seenIds(); ids.forEach(function (id) { if (s.indexOf(id) < 0) s.push(id); }); try { localStorage.setItem(NEWS_SEEN, JSON.stringify(s.slice(-200))); } catch (e) {} updateBell(S.news || []); }
  function newsCard(n) {
    return '<article class="news-item"><span class="news-emo">' + escH(n.emoji) + '</span><div><h4>' + escH(n.title) + '</h4>' + (n.body ? '<p>' + escH(n.body).replace(/\n/g, '<br>') + '</p>' : '') +
      (n.link ? '<a class="btn btn-sm" href="' + escH(n.link) + '">' + escH(n.linkText || 'Виж') + ' →</a>' : '') + '</div></article>';
  }
  function updateBell(list) {
    var seen = seenIds(), n = list.filter(function (x) { return seen.indexOf(x.id) < 0; }).length;
    document.querySelectorAll('[data-news-count]').forEach(function (el) { el.textContent = n || ''; el.hidden = !n; });
  }
  function showNews(list) {
    S.news = list; updateBell(list);
    var box = document.getElementById('news-list');
    if (box) { // страница „Новини“
      box.innerHTML = list.length ? list.map(newsCard).join('') : '<p class="lead-dark" style="text-align:center">Още няма новини.</p>';
      markSeen(list.map(function (x) { return x.id; })); return;
    }
    if (document.getElementById('cookie-bar')) { S._newsAfterConsent = list; return; } // първо банерът за бисквитки
    if (document.querySelector('dialog[open]') || /[?&]start=1/.test(location.search)) return;
    var seen = seenIds(), fresh = list.filter(function (x) { return x.popup && seen.indexOf(x.id) < 0; }).slice(0, 3);
    if (!fresh.length) return;
    var d = S.modal('<div class="news-pop"><div data-owl="cheer" class="news-owl"></div><h3>' + (fresh.length > 1 ? 'Новини от Сметко' : 'Новина от Сметко') + '</h3>' + fresh.map(newsCard).join('') +
      '<div class="modal-actions"><button class="btn btn-green" data-seen>✓ Видях го</button></div></div>');
    d.classList.add('news-modal');
    d.querySelector('[data-seen]').addEventListener('click', function () { markSeen(fresh.map(function (x) { return x.id; })); d.close(); });
    d.querySelectorAll('.news-item a').forEach(function (a) { a.addEventListener('click', function () { markSeen(fresh.map(function (x) { return x.id; })); }); });
  }
  S.loadNews = function () {
    var cached = null; try { cached = JSON.parse(localStorage.getItem(NEWS_CACHE) || 'null'); } catch (e) {}
    if (cached) updateBell(cached);
    if (!/^https?:$/.test(location.protocol)) { if (cached) showNews(cached); return; }
    fetch('/api/news.php', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) return;
      try { localStorage.setItem(NEWS_CACHE, JSON.stringify(j.news)); } catch (e) {}
      setTimeout(function () { showNews(j.news); }, 600);
    }).catch(function () { if (cached) showNews(cached); });
  };

  /* ---------- БИСКВИТКИ: съгласие ----------
     Необходими (вход, прогрес в играта, настройки) – винаги. „Статистика“ – анонимно броене на посещенията
     (/api/hit.php, без IP, без бисквитка за проследяване) – само със съгласие. Изборът се пази 12 месеца. */
  var CONSENT = 'smetko.consent', CV = 1;
  function getConsent() {
    try { var c = JSON.parse(localStorage.getItem(CONSENT) || 'null'); if (c && c.v === CV && Date.now() - c.t < 365 * 864e5) return c; } catch (e) {}
    var m = document.cookie.match(/(?:^|; )smetko_consent=([^;]+)/);
    return m ? { v: CV, stats: m[1].indexOf('stats') >= 0, t: Date.now() } : null;
  }
  /* Google Analytics 4 – зарежда се САМО при съгласие „Статистика“ и ако в админ панела е въведен Measurement ID (G-…).
     Без Google Signals и без рекламна персонализация. При оттегляне на съгласието бисквитките _ga се изтриват. */
  var gaOn = false;
  function gaId() { var g = (S.siteConfig || {}).google || {}; return /^G-[A-Z0-9]{4,15}$/.test(g.ga || '') ? g.ga : ''; }
  S.gaId = gaId;
  function gaTxt() { return gaId() ? ' (и с Google Analytics)' : ' анонимно'; }
  function gaLoad() {
    var id = gaId(), c = getConsent();
    if (gaOn || !id || !c || !c.stats || !/^https?:$/.test(location.protocol)) return;
    gaOn = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('js', new Date());
    gtag('config', id, { allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }
  function gaOff() {
    if (window.gtag) gtag('consent', 'update', { analytics_storage: 'denied' });
    var host = location.hostname, doms = ['', host, '.' + host, '.' + host.replace(/^www\./, '')];
    document.cookie.split(';').forEach(function (k) {
      var n = k.split('=')[0].trim();
      if (/^_ga/.test(n)) doms.forEach(function (d) { document.cookie = n + '=; max-age=0; path=/' + (d ? '; domain=' + d : ''); });
    });
  }
  S.track = function (name, params) { if (gaOn && window.gtag) try { gtag('event', name, params || {}); } catch (e) {} };
  var hitSent = false;
  function hit() {
    if (hitSent || !/^https?:$/.test(location.protocol)) return; hitSent = true;
    var n = 0; try { if (!sessionStorage.getItem('smetko.visit')) { sessionStorage.setItem('smetko.visit', '1'); n = 1; } } catch (e) {}
    var r = ''; try { if (document.referrer) { var u = new URL(document.referrer); if (u.hostname !== location.hostname) r = u.hostname; } } catch (e) {}
    try { fetch('/api/hit.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p: location.pathname, r: r, n: n }), keepalive: true }).catch(function () {}); } catch (e) {}
  }
  function setConsent(stats) {
    var c = { v: CV, stats: !!stats, t: Date.now() };
    try { localStorage.setItem(CONSENT, JSON.stringify(c)); } catch (e) {}
    document.cookie = 'smetko_consent=' + (stats ? 'necessary,stats' : 'necessary') + '; max-age=' + 365 * 86400 + '; path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    var bar = document.getElementById('cookie-bar'); if (bar) { bar.classList.remove('show'); setTimeout(function () { bar.remove(); if (S._newsAfterConsent) { var l = S._newsAfterConsent; S._newsAfterConsent = null; showNews(l); } }, 250); }
    if (stats) { hit(); gaLoad(); } else gaOff();
    document.querySelectorAll('[data-consent-state]').forEach(function (el) { el.textContent = stats ? 'Приети: необходими и статистика' : 'Приети: само необходимите'; });
  }
  S.consent = getConsent;
  S.cookieSettings = function () {
    var c = getConsent() || { stats: false };
    var d = S.modal('<div class="ck-modal"><h3>🍪 Настройки за бисквитки</h3><p>Изберете кои бисквитки и данни в браузъра да използва Сметко. Може да промените избора по всяко време от долната част на всяка страница.</p>' +
      '<label class="ck-opt"><input type="checkbox" checked disabled><span><b>Необходими</b><small>Вход в акаунта, прогресът в играта, абонаментът, избраният учебник и тази настройка. Без тях сайтът не работи – винаги са включени.</small></span></label>' +
      '<label class="ck-opt"><input type="checkbox" id="ck-stats"' + (c.stats ? ' checked' : '') + '><span><b>Статистика</b><small>Броим колко пъти са отваряни страниците и от кой сайт идват посетителите, за да подобряваме Сметко. ' + (gaId() ? 'Използваме собствен анонимен брояч и Google Analytics (бисквитки _ga, до 2 години, без реклами и без Google Signals).' : 'Без IP адрес, без реклами и без проследяване от други сайтове.') + '</small></span></label>' +
      '<p class="hint"><a href="cookies.html">Политика за бисквитките</a> · <a href="privacy-policy.html">Поверителност</a></p>' +
      '<div class="modal-actions"><button class="btn btn-ghost" id="ck-save">Запази избора</button><button class="btn btn-green" id="ck-all">Приемам всички</button></div></div>');
    d.classList.add('ck-dialog');
    d.querySelector('#ck-save').addEventListener('click', function () { setConsent(d.querySelector('#ck-stats').checked); d.close(); S.toast('Изборът е запазен ✓'); });
    d.querySelector('#ck-all').addEventListener('click', function () { setConsent(true); d.close(); S.toast('Благодарим! ✓'); });
  };
  function cookieBar() {
    var c = getConsent();
    document.querySelectorAll('[data-consent-state]').forEach(function (el) { el.textContent = !c ? 'Още не сте избрали' : c.stats ? 'Приети: необходими и статистика' : 'Приети: само необходимите'; });
    if (c) { if (c.stats) { hit(); gaLoad(); } return; }
    if (navigator.webdriver && /[?&]noconsent=1/.test(location.search)) return;
    var bar = document.createElement('div'); bar.id = 'cookie-bar'; bar.className = 'cookie-bar'; bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-label', 'Бисквитки');
    bar.innerHTML = '<div class="ck-in"><div class="ck-txt"><b>🍪 Сметко използва бисквитки</b><p>Необходимите поддържат входа и пазят прогреса в играта. С ваше съгласие броим посещенията<span data-ga-txt>' + gaTxt() + '</span>, за да правим Сметко по-добър – без реклами. <a href="cookies.html">Научете повече</a></p></div>' +
      '<div class="ck-btns"><button class="btn btn-green btn-sm" data-ck="all">Приемам всички</button><button class="btn btn-white btn-sm" data-ck="min">Само необходимите</button><button class="ck-link" data-ck="set">Настройки</button></div></div>';
    document.body.appendChild(bar);
    requestAnimationFrame(function () { bar.classList.add('show'); });
    bar.querySelector('[data-ck="all"]').addEventListener('click', function () { setConsent(true); });
    bar.querySelector('[data-ck="min"]').addEventListener('click', function () { setConsent(false); });
    bar.querySelector('[data-ck="set"]').addEventListener('click', function () { S.cookieSettings(); });
  }

  S.toast = function (html, ms) {
    var t = document.createElement('div');
    t.className = 'toast'; t.innerHTML = html;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, ms || 2600);
  };

  var PLAN_KEYS = { 'Индивидуален': 'single', 'Семеен': 'family', 'Цял клас': 'class' };
  var PLAN_DEF = { single: 'Бухалче', family: 'Гнездо', 'class': 'Ято', free: 'Пухче', school: 'Гора' };
  S.period = 12;
  document.addEventListener('click', function (e) { // превключвател 1 година / 6 месеца
    var b = e.target.closest && e.target.closest('[data-period]'); if (!b || !b.closest('.period-toggle')) return;
    S.period = +b.getAttribute('data-period');
    document.querySelectorAll('.period-toggle [data-period]').forEach(function (x) { x.setAttribute('aria-pressed', String(+x.getAttribute('data-period') === S.period)); });
    document.querySelectorAll('.pp[data-p]').forEach(function (x) { x.hidden = +x.getAttribute('data-p') !== S.period; });
  });
  S.planName = function (kind) { var k = PLAN_KEYS[kind] || kind; return ((S.siteConfig || {}).planNames || {})[k] || PLAN_DEF[k] || kind; };
  /* ---------- Поръчка на абонамент (/api/order.php) ---------- */
  var PLAN_OF = { 'Индивидуален': 'single', 'Семеен': 'family', 'Цял клас': 'class' };
  var DEF_PRICES = { single6: 10, single12: 18, family6: 18, family12: 30, class6: 45, class12: 80, disc3: 15, disc8: 25 };
  function price(k) { var P = (S.siteConfig || {}).prices || {}; var v = parseFloat(P[k]); return isNaN(v) ? DEF_PRICES[k] : v; }
  // продажбите са спрени до края на проучването (meta smetko-sales в <head>)
  S.SALES = (function () { var m = document.querySelector('meta[name="smetko-sales"]'); return !!(m && m.content === '1'); })();
  // затворен тест: пълният достъп е само с код за достъп (текстовете при катинарите)
  S.PAID = S.SALES ? 'с абонамент' : 'с код за достъп';
  S.PAID_URL = S.SALES ? 'pricing.html' : 'pricing.html#activate';
  S.PAID_BTN = S.SALES ? 'Абонаменти' : '🔑 Имам код';
  S.soonModal = function () {
    S.modal('<div data-owl="happy"></div><h3>Очаквайте скоро!</h3><p>Абонаментите ще бъдат пуснати скоро. Сега Сметко е в затворен тест – пълният достъп е само с код за достъп от нас. Искате да участвате? Пишете ни на <a href="mailto:info@smetko.com?subject=Затворен%20тест">info@smetko.com</a>.</p>' +
      '<div class="modal-actions"><a class="btn btn-green" href="pricing.html#activate">🔑 Имам код</a><a class="btn btn-ghost" href="game.html">Безплатен план</a></div>');
  };
  S.subscribeModal = function (kind, qty0) {
    if (!S.SALES) { S.soonModal(); return; }
    var plan = PLAN_OF[kind] || kind || 'single';
    var A = S.Account && S.Account.data, per = S.period === 6 ? 6 : 12;
    var opt = function (k) { return '<option value="' + k + '"' + (k === plan ? ' selected' : '') + '>' + escH(S.planName(k)) + ' – ' + { single: 'индивидуален', family: 'семеен (до 4 деца)', 'class': 'цял клас (30 ученици)' }[k] + '</option>'; };
    var d = S.modal(
      '<form id="ord" class="ord" novalidate><h3>🛒 Поръчка на абонамент</h3>' +
      '<div class="ord-row"><label>План<select class="input" id="o-plan">' + opt('single') + opt('family') + opt('class') + '</select></label>' +
      '<div class="period-mini" role="group" aria-label="Срок"><button type="button" data-per="12" aria-pressed="' + (per === 12) + '">1 година</button><button type="button" data-per="6" aria-pressed="' + (per === 6) + '">6 месеца</button></div></div>' +
      '<div class="ord-class" hidden><div class="ord-row"><label>Брой класове<input class="input" id="o-qty" type="number" min="1" max="60" value="' + (qty0 || 1) + '"></label><label>Кои класове<input class="input" id="o-classes" maxlength="200" placeholder="напр. 2а, 2б"></label></div>' +
      '<label>Училище<input class="input" id="o-school" maxlength="160" placeholder="ОУ „Иван Вазов“"></label><label>Населено място<input class="input" id="o-town" maxlength="60" placeholder="Пловдив"></label></div>' +
      '<label>Име и фамилия<input class="input" id="o-name" maxlength="120" autocomplete="name" placeholder="напр. Мария Иванова" value="' + escH(A ? A.name : '') + '"></label>' +
      '<div class="ord-row"><label>Имейл – тук ще получите кода за активиране<input class="input" id="o-email" type="email" maxlength="160" autocomplete="email" inputmode="email" placeholder="ime@primer.bg" value="' + escH(A ? A.email : '') + '"></label><label>Телефон <small class="o-opt" id="o-phone-opt">(по желание)</small><input class="input" id="o-phone" type="tel" maxlength="40" autocomplete="tel" placeholder="08XX XXX XXX"></label></div>' +
      '<label class="check"><input type="checkbox" id="o-inv"><span>Искам фактура</span></label>' +
      '<div class="ord-inv" hidden><div class="ord-row"><label>Фирма / училище<input class="input" id="o-company" maxlength="160"></label><label>ЕИК<input class="input" id="o-eik" maxlength="13" inputmode="numeric"></label></div><div class="ord-row"><label>МОЛ<input class="input" id="o-mol" maxlength="80"></label><label>Адрес<input class="input" id="o-addr" maxlength="200"></label></div></div>' +
      '<label>Бележка <small class="o-opt">(по желание)</small><textarea class="input" id="o-notes" maxlength="1000" rows="2"></textarea></label>' +
      '<input type="text" name="website" id="o-web" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">' +
      '<div class="ord-sum" id="o-sum"></div>' +
      '<label class="check"><input type="checkbox" id="o-terms"><span>Приемам <a href="terms.html" target="_blank">Общите условия</a> и <a href="privacy-policy.html" target="_blank">Политиката за поверителност</a>.</span></label>' +
      '<p class="code-err" id="o-err" role="alert"></p><div class="modal-actions"><button class="btn btn-green btn-lg" type="submit">Поръчай</button></div>' +
      '<p class="hint" style="text-align:center;margin:8px 0 0">Плащане по банков път. Кодът идва на имейла ви след плащането.</p></form>'
    );
    d.classList.add('ord-modal');
    var $ = function (id) { return d.querySelector('#' + id); };
    function calc() {
      var pl = $('o-plan').value, n = pl === 'class' ? Math.max(1, Math.min(60, +$('o-qty').value || 1)) : 1;
      var pr = price(pl + per), ds = pl === 'class' ? (n >= 8 ? price('disc8') : n >= 3 ? price('disc3') : 0) : 0;
      var sum = Math.round(pr * n * (100 - ds)) / 100;
      d.querySelector('.ord-class').hidden = pl !== 'class';
      $('o-phone-opt').hidden = pl === 'class'; // за клас телефонът е задължителен
      $('o-sum').innerHTML = '<span>' + escH(S.planName(pl)) + ' · ' + (per === 12 ? '1 година' : '6 месеца') + (n > 1 ? ' · ' + n + ' класа' : '') + (ds ? ' · −' + ds + '%' : '') + '</span><b>' + money(sum) + ' €</b>';
    }
    d.querySelectorAll('[data-per]').forEach(function (b) { b.addEventListener('click', function () { per = +b.getAttribute('data-per'); d.querySelectorAll('[data-per]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); calc(); }); });
    $('o-plan').addEventListener('change', calc); $('o-qty').addEventListener('input', calc);
    $('o-inv').addEventListener('change', function () { d.querySelector('.ord-inv').hidden = !this.checked; if (this.checked && !$('o-company').value && $('o-school').value) $('o-company').value = $('o-school').value; });
    calc();
    $('ord').addEventListener('submit', function (e) {
      e.preventDefault(); var err = $('o-err'); err.textContent = '';
      var pl = $('o-plan').value, btn = d.querySelector('button[type=submit]');
      var data = { plan: pl, period: per, qty: pl === 'class' ? +$('o-qty').value || 1 : 1, name: $('o-name').value.trim(), email: $('o-email').value.trim(), phone: $('o-phone').value.trim(),
        school: $('o-school').value.trim(), town: $('o-town').value.trim(), classes: $('o-classes').value.trim(), notes: $('o-notes').value.trim(), terms: $('o-terms').checked ? 1 : 0, website: $('o-web').value,
        invoice: $('o-inv').checked ? { on: 1, company: $('o-company').value.trim(), eik: $('o-eik').value.trim(), mol: $('o-mol').value.trim(), addr: $('o-addr').value.trim() } : null };
      if (!/^https?:$/.test(location.protocol)) { err.textContent = 'Нужна е интернет връзка.'; return; }
      btn.disabled = true; btn.textContent = 'Изпращам…';
      fetch('/api/order.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'same-origin' })
        .then(function (r) { return r.json(); }).then(function (j) {
          if (!j.ok) { var f = { name: 'o-name', email: 'o-email', phone: 'o-phone', school: 'o-school', terms: 'o-terms', 'inv-eik': 'o-eik' }[j.field]; if (f && $(f)) $(f).focus(); throw new Error(j.error || 'Грешка.'); }
          var b = j.bank;
          S.track('generate_lead', { currency: 'EUR', value: +j.amount || 0, items: [{ item_name: j.plan || data.plan, quantity: j.qty || 1 }] });
          d.querySelector('.modal-body').innerHTML = '<div class="ord-done"><div data-owl="cheer" style="width:120px;margin:0 auto"></div><h3>Поръчка № ' + escH(j.no) + ' е приета! 🎉</h3>' +
            '<p>Сума за плащане: <b>' + money(j.amount) + ' €</b> · ' + escH(j.plan) + ', ' + (j.period === 12 ? '1 година' : '6 месеца') + (j.qty > 1 ? ' × ' + j.qty + (pl === 'class' ? ' класа' : '') : '') + '</p>' +
            (b ? '<div class="ord-bank"><div><small>Получател</small><b>' + escH(b.name) + '</b></div><div><small>IBAN</small><b class="mono">' + escH(b.iban) + '</b>' + (b.bank ? ' <small>' + escH(b.bank) + '</small>' : '') + '</div><div><small>Основание</small><b>' + escH(b.reason) + '</b></div></div><p class="hint">Изпратихме ви тези данни и на имейла. След плащането кодът идва на ' + escH(data.email) + ' – обикновено до 1 работен ден.</p>'
              : '<p class="hint">До 1 работен ден ще ви изпратим проформа фактура с данните за плащане на <b>' + escH(data.email) + '</b>. След плащането получавате кода на същия имейл.</p>') +
            (pl !== 'class' && !(S.Account && S.Account.loggedIn()) ? '<p class="hint">💡 Докато чакате: <a href="registracia.html">направете си безплатен акаунт</a> – кодът ще важи на всички устройства на детето.</p>' : '') +
            '<div class="modal-actions"><button class="btn" data-close>Готово</button></div></div>';
          S.renderOwls(d); d.querySelector('[data-close]').addEventListener('click', function () { d.close(); }); if (S.confetti) S.confetti();
        }).catch(function (x) { err.textContent = x.message === 'Failed to fetch' ? 'Няма връзка със сървъра. Опитайте пак.' : x.message; btn.disabled = false; btn.textContent = 'Поръчай'; });
    });
  };
  S.accessModal = function () {
    S.modal(
      '<div data-owl="encourage"></div><h3>Тази мисия е с пълен достъп</h3>' +
      '<p>В безплатния план са първите ' + S.config.freeAdventureLevels + ' мисии от всеки клас, „Бързо сметни“ и ' + S.config.freePracticePerDay + ' задачи на ден в „Тренировка“. ' +
      (S.SALES ? 'Всичко останало се отключва с абонамент.' : 'Сега Сметко е в затворен тест – всичко останало е само с код за достъп от нас.') + ' Ученик от клас? Влез с името и паролата от учителя.</p>' +
      '<div class="modal-actions"><a class="btn btn-green" href="' + S.PAID_URL + '">' + S.PAID_BTN + '</a><a class="btn btn-ghost" href="vhod.html">Вход</a></div>'
    );
  };
  S.loginModal = function () { location.href = 'vhod.html'; };

  /* ---------- Сигнали: „Нещо не е наред?“ и грешки в браузъра (/api/feedback.php) ---------- */
  var VER = (function () { var sc = document.querySelector('script[src*="js/app.js"]'); var m = sc && sc.src.match(/v=(\d+)/); return m ? m[1] : ''; })();
  function fbPost(d) {
    if (!/^https?:$/.test(location.protocol)) return Promise.reject(new Error('offline'));
    d.page = location.pathname + location.search; d.ver = VER; d.vw = innerWidth + 'x' + innerHeight;
    return fetch('/api/feedback.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), credentials: 'same-origin', keepalive: true })
      .then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.error || 'Грешка.'); return j; });
  }
  var jsSent = {}, jsCount = 0;
  function logJs(msg, src, line, col, stack) {
    msg = String(msg || '').slice(0, 300); if (!msg || jsCount >= 5) return;
    if (/ResizeObserver loop|Script error\.?$|extension:\/\/|chrome-extension|moz-extension/i.test(msg + ' ' + (src || ''))) return; // шум от браузъра и разширения
    var k = msg + '|' + line; if (jsSent[k]) return; jsSent[k] = 1; jsCount++;
    fbPost({ kind: 'js', msg: msg, src: String(src || '').slice(0, 200), line: line || 0, col: col || 0, stack: String(stack || '').slice(0, 1500) }).catch(function () {});
  }
  window.addEventListener('error', function (e) { if (e && e.message) logJs(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack); });
  window.addEventListener('unhandledrejection', function (e) { var r = e && e.reason; if (r && r.message === 'Failed to fetch') return; logJs('Promise: ' + (r && r.message || r), '', 0, 0, r && r.stack); });
  S.feedback = function () {
    var ctx = S.fbContext ? S.fbContext() : null, t = ctx && ctx.task;
    var plain = function (h) { var d = document.createElement('div'); d.innerHTML = String(h || '').replace(/\{\?\}/g, '?'); return (d.textContent || '').replace(/\s+/g, ' ').trim(); };
    var d = S.modal('<h3>Нещо не е наред?</h3>' + (t ? '<p class="fb-task">' + escH(plain(t.q)) + '</p>' : '<p>Пишете ни какво не работи – ще го оправим.</p>') +
      '<form id="fb-form" class="fb-form">' + (t ? '<div class="fb-opts">' + [['wrong', '❌ Отговорът е грешен'], ['unclear', '🤔 Задачата е неясна'], ['broken', '🛠️ Нещо не работи'], ['other', '💬 Друго']].map(function (o, i) {
        return '<label><input type="radio" name="fb-r" value="' + o[0] + '"' + (i === 0 ? ' checked' : '') + '><span>' + o[1] + '</span></label>'; }).join('') + '</div>' : '') +
      '<label class="fb-lbl">' + (t ? 'Опишете (по желание)' : 'Какво се случи?') + '<textarea class="input" id="fb-text" rows="3" maxlength="1000" placeholder="' + (t ? 'Например: верният отговор е 12' : 'Например: на телефона бутонът не се натиска') + '"></textarea></label>' +
      '<p class="hint">Не пишете имена, телефони или адреси. Изпращаме само задачата и вида на устройството.</p><p class="code-err" id="fb-err" role="alert"></p>' +
      '<div class="modal-actions"><button class="btn btn-ghost" type="button" data-close>Отказ</button><button class="btn" type="submit">Изпрати</button></div></form>');
    d.classList.add('fb-modal');
    var f = d.querySelector('#fb-form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = f.querySelector('input[name="fb-r"]:checked'), txt = d.querySelector('#fb-text').value.trim(), err = d.querySelector('#fb-err');
      if (!t && !txt) { err.textContent = 'Опишете накратко какво не е наред.'; return; }
      var b = f.querySelector('button[type=submit]'); b.disabled = true; b.textContent = 'Изпращам…';
      var task = t ? { q: plain(t.q), full: plain(t.full), answer: String(t.answer), input: ctx.input || '', skill: t.skill || '', grade: t.grade || ctx.grade, level: t.level || ctx.level, mode: ctx.mode, book: ctx.book || '', mission: ctx.mission || '', a11y: ctx.a11y || '' } : null;
      fbPost({ kind: t ? 'task' : 'bug', reason: r ? r.value : 'other', text: txt, task: task })
        .then(function () { d.close(); S.toast('🦉 Благодарим! Сигналът е изпратен.'); })
        .catch(function (x) { err.textContent = x.message === 'offline' || x.message === 'Failed to fetch' ? 'Няма връзка. Опитайте пак.' : x.message; b.disabled = false; b.textContent = 'Изпрати'; });
    });
  };

  /* ---------- Конфети ---------- */
  S.confetti = function (count) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.documentElement.classList.contains('a11y-calm')) return; // спокоен режим (СОП)
    var c = document.getElementById('confetti');
    if (!c) { c = document.createElement('canvas'); c.id = 'confetti'; document.body.appendChild(c); }
    var ctx = c.getContext('2d'), W, H, dpr = window.devicePixelRatio || 1;
    function size() { W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size();
    var colors = ['#FF5A5F', '#FF9F1C', '#FFC531', '#4CBB4A', '#2F80ED', '#8E6CF0'];
    var parts = [];
    for (var i = 0; i < (count || 140); i++) {
      parts.push({ x: W / 2 + (Math.random() - .5) * W * .4, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4,
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: colors[i % colors.length] });
    }
    var start = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, W, H);
      var alive = false;
      parts.forEach(function (p) {
        p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        if (p.y < H + 20) alive = true;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (alive && t - start < 4000) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    })(start);
  };

  /* ---------- Хедър ---------- */
  function updateChip() {
    var chip = document.querySelector('[data-points]');
    if (!chip || !S.Game) return;
    var on = S.Game.earns();
    chip.hidden = !on; // без абонамент няма точки
    if (on) chip.innerHTML = '<span class="star">★</span> ' + S.Game.state.points;
  }
  /* Точки, натрупани без абонамент (напр. при пробване), се изчистват веднъж. Звездите в мисиите остават. */
  function cleanFreeProgress() {
    var G = S.Game; if (!G || G.earns()) return;
    var st = G.state;
    if (st.access || st.accessLost || st.freeCleaned) return; // абонат (и с изтекъл код) пази всичко
    st.points = 0; st.badges = {}; st.maxCombo = 0; st.streak = { count: 0, last: null }; st.freeCleaned = true;
    G.save();
  }
  S.updateChip = updateChip;

  document.addEventListener('DOMContentLoaded', function () {
    cookieBar();
    document.querySelectorAll('[data-consent]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); S.cookieSettings(); }); });
    S.loadConfig();
    S.loadNews();
    S.renderOwls();
    cleanFreeProgress();
    updateChip();
    var mb = document.querySelector('.menu-btn'), mn = document.querySelector('.mobile-nav');
    if (mb && mn) mb.addEventListener('click', function () {
      var open = mn.classList.toggle('open');
      mb.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // хедър върху небето: става плътен при скрол
    var hdr = document.querySelector('.site-header.over');
    if (hdr) { var onS = function () { hdr.classList.toggle('scrolled', window.scrollY > 30 || document.querySelector('.mobile-nav.open')); }; window.addEventListener('scroll', onS, { passive: true }); onS(); if (mb) mb.addEventListener('click', onS); }
    // падащи менюта (клик/тъч; на десктоп и при задържане)
    document.querySelectorAll('.dd').forEach(function (dd) {
      var btn = dd.querySelector('.dd-btn');
      btn.addEventListener('click', function (e) { e.stopPropagation(); var open = !dd.classList.contains('open'); document.querySelectorAll('.dd.open').forEach(function (o) { o.classList.remove('open'); o.querySelector('.dd-btn').setAttribute('aria-expanded', 'false'); }); dd.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    });
    document.addEventListener('click', function () { document.querySelectorAll('.dd.open').forEach(function (o) { o.classList.remove('open'); o.querySelector('.dd-btn').setAttribute('aria-expanded', 'false'); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') document.querySelectorAll('.dd.open').forEach(function (o) { o.classList.remove('open'); }); });
    document.querySelectorAll('[data-feedback]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); S.feedback(); }); });
    document.querySelectorAll('[data-login]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); S.loginModal(); }); });
    document.querySelectorAll('[data-subscribe]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); S.subscribeModal(b.getAttribute('data-subscribe'), +b.getAttribute('data-qty') || 1); }); });
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
    // покана за анкетата – докато човек не я е попълнил на това устройство
    var svDone = false; try { svDone = !!(JSON.parse(localStorage.getItem('smetko.survey') || 'null') || {}).sent; } catch (e) {}
    document.querySelectorAll('[data-survey-cta]').forEach(function (el) { el.hidden = svDone; });
    // запомнен клас → маркира бутона
    try { var lg = S.Game && S.Game.state.lastGrade; if (lg) { var gb = document.querySelector('.grade-btn.g' + lg); if (gb) gb.setAttribute('data-last', '1'); } } catch (e) {}
  });

  /* ---------- PWA ---------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }
})();
