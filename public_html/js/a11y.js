/* Сметко — помощни настройки за деца със СОП (специални образователни потребности),
   дислексия, дискалкулия, ADHD, аутизъм или просто нужда от по-спокойно темпо.
   Настройките се пазят в профила на детето (state.settings.a11y) и вървят с акаунта.
   Учителят може да зададе настройки за ученик от клас в „Табло“ – те са заключени за детето (state.teacherAdapt). */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};

  var OPTS = [
    { k: 'calm', ico: '🧘', name: 'Спокоен режим', desc: 'Без тиктакане и конфети. Двойно време в „Бързо сметни“. След грешка детето само решава кога да продължи.' },
    { k: 'read', ico: '🔈', name: 'Чети задачите на глас', desc: 'Сметко прочита всяка задача с българския глас на устройството. С бутона 🔈 се чува пак.' },
    { k: 'big', ico: '🔠', name: 'Едър текст и бутони', desc: 'По-големи задачи, цифри и бутони – за по-лесно виждане и натискане.' },
    { k: 'spaced', ico: '📖', name: 'Лесно четене', desc: 'Повече място между буквите и редовете и мек фон. Помага при дислексия.' },
    { k: 'choices', ico: '🔘', name: 'Отговор с избор', desc: 'Вместо да пише числото, детето избира верния отговор от три.' },
    { k: 'short', ico: '🎯', name: 'Кратки мисии', desc: '5 задачи в мисия вместо 10 – по-лесно задържане на вниманието.' },
    { k: 'dots', ico: '🔴', name: 'Точици за помощ', desc: 'Показва точици при събиране и изваждане до 20 и при малко умножение.' },
    { k: 'retry', ico: '🔁', name: 'Втори опит', desc: 'При грешка детето получава подсказка и опитва пак, преди да види верния отговор.' }
  ];
  var PRESET = ['calm', 'read', 'big', 'short', 'dots', 'retry'];

  function G() { return S.Game; }
  function local() { var g = G(); if (!g) return {}; var s = g.state.settings || (g.state.settings = {}); return s.a11y || (s.a11y = {}); }
  function teacher() { var g = G(); var t = g && g.state.teacherAdapt; return t && typeof t === 'object' ? t : {}; }
  function on(k) { return !!(local()[k] || teacher()[k]); }
  function locked(k) { return !!teacher()[k]; }
  function any() { return OPTS.some(function (o) { return on(o.k); }); }
  function count() { return OPTS.filter(function (o) { return on(o.k); }).length; }
  function set(k, v) { var a = local(); if (v) a[k] = 1; else delete a[k]; if (G()) G().save(); apply(); }

  function apply() {
    var h = document.documentElement;
    ['calm', 'big', 'spaced'].forEach(function (k) { h.classList.toggle('a11y-' + k, on(k)); });
    var n = count();
    document.querySelectorAll('[data-a11y-count]').forEach(function (el) { el.textContent = n ? n + ' вкл.' : ''; el.hidden = !n; });
    document.querySelectorAll('[data-a11y-open]').forEach(function (el) { el.classList.toggle('on', n > 0); });
    try { document.dispatchEvent(new CustomEvent('smetko:a11y')); } catch (e) {}
  }

  // ---------- четене на глас (Web Speech API, български глас) ----------
  var synth = window.speechSynthesis, voice = null, voicesTried = false;
  function pickVoice() {
    if (!synth) return null;
    var vs = synth.getVoices() || [];
    if (vs.length) voicesTried = true;
    var bg = vs.filter(function (v) { return /^bg/i.test(v.lang); });
    voice = bg.filter(function (v) { return /google|natural|online/i.test(v.name); })[0] || bg[0] || null;
    return voice;
  }
  if (synth) { pickVoice(); if ('onvoiceschanged' in synth) synth.addEventListener('voiceschanged', pickVoice); }
  // има ли български глас? (null = още не знаем – списъкът с гласове не е зареден)
  function hasVoice() { if (!synth) return false; pickVoice(); return voice ? true : (voicesTried ? false : null); }
  function speak(text) {
    if (!synth || !text) return;
    try {
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'bg-BG'; if (voice || pickVoice()) u.voice = voice;
      u.rate = 0.88; u.pitch = 1.05;
      synth.speak(u);
    } catch (e) {}
  }
  function stop() { try { if (synth) synth.cancel(); } catch (e) {} }

  // текстът на задачата → изречение за четене
  function plain(html) {
    var d = document.createElement('div');
    d.innerHTML = String(html).replace(/<br\s*\/?>/gi, '. ').replace(/<span class="ans-line">[\s\S]*?<\/span>/, '');
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function mathWords(s) {
    return s
      .replace(/(\d) (?=\d{3}\b)/g, '$1')                 // 12 345 → 12345
      .replace(/\s*\{\?\}\s*/g, ' колко ')
      .replace(/\s*\+\s*/g, ' плюс ')
      .replace(/(\d|колко)\s*[−–-]\s*(?=\d|колко)/g, '$1 минус ')
      .replace(/(\d|колко)\s*[·×]\s*(?=\d|колко)/g, '$1 по ')
      .replace(/(\d|колко)\s*:\s*(?=\d|колко)/g, '$1 делено на ')
      .replace(/\s*=\s*/g, ' равно на ')
      .replace(/\s*<\s*/g, ' е по-малко от ').replace(/\s*>\s*/g, ' е по-голямо от ')
      .replace(/\s+/g, ' ').trim();
  }
  function taskText(t) {
    if (!t) return '';
    if (t.kind === 'choice' && typeof t.choices[0] === 'string') { // сравняване: 12 {?} 15
      var p = plain(t.q).split('{?}');
      return 'Сравни: ' + mathWords(p[0]) + ' и ' + mathWords(p[1] || '') + '. По-малко, равно или по-голямо?';
    }
    var s = mathWords(plain(t.q));
    if (/колко$/.test(s)) s += '?';
    if (t.kind === 'choice' && !t.optFigs && t.choices.length <= 4) s += '. Избери: ' + t.choices.map(function (c, i) { return (i + 1) + ' – ' + mathWords(plain(c.html)); }).join(', ') + '.';
    return s;
  }

  // ---------- помощ в задачите ----------
  // число → избор от 3 отговора
  function toChoices(t) {
    if (t.kind !== 'number' || typeof t.answer !== 'number') return t;
    var a = t.answer, set = {}, opts = [a];
    set[a] = 1;
    var cand = [a + 1, a - 1, a + 2, a - 2, a + 10, a - 10, a + 3, a + 5];
    if (a >= 100) cand = [a + 10, a - 10, a + 1, a - 1, a + 100, a - 100, a + 2];
    cand.sort(function () { return Math.random() - 0.5; });
    for (var i = 0; i < cand.length && opts.length < 3; i++) { var v = cand[i]; if (v >= 0 && !set[v]) { set[v] = 1; opts.push(v); } }
    opts.sort(function (x, y) { return x - y; }); // подредени – по-лесно за сравняване
    var fmt = S.MathEngine ? S.MathEngine.fmt : String;
    t.kind = 'choice'; t.answer = String(a); t.numChoice = true;
    t.choices = opts.map(function (v) { return { v: String(v), html: fmt(v) }; });
    return t;
  }
  // точици при малки числа (ако задачата още няма картинка)
  function addDots(t) {
    if (t.dots || t.figure || t.word) return t;
    var q = plain(t.q).replace(/(\d) (?=\d{3}\b)/g, '$1'), m = q.match(/^(\d+) ([+−·]) (\d+) = \{\?\}$/);
    if (!m) return t;
    var a = +m[1], b = +m[3];
    if (m[2] === '+' && a + b <= 20 && a <= 12 && b <= 12) t.dots = { a: a, b: b, op: '+' };
    else if (m[2] === '−' && a <= 20) t.dots = { a: a, b: b, op: '-' };
    else if (m[2] === '·' && a * b <= 30 && a <= 6 && b <= 10) t.dots = { a: a, b: b, op: 'x' };
    return t;
  }
  // подсказка след първа грешка
  function hint(t, input) {
    if (t.numChoice || t.kind === 'choice') return 'Не е ' + (t.numChoice ? input : 'този') + '. Опитай пак! 🙂';
    var n = parseInt(String(input).replace(/\s/g, ''), 10);
    if (isNaN(n)) return 'Опитай пак! 🙂';
    return 'Почти! Отговорът е ' + (t.answer > n ? 'по-голям' : 'по-малък') + ' от ' + (S.MathEngine ? S.MathEngine.fmt(n) : n) + '. Опитай пак! 🙂';
  }

  // ---------- прозорецът с настройките ----------
  function modal() {
    if (!S.modal) return;
    var tv = hasVoice();
    var rows = OPTS.map(function (o) {
      var lk = locked(o.k), note = '';
      if (lk) note = '<em class="a11y-lock">🔒 зададено от учителя</em>';
      else if (o.k === 'read' && tv === false) note = '<em class="a11y-warn">На това устройство няма български глас – може да се добави от настройките на телефона/компютъра (Език и въвеждане → Текст към говор).</em>';
      else if (o.k === 'short') note = '';
      return '<label class="a11y-row' + (lk ? ' locked' : '') + '"><span class="a11y-ico" aria-hidden="true">' + o.ico + '</span><span class="a11y-txt"><b>' + o.name + '</b><small>' + o.desc + '</small>' + note + '</span>' +
        '<input type="checkbox" class="sw" data-k="' + o.k + '"' + (on(o.k) ? ' checked' : '') + (lk ? ' disabled' : '') + '></label>';
    }).join('');
    var d = S.modal('<h3>Помощни настройки</h3><p class="a11y-intro">За деца със СОП, дислексия, дискалкулия, трудности с вниманието – или просто нужда от по-спокойно темпо. Включете само това, което помага на вашето дете.</p>' +
      '<div class="a11y-preset"><button class="btn btn-green btn-sm" data-preset>✨ Препоръчани за СОП</button><button class="btn btn-ghost btn-sm" data-none>Изключи всички</button>' + (synth ? '<button class="btn btn-ghost btn-sm" data-test>🔈 Пробвай гласа</button>' : '') + '</div>' +
      '<div class="a11y-list">' + rows + '</div>' +
      '<p class="hint a11y-foot">Настройките се пазят за това дете (и в акаунта, ако има). В „Предизвикателство“ времето остава 60 сек., защото е състезание. <a href="deca-sas-sop.html">Повече за Сметко и децата със СОП</a></p>' +
      '<div class="modal-actions"><button class="btn" data-close>Готово</button></div>');
    d.classList.add('a11y-modal');
    function sync() { d.querySelectorAll('input[data-k]').forEach(function (i) { i.checked = on(i.getAttribute('data-k')); }); }
    d.querySelectorAll('input[data-k]').forEach(function (i) {
      i.addEventListener('change', function () { var k = i.getAttribute('data-k'); set(k, i.checked); if (k === 'read' && i.checked) speak('Здравей! Аз ще ти чета задачите.'); });
    });
    d.querySelector('[data-preset]').addEventListener('click', function () { var a = local(); PRESET.forEach(function (k) { a[k] = 1; }); if (G()) G().save(); apply(); sync(); });
    d.querySelector('[data-none]').addEventListener('click', function () { var a = local(); OPTS.forEach(function (o) { delete a[o.k]; }); if (G()) G().save(); apply(); sync(); stop(); });
    var tb = d.querySelector('[data-test]'); if (tb) tb.addEventListener('click', function () { speak('Седем плюс пет, равно на колко?'); });
    return d;
  }

  S.A11y = { OPTS: OPTS, PRESET: PRESET, on: on, locked: locked, any: any, count: count, set: set, apply: apply, modal: modal,
    speak: speak, stop: stop, hasVoice: hasVoice, canSpeak: !!synth, taskText: taskText, toChoices: toChoices, addDots: addDots, hint: hint, plain: plain, mathWords: mathWords };

  function boot() {
    apply();
    document.querySelectorAll('[data-a11y-open]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); modal(); }); });
    try { if (/[?&]a11y=1/.test(location.search)) setTimeout(modal, 300); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
