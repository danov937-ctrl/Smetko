/* Сметко — общи функции за всички страници:
   настройки, рисуване на Сметко, меню, модални прозорци, конфети, PWA регистрация. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};

  /* ---------- НАСТРОЙКИ ----------
     paywall: true → безплатен план (Бързо сметни, първите мисии, 20 задачи/ден в Тренировка);
     пълният достъп се отключва с код за достъп (js/access.js, админ: /admin/).
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
  S.subscribeModal = function (planName) {
    var kind = planName; if (planName) planName = S.planName(planName);
    S.modal(
      '<div data-owl="happy"></div><h3>' + (planName ? 'Абонамент „' + planName + '“' + (kind !== planName ? '<br><small style="font-size:.6em;color:var(--muted)">' + kind + ' · ' + (S.period === 6 ? '6 месеца' : '1 година') + '</small>' : '') : 'Отключи пълния достъп') + '</h3>' +
      '<p>Пълният достъп до всички мисии по учебника и неограничената тренировка се активира с <b>код за достъп</b>. ' +
      'За абонамент пишете ни на <a href="mailto:' + S.config.contactEmail + '">' + S.config.contactEmail + '</a>.</p>' +
      '<div class="modal-actions"><a class="btn btn-green" href="kod.html">Имам код</a></div>'
    );
  };
  S.accessModal = function () {
    S.modal(
      '<div data-owl="encourage"></div><h3>Тази мисия е с пълен достъп</h3>' +
      '<p>В безплатния план са първите ' + S.config.freeAdventureLevels + ' мисии от всеки клас, „Бързо сметни“ и ' + S.config.freePracticePerDay + ' задачи на ден в „Тренировка“. ' +
      'Всичко останало се отключва с код от учителя или с абонамент.</p>' +
      '<div class="modal-actions"><a class="btn btn-green" href="kod.html">Въведи код</a><a class="btn btn-ghost" href="pricing.html">Цени</a></div>'
    );
  };
  S.loginModal = function () { location.href = 'kod.html'; };

  /* ---------- Конфети ---------- */
  S.confetti = function (count) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
    document.querySelectorAll('[data-login]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); S.loginModal(); }); });
    document.querySelectorAll('[data-subscribe]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); S.subscribeModal(b.getAttribute('data-subscribe')); }); });
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
    // запомнен клас → маркира бутона
    try { var lg = S.Game && S.Game.state.lastGrade; if (lg) { var gb = document.querySelector('.grade-btn.g' + lg); if (gb) gb.setAttribute('data-last', '1'); } } catch (e) {}
  });

  /* ---------- PWA ---------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }
})();
