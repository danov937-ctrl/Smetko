/* Сметко — страница „Моите постижения“ */
(function () {
  'use strict';
  var S = window.Smetko, G = S.Game, E = S.MathEngine;
  function $(s) { return document.querySelector(s); }

  function renderGrades(st) {
    var html = '';
    [1, 2, 3, 4].forEach(function (g) {
      var tot = 0, done = 0;
      Object.keys(st.adventure).forEach(function (k) {
        if (k === String(g) || k.indexOf(g + '-') === 0) { var m = st.adventure[k]; for (var i in m) { tot += m[i]; if (m[i]) done++; } }
      });
      var bestAny = 0;
      for (var k in st.best) if (k.indexOf('quick-' + g + '-') === 0) bestAny = Math.max(bestAny, st.best[k]);
      var bid = (st.books || {})[g] || 'mon', book = S.Books ? S.Books.get(g, bid) : null;
      html += '<div class="card class-card g' + g + '"><div class="cc-num">' + g + '</div><h3>' + g + '. клас</h3><ul>' +
        '<li>Изпълнени мисии: ' + done + '</li><li>Звезди: ' + tot + '</li><li>Рекорд „Бързо сметни“: ' + (bestAny || '—') + '</li>' +
        (book ? '<li>Учебник: ' + (book.id === 'mon' ? 'по програмата' : book.publisher) + '</li>' : '') + '</ul>' +
        '<div class="cc-actions"><a class="btn btn-sm" href="game.html?grade=' + g + '&amp;mode=adventure">Продължи</a></div></div>';
    });
    $('#grades').innerHTML = html;
  }

  function badgeGroups(st, lockedAll) { // значките по групи
    return G.GROUPS.map(function (g) {
      var list = G.BADGES.filter(function (b) { return b.g === g[0]; }), got = list.filter(function (b) { return !lockedAll && st.badges[b.id]; }).length;
      return '<div class="badge-group"><h3>' + g[1] + ' <small>' + got + '/' + list.length + '</small></h3><div class="badges">' + list.map(function (b) {
        var on = !lockedAll && !!st.badges[b.id];
        return '<div class="badge' + (on ? '' : ' locked') + '" title="' + b.desc + (on ? ' · спечелена на ' + S.fmtDate(st.badges[b.id]) : '') + '"><div class="b-ico">' + b.icon + '</div><b>' + b.name + '</b><small>' + b.desc + '</small></div>';
      }).join('') + '</div></div>';
    }).join('');
  }
  function render() {
    var st = G.state, r = G.rank();
    if (!G.earns()) { // без абонамент: без точки, нива и значки
      $('#rank-line').textContent = '🔒 Точки, нива и значки – ' + S.PAID;
      $('#rank-bar').style.width = '0';
      $('#rank-next').innerHTML = S.SALES ? 'С абонамент печелиш точки, вдигаш ниво, събираш значки и влизаш в класациите. <a href="pricing.html" style="color:#fff;text-decoration:underline">Абонаменти</a>' : 'С код за достъп печелиш точки, вдигаш ниво, събираш значки и влизаш в класациите. <a href="pricing.html#activate" style="color:#fff;text-decoration:underline">Имам код</a>';
      var acc0 = st.answered ? Math.round(st.correct / st.answered * 100) : 0;
      $('#stats').innerHTML = [[st.correct, 'верни задачи'], [acc0 + '%', 'точност'], ['🔒', 'точки – ' + S.PAID], ['🔒', 'серия от дни – ' + S.PAID]]
        .map(function (x) { return '<div class="stat"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('');
      $('#badges').innerHTML = badgeGroups(st, true);
      $('#badge-count').innerHTML = 'Значките се събират ' + S.PAID + '. <a href="' + S.PAID_URL + '">' + (S.SALES ? 'Виж абонаментите' : 'Имам код') + '</a>';
      renderGrades(st);
      return;
    }
    $('#rank-line').textContent = 'Ниво ' + r.level + ': ' + r.name;
    $('#rank-bar').style.width = Math.round(r.progress * 100) + '%';
    $('#rank-next').textContent = r.next ? 'Още ' + (r.next.min - st.points) + ' точки до „' + r.next.name + '“' : 'Най-високото ниво! 🎓';

    var acc = st.answered ? Math.round(st.correct / st.answered * 100) : 0;
    $('#stats').innerHTML = [
      ['★ ' + st.points, 'точки'], [st.correct, 'верни задачи'], [acc + '%', 'точност'], ['🔥 ' + (st.streak.count || 0), 'поредни дни (рекорд в серия: ' + st.maxCombo + ')']
    ].map(function (x) { return '<div class="stat"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('');

    G.check();
    $('#badges').innerHTML = badgeGroups(st, false);
    var have = G.BADGES.filter(function (b) { return st.badges[b.id]; }).length;
    $('#badge-count').innerHTML = 'Събрани <b>' + have + ' от ' + G.BADGES.length + '</b> значки.';

    renderGrades(st);
  }

  function esc2(x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function myClass() {
    if (!S.Access || !S.Access.isClass()) return;
    var sec = $('#myclass-sec'), box = $('#myclass'), acc = S.Access.get();
    sec.hidden = false;
    var stu = S.Account && S.Account.student;
    $('#myclass-sub').innerHTML = stu ? esc2(stu.avatar + ' ' + stu.name) + (stu.cls && stu.cls.name ? ' · ' + esc2(stu.cls.name) : '') + (stu.cls && stu.cls.school ? ' · ' + esc2(stu.cls.school) : '') : (acc.label ? esc2(acc.label) + ' · ' : '') + '<a href="#" id="nick-edit">' + (G.state.nickname ? 'Прякор: ' + esc2(G.state.nickname) + ' (смени)' : 'Избери прякор') + '</a>';
    box.innerHTML = '<p class="lead-dark" style="text-align:center">Зареждам класацията…</p>';
    S.Access.sync(true);
    setTimeout(function () {
      S.Access.classBoard().then(function (j) { box.innerHTML = S.boardTable ? S.boardTable(j, false) : ''; })
        .catch(function (e) { box.innerHTML = '<p class="lead-dark" style="text-align:center">' + e.message + '</p>'; });
    }, 600);
    if ($('#nick-edit')) $('#nick-edit').addEventListener('click', function (e) {
      e.preventDefault();
      var d = S.modal('<div data-owl="happy"></div><h3>Твоят прякор</h3><p>Само име или прякор – без фамилия.</p><input class="input" id="nick-new" maxlength="20" value="' + (G.state.nickname || '').replace(/"/g, '') + '"><div class="modal-actions"><button class="btn btn-green" id="nick-save">Запази</button></div>');
      d.querySelector('#nick-save').addEventListener('click', function () { S.Access.setNickname(d.querySelector('#nick-new').value.trim().slice(0, 20)); d.close(); myClass(); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    myClass();
    $('#reset-btn').addEventListener('click', function () {
      var d = S.modal('<div data-owl="think"></div><h3>Да изтрием ли прогреса?</h3><p>Всички точки, значки, звезди и рекорди на това устройство ще бъдат изтрити. Това не може да се върне.</p>' +
        '<div class="modal-actions"><button class="btn btn-ghost" data-close>Отказ</button><button class="btn" id="do-reset" style="--c:var(--red);--cd:var(--red-dark)">Изтрий</button></div>');
      d.querySelector('#do-reset').addEventListener('click', function () { G.reset(); d.close(); render(); S.updateChip(); S.toast('Прогресът е изтрит.'); });
    });
  });
})();
