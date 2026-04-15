/* ===============================================
   WORKOUT-TRACKER.JS – Day grouping, PRs, Charts
   =============================================== */

let workoutChart = null;
let activeMuscleFilter = 'all';
let activeDay = 'all';

function getWorkoutTrackerTemplate() {
  return `
    <h1 class="page-title">💪 Workout Tracker</h1>

    <div class="tracker-date-bar">
      <button class="btn btn-sm" onclick="changeWorkoutDate(-1)">◀</button>
      <input type="date" id="workout-tracker-date" onchange="loadWorkoutTracker()" />
      <button class="btn btn-sm" onclick="changeWorkoutDate(1)">▶</button>
      <button class="btn btn-sm btn-outline" onclick="setWorkoutDateToday()">Today</button>
    </div>

    <div class="tracker-plan-select">
      <label>Active Plan:</label>
      <select id="tracker-plan-select" onchange="onPlanChange()"></select>
    </div>

    <div class="workout-cal-section collapsed">
      <div class="workout-cal-toggle" onclick="this.parentElement.classList.toggle('collapsed')">
        <h2 class="section-title" style="margin:0">📅 Workout Calendar</h2>
        <span class="workout-cal-arrow">▾</span>
      </div>
      <div class="workout-cal-body">
        <div class="workout-cal-nav">
          <button class="btn btn-icon" onclick="changeWorkoutCalMonth(-1)">◀</button>
          <span id="workout-cal-month-label" class="goals-month-label"></span>
          <button class="btn btn-icon" onclick="changeWorkoutCalMonth(1)">▶</button>
        </div>
        <div id="workout-cal-grid" class="workout-cal-grid"></div>
      </div>
    </div>

    <!-- Day Tabs -->
    <div id="day-tabs" class="day-tabs"></div>

    <!-- Muscle Group Filter -->
    <div id="muscle-group-filters" class="day-tabs"></div>

    <div id="workout-tracker-cards" class="tracker-cards"></div>

    <!-- Log Workout Modal -->
    <div id="log-workout-modal" class="modal-overlay" style="display:none;">
      <div class="modal">
        <div class="modal-header">
          <h2 id="log-workout-title">Log Workout</h2>
          <button class="btn-icon" onclick="closeModal('log-workout-modal')">&times;</button>
        </div>
        <div id="log-workout-fields"></div>
        <input type="hidden" id="log-workout-id" />
        <input type="hidden" id="log-workout-plan-id" />
        <button class="btn btn-primary" onclick="saveWorkoutLog()">Save Log</button>
      </div>
    </div>

    <!-- Workout History Modal -->
    <div id="workout-history-modal" class="modal-overlay" style="display:none;">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2 id="workout-history-title">Workout History</h2>
          <button class="btn-icon" onclick="closeModal('workout-history-modal')">&times;</button>
        </div>
        <div id="workout-history-content"></div>
        <div class="chart-container">
          <canvas id="workout-progress-chart"></canvas>
        </div>
      </div>
    </div>

    <!-- Swap Workout Modal -->
    <div id="swap-workout-modal" class="modal-overlay" style="display:none;">
      <div class="modal">
        <div class="modal-header">
          <h2>Move Workout</h2>
          <button class="btn-icon" onclick="closeModal('swap-workout-modal')">&times;</button>
        </div>
        <div class="form-row">
          <label>Move to</label>
          <select id="swap-workout-target"></select>
        </div>
        <input type="hidden" id="swap-workout-id" />
        <input type="hidden" id="swap-workout-plan-id" />
        <input type="hidden" id="swap-workout-from-day" />
        <button class="btn btn-primary" onclick="confirmSwapWorkout()">Move</button>
      </div>
    </div>`;
}

function initWorkoutTracker() {
  const dateInput = document.getElementById('workout-tracker-date');
  if (!dateInput.value) dateInput.value = todayStr();
  populatePlanSelect();
  loadWorkoutTracker();
  initWorkoutCalendar();
}

function navigateToTodayWorkout() {
  navigateTo('workout-tracker');
  const dateInput = document.getElementById('workout-tracker-date');
  dateInput.value = todayStr();
  const planId = document.getElementById('tracker-plan-select').value;
  if (planId) {
    const plans = DB.getPlans();
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      const d = new Date(dateInput.value + 'T00:00:00');
      const weekday = d.getDay(); // 0=Sun, 1=Mon, ...
      const dayNum = weekday === 0 ? 7 : weekday; // Mon=1, Tue=2, ..., Sun=7
      activeDay = dayNum <= plan.days ? String(dayNum) : 'all';
    } else {
      activeDay = 'all';
    }
  } else {
    activeDay = 'all';
  }
  activeMuscleFilter = 'all';
  loadWorkoutTracker();
}

function setWorkoutDateToday() {
  document.getElementById('workout-tracker-date').value = todayStr();
  loadWorkoutTracker();
}

