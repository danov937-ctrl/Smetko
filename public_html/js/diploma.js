/* Сметко — грамоти за печат (веднъж годишно, в края на учебната година).
   Отваря се от класацията на учителя, отчета за родителя или админ панела: данните идват през sessionStorage['smetko.dipl'].
   {kind: 'class'|'child'|'league', year, className, school, sign1, sign2, items: [{name, place, line}]} */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function schoolYear() { var d = new Date(), y = d.getFullYear(); if (d.getMonth() < 8) y--; return y + '/' + (y + 1); }
  /* грамотите са отворени от 1 юни до 30 септември (или ръчно от админ панела) */
  S.diplomasOpen = function () {
    var c = (S.siteConfig || {}).diplomas || 'auto';
    if (c === 'on') return true; if (c === 'off') return false;
    var m = new Date().getMonth(); return m >= 5 && m <= 8;
  };
  S.openDiplomas = function (data) {
    data.year = data.year || schoolYear();
    try { sessionStorage.setItem('smetko.dipl', JSON.stringify(data)); } catch (e) {}
    window.open('gramota.html', '_blank');
  };
  var MEDAL = ['', '🥇', '🥈', '🥉'];
  function placeText(p) { return p === 1 ? 'I място' : p === 2 ? 'II място' : p === 3 ? 'III място' : ''; }
  function render(d) {
    d.year = d.year || schoolYear();
    var box = document.getElementById('dipl-out'); if (!box) return;
    var sel = document.getElementById('dipl-which').value, items = d.items.filter(function (x) { return sel === 'all' || (sel === 'top' ? x.place && x.place <= 3 : x.checked); });
    box.innerHTML = items.map(function (x, i) {
      var title = x.place && x.place <= 3 ? 'ГРАМОТА' : (d.kind === 'league' ? 'ГРАМОТА' : 'ГРАМОТА');
      return '<section class="dipl">' +
        '<div class="dp-corner tl"></div><div class="dp-corner br"></div>' +
        '<div class="dp-top"><div class="dp-owl" data-owl="' + (x.place === 1 ? 'cheer' : 'happy') + '"></div><div class="dp-brand"><span>С</span><span>м</span><span>е</span><span>т</span><span>к</span><span>о</span></div></div>' +
        '<h1>' + title + '</h1>' + (x.place && x.place <= 3 ? '<div class="dp-place">' + MEDAL[x.place] + ' ' + placeText(x.place) + '</div>' : '') +
        '<p class="dp-for">се присъжда на</p><div class="dp-name" contenteditable="true" spellcheck="false">' + esc(x.name) + '</div>' +
        '<p class="dp-line">' + esc(x.line) + '</p>' +
        '<p class="dp-meta">' + esc([d.className, d.school].filter(Boolean).join(' · ')) + (d.className || d.school ? ' · ' : '') + 'учебна ' + esc(d.year) + ' г.</p>' +
        '<div class="dp-sign"><div><span contenteditable="true">' + esc(d.sign1 || '') + '</span><i>' + (d.kind === 'child' ? 'Родител' : d.kind === 'league' ? 'Екипът на Сметко' : 'Учител') + '</i></div><div class="dp-seal">🦉</div><div><span contenteditable="true">' + esc(d.sign2 || '') + '</span><i>' + (d.kind === 'class' ? 'Директор' : 'smetko.com') + '</i></div></div>' +
      '</section>';
    }).join('') || '<p class="dp-empty">Няма избрани грамоти.</p>';
    if (S.renderOwls) S.renderOwls(box);
  }
  document.addEventListener('DOMContentLoaded', function () {
    var box = document.getElementById('dipl-out'); if (!box) return;
    var d = null; try { d = JSON.parse(sessionStorage.getItem('smetko.dipl') || 'null'); } catch (e) {}
    if (!d || !d.items || !d.items.length) { box.innerHTML = '<p class="dp-empty">Отворете грамотите от класацията на класа (учител), отчета за родителя или админ панела.</p>'; document.getElementById('dipl-tools').hidden = true; return; }
    d.items.forEach(function (x) { x.checked = true; });
    var list = document.getElementById('dipl-list');
    list.innerHTML = d.items.map(function (x, i) { return '<label class="check"><input type="checkbox" data-i="' + i + '" checked> ' + (x.place && x.place <= 3 ? MEDAL[x.place] + ' ' : '') + esc(x.name) + '</label>'; }).join('');
    list.addEventListener('change', function (e) { var i = e.target.getAttribute('data-i'); if (i !== null) { d.items[+i].checked = e.target.checked; document.getElementById('dipl-which').value = 'pick'; render(d); } });
    document.getElementById('dipl-which').addEventListener('change', function () { render(d); });
    document.getElementById('dipl-print').addEventListener('click', function () { window.print(); });
    if (d.items.length === 1) document.getElementById('dipl-pick').hidden = true;
    render(d);
  });
})();
