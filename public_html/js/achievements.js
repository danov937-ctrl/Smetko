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
      var stars = G.stars(g), n = E.ADVENTURE[g].length, tot = 0, done = 0;
      for (var i = 0; i < n; i++) { tot += stars[i] || 0; if (stars[i]) done++; }
      var best = st.best['quick-' + g + '-mix'] || 0, bestAny = 0;
      for (var k in st.best) if (k.indexOf('quick-' + g + '-') === 0) bestAny = Math.max(bestAny, st.best[k]);
      html += '<div class="card class-card g' + g + '"><h3>' + g + '. клас</h3><ul>' +
        '<li>Мисии: ' + done + ' от ' + n + '</li><li>Звезди: ' + tot + ' от ' + (n * 3) + '</li><li>Рекорд „Бързо сметни“: ' + (bestAny || '—') + '</li></ul>' +
        '<a class="btn btn-sm" href="game.html?grade=' + g + '&amp;mode=adventure">Продължи</a></div>';
    });
    $('#grades').innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    $('#reset-btn').addEventListener('click', function () {
      var d = S.modal('<div data-owl="think"></div><h3>Да изтрием ли прогреса?</h3><p>Всички точки, значки, звезди и рекорди на това устройство ще бъдат изтрити. Това не може да се върне.</p>' +
        '<div class="modal-actions"><button class="btn btn-ghost" data-close>Отказ</button><button class="btn" id="do-reset" style="--c:var(--red);--cd:var(--red-dark)">Изтрий</button></div>');
      d.querySelector('#do-reset').addEventListener('click', function () { G.reset(); d.close(); render(); S.updateChip(); S.toast('Прогресът е изтрит.'); });
    });
  });
})();