function changeWorkoutDate(delta) {
  const input = document.getElementById('workout-tracker-date');
  const d = new Date(input.value + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  input.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  loadWorkoutTracker();
}

function populatePlanSelect() {
  const plans = DB.getPlans();
  const select = document.getElementById('tracker-plan-select');
  select.innerHTML = plans.length === 0
    ? '<option value="">No plans – create one in Planner</option>'
    : plans.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
}

function onPlanChange() {
  activeDay = 'all';
  activeMuscleFilter = 'all';
  loadWorkoutTracker();
}

function loadWorkoutTracker() {
  const planId = document.getElementById('tracker-plan-select').value;
  const date = document.getElementById('workout-tracker-date').value;
  if (!planId || !date) return;

  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  // Build day tabs
  renderDayTabs(plan);

  // Gather workouts based on selected day (exclude optional from regular "all" flow)
  const allWorkouts = [];
  const daysToShow = activeDay === 'all'
    ? Object.keys(plan.workouts).filter(d => d !== 'optional')
    : [activeDay];

  // Collect elite workouts from ALL days (they are day-independent)
  const eliteWorkouts = [];
  const eliteIds = new Set();
  for (const day of Object.keys(plan.workouts)) {
    if (day === 'optional') continue;
    for (const w of plan.workouts[day] || []) {
      if (w.elite && !eliteIds.has(w.id)) {
        eliteIds.add(w.id);
        eliteWorkouts.push({ ...w, day });
      }
    }
  }

  for (const day of daysToShow) {
    const workouts = plan.workouts[day] || [];
    for (const w of workouts) {
      if (!w.elite) { // Elite workouts handled separately
        allWorkouts.push({ ...w, day });
      }
    }
  }

  // Build muscle group filters
  const muscles = [...new Set(allWorkouts.map(w => w.muscle))];
  const filterContainer = document.getElementById('muscle-group-filters');
  if (muscles.length > 1) {
    const totalCount = allWorkouts.length;
    filterContainer.innerHTML =
      `<div class="day-tab ${activeMuscleFilter === 'all' ? 'active' : ''}" onclick="setMuscleFilter('all')">
        <span>All</span>
        <span class="day-tab-count">${totalCount}</span>
      </div>` +
      muscles.map(m => {
        const count = allWorkouts.filter(w => w.muscle === m).length;
        return `<div class="day-tab ${activeMuscleFilter === m ? 'active' : ''}" onclick="setMuscleFilter('${m}')">
          <span>${m.charAt(0).toUpperCase() + m.slice(1)}</span>
          <span class="day-tab-count">${count}</span>
        </div>`;
      }).join('');
  } else {
    filterContainer.innerHTML = '';
  }

  // Filter by muscle
  const filtered = activeMuscleFilter === 'all'
    ? allWorkouts
    : allWorkouts.filter(w => w.muscle === activeMuscleFilter);

  // Get logs for this date
  const logs = DB.getWorkoutLogs();
  const dayLogs = (logs[date] && logs[date][planId]) || {};

  const container = document.getElementById('workout-tracker-cards');
  if (filtered.length === 0 && eliteWorkouts.length === 0) {
    container.innerHTML = '<p class="empty-state">No workouts for this selection. Add workouts in the Planner.</p>';
    return;
  }

  // Render elite section at the top (always visible, day-independent)
  let eliteSectionHtml = '';
  if (eliteWorkouts.length > 0) {
    const eliteCards = eliteWorkouts.map(w => buildTrackerCard(w, planId, date, dayLogs, plan)).join('');
    const eliteDoneCount = eliteWorkouts.filter(w => dayLogs[w.id]).length;
    eliteSectionHtml = `<div class="elite-section">
      <div class="elite-section-header">
        <h3 class="elite-section-title">⚡ Elite Workouts</h3>
        <span class="elite-section-meta">${eliteDoneCount}/${eliteWorkouts.length} done</span>
      </div>
      <div class="elite-section-body">
        <div class="tracker-cards">${eliteCards}</div>
      </div>
    </div>`;
  }

  // Render workouts grouped by day when viewing all, or flat for a single day
  // Within each group: singles first, then supersets/alternatives at the end
  if (activeDay === 'all' && daysToShow.length > 1) {
    let fullHtml = '';
    for (const day of daysToShow) {
      const dayWorkouts = filtered.filter(w => w.day === day);
      if (dayWorkouts.length === 0) continue;
      const dayName = getPlanDayName(plan, day);
      const dayContent = renderWorkoutGroup(dayWorkouts, planId, date, dayLogs, plan);
      fullHtml += `<div class="day-section">
        <h3 class="day-section-title">${escapeHtml(dayName)}</h3>
        <div class="tracker-cards">${dayContent}</div>
      </div>`;
    }
    container.innerHTML = eliteSectionHtml + fullHtml;
  } else {
    container.innerHTML = eliteSectionHtml + renderWorkoutGroup(filtered, planId, date, dayLogs, plan);
  }

  // Render optional workouts section
  const optionalWorkouts = (plan.workouts['optional'] || []).map(w => ({ ...w, day: 'optional' }));
  const optionalFiltered = activeMuscleFilter === 'all'
    ? optionalWorkouts
    : optionalWorkouts.filter(w => w.muscle === activeMuscleFilter);
  if (optionalFiltered.length > 0 && activeDay !== 'optional') {
    const optContent = renderWorkoutGroup(optionalFiltered, planId, date, dayLogs, plan);
    const optLoggedCount = optionalFiltered.filter(w => dayLogs[w.id]).length;
    container.innerHTML += `
      <div class="optional-section collapsed">
        <div class="optional-section-header" onclick="this.parentElement.classList.toggle('collapsed')">
          <h3 class="optional-section-title">⭐ Optional Workouts</h3>
          <span class="optional-section-meta">${optLoggedCount}/${optionalFiltered.length} done</span>
          <span class="optional-toggle-icon">▾</span>
        </div>
        <div class="optional-section-body">
          <div class="tracker-cards">${optContent}</div>
        </div>
      </div>`;
  }

  // Check if all non-optional workouts for this view are completed
  if (filtered.length > 0) {
    const allDone = checkAllWorkoutsDone(filtered, dayLogs);
    if (allDone) {
      container.innerHTML = `<div class="workout-celebration">
        <div class="celebration-content">
          <div class="celebration-emoji">🎉</div>
          <h2 class="celebration-title">All Workouts Done!</h2>
          <p class="celebration-text">You crushed it today! Every workout is complete.</p>
        </div>
      </div>` + container.innerHTML;
    }
  }
}

function checkAllWorkoutsDone(workouts, dayLogs) {
  const checked = new Set();
  for (const w of workouts) {
    if (checked.has(w.id)) continue;
    checked.add(w.id);

    if (w.supersetWith) {
      const partner = workouts.find(x => x.id === w.supersetWith);
      if (partner && !checked.has(partner.id)) {
        checked.add(partner.id);
        // Both must be logged
        if (!dayLogs[w.id] || !dayLogs[partner.id]) return false;
        continue;
      }
    }

    if (w.alternativeOf) {
      const partner = workouts.find(x => x.id === w.alternativeOf);
      if (partner && !checked.has(partner.id)) {
        checked.add(partner.id);
        // At least one must be logged
        if (!dayLogs[w.id] && !dayLogs[partner.id]) return false;
        continue;
      }
    }

    // Normal workout
    if (!dayLogs[w.id]) return false;
  }
  return true;
}

function renderWorkoutGroup(workouts, planId, date, dayLogs, plan) {
  const rendered = new Set();
  let pendingSingles = '';
  let pendingGroups = '';
  let doneSingles = '';
  let doneGroups = '';

  for (const w of workouts) {
    if (rendered.has(w.id)) continue;
    rendered.add(w.id);

    // Superset pair
    if (w.supersetWith) {
      const partner = workouts.find(x => x.id === w.supersetWith);
      if (partner && !rendered.has(partner.id)) {
        rendered.add(partner.id);
        const html = `<div class="superset-group">
          <div class="group-label superset-label">🔗 SUPERSET</div>
          <div class="group-cards">
            ${buildTrackerCard(w, planId, date, dayLogs, plan)}
            ${buildTrackerCard(partner, planId, date, dayLogs, plan)}
          </div>
        </div>`;
        // Superset is done only if BOTH are logged
        if (dayLogs[w.id] && dayLogs[partner.id]) {
          doneGroups += html;
        } else {
          pendingGroups += html;
        }
        continue;
      }
    }

    // Alternative pair
    if (w.alternativeOf) {
      const partner = workouts.find(x => x.id === w.alternativeOf);
      if (partner && !rendered.has(partner.id)) {
        rendered.add(partner.id);
        const logA = dayLogs[w.id];
        const logB = dayLogs[partner.id];
        const dimA = !logA && logB ? ' alt-dimmed' : '';
        const dimB = !logB && logA ? ' alt-dimmed' : '';
        const html = `<div class="alternative-group">
          <div class="group-label alternative-label">🔀 ALTERNATIVE — pick one</div>
          <div class="group-cards">
            ${buildTrackerCard(w, planId, date, dayLogs, plan, dimA)}
            ${buildTrackerCard(partner, planId, date, dayLogs, plan, dimB)}
          </div>
        </div>`;
        // Alternative is done if at least one is logged
        if (logA || logB) {
          doneGroups += html;
        } else {
          pendingGroups += html;
        }
        continue;
      }
    }

    // Normal card
    const cardHtml = buildTrackerCard(w, planId, date, dayLogs, plan);
    if (dayLogs[w.id]) {
      doneSingles += cardHtml;
    } else {
      pendingSingles += cardHtml;
    }
  }

  const pendingHtml = pendingSingles + pendingGroups;
  const doneHtml = doneSingles + doneGroups;

  let result = pendingHtml;
  if (doneHtml) {
    result += `<div class="done-section">
      <div class="done-section-header" onclick="this.parentElement.classList.toggle('collapsed')">
        <h3 class="done-section-title">✅ Completed</h3>
        <span class="done-toggle-icon">▾</span>
      </div>
      <div class="done-section-body">
        <div class="tracker-cards">${doneHtml}</div>
      </div>
    </div>`;
  }

  return result;
}

/* ---- Build Single Tracker Card ---- */
function buildTrackerCard(w, planId, date, dayLogs, plan, extraClass) {
  const log = dayLogs[w.id];
  const { currentPR, currentPRLabel, lifetimePR, isNewPR } = calculatePR(w, planId, date);
  const dayName = getPlanDayName(plan, w.day);
  const badgeClass = w.type === 'strength' ? 'badge-strength' : w.type === 'cardio' ? 'badge-cardio' : 'badge-isolation';

  let logSummary = '';
  if (log) {
    if (w.type === 'strength') {
      if (w.equipment === 'bodyweight' && log.bodyweight != null) {
        const addedLabel = log.addedWeight > 0 ? ` + ${log.addedWeight}kg` : '';
        logSummary = `${log.bodyweight}kg BW${addedLabel} = ${log.weight}kg × ${log.reps} reps × ${log.sets} sets`;
      } else {
        const modeLabel = log.weightMode === 'perside' ? ' (per side)' : w.equipment === 'dumbbell' ? ' (per hand)' : '';
        logSummary = `${log.weight}kg${modeLabel} × ${log.reps} reps × ${log.sets} sets`;
      }
    } else {
      logSummary = `${formatTime(log.time)} × ${log.sets} sets${log.weight ? ' · ' + log.weight + 'kg' : ''}`;
    }
  }

  const loggedClass = log ? ' tracker-card-logged' : '';
  const eliteClass = w.elite ? ' tracker-card-elite' : '';
  const isPastDate = date < todayStr();
  const showGoalToggle = w.type === 'strength';
  const goalDisabled = isPastDate;

  const eliteStreakHtml = w.elite ? `<div class="elite-consistency">� ${getEliteConsistency(w.id, planId)} total completions</div>` : '';

  return `
    <div class="tracker-card${loggedClass}${eliteClass}${extraClass || ''}">
      <div class="tracker-card-header">
        <span class="tracker-card-title">${escapeHtml(w.name)}</span>
        ${w.elite ? '<span class="tracker-card-badge badge-elite">⚡ ELITE</span>' : ''}
        <span class="tracker-card-badge ${badgeClass}">${w.type}</span>
      </div>
      <div class="tracker-card-muscle">🎯 ${w.muscle.charAt(0).toUpperCase() + w.muscle.slice(1)} · ${w.equipment ? w.equipment.charAt(0).toUpperCase() + w.equipment.slice(1) + ' · ' : ''}${escapeHtml(dayName)}</div>
      ${eliteStreakHtml}
      ${isNewPR ? '<div class="new-pr-message">🎉 New PR!</div>' : ''}
      <div class="pr-row">
        <div class="pr-item">
          <span class="pr-label">${currentPRLabel}</span>
          <span class="pr-value">${currentPR || '--'}</span>
        </div>
        <div class="pr-item">
          <span class="pr-label">Lifetime PR</span>
          <span class="pr-value">${lifetimePR || '--'}</span>
        </div>
      </div>
      ${showGoalToggle ? `<div class="tracker-goal-toggle${goalDisabled ? ' goal-disabled' : ''}">
        <span class="goal-label">🎯 Next goal:</span>
        <label class="goal-option"><input type="radio" name="goal-${w.id}" value="weight" ${getWorkoutGoalForDate(w.id, date) !== 'reps' ? 'checked' : ''} ${goalDisabled ? 'disabled' : `onchange="setWorkoutGoal('${w.id}','weight')"`} /> ⬆️ Weight</label>
        <label class="goal-option"><input type="radio" name="goal-${w.id}" value="reps" ${getWorkoutGoalForDate(w.id, date) === 'reps' ? 'checked' : ''} ${goalDisabled ? 'disabled' : `onchange="setWorkoutGoal('${w.id}','reps')"`} /> 🔁 Reps</label>
      </div>` : ''}
      ${log ? `<div class="tracker-log-summary">📊 ${logSummary}</div>` : ''}
      ${log && log.weightMode ? `<div class="weight-mode-tag-row"><span class="weight-mode-tag ${log.weightMode}">${log.weightMode === 'perside' ? '⚖️ Per Side' : '⚖️ Combined'}</span></div>` : ''}
      <div class="tracker-card-actions">
        <button class="btn btn-primary btn-sm" onclick="openLogWorkout('${planId}','${w.id}','${w.type}','${w.equipment || 'barbell'}')">${log ? '✏️ Edit' : '📝 Log'}</button>
        ${log ? `<button class="btn btn-danger btn-sm" onclick="deleteWorkoutLog('${planId}','${w.id}')">🗑️</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="showWorkoutHistory('${planId}','${w.id}','${escapeHtml(w.name)}','${w.type}')">📈 History</button>
        <button class="btn btn-outline btn-sm swap-btn" onclick="openSwapWorkout('${planId}','${w.id}','${w.day}')" title="${w.day === 'optional' ? 'Move to a day' : 'Move to optional'}">🔄</button>
      </div>
    </div>`;
}

/* ---- Elite Consistency ---- */
function getEliteConsistency(workoutId, planId) {
  const logs = DB.getWorkoutLogs();
  // Get all dates this workout was logged, sorted descending
  const loggedDates = Object.keys(logs)
    .filter(d => logs[d]?.[planId]?.[workoutId])
    .sort((a, b) => b.localeCompare(a));
  return loggedDates.length;
}

/* ---- Day Tabs ---- */
function renderDayTabs(plan) {
  const container = document.getElementById('day-tabs');
  const totalWorkouts = Object.values(plan.workouts).reduce((s, w) => s + w.length, 0);

  let html = `<div class="day-tab ${activeDay === 'all' ? 'active' : ''}" onclick="setActiveDay('all')">
    <span>All</span>
    <span class="day-tab-count">${totalWorkouts}</span>
  </div>`;

  for (let d = 1; d <= plan.days; d++) {
    const dayName = getPlanDayName(plan, d);
    const count = (plan.workouts[d] || []).length;
    html += `
      <div class="day-tab ${activeDay === String(d) ? 'active' : ''}" onclick="setActiveDay('${d}')">
        <span>${escapeHtml(dayName)}</span>
        <span class="day-tab-label">Day ${d}</span>
        <span class="day-tab-count">${count}</span>
      </div>`;
  }

  const optCount = (plan.workouts['optional'] || []).length;
  if (optCount > 0) {
    html += `
      <div class="day-tab optional-tab ${activeDay === 'optional' ? 'active' : ''}" onclick="setActiveDay('optional')">
        <span>⭐ Optional</span>
        <span class="day-tab-count">${optCount}</span>
      </div>`;
  }

  container.innerHTML = html;
}

function setActiveDay(day) {
  activeDay = day;
  activeMuscleFilter = 'all';
  loadWorkoutTracker();
}

function setMuscleFilter(muscle) {
  activeMuscleFilter = muscle;
  loadWorkoutTracker();
}

/* ---- PR Calculation ---- */
function calculatePR(workout, planId, currentDate) {
  const logs = DB.getWorkoutLogs();
  let lifetimeBestLog = null;
  let currentDayBestLog = null;
  let recentBestLog = null, recentBestDate = null;

  for (const [date, planLogs] of Object.entries(logs)) {
    if (planLogs[planId] && planLogs[planId][workout.id]) {
      const log = planLogs[planId][workout.id];
      if (!lifetimeBestLog || comparePR(workout, log, lifetimeBestLog) > 0) lifetimeBestLog = log;
      if (date === currentDate) {
        if (!currentDayBestLog || comparePR(workout, log, currentDayBestLog) > 0) currentDayBestLog = log;
      }
      if (date !== currentDate && (!recentBestDate || date > recentBestDate)) {
        recentBestLog = log;
        recentBestDate = date;
      }
    }
  }

  const displayLog = currentDayBestLog || recentBestLog;
  const displayLabel = currentDayBestLog ? "Today's PR" : 'Recent PR';
  const isNewPR = currentDayBestLog && lifetimeBestLog && comparePR(workout, currentDayBestLog, lifetimeBestLog) >= 0;
  return {
    currentPR: displayLog ? formatPR(workout.type, displayLog) : null,
    currentPRLabel: displayLabel,
    lifetimePR: lifetimeBestLog ? formatPR(workout.type, lifetimeBestLog) : null,
    isNewPR
  };
}

function comparePR(workout, logA, logB) {
  if (workout.type === 'strength') {
    const wA = getStrengthWeight(logA, workout);
    const wB = getStrengthWeight(logB, workout);
    if (wA !== wB) return wA - wB; // higher weight wins
    return (parseInt(logA.reps) || 0) - (parseInt(logB.reps) || 0); // same weight: higher reps wins
  }
  const valA = (parseFloat(logA.time) || 0) * (parseInt(logA.sets) || 1);
  const valB = (parseFloat(logB.time) || 0) * (parseInt(logB.sets) || 1);
  return valA - valB;
}

function getStrengthWeight(log, workout) {
  if (workout.equipment === 'bodyweight' && log.addedWeight != null) {
    return parseFloat(log.addedWeight) || 0;
  }
  return parseFloat(log.weight) || 0;
}

/* ---- Workout Goal (weight vs reps) ---- */
function getWorkoutGoalForDate(workoutId, date) {
  const goals = JSON.parse(localStorage.getItem('workoutGoals') || '{}');
  const history = goals[workoutId];
  if (!history || !Array.isArray(history) || history.length === 0) {
    // Migrate old format
    if (history && history.goal) return history.goal;
    return 'weight';
  }
  // Find the latest entry on or before the given date
  let result = 'weight';
  for (const entry of history) {
    if (entry.date <= date) result = entry.goal;
  }
  return result;
}

function getWorkoutGoal(workoutId) {
  return getWorkoutGoalForDate(workoutId, todayStr());
}

function setWorkoutGoal(workoutId, goal) {
  const goals = JSON.parse(localStorage.getItem('workoutGoals') || '{}');
  let history = goals[workoutId];
  // Migrate old format
  if (!Array.isArray(history)) history = [];
  const today = todayStr();
  // Update today's entry or add new one
  const existing = history.find(e => e.date === today);
  if (existing) {
    existing.goal = goal;
  } else {
    history.push({ date: today, goal });
    history.sort((a, b) => a.date.localeCompare(b.date));
  }
  goals[workoutId] = history;
  localStorage.setItem('workoutGoals', JSON.stringify(goals));
}

function getPRValue(type, log) {
  if (type === 'strength') {
    return (parseFloat(log.weight) || 0) * (parseInt(log.reps) || 1);
  }
  return (parseFloat(log.time) || 0) * (parseInt(log.sets) || 1);
}

function formatPR(type, log) {
  if (type === 'strength') {
    if (log.bodyweight != null) {
      const addedLabel = log.addedWeight > 0 ? ` + ${log.addedWeight}kg` : '';
      return `${log.bodyweight}kg BW${addedLabel} × ${log.reps} reps`;
    }
    return `${log.weight}kg × ${log.reps} reps`;
  }
  return `${formatTime(log.time)} × ${log.sets} sets`;
}

function updateBWTotal() {
  const bw = parseFloat(document.getElementById('log-bodyweight').value) || 0;
  const added = parseFloat(document.getElementById('log-added-weight').value) || 0;
  const preview = document.getElementById('bw-total-preview');
  if (preview) {
    const total = bw + added;
    preview.textContent = total > 0 ? total + ' kg' : '--';
  }
}

/* ---- Log Workout Modal ---- */
function openLogWorkout(planId, workoutId, workoutType, equipment) {
  const date = document.getElementById('workout-tracker-date').value;
  const logs = DB.getWorkoutLogs();
  const existing = logs[date]?.[planId]?.[workoutId];

  // Find most recent previous log for this workout to pre-fill
  let prev = null;
  if (!existing) {
    const sortedDates = Object.keys(logs).filter(d => d < date).sort().reverse();
    for (const d of sortedDates) {
      if (logs[d]?.[planId]?.[workoutId]) { prev = logs[d][planId][workoutId]; break; }
    }
  }
  const prefill = existing || prev;

  document.getElementById('log-workout-id').value = workoutId;
  document.getElementById('log-workout-plan-id').value = planId;

  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  let wName = 'Workout';
  if (plan) {
    for (const day of Object.values(plan.workouts)) {
      const found = day.find(w => w.id === workoutId);
      if (found) { wName = found.name; break; }
    }
  }
  document.getElementById('log-workout-title').textContent = `Log: ${wName}`;

  // Get user's bodyweight for bodyweight exercises
  const isBodyweight = equipment === 'bodyweight';
  let userBodyweight = 0;
  if (isBodyweight) {
    const metrics = DB.getBodyMetrics();
    if (metrics.length > 0) userBodyweight = metrics[0].weight;
  }

  const fields = document.getElementById('log-workout-fields');
  if (workoutType === 'strength') {
    let weightFieldHtml;
    if (isBodyweight) {
      const addedWeight = prefill ? (prefill.addedWeight != null ? prefill.addedWeight : 0) : 0;
      const totalPreview = userBodyweight > 0 ? userBodyweight + addedWeight : '';
      weightFieldHtml = `
        <div class="form-row">
          <label>⚖️ Your Bodyweight</label>
          <input type="number" id="log-bodyweight" value="${userBodyweight || ''}" step="0.1" placeholder="Enter bodyweight" oninput="updateBWTotal()" />
        </div>
        <div class="form-row">
          <label>Added Weight (kg) <span style="font-size:0.8em;color:var(--text-muted)">vest, plate, etc.</span></label>
          <input type="number" id="log-added-weight" step="0.5" value="${addedWeight}" placeholder="0" oninput="updateBWTotal()" />
        </div>
        <div class="form-row">
          <label>Total Weight</label>
          <div id="bw-total-preview" style="padding:10px 12px;background:var(--bg-tertiary);border-radius:var(--radius-sm);font-weight:700;color:var(--accent-blue);font-size:1.1rem">${totalPreview ? totalPreview + ' kg' : '--'}</div>
        </div>`;
    } else {
      weightFieldHtml = `
        <div class="form-row">
          <label>Weight (kg)</label>
          <input type="number" id="log-weight" step="0.5" value="${prefill ? prefill.weight : ''}" placeholder="e.g., 80" />
        </div>`;
    }
    fields.innerHTML = weightFieldHtml + `
      <div class="form-row">
        <label>Reps</label>
        <input type="number" id="log-reps" value="${prefill ? prefill.reps : ''}" placeholder="e.g., 10" />
      </div>
      <div class="form-row">
        <label>Sets</label>
        <input type="number" id="log-sets" value="${prefill ? prefill.sets : ''}" placeholder="e.g., 3" />
      </div>
      <div class="form-row">
        <label>Weight Mode</label>
        <select id="log-weight-mode">
          <option value="combined"${!prefill || prefill.weightMode !== 'perside' ? ' selected' : ''}>Combined</option>
          <option value="perside"${prefill && prefill.weightMode === 'perside' ? ' selected' : ''}>Per Side</option>
        </select>
      </div>`;
  } else {
    const prefillMin = prefill ? Math.floor(prefill.time) : '';
    const prefillSec = prefill ? Math.round((prefill.time - Math.floor(prefill.time)) * 60) : '';
    fields.innerHTML = `
      <div class="form-row">
        <label>Time</label>
        <div class="time-input-group">
          <input type="number" id="log-time-min" min="0" value="${prefillMin}" placeholder="min" />
          <span class="time-sep">:</span>
          <input type="number" id="log-time-sec" min="0" max="59" value="${prefillSec}" placeholder="sec" />
        </div>
      </div>
      <div class="form-row">
        <label>Sets</label>
        <input type="number" id="log-sets" value="${prefill ? prefill.sets : ''}" placeholder="e.g., 3" />
      </div>
      <div class="form-row">
        <label>Weight (kg) <span style="font-size:0.8em;color:var(--text-muted)">optional</span></label>
        <input type="number" id="log-weight-optional" step="0.5" value="${prefill && prefill.weight ? prefill.weight : ''}" placeholder="e.g., 10" />
      </div>`;
  }
  openModal('log-workout-modal');
}

function saveWorkoutLog() {
  const date = document.getElementById('workout-tracker-date').value;
  const planId = document.getElementById('log-workout-plan-id').value;
  const workoutId = document.getElementById('log-workout-id').value;

  const logs = DB.getWorkoutLogs();
  if (!logs[date]) logs[date] = {};
  if (!logs[date][planId]) logs[date][planId] = {};

  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  let wType = 'strength', wName = 'Workout';
  if (plan) {
    for (const day of Object.values(plan.workouts)) {
      const found = day.find(w => w.id === workoutId);
      if (found) { wType = found.type; wName = found.name; break; }
    }
  }

  // Find equipment type
  let wEquipment = 'barbell';
  if (plan) {
    for (const day of Object.values(plan.workouts)) {
      const found = day.find(w => w.id === workoutId);
      if (found) { wEquipment = found.equipment || 'barbell'; break; }
    }
  }

  let logData;
  if (wType === 'strength') {
    const reps = document.getElementById('log-reps').value;
    const sets = document.getElementById('log-sets').value;

    if (wEquipment === 'bodyweight') {
      const bw = parseFloat(document.getElementById('log-bodyweight').value);
      const added = parseFloat(document.getElementById('log-added-weight').value) || 0;
      if (!bw || !reps || !sets) { showToast('Fill all fields', 'warning'); return; }
      const totalWeight = bw + added;
      logData = { weight: totalWeight, bodyweight: bw, addedWeight: added, reps: parseInt(reps), sets: parseInt(sets), type: 'strength' };
    } else {
      const weight = document.getElementById('log-weight').value;
      if (!weight || !reps || !sets) { showToast('Fill all fields', 'warning'); return; }
      logData = { weight: parseFloat(weight), reps: parseInt(reps), sets: parseInt(sets), type: 'strength' };
    }
    const wmEl = document.getElementById('log-weight-mode');
    if (wmEl) logData.weightMode = wmEl.value;
  } else {
    const mins = parseInt(document.getElementById('log-time-min').value) || 0;
    const secs = parseInt(document.getElementById('log-time-sec').value) || 0;
    const time = parseFloat((mins + secs / 60).toFixed(2));
    const sets = document.getElementById('log-sets').value;
    if ((!mins && !secs) || !sets) { showToast('Fill all fields', 'warning'); return; }
    logData = { time, sets: parseInt(sets), type: wType };
    const optWeight = document.getElementById('log-weight-optional')?.value;
    if (optWeight) logData.weight = parseFloat(optWeight);
  }

  const oldLifetimePR = getLifetimePRValue(workoutId, planId, wType);
  const newValue = getPRValue(wType, logData);

  logs[date][planId][workoutId] = logData;
  DB.saveWorkoutLogs(logs);

  if (newValue > 0 && newValue >= oldLifetimePR && oldLifetimePR > 0) {
    addDisciplinePoints(1, `Workout PR: ${wName}`);
    showToast(`New PR for ${wName}! +1 discipline point 🎉`, 'success');
    fireConfetti();
  } else {
    showToast('Workout logged!', 'success');
  }

  addActivity('workout', `Logged ${wName}: ${wType === 'strength' ? logData.weight + 'kg × ' + logData.reps + ' × ' + logData.sets : logData.time + 'min × ' + logData.sets}`);
  closeModal('log-workout-modal');
  loadWorkoutTracker();
  checkPerfGoals();
}

function getLifetimePRValue(workoutId, planId, type) {
  const logs = DB.getWorkoutLogs();
  let best = 0;
  for (const [, planLogs] of Object.entries(logs)) {
    if (planLogs[planId] && planLogs[planId][workoutId]) {
      const val = getPRValue(type, planLogs[planId][workoutId]);
      if (val > best) best = val;
    }
  }
  return best;
}

function deleteWorkoutLog(planId, workoutId) {
  if (!confirm('Delete this workout log?')) return;
  const date = document.getElementById('workout-tracker-date').value;
  const logs = DB.getWorkoutLogs();
  if (logs[date]?.[planId]?.[workoutId]) {
    delete logs[date][planId][workoutId];
    DB.saveWorkoutLogs(logs);
    showToast('Workout log deleted', 'info');
    addActivity('workout', 'Deleted a workout log');
    loadWorkoutTracker();
  }
}

/* ---- Swap / Move Workout Between Days ---- */
function openSwapWorkout(planId, workoutId, fromDay) {
  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  document.getElementById('swap-workout-id').value = workoutId;
  document.getElementById('swap-workout-plan-id').value = planId;
  document.getElementById('swap-workout-from-day').value = fromDay;

  const select = document.getElementById('swap-workout-target');
  select.innerHTML = '';
  for (let i = 1; i <= plan.days; i++) {
    if (String(i) === String(fromDay)) continue;
    const dayName = getPlanDayName(plan, i);
    select.innerHTML += `<option value="${i}">${escapeHtml(dayName)}</option>`;
  }
  if (fromDay !== 'optional') {
    select.innerHTML += `<option value="optional">⭐ Optional</option>`;
  }
  openModal('swap-workout-modal');
}

function confirmSwapWorkout() {
  const planId = document.getElementById('swap-workout-plan-id').value;
  const workoutId = document.getElementById('swap-workout-id').value;
  const fromDay = document.getElementById('swap-workout-from-day').value;
  const toDay = document.getElementById('swap-workout-target').value;

  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  const fromList = plan.workouts[fromDay] || [];
  const wIndex = fromList.findIndex(w => w.id === workoutId);
  if (wIndex === -1) return;

  const w = fromList.splice(wIndex, 1)[0];

  // Clean up superset/alternative links when moving
  delete w.supersetWith;
  delete w.alternativeOf;
  for (const d of Object.keys(plan.workouts)) {
    for (const ww of plan.workouts[d]) {
      if (ww.supersetWith === workoutId) delete ww.supersetWith;
      if (ww.alternativeOf === workoutId) delete ww.alternativeOf;
    }
  }

  if (!plan.workouts[toDay]) plan.workouts[toDay] = [];
  plan.workouts[toDay].push(w);
  DB.savePlans(plans);

  const toName = toDay === 'optional' ? 'Optional' : getPlanDayName(plan, toDay);
  closeModal('swap-workout-modal');
  showToast(`Moved "${w.name}" to ${toName}`, 'success');
  loadWorkoutTracker();
}

/* ---- Workout History + Chart ---- */
function showWorkoutHistory(planId, workoutId, name, type) {
  document.getElementById('workout-history-title').textContent = `History: ${name}`;
  const logs = DB.getWorkoutLogs();

  const entries = [];
  for (const [date, planLogs] of Object.entries(logs)) {
    if (planLogs[planId] && planLogs[planId][workoutId]) {
      entries.push({ date, ...planLogs[planId][workoutId] });
    }
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));

  const content = document.getElementById('workout-history-content');
  if (entries.length === 0) {
    content.innerHTML = '<p class="empty-state">No history yet</p>';
  } else {
    content.innerHTML = entries.map(e => {
      const stats = type === 'strength'
        ? `${e.weight}kg × ${e.reps} reps × ${e.sets} sets`
        : `${e.time} min × ${e.sets} sets`;
      return `
        <div class="history-entry">
          <span class="history-date">${formatDate(e.date)}</span>
          <span class="history-stats">${stats}</span>
          <div class="history-actions">
            <button class="btn btn-xs btn-danger" onclick="deleteHistoryEntry('${planId}','${workoutId}','${e.date}')">✕</button>
          </div>
        </div>`;
    }).join('');
  }

  renderWorkoutChart(entries, type);
  openModal('workout-history-modal');
}

function deleteHistoryEntry(planId, workoutId, date) {
  if (!confirm('Delete this entry?')) return;
  const logs = DB.getWorkoutLogs();
  if (logs[date]?.[planId]?.[workoutId]) {
    delete logs[date][planId][workoutId];
    DB.saveWorkoutLogs(logs);
    showToast('Entry deleted', 'info');
    const plans = DB.getPlans();
    const plan = plans.find(p => p.id === planId);
    let wName = 'Workout', wType = 'strength';
    if (plan) {
      for (const day of Object.values(plan.workouts)) {
        const found = day.find(w => w.id === workoutId);
        if (found) { wName = found.name; wType = found.type; break; }
      }
    }
    showWorkoutHistory(planId, workoutId, wName, wType);
    loadWorkoutTracker();
  }
}

function renderWorkoutChart(entries, type) {
  const canvas = document.getElementById('workout-progress-chart');
  if (workoutChart) workoutChart.destroy();
  if (entries.length === 0) return;

  const labels = entries.map(e => formatDate(e.date));
  const data = entries.map(e => getPRValue(type, e));
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  workoutChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: type === 'strength' ? 'Volume (kg × reps)' : 'Total Time (min)',
        data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: '#3b82f6',
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: isDark ? '#e8e8f0' : '#1a1a2e' } } },
      scales: {
        x: { ticks: { color: isDark ? '#a0a0b8' : '#555770' }, grid: { color: isDark ? '#33334d' : '#e2e5ea' } },
        y: { ticks: { color: isDark ? '#a0a0b8' : '#555770' }, grid: { color: isDark ? '#33334d' : '#e2e5ea' } }
      }
    }
  });
}

/* ---- Workout Calendar View ---- */
let workoutCalMonth = null;

function initWorkoutCalendar() {
  if (!workoutCalMonth) {
    const now = new Date();
    workoutCalMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  renderWorkoutCalendar();
}

function changeWorkoutCalMonth(delta) {
  workoutCalMonth.setMonth(workoutCalMonth.getMonth() + delta);
  renderWorkoutCalendar();
}

function renderWorkoutCalendar() {
  const label = document.getElementById('workout-cal-month-label');
  const grid = document.getElementById('workout-cal-grid');
  if (!label || !grid) return;

  const year = workoutCalMonth.getFullYear();
  const month = workoutCalMonth.getMonth();
  label.textContent = workoutCalMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const workoutLogs = DB.getWorkoutLogs();
  const runLogs = DB.getRunLogs();
  const plans = DB.getPlans();
  const todayStr_ = todayStr();

  // Build workout name lookup
  const nameMap = {};
  for (const p of plans) {
    if (!p.workouts) continue;
    for (const dk of Object.keys(p.workouts)) {
      for (const w of p.workouts[dk]) {
        nameMap[w.id] = w.name;
      }
    }
  }

  // Build per-day activity data
  const dayActivity = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    const hasWorkout = workoutLogs[ds] && Object.keys(workoutLogs[ds]).some(pid => Object.keys(workoutLogs[ds][pid]).length > 0);
    const hasRun = runLogs.some(r => r.date === ds);
    dayActivity[ds] = { hasWorkout, hasRun };
  }

  // Find consecutive inactive days (no workout AND no run) to detect missed streaks
  const inactiveDays = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    if (ds >= todayStr_) continue; // don't mark today or future
    const data = dayActivity[ds];
    if (!data.hasWorkout && !data.hasRun) {
      // Count consecutive inactive days ending at this day
      let count = 0;
      const d2 = new Date(year, month, day);
      while (true) {
        const ds2 = d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0') + '-' + String(d2.getDate()).padStart(2, '0');
        const a = dayActivity[ds2];
        if (a && !a.hasWorkout && !a.hasRun && ds2 < todayStr_) {
          count++;
          d2.setDate(d2.getDate() - 1);
        } else {
          break;
        }
      }
      if (count >= 3) inactiveDays[ds] = true;
    }
  }

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let html = dayLabels.map(d => `<div class="wcal-day-label">${d}</div>`).join('');

  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < offset; i++) html += `<div class="wcal-cell empty"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    const dayLogs = workoutLogs[ds];
    const isToday = ds === todayStr_ ? ' wcal-today' : '';
    const isFuture = ds > todayStr_ ? ' wcal-future' : '';
    const isMissed = inactiveDays[ds] ? ' wcal-missed' : '';

    let workoutNames = [];
    if (dayLogs) {
      for (const planId of Object.keys(dayLogs)) {
        for (const wId of Object.keys(dayLogs[planId])) {
          workoutNames.push(nameMap[wId] || 'Workout');
        }
      }
    }

    const data = dayActivity[ds];
    const hasWorkouts = workoutNames.length > 0 ? ' wcal-active' : '';
    const dots = workoutNames.length > 0
      ? `<div class="wcal-dots">${workoutNames.slice(0, 3).map(() => '<span class="wcal-dot"></span>').join('')}${workoutNames.length > 3 ? '<span class="wcal-dot-more">+</span>' : ''}</div>`
      : '';

    // Smart day tag: run emoji if ran, rest emoji if no activity (past), nothing for future
    let dayTag = '';
    if (ds < todayStr_) {
      if (data.hasRun) {
        dayTag = '<span class="streak-day-tag run">🏃</span>';
      } else if (!data.hasWorkout) {
        dayTag = inactiveDays[ds] ? '<span class="streak-day-tag missed">❌</span>' : '<span class="streak-day-tag rest">😴</span>';
      }
    } else if (ds === todayStr_) {
      if (data.hasRun) dayTag = '<span class="streak-day-tag run">🏃</span>';
    }

    html += `<div class="wcal-cell${hasWorkouts}${isToday}${isFuture}${isMissed}" onclick="showWorkoutCalDetail('${ds}')">
      <span class="wcal-day-num">${day}</span>
      ${dayTag}
      ${dots}
    </div>`;
  }

  grid.innerHTML = html;
}

