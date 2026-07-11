/**
 * desktop.js — Desktop command-center dashboard logic
 * IoT Smart Apiary Dashboard Demo
 */

// ── State ─────────────────────────────────────────────────────────────────
let expandedHiveId = null;
let simulationTimer = null;
let detailChartInstances = {};

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initData(12);
  renderAll();
  startSimulation();
  buildScenarioButtons();

  // Demo panel
  document.getElementById('demo-trigger').addEventListener('click', toggleDemoPanel);
  document.getElementById('demo-close').addEventListener('click', closeDemoPanel);
});

// ── Simulation ────────────────────────────────────────────────────────────
function startSimulation() {
  simulationTimer = setInterval(() => {
    tickSimulation();
    refreshAll();
  }, 5000);
}

// ── Render Everything ─────────────────────────────────────────────────────
function renderAll() {
  updateHeader();
  updateKPIs();
  renderComparisonCharts();
  renderHiveGrid();
}

function refreshAll() {
  updateHeader();
  updateKPIs();
  renderComparisonCharts();
  renderHiveGrid();
  if (expandedHiveId) {
    renderAccordion(expandedHiveId);
  }
  updateScenarioButtons();
}

// ── Header ────────────────────────────────────────────────────────────────
function updateHeader() {
  const hives = getHives();
  const online = hives.filter((h) => h.status !== 'offline').length;
  const total = hives.length;
  let alerts = 0;
  hives.forEach((h) => {
    if (h.status === 'alert') alerts++;
    if (h.alertLog) {
      h.alertLog.forEach((a) => { if (a.level === 'critical') alerts++; });
    }
  });

  document.getElementById('cmd-online-count').textContent = online;
  document.getElementById('cmd-online-count').style.color = online === total ? '#22c55e' : online < total * 0.8 ? '#ef4444' : '#eab308';

  document.getElementById('cmd-alerts-count').textContent = alerts;
  const alertsEl = document.getElementById('cmd-alerts');
  if (alerts > 0) alertsEl.classList.add('has-alerts');
  else alertsEl.classList.remove('has-alerts');

  document.getElementById('cmd-refresh-time').textContent = new Date().toLocaleTimeString();
}

// ── KPI Tiles ─────────────────────────────────────────────────────────────
function updateKPIs() {
  const hives = getHives();
  const online = hives.filter((h) => h.status !== 'offline');
  const onlineCount = online.length;

  document.getElementById('kpi-online-value').textContent = onlineCount;

  const avgHealth = online.length > 0
    ? Math.round(online.reduce((s, h) => s + h.healthScore, 0) / online.length)
    : 0;
  document.getElementById('kpi-health-value').textContent = avgHealth;
  const healthTile = document.getElementById('kpi-health');
  healthTile.classList.remove('warn', 'critical');
  if (avgHealth < 50) healthTile.classList.add('critical');
  else if (avgHealth < 75) healthTile.classList.add('warn');

  let alerts = 0;
  hives.forEach((h) => {
    if (h.status === 'alert') alerts++;
    if (h.alertLog) h.alertLog.forEach((a) => { if (a.level === 'critical') alerts++; });
  });
  document.getElementById('kpi-alerts-value').textContent = alerts;
  const alertsTile = document.getElementById('kpi-alerts');
  alertsTile.classList.remove('warn', 'critical');
  if (alerts > 2) alertsTile.classList.add('critical');
  else if (alerts > 0) alertsTile.classList.add('warn');

  const avgTemp = online.length > 0
    ? (online.reduce((s, h) => s + h.temperature, 0) / online.length).toFixed(1)
    : '--';
  document.getElementById('kpi-temp-value').textContent = avgTemp + 'C';
}

// ── Comparison Charts ─────────────────────────────────────────────────────
function renderComparisonCharts() {
  const hives = getHives();
  buildHealthBars(hives, 'health-bars-chart');
  buildWeightBars(hives, 'weight-bars-chart');
  buildTempHeatmap(hives, 'temp-heatmap-chart');
}

