/* ===============================================
   GOALS.JS – Monthly Goals & Target-Date Goals
   =============================================== */

function getGoalsTemplate() {
  return `
    <h1 class="page-title">🎯 Goals</h1>

    <div class="goals-tabs">
      <button class="goals-tab active" data-tab="monthly" onclick="switchGoalTab('monthly')">📅 Monthly</button>
      <button class="goals-tab" data-tab="targeted" onclick="switchGoalTab('targeted')">🏁 Target</button>
      <button class="goals-tab" data-tab="performance" onclick="switchGoalTab('performance')">🏋️ Performance</button>
    </div>

    <div id="goals-tab-monthly" class="goals-tab-content active">
      <div class="goals-month-nav">
        <button class="btn btn-icon" onclick="changeGoalMonth(-1)">◀</button>
        <span id="goals-month-label" class="goals-month-label"></span>
        <button class="btn btn-icon" onclick="changeGoalMonth(1)">▶</button>
      </div>
      <div id="monthly-goals-list" class="goals-list"></div>
      <button class="btn btn-primary goals-add-btn" onclick="openAddGoalModal('monthly')">+ Add Monthly Goal</button>
    </div>

    <div id="goals-tab-targeted" class="goals-tab-content">
      <div id="targeted-goals-list" class="goals-list"></div>
      <button class="btn btn-primary goals-add-btn" onclick="openAddGoalModal('targeted')">+ Add Target Goal</button>
    </div>

    <div id="goals-tab-performance" class="goals-tab-content">
      <div id="performance-goals-list" class="goals-list"></div>
      <button class="btn btn-primary goals-add-btn" onclick="openPerfGoalModal()">+ Add Performance Goal</button>
    </div>

    <!-- Performance Goal Modal -->
    <div id="perf-goal-modal" class="modal-overlay" style="display:none;">
      <div class="modal">
        <div class="modal-header">
          <h2 id="perf-goal-modal-title">Add Performance Goal</h2>
          <button class="btn-icon" onclick="closeModal('perf-goal-modal')">&times;</button>
        </div>
        <div class="form-row">
          <label>Goal Type</label>
          <select id="perf-goal-type" onchange="onPerfGoalTypeChange()">
            <option value="lift_weight">🏋️ Lift Target Weight</option>
            <option value="lift_reps">💪 Hit Target Reps</option>
            <option value="run_pace">🏃 Run Target Pace</option>
          </select>
        </div>
        <div id="perf-workout-fields">
          <div class="form-row">
            <label>Select Workout</label>
            <select id="perf-goal-workout"></select>
          </div>
          <div class="form-row" id="perf-weight-row">
            <label>Target Weight (kg)</label>
            <input type="number" id="perf-goal-weight" placeholder="e.g. 100" min="1" step="0.5" />
          </div>
          <div class="form-row" id="perf-reps-row" style="display:none;">
            <label>Target Reps</label>
            <input type="number" id="perf-goal-reps" placeholder="e.g. 12" min="1" />
          </div>
        </div>
        <div id="perf-run-fields" style="display:none;">
          <div class="form-row">
            <label>Target Pace (min/km) <span class="hint">e.g. 5:30</span></label>
            <div class="time-input-group">
              <input type="number" id="perf-pace-min" placeholder="min" min="0" max="59" />
              <span class="time-sep">:</span>
              <input type="number" id="perf-pace-sec" placeholder="sec" min="0" max="59" />
            </div>
          </div>
          <div class="form-row">
            <label>Minimum Distance (km) <span class="hint">(optional, 0 = any)</span></label>
            <input type="number" id="perf-min-distance" value="0" min="0" step="0.1" />
          </div>
        </div>
        <div class="form-row">
          <label>Reward DP <span class="hint">(earned on completion)</span></label>
          <input type="number" id="perf-goal-reward" value="50" min="1" />
        </div>
        <input type="hidden" id="perf-goal-edit-id" />
        <button class="btn btn-primary" id="perf-goal-save-btn" onclick="savePerfGoal()">Add Goal</button>
      </div>
    </div>

    <!-- Add/Edit Goal Modal -->
    <div id="goal-modal" class="modal-overlay" style="display:none;">
      <div class="modal">
        <div class="modal-header">
          <h2 id="goal-modal-title">Add Goal</h2>
          <button class="btn-icon" onclick="closeModal('goal-modal')">&times;</button>
        </div>
        <div class="form-row">
          <label>Goal Title</label>
          <input type="text" id="goal-title" placeholder="e.g. Run 50km total" maxlength="80" />
        </div>
        <div class="form-row">
          <label>Details / Description</label>
          <textarea id="goal-details" rows="3" placeholder="Optional details about this goal..."></textarea>
        </div>
        <div class="form-row" id="goal-target-date-row" style="display:none;">
          <label>Target Date</label>
          <input type="date" id="goal-target-date" />
        </div>
        <div class="form-row" id="goal-month-row">
          <label>Month</label>
          <input type="month" id="goal-month" />
        </div>
        <div class="form-row">
          <label>Reward DP <span class="hint">(earned on completion)</span></label>
          <input type="number" id="goal-reward-dp" value="25" min="0" />
        </div>
        <div class="form-row checkbox-row">
          <label>
            <input type="checkbox" id="goal-has-dp-target" onchange="toggleGoalDPTarget()" />
            Set a DP earning target
          </label>
        </div>
        <div id="goal-dp-target-fields" style="display:none;">
          <div class="form-row">
            <label>Target DP to Earn</label>
            <input type="number" id="goal-dp-target" value="100" min="1" />
          </div>
          <div class="form-row">
            <label>Count DP From <span class="hint">(select activities)</span></label>
            <div class="goal-source-checks">
              <label class="checkbox-label"><input type="checkbox" value="habits" checked /> ✅ Habits</label>
              <label class="checkbox-label"><input type="checkbox" value="bonuses" checked /> 🏆 Bonuses</label>
              <label class="checkbox-label"><input type="checkbox" value="workouts" /> 💪 Workouts</label>
              <label class="checkbox-label"><input type="checkbox" value="running" /> 🏃 Running</label>
              <label class="checkbox-label"><input type="checkbox" value="actions" /> ⚡ Actions</label>
            </div>
          </div>
        </div>
        <input type="hidden" id="goal-edit-id" />
        <input type="hidden" id="goal-modal-type" />
        <button class="btn btn-primary" id="goal-save-btn" onclick="saveGoal()">Save Goal</button>
      </div>
    </div>`;
}

