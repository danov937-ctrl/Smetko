/* Сметко — текстови задачи със стъпки: детето минава по петте стъпки, преди да сметне.
   Задачите идват от същия генератор; тук се добавя само редът на работа. */
(function () {
  'use strict';
  var S = window.Smetko = window.Smetko || {};
  var root = document.getElementById('wt');
  if (!root) return;

  var qEl = document.getElementById('wt-q'), stepsEl = document.getElementById('wt-steps'),
      ans = document.getElementById('wt-ans'), fb = document.getElementById('wt-fb'),
      gSel = document.getElementById('wt-grade'), hintBtn = document.getElementById('wt-hint');
  var task = null, step = 0;

  var STEPS = [
    ['Прочети на глас, два пъти', 'Първия път – за какво се разказва. Втория – какво точно се случва с числата.'],
    ['Намери въпроса', 'Кое изречение пита нещо? Подчертай го с пръст. Отговорът трябва да отговаря точно на него.'],
    ['Запиши данните', 'Кои числа са дадени и какво значи всяко от тях? Нарисувай, ако помага.'],
    ['Реши и запиши действието', 'Станаха ли повече, или по-малко? Събиране, изваждане, умножение или деление?'],
    ['Отговори и провери', 'Отговорът с мерна единица. После – възможен ли е изобщо този отговор?']
  ];

  function E() { return S.MathEngine; }

  /* всички текстови задачи за избрания клас – умения, чието име започва с „word“ */
  function wordSkills(g) {
    var out = [], ts = (E().GRADES[g] || {}).topics || [];
    ts.forEach(function (t) {
      t.skills.forEach(function (s) { if (/^word/.test(s[0]) && out.indexOf(s[0]) < 0) out.push(s[0]); });
    });
    return out;
  }

  function newTask() {
    var g = +gSel.value, sk = wordSkills(g);
    task = sk.length ? E().generateSkill(g, sk[Math.floor(Math.random() * sk.length)], 2) : E().generate(g, null, 2);
    step = 0;
    qEl.innerHTML = String(task.q).replace(/<br>[\s\S]*$/, '');
    ans.value = '';
    fb.textContent = ''; fb.className = 'wt-fb';
    hintBtn.disabled = false;
    drawSteps();
  }

  function drawSteps() {
    stepsEl.innerHTML = STEPS.map(function (s, i) {
      var open = i < step;
      return '<li class="' + (open ? 'on' : '') + '"><b>' + (i + 1) + '. ' + s[0] + '</b>' +
        (open ? '<span>' + s[1] + '</span>' : '') + '</li>';
    }).join('');
  }

  function hint() {
    if (step < STEPS.length) { step++; drawSteps(); }
    if (step >= STEPS.length) {
      hintBtn.disabled = true;
      fb.className = 'wt-fb';
      fb.innerHTML = 'Действието е: <b>' + String(task.full).replace(/<[^>]+>/g, '') + '</b>';
    }
  }

  function check() {
    if (!task) return;
    var okNow = E().check(task, ans.value);
    fb.className = 'wt-fb ' + (okNow ? 'good' : 'bad');
    fb.innerHTML = okNow ? 'Браво! ' + String(task.full).replace(/<[^>]+>/g, '')
      : 'Не е това. Пробвай стъпките – първо кой е въпросът.';
    if (okNow) { step = STEPS.length; drawSteps(); hintBtn.disabled = true; }
  }

  document.getElementById('wt-check').addEventListener('click', check);
  document.getElementById('wt-new').addEventListener('click', newTask);
  hintBtn.addEventListener('click', hint);
  gSel.addEventListener('change', newTask);
  ans.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } });

  S.WordTask = { task: function () { return task; }, next: newTask };   // за проверките
  newTask();
})();
