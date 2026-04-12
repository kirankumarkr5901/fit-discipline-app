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
  ];

  container.innerHTML = pages.map(p =>
    `<section id="page-${p.id}" class="page">${p.template()}</section>`
  ).join('');
}

/* ---- Navigation ---- */
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll(`.nav-link[data-page="${page}"]`).forEach(l => l.classList.add('active'));

  const pageTitles = {
    'home': '🏠 Home',
    'planner': '📋 Planner',
    'workout-tracker': '💪 Workout Tracker',
    'run-tracker': '🏃 Run Tracker',
    'habits': '✅ Habits & Discipline',
    'rewards': '🏆 Rewards'
  };
  document.title = (pageTitles[page] || 'Fit‑Discipline') + ' | Fit‑Discipline';

  switch (page) {
    case 'home':            refreshHome(); break;
    case 'planner':         refreshPlanner(); break;
    case 'workout-tracker': initWorkoutTracker(); break;
    case 'run-tracker':     initRunTracker(); break;
    case 'habits':          initHabits(); break;
    case 'rewards':         initRewards(); break;
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

function toggleUserDropdown() {
  document.getElementById('user-dropdown').classList.toggle('open');
}
