/* ===============================================
   DATA.JS – In-memory cache + Firestore sync
   =============================================== */

const DB = {
  _cache: {},
  _syncTimeout: null,
  _userId: null,
  _loaded: false,       // true only after successful Firestore load
  _loadedKeys: null,    // snapshot of keys loaded from Firestore (to detect empty-overwrite)

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
    if (!this._loaded) {
      console.warn('DB._set blocked – data not loaded yet');
      return;
    }
    this._cache[key] = value;
    this._scheduleSync();
  },

  _scheduleSync() {
    clearTimeout(this._syncTimeout);
    this._syncTimeout = setTimeout(() => this._syncToFirestore(), 800);
  },

  async _syncToFirestore() {
    if (!this._userId || !this._loaded) return;

    // Safety: never sync if cache has fewer keys than what was loaded
    const currentKeys = Object.keys(this._cache).length;
    if (this._loadedKeys > 0 && currentKeys < this._loadedKeys) {
      console.error('Sync BLOCKED – cache has fewer keys than loaded (' + currentKeys + ' vs ' + this._loadedKeys + '). Refusing to overwrite.');
      return;
    }

    try {
      // merge:true ensures we only add/update fields, never delete them
      await firestore.collection('users').doc(this._userId).set(this._cache, { merge: true });
      this._loadedKeys = currentKeys;
      this._saveLocalBackup();
    } catch (err) {
      console.error('Firestore sync error:', err);
    }
  },

  async loadFromFirestore(userId) {
    this._userId = userId;
    this._loaded = false;
    this._loadedKeys = null;
    try {
      const doc = await firestore.collection('users').doc(userId).get();
      if (doc.exists) {
        this._cache = doc.data();
        this._loadedKeys = Object.keys(this._cache).length;
      } else {
        // Brand new user – try restoring from local backup
        const backup = this._getLocalBackup(userId);
        if (backup && Object.keys(backup).length > 0) {
          console.info('No Firestore doc found – restoring from local backup');
          this._cache = backup;
          this._loadedKeys = 0; // was empty remotely
        } else {
          this._cache = {};
          this._loadedKeys = 0;
        }
      }
      // Save a local backup every time we successfully load
      this._loaded = true;
      this._saveLocalBackup();
    } catch (err) {
      console.error('Firestore load error:', err);
      // Load failed – try local backup so the app still works
      const backup = this._getLocalBackup(userId);
      if (backup && Object.keys(backup).length > 0) {
        console.info('Firestore load failed – using local backup');
        this._cache = backup;
        this._loaded = true;
        this._loadedKeys = Object.keys(backup).length;
      } else {
        // No backup available – keep cache empty but do NOT allow writes
        this._cache = {};
        this._loaded = false;
        console.error('No local backup available. Writes are blocked until Firestore loads.');
      }
    }
  },

  clearCache() {
    clearTimeout(this._syncTimeout);
    this._cache = {};
    this._userId = null;
    this._loaded = false;
    this._loadedKeys = null;
  },

  /* ---- Local backup (localStorage) ---- */
  _saveLocalBackup() {
    if (!this._userId) return;
    try {
      const data = JSON.stringify(this._cache);
      localStorage.setItem('fd_backup_' + this._userId, data);
      localStorage.setItem('fd_backup_time_' + this._userId, new Date().toISOString());
    } catch (e) {
      // localStorage might be full – not critical
      console.warn('Local backup save failed:', e);
    }
  },

  _getLocalBackup(userId) {
    try {
      const raw = localStorage.getItem('fd_backup_' + userId);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
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
  getPenaltiesMissed()        { return this._get('penaltiesMissed', {}); },
  savePenaltiesMissed(m)      { this._set('penaltiesMissed', m); },
  getDailyDedicationPoints()  { return this._get('dailyDedicationPoints', 10); },
  saveDailyDedicationPoints(v){ this._set('dailyDedicationPoints', v); },
  getBodyMetrics()         { return this._get('bodyMetrics', []); },
  saveBodyMetrics(b)       { this._set('bodyMetrics', b); },
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
  if (dayNum === 'optional') return '⭐ Optional';
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
  if (dp < 0) dp = 0;
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

  // Update run points display if visible
  const runPointsEl = document.getElementById('run-total-points');
  if (runPointsEl) {
    const pointsLog = DB.getPointsLog();
    const runPoints = pointsLog
      .filter(p => p.description && (
        p.description.startsWith('Running:') ||
        p.description.includes('PR pace') ||
        p.description.includes('category') ||
        p.description.startsWith('First run') ||
        p.description.startsWith('Run deleted') ||
        p.description.startsWith('Run adjust') ||
        p.description.startsWith('Run points reset')
      ))
      .reduce((sum, p) => sum + (p.points || 0), 0);
    runPointsEl.textContent = Math.max(0, runPoints);
  }
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

function getHabitMaxStreak(habitId) {
  const completions = DB.getHabitCompletions();
  const dates = Object.keys(completions).filter(d => completions[d][habitId]).sort();
  if (dates.length === 0) return 0;

  let maxStreak = 1, current = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + 'T00:00:00');
    const curr = new Date(dates[i] + 'T00:00:00');
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      if (current > maxStreak) maxStreak = current;
    } else {
      current = 1;
    }
  }
  return maxStreak;
}

function getActiveStreaksCount() {
  const habits = DB.getHabits();
  let count = 0;
  for (const h of habits) {
    if (getHabitStreak(h.id) >= 3) count++;
  }
  return count;
}