let currentGoalMonth = null; // "YYYY-MM"

function initGoals() {
  const now = new Date();
  currentGoalMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  renderGoals();
  renderPerfGoals();
}

function refreshGoals() {
  initGoals();
}

function switchGoalTab(tab) {
  document.querySelectorAll('.goals-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.goals-tab[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.goals-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('goals-tab-' + tab).classList.add('active');
}

function changeGoalMonth(delta) {
  const [y, m] = currentGoalMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  currentGoalMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  renderGoals();
}

function renderGoals() {
  const goals = DB.getGoals();

  // Monthly goals
  const monthLabel = document.getElementById('goals-month-label');
  const monthDate = new Date(currentGoalMonth + '-01T00:00:00');
  monthLabel.textContent = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const monthlyGoals = goals.filter(g => g.type === 'monthly' && g.month === currentGoalMonth);
  const monthlyList = document.getElementById('monthly-goals-list');

  if (monthlyGoals.length === 0) {
    monthlyList.innerHTML = '<div class="empty-state">No goals for this month. Add one!</div>';
  } else {
    monthlyList.innerHTML = monthlyGoals.map(g => renderGoalCard(g)).join('');
  }

  // Targeted goals
  const targetedGoals = goals.filter(g => g.type === 'targeted')
    .sort((a, b) => (a.targetDate || '').localeCompare(b.targetDate || ''));
  const targetedList = document.getElementById('targeted-goals-list');

  if (targetedGoals.length === 0) {
    targetedList.innerHTML = '<div class="empty-state">No target goals yet. Set a date and go for it!</div>';
  } else {
    targetedList.innerHTML = targetedGoals.map(g => renderGoalCard(g)).join('');
  }
}

function getGoalDPProgress(g) {
  if (!g.dpTarget || !g.dpStartDate) return null;
  const log = DB.getPointsLog();
  let earned = 0;
  for (const entry of log) {
    if (entry.date < g.dpStartDate || entry.points <= 0) continue;
    const source = classifyPointsEntry(entry.description || '');
    if (source && g.dpSources.includes(source)) {
      earned += entry.points;
    }
  }
  return { earned: Math.min(earned, g.dpTarget), target: g.dpTarget };
}

function renderGoalCard(g) {
  const isCompleted = g.completed;
  const statusClass = isCompleted ? 'goal-completed' : '';

  let dateInfo = '';
  if (g.type === 'targeted' && g.targetDate) {
    const target = new Date(g.targetDate + 'T00:00:00');
    const today = new Date(todayStr() + 'T00:00:00');
    const daysLeft = Math.ceil((target - today) / 86400000);

    if (isCompleted) {
      dateInfo = `<span class="goal-date-info completed">✅ Completed</span>`;
    } else if (daysLeft < 0) {
      dateInfo = `<span class="goal-date-info overdue">⚠️ ${Math.abs(daysLeft)} days overdue</span>`;
    } else if (daysLeft === 0) {
      dateInfo = `<span class="goal-date-info today">🔥 Due today!</span>`;
    } else {
      dateInfo = `<span class="goal-date-info">${daysLeft} day${daysLeft !== 1 ? 's' : ''} left</span>`;
    }
  }

  const targetDateDisplay = g.type === 'targeted' && g.targetDate
    ? `<div class="goal-target-date">🏁 ${formatDate(g.targetDate)}</div>` : '';

  return `
    <div class="goal-card ${statusClass}">
      <div class="goal-card-header">
        <button class="goal-check-btn ${isCompleted ? 'checked' : ''}" onclick="toggleGoalComplete('${g.id}')" title="${isCompleted ? 'Mark incomplete' : 'Mark complete'}">
          ${isCompleted ? '✅' : '⬜'}
        </button>
        <div class="goal-card-info">
          <h3 class="goal-title">${escapeHtml(g.title)}</h3>
          ${targetDateDisplay}
          ${dateInfo}
        </div>
        <div class="goal-card-actions">
          <button class="btn btn-xs btn-outline" onclick="openEditGoalModal('${g.id}')" title="Edit">✏️</button>
          <button class="btn btn-xs btn-danger" onclick="deleteGoal('${g.id}')">✕</button>
        </div>
      </div>
      ${g.details ? `<div class="goal-details">${escapeHtml(g.details)}</div>` : ''}
      ${(g.rewardDP != null && g.rewardDP > 0) ? `<div class="goal-reward-dp">⚡ ${g.rewardDP} DP reward</div>` : ''}
    </div>`;
}

function toggleGoalDPTarget() {
  const checked = document.getElementById('goal-has-dp-target').checked;
  document.getElementById('goal-dp-target-fields').style.display = checked ? 'block' : 'none';
}

function openAddGoalModal(type) {
  document.getElementById('goal-modal-title').textContent = type === 'monthly' ? 'Add Monthly Goal' : 'Add Target Goal';
  document.getElementById('goal-title').value = '';
  document.getElementById('goal-details').value = '';
  document.getElementById('goal-edit-id').value = '';
  document.getElementById('goal-modal-type').value = type;

  const targetRow = document.getElementById('goal-target-date-row');
  const monthRow = document.getElementById('goal-month-row');

  if (type === 'targeted') {
    targetRow.style.display = 'block';
    monthRow.style.display = 'none';
    document.getElementById('goal-target-date').value = '';
  } else {
    targetRow.style.display = 'none';
    monthRow.style.display = 'block';
    document.getElementById('goal-month').value = currentGoalMonth;
  }

  document.getElementById('goal-reward-dp').value = '25';
  document.getElementById('goal-has-dp-target').checked = false;
  document.getElementById('goal-dp-target-fields').style.display = 'none';
  document.getElementById('goal-dp-target').value = '100';
  document.querySelectorAll('.goal-source-checks input[type="checkbox"]').forEach(cb => {
    cb.checked = cb.value === 'habits' || cb.value === 'bonuses';
  });

  document.getElementById('goal-save-btn').textContent = 'Add Goal';
  openModal('goal-modal');
}

function openEditGoalModal(id) {
  const goals = DB.getGoals();
  const g = goals.find(x => x.id === id);
  if (!g) return;

  document.getElementById('goal-modal-title').textContent = 'Edit Goal';
  document.getElementById('goal-title').value = g.title;
  document.getElementById('goal-details').value = g.details || '';
  document.getElementById('goal-edit-id').value = g.id;
  document.getElementById('goal-modal-type').value = g.type;

  const targetRow = document.getElementById('goal-target-date-row');
  const monthRow = document.getElementById('goal-month-row');

  if (g.type === 'targeted') {
    targetRow.style.display = 'block';
    monthRow.style.display = 'none';
    document.getElementById('goal-target-date').value = g.targetDate || '';
  } else {
    targetRow.style.display = 'none';
    monthRow.style.display = 'block';
    document.getElementById('goal-month').value = g.month || currentGoalMonth;
  }

  // Reward DP
  document.getElementById('goal-reward-dp').value = g.rewardDP != null ? g.rewardDP : 25;

  // DP target fields
  if (g.dpTarget) {
    document.getElementById('goal-has-dp-target').checked = true;
    document.getElementById('goal-dp-target-fields').style.display = 'block';
    document.getElementById('goal-dp-target').value = g.dpTarget;
    document.querySelectorAll('.goal-source-checks input[type="checkbox"]').forEach(cb => {
      cb.checked = (g.dpSources || []).includes(cb.value);
    });
  } else {
    document.getElementById('goal-has-dp-target').checked = false;
    document.getElementById('goal-dp-target-fields').style.display = 'none';
    document.getElementById('goal-dp-target').value = '100';
    document.querySelectorAll('.goal-source-checks input[type="checkbox"]').forEach(cb => {
      cb.checked = cb.value === 'habits' || cb.value === 'bonuses';
    });
  }

  document.getElementById('goal-save-btn').textContent = 'Save Changes';
  openModal('goal-modal');
}

function saveGoal() {
  const title = document.getElementById('goal-title').value.trim();
  if (!title) { showToast('Enter a goal title', 'warning'); return; }

  const type = document.getElementById('goal-modal-type').value;
  const editId = document.getElementById('goal-edit-id').value;
  const details = document.getElementById('goal-details').value.trim();

  const goals = DB.getGoals();

  const rewardDP = parseInt(document.getElementById('goal-reward-dp').value) || 0;

  // DP target fields
  const hasDPTarget = document.getElementById('goal-has-dp-target').checked;
  let dpTarget = null;
  let dpSources = [];
  let dpStartDate = null;
  if (hasDPTarget) {
    dpTarget = parseInt(document.getElementById('goal-dp-target').value) || 100;
    dpSources = Array.from(document.querySelectorAll('.goal-source-checks input[type="checkbox"]:checked')).map(cb => cb.value);
    if (dpSources.length === 0) { showToast('Select at least one activity source', 'warning'); return; }
  }

  if (editId) {
    const g = goals.find(x => x.id === editId);
    if (!g) return;
    g.title = title;
    g.details = details;
    if (type === 'targeted') {
      g.targetDate = document.getElementById('goal-target-date').value || null;
    } else {
      g.month = document.getElementById('goal-month').value || currentGoalMonth;
    }
    g.rewardDP = rewardDP;
    if (hasDPTarget) {
      if (!g.dpTarget) g.dpStartDate = new Date().toISOString();
      g.dpTarget = dpTarget;
      g.dpSources = dpSources;
    } else {
      delete g.dpTarget;
      delete g.dpSources;
      delete g.dpStartDate;
    }
    showToast('Goal updated', 'success');
  } else {
    const goal = {
      id: uid(),
      type,
      title,
      details,
      completed: false,
      createdAt: todayStr()
    };

    if (type === 'targeted') {
      goal.targetDate = document.getElementById('goal-target-date').value || null;
    } else {
      goal.month = document.getElementById('goal-month').value || currentGoalMonth;
    }

    goal.rewardDP = rewardDP;
    if (hasDPTarget) {
      goal.dpTarget = dpTarget;
      goal.dpSources = dpSources;
      goal.dpStartDate = new Date().toISOString();
    }

    goals.push(goal);
    showToast('Goal added! 🎯', 'success');
  }

  DB.saveGoals(goals);
  closeModal('goal-modal');
  renderGoals();
}

function toggleGoalComplete(id) {
  const goals = DB.getGoals();
  const g = goals.find(x => x.id === id);
  if (!g) return;

  g.completed = !g.completed;
  if (g.completed) {
    g.completedAt = todayStr();
    const dp = g.rewardDP != null ? g.rewardDP : 25;
    if (dp > 0) addDisciplinePoints(dp, `Goal completed: ${g.title}`);
    showToast(`Goal completed! 🎉${dp > 0 ? ' +' + dp + ' DP' : ''}`, 'success');
  } else {
    delete g.completedAt;
  }

  DB.saveGoals(goals);
  renderGoals();
}

function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  const goals = DB.getGoals().filter(g => g.id !== id);
  DB.saveGoals(goals);
  showToast('Goal deleted', 'info');
  renderGoals();
  renderPerfGoals();
}

