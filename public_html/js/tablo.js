/* Сметко — „Табло“ за учителя: класове, ученици (потребител и парола), домашни, отчет по теми, класация, грамоти, настройки.
   Сървър: /api/teacher.php (само за влязъл акаунт с активиран абонамент за клас). */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var root, list = [], cur = null, tab = 'home', teacherName = '';
  var TABS = [['home', '🏠', 'Преглед'], ['students', '👧', 'Ученици'], ['hw', '📚', 'Домашни'], ['topics', '📊', 'Теми'], ['rank', '🏆', 'Класация'], ['settings', '⚙️', 'Настройки']];
  var AV = ['🦉', '🦊', '🐻', '🐰', '🐼', '🐯', '🦁', '🐸', '🐵', '🐧', '🦄', '🐙', '🐢', '🐝', '🚀', '⚽', '🐶', '🐱', '🦋', '🐬'];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]; }); }
  function fmt(d) { return d ? S.fmtDate(String(d).slice(0, 10)) : '–'; }
  function qs(k) { return new URLSearchParams(location.search).get(k); }
  function pct(c, a) { return a ? Math.round(c / a * 100) : 0; }
  function days(d) { return Math.round((new Date(d) - new Date(new Date().toISOString().slice(0, 10))) / 864e5); }
  function ymdPlus(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function api(d) {
    return fetch('/api/teacher.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { throw new Error('Сървърът не отговаря. Опитайте пак след малко.'); }); })
      .then(function (j) { if (!j.ok) { var e = new Error(j.error || 'Грешка.'); e.auth = j.auth; throw e; } return j; });
  }
  function act(action, extra) { var d = { action: action, id: cur['class'].id }; for (var k in extra || {}) d[k] = extra[k]; return api(d).then(function (j) { cur = j; return j; }); }
  function setURL() { try { history.replaceState(null, '', 'tablo.html?c=' + (cur ? cur['class'].id : '') + (tab !== 'home' ? '&t=' + tab : '')); } catch (e) {} }

  /* ---------- начало ---------- */
  function start() {
    root = $('tablo'); if (!root) return;
    root.innerHTML = '<p class="hint" style="text-align:center;padding:40px 0">Зареждам Таблото…</p>';
    if (!/^https?:$/.test(location.protocol)) { root.innerHTML = '<p class="lead-dark">Нужна е интернет връзка.</p>'; return; }
    tab = TABS.some(function (t) { return t[0] === qs('t'); }) ? qs('t') : 'home';
    api({ action: 'classes' }).then(function (j) {
      list = j.classes; teacherName = j.teacher;
      if (!list.length) return empty();
      var want = +qs('c'), pick = list.filter(function (k) { return k.id === want; })[0] || list[0];
      return open(pick.id);
    }).catch(function (e) {
      if (e.auth === false) root.innerHTML = '<div class="panel tb-empty"><div class="owl" data-owl="hello" style="width:130px;margin:0 auto"></div><h2>Табло за учители</h2><p>Влезте в акаунта си, за да видите класа си.</p><div class="hero-cta" style="justify-content:center"><a class="btn btn-lg" href="vhod.html?next=tablo.html">Вход</a><a class="btn btn-ghost" href="registracia.html?role=teacher">Регистрация за учител</a></div></div>';
      else root.innerHTML = '<p class="code-err" style="text-align:center">' + esc(e.message) + '</p>';
      S.renderOwls(root);
    });
  }
  function empty() {
    root.innerHTML = '<div class="panel tb-empty"><div class="owl" data-owl="cheer" style="width:140px;margin:0 auto"></div><h2>Здравейте' + (teacherName ? ', ' + esc(teacherName.split(' ')[0]) : '') + '! Да създадем класа ви</h2>' +
      '<ol class="tb-steps"><li><b>Абонамент за клас</b><span>' + (S.SALES ? 'Поръчайте го от „Абонаменти“ – получавате един код по имейл.' : 'Абонаментите – очаквайте скоро. Ако участвате в пилотния проект, активирайте кода от нас в „Абонаменти“.') + '</span></li><li><b>Активирайте кода</b><span>В „Абонаменти“ → „Имате код?“. Класът се появява тук.</span></li><li><b>Добавете учениците</b><span>Пишете имената им – всеки получава потребител и парола. Отпечатвате картите и ги раздавате.</span></li></ol>' +
      '<div class="hero-cta" style="justify-content:center"><a class="btn btn-lg" href="pricing.html#activate">🔑 Имам код</a><a class="btn btn-ghost" href="pricing.html">Абонаменти</a></div></div>';
    S.renderOwls(root);
  }
  function open(id) {
    return api({ action: 'class', id: id }).then(function (j) { cur = j; draw(); }).catch(function (e) { S.toast(esc(e.message)); });
  }

  /* ---------- рамка ---------- */
  function draw() {
    var K = cur['class'], left = days(K.expires);
    var chips = list.length > 1 ? '<div class="tb-classes">' + list.map(function (k) { return '<button class="tb-cl' + (k.id === K.id ? ' on' : '') + '" data-cl="' + k.id + '"><b>' + esc(k.name) + '</b><small>' + k.students + ' ученици</small></button>'; }).join('') + '<a class="tb-cl add" href="pricing.html#activate">＋ Клас</a></div>' : '';
    root.innerHTML = '<div class="tb-top"><div><h1>📋 Табло</h1><p class="hint">' + esc(teacherName) + '</p></div>' + (list.length < 2 ? '<a class="btn btn-sm btn-ghost" href="pricing.html#activate">＋ Още един клас</a>' : '') + '</div>' + chips +
      '<div class="tb-head panel"><div class="tb-name"><span class="tb-badge">' + esc(K.className || '?') + '</span><div><h2>' + esc(K.name) + '</h2><p>' + esc([K.school, K.town].filter(Boolean).join(', ') || 'Училището още не е въведено') + '</p></div></div>' +
        '<div class="tb-sub' + (!K.valid ? ' off' : left <= 30 ? ' warn' : '') + '">' + (!K.valid ? '⛔ Абонаментът изтече на ' + fmt(K.expires) + ' · <a href="pricing.html">Поднови</a>' : left <= 30 ? '⏳ Абонаментът изтича след ' + left + ' дни · <a href="pricing.html">Поднови</a>' : '✓ Абонамент до ' + fmt(K.expires)) + ' · ' + cur.kpi.students + '/' + K.seats + ' ученици</div></div>' +
      '<nav class="tb-tabs" role="tablist">' + TABS.map(function (t) { return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '"><span>' + t[1] + '</span>' + t[2] + '</button>'; }).join('') + '</nav><div id="tb-body"></div>';
    root.querySelectorAll('[data-cl]').forEach(function (b) { b.addEventListener('click', function () { open(+b.getAttribute('data-cl')).then(setURL); }); });
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { tab = b.getAttribute('data-tab'); root.querySelectorAll('[data-tab]').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); }); body(); setURL(); }); });
    body(); setURL();
    if (qs('new') && !cur.students.length && tab === 'home') { tab = 'students'; draw(); }
  }
  function body() {
    var el = $('tb-body');
    ({ home: home, students: students, hw: homework, topics: topics, rank: rank, settings: settings })[tab](el);
    S.renderOwls(el);
  }
  function refreshAfter(p, msg) { return p.then(function () { if (msg) S.toast(msg); var y = window.scrollY; draw(); window.scrollTo(0, y); }).catch(function (e) { S.toast('⚠ ' + esc(e.message)); throw e; }); }

  /* ---------- преглед ---------- */
  function home(el) {
    var k = cur.kpi, T = cur.topics, keys = Object.keys(T).filter(function (x) { return T[x].a >= 10; }).sort(function (a, b) { return pct(T[a].c, T[a].a) - pct(T[b].c, T[b].a); }).slice(0, 3);
    var hwOpen = cur.homework.filter(function (h) { return h.due >= cur.today; });
    if (!k.students) {
      el.innerHTML = '<div class="panel tb-empty"><div class="owl" data-owl="hello" style="width:120px;margin:0 auto"></div><h3>Класът е празен</h3><p>Добавете учениците – всеки ще получи потребител и парола за вход в Сметко.</p><button class="btn btn-lg" data-go="students">➕ Добави ученици</button></div>';
    } else {
      el.innerHTML = '<div class="tb-kpis"><div><b>' + k.students + '</b><span>ученици</span></div><div><b>' + k.today + '</b><span>играли днес</span></div><div><b>' + k.week + '</b><span>за 7 дни</span></div><div><b>' + k.tasks7 + '</b><span>задачи за 7 дни</span></div><div><b>' + (k.acc7 === null ? '–' : k.acc7 + '%') + '</b><span>точност</span></div></div>' +
        '<div class="tb-two"><div class="panel"><h3>👀 Нуждаят се от внимание</h3>' + (k.idle.length ? '<p>Не са играли тази седмица: <b>' + k.idle.map(esc).join(', ') + '</b></p>' : '<p>Всички са играли тази седмица. 👏</p>') +
          (keys.length ? '<p>Най-трудни теми: ' + keys.map(function (x) { return '<b>' + esc(S.LessonMap ? S.LessonMap.skillTitle(x) : x) + '</b> (' + pct(T[x].c, T[x].a) + '%)'; }).join(', ') + '</p><button class="btn btn-sm btn-ghost" data-go="topics">Отчет по теми →</button>' : '<p class="hint">Отчетът по теми се появява, когато учениците решат повече задачи.</p>') + '</div>' +
        '<div class="panel"><h3>📚 Домашни</h3>' + (hwOpen.length ? hwOpen.slice(0, 3).map(function (h) { return '<p class="tb-hwline"><b>' + esc(h.title) + '</b> <span class="hw-cnt' + (h.doneCount === k.students ? ' all' : '') + '">' + h.doneCount + '/' + k.students + '</span><small>срок ' + fmt(h.due) + '</small></p>'; }).join('') : '<p>Няма активни домашни.</p>') + '<button class="btn btn-sm btn-ghost" data-go="hw">' + (hwOpen.length ? 'Всички домашни →' : '➕ Задай домашна') + '</button></div></div>';
    }
    var K = cur['class'];
    el.innerHTML += '<form class="panel tb-msg" id="msg-form"><h3>📣 Съобщение до класа</h3><p class="hint">Учениците го виждат в играта и на началната страница.</p><textarea class="input" id="msg" maxlength="300" rows="2" placeholder="напр. Браво за седмицата! До петък – таблицата за 7 🦉">' + esc(K.message) + '</textarea><div class="ws-actions"><span class="hint">' + (K.message ? 'Публикувано на ' + fmt(K.messageAt) : '') + '</span>' + (K.message ? '<button class="btn btn-sm btn-ghost" type="button" id="msg-clear">Изтрий</button>' : '') + '<button class="btn btn-sm" type="submit">Публикувай</button></div></form>' +
      '<div class="tb-quick"><button class="btn btn-ghost" data-go="students">👧 Ученици и пароли</button><button class="btn btn-ghost" id="q-cards">🖨️ Карти за вход</button><a class="btn btn-ghost" href="rabotni-listove.html">📄 Работни листове</a><a class="btn btn-ghost" href="liga.html">🌍 Обща класация</a></div>';
    el.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { tab = b.getAttribute('data-go'); draw(); }); });
    var qc = $('q-cards'); if (qc) qc.addEventListener('click', function () { printCards(cur.students); });
    $('msg-form').addEventListener('submit', function (e) { e.preventDefault(); saveSettings({ message: $('msg').value.trim() }, 'Съобщението е публикувано ✓'); });
    var mc = $('msg-clear'); if (mc) mc.addEventListener('click', function () { saveSettings({ message: '' }, 'Съобщението е изтрито'); });
  }

  /* ---------- ученици ---------- */
  function students(el) {
    var L = cur.students, K = cur['class'], free = K.seats - L.length;
    el.innerHTML = '<form class="panel tool-panel" id="add-form"><h3>➕ Добави ученици</h3><p class="hint">По едно име на ред (име и първа буква на фамилията, напр. „Ани П.“). Всеки получава потребител и парола. Свободни места: <b>' + free + '</b> от ' + K.seats + '.</p>' +
      '<textarea class="input" id="add-names" rows="4" placeholder="Ани П.&#10;Боби К.&#10;Вики М."' + (free <= 0 ? ' disabled' : '') + '></textarea><div class="ws-actions"><span class="hint">Може да поставите целия списък наведнъж.</span><button class="btn" type="submit"' + (free <= 0 ? ' disabled' : '') + '>Добави</button></div><p class="code-err" id="add-err" role="alert"></p></form>' +
      (L.length ? '<div class="panel"><div class="tb-listhead"><h3>Ученици (' + L.length + ')</h3><div class="row-btns"><button class="btn btn-sm btn-ghost" id="show-pw">👁 Покажи паролите</button><button class="btn btn-sm" id="print-cards">🖨️ Карти за вход</button></div></div>' +
        '<p class="hint">Децата влизат от <b>smetko.com</b> → <b>Вход</b> → <b>Ученик</b> с потребителя и паролата си.</p>' +
        '<div class="table-wrap"><table class="compare tb-table"><thead><tr><th>Ученик</th><th>Потребител</th><th>Парола</th><th>Точки</th><th>Дни (7)</th><th>Задачи</th><th>Точност</th><th>Последно</th><th></th></tr></thead><tbody>' +
        L.map(function (s) {
          return '<tr class="' + (s.hidden ? 'hid' : '') + '"><td><button class="linkish" data-rep="' + s.id + '"><span class="tb-av">' + esc(s.avatar) + '</span><b>' + esc(s.name) + '</b></button>' + (s.hidden ? ' <span class="tag">скрит</span>' : '') + (s.adapt ? ' <span class="tag tag-adapt" title="Има помощни настройки">🤝 помощ</span>' : '') + (s.parents ? ' <span class="tag" title="Родителят вижда отчета и домашните">👪 ' + s.parents + '</span>' : '') + '</td>' +
            '<td class="mono-sm">' + esc(s.username) + '</td><td class="mono-sm"><span class="pw" data-pw="' + esc(s.password) + '">••••••</span></td><td>★ ' + s.points + '</td><td>' + s.active7 + '/7</td><td>' + s.answered + '</td><td>' + (s.answered ? pct(s.correct, s.answered) + '%' : '–') + '</td><td>' + (s.last ? fmt(s.last) : '<span class="hint">не е влизал</span>') + '</td>' +
            '<td class="nowrap"><button class="btn btn-sm btn-ghost" data-ed="' + s.id + '" title="Редактирай">✏️</button> <button class="btn btn-sm btn-ghost" data-pwr="' + s.id + '" title="Нова парола">🔑</button> <button class="btn btn-sm btn-ghost' + (s.adapt ? ' on' : '') + '" data-adapt="' + s.id + '" title="Помощни настройки (СОП)" aria-label="Помощни настройки за ' + esc(s.name) + '">🤝</button></td></tr>';
        }).join('') + '</tbody></table></div><p class="hint">Натиснете име за отчета на ученика. Скритите ученици не се виждат в класациите. С 🤝 задавате помощни настройки за дете със СОП.</p></div>' : '');
    $('add-form').addEventListener('submit', function (e) {
      e.preventDefault(); $('add-err').textContent = '';
      var names = $('add-names').value.split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (!names.length) { $('add-err').textContent = 'Напишете поне едно име.'; return; }
      var b = this.querySelector('button[type=submit]'); b.disabled = true;
      act('add', { names: names }).then(function (j) { draw(); created(j.created); }).catch(function (x) { $('add-err').textContent = x.message; b.disabled = false; });
    });
    if (!L.length) return;
    var shown = false;
    $('show-pw').addEventListener('click', function () { shown = !shown; this.textContent = shown ? '🙈 Скрий паролите' : '👁 Покажи паролите'; el.querySelectorAll('.pw').forEach(function (p) { p.textContent = shown ? p.getAttribute('data-pw') : '••••••'; }); });
    $('print-cards').addEventListener('click', function () { printCards(L.filter(function (s) { return !s.hidden; })); });
    el.querySelectorAll('[data-rep]').forEach(function (b) { b.addEventListener('click', function () { report(+b.getAttribute('data-rep')); }); });
    el.querySelectorAll('[data-ed]').forEach(function (b) { b.addEventListener('click', function () { editStudent(+b.getAttribute('data-ed')); }); });
    el.querySelectorAll('[data-adapt]').forEach(function (b) { b.addEventListener('click', function () { adaptStudent(+b.getAttribute('data-adapt')); }); });
    el.querySelectorAll('[data-pwr]').forEach(function (b) { b.addEventListener('click', function () {
      var s = byId(+b.getAttribute('data-pwr'));
      var d = S.modal('<h3>🔑 Нова парола за ' + esc(s.name) + '?</h3><p>Старата парола спира да работи. Прогресът на детето се запазва.</p><div class="modal-actions"><button class="btn btn-ghost" data-close>Отказ</button><button class="btn" id="pw-ok">Нова парола</button></div>');
      d.querySelector('#pw-ok').addEventListener('click', function () {
        act('reset', { sid: s.id }).then(function (j) { d.close(); draw(); var dd = S.modal('<h3>Новата парола на ' + esc(s.name) + '</h3><p class="tb-bigpw"><span>' + esc(s.username) + '</span><b>' + esc(j.password) + '</b></p><div class="modal-actions"><button class="btn" data-close>Готово</button></div>'); dd.classList.add('tb-modal'); }).catch(function (x) { S.toast(esc(x.message)); });
      });
    }); });
  }
  /* помощни настройки за ученик със СОП – детето не може да ги изключи */
  function adaptStudent(id) {
    var s = byId(id), A11 = S.A11y; if (!A11) return;
    var a = s.adapt || {};
    var d = S.modal('<h3>🤝 Помощни настройки за ' + esc(s.name) + '</h3><p class="a11y-intro">За дете със СОП, дислексия, дискалкулия или трудности с вниманието. Включените настройки важат на всяко устройство, от което детето влиза, и то не може да ги изключи. Прилагат се при следващото му влизане или след до 1 час.</p>' +
      '<div class="a11y-preset"><button class="btn btn-green btn-sm" type="button" data-preset>✨ Препоръчани</button><button class="btn btn-ghost btn-sm" type="button" data-none>Без настройки</button></div>' +
      '<div class="a11y-list">' + A11.OPTS.map(function (o) {
        return '<label class="a11y-row"><span class="a11y-ico" aria-hidden="true">' + o.ico + '</span><span class="a11y-txt"><b>' + o.name + '</b><small>' + o.desc + '</small></span><input type="checkbox" class="sw" data-k="' + o.k + '"' + (a[o.k] ? ' checked' : '') + '></label>';
      }).join('') + '</div><p class="hint a11y-foot">Резултатите на детето в отчетите остават видими. „Втори опит“ брои задачата за вярна, ако детето я реши от втория път. <a href="deca-sas-sop.html" target="_blank">Повече за СОП в Сметко</a></p>' +
      '<div class="modal-actions"><button class="btn btn-ghost" data-close>Отказ</button><button class="btn" id="ad-save">Запази</button></div>');
    d.classList.add('a11y-modal');
    function boxes() { return Array.prototype.slice.call(d.querySelectorAll('input[data-k]')); }
    d.querySelector('[data-preset]').addEventListener('click', function () { boxes().forEach(function (i) { i.checked = A11.PRESET.indexOf(i.getAttribute('data-k')) >= 0; }); });
    d.querySelector('[data-none]').addEventListener('click', function () { boxes().forEach(function (i) { i.checked = false; }); });
    d.querySelector('#ad-save').addEventListener('click', function () {
      var o = {}; boxes().forEach(function (i) { if (i.checked) o[i.getAttribute('data-k')] = 1; });
      this.disabled = true;
      act('adapt', { sid: s.id, adapt: o }).then(function () { d.close(); draw(); S.toast(Object.keys(o).length ? '🤝 Настройките за ' + esc(s.name) + ' са запазени' : 'Настройките за ' + esc(s.name) + ' са изключени'); })
        .catch(function (x) { S.toast(esc(x.message)); d.querySelector('#ad-save').disabled = false; });
    });
  }
  function byId(id) { return cur.students.filter(function (s) { return s.id === id; })[0]; }
  function created(list) {
    var d = S.modal('<h3>✅ Добавени ученици: ' + list.length + '</h3><p>Ето данните за вход. Може да ги видите и по-късно в „Ученици“.</p><div class="table-wrap"><table class="compare"><thead><tr><th>Ученик</th><th>Потребител</th><th>Парола</th></tr></thead><tbody>' +
      list.map(function (x) { return '<tr><td><b>' + esc(x.name) + '</b></td><td class="mono-sm">' + esc(x.username) + '</td><td class="mono-sm">' + esc(x.password) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="modal-actions"><button class="btn btn-ghost" data-close>Затвори</button><button class="btn" id="cr-print">🖨️ Отпечатай картите</button></div>');
    d.classList.add('wide-modal');
    d.querySelector('#cr-print').addEventListener('click', function () { d.close(); printCards(list); });
  }
  function editStudent(id) {
    var s = byId(id);
    var d = S.modal('<h3>✏️ ' + esc(s.name) + '</h3><form id="ed-form" class="tb-form"><label>Име (както да се вижда в класацията)<input class="input" id="ed-name" maxlength="30" value="' + esc(s.name) + '"></label>' +
      '<label>Потребител (латиница)<input class="input" id="ed-user" maxlength="20" value="' + esc(s.username) + '" autocapitalize="none" spellcheck="false"></label><p class="step-label">Картинка</p><div class="av-pick">' +
      AV.map(function (a) { return '<label><input type="radio" name="ed-av" value="' + a + '"' + (a === s.avatar ? ' checked' : '') + '><span>' + a + '</span></label>'; }).join('') + '</div>' +
      '<label class="check"><input type="checkbox" id="ed-hid"' + (s.hidden ? ' checked' : '') + '> Скрит от класациите</label><p class="code-err" id="ed-err"></p>' +
      (s.parents ? '<p class="hint">👪 Свързан с ' + s.parents + (s.parents === 1 ? ' родителски акаунт' : ' родителски акаунта') + ' – те виждат отчета и домашните. <button class="btn btn-sm btn-ghost" type="button" id="ed-unp">Прекъсни връзката</button></p>' : '') +
      '<div class="modal-actions"><button class="btn btn-ghost btn-red-text" type="button" id="ed-del">Премахни от класа</button><button class="btn" type="submit">Запази</button></div></form>');
    d.classList.add('tb-modal');
    var unp = d.querySelector('#ed-unp'); if (unp) unp.addEventListener('click', function () { act('unlink_parents', { sid: id }).then(function () { d.close(); draw(); S.toast('Връзката с родителите е прекъсната. Сменете паролата (🔑), ако не искате да се свържат отново.'); }).catch(function (x) { S.toast(esc(x.message)); }); });
    d.querySelector('#ed-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var hid = d.querySelector('#ed-hid').checked;
      act('edit', { sid: id, name: d.querySelector('#ed-name').value.trim(), username: d.querySelector('#ed-user').value.trim().toLowerCase(), avatar: (d.querySelector('input[name=ed-av]:checked') || {}).value })
        .then(function () { return hid !== s.hidden ? act('hide', { sid: id, hidden: hid ? 1 : 0 }) : null; })
        .then(function () { d.close(); draw(); S.toast('Запазено ✓'); }).catch(function (x) { d.querySelector('#ed-err').textContent = x.message; });
    });
    d.querySelector('#ed-del').addEventListener('click', function () {
      var b = this; if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Изтриват се и резултатите му. Натиснете пак.'; return; }
      act('remove', { sid: id }).then(function () { d.close(); draw(); S.toast('Ученикът е премахнат'); }).catch(function (x) { S.toast(esc(x.message)); });
    });
  }
  function report(id) {
    var s = byId(id); if (!s || !S.Report) return;
    var d = S.modal('<div id="rep-m"></div><div class="modal-actions"><button class="btn btn-ghost" onclick="window.print()">🖨️ Печат</button></div>'); d.classList.add('wide-modal');
    S.Report.render(d.querySelector('#rep-m'), { nickname: s.name, grade: cur['class'].grade || s.grade, answered: s.answered, correct: s.correct, stars: s.stars, missions: s.missions, skills: s.skills, days: s.days });
  }
  function printCards(L) {
    if (!L.length) { S.toast('Няма ученици за печат.'); return; }
    var K = cur['class'], old = $('print-area'); if (old) old.remove();
    var area = document.createElement('div'); area.id = 'print-area';
    area.innerHTML = '<div class="kc-grid">' + L.map(function (s) {
      return '<div class="kc"><div class="kc-top"><span class="kc-logo">Сметко</span><small>' + esc(K.name) + '</small></div><div class="kc-av">' + esc(s.avatar || '🦉') + '</div><div class="kc-name">' + esc(s.name) + '</div>' +
        '<div class="kc-row"><small>Потребител</small><b>' + esc(s.username) + '</b></div><div class="kc-row"><small>Парола</small><b>' + esc(s.password) + '</b></div><div class="kc-how">smetko.com → Вход → Ученик</div><div class="kc-par">За родителя: влезте в своя профил в smetko.com → „Ученици от клас“ и въведете същите данни, за да виждате отчета и домашните.</div></div>';
    }).join('') + '</div>';
    document.body.appendChild(area); document.body.classList.add('printing-cards');
    setTimeout(function () { window.print(); setTimeout(function () { document.body.classList.remove('printing-cards'); area.remove(); }, 500); }, 100);
  }

  /* ---------- домашни ---------- */
  function homework(el) {
    var K = cur['class'], grade = K.grade || 1, total = cur.kpi.students;
    var opts = [1, 2, 3, 4].map(function (g) { return '<option value="' + g + '"' + (g === grade ? ' selected' : '') + '>' + g + '. клас</option>'; }).join('');
    el.innerHTML = '<form class="panel tool-panel" id="hw-form"><h3>📚 Задай домашна</h3><div class="tool-grid hw-grid"><label>Клас<select class="input" id="hwf-grade">' + opts + '</select></label><label>Тема<select class="input" id="hwf-topic">' + S.topicOptions(grade, true) + '</select></label>' +
      '<label>Задачи<select class="input" id="hwf-count"><option>10</option><option selected>15</option><option>20</option><option>30</option></select></label><label>Трудност<select class="input" id="hwf-level"><option value="1">1 – лесно</option><option value="2" selected>2 – средно</option><option value="3">3 – трудно</option></select></label>' +
      '<label>Срок<input class="input" type="date" id="hwf-due" min="' + ymdPlus(0) + '" max="' + ymdPlus(90) + '" value="' + ymdPlus(3) + '"></label></div>' +
      '<div class="ws-actions"><span class="hint">Учениците я виждат в „Играй“ и на началната страница.</span><button class="btn" type="submit">Задай домашна</button></div><p class="code-err" id="hwf-err" role="alert"></p></form>' +
      (cur.homework.length ? cur.homework.map(function (h) {
        var late = h.due < cur.today;
        return '<details class="hw-row panel"><summary><span class="hw-ttl"><b>' + esc(h.title) + '</b><small>' + h.grade + '. клас · ' + h.count + ' задачи · трудност ' + h.level + ' · срок ' + fmt(h.due) + (late ? ' (мина)' : '') + '</small></span><span class="hw-cnt' + (h.doneCount === total && total ? ' all' : '') + '">' + h.doneCount + ' / ' + total + ' готови</span></summary>' +
          (h.students.length ? '<div class="table-wrap"><table class="compare"><thead><tr><th>Ученик</th><th>Резултат</th><th>Опити</th><th>Кога</th></tr></thead><tbody>' + h.students.map(function (x) {
            return '<tr class="' + (x.done ? '' : 'hid') + '"><td><b>' + esc(x.name) + '</b></td><td>' + (x.done ? x.correct + ' / ' + h.count + ' <span class="hint">(' + pct(x.correct, h.count) + '%)</span>' : '<span class="hint">още не</span>') + '</td><td>' + (x.tries || '–') + '</td><td>' + (x.at ? fmt(x.at) + ' ' + x.at.slice(11, 16) + (x.late ? ' <span class="tag">след срока</span>' : '') : '–') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<p class="hint">Още няма ученици.</p>') +
          '<p class="ws-actions"><a class="btn btn-sm btn-ghost" href="game.html?grade=' + h.grade + '&mode=practice&topic=' + encodeURIComponent(h.topic) + '" target="_blank">👀 Пробвай темата</a><button class="btn btn-sm btn-ghost" data-hw-del="' + h.id + '">🗑 Изтрий</button></p></details>';
      }).join('') : '<p class="hint" style="text-align:center">Още няма зададени домашни.</p>');
    $('hwf-grade').addEventListener('change', function () { $('hwf-topic').innerHTML = S.topicOptions(+this.value, true); });
    $('hw-form').addEventListener('submit', function (e) {
      e.preventDefault(); $('hwf-err').textContent = '';
      var t = $('hwf-topic'), b = this.querySelector('button[type=submit]'); b.disabled = true;
      act('hw_create', { grade: +$('hwf-grade').value, topic: t.value, title: t.value === 'mix' ? 'Смесени задачи · ' + $('hwf-grade').value + '. клас' : t.options[t.selectedIndex].text.replace(/^\d+\.\s*/, ''), count: +$('hwf-count').value, level: +$('hwf-level').value, due: $('hwf-due').value })
        .then(function () { S.toast('✅ Домашната е зададена'); draw(); }).catch(function (x) { $('hwf-err').textContent = x.message; b.disabled = false; });
    });
    el.querySelectorAll('[data-hw-del]').forEach(function (b) { b.addEventListener('click', function () {
      if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Сигурни ли сте?'; return; }
      refreshAfter(act('hw_delete', { hw: +b.getAttribute('data-hw-del') }), 'Домашната е изтрита');
    }); });
  }

  /* ---------- теми ---------- */
  function topics(el) {
    el.innerHTML = '<div class="panel"><h3>📊 Отчет по теми</h3><p class="hint">Кои теми затрудняват класа – по задачите, решени в Сметко. „Имат нужда от помощ“ – под 60% верни при поне 5 задачи.</p><div id="tb-topics"></div></div>';
    if (S.Report) S.Report.topics($('tb-topics'), cur.topics);
  }

  /* ---------- класация ---------- */
  function rank(el) {
    var L = cur.students.filter(function (s) { return !s.hidden; }), top = L.slice(0, 3);
    if (!L.length) { el.innerHTML = '<div class="panel"><p class="lead-dark" style="text-align:center">Класацията се появява, когато учениците започнат да играят.</p></div>'; return; }
    el.innerHTML = '<div class="panel"><div class="podium">' + [1, 0, 2].map(function (i) { var r = top[i]; return r ? '<div class="pod p' + (i + 1) + '"><span class="medal">' + ['🥇', '🥈', '🥉'][i] + '</span><b>' + esc(r.name) + '</b><small>★ ' + r.points + '</small></div>' : '<div class="pod empty"></div>'; }).join('') + '</div>' +
      '<div class="table-wrap"><table class="compare board"><thead><tr><th>#</th><th>Ученик</th><th>Точки</th><th>Мисии</th><th>Звезди</th><th>Дни (7)</th></tr></thead><tbody>' +
      L.map(function (s, i) { return '<tr><td>' + (i + 1) + '</td><td><span class="tb-av">' + esc(s.avatar) + '</span><b>' + esc(s.name) + '</b></td><td>★ ' + s.points + '</td><td>' + s.missions + '</td><td>' + s.stars + '</td><td>' + s.active7 + '/7</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="ws-actions"><button class="btn btn-ghost" onclick="window.print()">🖨️ Печат</button><a class="btn btn-ghost" href="liga.html">🌍 Обща класация</a><span id="dipl-box"></span></div></div>';
    var db = $('dipl-box'), K = cur['class'];
    if (S.diplomasOpen && S.diplomasOpen()) {
      db.innerHTML = '<button class="btn btn-green" id="dipl">🎓 Грамоти за класа</button>';
      $('dipl').addEventListener('click', function () {
        S.openDiplomas({ kind: 'class', className: K.className ? K.className + ' клас' : '', school: [K.school, K.town].filter(Boolean).join(', '), sign1: K.teacherName || '',
          items: L.map(function (r, i) { var p = i + 1; return { name: r.name, place: p <= 3 && r.points > 0 ? p : 0, line: p <= 3 && r.points > 0 ? 'за ' + ['I', 'II', 'III'][p - 1] + ' място в класацията на класа по математика със Сметко – ' + r.points + ' точки и ' + r.stars + ' звезди' : 'за постоянство и успехи по математика със Сметко – ' + (r.answered || 0) + ' решени задачи и ' + r.stars + ' звезди' }; }) });
      });
    } else db.innerHTML = '<span class="hint">🎓 Грамотите се отварят в края на учебната година (от 1 юни).</span>';
  }

  /* ---------- настройки ---------- */
  function bookOptions(g, sel) {
    if (!S.Books || !g) return '<option value="">По учебната програма</option>';
    return S.Books.list(g).map(function (b) { return '<option value="' + (b.id === 'mon' ? '' : b.id) + '"' + ((b.id === 'mon' ? '' : b.id) === sel ? ' selected' : '') + '>' + esc(b.id === 'mon' ? 'По учебната програма (всички учебници)' : b.publisher + ' – ' + b.title) + '</option>'; }).join('');
  }
  function settings(el) {
    var K = cur['class'];
    el.innerHTML = '<form class="panel tool-panel tb-form" id="set-form"><h3>⚙️ Класът</h3><div class="tool-grid tb-grid">' +
      '<label>Клас (напр. 3в)<input class="input" id="s-cn" maxlength="12" value="' + esc(K.className) + '" placeholder="3в"></label>' +
      '<label>Година на обучение<select class="input" id="s-grade">' + [0, 1, 2, 3, 4].map(function (g) { return '<option value="' + g + '"' + (g === K.grade ? ' selected' : '') + '>' + (g ? g + '. клас' : '–') + '</option>'; }).join('') + '</select></label>' +
      '<label>Училище<input class="input" id="s-school" maxlength="120" value="' + esc(K.school) + '" placeholder="ОУ „Иван Вазов“"></label><label>Населено място<input class="input" id="s-town" maxlength="60" value="' + esc(K.town) + '" placeholder="Пловдив"></label>' +
      '<label>Учебник на класа<select class="input" id="s-book">' + bookOptions(K.grade, K.book) + '</select></label><label>Вашето име в общата класация<input class="input" id="s-tn" maxlength="40" value="' + esc(K.teacherName) + '" placeholder="напр. г-жа Петрова"></label></div>' +
      '<label class="check"><input type="checkbox" id="s-pub"' + (K['public'] ? ' checked' : '') + '><span>Класът участва в общата класация на училищата (учениците се виждат само с име, клас и училище и само от абонати)</span></label>' +
      '<p class="hint">Учебникът определя реда на мисиите за учениците – по една мисия за всеки урок.</p><div class="ws-actions"><span></span><button class="btn" type="submit">💾 Запази</button></div></form>' +
      '<div class="panel"><h3>💳 Абонамент</h3><p>' + (K.valid ? 'Активен до <b>' + fmt(K.expires) + '</b>' : 'Изтекъл на <b>' + fmt(K.expires) + '</b>') + ' · места за ученици: <b>' + K.seats + '</b></p><a class="btn btn-ghost" href="pricing.html">Поднови или поръчай още класове</a></div>';
    $('s-grade').addEventListener('change', function () { $('s-book').innerHTML = bookOptions(+this.value, ''); });
    $('set-form').addEventListener('submit', function (e) {
      e.preventDefault();
      saveSettings({ className: $('s-cn').value.trim(), grade: +$('s-grade').value, school: $('s-school').value.trim(), town: $('s-town').value.trim(), book: $('s-book').value, teacherName: $('s-tn').value.trim(), 'public': $('s-pub').checked ? 1 : 0 }, 'Запазено ✓');
    });
  }
  function saveSettings(patch, msg) {
    var K = cur['class'], d = { className: K.className, grade: K.grade, school: K.school, town: K.town, book: K.book, teacherName: K.teacherName, 'public': K['public'] ? 1 : 0, message: K.message };
    for (var k in patch) d[k] = patch[k];
    return refreshAfter(act('update', d).then(function (j) { list.forEach(function (x) { if (x.id === j['class'].id) x.name = j['class'].name; }); }), msg);
  }

  document.addEventListener('DOMContentLoaded', start);
})();
