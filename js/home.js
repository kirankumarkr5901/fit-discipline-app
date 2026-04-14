/* ===============================================
   HOME.JS – Home Page Template & Logic
   =============================================== */

function getHomeTemplate() {
  return `
    <div class="hero">
      <h1>Welcome to <span class="highlight">Fit‑Discipline</span></h1>
      <p class="hero-sub">Your discipline is your superpower. Plan workouts, track progress, build habits, and earn rewards — every single day.</p>
    </div>

    <div class="dashboard-stats">
      <div class="stat-card accent-blue" onclick="navigateTo('habits')">
        <div class="stat-icon">⚡</div>
        <div class="stat-value" id="home-total-dp">0</div>
        <div class="stat-label">Discipline Points</div>
      </div>
      <div class="stat-card accent-orange" onclick="navigateToTodayWorkout()">
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

    <div class="points-breakdown-card">
      <div class="breakdown-tabs">
        <button class="breakdown-tab active" onclick="switchBreakdownTab('today')">Today</button>
        <button class="breakdown-tab" onclick="switchBreakdownTab('week')">This Week</button>
        <button class="breakdown-tab" onclick="switchBreakdownTab('month')">This Month</button>
      </div>
      <div class="breakdown-header">
        <h3 class="breakdown-title" id="home-breakdown-title">📊 Today's Points</h3>
        <span class="breakdown-total" id="home-today-total">+0</span>
      </div>
      <div class="breakdown-bars" id="home-points-breakdown"></div>
      <div id="home-breakdown-details"></div>
    </div>

    <div class="streak-calendar-card">
      <div class="streak-calendar-header">
        <button class="btn btn-icon" onclick="changeStreakMonth(-1)">◀</button>
        <h3 class="streak-calendar-title" id="streak-cal-title"></h3>
        <button class="btn btn-icon" onclick="changeStreakMonth(1)">▶</button>
      </div>
      <div class="streak-legend">
        <span class="streak-legend-label">Less</span>
        <span class="streak-cell" style="background:var(--streak-0)"></span>
        <span class="streak-cell" style="background:var(--streak-1)"></span>
        <span class="streak-cell" style="background:var(--streak-2)"></span>
        <span class="streak-cell" style="background:var(--streak-3)"></span>
        <span class="streak-cell" style="background:var(--streak-4)"></span>
        <span class="streak-legend-label">More</span>
      </div>
      <div id="streak-calendar-grid" class="streak-grid"></div>
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
      <div class="shortcut-card" onclick="navigateTo('body-metrics')">
        <div class="shortcut-icon">📏</div>
        <h3>Body Metrics</h3>
        <p>Track weight, height & BMI over time</p>
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
  const today = todayStr();

  // Today's workouts
  const logs = DB.getWorkoutLogs();
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

  // Today's points breakdown
  switchBreakdownTab('today');

  // Streak calendar
  initStreakCalendar();

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

function switchBreakdownTab(period) {
  const tabs = document.querySelectorAll('.breakdown-tab');
  tabs.forEach(t => t.classList.remove('active'));
  const idx = period === 'week' ? 1 : period === 'month' ? 2 : 0;
  tabs[idx]?.classList.add('active');

  const today = todayStr();
  const todayDate = new Date(today + 'T00:00:00');
  let startDate, title;

  if (period === 'week') {
    const dayOfWeek = todayDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate = new Date(todayDate);
    startDate.setDate(startDate.getDate() - mondayOffset);
    title = "📊 This Week's Points";
  } else if (period === 'month') {
    startDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    title = "📊 This Month's Points";
  } else {
    startDate = todayDate;
    title = "📊 Today's Points";
  }

  document.getElementById('home-breakdown-title').textContent = title;
  renderPointsBreakdown(startDate, todayDate, period);
}

function renderPointsBreakdown(startDate, endDate, period) {
  const categories = {
    habits:   { label: 'Habits',   icon: '✅', points: 0, color: '#8b5cf6' },
    bonuses:  { label: 'Bonuses',  icon: '🏆', points: 0, color: '#f59e0b' },
    workouts: { label: 'Workouts', icon: '💪', points: 0, color: '#3b82f6' },
    running:  { label: 'Running',  icon: '🏃', points: 0, color: '#10b981' },
    actions:  { label: 'Actions',  icon: '⚡', points: 0, color: '#6366f1' },
  };

  const habits = DB.getHabits();
  const completions = DB.getHabitCompletions();
  const dedBonus = DB.getDailyDedicationPoints();

  // Walk each day in the range
  const d = new Date(startDate);
  while (d <= endDate) {
    const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const dayComp = completions[dateStr] || {};

    // Habits: points from checked habits on this day
    for (const h of habits) {
      if (dayComp[h.id]) {
        categories.habits.points += h.points;
      }
    }

    // Dedication bonus: if all habits were completed on this day
    if (habits.length > 0 && habits.every(h => dayComp[h.id])) {
      categories.bonuses.points += dedBonus;
    }

    // Streak bonuses for this day
    for (const h of habits) {
      if (dayComp[h.id]) {
        const streak = getHabitStreakForDate(h.id, dateStr);
        if (streak > 0 && streak % 7 === 0) {
          const baseConsistency = h.consistencyPoints != null ? h.consistencyPoints : 5;
          categories.bonuses.points += Math.min(streak / 7, 10) * baseConsistency;
        }
      }
    }

    d.setDate(d.getDate() + 1);
  }

  // Workouts, Running, Actions from points log for the range
  const log = DB.getPointsLog();
  const rangeStart = startDate.getFullYear() + '-' + String(startDate.getMonth() + 1).padStart(2, '0') + '-' + String(startDate.getDate()).padStart(2, '0') + 'T00:00:00';
  const rangeEnd = endDate.getFullYear() + '-' + String(endDate.getMonth() + 1).padStart(2, '0') + '-' + String(endDate.getDate()).padStart(2, '0') + 'T23:59:59';
  const rangeEntries = log.filter(e => e.date >= rangeStart && e.date <= rangeEnd);
  for (const e of rangeEntries) {
    const desc = e.description || '';
    if (desc.startsWith('Workout PR') && e.points > 0) {
      categories.workouts.points += e.points;
    } else if ((desc.startsWith('Running:') || desc.includes('PR pace') || desc.includes('PR!') || desc.startsWith('First run')) && e.points > 0) {
      categories.running.points += e.points;
    } else if ((desc.startsWith('Action:') || desc.startsWith('Negative:')) && e.points > 0) {
      categories.actions.points += e.points;
    }
  }

  const active = Object.values(categories).filter(c => c.points > 0);
  const total = active.reduce((s, c) => s + c.points, 0);
  const maxAbs = Math.max(...active.map(c => c.points), 1);

  const totalEl = document.getElementById('home-today-total');
  totalEl.textContent = '+' + total;
  totalEl.className = 'breakdown-total positive';

  const container = document.getElementById('home-points-breakdown');
  if (active.length === 0) {
    container.innerHTML = '<p class="empty-state" style="margin:0;font-size:0.85rem;">No points earned yet</p>';
    return;
  }

  container.innerHTML = active.map(c => {
    const pct = Math.round((c.points / maxAbs) * 100);
    return `<div class="breakdown-row">
      <span class="breakdown-label">${c.icon} ${c.label}</span>
      <div class="breakdown-bar-track">
        <div class="breakdown-bar-fill positive" style="width:${pct}%;background:${c.color}"></div>
      </div>
      <span class="breakdown-value positive">+${c.points}</span>
    </div>`;
  }).join('');

  // Detailed report for month only
  const detailsContainer = document.getElementById('home-breakdown-details');
  if (period !== 'month') {
    detailsContainer.innerHTML = '';
    return;
  }

  // Build workout PR comparisons: find first and latest log in the month for each workout
  const logs = DB.getWorkoutLogs();
  const plans = DB.getPlans();
  const rangeStartStr = rangeStart.split('T')[0];
  const rangeEndStr = rangeEnd.split('T')[0];
  const prComparisons = [];

  for (const plan of plans) {
    for (const dayWorkouts of Object.values(plan.workouts)) {
      for (const w of dayWorkouts) {
        if (w.type !== 'strength') continue;
        let firstLog = null, firstDate = null, lastLog = null, lastDate = null;
        for (const [date, planLogs] of Object.entries(logs)) {
          if (date < rangeStartStr || date > rangeEndStr) continue;
          if (planLogs[plan.id]?.[w.id]) {
            const entry = planLogs[plan.id][w.id];
            if (!firstDate || date < firstDate) { firstLog = entry; firstDate = date; }
            if (!lastDate || date > lastDate) { lastLog = entry; lastDate = date; }
          }
        }
        if (firstLog && lastLog && firstDate !== lastDate) {
          const beforeW = parseFloat(firstLog.weight) || 0;
          const afterW = parseFloat(lastLog.weight) || 0;
          const beforeR = parseInt(firstLog.reps) || 0;
          const afterR = parseInt(lastLog.reps) || 0;
          if (afterW !== beforeW || afterR !== beforeR) {
            prComparisons.push({
              name: w.name,
              before: `${beforeW}kg × ${beforeR}`,
              after: `${afterW}kg × ${afterR}`,
              improved: afterW > beforeW || (afterW === beforeW && afterR > beforeR)
            });
          }
        }
      }
    }
  }

  // Build run comparisons per distance category
  const runs = DB.getRunLogs();
  const monthRuns = runs.filter(r => r.date >= rangeStartStr && r.date <= rangeEndStr && r.time > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Group runs by category (Under 5K, 5K, 10K, etc.)
  const runCategories = {};
  for (const r of monthRuns) {
    const catLow = r.distance < 5 ? 0 : Math.floor(r.distance / 5) * 5;
    const catLabel = catLow === 0 ? 'Under 5K' : `${catLow}K`;
    if (!runCategories[catLabel]) runCategories[catLabel] = [];
    runCategories[catLabel].push(r);
  }

  const runComparisons = [];
  for (const [catLabel, catRuns] of Object.entries(runCategories)) {
    if (catRuns.length >= 2) {
      const first = catRuns[0];
      const last = catRuns[catRuns.length - 1];
      if (first.date !== last.date) {
        runComparisons.push({
          category: catLabel,
          before: `${first.distance}km · ${first.time}min · ${formatPace(first.pace)} /km`,
          after: `${last.distance}km · ${last.time}min · ${formatPace(last.pace)} /km`,
          improved: parseFloat(last.pace) <= parseFloat(first.pace)
        });
      }
    }
  }

  let detailsHtml = '';

  if (prComparisons.length > 0 || runComparisons.length > 0) {
    detailsHtml += `<div class="breakdown-detail-section collapsed">
      <div class="detail-section-header" onclick="this.parentElement.classList.toggle('collapsed')">
        <h4 class="detail-section-title">📈 Monthly Progress</h4>
        <span class="detail-toggle-icon">▾</span>
      </div>
      <div class="detail-section-body">`;

    if (prComparisons.length > 0) {
      detailsHtml += `<h5 class="detail-sub-title">💪 Workout Improvements</h5>`;
      detailsHtml += prComparisons.map(p => `<div class="detail-comparison">
        <span class="detail-name">${escapeHtml(p.name)}</span>
        <div class="detail-change">
          <span class="detail-before">${p.before}</span>
          <span class="detail-arrow">→</span>
          <span class="detail-after ${p.improved ? 'improved' : 'declined'}">${p.after}</span>
        </div>
      </div>`).join('');
    }

    if (runComparisons.length > 0) {
      detailsHtml += `<h5 class="detail-sub-title">🏃 Running Progress</h5>`;
      detailsHtml += runComparisons.map(r => `<div class="detail-comparison">
        <span class="detail-name">${escapeHtml(r.category)}</span>
        <div class="detail-change">
          <span class="detail-before">${r.before}</span>
          <span class="detail-arrow">→</span>
          <span class="detail-after ${r.improved ? 'improved' : 'declined'}">${r.after}</span>
        </div>
      </div>`).join('');
    }

    detailsHtml += `</div></div>`;
  }

  detailsContainer.innerHTML = detailsHtml;
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

/* ---- Streak Calendar (GitHub-style heatmap) ---- */
let streakCalMonth = null; // Date object for 1st of viewed month

function initStreakCalendar() {
  const now = new Date();
  streakCalMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  renderStreakCalendar();
}

function changeStreakMonth(delta) {
  streakCalMonth.setMonth(streakCalMonth.getMonth() + delta);
  renderStreakCalendar();
}

function renderStreakCalendar() {
  const year = streakCalMonth.getFullYear();
  const month = streakCalMonth.getMonth();
  const titleEl = document.getElementById('streak-cal-title');
  titleEl.textContent = streakCalMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Gather per-day activity details for the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayData = {}; // { dateStr: { score, details[] } }

  const completions = DB.getHabitCompletions();
  const habits = DB.getHabits();
  const workoutLogs = DB.getWorkoutLogs();
  const runLogs = DB.getRunLogs();
  const pointsLog = DB.getPointsLog();
  const plans = DB.getPlans();

  // Build workout name lookup from plans
  const workoutNameMap = {};
  for (const plan of plans) {
    if (!plan.workouts) continue;
    for (const dayKey of Object.keys(plan.workouts)) {
      for (const w of plan.workouts[dayKey]) {
        workoutNameMap[w.id] = w.name;
      }
    }
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    let score = 0;
    const details = [];

    // Habits completed
    const dayComp = completions[ds] || {};
    const checkedHabits = habits.filter(h => dayComp[h.id]);
    if (checkedHabits.length > 0) {
      score += checkedHabits.length;
      details.push({ icon: '✅', label: `${checkedHabits.length}/${habits.length} Habits`, items: checkedHabits.map(h => h.name) });
    }

    // Workouts logged
    if (workoutLogs[ds]) {
      const wNames = [];
      for (const planId of Object.keys(workoutLogs[ds])) {
        for (const wId of Object.keys(workoutLogs[ds][planId])) {
          score++;
          wNames.push(workoutNameMap[wId] || wId);
        }
      }
      if (wNames.length > 0) {
        details.push({ icon: '💪', label: `${wNames.length} Workout${wNames.length > 1 ? 's' : ''}`, items: wNames });
      }
    }

    // Runs
    const dayRuns = runLogs.filter(r => r.date === ds);
    if (dayRuns.length > 0) {
      score += dayRuns.length;
      details.push({
        icon: '🏃',
        label: `${dayRuns.length} Run${dayRuns.length > 1 ? 's' : ''}`,
        items: dayRuns.map(r => r.time > 0 ? `${r.distance}km · ${formatPace(r.pace)} /km` : `${r.distance}km`)
      });
    }

    // Points log entries (actions, PRs)
    const dayStart = ds + 'T00:00:00';
    const dayEnd = ds + 'T23:59:59';
    const dayEntries = pointsLog.filter(e => e.date >= dayStart && e.date <= dayEnd && e.points > 0);
    const bonusEntries = dayEntries.filter(e => {
      const d = e.description || '';
      return d.includes('PR') || d.startsWith('Action:') || d.startsWith('Goal');
    });
    if (bonusEntries.length > 0) {
      score += 1;
      details.push({ icon: '⚡', label: `${bonusEntries.length} Bonus${bonusEntries.length > 1 ? 'es' : ''}`, items: bonusEntries.map(e => `+${e.points} ${e.description}`) });
    }

    // Total DP earned
    const totalDP = dayEntries.reduce((s, e) => s + e.points, 0);
    const habitDP = checkedHabits.reduce((s, h) => s + h.points, 0);
    const allDP = totalDP + habitDP;

    dayData[ds] = { score, details, totalDP: allDP };
  }

  // Determine intensity levels (0-4)
  const allScores = Object.values(dayData).map(d => d.score).filter(s => s > 0);
  const maxScore = allScores.length > 0 ? Math.max(...allScores) : 1;

  function getLevel(score) {
    if (score === 0) return 0;
    const ratio = score / maxScore;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  // Build grid: weekday headers + day cells
  const grid = document.getElementById('streak-calendar-grid');
  const todayStr_ = todayStr();
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  let html = dayLabels.map(d => `<div class="streak-day-label">${d}</div>`).join('');

  // First day of month: what weekday? (Mon=0 ... Sun=6)
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday-based

  // Empty cells before the 1st
  for (let i = 0; i < offset; i++) {
    html += `<div class="streak-cell empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    const data = dayData[ds] || { score: 0, details: [], totalDP: 0 };
    const level = getLevel(data.score);
    const isToday = ds === todayStr_ ? ' streak-today' : '';
    const isFuture = ds > todayStr_ ? ' streak-future' : '';
    html += `<div class="streak-cell level-${level}${isToday}${isFuture}" data-date="${ds}" onclick="showStreakDetail('${ds}')"><span class="streak-day-num">${day}</span></div>`;
  }

  grid.innerHTML = html;

  // Store day data for popup
  window._streakDayData = dayData;
}