/* ====================
   PERFORMANCE GOALS
   ==================== */

function getAllWorkoutsFromPlans() {
  const plans = DB.getPlans();
  const workouts = [];
  for (const plan of plans) {
    if (!plan.workouts) continue;
    for (const dayKey of Object.keys(plan.workouts)) {
      for (const w of plan.workouts[dayKey]) {
        if (w.type === 'strength' || w.type === 'isolation') {
          workouts.push({ id: w.id, name: w.name, planId: plan.id, planName: plan.name, type: w.type, muscle: w.muscle });
        }
      }
    }
  }
  return workouts;
}

function onPerfGoalTypeChange() {
  const type = document.getElementById('perf-goal-type').value;
  const workoutFields = document.getElementById('perf-workout-fields');
  const runFields = document.getElementById('perf-run-fields');
  const weightRow = document.getElementById('perf-weight-row');
  const repsRow = document.getElementById('perf-reps-row');

  if (type === 'run_pace') {
    workoutFields.style.display = 'none';
    runFields.style.display = 'block';
  } else {
    workoutFields.style.display = 'block';
    runFields.style.display = 'none';
    weightRow.style.display = type === 'lift_weight' ? 'block' : 'none';
    repsRow.style.display = type === 'lift_reps' ? 'block' : 'none';
  }
}

