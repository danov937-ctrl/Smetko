/* Сметко — седмично предизвикателство: темата на седмицата (/api/challenge.php), личен рекорд, класация. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var KEY = 'smetko.ch', info = null, pending = null;
  try { info = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  function online() { return /^https?:$/.test(location.protocol); }
  function load() {
    if (pending) return pending;
    if (!online()) { pending = info ? Promise.resolve(info) : Promise.reject(new Error('Нужна е интернет връзка.')); return pending; }
    pending = fetch('/api/challenge.php', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error('Няма връзка със сървъра.');
      info = j; try { localStorage.setItem(KEY, JSON.stringify(j)); } catch (e) {}
      return j;
    }).catch(function (e) { if (info) return info; throw e; });
    return pending;
  }
  function my(grade) { // личният резултат за тази седмица
    var st = S.Game ? S.Game.state : {}, c = st.challenge || {};
    if (!info || c.week !== info.week) return { best: 0, done: false };
    return { best: (c.best || {})[grade] || 0, done: !!(c.done || {})[grade] };
  }
  function record(grade, score) { // връща {best, isRecord, first, newBadges}
    var G = S.Game, st = G.state; if (!info) return { best: score };
    var c = st.challenge; if (!c || c.week !== info.week) c = st.challenge = { week: info.week, best: {}, done: {}, total: (c && c.total) || 0 };
    var prev = c.best[grade] || 0, isRecord = score > prev, first = false, nb = [];
    if (isRecord) c.best[grade] = score;
    if (score >= info.goal && !c.done[grade]) { c.done[grade] = true; first = true; c.total = (c.total || 0) + 1; G.addBonus(50); nb = nb.concat(G.awardBadge('challenge')); if (c.total >= 5) nb = nb.concat(G.awardBadge('challenge5')); }
    G.save();
    return { best: Math.max(prev, score), isRecord: isRecord && prev > 0, first: first, newBadges: nb };
  }
  function board(grade) {
    var a = S.Access && S.Access.get();
    if (!a || !online()) return Promise.resolve({ locked: true, list: [] });
    return fetch('/api/challenge.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: a.token, grade: grade }) }).then(function (r) { return r.json(); });
  }
  function daysLeft() { if (!info) return 0; var e = new Date(info.ends + 'T23:59:59'); return Math.max(0, Math.ceil((e - new Date()) / 864e5)); }
  S.Challenge = { load: load, my: my, record: record, board: board, daysLeft: daysLeft, get info() { return info; } };

  // карта „Предизвикателство на седмицата“ на началната страница и в играта: [data-challenge-card]
  document.addEventListener('DOMContentLoaded', function () {
    var cards = document.querySelectorAll('[data-challenge-card]'); if (!cards.length) return;
    load().then(function (j) {
      var g = (S.Game && S.Game.state.lastGrade) || 1;
      cards.forEach(function (el) {
        var t = j.grades[g], m = my(g), dl = daysLeft();
        el.innerHTML = '<div class="ch-ico">⚡</div><div class="ch-txt"><small>Предизвикателство на седмицата · ' + g + '. клас</small><b>' + t.title + '</b><span>' + (m.done ? '✅ Изпълнено! Рекорд: ' + m.best : 'Цел: ' + j.goal + ' верни за 60 секунди' + (m.best ? ' · твоят рекорд: ' + m.best : '')) + ' · остават ' + dl + (dl === 1 ? ' ден' : ' дни') + '</span></div><a class="btn btn-sm" href="game.html?mode=challenge&grade=' + g + '">Играй</a>';
        el.hidden = false;
      });
    }).catch(function () {});
  });
})();