// ── Hive Grid ─────────────────────────────────────────────────────────────
function renderHiveGrid() {
  const grid = document.getElementById('hive-grid');
  const hives = getHives();

  grid.innerHTML = hives.map((hive) => {
    let statusClass = '';
    if (hive.status === 'offline') statusClass = 'status-offline';
    else if (hive.status === 'alert') statusClass = 'status-alert';
    else if (hive.status === 'warning') statusClass = 'status-warning';

    const activeClass = expandedHiveId === hive.id ? 'active' : '';

    let tempClass = '';
    if (hive.status !== 'offline') {
      if (hive.temperature > 36) tempClass = 'temp-danger';
      else if (hive.temperature > 34) tempClass = 'temp-warning';
    }

    let co2Class = '';
    if (hive.status !== 'offline') {
      if (hive.co2 > 3500) co2Class = 'co2-danger';
      else if (hive.co2 > 3100) co2Class = 'co2-warning';
    }

    const audioClass = 'audio-' + hive.audioStatus.toLowerCase();
    const dotClass = hive.status === 'offline' ? 'offline' : 'online';

    let scoreClass = 'good';
    if (hive.healthScore < 50) scoreClass = 'danger';
    else if (hive.healthScore < 75) scoreClass = 'warning';

    const metrics = hive.status === 'offline'
      ? `<div class="card-desk-metric"><span class="card-desk-metric-label">Status</span><span class="card-desk-metric-value" style="color:#6b7280">OFFLINE</span></div>`
      : `
        <div class="card-desk-metric">
          <span class="card-desk-metric-label">Temp</span>
          <span class="card-desk-metric-value ${tempClass}">${hive.temperature.toFixed(1)}C</span>
        </div>
        <div class="card-desk-metric">
          <span class="card-desk-metric-label">Humidity</span>
          <span class="card-desk-metric-value">${Math.round(hive.humidity)}%</span>
        </div>
        <div class="card-desk-metric">
          <span class="card-desk-metric-label">Weight</span>
          <span class="card-desk-metric-value">${hive.weight.toFixed(1)}kg</span>
        </div>
        <div class="card-desk-metric">
          <span class="card-desk-metric-label">CO2</span>
          <span class="card-desk-metric-value ${co2Class}">${Math.round(hive.co2)}ppm</span>
        </div>`;

    const lastUpdate = hive.status === 'offline'
      ? formatTimeAgo(hive.lastSeen)
      : formatTimeAgo(hive.lastUpdated);

    return `
      <div class="hive-card-desk ${statusClass} ${activeClass}"
           data-hive-id="${hive.id}"
           onclick="toggleAccordion('${hive.id}')">
        <div class="card-desk-top">
          <span class="card-desk-name">${escapeHtml(hive.name)}</span>
          <span class="card-desk-audio ${audioClass}">${hive.audioStatus.replace('_', ' ')}</span>
        </div>
        <div class="card-desk-metrics">${metrics}</div>
        <div class="card-desk-footer">
          <span><span class="card-desk-dot ${dotClass}"></span>${hive.status === 'offline' ? 'Offline' : 'Online'}</span>
          <span class="card-desk-score ${scoreClass}">${hive.healthScore}</span>
          <span>${lastUpdate}</span>
        </div>
      </div>`;
  }).join('');
}