function populatePerfWorkoutSelect() {
  const select = document.getElementById('perf-goal-workout');
  const workouts = getAllWorkoutsFromPlans();
  if (workouts.length === 0) {
    select.innerHTML = '<option value="">No strength workouts found</option>';
    return;
  }
  select.innerHTML = workouts.map(w =>
    `<option value="${w.id}" data-plan="${w.planId}">${escapeHtml(w.name)} (${escapeHtml(w.planName)})</option>`
  ).join('');
}

function openPerfGoalModal() {
  document.getElementById('perf-goal-modal-title').textContent = 'Add Performance Goal';
  document.getElementById('perf-goal-type').value = 'lift_weight';
  document.getElementById('perf-goal-weight').value = '';
  document.getElementById('perf-goal-reps').value = '';
  document.getElementById('perf-pace-min').value = '';
  document.getElementById('perf-pace-sec').value = '';
  document.getElementById('perf-min-distance').value = '0';
  document.getElementById('perf-goal-reward').value = '50';
  document.getElementById('perf-goal-edit-id').value = '';
  document.getElementById('perf-goal-save-btn').textContent = 'Add Goal';
  onPerfGoalTypeChange();
  populatePerfWorkoutSelect();
  openModal('perf-goal-modal');
}

function openEditPerfGoalModal(id) {
  const goals = DB.getGoals();
  const g = goals.find(x => x.id === id);
  if (!g || !g.perfType) return;

  document.getElementById('perf-goal-modal-title').textContent = 'Edit Performance Goal';
  document.getElementById('perf-goal-type').value = g.perfType;
  document.getElementById('perf-goal-reward').value = g.reward || 50;
  document.getElementById('perf-goal-edit-id').value = g.id;
  document.getElementById('perf-goal-save-btn').textContent = 'Save Changes';

  onPerfGoalTypeChange();
  populatePerfWorkoutSelect();

  if (g.perfType === 'run_pace') {
    const paceMin = Math.floor(g.targetPace);
    const paceSec = Math.round((g.targetPace - paceMin) * 60);
    document.getElementById('perf-pace-min').value = paceMin;
    document.getElementById('perf-pace-sec').value = paceSec;
    document.getElementById('perf-min-distance').value = g.minDistance || 0;
  } else {
    document.getElementById('perf-goal-workout').value = g.workoutId || '';
    document.getElementById('perf-goal-weight').value = g.targetWeight || '';
    document.getElementById('perf-goal-reps').value = g.targetReps || '';
  }

  openModal('perf-goal-modal');
}

