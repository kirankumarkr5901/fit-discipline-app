/* ===============================================
   BODY-METRICS.JS – Body Weight & Height Tracker
   Weekly logging with BMI calculation & charts
   =============================================== */

let weightChart = null;
let bmiChart = null;

function getBodyMetricsTemplate() {
  return `
    <h1 class="page-title">📏 Body Metrics</h1>

    <div class="body-metrics-stats">
      <div class="stat-card accent-blue">
        <div class="stat-icon">⚖️</div>
        <div class="stat-value" id="bm-current-weight">--</div>
        <div class="stat-label">Current Weight (kg)</div>
      </div>
      <div class="stat-card accent-green">
        <div class="stat-icon">📐</div>
        <div class="stat-value" id="bm-current-height">--</div>
        <div class="stat-label">Current Height (cm)</div>
      </div>
      <div class="stat-card accent-purple">
        <div class="stat-icon">📊</div>
        <div class="stat-value" id="bm-current-bmi">--</div>
        <div class="stat-label">BMI</div>
      </div>
      <div class="stat-card accent-orange">
        <div class="stat-icon">📉</div>
        <div class="stat-value" id="bm-weight-change">--</div>
        <div class="stat-label">Weight Change</div>
      </div>
    </div>

    <div class="body-metrics-form">
      <h2>📝 Log Body Metrics</h2>
      <div class="body-metrics-form-row">
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="bm-log-date" />
        </div>
        <div class="form-group">
          <label>Weight (kg)</label>
          <input type="number" id="bm-log-weight" step="0.1" min="20" max="300" placeholder="e.g. 75.5" />
        </div>
        <div class="form-group">
          <label>Height (cm)</label>
          <input type="number" id="bm-log-height" step="0.1" min="50" max="250" placeholder="e.g. 175" />
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end;">
          <button class="btn btn-primary" onclick="saveBodyMetric()">💾 Save</button>
        </div>
      </div>
    </div>

    <div class="body-metrics-charts">
      <div class="body-metrics-chart-card">
        <h3>⚖️ Weight Progress</h3>
        <canvas id="weight-progress-chart"></canvas>
      </div>
      <div class="body-metrics-chart-card">
        <h3>📊 BMI Progress</h3>
        <canvas id="bmi-progress-chart"></canvas>
      </div>
    </div>

    <div class="body-metrics-history">
      <h2>📋 Log History</h2>
      <div id="bm-history-table"></div>
    </div>`;
}

function initBodyMetrics() {
  const dateInput = document.getElementById('bm-log-date');
  if (dateInput && !dateInput.value) dateInput.value = todayStr();

  // Pre-fill height from last entry
  const logs = DB.getBodyMetrics();
  if (logs.length > 0) {
    const lastHeight = logs[0].height;
    const heightInput = document.getElementById('bm-log-height');
    if (heightInput && !heightInput.value && lastHeight) {
      heightInput.value = lastHeight;
    }
  }

  loadBodyMetricsStats();
  loadBodyMetricsHistory();
  renderBodyMetricsCharts();
}

function saveBodyMetric() {
  const date = document.getElementById('bm-log-date').value;
  const weight = parseFloat(document.getElementById('bm-log-weight').value);
  const height = parseFloat(document.getElementById('bm-log-height').value);

  if (!date) { showToast('Select a date', 'warning'); return; }
  if (!weight || weight < 20 || weight > 300) { showToast('Enter a valid weight (20-300 kg)', 'warning'); return; }
  if (!height || height < 50 || height > 250) { showToast('Enter a valid height (50-250 cm)', 'warning'); return; }

  const bmi = calculateBMI(weight, height);

  const logs = DB.getBodyMetrics();

  // Check if entry exists for this date – update it
  const existingIdx = logs.findIndex(l => l.date === date);
  const entry = {
    id: existingIdx >= 0 ? logs[existingIdx].id : uid(),
    date,
    weight,
    height,
    bmi: parseFloat(bmi.toFixed(1))
  };

  if (existingIdx >= 0) {
    logs[existingIdx] = entry;
    showToast('Body metrics updated!', 'success');
  } else {
    logs.push(entry);
    showToast('Body metrics logged!', 'success');
  }

  // Sort newest first
  logs.sort((a, b) => b.date.localeCompare(a.date));
  DB.saveBodyMetrics(logs);

  // Clear weight input for next entry, keep height
  document.getElementById('bm-log-weight').value = '';

  addActivity('body-metrics', `Logged body metrics: ${weight}kg, ${height}cm (BMI: ${bmi.toFixed(1)})`);

  loadBodyMetricsStats();
  loadBodyMetricsHistory();
  renderBodyMetricsCharts();
}

function deleteBodyMetric(id) {
  const logs = DB.getBodyMetrics();
  const idx = logs.findIndex(l => l.id === id);
  if (idx < 0) return;

  logs.splice(idx, 1);
  DB.saveBodyMetrics(logs);

  showToast('Entry deleted', 'info');
  loadBodyMetricsStats();
  loadBodyMetricsHistory();
  renderBodyMetricsCharts();
}

