/* ===============================================
   APP.JS – Navigation, Dark Mode, Toast, Init
   Assembles page templates from each module
   =============================================== */

/* ---- PWA Install Prompt ---- */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'inline-flex';
  const btnLogin = document.getElementById('pwa-install-btn-login');
  if (btnLogin) btnLogin.style.display = 'inline-block';
});

function installPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(choice => {
    if (choice.outcome === 'accepted') {
      showToast('App installed! 🎉', 'success');
    }
    deferredInstallPrompt = null;
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'none';
  });
}

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'none';
  const btnLogin = document.getElementById('pwa-install-btn-login');
  if (btnLogin) btnLogin.style.display = 'none';
});

/* ---- Build Pages from Templates ---- */
function buildPages() {
  const container = document.getElementById('app-container');
  const pages = [
    { id: 'home',            template: getHomeTemplate },
    { id: 'planner',         template: getPlannerTemplate },
    { id: 'workout-tracker', template: getWorkoutTrackerTemplate },
    { id: 'run-tracker',     template: getRunTrackerTemplate },
    { id: 'habits',          template: getHabitsTemplate },
    { id: 'rewards',         template: getRewardsTemplate },
    { id: 'body-metrics',    template: getBodyMetricsTemplate },
    { id: 'goals',            template: getGoalsTemplate },
  ];

  container.innerHTML = pages.map(p =>
    `<section id="page-${p.id}" class="page">${p.template()}</section>`
  ).join('');
}

/* ---- Navigation ---- */
function navigateTo(page) {
  const currentActive = document.querySelector('.page.active');
  const nextPage = document.getElementById('page-' + page);

  if (currentActive && currentActive !== nextPage) {
    currentActive.classList.add('page-exit');
    currentActive.addEventListener('animationend', () => {
      currentActive.classList.remove('active', 'page-exit');
    }, { once: true });
  } else if (currentActive) {
    currentActive.classList.remove('active');
  }

  nextPage.classList.add('active', 'page-enter');
  nextPage.addEventListener('animationend', () => {
    nextPage.classList.remove('page-enter');
  }, { once: true });

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll(`.nav-link[data-page="${page}"]`).forEach(l => l.classList.add('active'));

  const pageTitles = {
    'home': '🏠 Home',
    'planner': '📋 Planner',
    'workout-tracker': '💪 Workout Tracker',
    'run-tracker': '🏃 Run Tracker',
    'habits': '✅ Habits & Discipline',
    'rewards': '🏆 Rewards',
    'body-metrics': '📏 Body Metrics',
    'goals': '🎯 Goals'
  };
  document.title = (pageTitles[page] || 'Fit‑Discipline') + ' | Fit‑Discipline';

  switch (page) {
    case 'home':            refreshHome(); break;
    case 'planner':         refreshPlanner(); break;
    case 'workout-tracker': initWorkoutTracker(); break;
    case 'run-tracker':     initRunTracker(); break;
    case 'habits':          initHabits(); break;
    case 'rewards':         initRewards(); break;
    case 'body-metrics':    initBodyMetrics(); break;
    case 'goals':           initGoals(); break;
  }
}

/* ---- Mobile Nav ---- */
function toggleMobileNav() {
  document.getElementById('mobile-nav-overlay').classList.toggle('open');
}

/* ---- Dark Mode ---- */
function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('dark-mode-toggle').textContent = '🌙';
    DB.saveDarkMode(false);
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('dark-mode-toggle').textContent = '☀️';
    DB.saveDarkMode(true);
  }
}

function applyDarkMode() {
  if (DB.isDarkMode()) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('dark-mode-toggle').textContent = '☀️';
  }
}

/* ---- Toast ---- */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ---- Modal helpers ---- */
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function openModal(id) {
  document.getElementById(id).style.display = 'flex';
}

/* ---- Init (triggered by auth.js after sign-in) ---- */
/* The old DOMContentLoaded is replaced by auth.onAuthStateChanged → startApp() in auth.js */

/* ---- Close user dropdown on outside click ---- */
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('user-dropdown');
  const profile = document.getElementById('user-profile');
  if (dropdown && profile && !profile.contains(e.target)) {
    dropdown.classList.remove('open');
  }
});

/* ---- 10 PM Daily Habit Reminder ---- */
let habitReminderTimer = null;

function scheduleHabitReminder() {
  // Request notification permission on first launch
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Clear any existing timer
  if (habitReminderTimer) clearTimeout(habitReminderTimer);

  function setNext() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(22, 0, 0, 0); // 10:00 PM
    if (now >= target) {
      target.setDate(target.getDate() + 1);
    }
    const ms = target - now;

    habitReminderTimer = setTimeout(() => {
      fireHabitReminder();
      setNext(); // schedule the next one
    }, ms);
  }

  setNext();
}