// ── Accordion ─────────────────────────────────────────────────────────────
function toggleAccordion(hiveId) {
  if (expandedHiveId === hiveId) {
    closeAccordion();
  } else {
    expandedHiveId = hiveId;
    renderHiveGrid();
    renderAccordion(hiveId);
    document.getElementById('accordion-panel').classList.add('open');
    document.getElementById('accordion-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function closeAccordion() {
  expandedHiveId = null;
  document.getElementById('accordion-panel').classList.remove('open');
  destroyDetailCharts();
  renderHiveGrid();
}

function renderAccordion(hiveId) {
  const hive = getHiveById(hiveId);
  if (!hive) return;

  const panel = document.getElementById('accordion-panel');
  panel.classList.add('open');

  let detailHTML = `
    <div class="accordion-inner">
      <div class="accordion-header">
        <span class="accordion-hive-name">${escapeHtml(hive.name)} -- Detail View</span>
        <button class="accordion-close" onclick="closeAccordion()">Close</button>
      </div>
      <div class="accordion-charts">
        <div class="accordion-chart-panel">
          <div class="accordion-chart-title">Weight Trend (24h)</div>
          <div class="accordion-chart-wrap"><canvas id="detail-weight-chart"></canvas></div>
        </div>
        <div class="accordion-chart-panel">
          <div class="accordion-chart-title">Environment (24h)</div>
          <div class="accordion-chart-wrap"><canvas id="detail-env-chart"></canvas></div>
        </div>
        <div class="accordion-chart-panel">
          <div class="accordion-chart-title">Audio Timeline</div>
          <div class="accordion-chart-wrap"><canvas id="detail-audio-chart"></canvas></div>
        </div>
      </div>
      <div class="accordion-details">
        <div class="accordion-actuators" id="accord-actuators">
          ${renderActuatorsHTML(hive)}
        </div>
        <div class="accordion-alerts" id="accord-alerts">
          ${renderAlertsHTML(hive)}
        </div>
      </div>
    </div>`;

  document.getElementById('accordion-inner').innerHTML = detailHTML;

  // Build detail charts
  buildDetailWeightChart(hiveId);
  buildDetailEnvChart(hiveId);
  buildDetailAudioChart(hiveId);
}

function renderActuatorsHTML(hive) {
  if (hive.status === 'offline') {
    return `<div style="text-align:center;padding:12px;color:#6b7280;font-size:0.7rem;">Actuators unavailable -- device offline</div>`;
  }
  const fanLevel = hive.fanPWM > 60 ? 'danger' : hive.fanPWM > 30 ? 'warning' : 'normal';
  return `
    <div class="accordion-chart-title" style="margin-bottom:8px;">Actuators</div>
    <div class="actuator-row">
      <span class="actuator-label">Cooling Fan</span>
      <div class="actuator-bar"><div class="actuator-bar-fill ${fanLevel}" style="width:${hive.fanPWM}%"></div></div>
      <span class="actuator-value">${hive.fanPWM}%</span>
    </div>
    <div class="actuator-row">
      <span class="actuator-label">Servo Vent</span>
      <div class="actuator-bar"><div class="actuator-bar-fill normal" style="width:${(hive.servoAngle / 180 * 100).toFixed(0)}%"></div></div>
      <span class="actuator-value">${hive.servoAngle} deg</span>
    </div>
    <div class="actuator-row">
      <span class="actuator-label">Buzzer</span>
      <span class="actuator-state ${hive.buzzerOn ? 'on' : 'off'}">${hive.buzzerOn ? 'ON' : 'OFF'}</span>
    </div>
    <div class="actuator-row">
      <span class="actuator-label">Mode</span>
      <span class="actuator-state on">AUTO</span>
    </div>`;
}

function renderAlertsHTML(hive) {
  if (!hive.alertLog || hive.alertLog.length === 0) {
    return `<div class="accordion-chart-title" style="margin-bottom:8px;">Alert Log</div><div class="alert-empty">No recent alerts</div>`;
  }
  const alerts = hive.alertLog.map((a) => `
    <div class="alert-entry level-${a.level}">
      <span class="alert-entry-time">${formatTimeAgo(a.timestamp)}</span>
      <span class="alert-entry-msg">${escapeHtml(a.message)}</span>
    </div>`).join('');
  return `<div class="accordion-chart-title" style="margin-bottom:8px;">Alert Log</div>${alerts}`;
}

// ── Detail Charts (Accordion) ─────────────────────────────────────────────
function buildDetailWeightChart(hiveId) {
  destroyDetailChart('weight');
  const history = getHistory(hiveId);
  const ctx = document.getElementById('detail-weight-chart').getContext('2d');
  const labels = history.sensors.map((p) => {
    const d = new Date(p.timestamp);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  });
  const data = history.sensors.map((p) => p.weight);

  detailChartInstances.weight = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Weight (kg)',
        data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 3,
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#1a2a3a' }, ticks: { color: '#5a6e80', maxTicksLimit: 6, maxRotation: 0, font: { size: 9 } } },
        y: { grid: { color: '#1a2a3a' }, ticks: { color: '#5a6e80', font: { size: 9 }, callback: (v) => v.toFixed(1) + ' kg' } },
      },
    },
  });
}

