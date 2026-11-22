/* Сметко — инструменти за учители: линк за домашна и работни листове */
(function () {
  'use strict';
  var S = window.Smetko, E = S.MathEngine, B = S.Books;
  function $(id) { return document.getElementById(id); }
  // уменията по геометрия – за отделен лист „Геометрия“ във всеки клас
  var GEO_SKILLS = ['shapes', 'lines', 'countShapes', 'ruler', 'polySides', 'segSum', 'cm20', 'perim2',
    'triSides', 'triAngles', 'angles', 'degrees', 'rectProps', 'sideFromPerim', 'area', 'areaUnits',
    'sideFromArea', 'compArea', 'perimArea2', 'circle', 'circleParts', 'solidsName', 'solidsCount', 'wordArea'];
  function geoSkills(g) {
    var out = [];
    (E.GRADES[g].topics || []).forEach(function (t) {
      t.skills.forEach(function (k) { if (GEO_SKILLS.indexOf(k[0]) >= 0 && out.indexOf(k[0]) < 0) out.push(k[0]); });
    });
    return out;
  }
  function topicOptions(g, withMix) {
    if (!E) return '';
    var h = withMix ? '<option value="mix">Всички теми (смесено)</option>' : '';
    E.GRADES[g].topics.forEach(function (t, i) { h += '<option value="' + t.id + '">' + (i + 1) + '. ' + t.name + '</option>'; });
    if (geoSkills(g).length >= 3) h += '<option value="geo">Геометрия (всичко от класа)</option>';
    return h;
  }
  function base() { return /^https?:$/.test(location.protocol) ? location.origin : 'https://smetko.com'; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t2 = a[i]; a[i] = a[j]; a[j] = t2; } return a; }
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
  /* ---------- работни листове, контролни с два варианта и пробно НВО ---------- */
  function initWorksheet() {
    var g = $('ws-grade'), t = $('ws-topic'), lv = $('ws-level'), cnt = $('ws-count'), ans = $('ws-answers'), kind = $('ws-kind');
    var AZ = function (i) { return String.fromCharCode(1072 + i); };

    function fillTopics() { t.innerHTML = topicOptions(+g.value, true); render(); }
    var P = new URLSearchParams(location.search); // ?grade=2&topic=g2t4&kind=nvo – от страниците по теми
    if (/^[1-4]$/.test(P.get('grade') || '')) {
      g.value = P.get('grade'); t.innerHTML = topicOptions(+g.value, true);
      if (t.querySelector('option[value="' + (P.get('topic') || '').replace(/[^a-z0-9]/g, '') + '"]')) t.value = P.get('topic');
    }
    if (kind && /^(sheet|test|nvo)$/.test(P.get('kind') || '')) kind.value = P.get('kind');

    function mode() { return kind ? kind.value : 'sheet'; }

    // четири готови отговора за задача с число
    function toMC(k) {
      var a = +k.answer, set = {}, opts = [a];
      set[a] = 1;
      var cand = [a + 1, a - 1, a + 10, a - 10, a + 2, a * 2, Math.round(a / 2), a + 100];
      for (var i = 0; i < cand.length && opts.length < 4; i++) {
        var c = cand[i];
        if (c >= 0 && Number.isInteger(c) && !set[c]) { set[c] = 1; opts.push(c); }
      }
      while (opts.length < 4) { var x = a + 3 + Math.floor(Math.random() * 20); if (!set[x]) { set[x] = 1; opts.push(x); } }
      for (var j = opts.length - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)), tmp = opts[j]; opts[j] = opts[r]; opts[r] = tmp; }
      return { q: k.q, kind: 'choice', figure: k.figure, plan: k.plan, answer: AZ(opts.indexOf(a)),
        choices: opts.map(function (o, i) { return AZ(i) + ') ' + (E.fmt ? E.fmt(o) : o); }),
        full: String(k.full || k.q) };
    }

    // задачи за един лист; при НВО – по чертежа на изпита
    function pick(gr, seen, plan) {
      var out = [], guard = 0;
      if (mode() === 'nvo') {
        E.NVO4.plan.forEach(function (pos) {
          var k = null, gd = 0;
          while (!k && gd++ < 70) {
            var c = E.generateSkill(4, pos.s[Math.floor(Math.random() * pos.s.length)], pos.n > 16 ? 3 : 2);
            if (!c || c.dots || seen[c.q]) continue;
            if (c.kind === 'choice' && c.choices && typeof c.choices[0] === 'object' && !c.choices[0].html) continue;
            if (pos.free && c.kind !== 'number') continue;
            k = c;
          }
          if (!k) return;
          seen[k.q] = 1; k.plan = pos;
          out.push(pos.free ? k : (k.kind === 'number' ? toMC(k) : k));
        });
        return out;
      }
      var n = +cnt.value;
      // При контролно вторият вариант повтаря същите умения с други числа – вариантите са равностойни.
      if (plan && plan.length) {
        plan.forEach(function (sk) {
          var x = null, gd = 0;
          while (!x && gd++ < 60) {
            var c = E.generateSkill(gr, sk, +lv.value);
            if (!c || c.kind !== 'number' || c.figure || c.dots || seen[c.q]) { c = null; continue; }
            x = c;
          }
          if (x) { seen[x.q] = 1; out.push(x); }
        });
        return out;
      }
      // при „Геометрия“ чертежите и задачите с избор са самата цел, затова не се изхвърлят
      if (t.value === 'geo') {
        var gs = geoSkills(gr), order = [];
        while (order.length < n) order = order.concat(shuffle(gs));   // всяко умение се изчерпва, преди да се повтори
        for (var gi = 0; gi < order.length && out.length < n; gi++) {
          var gq = null, gg = 0;
          while (!gq && gg++ < 25) {
            var cand = E.generateSkill(gr, order[gi], +lv.value);
            if (cand && !cand.dots && !seen[cand.q]) gq = cand;
          }
          if (gq) { seen[gq.q] = 1; out.push(gq); }
        }
        // в по-малките класове геометричните умения са малко – допускаме повторение, за да е пълен листът
        for (var gj = 0; out.length < n && gj < n * 4; gj++) {
          var extra = E.generateSkill(gr, order[gj % order.length], +lv.value);
          if (extra && !extra.dots) out.push(extra);
        }
        return out;
      }
      while (out.length < n && guard++ < n * 60) {
        var x2 = E.generate(gr, t.value, +lv.value);
        if (x2.kind !== 'number' || x2.figure || x2.dots || seen[x2.q]) continue;
        seen[x2.q] = 1; out.push(x2);
      }
      out.sort(function (a, b) { return (a.word ? 1 : 0) - (b.word ? 1 : 0); });
      return out;
    }

    function sheetHead(title, label) {
      return '<div class="ws-head"><div class="ws-brand">Сметко <small>smetko.com</small></div>' +
        '<div class="ws-title"><b>' + esc(label) + '</b><span>' + esc(title) + '</span></div>' +
        '<div class="ws-fields"><span>Име: ______________________</span><span>Клас: ______</span><span>Дата: ____________</span></div></div>';
    }

    /* Готовите отговори се номерират с а) б) в) г) – както в изпитните материали. */
    function lettered(k) {
      if (k.kind !== 'choice' || !k.choices) return k;
      if (typeof k.choices[0] === 'string' && /^[а-г]\)/.test(k.choices[0])) return k;
      var vals = k.choices.map(function (c) { return typeof c === 'object' ? c : { v: c, html: String(c) }; });
      var idx = -1;
      vals.forEach(function (c, i) { if (String(c.v) === String(k.answer)) idx = i; });
      var out = {};
      for (var p in k) out[p] = k[p];
      out.answer = idx >= 0 ? AZ(idx) : k.answer;
      out.choices = vals.map(function (c, i) { return AZ(i) + ') ' + (c.html || c.v); });
      return out;
    }

    function tasksHTML(tasks, nvo) {
      return '<ol class="ws-list' + (nvo ? ' ws-nvo' : '') + '">' + tasks.map(function (k) {
        k = lettered(k);
        var q = String(k.q).replace('{?}', k.kind === 'choice' ? '<span class="ws-box"></span>' : '<span class="ws-blank"></span>');
        var opts = k.kind === 'choice' && k.choices
          ? '<span class="ws-opts">' + k.choices.map(function (c) { return '<span>' + (typeof c === 'object' ? (c.html || c.v) : c) + '</span>'; }).join('') + '</span>' : '';
        var tag = nvo && k.plan ? '<span class="ws-tag">' + esc(k.plan.area) + '</span>' : '';
        return '<li class="' + (k.word || k.figure || nvo ? 'ws-word' : '') + '"' + (k.skill ? ' data-skill="' + esc(k.skill) + '"' : '') + '>' + tag + q +
          (k.figure ? '<span class="ws-fig">' + k.figure + '</span>' : '') + opts +
          (k.kind !== 'choice' && String(k.q).indexOf('{?}') < 0 ? ' <span class="ws-blank"></span>' : '') + '</li>';
      }).join('') + '</ol>';
    }

    function keyHTML(tasks) {
      return '<ol class="ws-keylist">' + tasks.map(function (k) {
        k = lettered(k);
        return '<li>' + esc(k.kind === 'choice' ? String(k.answer) : String(k.full).replace(/<[^>]+>/g, '')) + '</li>';
      }).join('') + '</ol>';
    }

    function render() {
      var gr = mode() === 'nvo' ? 4 : +g.value, seen = {};
      var isTest = mode() === 'test', isNvo = mode() === 'nvo';
      var title = isNvo ? 'НВО · математика · 4. клас'
        : E.GRADES[gr].name + ' · ' + E.topicName(gr, t.value);
      var label = isNvo ? 'Пробен тест за НВО' : (isTest ? 'Контролна работа' : 'Работен лист');
      var variants = isTest ? ['А', 'Б'] : [''];
      var sheet = '', key = '', plan = null;
      variants.forEach(function (v, vi) {
        var tasks = pick(gr, seen, plan);          // общ списък „видяни“ – двата варианта никога не съвпадат
        if (isTest && !plan) plan = tasks.map(function (k) { return k.skill; });   // вариант Б повтаря уменията на А
        var vlabel = v ? label + ' · вариант ' + v : label;
        sheet += '<div class="ws-page' + (vi ? ' ws-break' : '') + '">' + sheetHead(title, vlabel) +
          (isNvo ? '<p class="ws-note">Задачи 1–16 са с избираем отговор, 17–20 – с кратък свободен отговор. ' +
            'На изпита има още 5 задачи с решение (21–25).</p>' : '') +
          tasksHTML(tasks, isNvo) +
          '<div class="ws-foot">Решени верно: ______ от ' + tasks.length + (isNvo ? '' : ' &nbsp; ☆ ☆ ☆') + '</div></div>';
        key += '<div class="ws-page' + (vi ? ' ws-break' : '') + '"><div class="ws-head"><div class="ws-brand">Сметко</div>' +
          '<div class="ws-title"><b>Отговори</b><span>' + esc(vlabel) + '</span></div></div>' + keyHTML(tasks) + '</div>';
      });
      $('ws-sheet').innerHTML = sheet;
      $('ws-key').innerHTML = key;
      $('ws-key').hidden = !ans.checked;
      // при НВО темата и трудността не се избират
      [t, lv, cnt].forEach(function (el) { el.disabled = isNvo; el.closest('label').classList.toggle('is-off', isNvo); });
      g.disabled = isNvo; g.closest('label').classList.toggle('is-off', isNvo);
    }

    g.addEventListener('change', fillTopics);
    [t, lv, cnt].forEach(function (el) { el.addEventListener('change', render); });
    if (kind) kind.addEventListener('change', render);
    ans.addEventListener('change', function () { $('ws-key').hidden = !ans.checked; });
    $('ws-new').addEventListener('click', render);
    $('ws-print').addEventListener('click', function () { window.print(); });
    render();
  }

  function boardTable(j) {
    if (!j.list.length) return '<div class="panel" style="text-align:center"><p class="lead-dark">Още никой от класа не е играл.</p></div>';
    var top = j.list.slice(0, 3);
    var pod = '<div class="podium">' + [1, 0, 2].map(function (i) { var r = top[i]; if (!r) return '<div class="pod empty"></div>'; return '<div class="pod p' + (i + 1) + (r.me ? ' me' : '') + '"><span class="medal">' + ['🥇', '🥈', '🥉'][i] + '</span><b>' + esc(r.name) + '</b><small>★ ' + r.points + '</small></div>'; }).join('') + '</div>';
    var rows = j.list.map(function (r) { return '<tr class="' + (r.me ? 'me' : '') + '"><td>' + r.place + '</td><td><b>' + esc(r.name) + '</b>' + (r.me ? ' <span class="tag">ти</span>' : '') + '</td><td>★ ' + r.points + '</td><td>' + r.missions + '</td><td>' + r.stars + '</td></tr>'; }).join('');
    return pod + '<div class="table-wrap"><table class="compare board"><thead><tr><th>#</th><th>Ученик</th><th>Точки</th><th>Мисии</th><th>Звезди</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  S.boardTable = boardTable;
  S.topicOptions = topicOptions;

  document.addEventListener('DOMContentLoaded', function () {
    if ($('hw-grade')) initHomework();
    if ($('ws-grade')) initWorksheet();
  });
})();
