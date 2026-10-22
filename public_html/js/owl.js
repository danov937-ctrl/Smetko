/* Сметко — бухалът на smetko.com
   Рисува Сметко като SVG в различни пози.
   Употреба: <div class="owl" data-pose="hello"></div>  (app.js ги рендерира автоматично)
   или Smetko.owl('cheer') → SVG низ.
   Пози: hello (маха), happy (радва се), cheer (празнува), think (мисли), encourage (окуражава), idle */
(function () {
  'use strict';
  var C = {
    body: '#9A6233', bodyDark: '#7B4A22', face: '#F6DDB4', belly: '#FBEBD0', scallop: '#E3C08F',
    cap: '#43A84A', capDark: '#2F8A3A', capLight: '#62C266', beak: '#FF9F1C', beakDark: '#E07E00',
    feet: '#FF9F1C', glass: '#26324F', pupil: '#1D2440', wood: '#C27C3E', woodDark: '#9A5D28'
  };

  function wing(cx, cy, rot, extra) {
    return '<g' + (extra || '') + '><g transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')">' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="19" ry="44" fill="' + C.bodyDark + '"/>' +
      '<path d="M' + (cx - 9) + ' ' + (cy + 10) + ' q9 8 18 0 M' + (cx - 10) + ' ' + (cy + 24) + ' q10 8 20 0" stroke="' + C.body + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '</g></g>';
  }

  function eyes(kind) {
    var s = '';
    // бели очи
    s += '<circle cx="93" cy="112" r="23" fill="#fff"/><circle cx="147" cy="112" r="23" fill="#fff"/>';
    if (kind === 'happy') {
      s += '<path d="M80 116 q13 -15 26 0" stroke="' + C.pupil + '" stroke-width="5.5" fill="none" stroke-linecap="round"/>';
      s += '<path d="M134 116 q13 -15 26 0" stroke="' + C.pupil + '" stroke-width="5.5" fill="none" stroke-linecap="round"/>';
    } else {
      var dx = 0, dy = 2;
      if (kind === 'up') { dx = 4; dy = -6; }
      s += '<g class="owl-pupils"><circle cx="' + (96 + dx) + '" cy="' + (112 + dy) + '" r="11" fill="' + C.pupil + '"/>' +
        '<circle cx="' + (144 + dx) + '" cy="' + (112 + dy) + '" r="11" fill="' + C.pupil + '"/>' +
        '<circle cx="' + (100 + dx) + '" cy="' + (108 + dy) + '" r="4" fill="#fff"/>' +
        '<circle cx="' + (148 + dx) + '" cy="' + (108 + dy) + '" r="4" fill="#fff"/></g>';
    }
    // очила
    s += '<g fill="none" stroke="' + C.glass + '" stroke-width="5">' +
      '<circle cx="93" cy="112" r="27"/><circle cx="147" cy="112" r="27"/>' +
      '<path d="M118 106 q2 -4 4 0"/><path d="M66 106 l-10 -4 M174 106 l10 -4" stroke-linecap="round"/></g>';
    s += '<path d="M76 92 q8 -6 18 -3" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/>';
    s += '<path d="M130 92 q8 -6 18 -3" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/>';
    return s;
  }

  function abacus() {
    var beads = ['#FF5A5F', '#FFC531', '#4CBB4A', '#2F80ED'];
    var s = '<g class="owl-prop">';
    s += '<rect x="78" y="186" width="84" height="56" rx="8" fill="' + C.wood + '" stroke="' + C.woodDark + '" stroke-width="4"/>';
    s += '<rect x="86" y="193" width="68" height="42" rx="4" fill="#FFF6E5"/>';
    for (var r = 0; r < 3; r++) {
      var y = 202 + r * 12;
      s += '<line x1="86" y1="' + y + '" x2="154" y2="' + y + '" stroke="' + C.woodDark + '" stroke-width="2"/>';
      var n = [3, 2, 4][r];
      for (var b = 0; b < n; b++) {
        s += '<circle cx="' + (93 + b * 9) + '" cy="' + y + '" r="4.6" fill="' + beads[(r + b) % 4] + '"/>';
      }
      s += '<circle cx="' + (146) + '" cy="' + y + '" r="4.6" fill="' + beads[(r + 2) % 4] + '"/>';
    }
    s += '</g>';
    return s;
  }

  function mouth(kind) {
    if (kind === 'open') {
      return '<path d="M110 140 h20 l-10 18 z" fill="' + C.beak + '" stroke="' + C.beakDark + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M113 146 h14 l-7 8 z" fill="#C2410C"/>';
    }
    return '<path d="M110 139 h20 l-10 17 z" fill="' + C.beak + '" stroke="' + C.beakDark + '" stroke-width="2.5" stroke-linejoin="round"/>';
  }

  function owl(pose) {
    pose = pose || 'hello';
    var leftWing, rightWing, eyeKind = 'normal', mouthKind = 'closed', prop = false, cheeks = false;
    switch (pose) {
      case 'cheer':
        leftWing = wing(42, 120, 38); rightWing = wing(198, 120, -38, ' class="owl-wing-r"');
        eyeKind = 'happy'; mouthKind = 'open'; cheeks = true; break;
      case 'happy':
        leftWing = wing(48, 178, 14); rightWing = wing(192, 178, -14);
        eyeKind = 'happy'; cheeks = true; prop = true; break;
      case 'think':
        leftWing = wing(48, 178, 14);
        rightWing = '<g transform="rotate(58 165 168)"><ellipse cx="165" cy="168" rx="17" ry="38" fill="' + C.bodyDark + '"/></g>';
        eyeKind = 'up'; break;
      case 'encourage':
        leftWing = wing(48, 178, 14); rightWing = wing(200, 132, -48, ' class="owl-wing-r"');
        cheeks = true; prop = false; break;
      case 'idle':
        leftWing = wing(48, 178, 14); rightWing = wing(192, 178, -14); prop = true; break;
      default: // hello
        leftWing = wing(48, 178, 14); rightWing = wing(200, 120, -40, ' class="owl-wing-r owl-wave"');
        prop = true;
    }

    var s = '<svg class="owl-svg" viewBox="0 0 240 262" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Сметко — бухалът">';
    // сянка
    s += '<ellipse cx="120" cy="254" rx="62" ry="7" fill="#000" opacity=".12"/>';
    // крака
    s += '<g fill="' + C.feet + '"><ellipse cx="96" cy="247" rx="15" ry="7"/><ellipse cx="144" cy="247" rx="15" ry="7"/></g>';
    // тяло + глава
    s += '<ellipse cx="120" cy="178" rx="74" ry="72" fill="' + C.body + '"/>';
    s += '<circle cx="120" cy="108" r="70" fill="' + C.body + '"/>';
    // корем с перца
    s += '<ellipse cx="120" cy="190" rx="50" ry="52" fill="' + C.belly + '"/>';
    var sc = '';
    [[100, 168], [120, 168], [140, 168], [90, 186], [110, 186], [130, 186], [150, 186], [100, 204], [120, 204], [140, 204], [110, 222], [130, 222]].forEach(function (p) {
      sc += '<path d="M' + (p[0] - 6) + ' ' + p[1] + ' q6 6 12 0" stroke="' + C.scallop + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
    });
    s += sc;
    // лицев диск
    s += '<path d="M120 150 C 92 154 58 140 60 110 C 62 84 90 78 120 92 C 150 78 178 84 180 110 C 182 140 148 154 120 150 Z" fill="' + C.face + '"/>';
    s += eyes(eyeKind);
    if (cheeks) s += '<circle cx="72" cy="136" r="8" fill="#FF8FA3" opacity=".55"/><circle cx="168" cy="136" r="8" fill="#FF8FA3" opacity=".55"/>';
    s += mouth(mouthKind);
    // шапка
    s += '<path d="M54 78 C 54 16 186 16 186 78 Z" fill="' + C.cap + '"/>';
    s += '<path d="M76 50 C 94 38 118 35 138 39" stroke="' + C.capLight + '" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"/>';
    s += '<path d="M52 75 Q120 65 188 75 L188 85 Q120 75 52 85 Z" fill="' + C.capDark + '"/>';
    s += '<path d="M60 81 Q20 81 18 93 Q22 101 70 93 Z" fill="' + C.capDark + '"/>';
    s += '<circle cx="120" cy="33" r="6" fill="' + C.capDark + '"/>';
    // уши-перца под шапката
    s += '<path d="M55 72 l-10 -14 l18 6 z M185 72 l10 -14 l-18 6 z" fill="' + C.bodyDark + '"/>';
    s += leftWing;
    if (prop) s += abacus();
    s += rightWing;
    s += '</svg>';
    return s;
  }

  window.Smetko = window.Smetko || {};
  window.Smetko.owl = owl;
})();
