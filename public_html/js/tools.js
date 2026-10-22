/* Сметко — инструменти за учители: линк за домашна и работни листове */
(function () {
  'use strict';
  var S = window.Smetko, E = S.MathEngine, B = S.Books;
  function $(id) { return document.getElementById(id); }
  function topicOptions(g, withMix) {
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

  document.addEventListener('DOMContentLoaded', function () {
    if ($('hw-grade')) initHomework();
    if ($('ws-grade')) initWorksheet();
  });
})();
