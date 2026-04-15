/* ===============================================
   PLANNER.JS – Workout Plans & Habit Management
   With day naming support
   =============================================== */

function getPlannerTemplate() {
  return `
    <h1 class="page-title">📋 Planner</h1>

    <div class="tabs">
      <button class="tab active" onclick="switchPlannerTab('workouts')">Workout Plans</button>
      <button class="tab" onclick="switchPlannerTab('habits')">Habit Management</button>
    </div>

    <!-- Workout Plans Tab -->
    <div id="planner-workouts-tab" class="tab-content active">
      <div class="form-card">
        <h2>Create Workout Plan</h2>
        <div class="form-row">
          <label>Plan Name</label>
          <input type="text" id="plan-name" placeholder="e.g., PPL Split" />
        </div>
        <div class="form-row">
          <label>Workout Days</label>
          <select id="plan-days">
            <option value="3">3 Days</option>
            <option value="4">4 Days</option>
            <option value="5">5 Days</option>
            <option value="6" selected>6 Days</option>
          </select>
        </div>
        <div id="day-names-setup"></div>
        <button class="btn btn-primary" onclick="createWorkoutPlan()">Create Plan</button>
      </div>

      <div id="workout-plans-list" class="cards-grid"></div>

      <!-- Add Workout Modal -->
      <div id="add-workout-modal" class="modal-overlay" style="display:none;">
        <div class="modal">
          <div class="modal-header">
            <h2>Add Workout</h2>
            <button class="btn-icon" onclick="closeModal('add-workout-modal')">&times;</button>
          </div>
          <div class="form-row">
            <label>Day</label>
            <select id="workout-day-select"></select>
          </div>
          <div class="form-row">
            <label>Workout Name</label>
            <input type="text" id="workout-name" placeholder="e.g., Bench Press" oninput="autoDetectMuscleGroup()" />
          </div>
          <div class="form-row">
            <label>Workout Type</label>
            <select id="workout-type">
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="isolation">Isolation</option>
            </select>
          </div>
          <div class="form-row">
            <label>Target Muscle Group</label>
            <select id="workout-muscle">
              <option value="chest">Chest</option>
              <option value="back">Back</option>
              <option value="legs">Legs</option>
              <option value="shoulders">Shoulders</option>
              <option value="biceps">Biceps</option>
              <option value="triceps">Triceps</option>
              <option value="quads">Quads</option>
              <option value="hamstrings">Hamstrings</option>
              <option value="calves">Calves</option>
              <option value="core">Core</option>
              <option value="glutes">Glutes</option>
              <option value="full-body">Full Body</option>
              <option value="cardio">Cardio</option>
            </select>
          </div>
          <div class="form-row">
            <label>Equipment</label>
            <select id="workout-equipment">
              <option value="barbell">Barbell</option>
              <option value="dumbbell">Dumbbell (per hand)</option>
              <option value="machine">Machine</option>
              <option value="cable">Cable</option>
              <option value="bodyweight">Bodyweight</option>
            </select>
          </div>
          <div class="form-row">
            <label class="checkbox-label"><input type="checkbox" id="workout-elite" /> <span>⚡ Elite Workout</span></label>
            <small class="form-hint">Elite workouts are highlighted and tracked separately for consistency</small>
          </div>
          <input type="hidden" id="workout-plan-id" />
          <input type="hidden" id="workout-edit-id" />
          <input type="hidden" id="workout-edit-day" />
          <button class="btn btn-primary" id="workout-modal-btn" onclick="addWorkoutToPlan()">Add Workout</button>
        </div>
      </div>

      <!-- Rename Day Modal -->
      <div id="rename-day-modal" class="modal-overlay" style="display:none;">
        <div class="modal">
          <div class="modal-header">
            <h2>Rename Day</h2>
            <button class="btn-icon" onclick="closeModal('rename-day-modal')">&times;</button>
          </div>
          <div class="form-row">
            <label>Day Name</label>
            <input type="text" id="rename-day-input" placeholder="e.g., Push Day" />
          </div>
          <input type="hidden" id="rename-day-plan-id" />
          <input type="hidden" id="rename-day-num" />
          <button class="btn btn-primary" onclick="saveRenamePlanDay()">Save</button>
        </div>
      </div>

      <!-- Link Workouts Modal (Superset / Alternative) -->
      <div id="link-workout-modal" class="modal-overlay" style="display:none;">
        <div class="modal">
          <div class="modal-header">
            <h2>Link Workouts</h2>
            <button class="btn-icon" onclick="closeModal('link-workout-modal')">&times;</button>
          </div>
          <div class="form-row">
            <label>Day</label>
            <select id="link-day-select" onchange="populateLinkSelects()"></select>
          </div>
          <div class="form-row">
            <label>Link Type</label>
            <select id="link-type">
              <option value="superset">🔗 Superset (do both together)</option>
              <option value="alternative">🔀 Alternative (do one or the other)</option>
            </select>
          </div>
          <div class="form-row">
            <label>Workout A</label>
            <select id="link-workout-a"></select>
          </div>
          <div class="form-row">
            <label>Workout B</label>
            <select id="link-workout-b"></select>
          </div>
          <input type="hidden" id="link-plan-id" />
          <button class="btn btn-primary" onclick="saveLinkWorkouts()">Link</button>
          <div style="margin-top:16px;">
            <h3 style="font-size:0.95rem;margin-bottom:8px;">Current Links</h3>
            <div id="current-links-list"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Habits Tab -->
    <div id="planner-habits-tab" class="tab-content">
      <div class="dedication-setting">
        <label>🏆 Daily Dedication Bonus <span class="hint">(all habits done)</span></label>
        <input type="number" id="daily-dedication-points" value="10" min="0" onchange="saveDailyDedicationPoints()" />
        <span class="hint">pts</span>
      </div>
      <div class="form-card">
        <h2>Create Habit</h2>
        <div class="form-row">
          <label>Habit Name</label>
          <input type="text" id="habit-name" placeholder="e.g., Drink 3L water" />
        </div>
        <div class="form-row">
          <label>Category</label>
          <select id="habit-category">
            <option value="fitness">💪 Fitness</option>
            <option value="health">❤️ Health</option>
            <option value="productivity">🎯 Productivity</option>
            <option value="mindfulness">🧘 Mindfulness</option>
            <option value="nutrition">🥗 Nutrition</option>
            <option value="learning">📚 Learning</option>
            <option value="other">📌 Other</option>
          </select>
        </div>
        <div class="form-row">
          <label>Discipline Points <span class="hint">(per completion)</span></label>
          <input type="number" id="habit-points" value="5" min="1" />
        </div>
        <div class="form-row checkbox-row">
          <label>
            <input type="checkbox" id="habit-strict" onchange="toggleStrictFields()" />
            Strict Habit <span class="hint">(penalty for missing)</span>
          </label>
        </div>
        <div id="strict-penalty-row" class="form-row" style="display:none;">
          <label>Penalty Points <span class="hint">(deducted when missed)</span></label>
          <input type="number" id="habit-penalty-points" value="5" min="1" />
        </div>
        <div class="form-row">
          <label>Consistency Bonus <span class="hint">(every 7-day streak)</span></label>
          <input type="number" id="habit-consistency-points" value="5" min="0" />
        </div>
        <button class="btn btn-primary" onclick="createHabit()">Add Habit</button>
      </div>
      <div id="habits-list" class="cards-grid"></div>

      <!-- Edit Habit Modal -->
      <div id="edit-habit-modal" class="modal-overlay" style="display:none;">
        <div class="modal">
          <div class="modal-header">
            <h2>Edit Habit</h2>
            <button class="btn-icon" onclick="closeModal('edit-habit-modal')">&times;</button>
          </div>
          <div class="form-row">
            <label>Habit Name</label>
            <input type="text" id="edit-habit-name" />
          </div>
          <div class="form-row">
            <label>Category</label>
            <select id="edit-habit-category">
              <option value="fitness">💪 Fitness</option>
              <option value="health">❤️ Health</option>
              <option value="productivity">🎯 Productivity</option>
              <option value="mindfulness">🧘 Mindfulness</option>
              <option value="nutrition">🥗 Nutrition</option>
              <option value="learning">📚 Learning</option>
              <option value="other">📌 Other</option>
            </select>
          </div>
          <div class="form-row">
            <label>Discipline Points <span class="hint">(per completion)</span></label>
            <input type="number" id="edit-habit-points" min="1" />
          </div>
          <div class="form-row checkbox-row">
            <label>
              <input type="checkbox" id="edit-habit-strict" onchange="toggleEditStrictFields()" />
              Strict Habit
            </label>
          </div>
          <div id="edit-strict-penalty-row" class="form-row" style="display:none;">
            <label>Penalty Points</label>
            <input type="number" id="edit-habit-penalty-points" min="1" />
          </div>
          <div class="form-row">
            <label>Consistency Bonus</label>
            <input type="number" id="edit-habit-consistency-points" min="0" />
          </div>
          <input type="hidden" id="edit-habit-id" />
          <button class="btn btn-primary" onclick="saveEditHabit()">Save</button>
        </div>
      </div>
    </div>`;
}

