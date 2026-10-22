/* Сметко — обща класация: училища, класове, учители, ученици (седмица / година). */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ord(n, neut) { // 1-ви, 2-ри, 7-ми, 11-ти… (училище: 1-во, 2-ро…)
    var t = n % 100, d = n % 10, m = (t > 10 && t < 20) ? 'т' : d === 1 ? 'в' : d === 2 ? 'р' : (d === 7 || d === 8) ? 'м' : 'т';
    return n + '-' + m + (neut ? 'о' : 'и');
  }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  var q = { scope: 'schools', period: 'week', grade: 0 };
  try { var saved = JSON.parse(localStorage.getItem('smetko.liga') || 'null'); if (saved) { q.scope = saved.scope || q.scope; q.period = saved.period || q.period; q.grade = +saved.grade || 0; } } catch (e) {}
  if (/^#(schools|classes|teachers|students|challenge)$/.test(location.hash)) q.scope = location.hash.slice(1);

  var EMPTY = {
    schools: 'Още няма училище в класацията за този период. Училище влиза в класацията с поне 5 ученици с код.',
    classes: 'Още няма клас в класацията за този период. Клас влиза в класацията с поне 3 ученици с код.',
    teachers: 'Още няма учители в класацията. Учителят се показва, когато въведе името си в „Класация на класа“.',
    students: 'Още никой не е спечелил точки за този период. Бъди първият!'
  };

  function sub(r) {
    if (q.scope === 'schools') return esc(r.town) + ' · ' + r.classes + (r.classes === 1 ? ' клас' : ' класа') + ' · ' + r.active + ' от ' + r.students + ' ученици играят';
    if (q.scope === 'classes') return esc(r.school) + (r.town ? ', ' + esc(r.town) : '') + (r.teacher ? ' · ' + esc(r.teacher) : '');
    if (q.scope === 'teachers') return esc(r.school) + (r.town ? ', ' + esc(r.town) : '') + (r.classes ? ' · ' + esc(r.classes) + ' клас' : '');
    return [r['class'], r.school, r.town].filter(Boolean).map(esc).join(' · ');
  }
  function score(r) { return q.scope === 'students' ? num(r.points) : num(r.avg); }
  function scoreLabel() { return q.scope === 'students' ? 'точки' : 'точки на ученик'; }

  function render(j) {
    var out = $('#liga-out');
    if (j.locked) {
      out.innerHTML = '<div class="panel liga-locked"><div data-owl="think"></div><h3>Класациите са за абонати</h3><p>Училища, класове, учители и ученици от цялата страна – с всеки абонамент (индивидуален, семеен или за клас). Въведи кода си и влез в битката!</p><p><a class="btn btn-green" href="kod.html">🔑 Въведи код</a> <a class="btn btn-white" href="pricing.html">Абонаменти</a></p><p class="hint">Учител? Отворете първо <a href="klasaciya.html">класацията на класа</a> с код и ПИН и отметнете „Запомни на това устройство“.</p></div>';
      if (S.renderOwls) S.renderOwls(out);
      return;
    }
    if (!j.list.length) { out.innerHTML = '<div class="panel" style="text-align:center"><p class="lead-dark">' + EMPTY[q.scope] + '</p></div>'; return; }
    var top = j.list.slice(0, 3);
    var pod = '<div class="podium">' + [1, 0, 2].map(function (i) {
      var r = top[i]; if (!r) return '<div class="pod empty"></div>';
      return '<div class="pod p' + (i + 1) + (r.mine ? ' me' : '') + '"><span class="medal">' + ['🥇', '🥈', '🥉'][i] + '</span><b>' + esc(r.name) + '</b><small>' + score(r) + ' ' + (q.scope === 'students' ? '★' : 'т./уч.') + '</small></div>';
    }).join('') + '</div>';
    var rows = j.list.map(function (r) {
      var gap = r.place > 100 ? '<tr class="gap"><td colspan="3">…</td></tr>' : '';
      return gap + '<tr class="' + (r.mine ? 'me' : '') + '"><td class="pl">' + r.place + '</td><td><b>' + esc(r.name) + '</b>' + (r.mine ? ' <span class="tag">' + (q.scope === 'students' ? 'ти' : 'твоят') + '</span>' : '') + '<small class="liga-sub">' + sub(r) + '</small></td><td class="sc">' + score(r) + '<small>' + scoreLabel() + '</small></td></tr>';
    }).join('');
    out.innerHTML = pod + '<div class="table-wrap"><table class="compare board liga-table"><tbody>' + rows + '</tbody></table></div>' +
      '<p class="hint" style="margin-top:12px;text-align:center">' + (q.period === 'week' ? 'Седмицата започва отначало в понеделник.' : 'Точките от началото на учебната година (след въвеждане на кода).') + (q.scope === 'students' ? ' Показани са първите 100.' : '') + '</p>';
  }

  function mine(j) {
    var box = $('#liga-mine'), a = S.Access && S.Access.get();
    if (!a) { box.innerHTML = '<div class="liga-note">🔑 <span>С код от учителя твоите точки влизат в класацията на класа и на училището. <a href="kod.html">Въведи код</a></span></div>'; return; }
    if (q.scope === 'students' && j.myPlace) box.innerHTML = '<div class="liga-note me">⭐ <span>Ти си <b>' + ord(j.myPlace) + '</b> ' + (q.period === 'week' ? 'тази седмица' : 'тази година') + '. Продължавай!</span></div>';
    else if (q.scope === 'students') box.innerHTML = '<div class="liga-note">⭐ <span>Спечели точки' + (q.period === 'week' ? ' тази седмица' : '') + ', за да влезеш в класацията!</span></div>';
    else { var m = j.list.filter(function (r) { return r.mine; })[0]; box.innerHTML = m ? '<div class="liga-note me">🏆 <span>' + ({ schools: 'Твоето училище', classes: 'Твоят клас', teachers: 'Твоят учител' }[q.scope]) + ' е <b>' + ord(m.place, q.scope === 'schools') + '</b>!</span></div>' : ''; }
  }

  var seq = 0;
  function load() {
    try { localStorage.setItem('smetko.liga', JSON.stringify(q)); } catch (e) {}
    $$('[data-scope]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.scope === q.scope)); });
    $$('[data-period]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.period === q.period)); });
    $('#liga-grade').value = String(q.grade);
    var my = ++seq;
    $('.liga-filters .seg').style.visibility = q.scope === 'challenge' ? 'hidden' : '';
    if (q.scope === 'challenge') { loadChallenge(my); return; }
    $('#liga-out').classList.add('loading');
    if (!S.Access || !S.Access.online) { $('#liga-out').innerHTML = '<div class="panel" style="text-align:center"><p class="lead-dark">Класацията е достъпна на smetko.com с интернет връзка.</p></div>'; return; }
    S.Access.league({ scope: q.scope, period: q.period, grade: q.grade }).then(function (j) {
      if (my !== seq) return;
      $('#liga-out').classList.remove('loading'); render(j); mine(j);
    }).catch(function (e) { if (my === seq) $('#liga-out').innerHTML = '<div class="panel" style="text-align:center"><p class="lead-dark">' + esc(e.message) + '</p></div>'; });
  }

  function loadChallenge(my) {
    var g = q.grade || (S.Game && S.Game.state.lastGrade) || 1, out = $('#liga-out');
    if (!S.Challenge) return;
    S.Challenge.load().then(function (info) {
      var t = info.grades[g], m = S.Challenge.my(g);
      var head = '<div class="ch-card" style="margin-bottom:16px"><div class="ch-ico">🥇</div><div class="ch-txt"><small>Седмица ' + info.week.slice(-2) + ' · ' + g + '. клас' + (q.grade ? '' : ' (изберете клас горе)') + '</small><b>' + esc(t.title) + '</b><span>Цел: ' + info.goal + ' верни за 60 секунди · остават ' + S.Challenge.daysLeft() + ' дни' + (m.best ? ' · твоят рекорд: ' + m.best : '') + '</span></div><a class="btn btn-sm" href="game.html?mode=challenge&grade=' + g + '">Играй</a></div>';
      return S.Challenge.board(g).then(function (j) {
        if (my !== seq) return;
        $('#liga-mine').innerHTML = '';
        if (j.locked) { out.innerHTML = head + '<div class="panel liga-locked"><div data-owl="think"></div><h3>Класациите са за абонати</h3><p>Училища, класове, учители и ученици от цялата страна – с всеки абонамент (индивидуален, семеен или за клас). Въведи кода си и влез в битката!</p><p><a class="btn btn-green" href="kod.html">🔑 Въведи код</a> <a class="btn btn-white" href="pricing.html">Абонаменти</a></p><p class="hint">Учител? Отворете първо <a href="klasaciya.html">класацията на класа</a> с код и ПИН и отметнете „Запомни на това устройство“.</p></div>'; if (S.renderOwls) S.renderOwls(out); return; }
        if (!j.list.length) { out.innerHTML = head + '<div class="panel" style="text-align:center"><p class="lead-dark">Още никой не е играл тази седмица. Бъди първият!</p></div>'; return; }
        out.innerHTML = head + '<div class="table-wrap"><table class="compare board liga-table"><tbody>' + j.list.map(function (r) {
          return '<tr class="' + (r.mine ? 'me' : '') + '"><td class="pl">' + r.place + '</td><td><b>' + esc(r.name) + '</b>' + (r.mine ? ' <span class="tag">ти</span>' : '') + '<small class="liga-sub">' + [r['class'], r.school, r.town].filter(Boolean).map(esc).join(' · ') + '</small></td><td class="sc">' + r.best + '<small>верни за 60 с</small></td></tr>';
        }).join('') + '</tbody></table></div><p class="hint" style="margin-top:12px;text-align:center">Нова тема всеки понеделник. Броят се най-добрите резултати за седмицата.</p>';
      });
    }).catch(function (e) { if (my === seq) out.innerHTML = '<div class="panel" style="text-align:center"><p class="lead-dark">' + esc(e.message) + '</p></div>'; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!$('#liga-out')) return;
    $$('[data-scope]').forEach(function (b) { b.addEventListener('click', function () { q.scope = b.dataset.scope; try { history.replaceState(null, '', '#' + q.scope); } catch (e) {} load(); }); });
    $$('[data-period]').forEach(function (b) { b.addEventListener('click', function () { q.period = b.dataset.period; load(); }); });
    $('#liga-grade').addEventListener('change', function (e) { q.grade = +e.target.value; load(); });
    if (S.Access) S.Access.sync(true);
    setTimeout(load, S.Access && S.Access.get() ? 500 : 0);
  });
})();
