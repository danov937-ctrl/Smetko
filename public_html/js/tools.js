/* Сметко — инструменти за учители: линк за домашна и работни листове */
(function () {
  'use strict';
  var S = window.Smetko, E = S.MathEngine, B = S.Books;
  function $(id) { return document.getElementById(id); }
  function topicOptions(g, withMix) {
    if (!E) return '';
    var h = withMix ? '<option value="mix">Всички теми (смесено)</option>' : '';
    E.GRADES[g].topics.forEach(function (t, i) { h += '<option value="' + t.id + '">' + (i + 1) + '. ' + t.name + '</option>'; });
    return h;
  }
  function base() { return /^https?:$/.test(location.protocol) ? location.origin : 'https://smetko.com'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- Линк за домашна ----------
  function initHomework() {
    var g = $('hw-grade'), m = $('hw-mode'), t = $('hw-topic'), b = $('hw-book'), out = $('hw-link');
    function fill() {
      var gr = +g.value;
      t.innerHTML = topicOptions(gr, true);
      b.innerHTML = B.list(gr).map(function (x) { return '<option value="' + x.id + '">' + (x.id === 'mon' ? 'По учебната програма (всички учебници)' : esc(x.publisher + ' – ' + x.title)) + '</option>'; }).join('');
      update();
    }
    function update() {
      var adv = m.value === 'adventure';
      $('hw-topic-l').hidden = adv; $('hw-book-l').hidden = !adv;
      var url = base() + '/game.html?grade=' + g.value + '&mode=' + m.value;
      if (adv) { if (b.value !== 'mon') url += '&book=' + b.value; } else if (t.value !== 'mix') url += '&topic=' + t.value;
      out.value = url; $('hw-open').href = url;
    }
    g.addEventListener('change', fill); m.addEventListener('change', update); t.addEventListener('change', update); b.addEventListener('change', update);
    $('hw-copy').addEventListener('click', function () {
      var done = function () { S.toast('✅ Линкът е копиран'); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(out.value).then(done, function () { out.select(); document.execCommand('copy'); done(); });
      else { out.select(); document.execCommand('copy'); done(); }
    });
    fill();
  }

  // ---------- Работни листове ----------
  function initWorksheet() {
    var g = $('ws-grade'), t = $('ws-topic'), lv = $('ws-level'), cnt = $('ws-count'), ans = $('ws-answers');
    function fillTopics() { t.innerHTML = topicOptions(+g.value, true); render(); }
    function render() {
      var gr = +g.value, n = +cnt.value, seen = {}, tasks = [], guard = 0;
      while (tasks.length < n && guard++ < n * 60) {
        var k = E.generate(gr, t.value, +lv.value);
        if (k.kind !== 'number' || k.figure || k.dots || seen[k.q]) continue;
        seen[k.q] = 1; tasks.push(k);
      }
      tasks.sort(function (a, b) { return (a.word ? 1 : 0) - (b.word ? 1 : 0); });
      var title = E.GRADES[gr].name + ' · ' + E.topicName(gr, t.value);
      var head = '<div class="ws-head"><div class="ws-brand">Сметко <small>smetko.com</small></div><div class="ws-title"><b>Работен лист</b><span>' + esc(title) + '</span></div>' +
        '<div class="ws-fields"><span>Име: ______________________</span><span>Дата: ____________</span></div></div>';
      var body = '<ol class="ws-list">' + tasks.map(function (k) {
        var q = k.q.replace('{?}', '<span class="ws-blank"></span>');
        return '<li class="' + (k.word ? 'ws-word' : '') + '">' + q + '</li>';
      }).join('') + '</ol><div class="ws-foot">Решени верно: ______ от ' + tasks.length + ' &nbsp; ☆ ☆ ☆</div>';
      $('ws-sheet').innerHTML = head + body;
      $('ws-key').innerHTML = '<div class="ws-head"><div class="ws-brand">Сметко</div><div class="ws-title"><b>Отговори</b><span>' + esc(title) + '</span></div></div>' +
        '<ol class="ws-keylist">' + tasks.map(function (k) { return '<li>' + esc(String(k.full).replace(/<[^>]+>/g, '')) + '</li>'; }).join('') + '</ol>';
      $('ws-key').hidden = !ans.checked;
    }
    g.addEventListener('change', fillTopics);
    [t, lv, cnt].forEach(function (el) { el.addEventListener('change', render); });
    ans.addEventListener('change', function () { $('ws-key').hidden = !ans.checked; });
    $('ws-new').addEventListener('click', render);
    $('ws-print').addEventListener('click', function () { window.print(); });
    fillTopics();
  }


  // ---------- Код за достъп ----------
  function fmtCode(v) {
    var c = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.indexOf('SMET') === 0) c = c.slice(4);
    c = c.slice(0, 8);
    return 'SMET-' + c.slice(0, 4) + (c.length > 4 ? '-' + c.slice(4) : '');
  }
  function bindCodeInput(inp) {
    inp.addEventListener('input', function () { var v = inp.value; if (!v.replace(/[^A-Za-z0-9]/g, '') || v.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === 'SMET') { inp.value = v.toUpperCase(); return; } inp.value = fmtCode(v); });
  }
  S.fmtCode = fmtCode;
  S.bindCodeInput = function (inp) { bindCodeInput(inp); };
  function initCode() {
    var form = $('code-form'), inp = $('code-input'), nick = $('nick-input'), err = $('code-err'), ok = $('code-ok'), btn = $('code-btn');
    bindCodeInput(inp);
    // родител с акаунт: кодът се свързва с детски профил и важи на всяко устройство
    var AC = S.Account && S.Account.data, prof = $('code-profile');
    if (AC && AC.profiles && AC.profiles.length && prof) {
      prof.innerHTML = AC.profiles.map(function (p) { return '<option value="' + p.id + '"' + (p.id === AC.pid ? ' selected' : '') + '>' + esc(p.avatar + ' ' + p.name + ' · ' + p.grade + '. клас') + '</option>'; }).join('') + '<option value="0">Само на това устройство (без профил)</option>';
      $('code-profile-wrap').hidden = false;
      var syncNick = function () { var on = prof.value !== '0'; nick.closest('.nick-wrap').hidden = on; };
      prof.addEventListener('change', syncNick); syncNick();
    } else if (AC && $('code-profile-hint')) $('code-profile-hint').hidden = false;
    var q = new URLSearchParams(location.search).get('c'); if (q) inp.value = fmtCode(q);
    if (S.Game && S.Game.state.nickname) nick.value = S.Game.state.nickname;
    function showOk(a, fresh) {
      form.hidden = true; ok.hidden = false;
      ok.innerHTML = '<div class="owl" data-owl="cheer" style="width:140px;margin:0 auto"></div><h2>' + (fresh ? 'Готово! 🎉' : 'Имаш пълен достъп') + '</h2>' +
        '<p class="lead-dark">Код <b>' + esc(a.code) + '</b> · ' + esc(a.typeName || '') + ' · валиден до <b>' + S.fmtDate(a.expires) + '</b></p>' +
        (a.type === 'class' ? '<p class="hint">Резултатите ти влизат в класацията на класа. Виж я в „Постижения“.</p>' : '') +
        '<div class="hero-cta" style="justify-content:center"><a class="btn btn-lg" href="game.html">Играй</a><a class="btn btn-ghost" href="achievements.html">Постижения</a></div>' +
        '<p class="hint" style="margin-top:18px"><button class="btn btn-sm btn-ghost" id="code-other">Въведи друг код</button></p>';
      S.renderOwls(ok);
      $('code-other').addEventListener('click', function () { ok.hidden = true; form.hidden = false; inp.value = ''; inp.focus(); });
      if (fresh) { S.confetti(); if (S.Audio) S.Audio.win(); }
    }
    var cur = S.Access && S.Access.get(); if (cur && !q) showOk(cur, false);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); err.textContent = '';
      var code = fmtCode(inp.value);
      if (code.replace(/[^A-Z0-9]/g, '').length !== 12) { err.textContent = 'Кодът има 8 знака след SMET, напр. SMET-AB2C-D3EF.'; inp.focus(); return; }
      btn.disabled = true; btn.textContent = 'Проверявам…';
      var pid = prof && !$('code-profile-wrap').hidden ? +prof.value : 0;
      (pid ? S.Account.linkCode(pid, code).then(function (j) { return j.access; }) : S.Access.redeem(code, nick.value.trim(), S.Game ? S.Game.state.lastGrade : 0)).then(function (j) {
        showOk(S.Access.get() || j, true);
      }).catch(function (ex) { err.textContent = ex.message; }).then(function () { btn.disabled = false; btn.textContent = 'Активирай'; });
    });
  }

  // ---------- Класация ----------
  function boardTable(j, teacher) {
    if (!j.list.length) return '<div class="panel" style="text-align:center"><p class="lead-dark">Още никой не е въвел кода. Когато учениците започнат да играят, ще ги видите тук.</p></div>';
    var top = j.list.filter(function (r) { return !r.hidden; }).slice(0, 3);
    var pod = '<div class="podium">' + [1, 0, 2].map(function (i) { var r = top[i]; if (!r) return '<div class="pod empty"></div>'; return '<div class="pod p' + (i + 1) + (r.me ? ' me' : '') + '"><span class="medal">' + ['🥇', '🥈', '🥉'][i] + '</span><b>' + esc(r.name) + '</b><small>★ ' + r.points + '</small></div>'; }).join('') + '</div>';
    var rows = j.list.map(function (r) {
      var acc = r.answered ? Math.round(r.correct / r.answered * 100) + '%' : '–';
      return '<tr class="' + (r.me ? 'me' : '') + (r.hidden ? ' hid' : '') + '"><td>' + r.place + '</td><td>' + (teacher ? '<button class="linkish" data-rep="' + r.id + '" title="Отчет за ученика"><b>' + esc(r.name) + '</b> 📊</button>' : '<b>' + esc(r.name) + '</b>') + (r.me ? ' <span class="tag">ти</span>' : '') + '</td><td>★ ' + r.points + '</td><td>' + r.missions + '</td><td>' + r.stars + '</td>' +
        (teacher ? '<td>' + (r.active7 || 0) + '/7</td><td>' + (r.correct || 0) + '</td><td>' + acc + '</td><td>' + (r.last ? S.fmtDate(r.last.slice(0, 10)) : '–') + '</td><td class="mono-sm">' + esc(r.code || '') + '</td><td class="nowrap"><button class="btn btn-sm btn-ghost" data-hide="' + r.id + '" data-un="' + (r.hidden ? 1 : 0) + '">' + (r.hidden ? 'Покажи' : 'Скрий') + '</button> <button class="btn btn-sm btn-ghost" data-release="' + r.id + '" data-name="' + esc(r.name) + '" title="При смяна или загуба на устройство">Освободи кода</button></td>' : '') + '</tr>';
    }).join('');
    return pod + '<div class="table-wrap"><table class="compare board"><thead><tr><th>#</th><th>Ученик</th><th>Точки</th><th>Мисии</th><th>Звезди</th>' + (teacher ? '<th>Дни (7)</th><th>Верни</th><th>Точност</th><th>Последно</th><th>Код</th><th></th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  S.boardTable = boardTable;
  function teacherSet(j) {
    var where = j.school ? esc(j.school.name) + (j.school.town ? ', ' + esc(j.school.town) : '') : '';
    return '<form class="panel teach-set" id="ts-form"><h3 style="margin:0">🏆 Обща класация</h3>' +
      '<p class="hint" style="margin:0">' + (where ? 'Класът участва като <b>' + esc(j.className || 'клас') + ' · ' + where + '</b>. ' : 'Училището на класа още не е въведено – пишете ни на info@smetko.com. ') +
      'Вижте как се справяте срещу други класове и училища на <a href="liga.html">smetko.com/liga</a>.</p>' +
      '<div class="row2"><label>Вашето име в класацията на учителите<input class="input" id="ts-name" maxlength="40" placeholder="напр. г-жа Петрова" value="' + esc(j.teacherName || '') + '"></label>' +
      '<label class="check"><input type="checkbox" id="ts-public"' + (j['public'] !== false ? ' checked' : '') + '> Класът участва в общата класация (учениците се виждат само с прякор, клас и училище и само от играчи с код)</label>' +
      '<button class="btn btn-sm" type="submit">Запази</button></div></form>';
  }
  /* домашни с краен срок: задаване и резултати (учител) */
  function hwPost(d) {
    return fetch('/api/homework.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), credentials: 'same-origin' })
      .then(function (r) { return r.json(); }).then(function (x) { if (!x.ok) throw new Error(x.error || 'Грешка.'); return x; });
  }
  function ymdPlus(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function homework(code, pin, board) {
    var box = $('b-hw'); if (!box) return;
    var grade = board.grade || (board.className && /^[1-4]/.test(board.className) ? +board.className[0] : 0) || (S.Game && S.Game.state.lastGrade) || 1;
    function draw(r) {
      var opts = [1, 2, 3, 4].map(function (g) { return '<option value="' + g + '"' + (g === grade ? ' selected' : '') + '>' + g + '. клас</option>'; }).join('');
      var list = r.list.map(function (h) {
        var late = h.due < r.today;
        return '<details class="hw-row panel"><summary><span class="hw-ttl"><b>' + esc(h.title) + '</b><small>' + h.grade + '. клас · ' + h.count + ' задачи · трудност ' + h.level + ' · срок ' + S.fmtDate(h.due) + (late ? ' (мина)' : '') + '</small></span><span class="hw-cnt' + (h.doneCount === r.total && r.total ? ' all' : '') + '">' + h.doneCount + ' / ' + r.total + ' готови</span></summary>' +
          (h.students.length ? '<div class="table-wrap"><table class="compare"><thead><tr><th>Ученик</th><th>Резултат</th><th>Опити</th><th>Кога</th></tr></thead><tbody>' + h.students.map(function (x) {
            return '<tr class="' + (x.done ? '' : 'hid') + '"><td><b>' + esc(x.name) + '</b></td><td>' + (x.done ? x.correct + ' / ' + h.count + ' <span class="hint">(' + Math.round(x.correct / h.count * 100) + '%)</span>' : '<span class="hint">още не</span>') + '</td><td>' + (x.tries || '–') + '</td><td>' + (x.at ? S.fmtDate(x.at.slice(0, 10)) + ' ' + x.at.slice(11, 16) + (x.late ? ' <span class="tag">след срока</span>' : '') : '–') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<p class="hint">Още никой ученик не е въвел кода си.</p>') +
          '<p class="ws-actions"><a class="btn btn-sm btn-ghost" href="game.html?grade=' + h.grade + '&mode=practice&topic=' + encodeURIComponent(h.topic) + '" target="_blank">👀 Пробвай темата</a><button class="btn btn-sm btn-ghost" data-hw-del="' + h.id + '">🗑 Изтрий</button></p></details>';
      }).join('');
      box.innerHTML = '<form class="panel tool-panel" id="hw-form"><div class="tool-grid hw-grid"><label>Клас<select class="input" id="hwf-grade">' + opts + '</select></label><label>Тема<select class="input" id="hwf-topic">' + topicOptions(grade, true) + '</select></label>' +
        '<label>Задачи<select class="input" id="hwf-count"><option>10</option><option selected>15</option><option>20</option><option>30</option></select></label><label>Трудност<select class="input" id="hwf-level"><option value="1">1 – лесно</option><option value="2" selected>2 – средно</option><option value="3">3 – трудно</option></select></label>' +
        '<label>Срок<input class="input" type="date" id="hwf-due" min="' + ymdPlus(0) + '" max="' + ymdPlus(90) + '" value="' + ymdPlus(3) + '"></label></div>' +
        '<div class="ws-actions"><span class="hint">Учениците я виждат в „Играй“ и на началната страница.</span><button class="btn" type="submit">📚 Задай домашна</button></div><p class="code-err" id="hwf-err" role="alert"></p></form>' +
        (list || '<p class="hint" style="text-align:center">Още няма зададени домашни.</p>');
      $('hwf-grade').addEventListener('change', function () { grade = +this.value; $('hwf-topic').innerHTML = topicOptions(grade, true); });
      $('hw-form').addEventListener('submit', function (e) {
        e.preventDefault(); $('hwf-err').textContent = '';
        var t = $('hwf-topic'), b = this.querySelector('button[type=submit]'); b.disabled = true;
        hwPost({ code: code, pin: pin, action: 'create', grade: +$('hwf-grade').value, topic: t.value, title: t.value === 'mix' ? 'Смесени задачи · ' + $('hwf-grade').value + '. клас' : t.options[t.selectedIndex].text.replace(/^\d+\.\s*/, ''), count: +$('hwf-count').value, level: +$('hwf-level').value, due: $('hwf-due').value })
          .then(function (x) { S.toast('✅ Домашната е зададена'); draw(x); }).catch(function (ex) { $('hwf-err').textContent = ex.message; b.disabled = false; });
      });
      box.querySelectorAll('[data-hw-del]').forEach(function (b) { b.addEventListener('click', function () {
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Сигурни ли сте?'; return; }
        hwPost({ code: code, pin: pin, action: 'delete', id: +b.getAttribute('data-hw-del') }).then(draw).catch(function (ex) { S.toast(ex.message); });
      }); });
    }
    box.innerHTML = '<p class="hint">Зареждам…</p>';
    hwPost({ code: code, pin: pin, action: 'list' }).then(function (r) { if (r.grade) grade = r.grade; draw(r); }).catch(function (ex) { box.innerHTML = '<p class="code-err">' + esc(ex.message) + '</p>'; });
  }
  function initBoard() {
    var form = $('board-form'), code = $('b-code'), pin = $('b-pin'), err = $('b-err'), out = $('board-out'), rem = $('b-remember');
    bindCodeInput(code);
    try { var saved = JSON.parse(localStorage.getItem('smetko.board') || 'null'); if (saved) { code.value = saved.c; pin.value = saved.p; rem.checked = true; } } catch (e) {}
    function load(hide, un, release) {
      err.textContent = '';
      S.Access.teacherBoard(fmtCode(code.value), pin.value.trim(), hide, un, release).then(function (j) {
        if (release) S.toast('Кодът е освободен – детето може да го въведе отново на новото устройство.');
        try { if (rem.checked) localStorage.setItem('smetko.board', JSON.stringify({ c: fmtCode(code.value), p: pin.value.trim() })); else localStorage.removeItem('smetko.board'); } catch (e) {}
        out.innerHTML = '<div class="section-head" style="margin-top:30px"><h2 class="lined">' + esc(j.label || 'Класация') + '</h2><p>Активирали кода си: <b>' + j.uses + ' от ' + j.max + '</b> ученици · валидно до ' + S.fmtDate(j.expires) + ' · <button class="btn btn-sm btn-ghost" id="b-refresh">🔄 Обнови</button> <button class="btn btn-sm btn-ghost" onclick="window.print()">🖨️ Печат</button></p></div>' + boardTable(j, true) +
          '<div id="b-dipl" style="text-align:center;margin-top:18px"></div><div class="section-head" style="margin-top:30px"><h2 class="lined">📊 Отчет по теми</h2><p>Кои теми затрудняват класа – по задачите, решени в Сметко. Натиснете име на ученик за неговия отчет.</p></div><div id="b-topics"></div><div class="section-head" style="margin-top:30px"><h2 class="lined">📚 Домашни</h2><p>Задайте тема, брой задачи и срок – учениците виждат домашната в играта, а вие – кой я е предал и с колко верни.</p></div><div id="b-hw"></div>' + teacherSet(j) + '<p class="hint" style="margin-top:14px">Скритите ученици не се виждат от съучениците. Прякорите се избират от децата – ако някой е неподходящ, скрийте го. Всеки код е еднократен; ако дете смени или загуби устройство, натиснете „Освободи кода“ и то го въвежда отново.</p>';
        $('b-refresh').addEventListener('click', function () { load(); });
        if (S.Report) S.Report.topics($('b-topics'), j.topics);
        homework(fmtCode(code.value), pin.value.trim(), j);
        var dw = $('b-dipl');
        if (dw && S.diplomasOpen) {
          if (S.diplomasOpen()) {
            dw.innerHTML = '<button class="btn btn-lg btn-green" id="b-dipl-go">🎓 Грамоти за класа</button><p class="hint">Грамота за всеки ученик – I, II и III място в класацията и за постоянство. Имената може да поправите преди печат.</p>';
            $('b-dipl-go').addEventListener('click', function () {
              var vis = j.list.filter(function (r) { return !r.hidden; });
              S.openDiplomas({ kind: 'class', className: j.className ? j.className + ' клас' : '', school: j.school ? j.school.name + (j.school.town ? ', ' + j.school.town : '') : '', sign1: j.teacherName || '',
                items: vis.map(function (r, i) { var p = i + 1; return { name: r.name, place: p <= 3 && r.points > 0 ? p : 0, line: p <= 3 && r.points > 0 ? 'за ' + ['I', 'II', 'III'][p - 1] + ' място в класацията на класа по математика със Сметко – ' + r.points + ' точки и ' + r.stars + ' звезди' : 'за постоянство и успехи по математика със Сметко – ' + (r.answered || 0) + ' решени задачи и ' + r.stars + ' звезди' }; }) });
            });
          } else dw.innerHTML = '<p class="hint">🎓 Грамотите за класа се отварят в края на учебната година (от 1 юни).</p>';
        }
        out.querySelectorAll('[data-rep]').forEach(function (b) { b.addEventListener('click', function () {
          var r = j.list.filter(function (x) { return x.id === +b.getAttribute('data-rep'); })[0]; if (!r || !S.Report) return;
          var d = S.modal('<div id="rep-m"></div><div class="modal-actions"><button class="btn btn-ghost" onclick="window.print()">🖨️ Печат</button></div>'); d.classList.add('wide-modal');
          S.Report.render(d.querySelector('#rep-m'), { nickname: r.name, grade: r.grade, answered: r.answered, correct: r.correct, stars: r.stars, missions: r.missions, skills: r.skills, days: r.days });
        }); });
        var ts = $('ts-form');
        if (ts) ts.addEventListener('submit', function (e) {
          e.preventDefault();
          S.Access.teacherSettings(fmtCode(code.value), pin.value.trim(), { teacher_name: $('ts-name').value.trim(), 'public': $('ts-public').checked ? 1 : 0 })
            .then(function () { S.toast('Запазено ✓'); load(); }).catch(function (ex) { S.toast(ex.message); });
        });
        out.querySelectorAll('[data-hide]').forEach(function (b) { b.addEventListener('click', function () { load(+b.getAttribute('data-hide'), b.getAttribute('data-un') === '1'); }); });
        out.querySelectorAll('[data-release]').forEach(function (b) { b.addEventListener('click', function () {
          var d = S.modal('<div data-owl="think"></div><h3>Да освободим ли кода на ' + esc(b.getAttribute('data-name')) + '?</h3><p>Старото устройство губи достъпа и точките в класацията започват отначало. Кодът може да се въведе отново на <b>едно</b> ново устройство.</p><div class="modal-actions"><button class="btn btn-ghost" data-close>Отказ</button><button class="btn" id="rel-ok">Освободи</button></div>');
          d.querySelector('#rel-ok').addEventListener('click', function () { d.close(); load(0, false, +b.getAttribute('data-release')); });
        }); });
      }).catch(function (ex) { err.textContent = ex.message; });
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); load(); });
    if (code.value && pin.value) load();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if ($('code-form')) initCode();
    if ($('board-form')) initBoard();
    if ($('hw-grade')) initHomework();
    if ($('ws-grade')) initWorksheet();
  });
})();