/* ---- Tab Switch ---- */
function switchPlannerTab(tab) {
  document.querySelectorAll('#page-planner .tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('planner-' + tab + '-tab').classList.add('active');
  document.querySelectorAll('#page-planner .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
}

function refreshPlanner() {
  setupDayNamesPreview();
  renderWorkoutPlans();
  renderHabitsList();
  // Load daily dedication points setting
  const dedInput = document.getElementById('daily-dedication-points');
  if (dedInput) dedInput.value = DB.getDailyDedicationPoints();
}

function saveDailyDedicationPoints() {
  const val = parseInt(document.getElementById('daily-dedication-points').value) || 10;
  DB.saveDailyDedicationPoints(val);
  showToast(`Daily dedication bonus set to ${val} pts`, 'success');
}

/* ---- Day Names Preview on Create ---- */
function setupDayNamesPreview() {
  const select = document.getElementById('plan-days');
  if (!select) return;
  select.addEventListener('change', renderDayNamesSetup);
  renderDayNamesSetup();
}

function renderDayNamesSetup() {
  const days = parseInt(document.getElementById('plan-days').value);
  const container = document.getElementById('day-names-setup');
  let html = '<label style="display:block;margin-bottom:6px;font-weight:500;font-size:0.9rem;color:var(--text-secondary);">Day Names <span class="hint">(optional)</span></label>';
  for (let i = 1; i <= days; i++) {
    html += `
      <div class="form-row inline" style="margin-bottom:8px;">
        <span style="min-width:50px;font-size:0.85rem;color:var(--text-muted);">Day ${i}</span>
        <input type="text" id="plan-day-name-${i}" placeholder="e.g., Push Day" style="flex:1;" />
      </div>`;
  }
  container.innerHTML = html;
}

/* ====================
   WORKOUT PLANS
   ==================== */
function createWorkoutPlan() {
  const name = document.getElementById('plan-name').value.trim();
  const days = parseInt(document.getElementById('plan-days').value);
  if (!name) { showToast('Enter a plan name', 'warning'); return; }

  const plans = DB.getPlans();
  const plan = {
    id: uid(),
    name,
    days,
    dayNames: {},
    workouts: {}
  };

  for (let i = 1; i <= days; i++) {
    const dayNameInput = document.getElementById('plan-day-name-' + i);
    const dayName = dayNameInput ? dayNameInput.value.trim() : '';
    plan.dayNames[i] = dayName || 'Day ' + i;
    plan.workouts[i] = [];
  }
  plan.workouts['optional'] = [];

  plans.push(plan);
  DB.savePlans(plans);

  document.getElementById('plan-name').value = '';
  renderDayNamesSetup();
  addActivity('workout', `Created workout plan "${name}" (${days} days)`);
  showToast('Workout plan created!', 'success');
  renderWorkoutPlans();
}

function renderWorkoutPlans() {
  const plans = DB.getPlans();
  const container = document.getElementById('workout-plans-list');

  if (plans.length === 0) {
    container.innerHTML = '<p class="empty-state">No workout plans yet. Create one above!</p>';
    return;
  }

  container.innerHTML = plans.map(plan => {
    // Ensure dayNames exists for backward compatibility
    if (!plan.dayNames) plan.dayNames = {};

    const dayGroups = Object.entries(plan.workouts).filter(([day]) => day !== 'optional').map(([day, workouts]) => {
      const dayName = getPlanDayName(plan, day);
      const items = workouts.map((w, idx) => {
        let linkBadge = '';
        if (w.supersetWith) {
          const partner = workouts.find(x => x.id === w.supersetWith);
          linkBadge = partner ? `<span class="link-badge superset">🔗 Superset w/ ${escapeHtml(partner.name)}</span>` : '';
        }
        if (w.alternativeOf) {
          const partner = workouts.find(x => x.id === w.alternativeOf);
          linkBadge = partner ? `<span class="link-badge alternative">🔀 Alt of ${escapeHtml(partner.name)}</span>` : '';
        }
        const eliteBadge = w.elite ? '<span class="link-badge elite">⚡ Elite</span>' : '';
        return `
        <div class="plan-workout-item${w.supersetWith ? ' superset-item' : ''}${w.alternativeOf ? ' alternative-item' : ''}${w.elite ? ' elite-item' : ''}"
             draggable="true" data-plan-id="${plan.id}" data-day="${day}" data-workout-id="${w.id}" data-index="${idx}"
             ondragstart="onWorkoutDragStart(event)" ondragover="onWorkoutDragOver(event)" ondrop="onWorkoutDrop(event)" ondragend="onWorkoutDragEnd(event)">
          <span class="drag-handle" title="Drag to reorder">⠿</span>
          <span class="workout-name">${escapeHtml(w.name)}</span>
          <span class="workout-meta">${w.type} · ${w.muscle}${w.equipment ? ' · ' + w.equipment : ''}</span>
          ${eliteBadge}${linkBadge}
          <button class="btn btn-xs btn-outline" onclick="openEditWorkoutModal('${plan.id}','${day}','${w.id}')" title="Edit">✏️</button>
          <button class="btn btn-xs btn-danger" onclick="removeWorkoutFromPlan('${plan.id}','${day}','${w.id}')">✕</button>
        </div>`;
      }).join('');
      return `
        <div class="plan-day-group">
          <div class="plan-day-header">
            <h4>${escapeHtml(dayName)}</h4>
            <button class="btn-rename" onclick="openRenameDayModal('${plan.id}','${day}')" title="Rename day">✏️</button>
          </div>
          ${items || '<p class="empty-state" style="padding:4px;font-size:0.8rem;">No workouts</p>'}
        </div>`;
    }).join('');

    // Optional workouts section
    const optionalWorkouts = plan.workouts['optional'] || [];
    const optionalHtml = optionalWorkouts.length > 0 ? `
      <div class="plan-day-group optional-group">
        <div class="plan-day-header">
          <h4>⭐ Optional</h4>
        </div>
        ${optionalWorkouts.map(w => `
          <div class="plan-workout-item optional-item">
            <span class="workout-name">${escapeHtml(w.name)}</span>
            <span class="workout-meta">${w.type} · ${w.muscle}${w.equipment ? ' · ' + w.equipment : ''}</span>
            <button class="btn btn-xs btn-outline" onclick="openEditWorkoutModal('${plan.id}','optional','${w.id}')" title="Edit">✏️</button>
            <button class="btn btn-xs btn-danger" onclick="removeWorkoutFromPlan('${plan.id}','optional','${w.id}')">✕</button>
          </div>`).join('')}
      </div>` : '';

    return `
      <div class="plan-card">
        <div class="plan-card-header">
          <h3>${escapeHtml(plan.name)}</h3>
          <span class="plan-days-badge">${plan.days} days</span>
        </div>
        <div class="plan-days-container">
          ${dayGroups}
          ${optionalHtml}
        </div>
        <div class="plan-card-actions">
          <button class="btn btn-primary btn-sm" onclick="openAddWorkoutModal('${plan.id}')">+ Add Workout</button>
          <button class="btn btn-outline btn-sm" onclick="openLinkModal('${plan.id}')">🔗 Link</button>
          <button class="btn btn-danger btn-sm" onclick="deletePlan('${plan.id}')">Delete Plan</button>
        </div>
      </div>`;
  }).join('');
}

/* ---- Rename Day ---- */
function openRenameDayModal(planId, dayNum) {
  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  document.getElementById('rename-day-plan-id').value = planId;
  document.getElementById('rename-day-num').value = dayNum;
  document.getElementById('rename-day-input').value = getPlanDayName(plan, dayNum);
  openModal('rename-day-modal');
}

function saveRenamePlanDay() {
  const planId = document.getElementById('rename-day-plan-id').value;
  const dayNum = document.getElementById('rename-day-num').value;
  const newName = document.getElementById('rename-day-input').value.trim();
  if (!newName) { showToast('Enter a day name', 'warning'); return; }

  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  if (!plan.dayNames) plan.dayNames = {};
  plan.dayNames[dayNum] = newName;
  DB.savePlans(plans);

  closeModal('rename-day-modal');
  showToast(`Renamed to "${newName}"`, 'success');
  renderWorkoutPlans();
}

/* ---- Add Workout Modal ---- */
function openAddWorkoutModal(planId) {
  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  document.getElementById('workout-plan-id').value = planId;
  document.getElementById('workout-edit-id').value = '';
  document.getElementById('workout-edit-day').value = '';
  const daySelect = document.getElementById('workout-day-select');
  daySelect.innerHTML = '';
  for (let i = 1; i <= plan.days; i++) {
    const dayName = getPlanDayName(plan, i);
    daySelect.innerHTML += `<option value="${i}">${escapeHtml(dayName)}</option>`;
  }
  daySelect.innerHTML += `<option value="optional">⭐ Optional</option>`;
  document.getElementById('workout-name').value = '';
  document.getElementById('workout-type').value = 'strength';
  document.getElementById('workout-muscle').value = 'chest';
  document.getElementById('workout-equipment').value = 'barbell';
  document.getElementById('workout-elite').checked = false;
  document.querySelector('#add-workout-modal .modal-header h2').textContent = 'Add Workout';
  document.getElementById('workout-modal-btn').textContent = 'Add Workout';
  document.getElementById('workout-modal-btn').setAttribute('onclick', 'addWorkoutToPlan()');
  openModal('add-workout-modal');
}

function openEditWorkoutModal(planId, day, workoutId) {
  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;
  const w = (plan.workouts[day] || []).find(x => x.id === workoutId);
  if (!w) return;

  document.getElementById('workout-plan-id').value = planId;
  document.getElementById('workout-edit-id').value = workoutId;
  document.getElementById('workout-edit-day').value = day;
  const daySelect = document.getElementById('workout-day-select');
  daySelect.innerHTML = '';
  for (let i = 1; i <= plan.days; i++) {
    const dayName = getPlanDayName(plan, i);
    daySelect.innerHTML += `<option value="${i}">${escapeHtml(dayName)}</option>`;
  }
  daySelect.innerHTML += `<option value="optional">⭐ Optional</option>`;
  daySelect.value = day;
  document.getElementById('workout-name').value = w.name;
  document.getElementById('workout-type').value = w.type;
  document.getElementById('workout-muscle').value = w.muscle;
  document.getElementById('workout-equipment').value = w.equipment || 'barbell';
  document.getElementById('workout-elite').checked = !!w.elite;
  document.querySelector('#add-workout-modal .modal-header h2').textContent = 'Edit Workout';
  document.getElementById('workout-modal-btn').textContent = 'Save Changes';
  document.getElementById('workout-modal-btn').setAttribute('onclick', 'saveEditWorkout()');
  openModal('add-workout-modal');
}

function saveEditWorkout() {
  const planId = document.getElementById('workout-plan-id').value;
  const editId = document.getElementById('workout-edit-id').value;
  const oldDay = document.getElementById('workout-edit-day').value;
  const newDay = document.getElementById('workout-day-select').value;
  const name = document.getElementById('workout-name').value.trim();
  const type = document.getElementById('workout-type').value;
  const muscle = document.getElementById('workout-muscle').value;
  const equipment = document.getElementById('workout-equipment').value;
  const elite = document.getElementById('workout-elite').checked;

  if (!name) { showToast('Enter a workout name', 'warning'); return; }

  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  if (oldDay === newDay) {
    const w = plan.workouts[oldDay].find(x => x.id === editId);
    if (w) { w.name = name; w.type = type; w.muscle = muscle; w.equipment = equipment; if (elite) w.elite = true; else delete w.elite; }
  } else {
    const w = plan.workouts[oldDay].find(x => x.id === editId);
    if (!w) return;
    // Clean up links
    for (const d of Object.keys(plan.workouts)) {
      for (const ww of plan.workouts[d]) {
        if (ww.supersetWith === editId) delete ww.supersetWith;
        if (ww.alternativeOf === editId) delete ww.alternativeOf;
      }
    }
    plan.workouts[oldDay] = plan.workouts[oldDay].filter(x => x.id !== editId);
    delete w.supersetWith; delete w.alternativeOf;
    w.name = name; w.type = type; w.muscle = muscle; w.equipment = equipment;
    if (elite) w.elite = true; else delete w.elite;
    plan.workouts[newDay].push(w);
  }

  DB.savePlans(plans);
  closeModal('add-workout-modal');
  showToast('Workout updated', 'success');
  renderWorkoutPlans();
}

function autoDetectMuscleGroup() {
  const name = document.getElementById('workout-name').value;
  if (name.length > 2) {
    document.getElementById('workout-muscle').value = detectMuscleGroup(name);
  }
}

function addWorkoutToPlan() {
  const planId = document.getElementById('workout-plan-id').value;
  const day = document.getElementById('workout-day-select').value;
  const name = document.getElementById('workout-name').value.trim();
  const type = document.getElementById('workout-type').value;
  const muscle = document.getElementById('workout-muscle').value;
  const equipment = document.getElementById('workout-equipment').value;

  if (!name) { showToast('Enter a workout name', 'warning'); return; }

  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  const elite = document.getElementById('workout-elite').checked;
  if (!plan.workouts[day]) plan.workouts[day] = [];
  const workout = { id: uid(), name, type, muscle, equipment };
  if (elite) workout.elite = true;
  plan.workouts[day].push(workout);
  DB.savePlans(plans);

  const dayName = day === 'optional' ? 'Optional' : getPlanDayName(plan, day);
  closeModal('add-workout-modal');
  showToast(`Added "${name}" to ${dayName}`, 'success');
  renderWorkoutPlans();
}

function removeWorkoutFromPlan(planId, day, workoutId) {
  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  // Clean up any links referencing this workout
  for (const d of Object.keys(plan.workouts)) {
    for (const w of plan.workouts[d]) {
      if (w.supersetWith === workoutId) delete w.supersetWith;
      if (w.alternativeOf === workoutId) delete w.alternativeOf;
    }
  }

  plan.workouts[day] = plan.workouts[day].filter(w => w.id !== workoutId);
  DB.savePlans(plans);
  showToast('Workout removed', 'info');
  renderWorkoutPlans();
}

function deletePlan(planId) {
  if (!confirm('Delete this workout plan?')) return;
  let plans = DB.getPlans();
  plans = plans.filter(p => p.id !== planId);
  DB.savePlans(plans);
  showToast('Plan deleted', 'info');
  renderWorkoutPlans();
}

/* ====================
   LINK WORKOUTS (Superset / Alternative)
   ==================== */
function openLinkModal(planId) {
  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  document.getElementById('link-plan-id').value = planId;
  const daySelect = document.getElementById('link-day-select');
  daySelect.innerHTML = '';
  for (let i = 1; i <= plan.days; i++) {
    const dayName = getPlanDayName(plan, i);
    daySelect.innerHTML += `<option value="${i}">${escapeHtml(dayName)}</option>`;
  }
  populateLinkSelects();
  openModal('link-workout-modal');
}

function populateLinkSelects() {
  const planId = document.getElementById('link-plan-id').value;
  const day = document.getElementById('link-day-select').value;
  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  const workouts = plan.workouts[day] || [];
  const options = workouts.map(w => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join('');
  document.getElementById('link-workout-a').innerHTML = options;
  document.getElementById('link-workout-b').innerHTML = options;

  renderCurrentLinks(plan, day);
}

function renderCurrentLinks(plan, day) {
  const workouts = plan.workouts[day] || [];
  const container = document.getElementById('current-links-list');
  const links = [];

  const seen = new Set();
  for (const w of workouts) {
    if (w.supersetWith && !seen.has(w.id + w.supersetWith) && !seen.has(w.supersetWith + w.id)) {
      const partner = workouts.find(x => x.id === w.supersetWith);
      if (partner) {
        links.push({ type: 'superset', a: w, b: partner });
        seen.add(w.id + w.supersetWith);
      }
    }
    if (w.alternativeOf && !seen.has(w.id + w.alternativeOf) && !seen.has(w.alternativeOf + w.id)) {
      const partner = workouts.find(x => x.id === w.alternativeOf);
      if (partner) {
        links.push({ type: 'alternative', a: w, b: partner });
        seen.add(w.id + w.alternativeOf);
      }
    }
  }

  if (links.length === 0) {
    container.innerHTML = '<p class="empty-state" style="padding:4px;font-size:0.85rem;">No links in this day</p>';
    return;
  }

  container.innerHTML = links.map(l => `
    <div class="link-item">
      <span class="link-badge ${l.type}">${l.type === 'superset' ? '🔗' : '🔀'} ${l.type}</span>
      <span>${escapeHtml(l.a.name)} ↔ ${escapeHtml(l.b.name)}</span>
      <button class="btn btn-xs btn-outline" onclick="editLink('${plan.id}','${day}','${l.a.id}','${l.b.id}','${l.type}')" title="Change link type">✏️</button>
      <button class="btn btn-xs btn-danger" onclick="unlinkWorkouts('${plan.id}','${day}','${l.a.id}','${l.b.id}')">✕</button>
    </div>`).join('');
}

function saveLinkWorkouts() {
  const planId = document.getElementById('link-plan-id').value;
  const day = document.getElementById('link-day-select').value;
  const type = document.getElementById('link-type').value;
  const aId = document.getElementById('link-workout-a').value;
  const bId = document.getElementById('link-workout-b').value;

  if (aId === bId) { showToast('Select two different workouts', 'warning'); return; }

  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  const workouts = plan.workouts[day];
  const wA = workouts.find(w => w.id === aId);
  const wB = workouts.find(w => w.id === bId);
  if (!wA || !wB) return;

  // Clear existing links for these workouts
  delete wA.supersetWith; delete wA.alternativeOf;
  delete wB.supersetWith; delete wB.alternativeOf;

  if (type === 'superset') {
    wA.supersetWith = bId;
    wB.supersetWith = aId;
  } else {
    wA.alternativeOf = bId;
    wB.alternativeOf = aId;
  }

  DB.savePlans(plans);
  showToast(`${type === 'superset' ? 'Superset' : 'Alternative'} linked!`, 'success');
  populateLinkSelects();
  renderWorkoutPlans();
}

function unlinkWorkouts(planId, day, aId, bId) {
  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;

  const workouts = plan.workouts[day];
  const wA = workouts.find(w => w.id === aId);
  const wB = workouts.find(w => w.id === bId);
  if (wA) { delete wA.supersetWith; delete wA.alternativeOf; }
  if (wB) { delete wB.supersetWith; delete wB.alternativeOf; }

  DB.savePlans(plans);
  showToast('Link removed', 'info');
  populateLinkSelects();
  renderWorkoutPlans();
}

function editLink(planId, day, aId, bId, currentType) {
  // Pre-fill the link form with existing values
  document.getElementById('link-day-select').value = day;
  populateLinkSelects();
  document.getElementById('link-type').value = currentType === 'superset' ? 'alternative' : 'superset';
  document.getElementById('link-workout-a').value = aId;
  document.getElementById('link-workout-b').value = bId;
}

/* ====================
   HABIT MANAGEMENT
   ==================== */
function toggleStrictFields() {
  const strict = document.getElementById('habit-strict').checked;
  document.getElementById('strict-penalty-row').style.display = strict ? 'block' : 'none';
}

function createHabit() {
  const name = document.getElementById('habit-name').value.trim();
  const points = parseInt(document.getElementById('habit-points').value) || 5;
  const strict = document.getElementById('habit-strict').checked;
  const penaltyPoints = strict ? (parseInt(document.getElementById('habit-penalty-points').value) || 5) : 0;
  const consistencyPoints = parseInt(document.getElementById('habit-consistency-points').value) || 5;
  const category = document.getElementById('habit-category').value;

  if (!name) { showToast('Enter a habit name', 'warning'); return; }

  const habits = DB.getHabits();
  habits.push({ id: uid(), name, points, strict, penaltyPoints, consistencyPoints, category });
  DB.saveHabits(habits);

  document.getElementById('habit-name').value = '';
  document.getElementById('habit-points').value = '5';
  document.getElementById('habit-strict').checked = false;
  document.getElementById('strict-penalty-row').style.display = 'none';
  document.getElementById('habit-penalty-points').value = '5';
  document.getElementById('habit-consistency-points').value = '5';
  document.getElementById('habit-category').value = 'fitness';

  addActivity('habit', `Created habit "${name}"`);
  showToast('Habit created!', 'success');
  renderHabitsList();
}

function renderHabitsList() {
  const habits = DB.getHabits();
  const container = document.getElementById('habits-list');

  if (habits.length === 0) {
    container.innerHTML = '<p class="empty-state">No habits yet. Create one above!</p>';
    return;
  }

  const catIcons = { fitness: '💪', health: '❤️', productivity: '🎯', mindfulness: '🧘', nutrition: '🥗', learning: '📚', other: '📌' };
  container.innerHTML = habits.map(h => {
    const penalty = h.penaltyPoints || h.points;
    const consistency = h.consistencyPoints != null ? h.consistencyPoints : 5;
    const dedication = h.dedicationPoints != null ? h.dedicationPoints : 10;
    const cat = h.category || 'other';
    return `
    <div class="habit-manage-card">
      <div class="habit-info">
        <div class="habit-title">${escapeHtml(h.name)}</div>
        <div class="habit-meta">
          <span class="habit-category-badge cat-${cat}">${catIcons[cat] || '📌'} ${cat}</span>
          +${h.points} pts
          ${h.strict ? ' · Strict (−' + penalty + ' penalty)' : ''}
          · Streak +${consistency}
          · Dedication +${dedication}
        </div>
      </div>
      <span class="habit-points-badge">+${h.points}</span>
      ${h.strict ? '<span class="habit-strict-badge">STRICT</span>' : ''}
      <button class="btn btn-xs btn-outline" onclick="openEditHabitModal('${h.id}')" title="Edit">✏️</button>
      <button class="btn btn-xs btn-danger" onclick="deleteHabit('${h.id}')">✕</button>
    </div>`;
  }).join('');
}

function deleteHabit(habitId) {
  if (!confirm('Delete this habit?')) return;
  let habits = DB.getHabits();
  habits = habits.filter(h => h.id !== habitId);
  DB.saveHabits(habits);
  showToast('Habit deleted', 'info');
  renderHabitsList();
}

function openEditHabitModal(habitId) {
  const habits = DB.getHabits();
  const h = habits.find(x => x.id === habitId);
  if (!h) return;
  document.getElementById('edit-habit-id').value = h.id;
  document.getElementById('edit-habit-name').value = h.name;
  document.getElementById('edit-habit-points').value = h.points;
  document.getElementById('edit-habit-strict').checked = h.strict;
  document.getElementById('edit-habit-penalty-points').value = h.penaltyPoints || h.points;
  document.getElementById('edit-strict-penalty-row').style.display = h.strict ? 'block' : 'none';
  document.getElementById('edit-habit-consistency-points').value = h.consistencyPoints != null ? h.consistencyPoints : 5;
  document.getElementById('edit-habit-category').value = h.category || 'other';
  openModal('edit-habit-modal');
}

function toggleEditStrictFields() {
  const strict = document.getElementById('edit-habit-strict').checked;
  document.getElementById('edit-strict-penalty-row').style.display = strict ? 'block' : 'none';
}

function saveEditHabit() {
  const id = document.getElementById('edit-habit-id').value;
  const name = document.getElementById('edit-habit-name').value.trim();
  const points = parseInt(document.getElementById('edit-habit-points').value) || 5;
  const strict = document.getElementById('edit-habit-strict').checked;
  const penaltyPoints = strict ? (parseInt(document.getElementById('edit-habit-penalty-points').value) || 5) : 0;
  const consistencyPoints = parseInt(document.getElementById('edit-habit-consistency-points').value) || 5;

  if (!name) { showToast('Enter a habit name', 'warning'); return; }

  const habits = DB.getHabits();
  const h = habits.find(x => x.id === id);
  if (!h) return;
  const category = document.getElementById('edit-habit-category').value;
  h.name = name; h.points = points; h.strict = strict;
  h.penaltyPoints = penaltyPoints; h.consistencyPoints = consistencyPoints;
  h.category = category;
  DB.saveHabits(habits);
  closeModal('edit-habit-modal');
  showToast('Habit updated', 'success');
  renderHabitsList();
}

/* ---- Drag to Reorder Workouts ---- */
let dragData = null;

function onWorkoutDragStart(e) {
  const el = e.target.closest('.plan-workout-item');
  dragData = {
    planId: el.dataset.planId,
    day: el.dataset.day,
    workoutId: el.dataset.workoutId,
    index: parseInt(el.dataset.index)
  };
  el.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', ''); // Required for Firefox
}

function onWorkoutDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const el = e.target.closest('.plan-workout-item');
  if (!el || !dragData) return;
  // Only allow reorder within same plan+day
  if (el.dataset.planId !== dragData.planId || el.dataset.day !== dragData.day) return;
  // Clear previous drag-over
  document.querySelectorAll('.plan-workout-item.drag-over').forEach(x => x.classList.remove('drag-over'));
  el.classList.add('drag-over');
}

function onWorkoutDrop(e) {
  e.preventDefault();
  const targetEl = e.target.closest('.plan-workout-item');
  if (!targetEl || !dragData) return;

  const targetPlanId = targetEl.dataset.planId;
  const targetDay = targetEl.dataset.day;
  const targetIndex = parseInt(targetEl.dataset.index);

  // Only allow reorder within same plan+day
  if (targetPlanId !== dragData.planId || targetDay !== dragData.day) return;
  if (targetIndex === dragData.index) return;

  const plans = DB.getPlans();
  const plan = plans.find(p => p.id === dragData.planId);
  if (!plan) return;

  const workouts = plan.workouts[dragData.day];
  if (!workouts) return;

  // Move workout from dragData.index to targetIndex
  const [moved] = workouts.splice(dragData.index, 1);
  workouts.splice(targetIndex, 0, moved);

  DB.savePlans(plans);
  renderWorkoutPlans();
}

function onWorkoutDragEnd(e) {
  dragData = null;
  document.querySelectorAll('.plan-workout-item').forEach(el => {
    el.classList.remove('dragging', 'drag-over');
  });
}
