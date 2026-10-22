/* Сметко — страница „Моите постижения“ */
(function () {
  'use strict';
  var S = window.Smetko, G = S.Game, E = S.MathEngine;
  function $(s) { return document.querySelector(s); }

  function render() {
    var st = G.state, r = G.rank();
    $('#rank-line').textContent = 'Ниво ' + r.level + ': ' + r.name;
    $('#rank-bar').style.width = Math.round(r.progress * 100) + '%';
    $('#rank-next').textContent = r.next ? 'Още ' + (r.next.min - st.points) + ' точки до „' + r.next.name + '“' : 'Най-високото ниво! 🎓';

    var acc = st.answered ? Math.round(st.correct / st.answered * 100) : 0;
    $('#stats').innerHTML = [
      ['★ ' + st.points, 'точки'], [st.correct, 'верни задачи'], [acc + '%', 'точност'], ['🔥 ' + (st.streak.count || 0), 'поредни дни (рекорд в серия: ' + st.maxCombo + ')']
    ].map(function (x) { return '<div class="stat"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('');

    var have = 0;
    $('#badges').innerHTML = G.BADGES.map(function (b) {
      var got = !!st.badges[b.id]; if (got) have++;
      return '<div class="badge' + (got ? '' : ' locked') + '"><div class="b-ico">' + b.icon + '</div><b>' + b.name + '</b><small>' + b.desc + '</small></div>';
    }).join('');
    $('#badge-count').textContent = 'Събрани ' + have + ' от ' + G.BADGES.length + ' значки.';

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

  function myClass() {
    if (!S.Access || !S.Access.isClass()) return;
    var sec = $('#myclass-sec'), box = $('#myclass'), acc = S.Access.get();
    sec.hidden = false;
    $('#myclass-sub').innerHTML = 'Код ' + acc.code + (acc.label ? ' · ' + acc.label : '') + ' · <a href="#" id="nick-edit">' + (G.state.nickname ? 'Прякор: ' + G.state.nickname + ' (смени)' : 'Избери прякор') + '</a>';
    box.innerHTML = '<p class="lead-dark" style="text-align:center">Зареждам класацията…</p>';
    S.Access.sync(true);
    setTimeout(function () {
      S.Access.classBoard().then(function (j) { box.innerHTML = S.boardTable ? S.boardTable(j, false) : ''; })
        .catch(function (e) { box.innerHTML = '<p class="lead-dark" style="text-align:center">' + e.message + '</p>'; });
    }, 600);
    $('#nick-edit').addEventListener('click', function (e) {
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