function savePerfGoal() {
  const perfType = document.getElementById('perf-goal-type').value;
  const reward = parseInt(document.getElementById('perf-goal-reward').value) || 50;
  const editId = document.getElementById('perf-goal-edit-id').value;
  const goals = DB.getGoals();

  let goalData = {
    type: 'performance',
    perfType,
    reward,
    completed: false
  };

  if (perfType === 'lift_weight') {
    const workoutId = document.getElementById('perf-goal-workout').value;
    const targetWeight = parseFloat(document.getElementById('perf-goal-weight').value);
    if (!workoutId) { showToast('Select a workout', 'warning'); return; }
    if (!targetWeight) { showToast('Enter target weight', 'warning'); return; }
    const opt = document.getElementById('perf-goal-workout').selectedOptions[0];
    goalData.workoutId = workoutId;
    goalData.planId = opt.dataset.plan;
    goalData.targetWeight = targetWeight;
    goalData.title = `Lift ${targetWeight}kg on ${opt.textContent.split(' (')[0]}`;
  } else if (perfType === 'lift_reps') {
    const workoutId = document.getElementById('perf-goal-workout').value;
    const targetReps = parseInt(document.getElementById('perf-goal-reps').value);
    if (!workoutId) { showToast('Select a workout', 'warning'); return; }
    if (!targetReps) { showToast('Enter target reps', 'warning'); return; }
    const opt = document.getElementById('perf-goal-workout').selectedOptions[0];
    goalData.workoutId = workoutId;
    goalData.planId = opt.dataset.plan;
    goalData.targetReps = targetReps;
    goalData.title = `Hit ${targetReps} reps on ${opt.textContent.split(' (')[0]}`;
  } else {
    const paceMin = parseInt(document.getElementById('perf-pace-min').value) || 0;
    const paceSec = parseInt(document.getElementById('perf-pace-sec').value) || 0;
    if (!paceMin && !paceSec) { showToast('Enter target pace', 'warning'); return; }
    const targetPace = parseFloat((paceMin + paceSec / 60).toFixed(2));
    const minDistance = parseFloat(document.getElementById('perf-min-distance').value) || 0;
    goalData.targetPace = targetPace;
    goalData.minDistance = minDistance;
    goalData.title = `Run at ${formatPace(targetPace)} /km pace${minDistance > 0 ? ' (' + minDistance + 'km+)' : ''}`;
  }

  if (editId) {
    const g = goals.find(x => x.id === editId);
    if (!g) return;
    Object.assign(g, goalData);
    showToast('Goal updated', 'success');
  } else {
    goalData.id = uid();
    goalData.createdAt = todayStr();
    goals.push(goalData);
    addActivity('points', `Set performance goal: ${goalData.title}`);
    showToast('Performance goal added! 🎯', 'success');
  }

  DB.saveGoals(goals);
  closeModal('perf-goal-modal');
  renderPerfGoals();
}

