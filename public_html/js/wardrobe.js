/* Сметко — гардероб за совата, задача на деня и сезонни празници.
   • Гардероб: шапки и аксесоари се отключват със звездите от мисиите, с дните със „Задача на деня“ или по време на празник.
     Звездите не се харчат – само се събират. Облеклото е в state.outfit = {hat, acc}; js/owl.js го рисува.
   • Задача на деня: 5 задачи от класа на детето, веднъж на ден (state.dayTask = {done: {дата: верни}}).
   • Празници: тиквен празник, Коледа, Баба Марта, Ден на детето – банер и специален предмет, който се взима със задачата на деня. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  function G() { return S.Game; }
  function st() { return G() ? G().state : {}; }
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- празници (ММ-ДД, включително) ----------
  var SEASONS = [
    { id: 'autumn', from: '10-20', to: '11-03', name: 'Тиквен празник', ico: '🎃', item: 'pumpkin', text: 'Реши задачата на деня и вземи тиквената шапка!' },
    { id: 'xmas', from: '12-01', to: '01-07', name: 'Коледа', ico: '🎄', item: 'santa', text: 'Реши задачата на деня и вземи шапката на Дядо Коледа!' },
    { id: 'march', from: '02-25', to: '03-15', name: 'Баба Марта', ico: '❤️', item: 'martenitsa', text: 'Реши задачата на деня и закичи Сметко с мартеница!' },
    { id: 'june1', from: '05-28', to: '06-03', name: 'Ден на детето', ico: '🎈', item: 'flowers', text: 'Реши задачата на деня и вземи венеца от цветя!' }
  ];
  function md(d) { return d.slice(5); }
  function season(date) {
    var m = md(date || (G() ? G().today() : new Date().toISOString().slice(0, 10)));
    for (var i = 0; i < SEASONS.length; i++) { var s = SEASONS[i]; if (s.from <= s.to ? m >= s.from && m <= s.to : m >= s.from || m <= s.to) return s; }
    return null;
  }

  // ---------- предмети ----------
  // need: {stars: N} | {days: N} (дни със задача на деня) | {season: id} | {badges: N}
  var ITEMS = [
    { id: 'cap', kind: 'hat', name: 'Зелена шапка', need: null },
    { id: 'none', kind: 'hat', name: 'Без шапка', need: null },
    { id: 'cap_red', kind: 'hat', name: 'Червена шапка', need: { stars: 3 } },
    { id: 'cap_blue', kind: 'hat', name: 'Синя шапка', need: { stars: 6 } },
    { id: 'party', kind: 'hat', name: 'Парти шапка', need: { days: 3 } },
    { id: 'cap_purple', kind: 'hat', name: 'Лилава шапка', need: { stars: 10 } },
    { id: 'pirate', kind: 'hat', name: 'Пиратска шапка', need: { stars: 15 } },
    { id: 'wizard', kind: 'hat', name: 'Шапка на магьосник', need: { stars: 25 } },
    { id: 'crown', kind: 'hat', name: 'Корона', need: { stars: 45 } },
    { id: 'grad', kind: 'hat', name: 'Шапка на отличник', need: { stars: 70 } },
    { id: 'pumpkin', kind: 'hat', name: 'Тиквена шапка', need: { season: 'autumn' } },
    { id: 'santa', kind: 'hat', name: 'Шапка на Дядо Коледа', need: { season: 'xmas' } },
    { id: 'flowers', kind: 'hat', name: 'Венец от цветя', need: { season: 'june1' } },
    { id: 'none', kind: 'acc', name: 'Нищо', need: null },
    { id: 'bow', kind: 'acc', name: 'Папийонка', need: { stars: 8 } },
    { id: 'scarf', kind: 'acc', name: 'Шал', need: { days: 7 } },
    { id: 'medal', kind: 'acc', name: 'Медал', need: { days: 15 } },
    { id: 'cape', kind: 'acc', name: 'Наметало на герой', need: { stars: 35 } },
    { id: 'martenitsa', kind: 'acc', name: 'Мартеница', need: { season: 'march' } }
  ];
  function dayCount() { var d = (st().dayTask || {}).done || {}; return Object.keys(d).length; }
  function stars() { return G() ? G().totalStars() : 0; }
  function seasonal() { return (st().wardrobe || {}); }
  function unlocked(it) {
    var n = it.need; if (!n) return true;
    if (n.stars) return stars() >= n.stars;
    if (n.days) return dayCount() >= n.days;
    if (n.season) return !!seasonal()[it.id];
    return false;
  }
  function needShort(it) {
    var n = it.need; if (!n) return '';
    if (n.stars) return '⭐ ' + n.stars;
    if (n.days) return '🌞 ' + n.days + ' дни';
    var s = SEASONS.filter(function (x) { return x.id === n.season; })[0]; return s ? s.ico + ' ' + s.name : '';
  }
  function needText(it) {
    var n = it.need; if (!n) return '';
    if (n.stars) return stars() >= n.stars ? '' : '⭐ ' + n.stars + ' звезди (имаш ' + stars() + ')';
    if (n.days) return dayCount() >= n.days ? '' : '🌞 ' + n.days + ' дни със задача на деня (имаш ' + dayCount() + ')';
    if (n.season) { var s = SEASONS.filter(function (x) { return x.id === n.season; })[0], now = season(); return now && now.id === n.season ? s.ico + ' Само сега: реши задачата на деня!' : s.ico + ' По време на празника „' + s.name + '“'; }
    return '';
  }
  function outfit() { var o = st().outfit || {}; return { hat: o.hat || 'cap', acc: o.acc || 'none' }; }
  function wear(kind, id) {
    var s = st(); s.outfit = s.outfit || {}; s.outfit[kind] = id; if (G()) G().save();
    if (S.renderOwls) S.renderOwls();
  }
  function newly() { // предмети, отключени след последното отваряне на гардероба
    var seen = st().wardrobeSeen || {};
    return ITEMS.filter(function (it) { return it.need && unlocked(it) && !seen[it.kind + ':' + it.id]; });
  }
  function markSeen() { var s = st(); s.wardrobeSeen = s.wardrobeSeen || {}; ITEMS.forEach(function (it) { if (unlocked(it)) s.wardrobeSeen[it.kind + ':' + it.id] = 1; }); if (G()) G().save(); }

  // ---------- гардероб ----------
  function modal() {
    if (!S.modal || !S.owl) return;
    var fresh = newly().map(function (it) { return it.kind + ':' + it.id; });
    var cur = outfit();
    function grid(kind) {
      return '<div class="wd-grid">' + ITEMS.filter(function (it) { return it.kind === kind; }).map(function (it) {
        var ok = unlocked(it), on = cur[kind] === it.id, o = kind === 'hat' ? { hat: it.id, acc: 'none' } : { hat: cur.hat, acc: it.id };
        return '<button type="button" class="wd-item' + (on ? ' on' : '') + (ok ? '' : ' locked') + (fresh.indexOf(kind + ':' + it.id) >= 0 ? ' new' : '') + '" data-kind="' + kind + '" data-id="' + it.id + '"' + (ok ? '' : ' aria-disabled="true"') + '>' +
          '<span class="wd-owl" aria-hidden="true">' + S.owl('idle', o) + '</span><b>' + esc(it.name) + '</b>' + (ok ? '' : '<small>🔒 ' + esc(needShort(it)) + '</small>') + '</button>';
      }).join('') + '</div>';
    }
    var d = S.modal('<div class="wd-head"><div class="wd-me" id="wd-me">' + S.owl('cheer') + '</div><div><h3>Гардеробът на Сметко</h3><p>Облечи Сметко! Нови неща се отключват със <b>звездите от мисиите</b> (имаш ⭐ ' + stars() + ') и със <b>задачата на деня</b> (🌞 ' + dayCount() + (dayCount() === 1 ? ' ден' : ' дни') + ').</p></div></div>' +
      '<h4 class="wd-h">Шапки</h4>' + grid('hat') + '<h4 class="wd-h">Аксесоари</h4>' + grid('acc') +
      '<div class="modal-actions"><button class="btn" data-close>Готово</button></div>');
    d.classList.add('wd-modal');
    d.addEventListener('click', function (e) {
      var b = e.target.closest('.wd-item'); if (!b) return;
      var kind = b.getAttribute('data-kind'), id = b.getAttribute('data-id'), it = ITEMS.filter(function (x) { return x.kind === kind && x.id === id; })[0];
      if (!unlocked(it)) { if (S.toast) S.toast('🔒 ' + esc(needText(it))); return; }
      if (S.Audio) S.Audio.click();
      wear(kind, id); cur = outfit();
      d.querySelectorAll('.wd-item[data-kind="' + kind + '"]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-id') === id); });
      if (kind === 'hat') d.querySelectorAll('.wd-item[data-kind="acc"] .wd-owl').forEach(function (x) { x.innerHTML = S.owl('idle', { hat: cur.hat, acc: x.parentNode.getAttribute('data-id') }); });
      d.querySelector('#wd-me').innerHTML = S.owl('cheer');
    });
    markSeen(); badge(); d.addEventListener('close', progress);
    return d;
  }
  function badge() { var n = newly().length; document.querySelectorAll('[data-wardrobe-new]').forEach(function (el) { el.textContent = n || ''; el.hidden = !n; }); }

  // ---------- задача на деня ----------
  function today() { return G() ? G().today() : new Date().toISOString().slice(0, 10); }
  function doneToday() { var d = (st().dayTask || {}).done || {}; return today() in d; }
  /* записва резултата; връща отключените предмети (вкл. празничния) */
  function record(correct, total) {
    var s = st(), before = ITEMS.filter(unlocked).map(function (it) { return it.kind + ':' + it.id; });
    s.dayTask = s.dayTask || { done: {} }; s.dayTask.done = s.dayTask.done || {};
    var t = today(), first = !(t in s.dayTask.done), passed = correct >= Math.ceil(total * 0.6);
    if (first || correct > s.dayTask.done[t]) s.dayTask.done[t] = correct;
    var ks = Object.keys(s.dayTask.done).sort(); if (ks.length > 400) ks.slice(0, ks.length - 400).forEach(function (k) { delete s.dayTask.done[k]; });
    var sz = season();
    if (sz && passed) { s.wardrobe = s.wardrobe || {}; if (!s.wardrobe[sz.item]) s.wardrobe[sz.item] = t; }
    if (G()) G().save();
    var got = ITEMS.filter(function (it) { return unlocked(it) && before.indexOf(it.kind + ':' + it.id) < 0; });
    badge();
    return { first: first, passed: passed, items: got, days: dayCount() };
  }

  // ---------- карта в играта: задача на деня + празник ----------
  function card() {
    var sz = season(), dn = doneToday(), got = sz && seasonal()[sz.item];
    return '<div class="dt-card' + (dn ? ' done' : '') + (sz ? ' season-' + sz.id : '') + '">' +
      '<span class="dt-ico" aria-hidden="true">' + (dn ? '✅' : (sz ? sz.ico : '🌞')) + '</span>' +
      '<div class="dt-txt"><b>Задача на деня</b><small>' + (dn ? 'Готово за днес! Ела пак утре за нова. 🌞 ' + dayCount() + (dayCount() === 1 ? ' ден' : ' дни') : '5 задачи от твоя клас – всеки ден нови.') +
        (sz ? '<br><span class="dt-season">' + sz.ico + ' ' + esc(sz.name) + ': ' + (got ? 'взе специалния предмет! 🎉' : esc(sz.text)) + '</span>' : '') + '</small></div>' +
      '<button class="btn btn-sm' + (dn ? ' btn-white' : ' btn-green') + '" type="button" data-daytask>' + (dn ? 'Пак' : 'Реши') + '</button>' +
      '<button class="btn btn-sm btn-white dt-wd" type="button" data-wardrobe aria-label="Гардеробът на Сметко">👕<b class="dt-new" data-wardrobe-new hidden></b></button></div>';
  }

  S.Wardrobe = { ITEMS: ITEMS, SEASONS: SEASONS, season: season, unlocked: unlocked, outfit: outfit, wear: wear, modal: modal, newly: newly, badge: badge, stars: stars, dayCount: dayCount };
  S.DayTask = { doneToday: doneToday, record: record, card: card, count: dayCount };

  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-wardrobe]'); if (b) { e.preventDefault(); modal(); } });
  function progress() { var el = document.getElementById('wd-prog'); if (!el) return; var all = ITEMS.filter(function (it) { return it.need; }), got = all.filter(unlocked).length; el.innerHTML = '⭐ ' + stars() + ' звезди · 🌞 ' + dayCount() + ' дни със задача на деня · отключени <b>' + got + ' от ' + all.length + '</b> предмета'; }
  document.addEventListener('DOMContentLoaded', function () { badge(); progress(); });
})();