function showWorkoutCalDetail(dateStr) {
  const workoutLogs = DB.getWorkoutLogs();
  const runLogs = DB.getRunLogs();
  const plans = DB.getPlans();
  const dayLogs = workoutLogs[dateStr];

  const existing = document.getElementById('wcal-detail-popup');
  if (existing) existing.remove();

  const nameMap = {};
  for (const p of plans) {
    if (!p.workouts) continue;
    for (const dk of Object.keys(p.workouts)) {
      for (const w of p.workouts[dk]) nameMap[w.id] = w.name;
    }
  }

  let workouts = [];
  if (dayLogs) {
    for (const planId of Object.keys(dayLogs)) {
      for (const wId of Object.keys(dayLogs[planId])) {
        const log = dayLogs[planId][wId];
        const name = nameMap[wId] || 'Workout';
        let detail = '';
        if (log.type === 'strength') {
          if (log.bodyweight != null) {
            const addedLabel = log.addedWeight > 0 ? ` + ${log.addedWeight}kg` : '';
            detail = `${log.bodyweight}kg BW${addedLabel} = ${log.weight}kg × ${log.reps} reps × ${log.sets} sets`;
          } else {
            const modeLabel = log.weightMode === 'perside' ? ' (per side)' : '';
            detail = `${log.weight}kg${modeLabel} × ${log.reps} reps × ${log.sets} sets`;
          }
        } else if (log.time) {
          detail = `${formatTime(log.time)} × ${log.sets} sets${log.weight ? ' · ' + log.weight + 'kg' : ''}`;
        }
        workouts.push({ name, detail });
      }
    }
  }

  // Day's runs
  const dayRuns = runLogs.filter(r => r.date === dateStr);

  const popup = document.createElement('div');
  popup.id = 'wcal-detail-popup';
  popup.className = 'streak-detail-popup';

  const totalItems = workouts.length + dayRuns.length;

  if (totalItems === 0) {
    popup.innerHTML = `
      <div class="streak-detail-header">
        <span class="streak-detail-date">${formatDate(dateStr)}</span>
        <button class="btn-icon streak-detail-close" onclick="this.closest('.streak-detail-popup').remove()">&times;</button>
      </div>
      <div class="streak-detail-empty">No activity logged</div>`;
  } else {
    const summary = [];
    if (workouts.length > 0) summary.push(`${workouts.length} workout${workouts.length > 1 ? 's' : ''}`);
    if (dayRuns.length > 0) summary.push(`${dayRuns.length} run${dayRuns.length > 1 ? 's' : ''}`);

    popup.innerHTML = `
      <div class="streak-detail-header">
        <span class="streak-detail-date">${formatDate(dateStr)}</span>
        <span class="streak-detail-dp">${summary.join(' · ')}</span>
        <button class="btn-icon streak-detail-close" onclick="this.closest('.streak-detail-popup').remove()">&times;</button>
      </div>
      ${workouts.map(w => `
        <div class="streak-detail-group">
          <div class="streak-detail-group-title">💪 ${escapeHtml(w.name)}</div>
          ${w.detail ? `<div style="font-size:0.8rem;color:var(--text-secondary);padding-left:20px;">${escapeHtml(w.detail)}</div>` : ''}
        </div>`).join('')}
      ${dayRuns.map(r => `
        <div class="streak-detail-group">
          <div class="streak-detail-group-title">🏃 ${r.distance}km run</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);padding-left:20px;">${r.time > 0 ? formatTime(r.time) + ' · ' + formatPace(r.pace) + ' /km' : 'No time recorded'}</div>
        </div>`).join('')}`;
  }

  document.querySelector('.workout-cal-body').appendChild(popup);

  setTimeout(() => {
    function onOutside(e) {
      if (!popup.contains(e.target) && !e.target.closest('.wcal-cell')) {
        popup.remove();
        document.removeEventListener('click', onOutside);
      }
    }
    document.addEventListener('click', onOutside);
  }, 0);
}
