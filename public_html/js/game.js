/* Сметко — игрален екран: избор, карта на мисиите, игра, резултати */
(function () {
  'use strict';
  var S = window.Smetko, E = S.MathEngine, G = S.Game, A = S.Audio;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var MODE_NAMES = { quick: 'Бързо сметни', adventure: 'Приключение', practice: 'Тренировка' };
  var SAY = {
    ok: ['Браво!', 'Супер!', 'Точно така!', 'Страхотно!', 'Отлично!', 'Уха!', 'Как умееш!', 'Вярно!'],
    combo: ['Комбо! Двойни точки!', 'Огън си! 🔥', 'Не спирай!'],
    bad: ['Нищо, следващата ще стане!', 'Почти! Виж как е:', 'Грешките ни учат!', 'Спокойно, продължаваме!'],
    think: ['Помисли спокойно…', 'Ти можеш!', 'Хм, интересна задача!']
  };
  function say(k) { var a = SAY[k]; return a[Math.floor(Math.random() * a.length)]; }

  var st = { grade: 1, mode: 'adventure', topic: 'mix' };
  var B = S.Books;
  function bookId(g) { var b = G.state.books || {}; return b[g || st.grade] || 'mon'; }
  function curBook() { return B.get(st.grade, bookId()); }
  // „.2“ = мисиите по уроци (от 10.2026); старите звезди остават в статистиката, но не се смесват с новата карта
  function advKey(g, id) { id = id || bookId(g); return String(g || st.grade) + '-' + id + '.2'; }
  function shortLabel(t) { return t.length > 34 ? t.slice(0, 32).replace(/[\s,.:–-]+$/, '') + '…' : t; }
  var play = null;          // текуща игра
  var timers = [];
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; if (play && play.interval) clearInterval(play.interval); }

  // ---------- екрани ----------
  function show(id) {
    $$('.screen').forEach(function (s) { s.classList.toggle('active', s.id === id); });
    window.scrollTo(0, 0);
  }

  // ---------- ИЗБОР ----------
  function renderToday() {
    var s = G.state, goal = s.dailyGoal, c = Math.min(s.daily.count, goal);
    $('#goal-text').textContent = 'Днешна цел: ' + c + ' от ' + goal + ' задачи';
    $('#goal-bar').style.width = (c / goal * 100) + '%';
    var streak = (s.streak.last === G.today() || isYesterday(s.streak.last)) ? s.streak.count : 0;
    $('#streak-num').textContent = streak;
    var r = G.rank();
    $('#rank-name').textContent = 'Ниво ' + r.level + ': ' + r.name;
  }
  function isYesterday(d) { if (!d) return false; var y = new Date(); y.setDate(y.getDate() - 1); return d === y.toISOString().slice(0, 10) || Math.round((new Date(G.today()) - new Date(d)) / 864e5) === 1; }

  function renderSetup() {
    $$('.grade-tab').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.g === st.grade ? 'true' : 'false'); });
    $$('.mode-btn').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === st.mode ? 'true' : 'false'); });
    var wrap = $('#topic-wrap'), chips = $('#topic-chips');
    wrap.hidden = st.mode === 'adventure';
    var topics = E.GRADES[st.grade].topics, valid = st.topic === 'mix';
    var html = '<button class="chip" data-topic="mix">🎲 Всички теми</button>';
    topics.forEach(function (t, i) { if (t.id === st.topic) valid = true; html += '<button class="chip" data-topic="' + t.id + '" title="' + t.name + '"><b>' + (i + 1) + '.</b> ' + t.short + '</button>'; });
    if (!valid) st.topic = 'mix';
    chips.innerHTML = html;
    $$('.chip', chips).forEach(function (c) {
      c.setAttribute('aria-pressed', c.dataset.topic === st.topic ? 'true' : 'false');
      c.addEventListener('click', function () { A.click(); st.topic = c.dataset.topic; renderSetup(); });
    });
    $('#start-btn').textContent = st.mode === 'adventure' ? 'Към картата →' : 'Започни!';
    var sel = $('#book-select'), books = B.list(st.grade), cur = bookId();
    sel.innerHTML = books.map(function (b) { return '<option value="' + b.id + '"' + (b.id === cur ? ' selected' : '') + '>' + (b.id === 'mon' ? 'По учебната програма (всички учебници)' : b.publisher + ' – ' + b.title) + '</option>'; }).join('');
    $('#book-wrap').hidden = st.mode !== 'adventure';
    renderToday();
  }

  // ---------- КАРТА ----------
  var MAP_W = 400, MAP_H = 1180;
  function nodePos(i, n) {
    var y = (MAP_H - 80) - i * (MAP_H - 80 - 170) / (n - 1);
    var x = 200 + 105 * Math.sin(i * 1.05 + 0.4);
    return { x: x, y: y };
  }
  function pathThrough(pts) { // Catmull-Rom → Безие
    var d = 'M' + pts[0].x + ' ' + pts[0].y;
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6, c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
    }
    return d;
  }
  function mapDecor() {
    var s = '';
    // планини горе
    s += '<path d="M-20 330 L70 150 L130 230 L210 70 L300 220 L350 150 L430 330 Z" fill="#8FB7DB"/>';
    s += '<path d="M210 70 L178 128 L198 120 L212 136 L228 120 L246 130 Z M70 150 L52 186 L66 180 L76 192 L88 182 Z M350 150 L334 182 L348 176 L358 186 L368 178 Z" fill="#fff"/>';
    s += '<path d="M-20 400 C 80 330 160 360 240 340 C 320 320 380 350 430 340 L430 420 L-20 420 Z" fill="#9BDB72"/>';
    // флаг на върха
    s += '<g transform="translate(206 60)"><rect x="0" y="0" width="4" height="46" fill="#7B4A22"/><path d="M4 2 L36 12 L4 22 Z" fill="#FF5A5F"/></g>';
    // реки
    for (var ry = 700; ry < MAP_H - 300; ry += 900) s += '<path d="M-20 ' + ry + ' C 80 ' + (ry - 20) + ' 140 ' + (ry + 60) + ' 230 ' + (ry + 40) + ' C 320 ' + (ry + 20) + ' 360 ' + (ry - 10) + ' 430 ' + ry + ' L430 ' + (ry + 30) + ' C 360 ' + (ry + 20) + ' 320 ' + (ry + 52) + ' 230 ' + (ry + 72) + ' C 140 ' + (ry + 92) + ' 80 ' + (ry + 12) + ' -20 ' + (ry + 32) + ' Z" fill="#7FD0FF" opacity=".9"/>';
    // дървета по цялата височина
    var trees = [];
    for (var ty = 430, k = 0; ty < MAP_H - 30; ty += 95, k++) trees.push([k % 2 ? 360 + (k % 3) * 8 : 34 + (k % 4) * 6, ty]);
    trees.forEach(function (t) {
      s += '<rect x="' + (t[0] - 3) + '" y="' + (t[1] + 10) + '" width="6" height="16" fill="#7B4A22"/><circle cx="' + t[0] + '" cy="' + t[1] + '" r="20" fill="#3E9A36"/><circle cx="' + (t[0] + 12) + '" cy="' + (t[1] + 6) + '" r="13" fill="#4FAE3C"/>';
    });
    // цветя
    for (var i = 0, nf = Math.round(MAP_H / 45); i < nf; i++) {
      var fx = (i * 137) % 400, fy = 430 + (i * 211) % (MAP_H - 460);
      s += '<circle cx="' + fx + '" cy="' + fy + '" r="4" fill="' + ['#FFC531', '#FF5A5F', '#fff'][i % 3] + '" opacity=".9"/>';
    }
    return s;
  }

  var CH = 16; // мисии в една част на картата
  function renderMap(chapter) {
    var book = curBook(), key = advKey(), all = book.missions, N = all.length, stars = G.stars(key);
    var gcur = 0; for (var q = 0; q < N; q++) { if (G.isUnlocked(key, q)) gcur = q; }
    var nch = Math.ceil(N / CH);
    if (chapter === undefined || chapter === null) chapter = Math.floor(gcur / CH);
    chapter = Math.max(0, Math.min(nch - 1, chapter)); st.chapter = chapter;
    var off = chapter * CH, levels = all.slice(off, off + CH), n = levels.length;
    MAP_H = Math.max(1180, 250 + n * 82);
    $('#map').style.aspectRatio = MAP_W + ' / ' + MAP_H;
    var pts = levels.map(function (_, i) { return nodePos(i, n); });
    var d = pathThrough(pts);
    var svg = '<svg viewBox="0 0 ' + MAP_W + ' ' + MAP_H + '" preserveAspectRatio="none" aria-hidden="true">' + mapDecor() +
      '<path d="' + d + '" stroke="#D9B77A" stroke-width="34" fill="none" stroke-linecap="round"/>' +
      '<path d="' + d + '" stroke="#F6DFAE" stroke-width="24" fill="none" stroke-linecap="round"/>' +
      '<path d="' + d + '" stroke="#fff" stroke-width="4" stroke-dasharray="2 14" fill="none" stroke-linecap="round" opacity=".9"/></svg>';
    var current = Math.max(0, Math.min(n - 1, gcur - off));
    var html = svg, total = 0;
    for (var t = 0; t < N; t++) total += stars[t] || 0;
    levels.forEach(function (lv, li) {
      var i = off + li, p = pts[li], s = stars[i] || 0;
      var unlocked = G.isUnlocked(key, i);
      var paid = S.config.paywall && !S.hasAccess() && i >= S.config.freeAdventureLevels;
      var cls = 'map-node ' + (p.x > 200 ? 'left-label' : 'right-label');
      if (!unlocked || paid) cls += ' locked'; else if (s > 0) cls += ' done';
      if (i === gcur && !paid) cls += ' current';
      var starStr = s ? '<span class="n-stars">' + '★★★'.slice(0, s) + '<span style="opacity:.35">' + '★★★'.slice(0, 3 - s) + '</span></span>' : '';
      html += '<button class="' + cls + '" data-i="' + i + '" style="left:' + (p.x / MAP_W * 100) + '%;top:' + (p.y / MAP_H * 100) + '%;" aria-label="Мисия ' + (i + 1) + ': ' + lv[0] + (unlocked ? '' : ' (заключена)') + '" title="' + lv[0] + '">' +
        ((!unlocked || paid) ? '<span class="lock">🔒</span>' : (i + 1)) + starStr + '<span class="n-label">' + shortLabel(lv[0]) + '</span></button>';
    });
    var cp = pts[current];
    if (gcur >= off && gcur < off + n) html += '<div class="map-owl" data-owl="hello" style="left:' + (cp.x / MAP_W * 100 + 9) + '%;top:' + (cp.y / MAP_H * 100 - 2) + '%"></div>';
    var map = $('#map');
    map.innerHTML = html;
    S.renderOwls(map);
    $('#map-title').textContent = E.GRADES[st.grade].name + ' · ' + (book.id === 'mon' ? 'по програмата' : book.publisher);
    $('#map-stars').textContent = '★ ' + total + ' / ' + (N * 3);
    var chBox = $('#map-chapters');
    if (!chBox) { chBox = document.createElement('div'); chBox.id = 'map-chapters'; chBox.className = 'map-chapters'; map.parentNode.insertBefore(chBox, map); }
    var chHtml = '';
    for (var c = 0; c < nch; c++) {
      var cs = 0, cdone = 0, from = c * CH, to = Math.min(N, from + CH);
      for (var k = from; k < to; k++) { cs += stars[k] || 0; if (stars[k]) cdone++; }
      var locked = !G.isUnlocked(key, from);
      chHtml += '<button class="ch' + (c === chapter ? ' on' : '') + (cdone === to - from ? ' full' : '') + (locked ? ' lk' : '') + '" data-ch="' + c + '" aria-pressed="' + (c === chapter) + '" title="Уроци ' + (from + 1) + '–' + to + '">' +
        '<b>' + (locked ? '🔒' : c + 1) + '</b><small>' + (from + 1) + '–' + to + '</small>' + (cs ? '<i>★' + cs + '</i>' : '') + '</button>';
    }
    chBox.innerHTML = '<span class="ch-l">Части:</span>' + chHtml;
    $$('[data-ch]', chBox).forEach(function (b) { b.addEventListener('click', function () { A.click(); renderMap(+b.dataset.ch); window.scrollTo({ top: Math.max(0, chBox.getBoundingClientRect().top + window.scrollY - 90), behavior: 'smooth' }); }); });
    var onb = $('.ch.on', chBox); if (onb && onb.scrollIntoView) try { chBox.scrollLeft = onb.offsetLeft - chBox.clientWidth / 2 + onb.clientWidth / 2; } catch (e) {}
    $$('.map-node', map).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.dataset.i;
        if (S.config.paywall && !S.hasAccess() && i >= S.config.freeAdventureLevels) { S.accessModal(); return; }
        if (!G.isUnlocked(key, i)) { A.wrong(); S.toast('🔒 Първо мини мисия ' + i + '!'); return; }
        A.click(); startAdventure(i);
      });
    });
    show('screen-map');
    // скролни до текущата мисия
    later(function () {
      var cur = $('.map-node.current', map) || $('.map-node', map);
      if (cur) { var r = cur.getBoundingClientRect(); window.scrollTo({ top: window.scrollY + r.top - innerHeight / 2, behavior: 'smooth' }); }
    }, 80);
  }

  // ---------- ИГРА ----------
  function missionLocked(i) { return S.config.paywall && !S.hasAccess() && i >= S.config.freeAdventureLevels; }
  function startAdventure(i) {
    var book = curBook(), m = book.missions[i];
    if (!m) { renderMap(); return; }
    if (missionLocked(i)) { renderMap(); S.accessModal(); return; } // платените мисии – само с код/абонамент
    if (!G.isUnlocked(advKey(), i)) { renderMap(); S.toast('🔒 Първо мини мисия ' + i + '!'); return; }
    startPlay({ mode: 'adventure', book: book, mission: m, topic: 'book', level: m[2], missionIdx: i, title: m[0] });
  }

  function startPlay(opts) {
    clearTimers();
    opts = opts || {};
    var mode = opts.mode || st.mode;
    play = {
      mode: mode, grade: st.grade, topic: opts.topic || st.topic || 'mix', level: opts.level || 1,
      missionIdx: opts.missionIdx, title: opts.title, book: opts.book, mission: opts.mission, key: advKey(), total: mode === 'adventure' ? S.config.questionsPerMission : 0,
      idx: 0, correct: 0, wrong: 0, streak: 0, wrongStreak: 0, input: '', busy: false, waitNext: false,
      timeLeft: S.config.quickSeconds, task: null, lastQ: ''
    };
    G.startSession(mode, st.grade, play.topic);
    $('#play-mode').textContent = MODE_NAMES[mode] + (play.title ? ': ' + play.title : '');
    var pr = $('#progress'); pr.classList.toggle('timer', mode === 'quick'); pr.classList.remove('low');
    $('#timer-num').hidden = mode !== 'quick';
    $('#end-btn').hidden = mode !== 'practice';
    $('#progress').hidden = mode === 'practice';
    $('#level-pill').hidden = mode === 'adventure';
    $('#pts').textContent = '★ 0';
    setCombo(0);
    S.setOwl($('#play-owl'), 'hello');
    bubble(mode === 'quick' ? '60 секунди! Готов ли си? 🚀' : mode === 'adventure' ? 'Мисия ' + (play.missionIdx + 1) + ': ' + play.title + '!' : 'Спокойно, без бързане. Ти можеш!');
    show('screen-play');
    updateProgress();
    if (mode === 'quick') {
      $('#timer-num').textContent = play.timeLeft;
      play.interval = setInterval(tickTimer, 1000);
    }
    nextQuestion();
  }

  function tickTimer() {
    if (!play) return;
    play.timeLeft -= 1;
    $('#timer-num').textContent = Math.max(0, play.timeLeft);
    updateProgress();
    if (play.timeLeft <= 5 && play.timeLeft > 0) { A.tick(); $('#progress').classList.add('low'); }
    if (play.timeLeft <= 0) { clearInterval(play.interval); finish(); }
  }

  function updateProgress() {
    var w = 0;
    if (play.mode === 'quick') w = play.timeLeft / S.config.quickSeconds * 100;
    else if (play.mode === 'adventure') w = play.idx / play.total * 100;
    $('#progress i').style.width = Math.max(0, w) + '%';
    $('#level-pill').textContent = 'Ниво ' + play.level;
  }

  function nextQuestion() {
    if (!play) return;
    var t, tries = 0;
    do { t = st.skill ? E.generateSkill(play.grade, st.skill, play.level) : (play.mission && play.mission[1]) ? E.generateFrom(play.grade, play.mission[1], play.level) : E.generate(play.grade, play.topic, play.level); tries++; } while (t.q === play.lastQ && tries < 6);
    play.task = t; S._task = t; play.lastQ = t.q; play.input = ''; play.busy = false; play.waitNext = false; play.qStart = Date.now();
    var qc = $('#qcard'); qc.classList.remove('ok', 'bad');
    var html = '';
    if (t.dots) html += dotsHTML(t.dots);
    if (t.figure) html += t.figure;
    var plainLen = t.q.replace(/<[^>]+>/g, '').length;
    var cls = t.word ? ' long' : (plainLen > 26 ? ' mid' : '');
    html += '<div class="q-text' + cls + '">' + t.q.replace('{?}', '<span class="slot empty" id="slot"></span>') + '</div>';
    html += '<div class="explain" id="explain" aria-live="polite"></div>';
    $('#qbody').innerHTML = html;
    $('#keypad').hidden = t.kind !== 'number';
    renderChoices(t);
    $('#next-row').hidden = true;
    if (play.mode === 'practice' && Math.random() < .15 && play.idx > 0) bubble(say('think'));
  }

  // бутони за избор: символи (<, =, >) или варианти (текст/картинки)
  function renderChoices(t) {
    var box = $('#choices');
    if (t.kind !== 'choice') { box.hidden = true; box.innerHTML = ''; return; }
    var symbols = typeof t.choices[0] === 'string';
    box.className = 'choices' + (symbols ? '' : ' opts') + (t.optFigs ? ' figs' : '') + (t.romanOpts ? ' rom' : '');
    box.style.setProperty('--n', t.choices.length);
    box.innerHTML = t.choices.map(function (c, i) {
      var v = symbols ? c : c.v, html = symbols ? c : c.html;
      var label = symbols ? ({ '<': 'по-малко', '=': 'равно', '>': 'по-голямо' }[c]) : (t.optFigs ? v : '');
      return '<button class="key opt" data-k="' + v + '" data-i="' + (i + 1) + '"' + (label ? ' aria-label="' + label + '"' : '') + '>' +
        (!symbols ? '<span class="opt-n">' + (i + 1) + '</span>' : '') + html + '</button>';
    }).join('');
    box.hidden = false;
    $$('.key', box).forEach(function (k) { k.addEventListener('click', function () { A.unlock(); press(k.getAttribute('data-k')); }); });
  }

  function dotsHTML(d) {
    var a = '', b = '', i;
    if (d.op === '+') {
      for (i = 0; i < d.a; i++) a += '<i></i>';
      for (i = 0; i < d.b; i++) b += '<i></i>';
      return '<div class="dots" aria-hidden="true"><span class="grp">' + a + '</span><span class="op">+</span><span class="grp b">' + b + '</span></div>';
    }
    if (d.op === 'count') { for (i = 0; i < d.a; i++) a += '<i></i>'; return '<div class="dots big" aria-hidden="true"><span class="grp">' + a + '</span></div>'; }
    for (i = 0; i < d.a; i++) a += '<i' + (i >= d.a - d.b ? ' class="x"' : '') + '></i>';
    return '<div class="dots" aria-hidden="true"><span class="grp">' + a + '</span></div>';
  }

  function renderInput() {
    var slot = $('#slot'); if (!slot) return;
    slot.textContent = play.input ? E.fmt(+play.input) : '';
    slot.classList.toggle('empty', !play.input);
  }

  function press(k) {
    if (!play || play.busy) { if (play && play.waitNext && (k === 'ok')) goNext(); return; }
    if (play.task.kind === 'choice') {
      var t = play.task, vals = t.choices.map(function (c) { return typeof c === 'string' ? c : c.v; });
      if (typeof t.choices[0] !== 'string' && /^\d$/.test(k)) k = vals[+k - 1];
      if (vals.indexOf(k) < 0) return;
      play.input = k;
      var s = $('#slot'); if (s) { s.textContent = k; s.classList.remove('empty'); }
      $$('#choices .key').forEach(function (b) { b.classList.toggle('picked', b.getAttribute('data-k') === k); });
      submit(); return;
    }
    if (k === 'del') { play.input = play.input.slice(0, -1); A.key(); }
    else if (k === 'ok') { submit(); return; }
    else if (/^\d$/.test(k)) { if (play.input.length >= 6) return; if (play.input === '0') play.input = ''; play.input += k; A.key(); }
    renderInput();
  }

  function submit() {
    var t = play.task;
    if (play.input === '') { var s = $('#slot'); if (s) { s.classList.remove('owl-jump'); void s.offsetWidth; s.classList.add('owl-jump'); } return; }
    play.busy = true;
    var ok = E.check(t, play.input), ms = Date.now() - play.qStart;
    var res = G.answer({ correct: ok, topic: t.topic, table: t.table, mode: play.mode, grade: play.grade, ms: ms });
    var qc = $('#qcard'), ex = $('#explain');
    if (t.kind === 'choice') $$('#choices .key').forEach(function (b) { var v = b.getAttribute('data-k'); if (v === String(t.answer)) b.classList.add('right'); else if (v === play.input) b.classList.add('wrong'); });
    if (ok) {
      play.correct++; play.streak++; play.wrongStreak = 0;
      qc.classList.add('ok');
      if (res.mult > 1 && (play.streak === 5 || play.streak === 10)) { A.combo(); bubble(say('combo')); } else { A.correct(); bubble(say('ok')); }
      S.setOwl($('#play-owl'), play.streak >= 5 ? 'cheer' : 'happy');
      var fp = document.createElement('div'); fp.className = 'float-pts'; fp.textContent = '+' + res.gained; qc.appendChild(fp);
      setCombo(res.combo, res.mult);
      adapt(true);
      later(goNext, play.mode === 'quick' ? 380 : 650);
    } else {
      play.wrong++; play.streak = 0; play.wrongStreak++;
      qc.classList.add('bad'); A.wrong();
      S.setOwl($('#play-owl'), 'encourage');
      bubble(say('bad'));
      ex.textContent = 'Вярно е: ' + t.full;
      setCombo(0);
      adapt(false);
      if (play.mode === 'practice') { play.waitNext = true; $('#next-row').hidden = false; $('#next-btn').focus({ preventScroll: true }); }
      else later(goNext, play.mode === 'quick' ? 1300 : 1700);
    }
    $('#pts').textContent = '★ ' + (G.session ? G.session.points : 0);
    S.updateChip();
    res.newBadges.forEach(function (b, i) { later(function () { A.badge(); S.toast('<span style="font-size:1.6rem">' + b.icon + '</span> Нова значка: <b>' + b.name + '</b>', 3000); }, 300 + i * 900); });
    if (res.rankUp) later(function () { A.levelUp(); S.toast('🎉 Ново ниво: <b>' + res.rankUp.name + '</b>!', 3000); S.confetti(80); }, 200);
  }

  function adapt(ok) { // адаптивна трудност в „Бързо сметни“ и „Тренировка“
    if (play.mode === 'adventure') return;
    if (ok && play.streak > 0 && play.streak % 4 === 0 && play.level < 3) { play.level++; updateProgress(); }
    if (!ok && play.wrongStreak >= 2 && play.level > 1) { play.level--; play.wrongStreak = 0; updateProgress(); }
  }

  function goNext() {
    if (!play) return;
    play.idx++;
    updateProgress();
    if (play.mode === 'adventure' && play.idx >= play.total) { finish(); return; }
    if (play.mode === 'quick' && play.timeLeft <= 0) return;
    if (play.mode === 'practice' && practiceLimitReached()) { finish(); S.accessModal(); return; }
    if (play.idx % 3 === 0) S.setOwl($('#play-owl'), 'idle');
    nextQuestion();
  }

  // Безплатен план (когато paywall е включен): до freePracticePerDay задачи на ден в Тренировка
  function practiceLimitReached() {
    if (!S.config.paywall || S.hasAccess()) return false;
    var s = G.state, t = G.today();
    if (!s.practiceDay || s.practiceDay.date !== t) s.practiceDay = { date: t, n: 0 };
    s.practiceDay.n += 1; G.save();
    return s.practiceDay.n > S.config.freePracticePerDay;
  }

  function setCombo(c, mult) {
    var el = $('#combo');
    if (c >= 5) { el.textContent = '🔥 ' + c + ' поред ×' + (mult || (c >= 10 ? 3 : 2)); el.classList.add('show'); }
    else el.classList.remove('show');
  }
  function bubble(t) { $('#bubble').textContent = t; }

  // ---------- РЕЗУЛТАТИ ----------
  function finish() {
    if (!play) return;
    clearTimers();
    var p = play; play = null;
    var s = G.endSession() || { correct: p.correct, wrong: p.wrong, points: 0, newBadges: [] };
    if (S.Access) setTimeout(function () { S.Access.sync(); }, 300);
    var answered = p.correct + p.wrong, acc = answered ? Math.round(p.correct / answered * 100) : 0;
    var html = '', owlPose = 'happy', extraBadges = [], stars = 0, celebrate = false;

    if (p.mode === 'adventure') {
      stars = p.correct >= p.total ? 3 : p.correct >= p.total - 1 ? 2 : p.correct >= Math.ceil(p.total * 0.625) ? 1 : 0;
      if (stars > 0) {
        G.addBonus(stars * 20);
        extraBadges = G.setStars(p.key, p.missionIdx, stars, p.book.missions.length);
      }
      owlPose = stars >= 2 ? 'cheer' : stars === 1 ? 'happy' : 'encourage';
      celebrate = stars >= 2;
      html += '<div class="big-stars">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= stars ? '' : 'off') + '">⭐</span>'; }).join('') + '</div>';
      html += '<h2>' + (stars === 3 ? 'Перфектно!' : stars === 2 ? 'Много добре!' : stars === 1 ? 'Мисията е изпълнена!' : 'Още малко!') + '</h2>';
      html += '<p class="sub">' + (stars ? 'Мисия ' + (p.missionIdx + 1) + ' „' + p.title + '“' + (stars < 3 ? ' — опитай пак за 3 звезди!' : '') : 'Нужни са ' + Math.ceil(p.total * 0.625) + ' верни от ' + p.total + ', за да продължиш. Опитай пак!') + '</p>';
      html += stats(p.correct + '/' + p.total, 'верни', acc + '%', 'точност', '★ ' + (s.points + stars * 20), 'точки');
      if (stars) html += '<p class="lock-note">Включени ' + (stars * 20) + ' бонус точки за звездите</p>';
    } else if (p.mode === 'quick') {
      owlPose = p.correct >= 10 ? 'cheer' : 'happy';
      celebrate = s.isRecord && p.correct > 0;
      html += '<h2>' + (p.correct >= 20 ? 'Светкавица! ⚡' : p.correct >= 10 ? 'Браво!' : 'Добро начало!') + '</h2>';
      if (s.isRecord && p.correct > 0) html += '<div class="record">🏆 Нов рекорд!</div>';
      html += '<p class="sub">' + E.GRADES[p.grade].name + ' · ' + E.topicName(p.grade, p.topic) + (s.prevBest && !s.isRecord ? ' · Рекорд: ' + s.prevBest : '') + '</p>';
      html += stats(p.correct, 'верни за 60 сек.', acc + '%', 'точност', '★ ' + s.points, 'точки');
    } else {
      owlPose = 'happy';
      html += '<h2>Добра тренировка!</h2><p class="sub">' + E.GRADES[p.grade].name + ' · ' + E.topicName(p.grade, p.topic) + '</p>';
      html += stats(p.correct, 'верни', acc + '%', 'точност', '★ ' + s.points, 'точки');
    }

    var badges = (s.newBadges || []).concat(extraBadges);
    if (badges.length) {
      html += '<div class="new-badges">' + badges.map(function (b, i) {
        return '<div class="new-badge" style="animation-delay:' + (0.3 + i * 0.2) + 's"><span class="b-ico">' + b.icon + '</span><div><b>Нова значка: ' + b.name + '</b><small>' + b.desc + '</small></div></div>';
      }).join('') + '</div>';
    }

    html += '<div class="result-actions">';
    if (p.mode === 'adventure') {
      var nextIdx = p.missionIdx + 1, hasNext = nextIdx < p.book.missions.length;
      if (stars > 0 && hasNext && missionLocked(nextIdx)) html += '<button class="btn btn-green btn-lg" data-act="next">🔒 Следваща мисия</button><p class="lock-note" style="width:100%">Безплатни са първите ' + S.config.freeAdventureLevels + ' мисии. Следващите се отключват с код от учителя или с абонамент.</p>';
      else if (stars > 0 && hasNext) html += '<button class="btn btn-green btn-lg" data-act="next">Следваща мисия →</button>';
      html += '<button class="btn ' + (stars > 0 ? 'btn-white' : 'btn-lg') + '" data-act="retry">Опитай пак</button>';
      html += '<button class="btn btn-ghost" data-act="map">Към картата</button>';
      if (stars > 0 && !hasNext) html += '<p class="lock-note" style="width:100%">🏔️ Стигна върха на ' + E.GRADES[p.grade].name + '! Опитай следващия клас.</p>';
    } else {
      html += '<button class="btn btn-lg" data-act="retry">' + (p.mode === 'quick' ? 'Пак! ⚡' : 'Още тренировка') + '</button>';
      html += '<button class="btn btn-ghost" data-act="setup">Друга игра</button>';
    }
    html += '</div>';

    $('#result').innerHTML = '<div class="owl" data-owl="' + owlPose + '"></div>' + html;
    S.renderOwls($('#result'));
    show('screen-result');
    S.updateChip();
    if (celebrate || badges.length) { A.win(); S.confetti(); } else if (stars || p.mode !== 'adventure') A.levelUp();

    $$('[data-act]', $('#result')).forEach(function (b) {
      b.addEventListener('click', function () {
        A.click();
        var a = b.dataset.act;
        if (a === 'next') startAdventure(p.missionIdx + 1);
        else if (a === 'retry') { if (p.mode === 'adventure') startAdventure(p.missionIdx); else startPlay({ mode: p.mode, topic: p.topic }); }
        else if (a === 'map') renderMap();
        else { renderSetup(); show('screen-setup'); }
      });
    });
    setURL();
  }
  function stats(a, al, b, bl, c, cl) {
    return '<div class="result-stats"><div><b>' + a + '</b><span>' + al + '</span></div><div><b>' + b + '</b><span>' + bl + '</span></div><div><b>' + c + '</b><span>' + cl + '</span></div></div>';
  }

  function exitPlay() {
    if (!play) return;
    if (play.mode === 'practice') { finish(); return; }
    var wasQuick = play.mode === 'quick';
    if (wasQuick && play.interval) clearInterval(play.interval);
    var d = S.modal('<div data-owl="think"></div><h3>Да спрем ли играта?</h3><p>Ако излезеш сега, ' + (wasQuick ? 'резултатът няма да се запише като рекорд.' : 'мисията няма да е завършена.') + '</p>' +
      '<div class="modal-actions"><button class="btn btn-green" data-close data-resume>Продължи</button><button class="btn btn-ghost" data-quit>Изход</button></div>',
      { onClose: function () { if (play && wasQuick && !play.quit) play.interval = setInterval(tickTimer, 1000); } });
    d.querySelector('[data-quit]').addEventListener('click', function () {
      if (play) play.quit = true;
      var m = play.mode; clearTimers(); G.endSession(); play = null; d.close();
      if (m === 'adventure') renderMap(); else { renderSetup(); show('screen-setup'); }
    });
  }

  function setURL() {
    try { history.replaceState(null, '', 'game.html?grade=' + st.grade + '&mode=' + st.mode + (st.mode !== 'adventure' && st.topic !== 'mix' ? '&topic=' + st.topic : '')); } catch (e) {}
  }

  // ---------- събития ----------
  function bind() {
    $$('.grade-tab').forEach(function (b) { b.addEventListener('click', function () { A.click(); st.grade = +b.dataset.g; renderSetup(); }); });
    $$('.mode-btn').forEach(function (b) { b.addEventListener('click', function () { A.click(); st.mode = b.dataset.mode; renderSetup(); }); });
    $('#book-select').addEventListener('change', function (e) { var s2 = G.state; s2.books = s2.books || {}; s2.books[st.grade] = e.target.value; G.save(); A.click(); });
    $('#start-btn').addEventListener('click', function () {
      A.unlock(); A.click(); setURL();
      if (st.mode === 'adventure') renderMap(); else startPlay();
    });
    $('#map-back').addEventListener('click', function () { A.click(); renderSetup(); show('screen-setup'); });
    $('#exit-btn').addEventListener('click', exitPlay);
    $('#end-btn').addEventListener('click', function () { if (play) finish(); });
    $('#next-btn').addEventListener('click', function () { goNext(); });
    $$('#keypad .key').forEach(function (k) {
      k.addEventListener('click', function () { A.unlock(); press(k.dataset.k); });
    });
    document.addEventListener('keydown', function (e) {
      if (!play || document.querySelector('dialog[open]')) return;
      var k = e.key, map = { Enter: 'ok', Backspace: 'del', Delete: 'del', ',': '<', '.': '>', '<': '<', '>': '>', '=': '=' };
      var v = /^\d$/.test(k) ? k : map[k];
      if (!v) return;
      if (play.task && play.task.kind === 'number' && ['<', '>', '='].indexOf(v) >= 0) return;
      if (play.task && play.task.kind === 'choice' && typeof play.task.choices[0] === 'string' && /^\d$/.test(v)) return;
      e.preventDefault();
      if (play.waitNext && v === 'ok') { goNext(); return; }
      press(v);
      var btn = document.querySelector('#keypad:not([hidden]) .key[data-k="' + v + '"]');
      if (btn) { btn.classList.add('pressed'); setTimeout(function () { btn.classList.remove('pressed'); }, 110); }
    });
    var snd = $('#sound-btn');
    function sndUI() { var on = G.state.settings.sound !== false; snd.textContent = on ? '🔊' : '🔇'; snd.setAttribute('aria-label', on ? 'Изключи звука' : 'Включи звука'); }
    snd.addEventListener('click', function () { G.setSound(G.state.settings.sound === false); sndUI(); A.unlock(); A.click(); });
    sndUI();
  }

  function init() {
    var q = new URLSearchParams(location.search);
    var g = +q.get('grade'), m = q.get('mode'), t = q.get('topic');
    st.grade = (g >= 1 && g <= 4) ? g : (G.state.lastGrade || 1);
    st.mode = MODE_NAMES[m] ? m : 'adventure';
    st.topic = t || 'mix';
    st.skill = q.get('skill') || null;
    var qb = q.get('book'); if (qb && st.grade) { G.state.books = G.state.books || {}; G.state.books[st.grade] = qb; G.save(); }
    bind();
    renderSetup();
    if (g && m === 'adventure') renderMap();
    else if (g && MODE_NAMES[m] && q.get('start') !== '0') startPlay();
    else show('screen-setup');
  }
  document.addEventListener('DOMContentLoaded', init);
})();
