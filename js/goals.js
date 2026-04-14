/* ===============================================
   GOALS.JS – Monthly Goals & Target-Date Goals
   =============================================== */

function getGoalsTemplate() {
  return `
    <h1 class="page-title">🎯 Goals</h1>

    <div class="goals-tabs">
      <button class="goals-tab active" data-tab="monthly" onclick="switchGoalTab('monthly')">📅 Monthly Goals</button>
      <button class="goals-tab" data-tab="targeted" onclick="switchGoalTab('targeted')">🏁 Target Goals</button>
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
    </div>`;
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
    addDisciplinePoints(25, `Goal completed: ${g.title}`);
    showToast('Goal completed! 🎉 +25 DP', 'success');
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
}
