/* =========================================================
   Сметко — бухалът (SVG). Едно изображение за целия сайт,
   настроенията се сменят с CSS класове:
   .is-happy  .is-sad  .is-party  .is-think
   ========================================================= */
(function (root) {
  'use strict';

  function svg(opts) {
    opts = opts || {};
    const board = opts.board === undefined ? '2+3=5' : opts.board;
    const id = 'sm' + Math.random().toString(36).slice(2, 7);
    return `
<svg class="smetko" viewBox="0 0 220 248" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Сметко, бухалът">
  <defs>
    <radialGradient id="${id}b" cx="40%" cy="35%" r="75%">
      <stop offset="0" stop-color="#b98450"/><stop offset="1" stop-color="#8e5f33"/>
    </radialGradient>
  </defs>
  <g class="sm-body">
    <!-- уши -->
    <path d="M56 78 L26 46 L74 60 Z" fill="#74491f"/>
    <path d="M164 78 L194 46 L146 60 Z" fill="#74491f"/>
    <!-- тяло -->
    <ellipse cx="110" cy="142" rx="84" ry="92" fill="url(#${id}b)"/>
    <!-- коремче -->
    <ellipse cx="110" cy="174" rx="56" ry="56" fill="#f7e5c6"/>
    <g fill="none" stroke="#e3c491" stroke-width="3" stroke-linecap="round">
      <path d="M88 160 q6 6 12 0 M110 160 q6 6 12 0 M98 178 q6 6 12 0 M120 178 q6 6 12 0 M88 196 q6 6 12 0 M110 196 q6 6 12 0"/>
    </g>
    <!-- лапички -->
    <g fill="#f59a23">
      <ellipse cx="86" cy="236" rx="16" ry="8"/><ellipse cx="134" cy="236" rx="16" ry="8"/>
    </g>
    <!-- ляво крило -->
    <ellipse class="sm-wing-l" cx="34" cy="150" rx="20" ry="46" fill="#7f5329" transform="rotate(14 34 150)"/>
    <!-- лице -->
    <circle cx="80" cy="110" r="36" fill="#fbefdc"/>
    <circle cx="140" cy="110" r="36" fill="#fbefdc"/>
    <circle cx="56" cy="140" r="9" fill="#ff8a80" opacity=".45"/>
    <circle cx="164" cy="140" r="9" fill="#ff8a80" opacity=".45"/>
    <!-- очи -->
    <g class="sm-eyes">
      <circle cx="84" cy="112" r="13" fill="#23263a"/>
      <circle cx="136" cy="112" r="13" fill="#23263a"/>
      <circle cx="89" cy="106" r="4.5" fill="#fff"/>
      <circle cx="141" cy="106" r="4.5" fill="#fff"/>
    </g>
    <!-- очила -->
    <g fill="none" stroke="#23263a" stroke-width="6">
      <circle cx="82" cy="110" r="27"/>
      <circle cx="138" cy="110" r="27"/>
      <path d="M106 104 Q110 98 114 104" stroke-linecap="round"/>
    </g>
    <!-- вежди (за „мисля“ и „тъжно“) -->
    <g class="sm-brows" fill="none" stroke="#5b3a18" stroke-width="5" stroke-linecap="round">
      <path d="M66 74 Q82 66 98 74"/><path d="M122 74 Q138 66 154 74"/>
    </g>
    <!-- човка -->
    <path d="M100 132 Q110 154 120 132 Q110 125 100 132 Z" fill="#f59a23"/>
    <!-- шапка -->
    <path d="M52 74 C54 22 166 22 168 74 Z" fill="#37ab56"/>
    <path d="M50 72 Q110 58 170 72 L170 82 Q110 68 50 82 Z" fill="#26893f"/>
    <path d="M150 72 Q200 66 210 84 Q182 88 150 82 Z" fill="#26893f"/>
    <circle cx="110" cy="31" r="7" fill="#26893f"/>
    <path d="M78 44 Q92 34 108 34" fill="none" stroke="#6fd38c" stroke-width="5" stroke-linecap="round" opacity=".7"/>
  </g>
  ${board ? `
  <!-- дъска със задача -->
  <g class="sm-board" transform="rotate(-7 150 186)">
    <rect x="100" y="154" width="98" height="64" rx="10" fill="#c98a4b"/>
    <rect x="107" y="161" width="84" height="50" rx="6" fill="#2f6b55"/>
    <text x="149" y="193" text-anchor="middle" font-family="Nunito, 'Trebuchet MS', sans-serif" font-weight="900" font-size="21" fill="#fff">${board}</text>
  </g>
  <ellipse class="sm-wing-r" cx="202" cy="182" rx="16" ry="28" fill="#7f5329" transform="rotate(-20 202 182)"/>` :
  `<ellipse class="sm-wing-r" cx="186" cy="150" rx="20" ry="46" fill="#7f5329" transform="rotate(-14 186 150)"/>`}
</svg>`;
  }

  function render(scope) {
    (scope || document).querySelectorAll('[data-smetko]').forEach((el) => {
      if (el.dataset.rendered) return;
      el.innerHTML = svg({ board: el.dataset.board !== undefined ? el.dataset.board : undefined });
      el.dataset.rendered = '1';
    });
  }

  // смяна на настроение за кратко
  function mood(el, name, ms) {
    if (!el) return;
    const s = el.querySelector('.smetko') || el;
    s.classList.remove('is-happy', 'is-sad', 'is-party', 'is-think');
    void s.getBoundingClientRect(); // рестарт на анимацията
    if (name) s.classList.add('is-' + name);
    clearTimeout(s._moodT);
    if (ms) s._moodT = setTimeout(() => s.classList.remove('is-' + name), ms);
  }

  root.Smetko = { svg, render, mood };
  if (typeof document !== 'undefined') {
    if (document.readyState !== 'loading') render();
    else document.addEventListener('DOMContentLoaded', () => render());
  }
})(window);
