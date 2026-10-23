/* Сметко — отчет за напредъка (за родителя и учителя).
   S.Report.render(елемент, данни) – данни: {nickname, points, correct, answered, stars, missions, grade, skills: {умение: [верни, всички]}, days: {дата: [всички, верни]}}
   S.Report.topics(елемент, topics) – обобщение по теми за целия клас. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function title(k) { return S.LessonMap ? S.LessonMap.skillTitle(k) : k; }
  function pct(c, a) { return a ? Math.round(c / a * 100) : 0; }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function bar(p) { var c = p >= 85 ? 'good' : p >= 65 ? 'mid' : 'low'; return '<span class="rp-bar ' + c + '"><i style="width:' + p + '%"></i></span><b>' + p + '%</b>'; }
  function lastDays(days, n) {
    var out = [], d = new Date();
    for (var i = n - 1; i >= 0; i--) { var x = new Date(d); x.setDate(d.getDate() - i); var k = ymd(x), v = (days || {})[k] || [0, 0]; out.push({ k: k, d: x, a: v[0], c: v[1] }); }
    return out;
  }
  function practiceLink(skill, grade) { return 'game.html?mode=practice&skill=' + encodeURIComponent(skill) + (grade ? '&grade=' + grade : ''); }

  function render(el, r) {
    var skills = r.skills || {}, keys = Object.keys(skills), days = r.days || {};
    var d28 = lastDays(days, 28), d7 = d28.slice(-7);
    var act7 = d7.filter(function (x) { return x.a; }).length, act28 = d28.filter(function (x) { return x.a; }).length;
    var tasks7 = d7.reduce(function (s, x) { return s + x.a; }, 0), corr7 = d7.reduce(function (s, x) { return s + x.c; }, 0);
    var max = Math.max(1, Math.max.apply(null, d28.map(function (x) { return x.a; })));
    var enough = keys.filter(function (k) { return skills[k][1] >= 5; });
    var weak = enough.slice().sort(function (a, b) { return pct(skills[a][0], skills[a][1]) - pct(skills[b][0], skills[b][1]); }).filter(function (k) { return pct(skills[k][0], skills[k][1]) < 80; }).slice(0, 5);
    var strong = enough.slice().sort(function (a, b) { return pct(skills[b][0], skills[b][1]) - pct(skills[a][0], skills[a][1]) || skills[b][1] - skills[a][1]; }).filter(function (k) { return pct(skills[k][0], skills[k][1]) >= 80; }).slice(0, 5);
    var dn = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    var h = '<div class="rp">' +
      (r.nickname ? '<h3 class="rp-name">' + esc(r.nickname) + (r.grade ? ' · ' + r.grade + '. клас' : '') + '</h3>' : '') +
      '<div class="rp-kpis">' +
        '<div><b>' + act7 + '/7</b><span>дни с игра тази седмица</span></div>' +
        '<div><b>' + tasks7 + '</b><span>задачи за 7 дни</span></div>' +
        '<div><b>' + (tasks7 ? pct(corr7, tasks7) : pct(r.correct, r.answered)) + '%</b><span>точност' + (tasks7 ? ' за 7 дни' : '') + '</span></div>' +
        '<div><b>' + (r.answered || 0) + '</b><span>задачи общо</span></div>' +
        '<div><b>' + (r.stars || 0) + ' ★</b><span>звезди от мисии</span></div>' +
        '<div><b>' + (r.missions || 0) + '</b><span>минати мисии</span></div>' +
      '</div>' +
      '<div class="rp-card"><h4>Активност за 4 седмици <small>(' + act28 + ' дни с игра)</small></h4><div class="rp-days">' +
        d28.map(function (x) { return '<i class="' + (x.a ? 'on' : '') + '" style="height:' + Math.max(4, Math.round(x.a / max * 100)) + '%" title="' + x.d.getDate() + '.' + (x.d.getMonth() + 1) + ': ' + x.a + ' задачи, ' + x.c + ' верни"></i>'; }).join('') +
      '</div><div class="rp-dx">' + d28.filter(function (_, i) { return i % 7 === 0 || i === 27; }).map(function (x) { return '<span>' + dn[x.d.getDay()] + ' ' + x.d.getDate() + '.' + (x.d.getMonth() + 1) + '</span>'; }).join('') + '</div></div>' +
      '<div class="rp-two">' +
        '<div class="rp-card good"><h4>💪 Справя се отлично</h4>' + (strong.length ? '<ul>' + strong.map(function (k) { return '<li>' + esc(title(k)) + ' ' + bar(pct(skills[k][0], skills[k][1])) + '</li>'; }).join('') + '</ul>' : '<p>Още няма достатъчно задачи (поне 5 от вид).</p>') + '</div>' +
        '<div class="rp-card low"><h4>🎯 За упражнение</h4>' + (weak.length ? '<ul>' + weak.map(function (k) { return '<li>' + esc(title(k)) + ' ' + bar(pct(skills[k][0], skills[k][1])) + ' <a class="rp-go" href="' + practiceLink(k, r.grade) + '">Упражни →</a></li>'; }).join('') + '</ul>' : '<p>' + (enough.length ? 'Няма слаби теми – браво!' : 'Още няма достатъчно задачи (поне 5 от вид).') + '</p>') + '</div>' +
      '</div>';
    if (keys.length) {
      var all = keys.sort(function (a, b) { return skills[b][1] - skills[a][1]; });
      h += '<details class="rp-card"><summary><b>Всички теми (' + all.length + ')</b></summary><table class="rp-table"><thead><tr><th>Тема</th><th>Задачи</th><th>Точност</th></tr></thead><tbody>' +
        all.map(function (k) { return '<tr><td>' + esc(title(k)) + '</td><td>' + skills[k][1] + '</td><td class="rp-acc">' + bar(pct(skills[k][0], skills[k][1])) + '</td></tr>'; }).join('') + '</tbody></table></details>';
    }
    h += '<p class="rp-tip">💡 Най-добре работи по 10–15 минути на ден. Похвалете усилието, не само верните отговори, и упражнете заедно темите от „За упражнение“.</p></div>';
    el.innerHTML = h;
  }

  function topics(el, t) {
    var keys = Object.keys(t || {}).filter(function (k) { return t[k].a >= 5; });
    if (!keys.length) { el.innerHTML = '<p class="hint">Отчетът по теми се появява, когато учениците решат поне 5 задачи от даден вид.</p>'; return; }
    keys.sort(function (a, b) { return pct(t[a].c, t[a].a) - pct(t[b].c, t[b].a); });
    el.innerHTML = '<div class="table-wrap"><table class="compare rp-table"><thead><tr><th>Тема</th><th>Ученици</th><th>Задачи</th><th>Точност на класа</th><th>Имат нужда от помощ</th></tr></thead><tbody>' +
      keys.map(function (k) { var x = t[k]; return '<tr><td><b>' + esc(title(k)) + '</b></td><td>' + x.n + '</td><td>' + x.a + '</td><td class="rp-acc">' + bar(pct(x.c, x.a)) + '</td><td>' + (x.weak && x.weak.length ? esc(x.weak.join(', ')) : '<span class="hint">–</span>') + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="hint">Най-трудните теми са най-отгоре. „Имат нужда от помощ“ – точност под 60% при поне 5 задачи.</p>';
  }

  S.Report = { render: render, topics: topics };
})();
/* страница „Отчет за родителя“ */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  function $(id) { return document.getElementById(id); }
  document.addEventListener('DOMContentLoaded', function () {
    if (!$('rp-local')) return;
    var G = S.Game, st = G ? G.state : {};
    if (st.answered) {
      var stars = 0, missions = 0; for (var k in st.adventure || {}) for (var i in st.adventure[k]) { stars += st.adventure[k][i]; if (st.adventure[k][i]) missions++; }
      S.Report.render($('rp-local'), { nickname: st.nickname || '', grade: st.lastGrade, answered: st.answered, correct: st.correct, stars: stars, missions: missions, skills: st.skills, days: st.days });
    } else {
      $('rp-local').innerHTML = '<div class="panel" style="text-align:center"><p class="lead-dark">На това устройство още няма решени задачи.</p><p>Влезте в акаунта си – там е отчетът за всяко дете.</p><p><a class="btn" href="profil.html">Моят профил</a> <a class="btn btn-ghost" href="game.html">🎮 Към играта</a></p></div>';
    }
    // грамота за детето (в края на учебната година)
    S.reportDiploma = function (r) {
      if (!S.diplomasOpen || !S.diplomasOpen() || !r || !r.answered) return '';
      return '<div class="rp-card" style="text-align:center"><h4>🎓 Край на учебната година!</h4><p>Отпечатайте грамота за детето – за всяка решена задача.</p><button class="btn btn-green" data-dipl>🎓 Грамота</button></div>';
    };
    function hookDipl(el, r) {
      var h = S.reportDiploma(r); if (!h) return;
      el.insertAdjacentHTML('beforeend', h);
      el.querySelector('[data-dipl]').addEventListener('click', function () { S.openDiplomas({ kind: 'child', items: [{ name: r.nickname || 'Нашият шампион', place: 0, line: 'за успешна учебна година по математика със Сметко – ' + r.answered + ' решени задачи и ' + (r.stars || 0) + ' звезди от мисиите' }] }); });
    }
    S.hookDipl = hookDipl;
    if (st.answered) { var lr = { nickname: st.nickname || '', answered: st.answered, stars: 0 }; for (var k2 in st.adventure || {}) for (var i2 in st.adventure[k2]) lr.stars += st.adventure[k2][i2]; hookDipl($('rp-local'), lr); }
  });
})();
