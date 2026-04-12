/* ===============================================
   HABITS.JS – Daily Tracking, Streaks, Bonuses,
               Actions (Positive / Negative)
   =============================================== */

function getHabitsTemplate() {
  return `
    <h1 class="page-title">✅ Habits & Discipline</h1>

    <div class="tabs">
      <button class="tab active" onclick="switchHabitsTab('daily')">Daily Tracker</button>
      <button class="tab" onclick="switchHabitsTab('actions')">Actions</button>
      <button class="tab" onclick="switchHabitsTab('log')">Points Log</button>
    </div>

    <!-- Daily Tracker Tab -->
    <div id="habits-daily-tab" class="tab-content active">
      <div class="habits-date-bar">
        <button class="btn btn-sm" onclick="changeHabitDate(-1)">◀</button>
        <input type="date" id="habits-date" onchange="loadHabitsDaily()" />
        <button class="btn btn-sm" onclick="changeHabitDate(1)">▶</button>
        <button class="btn btn-sm btn-outline" onclick="setHabitDateToday()">Today</button>
      </div>

      <div class="habits-dp-bar">
        <div class="dp-display">
          <span class="dp-icon">⚡</span>
          <span class="dp-value" id="habits-total-dp">0</span>
          <span class="dp-label">Discipline Points</span>
        </div>
      </div>

      <div id="habits-daily-list" class="habits-checklist"></div>
      <div id="habits-bonuses" class="bonus-section"></div>
    </div>

    <!-- Actions Tab -->
    <div id="habits-actions-tab" class="tab-content">
      <div class="actions-section">
        <h2>Positive Actions <span class="hint">(earn points)</span></h2>
        <div class="form-card compact">
          <div class="form-row inline">
            <input type="text" id="pos-action-name" placeholder="Action name" />
            <input type="number" id="pos-action-points" placeholder="Points" min="1" value="5" />
            <button class="btn btn-primary btn-sm" onclick="addAction('positive')">+</button>
          </div>
        </div>
        <div id="positive-actions-list" class="actions-list"></div>
      </div>
      <div class="actions-section">
        <h2>Negative Actions <span class="hint">(deduct points)</span></h2>
        <div class="form-card compact">
          <div class="form-row inline">
            <input type="text" id="neg-action-name" placeholder="Action name" />
            <input type="number" id="neg-action-points" placeholder="Points" min="1" value="5" />
            <button class="btn btn-danger btn-sm" onclick="addAction('negative')">+</button>
          </div>
        </div>
        <div id="negative-actions-list" class="actions-list"></div>
      </div>
    </div>

    <!-- Points Log Tab -->
    <div id="habits-log-tab" class="tab-content">
      <div class="log-actions-bar">
        <button class="btn btn-danger btn-sm" onclick="clearPointsLog()">🗑️ Clear Log</button>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Description</th><th>Points</th></tr></thead>
          <tbody id="points-log-body"></tbody>
        </table>
      </div>
    </div>

`;
}

function initHabits() {
  const dateInput = document.getElementById('habits-date');
  if (!dateInput.value) dateInput.value = todayStr();
  updateDPDisplays();
  loadHabitsDaily();
  loadActions();
  loadPointsLog();
}

