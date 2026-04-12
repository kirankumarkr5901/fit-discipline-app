/* ===============================================
   REWARDS.JS – Micro / Weekly / Monthly Rewards
   =============================================== */

function getRewardsTemplate() {
  return `
    <h1 class="page-title">🏆 Rewards</h1>

    <div class="rewards-dp-bar">
      <div class="dp-display large">
        <span class="dp-icon">⚡</span>
        <span class="dp-value" id="rewards-total-dp">0</span>
        <span class="dp-label">Available Discipline Points</span>
        <div class="dp-actions">
          <button class="btn btn-sm btn-outline dp-action-btn" onclick="openAddPointsModal()">＋ Add</button>
          <button class="btn btn-sm btn-outline dp-action-btn dp-reset-btn" onclick="resetDisciplinePoints()">↺ Reset</button>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" onclick="switchRewardsTab('micro')">🌟 Micro (Daily)</button>
      <button class="tab" onclick="switchRewardsTab('weekly')">📅 Weekly</button>
      <button class="tab" onclick="switchRewardsTab('monthly')">🗓️ Monthly</button>
      <button class="tab" onclick="switchRewardsTab('manage')">⚙️ Manage</button>
    </div>

    <div id="rewards-micro-tab" class="tab-content active">
      <div id="micro-rewards-list" class="rewards-grid"></div>
    </div>
    <div id="rewards-weekly-tab" class="tab-content">
      <div id="weekly-rewards-list" class="rewards-grid"></div>
    </div>
    <div id="rewards-monthly-tab" class="tab-content">
      <div id="monthly-rewards-list" class="rewards-grid"></div>
    </div>
    <div id="rewards-manage-tab" class="tab-content">
      <div class="form-card">
        <h2>Add Reward</h2>
        <div class="form-row">
          <label>Reward Name</label>
          <input type="text" id="reward-name" placeholder="e.g., Cheat meal" />
        </div>
        <div class="form-row">
          <label>Point Cost</label>
          <input type="number" id="reward-cost" value="50" min="1" />
        </div>
        <div class="form-row">
          <label>Category</label>
          <select id="reward-category">
            <option value="micro">Micro (Daily)</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="addReward()">Add Reward</button>
      </div>
      <h2 class="section-title">All Rewards</h2>
      <div id="manage-rewards-list" class="rewards-grid"></div>
    </div>

    <!-- Add Points Modal -->
    <div id="add-points-modal" class="modal-overlay" style="display:none;">
      <div class="modal">
        <div class="modal-header">
          <h2>Add Discipline Points</h2>
          <button class="btn-icon" onclick="closeModal('add-points-modal')">&times;</button>
        </div>
        <div class="form-row">
          <label>Points to Add</label>
          <input type="number" id="add-points-value" value="0" />
        </div>
        <div class="form-row">
          <label>Reason <span class="hint">(optional)</span></label>
          <input type="text" id="add-points-reason" placeholder="e.g., Previous balance carry-over" />
        </div>
        <button class="btn btn-primary" onclick="confirmAddPoints()">Add Points</button>
      </div>
    </div>`;
}

function initRewards() {
  updateDPDisplays();
  cleanupExpiredRewards();
  renderRewards('micro');
  renderRewards('weekly');
  renderRewards('monthly');
}

