/* ===============================================
   DATA.JS – In-memory cache + Firestore sync
   =============================================== */

const DB = {
  _cache: {},
  _syncTimeout: null,
  _userId: null,

  _get(key, fallback) {
    if (!(key in this._cache)) {
      return typeof fallback === 'object' ? JSON.parse(JSON.stringify(fallback)) : fallback;
    }
    try {
      return JSON.parse(JSON.stringify(this._cache[key]));
    } catch {
      return fallback;
    }
  },

  _set(key, value) {
    this._cache[key] = value;
    this._scheduleSync();
  },

  _scheduleSync() {
    clearTimeout(this._syncTimeout);
    this._syncTimeout = setTimeout(() => this._syncToFirestore(), 800);
  },

  async _syncToFirestore() {
    if (!this._userId) return;
    try {
      await firestore.collection('users').doc(this._userId).set(this._cache);
    } catch (err) {
      console.error('Firestore sync error:', err);
    }
  },

  async loadFromFirestore(userId) {
    this._userId = userId;
    try {
      const doc = await firestore.collection('users').doc(userId).get();
      this._cache = doc.exists ? doc.data() : {};
    } catch (err) {
      console.error('Firestore load error:', err);
      this._cache = {};
    }
  },

  clearCache() {
    clearTimeout(this._syncTimeout);
    this._cache = {};
    this._userId = null;
  },

  getPlans()              { return this._get('plans', []); },
  savePlans(plans)        { this._set('plans', plans); },
  getHabits()             { return this._get('habits', []); },
  saveHabits(h)           { this._set('habits', h); },
  getWorkoutLogs()        { return this._get('workoutLogs', {}); },
  saveWorkoutLogs(l)      { this._set('workoutLogs', l); },
  getRunLogs()            { return this._get('runLogs', []); },
  saveRunLogs(l)          { this._set('runLogs', l); },
  getHabitCompletions()   { return this._get('habitCompletions', {}); },
  saveHabitCompletions(c) { this._set('habitCompletions', c); },
  getDP()                 { return this._get('disciplinePoints', 0); },
  saveDP(dp)              { this._set('disciplinePoints', dp); },
  getPointsLog()          { return this._get('pointsLog', []); },
  savePointsLog(l)        { this._set('pointsLog', l); },
  getActions()            { return this._get('actions', { positive: [], negative: [] }); },
  saveActions(a)          { this._set('actions', a); },
  getRewards()            { return this._get('rewards', []); },
  saveRewards(r)          { this._set('rewards', r); },
  getClaimedRewards()     { return this._get('claimedRewards', {}); },
  saveClaimedRewards(c)   { this._set('claimedRewards', c); },
  getActivity()           { return this._get('activity', []); },
  saveActivity(a)         { this._set('activity', a); },
  getPenaltiesChecked()   { return this._get('penaltiesChecked', {}); },
  savePenaltiesChecked(p) { this._set('penaltiesChecked', p); },
  getPenaltiesMissed()    { return this._get('penaltiesMissed', {}); },
  savePenaltiesMissed(m)  { this._set('penaltiesMissed', m); },
  /* Dark mode stays in localStorage – it's a device preference */
  isDarkMode() {
    try { return JSON.parse(localStorage.getItem('fd_darkMode')) || false; }
    catch { return false; }
  },
  saveDarkMode(v) {
    localStorage.setItem('fd_darkMode', JSON.stringify(v));
  },
};

/* ---- Helpers ---- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + String(weekNum).padStart(2, '0');
}

function getMonthKey(dateStr) {
  return dateStr.substring(0, 7);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---- Muscle group auto-detection ---- */
const MUSCLE_MAP = {
  chest: ['bench press', 'chest press', 'fly', 'flye', 'push up', 'pushup', 'dip', 'pec', 'cable cross', 'incline press', 'decline press', 'chest'],
  back: ['row', 'pull up', 'pullup', 'lat pull', 'deadlift', 'pulldown', 'chin up', 'back extension', 'barbell row', 'seated row', 'face pull', 'back'],
  legs: ['squat', 'leg press', 'lunge', 'hack squat', 'leg', 'bulgarian'],
  shoulders: ['shoulder press', 'overhead press', 'ohp', 'lateral raise', 'front raise', 'rear delt', 'military press', 'arnold', 'shrug', 'shoulder', 'delt'],
  biceps: ['bicep curl', 'hammer curl', 'preacher curl', 'concentration curl', 'barbell curl', 'bicep'],
  triceps: ['tricep pushdown', 'skull crusher', 'tricep extension', 'tricep dip', 'close grip bench', 'tricep kickback', 'tricep'],
  quads: ['quad', 'leg extension', 'front squat', 'sissy squat'],
  hamstrings: ['hamstring', 'leg curl', 'romanian deadlift', 'rdl', 'stiff leg', 'nordic curl'],
  calves: ['calf raise', 'calf press', 'calf', 'seated calf', 'standing calf'],
  core: ['crunch', 'plank', 'sit up', 'situp', 'ab', 'russian twist', 'leg raise', 'core', 'oblique'],
  glutes: ['hip thrust', 'glute bridge', 'glute', 'kickback', 'sumo'],
  'full-body': ['burpee', 'clean', 'snatch', 'thruster', 'kettlebell swing'],
  cardio: ['run', 'jog', 'cycling', 'bike', 'swim', 'elliptical', 'jump rope', 'skipping', 'treadmill', 'stair']
};

function detectMuscleGroup(name) {
  const lower = name.toLowerCase();
  for (const [group, keywords] of Object.entries(MUSCLE_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return group;
    }
  }
  return 'full-body';
}

/* ---- Plan day name helper ---- */
function getPlanDayName(plan, dayNum) {
  if (plan.dayNames && plan.dayNames[dayNum]) {
    return plan.dayNames[dayNum];
  }
  return 'Day ' + dayNum;
}

/* ---- Activity log ---- */
function addActivity(type, text) {
  const activities = DB.getActivity();
  activities.unshift({ type, text, time: new Date().toISOString() });
  if (activities.length > 50) activities.length = 50;
  DB.saveActivity(activities);
}

/* ---- Discipline Points ---- */
function addDisciplinePoints(amount, description) {
  let dp = DB.getDP();
  dp += amount;
  DB.saveDP(dp);

  const log = DB.getPointsLog();
  log.unshift({ date: new Date().toISOString(), description, points: amount });
  if (log.length > 200) log.length = 200;
  DB.savePointsLog(log);

  updateDPDisplays();
}

function updateDPDisplays() {
  const dp = DB.getDP();
  document.querySelectorAll('#home-total-dp, #habits-total-dp, #rewards-total-dp')
    .forEach(el => { if (el) el.textContent = dp; });
}

/* ---- Streak Calculation ---- */
function getHabitStreak(habitId) {
  const completions = DB.getHabitCompletions();
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().split('T')[0];
    if (completions[key] && completions[key][habitId]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getActiveStreaksCount() {
  const habits = DB.getHabits();
  let count = 0;
  for (const h of habits) {
    if (getHabitStreak(h.id) >= 3) count++;
  }
  return count;
}
