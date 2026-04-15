/* ===============================================
   HOME.JS – Home Page Template & Logic
   =============================================== */

function getHomeTemplate() {
  return `
    <div class="hero">
      <h1>Welcome to <span class="highlight">Fit‑Discipline</span></h1>
      <p class="hero-sub" id="daily-quote"></p>
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

    <div class="muscle-heatmap-card">
      <h2 class="section-title">🏋️ This Week's Muscles</h2>
      <div class="muscle-body-wrap">
        <div id="muscle-body-front" class="muscle-body-svg"></div>
        <div id="muscle-body-back" class="muscle-body-svg"></div>
      </div>
      <div id="muscle-heatmap" class="muscle-heatmap"></div>
    </div>

    <div class="badges-card">
      <h2 class="section-title">🏅 Milestones & Badges</h2>
      <div id="badges-grid" class="badges-grid"></div>
    </div>

    <div id="year-in-review-card" class="year-review-card" style="display:none;"></div>

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
  // One-time migration: remove daily challenge data & deduct 30 DP
  if (!DB._get('_challengeCleanupDone')) {
    const cc = DB._get('completedChallenges', null);
    if (cc && Object.keys(cc).length > 0) {
      addDisciplinePoints(-30, 'Daily Challenge removal correction');
      DB._set('completedChallenges', undefined);
    }
    DB._set('_challengeCleanupDone', true);
  }

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

  // Daily quote
  renderDailyQuote();

  // Badges
  renderBadges();

  // Muscle heatmap
  renderMuscleHeatmap();

  // Year in review
  renderYearInReview();

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
          before: `${first.distance}km · ${formatTime(first.time)} · ${formatPace(first.pace)} /km`,
          after: `${last.distance}km · ${formatTime(last.time)} · ${formatPace(last.pace)} /km`,
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
      return d.includes('Consistency') || d.includes('Dedication') || d.includes('dedication');
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
    const cellDate = new Date(year, month, day);
    const dow = cellDate.getDay();
    const dayTag = dow === 6 ? '<span class="streak-day-tag run">🏃</span>' : dow === 0 ? '<span class="streak-day-tag rest">😴</span>' : '';
    html += `<div class="streak-cell level-${level}${isToday}${isFuture}" data-date="${ds}" onclick="showStreakDetail('${ds}')"><span class="streak-day-num">${day}</span>${dayTag}</div>`;
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

/* ---- Daily Motivational Quote ---- */
const FITNESS_QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Your body can stand almost anything. It's your mind that you have to convince.", author: "Unknown" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
  { text: "Success isn't always about greatness. It's about consistency.", author: "Dwayne Johnson" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "The hard days are what make you stronger.", author: "Aly Raisman" },
  { text: "If it doesn't challenge you, it doesn't change you.", author: "Fred DeVito" },
  { text: "Strength does not come from the body. It comes from the will.", author: "Gandhi" },
  { text: "The difference between try and triumph is a little umph.", author: "Marvin Phillips" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "You don't have to be extreme, just consistent.", author: "Unknown" },
  { text: "Fall in love with taking care of yourself.", author: "Unknown" },
  { text: "The only way to define your limits is by going beyond them.", author: "Arthur C. Clarke" },
  { text: "What hurts today makes you stronger tomorrow.", author: "Jay Cutler" },
  { text: "Your health is an investment, not an expense.", author: "Unknown" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "Push yourself because no one else is going to do it for you.", author: "Unknown" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "A one-hour workout is 4% of your day. No excuses.", author: "Unknown" },
  { text: "Sweat is just fat crying.", author: "Unknown" },
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
  { text: "Strive for progress, not perfection.", author: "Unknown" },
  { text: "It never gets easier, you just get stronger.", author: "Unknown" },
  { text: "The clock is ticking. Are you becoming the person you want to be?", author: "Greg Plitt" },
  { text: "No pain, no gain. Shut up and train.", author: "Unknown" },
  { text: "Be stronger than your strongest excuse.", author: "Unknown" },
  { text: "Rome wasn't built in a day, but they worked on it every single day.", author: "Unknown" },
  { text: "Good things come to those who sweat.", author: "Unknown" },
  { text: "Train insane or remain the same.", author: "Unknown" },
  { text: "The resistance that you fight physically in the gym strengthens you mentally.", author: "Arnold Schwarzenegger" },
];

function renderDailyQuote() {
  const el = document.getElementById('daily-quote');
  if (!el) return;
  // Seed by day so it changes daily but stays the same throughout the day
  const today = todayStr();
  const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
  const q = FITNESS_QUOTES[seed % FITNESS_QUOTES.length];
  el.innerHTML = `"${escapeHtml(q.text)}" <span style="opacity:0.7">— ${escapeHtml(q.author)}</span>`;
}

/* ---- Milestones & Badges ---- */

// DP earned since 2026-04-13 (excludes carry-over points added before that)
function getEarnedDP() {
  const log = DB.getPointsLog();
  const cutoff = '2026-04-13T00:00:00';
  return log.filter(e => e.date >= cutoff).reduce((s, e) => s + (e.points || 0), 0);
}

function dateToStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const BADGE_DEFS = [
  { id: 'first_workout',  icon: '💪', name: 'First Workout',    desc: 'Log your first workout',       check: () => Object.keys(DB.getWorkoutLogs()).length > 0 },
  { id: 'first_run',      icon: '🏃', name: 'First Run',        desc: 'Log your first run',           check: () => DB.getRunLogs().length > 0 },
  { id: 'first_habit',    icon: '✅', name: 'Habit Starter',    desc: 'Complete a habit for the first time', check: () => Object.keys(DB.getHabitCompletions()).length > 0 },
  { id: 'dp_100',         icon: '⚡', name: 'Centurion',        desc: 'Earn 100 Discipline Points',   check: () => getEarnedDP() >= 100 },
  { id: 'dp_500',         icon: '🔥', name: 'On Fire',          desc: 'Earn 500 Discipline Points',   check: () => getEarnedDP() >= 500 },
  { id: 'dp_1000',        icon: '💎', name: 'Diamond Grinder',  desc: 'Earn 1,000 Discipline Points', check: () => getEarnedDP() >= 1000 },
  { id: 'dp_5000',        icon: '👑', name: 'Royalty',          desc: 'Earn 5,000 Discipline Points', check: () => getEarnedDP() >= 5000 },
  { id: 'workouts_10',    icon: '🏋️', name: 'Gym Rat',          desc: 'Log 10 workout sessions',      check: () => countTotalWorkouts() >= 10 },
  { id: 'workouts_50',    icon: '🦾', name: 'Iron Will',        desc: 'Log 50 workout sessions',      check: () => countTotalWorkouts() >= 50 },
  { id: 'workouts_100',   icon: '🏆', name: 'Century Club',     desc: 'Log 100 workout sessions',     check: () => countTotalWorkouts() >= 100 },
  { id: 'runs_10',        icon: '👟', name: 'Road Warrior',     desc: 'Complete 10 runs',             check: () => DB.getRunLogs().length >= 10 },
  { id: 'runs_50',        icon: '🦅', name: 'Eagle Runner',     desc: 'Complete 50 runs',             check: () => DB.getRunLogs().length >= 50 },
  { id: 'run_50km',       icon: '🌍', name: 'Ultra Distance',   desc: 'Run 50km total',               check: () => DB.getRunLogs().reduce((s, r) => s + r.distance, 0) >= 50 },
  { id: 'run_100km',      icon: '🚀', name: 'Marathon Master',  desc: 'Run 100km total',              check: () => DB.getRunLogs().reduce((s, r) => s + r.distance, 0) >= 100 },
  { id: 'streak_7',       icon: '🔥', name: '7-Day Streak',     desc: 'Complete all habits 7 days in a row', check: () => getCurrentAllHabitStreak() >= 7 },
  { id: 'streak_30',      icon: '💫', name: '30-Day Streak',    desc: 'Complete all habits 30 days in a row', check: () => getCurrentAllHabitStreak() >= 30 },
  { id: 'streak_100',     icon: '🌟', name: 'Legendary',        desc: 'Complete all habits 100 days in a row', check: () => getCurrentAllHabitStreak() >= 100 },
  { id: 'goals_1',        icon: '🎯', name: 'Goal Getter',      desc: 'Complete your first goal',     check: () => DB.getGoals().filter(g => g.completed).length >= 1 },
  { id: 'goals_10',       icon: '🏅', name: 'Goal Crusher',     desc: 'Complete 10 goals',            check: () => DB.getGoals().filter(g => g.completed).length >= 10 },
];

function countTotalWorkouts() {
  const logs = DB.getWorkoutLogs();
  let count = 0;
  for (const date of Object.keys(logs)) {
    for (const planId of Object.keys(logs[date])) {
      count += Object.keys(logs[date][planId]).length;
    }
  }
  return count;
}

function getCurrentAllHabitStreak() {
  const habits = DB.getHabits();
  if (habits.length === 0) return 0;
  const completions = DB.getHabitCompletions();
  let streak = 0;
  const d = new Date(todayStr() + 'T00:00:00');
  while (true) {
    const ds = dateToStr(d);
    const dayComp = completions[ds] || {};
    if (habits.every(h => dayComp[h.id])) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function renderBadges() {
  const grid = document.getElementById('badges-grid');
  if (!grid) return;

  grid.innerHTML = BADGE_DEFS.map(b => {
    const unlocked = b.check();
    return `<div class="badge-item ${unlocked ? 'unlocked' : 'locked'}" title="${b.desc}">
      <span class="badge-icon">${b.icon}</span>
      <span class="badge-name">${b.name}</span>
      ${unlocked ? '<span class="badge-check">✓</span>' : ''}
    </div>`;
  }).join('');
}

/* ---- Muscle Group Heatmap ---- */
function getMuscleActivity() {
  const workoutLogs = DB.getWorkoutLogs();
  const plans = DB.getPlans();
  const today = new Date(todayStr() + 'T00:00:00');
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);

  // Build muscle lookup from plans
  const muscleMap = {};
  for (const p of plans) {
    if (!p.workouts) continue;
    for (const dk of Object.keys(p.workouts)) {
      for (const w of p.workouts[dk]) {
        muscleMap[w.id] = (w.muscle || 'other').toLowerCase();
      }
    }
  }

  const counts = {};
  const d = new Date(weekAgo);
  while (d <= today) {
    const ds = dateToStr(d);
    if (workoutLogs[ds]) {
      for (const planId of Object.keys(workoutLogs[ds])) {
        for (const wId of Object.keys(workoutLogs[ds][planId])) {
          const muscle = muscleMap[wId] || 'other';
          counts[muscle] = (counts[muscle] || 0) + 1;
        }
      }
    }
    d.setDate(d.getDate() + 1);
  }

  // Count runs as cardio
  const runLogs = DB.getRunLogs();
  for (const run of runLogs) {
    if (!run.date) continue;
    const rd = new Date(run.date + 'T00:00:00');
    if (rd >= weekAgo && rd <= today) {
      counts['cardio'] = (counts['cardio'] || 0) + 1;
      counts['legs'] = (counts['legs'] || 0) + 1;
      counts['calves'] = (counts['calves'] || 0) + 1;
    }
  }

  return counts;
}

function renderMuscleHeatmap() {
  const container = document.getElementById('muscle-heatmap');
  if (!container) return;

  const counts = getMuscleActivity();
  const allMuscles = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'glutes', 'forearms', 'calves', 'cardio', 'full body'];
  const icons = {
    chest: '🫁', back: '🔙', shoulders: '🏋️', biceps: '💪', triceps: '💪',
    legs: '🦵', core: '🎯', glutes: '🍑', forearms: '✊', calves: '🦶',
    cardio: '❤️', 'full body': '🏃'
  };

  const maxCount = Math.max(...Object.values(counts), 1);

  // Include any muscles from data not in the standard list
  const extraMuscles = Object.keys(counts).filter(m => !allMuscles.includes(m));
  const muscleList = [...allMuscles, ...extraMuscles];

  container.innerHTML = muscleList.map(m => {
    const count = counts[m] || 0;
    const intensity = count === 0 ? 0 : Math.min(Math.ceil((count / maxCount) * 4), 4);
    return `<div class="muscle-tile intensity-${intensity}" title="${m}: ${count} session${count !== 1 ? 's' : ''} this week">
      <span class="muscle-tile-icon">${icons[m] || '💪'}</span>
      <span class="muscle-tile-name">${m}</span>
      <span class="muscle-tile-count">${count}</span>
    </div>`;
  }).join('');

  renderMuscleBody(counts, maxCount);
}

function getIntensityColor(count, maxCount) {
  if (count === 0) return 'var(--bg-tertiary, #2a2a2e)';
  const level = Math.min(Math.ceil((count / maxCount) * 4), 4);
  return ['', '#9be9a8', '#40c463', '#30a14e', '#216e39'][level];
}

function renderMuscleBody(counts, maxCount) {
  const frontEl = document.getElementById('muscle-body-front');
  const backEl = document.getElementById('muscle-body-back');
  if (!frontEl || !backEl) return;

  // If "full body" is trained, distribute to all muscles
  const fb = counts['full body'] || 0;
  const c = key => (counts[key] || 0) + fb;

  const col = key => getIntensityColor(c(key), maxCount + fb);
  const opc = key => c(key) === 0 ? '0.25' : '1';

  // Front view
  frontEl.innerHTML = `
    <span class="body-view-label">FRONT</span>
    <svg viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg">
      <!-- Head -->
      <ellipse cx="100" cy="30" rx="20" ry="24" fill="var(--text-secondary)" opacity="0.3"/>
      <!-- Neck -->
      <rect x="92" y="52" width="16" height="14" rx="4" fill="var(--text-secondary)" opacity="0.3"/>

      <!-- Shoulders -->
      <ellipse cx="60" cy="82" rx="18" ry="12" fill="${col('shoulders')}" opacity="${opc('shoulders')}" class="muscle-part" data-muscle="shoulders"/>
      <ellipse cx="140" cy="82" rx="18" ry="12" fill="${col('shoulders')}" opacity="${opc('shoulders')}" class="muscle-part" data-muscle="shoulders"/>

      <!-- Chest -->
      <path d="M68,88 Q100,80 132,88 L128,120 Q100,126 72,120 Z" fill="${col('chest')}" opacity="${opc('chest')}" class="muscle-part" data-muscle="chest"/>

      <!-- Core / Abs -->
      <rect x="78" y="122" width="44" height="55" rx="8" fill="${col('core')}" opacity="${opc('core')}" class="muscle-part" data-muscle="core"/>

      <!-- Biceps -->
      <ellipse cx="52" cy="128" rx="11" ry="26" fill="${col('biceps')}" opacity="${opc('biceps')}" class="muscle-part" data-muscle="biceps"/>
      <ellipse cx="148" cy="128" rx="11" ry="26" fill="${col('biceps')}" opacity="${opc('biceps')}" class="muscle-part" data-muscle="biceps"/>

      <!-- Forearms -->
      <ellipse cx="46" cy="176" rx="9" ry="24" fill="${col('forearms')}" opacity="${opc('forearms')}" class="muscle-part" data-muscle="forearms"/>
      <ellipse cx="154" cy="176" rx="9" ry="24" fill="${col('forearms')}" opacity="${opc('forearms')}" class="muscle-part" data-muscle="forearms"/>

      <!-- Hands -->
      <ellipse cx="42" cy="206" rx="7" ry="8" fill="var(--text-secondary)" opacity="0.3"/>
      <ellipse cx="158" cy="206" rx="7" ry="8" fill="var(--text-secondary)" opacity="0.3"/>

      <!-- Quads (Legs front) -->
      <path d="M74,180 Q78,240 70,290 L90,290 Q92,240 88,180 Z" fill="${col('legs')}" opacity="${opc('legs')}" class="muscle-part" data-muscle="legs"/>
      <path d="M112,180 Q108,240 110,290 L130,290 Q122,240 126,180 Z" fill="${col('legs')}" opacity="${opc('legs')}" class="muscle-part" data-muscle="legs"/>

      <!-- Calves front -->
      <path d="M72,296 Q76,330 74,365 L88,365 Q90,330 88,296 Z" fill="${col('calves')}" opacity="${opc('calves')}" class="muscle-part" data-muscle="calves"/>
      <path d="M112,296 Q110,330 112,365 L126,365 Q124,330 128,296 Z" fill="${col('calves')}" opacity="${opc('calves')}" class="muscle-part" data-muscle="calves"/>

      <!-- Feet -->
      <ellipse cx="80" cy="375" rx="12" ry="6" fill="var(--text-secondary)" opacity="0.3"/>
      <ellipse cx="120" cy="375" rx="12" ry="6" fill="var(--text-secondary)" opacity="0.3"/>

      <!-- Cardio heart indicator -->
      ${c('cardio') > 0 ? `<text x="100" y="108" text-anchor="middle" font-size="16">❤️</text>` : ''}
    </svg>`;

  // Back view
  backEl.innerHTML = `
    <span class="body-view-label">BACK</span>
    <svg viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg">
      <!-- Head -->
      <ellipse cx="100" cy="30" rx="20" ry="24" fill="var(--text-secondary)" opacity="0.3"/>
      <!-- Neck -->
      <rect x="92" y="52" width="16" height="14" rx="4" fill="var(--text-secondary)" opacity="0.3"/>

      <!-- Shoulders back -->
      <ellipse cx="60" cy="82" rx="18" ry="12" fill="${col('shoulders')}" opacity="${opc('shoulders')}" class="muscle-part" data-muscle="shoulders"/>
      <ellipse cx="140" cy="82" rx="18" ry="12" fill="${col('shoulders')}" opacity="${opc('shoulders')}" class="muscle-part" data-muscle="shoulders"/>

      <!-- Upper Back -->
      <path d="M68,88 Q100,82 132,88 L128,130 Q100,136 72,130 Z" fill="${col('back')}" opacity="${opc('back')}" class="muscle-part" data-muscle="back"/>

      <!-- Lower Back -->
      <rect x="78" y="132" width="44" height="45" rx="8" fill="${col('back')}" opacity="${opc('back')}" class="muscle-part" data-muscle="back"/>

      <!-- Triceps -->
      <ellipse cx="52" cy="128" rx="11" ry="26" fill="${col('triceps')}" opacity="${opc('triceps')}" class="muscle-part" data-muscle="triceps"/>
      <ellipse cx="148" cy="128" rx="11" ry="26" fill="${col('triceps')}" opacity="${opc('triceps')}" class="muscle-part" data-muscle="triceps"/>

      <!-- Forearms back -->
      <ellipse cx="46" cy="176" rx="9" ry="24" fill="${col('forearms')}" opacity="${opc('forearms')}" class="muscle-part" data-muscle="forearms"/>
      <ellipse cx="154" cy="176" rx="9" ry="24" fill="${col('forearms')}" opacity="${opc('forearms')}" class="muscle-part" data-muscle="forearms"/>

      <!-- Hands -->
      <ellipse cx="42" cy="206" rx="7" ry="8" fill="var(--text-secondary)" opacity="0.3"/>
      <ellipse cx="158" cy="206" rx="7" ry="8" fill="var(--text-secondary)" opacity="0.3"/>

      <!-- Glutes -->
      <ellipse cx="85" cy="186" rx="16" ry="14" fill="${col('glutes')}" opacity="${opc('glutes')}" class="muscle-part" data-muscle="glutes"/>
      <ellipse cx="115" cy="186" rx="16" ry="14" fill="${col('glutes')}" opacity="${opc('glutes')}" class="muscle-part" data-muscle="glutes"/>

      <!-- Hamstrings (Legs back) -->
      <path d="M74,204 Q78,250 70,290 L90,290 Q92,250 88,204 Z" fill="${col('legs')}" opacity="${opc('legs')}" class="muscle-part" data-muscle="legs"/>
      <path d="M112,204 Q108,250 110,290 L130,290 Q122,250 126,204 Z" fill="${col('legs')}" opacity="${opc('legs')}" class="muscle-part" data-muscle="legs"/>

      <!-- Calves back -->
      <path d="M72,296 Q78,330 74,365 L88,365 Q86,330 88,296 Z" fill="${col('calves')}" opacity="${opc('calves')}" class="muscle-part" data-muscle="calves"/>
      <path d="M112,296 Q116,330 112,365 L126,365 Q128,330 128,296 Z" fill="${col('calves')}" opacity="${opc('calves')}" class="muscle-part" data-muscle="calves"/>

      <!-- Feet -->
      <ellipse cx="80" cy="375" rx="12" ry="6" fill="var(--text-secondary)" opacity="0.3"/>
      <ellipse cx="120" cy="375" rx="12" ry="6" fill="var(--text-secondary)" opacity="0.3"/>
    </svg>`;
}

/* ---- Year in Review ---- */
function renderYearInReview() {
  const card = document.getElementById('year-in-review-card');
  if (!card) return;

  const today = new Date(todayStr() + 'T00:00:00');
  const yearStart = new Date(today.getFullYear(), 0, 1);

  const workoutLogs = DB.getWorkoutLogs();
  const runLogs = DB.getRunLogs();
  const habits = DB.getHabits();
  const completions = DB.getHabitCompletions();

  let totalWorkouts = 0;
  let totalRuns = 0;
  let totalRunKm = 0;
  let totalDaysActive = 0;
  let habitDaysComplete = 0;
  let bestMonth = '';
  let bestMonthCount = 0;
  let longestStreak = 0;
  let currentStreak = 0;

  const monthActivity = {};

  const d = new Date(yearStart);
  while (d <= today) {
    const ds = dateToStr(d);
    const monthKey = ds.substring(0, 7);
    let dayActive = false;

    // Workouts
    if (workoutLogs[ds]) {
      for (const planId of Object.keys(workoutLogs[ds])) {
        const count = Object.keys(workoutLogs[ds][planId]).length;
        totalWorkouts += count;
        monthActivity[monthKey] = (monthActivity[monthKey] || 0) + count;
        if (count > 0) dayActive = true;
      }
    }

    // Habits
    const dayComp = completions[ds] || {};
    const habitsDone = habits.filter(h => dayComp[h.id]).length;
    if (habits.length > 0 && habitsDone === habits.length) {
      habitDaysComplete++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
    if (habitsDone > 0) dayActive = true;

    if (dayActive) totalDaysActive++;
    d.setDate(d.getDate() + 1);
  }

  // Runs this year
  const yearStartStr = dateToStr(yearStart);
  const todayStr_ = todayStr();
  const yearRuns = runLogs.filter(r => r.date >= yearStartStr && r.date <= todayStr_);
  totalRuns = yearRuns.length;
  totalRunKm = yearRuns.reduce((s, r) => s + r.distance, 0);

  // Find best month
  for (const [m, count] of Object.entries(monthActivity)) {
    if (count > bestMonthCount) {
      bestMonthCount = count;
      bestMonth = m;
    }
  }

  const bestMonthLabel = bestMonth
    ? new Date(bestMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long' })
    : '—';

  const totalDP = DB.getDP();

  card.style.display = 'block';
  card.innerHTML = `
    <div class="year-review-header">
      <h3>📅 ${today.getFullYear()} Year in Review</h3>
    </div>
    <div class="year-review-grid">
      <div class="year-stat">
        <span class="year-stat-value">${totalDaysActive}</span>
        <span class="year-stat-label">Days Active</span>
      </div>
      <div class="year-stat">
        <span class="year-stat-value">${totalWorkouts}</span>
        <span class="year-stat-label">Workouts</span>
      </div>
      <div class="year-stat">
        <span class="year-stat-value">${totalRuns}</span>
        <span class="year-stat-label">Runs</span>
      </div>
      <div class="year-stat">
        <span class="year-stat-value">${totalRunKm.toFixed(1)}</span>
        <span class="year-stat-label">Km Run</span>
      </div>
      <div class="year-stat">
        <span class="year-stat-value">${habitDaysComplete}</span>
        <span class="year-stat-label">Perfect Habit Days</span>
      </div>
      <div class="year-stat">
        <span class="year-stat-value">${longestStreak}</span>
        <span class="year-stat-label">Longest Streak</span>
      </div>
      <div class="year-stat">
        <span class="year-stat-value">${totalDP}</span>
        <span class="year-stat-label">Total DP</span>
      </div>
      <div class="year-stat">
        <span class="year-stat-value">${bestMonthLabel}</span>
        <span class="year-stat-label">Best Month</span>
      </div>
    </div>`;
}
