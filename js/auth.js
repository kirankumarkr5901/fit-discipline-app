/* ================================================
   AUTH.JS – Google Sign-In & Auth State
   ================================================ */

let currentUser = null;

/* ---- Sign In / Out ---- */
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => {
    console.error('Sign-in error:', err);
    alert('Sign-in failed. Please try again.');
  });
}

function signOutUser() {
  if (!confirm('Sign out of Fit-Discipline?')) return;
  auth.signOut();
}

/* ---- Auth State Listener ---- */
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    showLoadingScreen();
    await DB.loadFromFirestore(user.uid);
    startApp();
  } else {
    currentUser = null;
    DB.clearCache();
    showLoginPage();
  }
});

/* ---- UI State Switches ---- */
function showLoadingScreen() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('main-nav').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
  document.getElementById('app-container').innerHTML =
    '<div class="loading-screen"><div class="loading-spinner"></div><p>Loading your data…</p></div>';
}

function showLoginPage() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('main-nav').style.display = 'none';
  document.getElementById('app-container').style.display = 'none';
  document.getElementById('app-container').innerHTML = '';
}

function startApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('main-nav').style.display = 'flex';
  document.getElementById('app-container').style.display = 'block';

  /* Set user avatar + name in nav */
  const avatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  if (currentUser.photoURL) {
    avatar.src = currentUser.photoURL;
    avatar.style.display = 'block';
  }
  if (userName) {
    userName.textContent = currentUser.displayName || currentUser.email || '';
  }

  applyDarkMode();
  buildPages();
  navigateTo('home');
  setTimeout(checkStrictPenalties, 1000);
  scheduleHabitReminder();
  scheduleGoalReminder();
  initPullToRefresh();
}