function buildDetailEnvChart(hiveId) {
  destroyDetailChart('env');
  const history = getHistory(hiveId);
  const ctx = document.getElementById('detail-env-chart').getContext('2d');
  const labels = history.sensors.map((p) => {
    const d = new Date(p.timestamp);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  });

  detailChartInstances.env = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Temp (C)', data: history.sensors.map((p) => p.temperature), borderColor: '#ef4444', borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 3, fill: false, tension: 0.3, yAxisID: 'y' },
        { label: 'Humidity (%)', data: history.sensors.map((p) => p.humidity), borderColor: '#22c55e', borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 3, fill: false, tension: 0.3, yAxisID: 'y1' },
        { label: 'CO2 (ppm)', data: history.sensors.map((p) => p.co2), borderColor: '#eab308', borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 3, fill: false, tension: 0.3, yAxisID: 'y2' },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: true, position: 'bottom', labels: { color: '#8899aa', usePointStyle: true, boxWidth: 6, padding: 12, font: { size: 9 } } } },
      scales: {
        x: { grid: { color: '#1a2a3a' }, ticks: { color: '#5a6e80', maxTicksLimit: 6, maxRotation: 0, font: { size: 9 } } },
        y: { type: 'linear', position: 'left', grid: { color: '#1a2a3a' }, ticks: { color: '#ef4444', font: { size: 9 }, maxTicksLimit: 4, callback: (v) => v.toFixed(1) + 'C' } },
        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#22c55e', font: { size: 9 }, maxTicksLimit: 4, callback: (v) => v + '%' }, min: 30, max: 90 },
        y2: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#eab308', font: { size: 9 }, maxTicksLimit: 4, callback: (v) => (v / 1000).toFixed(1) + 'k' } },
      },
    },
  });
}

function buildDetailAudioChart(hiveId) {
  destroyDetailChart('audio');
  const history = getHistory(hiveId);
  const ctx = document.getElementById('detail-audio-chart').getContext('2d');
  const labels = history.audio.map((p) => {
    const d = new Date(p.timestamp);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  });
  const statusMap = { 'NORMAL': 0, 'STRESSED': 1, 'PRE_SWARM': 2, 'QUEENLESS': 3 };
  const data = history.audio.map((p) => statusMap[p.status] || 0);

  detailChartInstances.audio = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Audio Status', data,
        borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.1)',
        borderWidth: 2, pointRadius: 0, pointHoverRadius: 3,
        fill: true, stepped: true, tension: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#1a2a3a' }, ticks: { color: '#5a6e80', maxTicksLimit: 6, maxRotation: 0, font: { size: 9 } } },
        y: { min: -0.2, max: 3.2, grid: { color: '#1a2a3a' }, ticks: { color: '#8899aa', stepSize: 1, font: { size: 9 }, callback: (v) => ['NORMAL', 'STRESSED', 'PRE_SWARM', 'QUEENLESS'][v] || '' } },
      },
    },
  });
}

function destroyDetailChart(key) {
  if (detailChartInstances[key]) {
    detailChartInstances[key].destroy();
    detailChartInstances[key] = null;
  }
}

function destroyDetailCharts() {
  Object.keys(detailChartInstances).forEach((k) => {
    if (detailChartInstances[k]) {
      detailChartInstances[k].destroy();
      detailChartInstances[k] = null;
    }
  });
}

// ── Demo Panel ────────────────────────────────────────────────────────────
function toggleDemoPanel() {
  document.getElementById('demo-panel').classList.toggle('open');
}

function closeDemoPanel() {
  document.getElementById('demo-panel').classList.remove('open');
}

// ── Stubs for scenarios.js compatibility ──────────────────────────────────
function renderOverview() {
  renderHiveGrid();
  refreshAll();
}

function updateAlertBadge() {
  updateHeader();
  updateKPIs();
}

function updateDetailLiveData() {
  if (expandedHiveId) {
    const hive = getHiveById(expandedHiveId);
    if (hive) {
      const actuatorsEl = document.getElementById('accord-actuators');
      const alertsEl = document.getElementById('accord-alerts');
      if (actuatorsEl) actuatorsEl.innerHTML = renderActuatorsHTML(hive);
      if (alertsEl) alertsEl.innerHTML = renderAlertsHTML(hive);
    }
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────
function formatTimeAgo(isoString) {
  if (!isoString) return '--';
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return diffSec + 's ago';
  if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago';
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago';
  return Math.floor(diffSec / 86400) + 'd ago';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
