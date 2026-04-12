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
    </div>`;
}

function initWorkoutTracker() {
  const dateInput = document.getElementById('workout-tracker-date');
  if (!dateInput.value) dateInput.value = todayStr();
  populatePlanSelect();
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

  // Gather workouts based on selected day
  const allWorkouts = [];
  const daysToShow = activeDay === 'all'
    ? Object.keys(plan.workouts)
    : [activeDay];

  for (const day of daysToShow) {
    const workouts = plan.workouts[day] || [];
    for (const w of workouts) {
      allWorkouts.push({ ...w, day });
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
  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-state">No workouts for this selection. Add workouts in the Planner.</p>';
    return;
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
        ${dayContent}
      </div>`;
    }
    container.innerHTML = fullHtml;
  } else {
    container.innerHTML = renderWorkoutGroup(filtered, planId, date, dayLogs, plan);
  }
}

function renderWorkoutGroup(workouts, planId, date, dayLogs, plan) {
  const rendered = new Set();
  let singlesHtml = '';
  let groupsHtml = '';

  for (const w of workouts) {
    if (rendered.has(w.id)) continue;
    rendered.add(w.id);

    // Superset pair
    if (w.supersetWith) {
      const partner = workouts.find(x => x.id === w.supersetWith);
      if (partner && !rendered.has(partner.id)) {
        rendered.add(partner.id);
        groupsHtml += `<div class="superset-group">
          <div class="group-label superset-label">🔗 SUPERSET</div>
          <div class="group-cards">
            ${buildTrackerCard(w, planId, date, dayLogs, plan)}
            ${buildTrackerCard(partner, planId, date, dayLogs, plan)}
          </div>
        </div>`;
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
        groupsHtml += `<div class="alternative-group">
          <div class="group-label alternative-label">🔀 ALTERNATIVE — pick one</div>
          <div class="group-cards">
            ${buildTrackerCard(w, planId, date, dayLogs, plan, dimA)}
            <div class="alt-or-divider">OR</div>
            ${buildTrackerCard(partner, planId, date, dayLogs, plan, dimB)}
          </div>
        </div>`;
        continue;
      }
    }

    // Normal card
    singlesHtml += buildTrackerCard(w, planId, date, dayLogs, plan);
  }

  return singlesHtml + groupsHtml;
}