function calculateBMI(weightKg, heightCm) {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

function getBMICategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', cssClass: 'bmi-underweight' };
  if (bmi < 25) return { label: 'Normal', cssClass: 'bmi-normal' };
  if (bmi < 30) return { label: 'Overweight', cssClass: 'bmi-overweight' };
  return { label: 'Obese', cssClass: 'bmi-obese' };
}

function loadBodyMetricsStats() {
  const logs = DB.getBodyMetrics();

  if (logs.length === 0) {
    document.getElementById('bm-current-weight').textContent = '--';
    document.getElementById('bm-current-height').textContent = '--';
    document.getElementById('bm-current-bmi').textContent = '--';
    document.getElementById('bm-weight-change').textContent = '--';
    return;
  }

  const latest = logs[0]; // newest first
  document.getElementById('bm-current-weight').textContent = latest.weight;
  document.getElementById('bm-current-height').textContent = latest.height;

  const cat = getBMICategory(latest.bmi);
  document.getElementById('bm-current-bmi').innerHTML =
    `${latest.bmi} <span class="bmi-badge ${cat.cssClass}">${cat.label}</span>`;

  if (logs.length >= 2) {
    const prev = logs[1];
    const diff = (latest.weight - prev.weight).toFixed(1);
    const sign = diff > 0 ? '+' : '';
    const cls = diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral';
    document.getElementById('bm-weight-change').innerHTML =
      `<span class="metric-change ${cls}">${sign}${diff} kg</span>`;
  } else {
    document.getElementById('bm-weight-change').textContent = '--';
  }
}

function loadBodyMetricsHistory() {
  const logs = DB.getBodyMetrics();
  const container = document.getElementById('bm-history-table');

  if (logs.length === 0) {
    container.innerHTML = '<p class="empty-state">No entries yet. Log your first body metrics above!</p>';
    return;
  }

  let html = `
    <table class="body-metrics-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Weight (kg)</th>
          <th>Height (cm)</th>
          <th>BMI</th>
          <th>Change</th>
          <th></th>
        </tr>
      </thead>
      <tbody>`;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const cat = getBMICategory(log.bmi);

    let changeHtml = '--';
    if (i < logs.length - 1) {
      const prev = logs[i + 1]; // older entry (sorted newest first)
      const diff = (log.weight - prev.weight).toFixed(1);
      const sign = diff > 0 ? '+' : '';
      const cls = diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral';
      changeHtml = `<span class="metric-change ${cls}">${sign}${diff} kg</span>`;
    }

    html += `
        <tr>
          <td>${formatDate(log.date)}</td>
          <td>${log.weight}</td>
          <td>${log.height}</td>
          <td><span class="bmi-badge ${cat.cssClass}">${log.bmi} · ${cat.label}</span></td>
          <td>${changeHtml}</td>
          <td><button class="btn btn-danger btn-xs" onclick="deleteBodyMetric('${log.id}')">🗑️</button></td>
        </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

function renderBodyMetricsCharts() {
  const logs = DB.getBodyMetrics().slice().sort((a, b) => a.date.localeCompare(b.date));
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#e8e8f0' : '#1a1a2e';
  const gridColor = isDark ? '#33334d' : '#e2e5ea';
  const mutedColor = isDark ? '#a0a0b8' : '#555770';

  // Weight Chart
  const weightCanvas = document.getElementById('weight-progress-chart');
  if (weightChart) weightChart.destroy();

  if (logs.length > 0) {
    weightChart = new Chart(weightCanvas, {
      type: 'line',
      data: {
        labels: logs.map(l => formatDate(l.date)),
        datasets: [{
          label: 'Weight (kg)',
          data: logs.map(l => l.weight),
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
        plugins: { legend: { labels: { color: textColor } } },
        scales: {
          x: { ticks: { color: mutedColor }, grid: { color: gridColor } },
          y: { ticks: { color: mutedColor }, grid: { color: gridColor },
               title: { display: true, text: 'kg', color: mutedColor } }
        }
      }
    });
  }

  // BMI Chart
  const bmiCanvas = document.getElementById('bmi-progress-chart');
  if (bmiChart) bmiChart.destroy();

  if (logs.length > 0) {
    bmiChart = new Chart(bmiCanvas, {
      type: 'line',
      data: {
        labels: logs.map(l => formatDate(l.date)),
        datasets: [{
          label: 'BMI',
          data: logs.map(l => l.bmi),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: '#8b5cf6',
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: textColor } },
          annotation: undefined
        },
        scales: {
          x: { ticks: { color: mutedColor }, grid: { color: gridColor } },
          y: {
            ticks: { color: mutedColor },
            grid: { color: gridColor },
            title: { display: true, text: 'BMI', color: mutedColor },
            suggestedMin: 15,
            suggestedMax: 35
          }
        }
      }
    });
  }
}
