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
    var per = { schoolYear: [9.5, 'на месец', '≈ '], year: [12, 'на месец', ''], family: [4, 'на дете', '≈ '], 'class': [30, 'на ученик', '≈ '] };
    document.querySelectorAll('[data-per]').forEach(function (el) { var k = el.getAttribute('data-per'), d = per[k]; if (d && +P[k]) el.textContent = d[2] + money(+P[k] / d[0]) + ' € ' + d[1]; });
    document.querySelectorAll('[data-cfg]').forEach(function (el) { var k = el.getAttribute('data-cfg'), v = k === 'freeMissions' ? S.config.freeAdventureLevels : k === 'freePractice' ? S.config.freePracticePerDay : c[k]; if (v !== undefined) el.textContent = v; });
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

  S.toast = function (html, ms) {
    var t = document.createElement('div');
    t.className = 'toast'; t.innerHTML = html;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, ms || 2600);
  };

  S.subscribeModal = function (planName) {
    S.modal(
      '<div data-owl="happy"></div><h3>' + (planName ? 'Абонамент „' + planName + '“' : 'Отключи пълния достъп') + '</h3>' +
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
    if (chip && S.Game) chip.innerHTML = '<span class="star">★</span> ' + S.Game.state.points;
  }
  S.updateChip = updateChip;

  document.addEventListener('DOMContentLoaded', function () {
    S.loadConfig();
    S.renderOwls();
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
