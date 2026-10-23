/* Сметко — помагала: оцветяване в таблицата за умножение, преобразувател на римски цифри, печат. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  // ---------- таблица за умножение: ред и колона ----------
  function initTable() {
    var t = document.querySelector('table.tt'); if (!t) return;
    function mark(r, c) {
      t.querySelectorAll('td').forEach(function (td) {
        var tr = +td.dataset.r, tc = +td.dataset.c;
        td.classList.toggle('hl', r > 0 && (tr === r && tc <= c || tc === c && tr <= r));
        td.classList.toggle('hit', tr === r && tc === c);
      });
      var out = $('tt-say'); if (out) out.textContent = r ? r + ' · ' + c + ' = ' + r * c : '';
    }
    t.addEventListener('mouseover', function (e) { var td = e.target.closest('td'); if (td) mark(+td.dataset.r, +td.dataset.c); });
    t.addEventListener('mouseleave', function () { mark(0, 0); });
    t.addEventListener('click', function (e) { var td = e.target.closest('td'); if (td) mark(+td.dataset.r, +td.dataset.c); });
    var say = document.createElement('p'); say.id = 'tt-say'; say.className = 'tt-say'; say.setAttribute('aria-live', 'polite'); t.parentNode.after(say);
  }

  // ---------- римски цифри ----------
  var MAP = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  function toRoman(n) { var s = ''; MAP.forEach(function (m) { while (n >= m[0]) { s += m[1]; n -= m[0]; } }); return s; }
  function fromRoman(r) {
    r = r.toUpperCase().replace(/\s/g, '');
    if (!/^[MDCLXVI]+$/.test(r)) return null;
    var v = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }, n = 0;
    for (var i = 0; i < r.length; i++) { var a = v[r[i]], b = v[r[i + 1]] || 0; n += a < b ? -a : a; }
    return n > 0 && n < 4000 && toRoman(n) === r ? n : null; // само правилен запис
  }
  function explain(n) {
    var parts = [], th = Math.floor(n / 1000) * 1000, h = Math.floor(n % 1000 / 100) * 100, t = Math.floor(n % 100 / 10) * 10, u = n % 10;
    [th, h, t, u].forEach(function (x) { if (x) parts.push(x + ' = ' + toRoman(x)); });
    return parts.join(' · ');
  }
  function initRoman() {
    var a = $('rc-a'), r = $('rc-r'), out = $('rc-out'); if (!a) return;
    a.addEventListener('input', function () {
      a.value = a.value.replace(/\D/g, ''); var n = +a.value;
      if (!a.value) { r.value = ''; out.textContent = 'Напишете число в едно от полетата.'; return; }
      if (n < 1 || n > 3999) { r.value = ''; out.textContent = 'С римски цифри се пишат числата от 1 до 3999.'; return; }
      r.value = toRoman(n); out.innerHTML = '<b>' + n + ' = ' + r.value + '</b><br><small>' + explain(n) + '</small>';
    });
    r.addEventListener('input', function () {
      r.value = r.value.toUpperCase().replace(/[^MDCLXVI]/g, '');
      if (!r.value) { a.value = ''; out.textContent = 'Напишете число в едно от полетата.'; return; }
      var n = fromRoman(r.value);
      if (n === null) { a.value = ''; out.textContent = 'Това не е правилно записано римско число (например IIII се пише IV).'; return; }
      a.value = n; out.innerHTML = '<b>' + r.value + ' = ' + n + '</b><br><small>' + explain(n) + '</small>';
    });
  }

  ready(function () {
    initTable(); initRoman();
    document.querySelectorAll('[data-print]').forEach(function (b) { b.addEventListener('click', function () { document.body.classList.add('print-pillar'); window.print(); setTimeout(function () { document.body.classList.remove('print-pillar'); }, 500); }); });
  });
})();