function fireHabitReminder() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Check if habits are already all done
  const habits = DB.getHabits();
  const completions = DB.getHabitCompletions();
  const today = todayStr();
  const todayComp = completions[today] || {};
  const pending = habits.filter(h => !todayComp[h.id]);

  if (pending.length === 0) return; // all done, no need to nag

  const n = new Notification('Fit-Discipline 🔥', {
    body: `You have ${pending.length} habit${pending.length > 1 ? 's' : ''} left to check off today!`,
    icon: 'assets/icon-192.svg',
    tag: 'habit-reminder',
    requireInteraction: true
  });

  n.onclick = () => {
    window.focus();
    navigateTo('habits');
    n.close();
  };
}

/* ---- 9 AM Daily Goal Reminder ---- */
let goalReminderTimer = null;

function scheduleGoalReminder() {
  if (goalReminderTimer) clearTimeout(goalReminderTimer);

  function setNext() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(9, 0, 0, 0); // 9:00 AM
    if (now >= target) {
      target.setDate(target.getDate() + 1);
    }
    const ms = target - now;

    goalReminderTimer = setTimeout(() => {
      fireGoalReminder();
      setNext();
    }, ms);
  }

  setNext();
}

function fireGoalReminder() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const goals = DB.getGoals();
  const today = new Date(todayStr() + 'T00:00:00');

  // Overdue target goals
  const overdue = goals.filter(g => g.type === 'targeted' && !g.completed && g.targetDate && new Date(g.targetDate + 'T00:00:00') < today);

  // Due soon (within 3 days)
  const threeDays = new Date(today);
  threeDays.setDate(threeDays.getDate() + 3);
  const dueSoon = goals.filter(g => g.type === 'targeted' && !g.completed && g.targetDate && (() => {
    const d = new Date(g.targetDate + 'T00:00:00');
    return d >= today && d <= threeDays;
  })());

  // Monthly goals not yet completed in current month
  const currentMonth = todayStr().substring(0, 7);
  const monthPending = goals.filter(g => g.type === 'monthly' && !g.completed && g.month === currentMonth);
  const isLastWeek = today.getDate() > 23;

  if (overdue.length === 0 && dueSoon.length === 0 && !(isLastWeek && monthPending.length > 0)) return;

  let body = '';
  if (overdue.length > 0) {
    body += `⚠️ ${overdue.length} overdue goal${overdue.length > 1 ? 's' : ''}! `;
  }
  if (dueSoon.length > 0) {
    body += `🏁 ${dueSoon.length} goal${dueSoon.length > 1 ? 's' : ''} due within 3 days. `;
  }
  if (isLastWeek && monthPending.length > 0) {
    body += `📅 ${monthPending.length} monthly goal${monthPending.length > 1 ? 's' : ''} still pending.`;
  }

  const n = new Notification('🎯 Goal Reminder', {
    body: body.trim(),
    icon: 'assets/icon-192.svg',
    tag: 'goal-reminder',
    requireInteraction: true
  });

  n.onclick = () => {
    window.focus();
    navigateTo('goals');
    n.close();
  };
}

function toggleUserDropdown() {
  document.getElementById('user-dropdown').classList.toggle('open');
}

/* ---- Pull-to-Refresh ---- */
let pullStartY = 0;
let pullDist = 0;
let pulling = false;

function initPullToRefresh() {
  const container = document.getElementById('app-container');

  container.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0 && document.querySelector('#page-home.active')) {
      pullStartY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    pullDist = e.touches[0].clientY - pullStartY;
    if (pullDist < 0) { pullDist = 0; return; }

    let indicator = document.getElementById('pull-refresh-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'pull-refresh-indicator';
      indicator.className = 'pull-refresh-indicator';
      container.prepend(indicator);
    }

    const progress = Math.min(pullDist / 80, 1);
    indicator.style.height = Math.min(pullDist * 0.5, 50) + 'px';
    indicator.style.opacity = progress;
    indicator.textContent = progress >= 1 ? '↻ Release to refresh' : '↓ Pull to refresh';
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (!pulling) return;
    pulling = false;
    const indicator = document.getElementById('pull-refresh-indicator');

    if (pullDist >= 80 && document.querySelector('#page-home.active')) {
      if (indicator) {
        indicator.textContent = '↻ Refreshing...';
        indicator.style.height = '40px';
      }
      setTimeout(() => {
        refreshHome();
        showToast('Refreshed!', 'success');
        if (indicator) indicator.remove();
      }, 400);
    } else {
      if (indicator) indicator.remove();
    }
    pullDist = 0;
  }, { passive: true });
}
