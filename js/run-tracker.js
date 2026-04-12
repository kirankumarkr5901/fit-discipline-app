/* ===============================================
   RUN-TRACKER.JS – Run Logging, Pace, PRs, Chart
   =============================================== */

let runChart = null;

function getRunTrackerTemplate() {
  return `
    <h1 class="page-title">🏃 Run Tracker</h1>

    <div class="run-points-banner">
      <div class="run-points-banner-icon">⚡</div>
      <div class="run-points-banner-content">
        <div class="run-points-banner-value" id="run-total-points">0</div>
        <div class="run-points-banner-label">Total Run Points Earned</div>
      </div>
    </div>

    <div class="form-card">
      <h2>Log a Run</h2>
      <div class="form-row">
        <label>Date</label>
        <div class="tracker-date-bar">
          <button class="btn btn-sm" onclick="changeRunDate(-1)">◀</button>
          <input type="date" id="run-date" />
          <button class="btn btn-sm" onclick="changeRunDate(1)">▶</button>
          <button class="btn btn-sm btn-outline" onclick="setRunDateToday()">Today</button>
        </div>
      </div>
      <div class="form-row">
        <label>Distance (km)</label>
        <input type="number" id="run-distance" step="0.1" min="0" placeholder="e.g., 5.0" />
      </div>
      <div class="form-row">
        <label>Time (minutes)</label>
        <input type="number" id="run-time" step="0.1" min="0" placeholder="e.g., 30" />
      </div>
      <div class="form-row inline" style="gap:8px">
        <button class="btn btn-primary" onclick="logRun()" style="flex:1">Log Run</button>
        <button class="btn btn-outline btn-sm" onclick="logUnrecordedRun()" title="Log a past run (distance only, no points)">Log Unrecorded</button>
      </div>
    </div>

    <div class="run-stats-grid">
      <div class="stat-card accent-blue">
        <div class="stat-icon">🏅</div>
        <div class="stat-value" id="run-today-pr">--</div>
        <div class="stat-label">Today's Best Pace</div>
      </div>
      <div class="stat-card accent-green">
        <div class="stat-icon">🏆</div>
        <div class="stat-value" id="run-lifetime-pr">--</div>
        <div class="stat-label">Lifetime Best Pace</div>
      </div>
      <div class="stat-card accent-orange">
        <div class="stat-icon">📏</div>
        <div class="stat-value" id="run-total-distance">0</div>
        <div class="stat-label">Total Distance (km)</div>
      </div>
      <div class="stat-card accent-purple">
        <div class="stat-icon">🔢</div>
        <div class="stat-value" id="run-total-runs">0</div>
        <div class="stat-label">Total Runs</div>
      </div>
    </div>

    <div id="run-new-pr-banner" class="pr-banner" style="display:none;">
      🎉 New PR! You smashed your lifetime best pace!
    </div>

    <h2 class="section-title">Run History</h2>
    <div id="run-history-list" class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr><th>Date</th><th>Distance</th><th>Time</th><th>Pace</th><th>Points</th><th>Actions</th></tr>
        </thead>
        <tbody id="run-history-body"></tbody>
      </table>
    </div>

    <!-- Edit Run Modal -->
    <div id="edit-run-modal" class="modal-overlay" style="display:none;">
      <div class="modal">
        <div class="modal-header">
          <h2>Edit Run</h2>
          <button class="btn-icon" onclick="closeModal('edit-run-modal')">&times;</button>
        </div>
        <div class="form-row">
          <label>Date</label>
          <input type="date" id="edit-run-date" />
        </div>
        <div class="form-row">
          <label>Distance (km)</label>
          <input type="number" id="edit-run-distance" step="0.1" min="0" />
        </div>
        <div class="form-row">
          <label>Time (minutes)</label>
          <input type="number" id="edit-run-time" step="0.1" min="0" />
        </div>
        <input type="hidden" id="edit-run-id" />
        <button class="btn btn-primary" onclick="saveEditRun()">Save</button>
      </div>
    </div>

    <div class="chart-container">
      <h2 class="section-title">Progress</h2>
      <canvas id="run-progress-chart"></canvas>
    </div>`;
}