/* ---- Build Single Tracker Card ---- */
function buildTrackerCard(w, planId, date, dayLogs, plan, extraClass) {
  const log = dayLogs[w.id];
  const { currentPR, lifetimePR, isNewPR } = calculatePR(w, planId, date);
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
      logSummary = `${log.time} min × ${log.sets} sets`;
    }
  }

  return `
    <div class="tracker-card${extraClass || ''}">
      <div class="tracker-card-header">
        <span class="tracker-card-title">${escapeHtml(w.name)}</span>
        <span class="tracker-card-badge ${badgeClass}">${w.type}</span>
      </div>
      <div class="tracker-card-muscle">🎯 ${w.muscle.charAt(0).toUpperCase() + w.muscle.slice(1)} · ${w.equipment ? w.equipment.charAt(0).toUpperCase() + w.equipment.slice(1) + ' · ' : ''}${escapeHtml(dayName)}</div>
      ${isNewPR ? '<div class="new-pr-message">🎉 New PR!</div>' : ''}
      <div class="pr-row">
        <div class="pr-item">
          <span class="pr-label">Current PR</span>
          <span class="pr-value">${currentPR || '--'}</span>
        </div>
        <div class="pr-item">
          <span class="pr-label">Lifetime PR</span>
          <span class="pr-value">${lifetimePR || '--'}</span>
        </div>
      </div>
      ${log ? `<div class="tracker-log-summary">📊 ${logSummary}</div>` : ''}
      <div class="tracker-card-actions">
        <button class="btn btn-primary btn-sm" onclick="openLogWorkout('${planId}','${w.id}','${w.type}','${w.equipment || 'barbell'}')">${log ? '✏️ Edit' : '📝 Log'}</button>
        ${log ? `<button class="btn btn-danger btn-sm" onclick="deleteWorkoutLog('${planId}','${w.id}')">🗑️</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="showWorkoutHistory('${planId}','${w.id}','${escapeHtml(w.name)}','${w.type}')">📈 History</button>
        ${log && log.weightMode ? `<span class="weight-mode-tag ${log.weightMode}">${log.weightMode === 'perside' ? 'Per Side' : 'Combined'}</span>` : ''}
      </div>
    </div>`;
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
  let lifetimeBestVal = 0, lifetimeBestLog = null;
  let currentDayBestVal = 0, currentDayBestLog = null;

  for (const [date, planLogs] of Object.entries(logs)) {
    if (planLogs[planId] && planLogs[planId][workout.id]) {
      const log = planLogs[planId][workout.id];
      const val = getPRValue(workout.type, log);
      if (val > lifetimeBestVal) { lifetimeBestVal = val; lifetimeBestLog = log; }
      if (date === currentDate && val > currentDayBestVal) { currentDayBestVal = val; currentDayBestLog = log; }
    }
  }

  const isNewPR = currentDayBestVal > 0 && currentDayBestVal >= lifetimeBestVal;
  return {
    currentPR: currentDayBestLog ? formatPR(workout.type, currentDayBestLog) : null,
    lifetimePR: lifetimeBestLog ? formatPR(workout.type, lifetimeBestLog) : null,
    isNewPR
  };
}

function getPRValue(type, log) {
  if (type === 'strength') {
    return (parseFloat(log.weight) || 0) * (parseInt(log.reps) || 1);
  }
  return (parseFloat(log.time) || 0) * (parseInt(log.sets) || 1);
}

function formatPR(type, log) {
  if (type === 'strength') return `${log.weight}kg × ${log.reps} reps`;
  return `${log.time} min × ${log.sets} sets`;
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
      const addedWeight = existing ? (existing.addedWeight != null ? existing.addedWeight : 0) : 0;
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
          <input type="number" id="log-weight" step="0.5" value="${existing ? existing.weight : ''}" placeholder="e.g., 80" />
        </div>`;
    }
    fields.innerHTML = weightFieldHtml + `
      <div class="form-row">
        <label>Reps</label>
        <input type="number" id="log-reps" value="${existing ? existing.reps : ''}" placeholder="e.g., 10" />
      </div>
      <div class="form-row">
        <label>Sets</label>
        <input type="number" id="log-sets" value="${existing ? existing.sets : ''}" placeholder="e.g., 3" />
      </div>
      <div class="form-row">
        <label>Weight Mode</label>
        <select id="log-weight-mode">
          <option value="combined"${!existing || existing.weightMode !== 'perside' ? ' selected' : ''}>Combined</option>
          <option value="perside"${existing && existing.weightMode === 'perside' ? ' selected' : ''}>Per Side</option>
        </select>
      </div>`;
  } else {
    fields.innerHTML = `
      <div class="form-row">
        <label>Time (minutes)</label>
        <input type="number" id="log-time" step="0.5" value="${existing ? existing.time : ''}" placeholder="e.g., 30" />
      </div>
      <div class="form-row">
        <label>Sets</label>
        <input type="number" id="log-sets" value="${existing ? existing.sets : ''}" placeholder="e.g., 3" />
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
    const time = document.getElementById('log-time').value;
    const sets = document.getElementById('log-sets').value;
    if (!time || !sets) { showToast('Fill all fields', 'warning'); return; }
    logData = { time: parseFloat(time), sets: parseInt(sets), type: wType };
  }

  const oldLifetimePR = getLifetimePRValue(workoutId, planId, wType);
  const newValue = getPRValue(wType, logData);

  logs[date][planId][workoutId] = logData;
  DB.saveWorkoutLogs(logs);

  if (newValue > 0 && newValue >= oldLifetimePR && oldLifetimePR > 0) {
    addDisciplinePoints(1, `Workout PR: ${wName}`);
    showToast(`New PR for ${wName}! +1 discipline point 🎉`, 'success');
  } else {
    showToast('Workout logged!', 'success');
  }

  addActivity('workout', `Logged ${wName}: ${wType === 'strength' ? logData.weight + 'kg × ' + logData.reps + ' × ' + logData.sets : logData.time + 'min × ' + logData.sets}`);
  closeModal('log-workout-modal');
  loadWorkoutTracker();
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