function getPerfGoalProgress(g) {
  if (g.perfType === 'lift_weight') {
    return getPerfBestWeight(g.workoutId, g.planId);
  } else if (g.perfType === 'lift_reps') {
    return getPerfBestReps(g.workoutId, g.planId);
  } else if (g.perfType === 'run_pace') {
    return getPerfBestPace(g.minDistance || 0);
  }
  return null;
}

function getPerfBestWeight(workoutId, planId) {
  const logs = DB.getWorkoutLogs();
  let best = 0;
  for (const dateLogs of Object.values(logs)) {
    if (dateLogs[planId] && dateLogs[planId][workoutId]) {
      const w = parseFloat(dateLogs[planId][workoutId].weight) || 0;
      if (w > best) best = w;
    }
  }
  return best;
}

function getPerfBestReps(workoutId, planId) {
  const logs = DB.getWorkoutLogs();
  let best = 0;
  for (const dateLogs of Object.values(logs)) {
    if (dateLogs[planId] && dateLogs[planId][workoutId]) {
      const r = parseInt(dateLogs[planId][workoutId].reps) || 0;
      if (r > best) best = r;
    }
  }
  return best;
}

function getPerfBestPace(minDistance) {
  const runs = DB.getRunLogs().filter(r => r.pace && parseFloat(r.pace) > 0 && r.distance >= minDistance);
  if (runs.length === 0) return null;
  return Math.min(...runs.map(r => parseFloat(r.pace)));
}