function initRunTracker() {
  const dateInput = document.getElementById('run-date');
  if (!dateInput.value) dateInput.value = todayStr();
  loadRunStats();
  loadRunHistory();
  renderRunChart();
}

function setRunDateToday() {
  document.getElementById('run-date').value = todayStr();
}

function changeRunDate(delta) {
  const input = document.getElementById('run-date');
  const d = new Date(input.value + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  input.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function logRun() {
  const date = document.getElementById('run-date').value;
  const distance = parseFloat(document.getElementById('run-distance').value);
  const time = parseFloat(document.getElementById('run-time').value);

  if (!date) { showToast('Select a date', 'warning'); return; }
  if (!distance || distance <= 0) { showToast('Enter a valid distance', 'warning'); return; }
  if (!time || time <= 0) { showToast('Enter a valid time', 'warning'); return; }

  const pace = time / distance;
  const runs = DB.getRunLogs();
  const lifetimeBestPace = getLifetimeBestPace();

  const run = { id: uid(), date, distance, time, pace: pace.toFixed(2) };
  runs.push(run);
  runs.sort((a, b) => b.date.localeCompare(a.date));
  DB.saveRunLogs(runs);

  const completedKm = Math.floor(distance);
  if (completedKm > 0) {
    addDisciplinePoints(completedKm * 10, `Running: ${completedKm}km completed`);
  }

  if (lifetimeBestPace > 0 && runs.length > 1) {
    const allPaces = runs.map(r => parseFloat(r.pace)).filter(p => p > 0).sort((a, b) => a - b);
    const rank = allPaces.indexOf(parseFloat(run.pace)) + 1;

    if (rank === 1) {
      const bonus = Math.round(distance * 2);
      addDisciplinePoints(bonus, `New #1 PR pace! (${pace.toFixed(2)} min/km)`);
      document.getElementById('run-new-pr-banner').style.display = 'block';
      showToast(`New PR! 🎉 +${completedKm * 10 + bonus} discipline points!`, 'success');
    } else if (rank === 2) {
      const bonus = Math.round(distance * 1.5);
      addDisciplinePoints(bonus, `New #2 PR pace! (${pace.toFixed(2)} min/km)`);
      showToast(`2nd best pace! +${completedKm * 10 + bonus} points!`, 'success');
    } else if (rank === 3) {
      const bonus = Math.round(distance);
      addDisciplinePoints(bonus, `New #3 PR pace! (${pace.toFixed(2)} min/km)`);
      showToast(`3rd best pace! +${completedKm * 10 + bonus} points!`, 'success');
    } else {
      showToast(`Run logged! +${completedKm * 10} discipline points 🏃`, 'success');
      document.getElementById('run-new-pr-banner').style.display = 'none';
    }
  } else if (runs.length === 1) {
    const bonus = Math.round(distance * 2);
    addDisciplinePoints(bonus, `First run PR! (${pace.toFixed(2)} min/km)`);
    document.getElementById('run-new-pr-banner').style.display = 'block';
    showToast(`First run logged! 🎉 +${completedKm * 10 + bonus} points!`, 'success');
  } else {
    showToast(`Run logged! +${completedKm * 10} discipline points 🏃`, 'success');
  }

  addActivity('run', `Ran ${distance}km in ${time}min (${pace.toFixed(2)} min/km)`);
  document.getElementById('run-distance').value = '';
  document.getElementById('run-time').value = '';

  loadRunStats();
  loadRunHistory();
  renderRunChart();
}

function getLifetimeBestPace() {
  const runs = DB.getRunLogs();
  if (runs.length === 0) return 0;
  const paces = runs.map(r => parseFloat(r.pace)).filter(p => p > 0);
  return paces.length > 0 ? Math.min(...paces) : 0;
}

function loadRunStats() {
  const runs = DB.getRunLogs();
  const today = todayStr();
  const todayRuns = runs.filter(r => r.date === today && r.pace != null);
  const recordedRuns = runs.filter(r => r.pace != null);

  document.getElementById('run-today-pr').textContent =
    todayRuns.length > 0
      ? Math.min(...todayRuns.map(r => parseFloat(r.pace))).toFixed(2) + ' min/km'
      : '--';

  document.getElementById('run-lifetime-pr').textContent =
    recordedRuns.length > 0
      ? Math.min(...recordedRuns.map(r => parseFloat(r.pace))).toFixed(2) + ' min/km'
      : '--';

  document.getElementById('run-total-distance').textContent =
    runs.reduce((sum, r) => sum + r.distance, 0).toFixed(1);

  document.getElementById('run-total-runs').textContent = runs.length;

  // Calculate total run points from points log
  const pointsLog = DB.getPointsLog();
  const runPoints = pointsLog
    .filter(p => p.description && (p.description.startsWith('Running:') || p.description.includes('PR pace') || p.description.startsWith('First run')))
    .reduce((sum, p) => sum + (p.points || 0), 0);
  document.getElementById('run-total-points').textContent = runPoints;

  if (todayRuns.length > 0 && recordedRuns.length > 0) {
    const bestToday = Math.min(...todayRuns.map(r => parseFloat(r.pace)));
    const bestEver = Math.min(...recordedRuns.map(r => parseFloat(r.pace)));
    document.getElementById('run-new-pr-banner').style.display =
      bestToday <= bestEver ? 'block' : 'none';
  } else {
    document.getElementById('run-new-pr-banner').style.display = 'none';
  }
}

function loadRunHistory() {
  const runs = DB.getRunLogs();
  const body = document.getElementById('run-history-body');

  if (runs.length === 0) {
    body.innerHTML = '<tr><td colspan="6" class="empty-state">No runs logged yet</td></tr>';
    return;
  }

  // Pre-compute PR rankings for points display
  const recordedRuns = runs.filter(r => r.pace != null);
  const sortedPaces = recordedRuns.map(r => parseFloat(r.pace)).sort((a, b) => a - b);

  body.innerHTML = runs.map(r => {
    let points = '';
    if (r.time != null && r.pace != null) {
      const baseKm = Math.floor(r.distance);
      let base = baseKm * 10;
      let bonus = 0;
      const pace = parseFloat(r.pace);
      // Find rank using tolerance for float matching
      const rank = sortedPaces.findIndex(p => Math.abs(p - pace) < 0.001) + 1;
      if (recordedRuns.length <= 1) {
        // First run always gets #1 PR bonus
        bonus = Math.round(r.distance * 2);
      } else if (rank === 1) {
        bonus = Math.round(r.distance * 2);
      } else if (rank === 2) {
        bonus = Math.round(r.distance * 1.5);
      } else if (rank === 3) {
        bonus = Math.round(r.distance);
      }
      points = bonus > 0
        ? `<span class="run-points-base">${base}</span> + <span class="run-points-bonus">${bonus}</span>`
        : `<span class="run-points-base">${base}</span>`;
    }
    return `
    <tr>
      <td>${formatDate(r.date)}</td>
      <td>${r.distance} km</td>
      <td>${r.time != null ? r.time + ' min' : '—'}</td>
      <td>${r.pace != null ? r.pace + ' min/km' : '—'}</td>
      <td>${points || '—'}</td>
      <td>
        <button class="btn btn-xs btn-outline" onclick="openEditRunModal('${r.id}')" title="Edit">✏️</button>
        <button class="btn btn-xs btn-danger" onclick="deleteRun('${r.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function deleteRun(runId) {
  if (!confirm('Delete this run?')) return;
  let runs = DB.getRunLogs();
  runs = runs.filter(r => r.id !== runId);
  DB.saveRunLogs(runs);
  showToast('Run deleted', 'info');
  loadRunStats();
  loadRunHistory();
  renderRunChart();
}

function logUnrecordedRun() {
  const date = document.getElementById('run-date').value;
  const distance = parseFloat(document.getElementById('run-distance').value);
  const timeVal = document.getElementById('run-time').value;
  const time = timeVal ? parseFloat(timeVal) : null;

  if (!date) { showToast('Select a date', 'warning'); return; }
  if (!distance || distance <= 0) { showToast('Enter a valid distance', 'warning'); return; }

  const runs = DB.getRunLogs();

  const run = { id: uid(), date, distance };
  if (time && time > 0) {
    run.time = time;
    run.pace = (time / distance).toFixed(2);
  }
  runs.push(run);
  runs.sort((a, b) => b.date.localeCompare(a.date));
  DB.saveRunLogs(runs);

  showToast(`Unrecorded run logged (no points awarded) 🏃`, 'info');

  document.getElementById('run-distance').value = '';
  document.getElementById('run-time').value = '';

  loadRunStats();
  loadRunHistory();
  renderRunChart();
}

function openEditRunModal(runId) {
  const runs = DB.getRunLogs();
  const r = runs.find(x => x.id === runId);
  if (!r) return;
  document.getElementById('edit-run-id').value = r.id;
  document.getElementById('edit-run-date').value = r.date;
  document.getElementById('edit-run-distance').value = r.distance;
  document.getElementById('edit-run-time').value = r.time;
  openModal('edit-run-modal');
}

function saveEditRun() {
  const id = document.getElementById('edit-run-id').value;
  const date = document.getElementById('edit-run-date').value;
  const distance = parseFloat(document.getElementById('edit-run-distance').value);
  const time = parseFloat(document.getElementById('edit-run-time').value);

  if (!date) { showToast('Select a date', 'warning'); return; }
  if (!distance || distance <= 0) { showToast('Enter a valid distance', 'warning'); return; }
  if (!time || time <= 0) { showToast('Enter a valid time', 'warning'); return; }

  const runs = DB.getRunLogs();
  const r = runs.find(x => x.id === id);
  if (!r) return;
  r.date = date;
  r.distance = distance;
  r.time = time;
  r.pace = (time / distance).toFixed(2);
  runs.sort((a, b) => b.date.localeCompare(a.date));
  DB.saveRunLogs(runs);

  closeModal('edit-run-modal');
  showToast('Run updated', 'success');
  loadRunStats();
  loadRunHistory();
  renderRunChart();
}

function renderRunChart() {
  const canvas = document.getElementById('run-progress-chart');
  if (runChart) runChart.destroy();

  const runs = DB.getRunLogs().slice().sort((a, b) => a.date.localeCompare(b.date));
  if (runs.length === 0) return;

  const labels = runs.map(r => formatDate(r.date));
  const paceData = runs.map(r => r.pace != null ? parseFloat(r.pace) : null);
  const distData = runs.map(r => r.distance);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  runChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Pace (min/km)', data: paceData,
          borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: false, tension: 0.3, yAxisID: 'y',
        },
        {
          label: 'Distance (km)', data: distData,
          borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: false, tension: 0.3, yAxisID: 'y1',
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: isDark ? '#e8e8f0' : '#1a1a2e' } } },
      scales: {
        x: { ticks: { color: isDark ? '#a0a0b8' : '#555770' }, grid: { color: isDark ? '#33334d' : '#e2e5ea' } },
        y: {
          type: 'linear', display: true, position: 'left',
          title: { display: true, text: 'Pace (min/km)', color: isDark ? '#a0a0b8' : '#555770' },
          ticks: { color: isDark ? '#a0a0b8' : '#555770' },
          grid: { color: isDark ? '#33334d' : '#e2e5ea' }
        },
        y1: {
          type: 'linear', display: true, position: 'right',
          title: { display: true, text: 'Distance (km)', color: isDark ? '#a0a0b8' : '#555770' },
          ticks: { color: isDark ? '#a0a0b8' : '#555770' },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}
