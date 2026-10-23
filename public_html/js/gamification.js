/* Сметко — точки, нива, значки, серии и прогрес.
   Пази се локално в браузъра (localStorage). С акаунт за родител прогресът на детския профил
   се записва и на сървъра (js/account.js чрез Smetko.onSave) и детето продължава от всяко устройство. */
(function () {
  'use strict';
  var KEY = 'smetko.v1';

  var RANKS = [
    { name: 'Новак', min: 0 },
    { name: 'Смятач', min: 150 },
    { name: 'Числознайко', min: 400 },
    { name: 'Бързо умче', min: 800 },
    { name: 'Майстор на сметките', min: 1500 },
    { name: 'Звезда на числата', min: 2500 },
    { name: 'Математик', min: 4000 },
    { name: 'Голям математик', min: 6000 },
    { name: 'Мъдрец', min: 9000 },
    { name: 'Професор Сметко', min: 13000 }
  ];

  /* Значки: група, икона, име (казва какво е постигнато) и как се печели.
     test(st) връща true, когато значката е заслужена – проверява се след всеки отговор, мисия и домашна. */
  function sum(o, f) { var n = 0; for (var k in o || {}) for (var i in o[k]) if (f(o[k][i])) n++; return n; }
  function stars(st) { var n = 0; for (var k in st.adventure || {}) for (var i in st.adventure[k]) n += st.adventure[k][i]; return n; }
  function missions(st) { return sum(st.adventure, function (v) { return v >= 1; }); }
  function perfects(st) { return sum(st.adventure, function (v) { return v >= 3; }); }
  function chapter(st) { for (var k in st.adventure || {}) { var n = 0; for (var i = 0; i < 16; i++) if ((st.adventure[k][i] || 0) >= 1) n++; if (n >= 16) return true; } return false; }
  function quickBest(st) { var m = 0; for (var k in st.best || {}) if (k.indexOf('quick-') === 0) m = Math.max(m, st.best[k]); return m; }
  function topics(st, min) { var n = 0; for (var k in st.skills || {}) if (st.skills[k][1] >= min) n++; return n; }
  function mastered(st) { var n = 0; for (var k in st.skills || {}) { var x = st.skills[k]; if (x[1] >= 30 && x[0] / x[1] >= 0.9) n++; } return n; }
  function cnt(st, k) { return (st.counters || {})[k] || 0; }
  var GROUPS = [['start', '🌱 Първи стъпки'], ['solve', '✏️ Решени задачи'], ['sharp', '🎯 Точност и скорост'], ['days', '📅 Постоянство'], ['adv', '🗺️ Приключение'], ['learn', '🧩 Знания по теми'], ['class', '🎒 Домашни и предизвикателства'], ['points', '💰 Точки']];
  var BADGES = [
    { id: 'first', g: 'start', icon: '🌱', name: 'Първи стъпки', desc: 'Първата вярно решена задача', test: function (st) { return st.correct >= 1; } },
    { id: 'c10', g: 'start', icon: '🐣', name: 'Добро начало', desc: '10 верни задачи', test: function (st) { return st.correct >= 10; } },
    { id: 'explorer', g: 'start', icon: '🧭', name: 'Изследовател', desc: 'Изиграни и трите режима: Приключение, Бързо сметни и Тренировка', test: function (st) { return st.modes.quick && st.modes.adventure && st.modes.practice; } },
    { id: 'grades4', g: 'start', icon: '🎒', name: 'Във всички класове', desc: 'Игра в 1., 2., 3. и 4. клас', test: function (st) { var g = (st.counters || {}).grades || {}; return g[1] && g[2] && g[3] && g[4]; } },
    { id: 'c50', g: 'solve', icon: '✏️', name: 'Петдесет верни', desc: '50 верни задачи общо', test: function (st) { return st.correct >= 50; } },
    { id: 'c100', g: 'solve', icon: '💯', name: 'Стотица', desc: '100 верни задачи общо', test: function (st) { return st.correct >= 100; } },
    { id: 'c250', g: 'solve', icon: '📗', name: 'Пълна тетрадка', desc: '250 верни задачи общо', test: function (st) { return st.correct >= 250; } },
    { id: 'c500', g: 'solve', icon: '📚', name: 'Цял учебник', desc: '500 верни задачи общо', test: function (st) { return st.correct >= 500; } },
    { id: 'c1000', g: 'solve', icon: '🎖️', name: 'Хилядник', desc: '1000 верни задачи общо', test: function (st) { return st.correct >= 1000; } },
    { id: 'c2500', g: 'solve', icon: '🏅', name: 'Неуморим математик', desc: '2500 верни задачи общо', test: function (st) { return st.correct >= 2500; } },
    { id: 'c5000', g: 'solve', icon: '🏆', name: 'Легенда на сметките', desc: '5000 верни задачи общо', test: function (st) { return st.correct >= 5000; } },
    { id: 'combo10', g: 'sharp', icon: '🔥', name: 'Десет поред', desc: '10 верни отговора един след друг', test: function (st) { return st.maxCombo >= 10; } },
    { id: 'combo20', g: 'sharp', icon: '🎯', name: 'Снайперист', desc: '20 верни отговора един след друг', test: function (st) { return st.maxCombo >= 20; } },
    { id: 'combo30', g: 'sharp', icon: '☄️', name: 'Без нито една грешка', desc: '30 верни отговора един след друг', test: function (st) { return st.maxCombo >= 30; } },
    { id: 'precise', g: 'sharp', icon: '⏱️', name: 'Точен като часовник', desc: 'Поне 90% точност след 200 задачи', test: function (st) { return st.answered >= 200 && st.correct / st.answered >= 0.9; } },
    { id: 'table', g: 'sharp', icon: '🧠', name: 'Майстор на таблицата', desc: '20 верни поред на умножение и деление', test: function (st) { return st.tableStreak >= 20; } },
    { id: 'speedy', g: 'sharp', icon: '⚡', name: 'Бързак', desc: '10 верни за под 30 секунди в „Бързо сметни“', test: null },
    { id: 'quick15', g: 'sharp', icon: '🚀', name: 'Ракета', desc: '15 верни за 60 секунди в „Бързо сметни“', test: function (st) { return quickBest(st) >= 15; } },
    { id: 'quick25', g: 'sharp', icon: '🌠', name: 'Светкавица', desc: '25 верни за 60 секунди в „Бързо сметни“', test: function (st) { return quickBest(st) >= 25; } },
    { id: 'streak3', g: 'days', icon: '🌤️', name: 'Три дни подред', desc: 'Игра 3 поредни дни', test: function (st) { return st.streak.count >= 3; } },
    { id: 'week', g: 'days', icon: '🗓️', name: 'Цяла седмица', desc: 'Игра 7 поредни дни', test: function (st) { return st.streak.count >= 7; } },
    { id: 'streak14', g: 'days', icon: '🔆', name: 'Две седмици без прекъсване', desc: 'Игра 14 поредни дни', test: function (st) { return st.streak.count >= 14; } },
    { id: 'streak30', g: 'days', icon: '🌈', name: 'Месец с математика', desc: 'Игра 30 поредни дни', test: function (st) { return st.streak.count >= 30; } },
    { id: 'days20', g: 'days', icon: '🤝', name: 'Верен приятел на Сметко', desc: 'Игра в 20 различни дни', test: function (st) { return Object.keys(st.days || {}).length >= 20; } },
    { id: 'daily', g: 'days', icon: '✅', name: 'Дневна цел', desc: 'Изпълнена дневна цел', test: function (st) { return cnt(st, 'goals') >= 1 || st.daily.count >= st.dailyGoal; } },
    { id: 'daily10', g: 'days', icon: '📈', name: 'Десет дневни цели', desc: 'Дневната цел е изпълнена в 10 различни дни', test: function (st) { return cnt(st, 'goals') >= 10; } },
    { id: 'perfect', g: 'adv', icon: '⭐', name: 'Перфектна мисия', desc: '3 звезди в мисия', test: function (st) { return perfects(st) >= 1; } },
    { id: 'perfect10', g: 'adv', icon: '🌟', name: 'Перфекционист', desc: '3 звезди в 10 мисии', test: function (st) { return perfects(st) >= 10; } },
    { id: 'perfect25', g: 'adv', icon: '💎', name: 'Диамантен ученик', desc: '3 звезди в 25 мисии', test: function (st) { return perfects(st) >= 25; } },
    { id: 'missions10', g: 'adv', icon: '🗺️', name: 'Пътешественик', desc: '10 минати мисии', test: function (st) { return missions(st) >= 10; } },
    { id: 'chapter', g: 'adv', icon: '📖', name: 'Цяла глава', desc: 'Минати всички 16 мисии от една глава на картата', test: chapter },
    { id: 'missions50', g: 'adv', icon: '🧗', name: 'Катерач', desc: '50 минати мисии', test: function (st) { return missions(st) >= 50; } },
    { id: 'stars15', g: 'adv', icon: '✨', name: 'Звездобрец', desc: '15 звезди в Приключение', test: function (st) { return stars(st) >= 15; } },
    { id: 'stars50', g: 'adv', icon: '🌙', name: 'Звездно небе', desc: '50 звезди в Приключение', test: function (st) { return stars(st) >= 50; } },
    { id: 'stars150', g: 'adv', icon: '🌌', name: 'Млечен път', desc: '150 звезди в Приключение', test: function (st) { return stars(st) >= 150; } },
    { id: 'summit', g: 'adv', icon: '🏔️', name: 'Покорител на върха', desc: 'Мината последната мисия от учебника', test: null },
    { id: 'practice50', g: 'learn', icon: '💪', name: 'Упоритко', desc: '50 верни задачи в Тренировка', test: function (st) { return st.practiceCorrect >= 50; } },
    { id: 'practice200', g: 'learn', icon: '🏋️', name: 'Желязна воля', desc: '200 верни задачи в Тренировка', test: function (st) { return st.practiceCorrect >= 200; } },
    { id: 'topics5', g: 'learn', icon: '🧩', name: 'Многостранен', desc: 'Поне по 10 задачи от 5 различни вида', test: function (st) { return topics(st, 10) >= 5; } },
    { id: 'topics15', g: 'learn', icon: '🎓', name: 'Всезнайко', desc: 'Поне по 10 задачи от 15 различни вида', test: function (st) { return topics(st, 10) >= 15; } },
    { id: 'master1', g: 'learn', icon: '🥋', name: 'Майстор на тема', desc: '90% точност в един вид задачи (поне 30 задачи)', test: function (st) { return mastered(st) >= 1; } },
    { id: 'master5', g: 'learn', icon: '🧙', name: 'Голям майстор', desc: '90% точност в 5 вида задачи (по поне 30 задачи)', test: function (st) { return mastered(st) >= 5; } },
    { id: 'hw1', g: 'class', icon: '📝', name: 'Първа домашна', desc: 'Предадена домашна от учителя', test: function (st) { return cnt(st, 'hw') >= 1; } },
    { id: 'hwPerfect', g: 'class', icon: '🌟', name: 'Домашна без грешка', desc: 'Всички задачи от домашната – верни', test: function (st) { return cnt(st, 'hwPerfect') >= 1; } },
    { id: 'hw10', g: 'class', icon: '🎒', name: 'Отличник по домашни', desc: '10 предадени домашни', test: function (st) { return cnt(st, 'hw') >= 10; } },
    { id: 'challenge', g: 'class', icon: '🥇', name: 'Предизвикател', desc: 'Изпълнено седмично предизвикателство', test: function (st) { return ((st.challenge || {}).total || 0) >= 1; } },
    { id: 'challenge5', g: 'class', icon: '👑', name: 'Шампион на седмиците', desc: '5 изпълнени седмични предизвикателства', test: function (st) { return ((st.challenge || {}).total || 0) >= 5; } },
    { id: 'challenge10', g: 'class', icon: '🦸', name: 'Легенда на предизвикателствата', desc: '10 изпълнени седмични предизвикателства', test: function (st) { return ((st.challenge || {}).total || 0) >= 10; } },
    { id: 'p1000', g: 'points', icon: '💰', name: 'Събирач на точки', desc: '1000 точки общо', test: function (st) { return st.points >= 1000; } },
    { id: 'p5000', g: 'points', icon: '🪙', name: 'Пълна касичка', desc: '5000 точки общо', test: function (st) { return st.points >= 5000; } },
    { id: 'p20000', g: 'points', icon: '💎', name: 'Съкровищница', desc: '20 000 точки общо', test: function (st) { return st.points >= 20000; } }
  ];

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 864e5); }

  function fresh() {
    return {
      v: 1, createdAt: today(), points: 0, correct: 0, answered: 0,
      streak: { count: 0, last: null }, daily: { date: today(), count: 0 }, dailyGoal: 20,
      badges: {}, best: {}, adventure: {}, modes: {}, practiceCorrect: 0, tableStreak: 0, maxCombo: 0,
      lastGrade: null, books: {}, settings: { sound: true },
      skills: {}, days: {}, challenge: {}, counters: {}
    };
  }

  var state;
  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
    return normalize();
  }
  function normalize() {
    var base = fresh();
    if (!state || typeof state !== 'object') state = base;
    for (var k in base) if (!(k in state)) state[k] = base[k];
    if (state.daily.date !== today()) state.daily = { date: today(), count: 0 };
    return state;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* частен режим */ }
    var S = window.Smetko; if (S && S.onSave) try { S.onSave(); } catch (e) {}
  }
  /* смяна на целия прогрес (избран детски профил / изход от акаунта) */
  function replace(obj) { state = obj && typeof obj === 'object' ? obj : null; normalize(); session = null; save(); }

  function rank(points) {
    points = points === undefined ? state.points : points;
    var i = 0; while (i + 1 < RANKS.length && points >= RANKS[i + 1].min) i++;
    var next = RANKS[i + 1] || null;
    return { idx: i, level: i + 1, name: RANKS[i].name, min: RANKS[i].min, next: next,
      progress: next ? (points - RANKS[i].min) / (next.min - RANKS[i].min) : 1 };
  }

  /* Точки, нива и значки се печелят само с абонамент. Без абонамент игрите са безплатни, но без точки. */
  function earns() { var S = window.Smetko || {}; return !(S.config && S.config.paywall) || !!(S.hasAccess && S.hasAccess()); }
  function award(id, out) {
    if (!earns()) return;
    if (state.badges[id]) return;
    state.badges[id] = today();
    for (var i = 0; i < BADGES.length; i++) if (BADGES[i].id === id) out.push(BADGES[i]);
  }
  function checkAll(out) { // всички значки, които вече са заслужени
    if (!earns()) return out;
    for (var i = 0; i < BADGES.length; i++) { var b = BADGES[i]; if (b.test && !state.badges[b.id] && b.test(state)) award(b.id, out); }
    return out;
  }
  function counter(k, n) { state.counters = state.counters || {}; state.counters[k] = (state.counters[k] || 0) + (n || 1); }

  function touchStreak() {
    var t = today(), s = state.streak;
    if (s.last === t) return;
    if (s.last && daysBetween(s.last, t) === 1) s.count += 1; else s.count = 1;
    s.last = t;
  }

  // ---------- сесия ----------
  var session = null;
  function startSession(mode, grade, topic) {
    load();
    session = { mode: mode, grade: grade, topic: topic, start: Date.now(), combo: 0, correct: 0, wrong: 0, points: 0, correctTimes: [], newBadges: [] };
    state.modes[mode] = true; state.lastGrade = grade;
    state.counters = state.counters || {}; state.counters.grades = state.counters.grades || {}; state.counters.grades[grade] = 1;
    save();
    return session;
  }

  /* Регистрира отговор. Връща { gained, combo, mult, newBadges } */
  function answer(opts) {
    if (!session) startSession(opts.mode || 'practice', opts.grade || 1, opts.topic);
    var nb = [], gained = 0, mult = 1, rankBefore = rank().idx;
    state.answered += 1;
    // статистика за отчетите: по вид задача и по дни
    var d0 = today(), dd = state.days[d0] = state.days[d0] || [0, 0]; dd[0]++; if (opts.correct) dd[1]++;
    if (opts.skill) { var sk = state.skills[opts.skill] = state.skills[opts.skill] || [0, 0]; sk[1]++; if (opts.correct) sk[0]++; }
    var dk = Object.keys(state.days); if (dk.length > 120) { dk.sort(); dk.slice(0, dk.length - 120).forEach(function (k) { delete state.days[k]; }); }
    if (opts.correct) {
      session.combo += 1; session.correct += 1; session.correctTimes.push(Date.now());
      state.correct += 1;
      mult = session.combo >= 10 ? 3 : session.combo >= 5 ? 2 : 1;
      gained = 10 * mult;
      if (session.mode === 'quick' && opts.ms !== undefined && opts.ms < 3000) gained += 5;
      if (session.mode === 'practice') state.practiceCorrect += 1;
      if (opts.table) state.tableStreak += 1;
      state.maxCombo = Math.max(state.maxCombo, session.combo);
      state.daily.count += 1;
      touchStreak();

      if (state.daily.count === state.dailyGoal) counter('goals');
      if (session.mode === 'quick' && session.correct >= 10 && (session.correctTimes[9] - session.start) <= 30000) award('speedy', nb);
    } else {
      session.combo = 0; session.wrong += 1;
      if (opts.table) state.tableStreak = 0;
    }
    if (!earns()) gained = 0;
    state.points += gained; session.points += gained;
    checkAll(nb);
    session.newBadges = session.newBadges.concat(nb);
    save();
    return { gained: gained, combo: session.combo, mult: mult, newBadges: nb, rankUp: rank().idx > rankBefore ? rank() : null };
  }

  function addBonus(points) { if (!earns()) return; state.points += points; if (session) session.points += points; save(); }

  function endSession() {
    if (!session) return null;
    var s = session, key, nb = [];
    s.duration = Date.now() - s.start;
    if (s.mode === 'quick') {
      key = 'quick-' + s.grade + '-' + (s.topic || 'mix');
      s.prevBest = state.best[key] || 0;
      s.isRecord = s.correct > s.prevBest;
      if (s.isRecord) state.best[key] = s.correct;
    }
    checkAll(nb);
    s.newBadges = s.newBadges.concat(nb);
    save();
    session = null;
    return s;
  }

  // ---------- Приключение ----------
  function stars(grade) { return state.adventure[grade] || {}; }
  function setStars(grade, idx, st, total) {
    var nb = [];
    var g = state.adventure[grade] = state.adventure[grade] || {};
    if (!g[idx] || st > g[idx]) g[idx] = st;
    if (st >= 1 && idx === total - 1) award('summit', nb);
    checkAll(nb);
    save();
    return nb;
  }
  function totalStars() {
    var t = 0;
    for (var g in state.adventure) for (var i in state.adventure[g]) t += state.adventure[g][i];
    return t;
  }
  function isUnlocked(grade, idx) { return idx === 0 || (stars(grade)[idx - 1] || 0) >= 1; }

  function reset() { state = fresh(); save(); }
  function setSound(on) { state.settings.sound = !!on; save(); }

  load();
  window.Smetko = window.Smetko || {};
  window.Smetko.Game = {
    get state() { return state; }, load: load, save: save, rank: rank, RANKS: RANKS, BADGES: BADGES,
    startSession: startSession, answer: answer, addBonus: addBonus, endSession: endSession,
    awardBadge: function (id) { var nb = []; award(id, nb); checkAll(nb); save(); return nb; },
    event: function (k, n) { var nb = []; counter(k, n); checkAll(nb); save(); return nb; }, check: function () { var nb = checkAll([]); if (nb.length) save(); return nb; }, GROUPS: GROUPS,
    earns: earns, stars: stars, setStars: setStars, totalStars: totalStars, isUnlocked: isUnlocked,
    reset: reset, replace: replace, fresh: fresh, setSound: setSound, today: today,
    get session() { return session; }
  };
})();
