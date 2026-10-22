/* Сметко — точки, нива, значки, серии и прогрес.
   Всичко се пази локално в браузъра (localStorage), без лични данни.
   По-късно, с профилите за родители/учители, същите данни ще се синхронизират със сървъра. */
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

  var BADGES = [
    { id: 'first', icon: '🌱', name: 'Първи стъпки', desc: 'Първата вярно решена задача' },
    { id: 'speedy', icon: '⚡', name: 'Бързак', desc: '10 верни задачи за под 30 секунди' },
    { id: 'table', icon: '🧠', name: 'Майстор на таблицата', desc: '20 верни поред на умножение и деление' },
    { id: 'week', icon: '🏆', name: 'Седмичен шампион', desc: '7 поредни дни игра' },
    { id: 'combo10', icon: '🔥', name: 'Комбо звезда', desc: '10 верни отговора поред' },
    { id: 'c100', icon: '💯', name: 'Стотица', desc: '100 верни задачи общо' },
    { id: 'c1000', icon: '🎖️', name: 'Хилядник', desc: '1000 верни задачи общо' },
    { id: 'p1000', icon: '💰', name: 'Събирач на точки', desc: '1000 точки общо' },
    { id: 'explorer', icon: '🧭', name: 'Изследовател', desc: 'Изиграни и трите режима' },
    { id: 'perfect', icon: '⭐', name: 'Перфектна мисия', desc: '3 звезди в мисия' },
    { id: 'stars15', icon: '🌟', name: 'Звездобрец', desc: '15 звезди в Приключение' },
    { id: 'summit', icon: '🏔️', name: 'Покорител на върха', desc: 'Стигнат връх в Приключение' },
    { id: 'daily', icon: '🎯', name: 'Дневна цел', desc: 'Изпълнена дневна цел' },
    { id: 'practice50', icon: '💪', name: 'Упоритко', desc: '50 верни задачи в Тренировка' },
    { id: 'challenge', icon: '🥇', name: 'Предизвикател', desc: 'Изпълнено седмично предизвикателство' },
    { id: 'challenge5', icon: '👑', name: 'Шампион на седмиците', desc: '5 изпълнени седмични предизвикателства' }
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
      skills: {}, days: {}, challenge: {}
    };
  }

  var state;
  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
    var base = fresh();
    if (!state || typeof state !== 'object') state = base;
    for (var k in base) if (!(k in state)) state[k] = base[k];
    if (state.daily.date !== today()) state.daily = { date: today(), count: 0 };
    return state;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* частен режим */ } }

  function rank(points) {
    points = points === undefined ? state.points : points;
    var i = 0; while (i + 1 < RANKS.length && points >= RANKS[i + 1].min) i++;
    var next = RANKS[i + 1] || null;
    return { idx: i, level: i + 1, name: RANKS[i].name, min: RANKS[i].min, next: next,
      progress: next ? (points - RANKS[i].min) / (next.min - RANKS[i].min) : 1 };
  }

  /* Точки, нива и значки се печелят само с абонамент (активен код). Без код – игрите са безплатни, но без точки. */
  function earns() { var S = window.Smetko || {}; return !(S.config && S.config.paywall) || !!(S.hasAccess && S.hasAccess()); }
  function award(id, out) {
    if (!earns()) return;
    if (state.badges[id]) return;
    state.badges[id] = today();
    for (var i = 0; i < BADGES.length; i++) if (BADGES[i].id === id) out.push(BADGES[i]);
  }

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

      award('first', nb);
      if (session.combo >= 10) award('combo10', nb);
      if (state.correct >= 100) award('c100', nb);
      if (state.correct >= 1000) award('c1000', nb);
      if (state.tableStreak >= 20) award('table', nb);
      if (state.practiceCorrect >= 50) award('practice50', nb);
      if (state.streak.count >= 7) award('week', nb);
      if (state.daily.count >= state.dailyGoal) award('daily', nb);
      if (session.mode === 'quick' && session.correct >= 10 && (session.correctTimes[9] - session.start) <= 30000) award('speedy', nb);
    } else {
      session.combo = 0; session.wrong += 1;
      if (opts.table) state.tableStreak = 0;
    }
    if (!earns()) gained = 0;
    state.points += gained; session.points += gained;
    if (state.points >= 1000) award('p1000', nb);
    if (state.modes.quick && state.modes.adventure && state.modes.practice) award('explorer', nb);
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
    if (state.points >= 1000) award('p1000', nb);
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
    if (st === 3) award('perfect', nb);
    if (totalStars() >= 15) award('stars15', nb);
    if (st >= 1 && idx === total - 1) award('summit', nb);
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
    awardBadge: function (id) { var nb = []; award(id, nb); save(); return nb; },
    earns: earns, stars: stars, setStars: setStars, totalStars: totalStars, isUnlocked: isUnlocked,
    reset: reset, setSound: setSound, today: today,
    get session() { return session; }
  };
})();