function switchRewardsTab(tab) {
  document.querySelectorAll('#page-rewards .tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('rewards-' + tab + '-tab').classList.add('active');
  document.querySelectorAll('#page-rewards .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  if (tab === 'manage') renderManageRewards();
}

function addReward() {
  const name = document.getElementById('reward-name').value.trim();
  const cost = parseInt(document.getElementById('reward-cost').value) || 50;
  const category = document.getElementById('reward-category').value;
  if (!name) { showToast('Enter reward name', 'warning'); return; }

  const rewards = DB.getRewards();
  rewards.push({ id: uid(), name, cost, category });
  DB.saveRewards(rewards);
  document.getElementById('reward-name').value = '';
  showToast('Reward added!', 'success');
  renderRewards(category);
  renderManageRewards();
}

function renderRewards(category) {
  const rewards = DB.getRewards().filter(r => r.category === category);
  const claimed = DB.getClaimedRewards();
  const timeKey = getTimeKeyForCategory(category);
  const claimedNow = claimed[timeKey] || {};

  const containerId = category === 'micro' ? 'micro-rewards-list' :
                      category === 'weekly' ? 'weekly-rewards-list' : 'monthly-rewards-list';
  const container = document.getElementById(containerId);

  if (rewards.length === 0) {
    container.innerHTML = '<p class="empty-state">No rewards in this category. Add some in the Manage tab!</p>';
    return;
  }

  const dp = DB.getDP();
  const icons = { micro: '🌟', weekly: '📅', monthly: '🗓️' };

  container.innerHTML = rewards.map(r => {
    const isClaimed = !!claimedNow[r.id];
    const canAfford = dp >= r.cost;
    return `
      <div class="reward-card">
        <div class="reward-icon">${icons[r.category] || '🎁'}</div>
        <div class="reward-name">${escapeHtml(r.name)}</div>
        <div class="reward-cost">⚡ ${r.cost} pts</div>
        ${isClaimed
          ? '<div class="reward-claimed">✅ Claimed!</div>'
          : `<button class="btn ${canAfford ? 'btn-primary' : 'btn-outline'} btn-sm"
              ${canAfford ? '' : 'disabled'}
              onclick="claimReward('${r.id}','${category}')">
              ${canAfford ? 'Claim' : 'Not enough points'}
            </button>`}
      </div>`;
  }).join('');
}

function claimReward(rewardId, category) {
  const rewards = DB.getRewards();
  const reward = rewards.find(r => r.id === rewardId);
  if (!reward) return;

  if (DB.getDP() < reward.cost) {
    showToast('Not enough discipline points!', 'error');
    return;
  }

  addDisciplinePoints(-reward.cost, `Claimed reward: ${reward.name}`);

  const claimed = DB.getClaimedRewards();
  const timeKey = getTimeKeyForCategory(category);
  if (!claimed[timeKey]) claimed[timeKey] = {};
  claimed[timeKey][rewardId] = true;
  DB.saveClaimedRewards(claimed);

  addActivity('reward', `Claimed reward "${reward.name}" (-${reward.cost} pts)`);
  showToast(`🎉 Claimed: ${reward.name}!`, 'success');
  renderRewards(category);
  updateDPDisplays();
}

function getTimeKeyForCategory(category) {
  const today = todayStr();
  switch (category) {
    case 'micro': return 'day_' + today;
    case 'weekly': return 'week_' + getWeekKey(today);
    case 'monthly': return 'month_' + getMonthKey(today);
    default: return 'day_' + today;
  }
}

function cleanupExpiredRewards() {
  const claimed = DB.getClaimedRewards();
  const today = todayStr();
  const keysToKeep = new Set([
    'day_' + today,
    'week_' + getWeekKey(today),
    'month_' + getMonthKey(today)
  ]);

  let changed = false;
  for (const key of Object.keys(claimed)) {
    if (!keysToKeep.has(key)) {
      delete claimed[key];
      changed = true;
    }
  }
  if (changed) DB.saveClaimedRewards(claimed);
}

function renderManageRewards() {
  const rewards = DB.getRewards();
  const container = document.getElementById('manage-rewards-list');

  if (rewards.length === 0) {
    container.innerHTML = '<p class="empty-state">No rewards yet</p>';
    return;
  }

  const labels = { micro: '🌟 Daily', weekly: '📅 Weekly', monthly: '🗓️ Monthly' };
  container.innerHTML = rewards.map(r => `
    <div class="reward-card">
      <div class="reward-name">${escapeHtml(r.name)}</div>
      <div class="reward-cost">⚡ ${r.cost} pts</div>
      <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">${labels[r.category] || r.category}</div>
      <button class="btn btn-xs btn-danger" onclick="deleteReward('${r.id}')">Delete</button>
    </div>`).join('');
}

function deleteReward(rewardId) {
  if (!confirm('Delete this reward?')) return;
  let rewards = DB.getRewards();
  rewards = rewards.filter(r => r.id !== rewardId);
  DB.saveRewards(rewards);
  showToast('Reward deleted', 'info');
  renderRewards('micro');
  renderRewards('weekly');
  renderRewards('monthly');
  renderManageRewards();
}

/* ---- Add / Reset Discipline Points ---- */
function openAddPointsModal() {
  document.getElementById('add-points-value').value = '';
  document.getElementById('add-points-reason').value = '';
  openModal('add-points-modal');
}

function confirmAddPoints() {
  const value = parseInt(document.getElementById('add-points-value').value);
  if (!value || value === 0) { showToast('Enter a valid point amount', 'warning'); return; }

  const reason = document.getElementById('add-points-reason').value.trim() || 'Manual adjustment';
  addDisciplinePoints(value, reason);
  addActivity('points', `${value >= 0 ? '+' : ''}${value}: ${reason}`);
  showToast(`${value >= 0 ? '+' : ''}${value} discipline points added`, 'success');
  closeModal('add-points-modal');
  updateDPDisplays();
  renderRewards('micro');
  renderRewards('weekly');
  renderRewards('monthly');
}

function resetDisciplinePoints() {
  const currentDP = DB.getDP();
  if (!confirm(`Reset all discipline points to 0?\n\nCurrent balance: ${currentDP} pts\n\nThis cannot be undone.`)) return;

  DB.saveDP(0);
  const log = DB.getPointsLog();
  log.unshift({ date: new Date().toISOString(), description: `Points reset (was ${currentDP})`, points: -currentDP });
  if (log.length > 200) log.length = 200;
  DB.savePointsLog(log);

  updateDPDisplays();
  addActivity('points', `Points reset to 0 (was ${currentDP})`);
  showToast('Discipline points reset to 0', 'info');
  renderRewards('micro');
  renderRewards('weekly');
  renderRewards('monthly');
}
