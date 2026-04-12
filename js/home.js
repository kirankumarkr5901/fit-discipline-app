/* ===============================================
   HOME.JS – Home Page Template & Logic
   =============================================== */

function getHomeTemplate() {
  return `
    <div class="hero">
      <h1>Welcome to <span class="highlight">Fit‑Disciple</span></h1>
      <p class="hero-sub">Your discipline is your superpower. Plan workouts, track progress, build habits, and earn rewards — every single day.</p>
    </div>

    <div class="dashboard-stats">
      <div class="stat-card accent-blue" onclick="navigateTo('habits')">
        <div class="stat-icon">⚡</div>
        <div class="stat-value" id="home-total-dp">0</div>
        <div class="stat-label">Discipline Points</div>
      </div>
      <div class="stat-card accent-green" onclick="navigateTo('habits')">
        <div class="stat-icon">🔥</div>
        <div class="stat-value" id="home-active-streaks">0</div>
        <div class="stat-label">Active Streaks</div>
      </div>
      <div class="stat-card accent-orange" onclick="navigateTo('workout-tracker')">
        <div class="stat-icon">💪</div>
        <div class="stat-value" id="home-today-workouts">0</div>
        <div class="stat-label">Today's Workouts</div>
      </div>
      <div class="stat-card accent-purple" onclick="navigateTo('habits')">
        <div class="stat-icon">✅</div>
        <div class="stat-value" id="home-today-habits">0/0</div>
        <div class="stat-label">Today's Habits</div>
      </div>
    </div>

    <h2 class="section-title">Quick Access</h2>
    <div class="shortcut-grid">
      <div class="shortcut-card" onclick="navigateTo('planner')">
        <div class="shortcut-icon">📋</div>
        <h3>Planner</h3>
        <p>Create workout plans and manage habits</p>
      </div>
      <div class="shortcut-card" onclick="navigateTo('workout-tracker')">
        <div class="shortcut-icon">💪</div>
        <h3>Workout Tracker</h3>
        <p>Log workouts and track your PRs</p>
      </div>
      <div class="shortcut-card" onclick="navigateTo('run-tracker')">
        <div class="shortcut-icon">🏃</div>
        <h3>Run Tracker</h3>
        <p>Track runs, pace, and distance</p>
      </div>
      <div class="shortcut-card" onclick="navigateTo('rewards')">
        <div class="shortcut-icon">🏆</div>
        <h3>Rewards</h3>
        <p>Claim rewards with discipline points</p>
      </div>
    </div>

    <div class="home-recent">
      <h2 class="section-title">Recent Activity</h2>
      <div id="home-recent-activity" class="recent-activity-list">
        <p class="empty-state">No recent activity yet. Start by creating a workout plan!</p>
      </div>
    </div>

    <footer class="dev-footer">
      Developed by <strong>Kiran K R</strong> · <a href="mailto:kirankumarkr5901@gmail.com">kirankumarkr5901@gmail.com</a>
    </footer>`;
}

function refreshHome() {
  updateDPDisplays();
  document.getElementById('home-active-streaks').textContent = getActiveStreaksCount();

  // Today's workouts
  const logs = DB.getWorkoutLogs();
  const today = todayStr();
  let workoutCount = 0;
  if (logs[today]) {
    for (const planId of Object.keys(logs[today])) {
      workoutCount += Object.keys(logs[today][planId]).length;
    }
  }
  document.getElementById('home-today-workouts').textContent = workoutCount;

  // Today's habits
  const habits = DB.getHabits();
  const completions = DB.getHabitCompletions();
  const todayCompletions = completions[today] || {};
  const completedCount = habits.filter(h => todayCompletions[h.id]).length;
  document.getElementById('home-today-habits').textContent = `${completedCount}/${habits.length}`;

  // Recent activity
  const activities = DB.getActivity();
  const container = document.getElementById('home-recent-activity');
  if (activities.length === 0) {
    container.innerHTML = '<p class="empty-state">No recent activity yet. Start by creating a workout plan!</p>';
  } else {
    container.innerHTML = activities.slice(0, 10).map(a => {
      const iconClass = a.type || 'workout';
      const icons = { workout: '💪', run: '🏃', habit: '✅', reward: '🏆', points: '⚡' };
      const timeAgo = getTimeAgo(a.time);
      return `
        <div class="activity-item">
          <div class="activity-icon ${iconClass}">${icons[iconClass] || '📌'}</div>
          <div class="activity-text">${escapeHtml(a.text)}</div>
          <div class="activity-time">${timeAgo}</div>
        </div>`;
    }).join('');
  }
}

function getTimeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}