function switchHabitsTab(tab) {
  document.querySelectorAll('#page-habits .tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('habits-' + tab + '-tab').classList.add('active');
  document.querySelectorAll('#page-habits .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  if (tab === 'log') loadPointsLog();
}

function setHabitDateToday() {
  document.getElementById('habits-date').value = todayStr();
  loadHabitsDaily();
}

function changeHabitDate(delta) {
  const input = document.getElementById('habits-date');
  const d = new Date(input.value + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  input.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  loadHabitsDaily();
}

function loadHabitsDaily() {
  const date = document.getElementById('habits-date').value;
  const habits = DB.getHabits();
  const completions = DB.getHabitCompletions();
  const dayCompletions = completions[date] || {};

  const container = document.getElementById('habits-daily-list');
  if (habits.length === 0) {
    container.innerHTML = '<p class="empty-state">No habits created. Go to Planner → Habit Management to add habits.</p>';
    document.getElementById('habits-bonuses').innerHTML = '';
    return;
  }

  const isPastDate = date < todayStr();
  const isFutureDate = date > todayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
  const isLocked = date < yesterdayStr || isFutureDate;

  container.innerHTML = habits.map((h, idx) => {
    const done = !!dayCompletions[h.id];
    const missed = !done && isPastDate;
    const streak = getHabitStreak(h.id);
    const itemClass = done ? 'completed' : missed ? 'missed' : '';
    const lockedClass = isLocked ? ' locked' : '';
    const clickHandler = isLocked ? '' : `onclick="toggleHabit('${h.id}')"`;
    return `
      <div class="habit-item ${itemClass}${lockedClass}" draggable="${!isLocked}" data-habit-idx="${idx}"
           ${!isLocked ? `ondragstart="onHabitDragStart(event, ${idx})" ondragover="onHabitDragOver(event)" ondrop="onHabitDrop(event, ${idx})" ondragend="onHabitDragEnd(event)"` : ''}>
        ${!isLocked ? '<div class="habit-drag-handle" onclick="event.stopPropagation()" title="Drag to reorder">⠿</div>' : '<div class="habit-lock-icon">🔒</div>'}
        <div class="habit-checkbox" ${clickHandler}>${done ? '✓' : missed ? '✗' : ''}</div>
        <div class="habit-info" ${clickHandler}>
          <div class="habit-title">${escapeHtml(h.name)}</div>
          <div class="habit-meta">${isLocked && isFutureDate ? '🔒 Future date' : isLocked && missed ? '🔒 Locked' : missed ? '❌ Missed' : streak > 0 ? '🔥 ' + streak + ' day streak' : 'No streak'}</div>
        </div>
        <span class="habit-points-badge">+${h.points}</span>
        ${h.strict ? '<span class="habit-strict-badge">STRICT</span>' : ''}
      </div>`;
  }).join('');

  renderBonuses(date, habits, dayCompletions);
  updateDPDisplays();
}

function toggleHabit(habitId) {
  const date = document.getElementById('habits-date').value;

  // Only allow toggling for today and yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
  if (date < yesterdayStr || date > todayStr()) {
    showToast('Cannot change habits for this date', 'warning');
    return;
  }

  const completions = DB.getHabitCompletions();
  if (!completions[date]) completions[date] = {};

  const habits = DB.getHabits();
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;

  if (completions[date][habitId]) {
    // Check if all habits were completed before this uncheck (dedication bonus was awarded)
    const wasAllDone = habits.every(h => completions[date][h.id]);
    delete completions[date][habitId];
    addDisciplinePoints(-habit.points, `Unchecked: ${habit.name}`);
    if (wasAllDone && habits.length > 1) {
      const dedBonus = DB.getDailyDedicationPoints();
      addDisciplinePoints(-dedBonus, 'Dedication bonus revoked');
      showToast(`Dedication bonus revoked (−${dedBonus} pts)`, 'warning');
    }
  } else {
    completions[date][habitId] = true;
    addDisciplinePoints(habit.points, `Habit: ${habit.name}`);
    addActivity('habit', `Completed habit "${habit.name}"`);

    // Refund penalty if this strict habit was penalized for this date
    if (habit.strict) {
      const missedMap = DB.getPenaltiesMissed();
      const missed = missedMap[date];
      if (missed && missed.includes(habitId)) {
        const refund = habit.penaltyPoints || habit.points;
        addDisciplinePoints(refund, `Penalty refund: ${habit.name} (${date})`);
        showToast(`✅ Penalty refund! +${refund} pts for completing ${habit.name}`, 'success');
        const updated = missed.filter(id => id !== habitId);
        if (updated.length === 0) {
          delete missedMap[date];
        } else {
          missedMap[date] = updated;
        }
        DB.savePenaltiesMissed(missedMap);
      }
    }

    const allDone = habits.every(h => completions[date][h.id]);
    if (allDone && habits.length > 0) {
      const dedBonus = DB.getDailyDedicationPoints();
      addDisciplinePoints(dedBonus, 'Dedication bonus: all habits completed!');
      showToast(`💪 Dedication bonus! All habits completed! +${dedBonus} pts`, 'success');
    }

    const streak = getHabitStreakForDate(habitId, date);
    if (streak > 0 && streak % 7 === 0) {
      const baseConsistency = habit.consistencyPoints != null ? habit.consistencyPoints : 5;
      const bonus = Math.min(streak / 7, 10) * baseConsistency;
      addDisciplinePoints(bonus, `Streak bonus (${streak} days): ${habit.name}`);
      showToast(`🔥 ${streak}-day streak bonus for ${habit.name}! +${bonus} pts`, 'success');
    }
  }

  DB.saveHabitCompletions(completions);
  loadHabitsDaily();
}

function getHabitStreakForDate(habitId, dateStr) {
  const completions = DB.getHabitCompletions();
  let streak = 0;
  const d = new Date(dateStr + 'T00:00:00');
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

function renderBonuses(date, habits, dayCompletions) {
  const container = document.getElementById('habits-bonuses');
  const bonuses = [];

  const allDone = habits.length > 0 && habits.every(h => dayCompletions[h.id]);
  if (allDone) {
    const dedBonus = DB.getDailyDedicationPoints();
    bonuses.push(`<div class="bonus-badge">🏆 Dedication Bonus! All habits completed today (+${dedBonus} pts)</div>`);
  }

  for (const h of habits) {
    const streak = getHabitStreakForDate(h.id, date);
    if (streak >= 7) {
      const weeks = Math.floor(streak / 7);
      const baseConsistency = h.consistencyPoints != null ? h.consistencyPoints : 5;
      const bonus = Math.min(weeks, 10) * baseConsistency;
      bonuses.push(`<div class="bonus-badge streak">🔥 ${escapeHtml(h.name)}: ${streak}-day streak (+${bonus} bonus pts)</div>`);
    }
  }

  container.innerHTML = bonuses.join('');
}

/* ---- Habit Drag & Drop Reorder ---- */
let habitDragIdx = null;

function onHabitDragStart(e, idx) {
  habitDragIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dragging');
}

function onHabitDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.currentTarget;
  target.classList.add('drag-over');
}

function onHabitDrop(e, dropIdx) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (habitDragIdx === null || habitDragIdx === dropIdx) return;

  const habits = DB.getHabits();
  const [moved] = habits.splice(habitDragIdx, 1);
  habits.splice(dropIdx, 0, moved);
  DB.saveHabits(habits);

  habitDragIdx = null;
  loadHabitsDaily();
}

function onHabitDragEnd(e) {
  habitDragIdx = null;
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.habit-item').forEach(el => el.classList.remove('drag-over'));
}

/* ---- Strict Habit Penalties ---- */
function checkStrictPenalties() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');

  const checked = DB.getPenaltiesChecked();
  if (checked[yStr]) return;

  const habits = DB.getHabits();
  const completions = DB.getHabitCompletions();
  const dayComp = completions[yStr] || {};

  let penalty = 0;
  const missed = [];
  for (const h of habits) {
    if (h.strict && !dayComp[h.id]) {
      penalty += (h.penaltyPoints || h.points);
      missed.push(h.id);
    }
  }

  if (penalty > 0) {
    addDisciplinePoints(-penalty, `Penalty: missed strict habits (${yStr})`);
    const missedMap = DB.getPenaltiesMissed();
    missedMap[yStr] = missed;
    DB.savePenaltiesMissed(missedMap);
    showToast(`⚠️ Penalty: -${penalty} pts for missing strict habits yesterday`, 'warning');
  }

  checked[yStr] = true;
  DB.savePenaltiesChecked(checked);
}

/* ---- Actions ---- */
function loadActions() {
  const actions = DB.getActions();
  renderActionsList('positive', actions.positive);
  renderActionsList('negative', actions.negative);
}

function renderActionsList(type, list) {
  const container = document.getElementById(type + '-actions-list');
  if (list.length === 0) {
    container.innerHTML = `<p class="empty-state">No ${type} actions yet</p>`;
    return;
  }
  container.innerHTML = list.map(a => `
    <div class="action-item">
      <span class="action-name">${escapeHtml(a.name)}</span>
      <span class="action-points ${type}">${type === 'positive' ? '+' : '-'}${a.points}</span>
      <button class="btn btn-xs ${type === 'positive' ? 'btn-success' : 'btn-danger'}" onclick="triggerAction('${type}','${a.id}')">
        ${type === 'positive' ? 'Done ✓' : 'Did it ✕'}
      </button>
      <button class="btn btn-xs btn-outline" onclick="removeAction('${type}','${a.id}')">🗑️</button>
    </div>`).join('');
}

function addAction(type) {
  const nameInput = document.getElementById(type === 'positive' ? 'pos-action-name' : 'neg-action-name');
  const pointsInput = document.getElementById(type === 'positive' ? 'pos-action-points' : 'neg-action-points');
  const name = nameInput.value.trim();
  const points = parseInt(pointsInput.value) || 5;
  if (!name) { showToast('Enter action name', 'warning'); return; }

  const actions = DB.getActions();
  actions[type].push({ id: uid(), name, points });
  DB.saveActions(actions);
  nameInput.value = '';
  showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} action added`, 'success');
  loadActions();
}

function triggerAction(type, actionId) {
  const actions = DB.getActions();
  const action = actions[type].find(a => a.id === actionId);
  if (!action) return;

  if (type === 'positive') {
    addDisciplinePoints(action.points, `Action: ${action.name}`);
    showToast(`+${action.points} pts: ${action.name} ✅`, 'success');
    addActivity('points', `+${action.points}: ${action.name}`);
  } else {
    addDisciplinePoints(-action.points, `Negative: ${action.name}`);
    showToast(`-${action.points} pts: ${action.name} ⚠️`, 'warning');
    addActivity('points', `-${action.points}: ${action.name}`);
  }
}

function removeAction(type, actionId) {
  const actions = DB.getActions();
  actions[type] = actions[type].filter(a => a.id !== actionId);
  DB.saveActions(actions);
  showToast('Action removed', 'info');
  loadActions();
}

function loadPointsLog() {
  const log = DB.getPointsLog();
  const body = document.getElementById('points-log-body');

  if (log.length === 0) {
    body.innerHTML = '<tr><td colspan="3" class="empty-state">No points activity yet</td></tr>';
    return;
  }

  body.innerHTML = log.slice(0, 100).map(entry => {
    const dateStr = new Date(entry.date).toLocaleString();
    const cls = entry.points >= 0 ? 'positive' : 'negative';
    return `
      <tr>
        <td>${dateStr}</td>
        <td>${escapeHtml(entry.description)}</td>
        <td class="action-points ${cls}" style="font-weight:700">${entry.points >= 0 ? '+' : ''}${entry.points}</td>
      </tr>`;
  }).join('');
}

function clearPointsLog() {
  if (!confirm('Are you sure you want to clear the entire points log? This cannot be undone. Your current discipline points will remain unchanged.')) return;
  DB.savePointsLog([]);
  loadPointsLog();
  showToast('Points log cleared', 'info');
}


