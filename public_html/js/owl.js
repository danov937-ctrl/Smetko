/* Сметко — бухалът на smetko.com (SVG с обемни градиенти)
   Употреба: <div class="owl" data-owl="hero"></div> (app.js ги рисува автоматично) или Smetko.owl('cheer').
   Пози: hero (молив и книга), hello (маха), happy, cheer (празнува), think, encourage, idle */
(function () {
  'use strict';
  var uid = 0;

  function owl(pose) {
    pose = pose || 'hello';
    var id = 'ow' + (++uid);
    var g = function (n) { return 'url(#' + id + n + ')'; };
    var defs = '<defs>' +
      '<radialGradient id="' + id + 'b" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="#C08350"/><stop offset=".55" stop-color="#9A6233"/><stop offset="1" stop-color="#6E4220"/></radialGradient>' +
      '<radialGradient id="' + id + 'f" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#FFF1D6"/><stop offset="1" stop-color="#EBC994"/></radialGradient>' +
      '<radialGradient id="' + id + 'y" cx="45%" cy="30%" r="75%"><stop offset="0" stop-color="#FFF8EA"/><stop offset="1" stop-color="#F0D6A8"/></radialGradient>' +
      '<linearGradient id="' + id + 'c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6FD06A"/><stop offset="1" stop-color="#2F9A3A"/></linearGradient>' +
      '<linearGradient id="' + id + 'w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8C5529"/><stop offset="1" stop-color="#5E3517"/></linearGradient>' +
      '<radialGradient id="' + id + 'e" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#E4EEF8"/></radialGradient>' +
      '<linearGradient id="' + id + 'k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC24B"/><stop offset="1" stop-color="#F08A00"/></linearGradient>' +
      '</defs>';

    var eye = 'normal', mouth = 'closed', cheeks = false, L = 'down', R = 'down', prop = 'none';
    switch (pose) {
      case 'hero': R = 'up'; L = 'hold'; prop = 'pencilbook'; cheeks = true; break;
      case 'cheer': L = 'upL'; R = 'up'; eye = 'happy'; mouth = 'open'; cheeks = true; break;
      case 'happy': eye = 'happy'; cheeks = true; prop = 'abacus'; L = 'hold'; R = 'holdR'; break;
      case 'think': R = 'chin'; eye = 'up'; break;
      case 'encourage': R = 'thumb'; cheeks = true; break;
      case 'idle': prop = 'abacus'; L = 'hold'; R = 'holdR'; break;
      default: R = 'wave'; prop = 'abacus'; L = 'hold';
    }

    var s = '<svg class="owl-svg" viewBox="0 0 260 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Сметко – бухалът">' + defs;
    // сянка
    s += '<ellipse cx="130" cy="270" rx="70" ry="8" fill="#0B2545" opacity=".14"/>';
    // крака
    s += '<g fill="' + g('k') + '"><path d="M96 252 q-14 6 -10 14 q12 2 26 -2 q4 -8 -4 -12 z"/><path d="M164 252 q14 6 10 14 q-12 2 -26 -2 q-4 -8 4 -12 z"/></g>';
    // тяло
    s += '<ellipse cx="130" cy="198" rx="74" ry="66" fill="' + g('b') + '"/>';
    s += '<ellipse cx="130" cy="210" rx="50" ry="50" fill="' + g('y') + '"/>';
    [[110, 186], [130, 182], [150, 186], [102, 204], [122, 202], [142, 202], [160, 206], [112, 222], [132, 220], [152, 222], [122, 238], [142, 238]].forEach(function (p) {
      s += '<path d="M' + (p[0] - 6) + ' ' + p[1] + ' q6 6 12 0" stroke="#D9B27C" stroke-width="3" fill="none" stroke-linecap="round"/>';
    });
    // крила (зад предметите, ако държат)
    s += wingSVG('L', L, g) + (R === 'holdR' ? wingSVG('R', R, g) : '');
    // глава
    s += '<ellipse cx="130" cy="106" rx="86" ry="80" fill="' + g('b') + '"/>';
    s += '<path d="M60 70 q-6 -26 8 -40 q10 18 24 26 z M200 70 q6 -26 -8 -40 q-10 18 -24 26 z" fill="#7B4A22"/>';
    // лице
    s += '<path d="M130 166 C 96 170 52 152 54 116 C 56 84 92 76 130 92 C 168 76 204 84 206 116 C 208 152 164 170 130 166 Z" fill="' + g('f') + '"/>';
    // очи
    s += '<circle cx="98" cy="118" r="27" fill="' + g('e') + '"/><circle cx="162" cy="118" r="27" fill="' + g('e') + '"/>';
    if (eye === 'happy') {
      s += '<path d="M84 122 q14 -16 28 0 M148 122 q14 -16 28 0" stroke="#1D2440" stroke-width="6" fill="none" stroke-linecap="round"/>';
    } else {
      var dx = eye === 'up' ? 4 : 2, dy = eye === 'up' ? -7 : 2;
      s += '<g class="owl-pupils"><circle cx="' + (100 + dx) + '" cy="' + (118 + dy) + '" r="13" fill="#1D2440"/><circle cx="' + (160 + dx) + '" cy="' + (118 + dy) + '" r="13" fill="#1D2440"/>' +
        '<circle cx="' + (105 + dx) + '" cy="' + (112 + dy) + '" r="5" fill="#fff"/><circle cx="' + (165 + dx) + '" cy="' + (112 + dy) + '" r="5" fill="#fff"/>' +
        '<circle cx="' + (96 + dx) + '" cy="' + (123 + dy) + '" r="2" fill="#fff" opacity=".8"/><circle cx="' + (156 + dx) + '" cy="' + (123 + dy) + '" r="2" fill="#fff" opacity=".8"/></g>';
    }
    // очила
    s += '<g fill="none" stroke="#1E2A47" stroke-width="6.5"><circle cx="98" cy="118" r="31"/><circle cx="162" cy="118" r="31"/><path d="M127 112 q3 -5 6 0"/></g>' +
      '<path d="M67 112 l-12 -5 M193 112 l12 -5" stroke="#1E2A47" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M80 98 q10 -8 22 -5 M144 98 q10 -8 22 -5" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>';
    if (cheeks) s += '<ellipse cx="74" cy="150" rx="10" ry="6" fill="#FF8FA3" opacity=".5"/><ellipse cx="186" cy="150" rx="10" ry="6" fill="#FF8FA3" opacity=".5"/>';
    // човка
    if (mouth === 'open') s += '<path d="M118 146 h24 l-12 22 z" fill="' + g('k') + '" stroke="#D86F00" stroke-width="2.5" stroke-linejoin="round"/><path d="M122 153 h16 l-8 9 z" fill="#B23A0C"/>';
    else s += '<path d="M118 146 q12 -4 24 0 l-12 20 z" fill="' + g('k') + '" stroke="#D86F00" stroke-width="2.5" stroke-linejoin="round"/>';
    // шапка
    s += '<path d="M54 74 C 54 6 206 6 206 74 Z" fill="' + g('c') + '"/>' +
      '<path d="M72 44 C 94 26 128 22 150 28" stroke="#A7EBA0" stroke-width="7" fill="none" stroke-linecap="round" opacity=".75"/>' +
      '<path d="M50 70 Q130 58 210 70 L210 82 Q130 70 50 82 Z" fill="#2A8A35"/>' +
      '<path d="M60 76 Q16 74 12 88 Q18 98 76 88 Z" fill="#2A8A35"/><path d="M58 78 Q24 78 20 86" stroke="#5FC45E" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="130" cy="22" r="7" fill="#2A8A35"/>';
    // предмети
    if (prop === 'abacus') s += abacus();
    if (prop === 'pencilbook') s += book();
    if (R !== 'holdR') s += wingSVG('R', R, g);
    if (prop === 'pencilbook') s += pencil();
    s += '</svg>';
    return s;
  }

  function wingSVG(side, kind, g) {
    var w = function (cx, cy, rot, cls) {
      return '<g' + (cls ? ' class="' + cls + '"' : '') + '><g transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"><ellipse cx="' + cx + '" cy="' + cy + '" rx="21" ry="46" fill="' + g('w') + '"/>' +
        '<path d="M' + (cx - 10) + ' ' + (cy + 12) + ' q10 8 20 0 M' + (cx - 11) + ' ' + (cy + 26) + ' q11 8 22 0" stroke="#A86B3C" stroke-width="3" fill="none" stroke-linecap="round"/></g></g>';
    };
    if (side === 'L') {
      if (kind === 'upL') return w(46, 150, 40);
      if (kind === 'hold') return w(68, 214, 38);
      return w(58, 200, 14);
    }
    if (kind === 'up') return w(214, 140, -40, 'owl-wing-r');
    if (kind === 'wave') return w(214, 140, -40, 'owl-wing-r owl-wave');
    if (kind === 'holdR') return w(192, 214, -38);
    if (kind === 'chin') return '<g transform="rotate(60 178 186)"><ellipse cx="178" cy="186" rx="18" ry="40" fill="' + g('w') + '"/></g>';
    if (kind === 'thumb') return w(212, 150, -55, 'owl-wing-r');
    return w(202, 200, -14);
  }

  function abacus() {
    var beads = ['#FF5A5F', '#FFC531', '#4CBB4A', '#2F80ED'], s = '<g>';
    s += '<rect x="86" y="196" width="88" height="58" rx="9" fill="#C27C3E" stroke="#8E5422" stroke-width="4"/><rect x="94" y="203" width="72" height="44" rx="5" fill="#FFF6E5"/>';
    for (var r = 0; r < 3; r++) {
      var y = 213 + r * 12;
      s += '<line x1="94" y1="' + y + '" x2="166" y2="' + y + '" stroke="#8E5422" stroke-width="2"/>';
      for (var b = 0; b < [3, 2, 4][r]; b++) s += '<circle cx="' + (101 + b * 9.5) + '" cy="' + y + '" r="4.8" fill="' + beads[(r + b) % 4] + '"/>';
      s += '<circle cx="158" cy="' + y + '" r="4.8" fill="' + beads[(r + 2) % 4] + '"/>';
    }
    return s + '</g>';
  }
  function book() {
    return '<g transform="rotate(-8 92 222)"><rect x="56" y="196" width="78" height="56" rx="6" fill="#2E9440"/><rect x="60" y="200" width="70" height="48" rx="4" fill="#43A84A"/>' +
      '<rect x="130" y="198" width="6" height="52" rx="2" fill="#F4F0E6"/>' +
      '<text x="95" y="230" text-anchor="middle" font-family="Nunito, Arial, sans-serif" font-weight="900" font-size="17" fill="#fff">1+2=3</text></g>';
  }
  function pencil() {
    return '<g transform="rotate(-28 222 92)"><rect x="214" y="44" width="16" height="82" rx="3" fill="#FFC531"/><rect x="214" y="44" width="5" height="82" fill="#FFD866"/>' +
      '<rect x="214" y="36" width="16" height="12" rx="3" fill="#FF8FA3"/><rect x="214" y="46" width="16" height="5" fill="#C9CED8"/>' +
      '<path d="M214 126 l8 18 l8 -18 z" fill="#F6D9B0"/><path d="M219.5 138 l2.5 6 l2.5 -6 z" fill="#1D2B4F"/></g>';
  }

  window.Smetko = window.Smetko || {};
  window.Smetko.owl = owl;
})();