function showStreakDetail(dateStr) {
  const data = window._streakDayData && window._streakDayData[dateStr];
  const existing = document.getElementById('streak-detail-popup');
  if (existing) existing.remove();

  if (!data || data.score === 0) {
    // Show a brief "no activity" popup
    const popup = document.createElement('div');
    popup.id = 'streak-detail-popup';
    popup.className = 'streak-detail-popup';
    popup.innerHTML = `
      <div class="streak-detail-header">
        <span class="streak-detail-date">${formatDate(dateStr)}</span>
        <button class="btn-icon streak-detail-close" onclick="this.closest('.streak-detail-popup').remove()">&times;</button>
      </div>
      <div class="streak-detail-empty">No activity logged</div>`;
    document.querySelector('.streak-calendar-card').appendChild(popup);
    return;
  }

  let itemsHtml = data.details.map(d => `
    <div class="streak-detail-group">
      <div class="streak-detail-group-title">${d.icon} ${d.label}</div>
      <ul class="streak-detail-items">
        ${d.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>`).join('');

  const popup = document.createElement('div');
  popup.id = 'streak-detail-popup';
  popup.className = 'streak-detail-popup';
  popup.innerHTML = `
    <div class="streak-detail-header">
      <span class="streak-detail-date">${formatDate(dateStr)}</span>
      <span class="streak-detail-dp">+${data.totalDP} DP</span>
      <button class="btn-icon streak-detail-close" onclick="this.closest('.streak-detail-popup').remove()">&times;</button>
    </div>
    ${itemsHtml}`;
  document.querySelector('.streak-calendar-card').appendChild(popup);

  // Close on outside click
  setTimeout(() => {
    function onOutside(e) {
      if (!popup.contains(e.target) && !e.target.closest('.streak-cell')) {
        popup.remove();
        document.removeEventListener('click', onOutside);
      }
    }
    document.addEventListener('click', onOutside);
  }, 0);
}