function renderPerfGoals() {
  const goals = DB.getGoals().filter(g => g.type === 'performance');
  const container = document.getElementById('performance-goals-list');
  if (!container) return;

  const active = goals.filter(g => !g.completed);
  const completed = goals.filter(g => g.completed);

  if (active.length === 0 && completed.length === 0) {
    container.innerHTML = '<div class="empty-state">No performance goals yet. Set a lift, rep, or pace target!</div>';
    return;
  }

  const typeIcons = { lift_weight: '🏋️', lift_reps: '💪', run_pace: '🏃' };
  let html = '';

  if (active.length > 0) {
    html += active.map(g => {
      const icon = typeIcons[g.perfType] || '🎯';
      const current = getPerfGoalProgress(g);
      let progressHtml = '';
      let pct = 0;

      if (g.perfType === 'lift_weight') {
        const target = g.targetWeight;
        pct = current > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
        progressHtml = `
          <div class="perf-progress-stats">
            <span class="perf-current">${current > 0 ? current + 'kg' : 'No logs yet'}</span>
            <span class="perf-target">Target: ${target}kg</span>
          </div>`;
      } else if (g.perfType === 'lift_reps') {
        const target = g.targetReps;
        pct = current > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
        progressHtml = `
          <div class="perf-progress-stats">
            <span class="perf-current">${current > 0 ? current + ' reps' : 'No logs yet'}</span>
            <span class="perf-target">Target: ${target} reps</span>
          </div>`;
      } else {
        const target = g.targetPace;
        if (current !== null) {
          pct = Math.min(Math.round((target / current) * 100), 100);
        }
        progressHtml = `
          <div class="perf-progress-stats">
            <span class="perf-current">${current !== null ? formatPace(current) + ' /km' : 'No runs yet'}</span>
            <span class="perf-target">Target: ${formatPace(target)} /km</span>
          </div>`;
      }

      const isReady = pct >= 100;

      return `
        <div class="goal-card perf-goal-card${isReady ? ' perf-ready' : ''}">
          <div class="goal-card-header">
            <span class="perf-icon">${icon}</span>
            <div class="goal-card-info">
              <h3 class="goal-title">${escapeHtml(g.title)}</h3>
              <div class="perf-reward-badge">🏆 +${g.reward} DP on completion</div>
            </div>
            <div class="goal-card-actions">
              <button class="btn btn-xs btn-outline" onclick="openEditPerfGoalModal('${g.id}')" title="Edit">✏️</button>
              <button class="btn btn-xs btn-danger" onclick="deletePerfGoal('${g.id}')">✕</button>
            </div>
          </div>
          ${progressHtml}
          <div class="perf-progress-bar-wrap">
            <div class="perf-progress-bar">
              <div class="perf-progress-fill${isReady ? ' full' : ''}" style="width:${pct}%"></div>
            </div>
            <span class="perf-pct">${pct}%</span>
          </div>
          ${isReady && !g.completed
            ? `<button class="btn btn-primary btn-sm perf-claim-btn" onclick="completePerfGoal('${g.id}')">🏆 Claim +${g.reward} DP!</button>`
            : !isReady ? `<div class="perf-remaining">${pct > 0 ? 'Keep pushing!' : 'Start logging to track progress'}</div>` : ''}
        </div>`;
    }).join('');
  }

  if (completed.length > 0) {
    html += `<h3 class="section-title" style="margin-top:24px;">✅ Achieved</h3>`;
    html += completed.map(g => {
      const icon = typeIcons[g.perfType] || '🎯';
      return `
        <div class="goal-card perf-goal-card perf-achieved">
          <div class="goal-card-header">
            <span class="perf-icon">✅</span>
            <div class="goal-card-info">
              <h3 class="goal-title">${escapeHtml(g.title)}</h3>
              <div class="perf-reward-badge earned">🏆 +${g.reward} DP earned${g.completedAt ? ' · ' + formatDate(g.completedAt) : ''}</div>
            </div>
            <div class="goal-card-actions">
              <button class="btn btn-xs btn-outline" onclick="deletePerfGoal('${g.id}')" title="Remove">🗑️</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  container.innerHTML = html;
}

function completePerfGoal(id) {
  const goals = DB.getGoals();
  const g = goals.find(x => x.id === id);
  if (!g) return;

  g.completed = true;
  g.completedAt = todayStr();
  DB.saveGoals(goals);

  addDisciplinePoints(g.reward, `Performance goal: ${g.title}`);
  addActivity('points', `Achieved: ${g.title} (+${g.reward} DP)`);
  showToast(`🏆 Goal achieved: ${g.title}! +${g.reward} DP!`, 'success');
  fireConfetti(3000);
  updateDPDisplays();
  renderPerfGoals();
}

function deletePerfGoal(id) {
  if (!confirm('Delete this performance goal?')) return;
  const goals = DB.getGoals().filter(g => g.id !== id);
  DB.saveGoals(goals);
  showToast('Goal deleted', 'info');
  renderPerfGoals();
}

/* Auto-check performance goals after logging a workout or run */
function checkPerfGoals() {
  const goals = DB.getGoals().filter(g => g.type === 'performance' && !g.completed);
  if (goals.length === 0) return;

  for (const g of goals) {
    const current = getPerfGoalProgress(g);
    let hit = false;

    if (g.perfType === 'lift_weight' && current >= g.targetWeight) hit = true;
    else if (g.perfType === 'lift_reps' && current >= g.targetReps) hit = true;
    else if (g.perfType === 'run_pace' && current !== null && current <= g.targetPace) hit = true;

    if (hit) {
      showToast(`🎯 Performance goal ready to claim: ${g.title}!`, 'success');
    }
  }
}
