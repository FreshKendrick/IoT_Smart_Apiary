/**
 * app.js — App initialization, navigation, and rendering
 * IoT Smart Apiary Dashboard Demo
 * Bottom tab navigation + overview/detail screens
 */

// ── State ─────────────────────────────────────────────────────────────────
let currentHiveId = null;
let simulationInterval = null;

// ── DOM Refs ──────────────────────────────────────────────────────────────
const overviewScreen = document.getElementById('overview-screen');
const detailScreen = document.getElementById('detail-screen');
const hiveList = document.getElementById('hive-list');
const alertCount = document.getElementById('alert-count');
const alertIndicator = document.getElementById('alert-indicator');
const backButton = document.getElementById('back-button');
const detailHiveName = document.getElementById('detail-hive-name');
const detailConnection = document.getElementById('detail-connection');
const healthScoreValue = document.getElementById('health-score-value');
const healthStatusText = document.getElementById('health-status-text');
const healthRingFill = document.getElementById('health-ring-fill');
const sensorGrid = document.getElementById('sensor-grid');
const actuatorPanel = document.getElementById('actuator-panel');
const alertLog = document.getElementById('alert-log');
const demoTrigger = document.getElementById('demo-trigger');
const demoPanel = document.getElementById('demo-panel');
const demoClose = document.getElementById('demo-close');

// ── Init ──────────────────────────────────────────────────────────────────
function init() {
  initData(4);
  initBottomNav();
  initDrawer();
  renderOverview();
  startSimulation();
  buildScenarioButtons();

  // Event listeners
  backButton.addEventListener('click', navigateToOverview);
  demoTrigger.addEventListener('click', toggleDemoPanel);
  demoClose.addEventListener('click', closeDemoPanel);
}

// ── Bottom Navigation ─────────────────────────────────────────────────────
function initBottomNav() {
  const tabs = document.querySelectorAll('.bottom-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      // Update active
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      switch (tabName) {
        case 'hives':
          // Return to overview
          if (detailScreen.classList.contains('active')) {
            navigateToOverview();
          }
          break;
        case 'stats':
          // Show stats panel (within overview)
          renderStatsView();
          if (detailScreen.classList.contains('active')) {
            navigateToOverview();
          }
          break;
        case 'alerts-tab':
          // Show consolidated alerts
          renderAlertsView();
          if (detailScreen.classList.contains('active')) {
            navigateToOverview();
          }
          break;
        case 'more':
          // Open the drawer
          openDrawer();
          break;
      }
    });
  });
}

function updateTabAlertBadge() {
  const hives = getHives();
  let count = 0;
  hives.forEach((h) => {
    if (h.status === 'alert') count++;
    if (h.alertLog) {
      h.alertLog.forEach((a) => {
        if (a.level === 'critical') count++;
      });
    }
  });

  const badge = document.getElementById('tab-alert-badge');
  badge.textContent = count > 0 ? count : '';
  badge.setAttribute('data-count', count);
}

// ── Drawer ────────────────────────────────────────────────────────────────
function initDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const closeBtn = document.getElementById('drawer-close');

  overlay.addEventListener('click', closeDrawer);
  closeBtn.addEventListener('click', closeDrawer);
}

function openDrawer() {
  document.getElementById('mobile-drawer').classList.add('open');
}

function closeDrawer() {
  document.getElementById('mobile-drawer').classList.remove('open');
  // Switch back to hives tab
  const tabs = document.querySelectorAll('.bottom-tab');
  tabs.forEach((t) => t.classList.remove('active'));
  const hivesTab = document.querySelector('[data-tab="hives"]');
  if (hivesTab) hivesTab.classList.add('active');
}

// ── Stats View ────────────────────────────────────────────────────────────
function renderStatsView() {
  const hives = getHives();
  const online = hives.filter((h) => h.status !== 'offline');
  const avgHealth = online.length > 0
    ? Math.round(online.reduce((s, h) => s + h.healthScore, 0) / online.length)
    : 0;
  const avgTemp = online.length > 0
    ? (online.reduce((s, h) => s + h.temperature, 0) / online.length).toFixed(1)
    : '--';
  let alerts = 0;
  hives.forEach((h) => {
    if (h.status === 'alert') alerts++;
    if (h.alertLog) h.alertLog.forEach((a) => { if (a.level === 'critical') alerts++; });
  });

  hiveList.innerHTML = `
    <div class="stats-content">
      <div class="stats-kpi-row">
        <div class="stats-kpi-card">
          <span class="stats-kpi-value">${online.length} / ${hives.length}</span>
          <span class="stats-kpi-label">Hives Online</span>
        </div>
        <div class="stats-kpi-card">
          <span class="stats-kpi-value">${avgHealth}</span>
          <span class="stats-kpi-label">Avg Health</span>
        </div>
        <div class="stats-kpi-card">
          <span class="stats-kpi-value">${alerts}</span>
          <span class="stats-kpi-label">Active Alerts</span>
        </div>
        <div class="stats-kpi-card">
          <span class="stats-kpi-value">${avgTemp}°C</span>
          <span class="stats-kpi-label">Avg Temp</span>
        </div>
      </div>
      <div class="detail-section">
        <h3 class="section-title">Hive Health Overview</h3>
        <div class="chart-container">
          <canvas id="stats-health-chart"></canvas>
        </div>
      </div>
    </div>`;

  // Build mini health bars chart
  setTimeout(() => {
    const canvas = document.getElementById('stats-health-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hives.map((h) => h.name),
        datasets: [{
          data: hives.map((h) => h.healthScore),
          backgroundColor: hives.map((h) => {
            if (h.healthScore >= 75) return '#2ea868';
            if (h.healthScore >= 50) return '#d9982b';
            return '#d94848';
          }),
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { min: 0, max: 100, grid: { color: '#1c2530' }, ticks: { color: '#54687a' } },
          y: { grid: { display: false }, ticks: { color: '#8b9eb0', font: { size: 11 } } },
        },
      },
    });
  }, 100);
}

// ── Alerts View ───────────────────────────────────────────────────────────
function renderAlertsView() {
  const hives = getHives();
  let allAlerts = [];
  hives.forEach((h) => {
    if (h.alertLog && h.alertLog.length > 0) {
      h.alertLog.forEach((a) => {
        allAlerts.push({ ...a, hiveName: h.name, hiveId: h.id });
      });
    }
  });

  if (allAlerts.length === 0) {
    hiveList.innerHTML = `
      <div style="padding: var(--space-8) var(--space-4); text-align: center; color: var(--text-muted);">
        <p>No alerts</p>
      </div>`;
    return;
  }

  allAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  hiveList.innerHTML = `
    <div style="padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2);">
      ${allAlerts.map((a) => `
        <div class="alert-entry level-${a.level}" style="cursor:pointer;"
             onclick="navigateToDetail('${a.hiveId}')">
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-weight:600;font-size:0.8rem;">${escapeHtml(a.hiveName)}</span>
              <span class="alert-entry-time">${formatTimeAgo(a.timestamp)}</span>
            </div>
            <span style="font-size:0.75rem;color:var(--text-secondary);">${escapeHtml(a.message)}</span>
          </div>
        </div>
      `).join('')}
    </div>`;
}

// ── Simulation ────────────────────────────────────────────────────────────
function startSimulation() {
  simulationInterval = setInterval(() => {
    tickSimulation();
    renderOverview();
    updateAlertBadge();
    if (currentHiveId) {
      updateDetailLiveData();
    }
  }, 5000);
}

// ── Overview Rendering ────────────────────────────────────────────────────
function renderOverview() {
  const hives = getHives();
  hiveList.innerHTML = '';

  hives.forEach((hive) => {
    const card = createHiveCard(hive);
    card.addEventListener('click', () => navigateToDetail(hive.id));
    hiveList.appendChild(card);
  });
}

function createHiveCard(hive) {
  const card = document.createElement('div');
  card.className = 'hive-card';
  card.dataset.hiveId = hive.id;

  // Status class
  if (hive.status === 'offline') {
    card.classList.add('status-offline');
  } else if (hive.status === 'alert') {
    card.classList.add('status-alert');
  } else if (hive.status === 'warning') {
    card.classList.add('status-warning');
  }

  // Temp color class
  let tempClass = '';
  if (hive.status !== 'offline') {
    if (hive.temperature > 36) tempClass = 'temp-danger';
    else if (hive.temperature > 34) tempClass = 'temp-warning';
  }

  // CO2 color class
  let co2Class = '';
  if (hive.status !== 'offline') {
    if (hive.co2 > 3500) co2Class = 'co2-danger';
    else if (hive.co2 > 3100) co2Class = 'co2-warning';
  }

  // Audio class
  const audioClass = 'audio-' + hive.audioStatus.toLowerCase();

  // Health ring
  const score = hive.healthScore;
  const circumference = 2 * Math.PI * 22;
  const offset = circumference - (score / 100) * circumference;
  let strokeColor = '#2ea868';
  if (score < 50) strokeColor = '#d94848';
  else if (score < 75) strokeColor = '#d9982b';

  // Connection dot
  const dotClass = hive.status === 'offline' ? 'offline' : 'online';
  const statusLabel = hive.status === 'offline' ? 'Offline' : 'Online';
  const lastUpdate = hive.status === 'offline'
    ? formatTimeAgo(hive.lastSeen)
    : formatTimeAgo(hive.lastUpdated);

  card.innerHTML = `
    <div class="hive-card-top">
      <div class="hive-card-info">
        <h3>${escapeHtml(hive.name)}</h3>
        <span class="hive-card-audio ${audioClass}">${hive.audioStatus.replace('_', ' ')}</span>
      </div>
      <div class="health-mini">
        <svg viewBox="0 0 52 52">
          <circle class="health-mini-ring-bg" cx="26" cy="26" r="22"/>
          <circle class="health-mini-ring-fill" cx="26" cy="26" r="22"
            stroke="${strokeColor}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"/>
          <text class="health-mini-text" x="26" y="27">${score}</text>
        </svg>
      </div>
    </div>
    <div class="hive-card-metrics">
      <div class="hive-metric">
        <span class="hive-metric-label">Temp</span>
        <span class="hive-metric-value ${tempClass}">${hive.status === 'offline' ? '--' : hive.temperature.toFixed(1) + 'C'}</span>
      </div>
      <div class="hive-metric">
        <span class="hive-metric-label">Humidity</span>
        <span class="hive-metric-value">${hive.status === 'offline' ? '--' : Math.round(hive.humidity) + '%'}</span>
      </div>
      <div class="hive-metric">
        <span class="hive-metric-label">Weight</span>
        <span class="hive-metric-value">${hive.status === 'offline' ? '--' : hive.weight.toFixed(1) + 'kg'}</span>
      </div>
      <div class="hive-metric">
        <span class="hive-metric-label">CO2</span>
        <span class="hive-metric-value ${co2Class}">${hive.status === 'offline' ? '--' : Math.round(hive.co2) + 'ppm'}</span>
      </div>
    </div>
    <div class="hive-card-footer">
      <span><span class="hive-card-dot ${dotClass}"></span>${statusLabel}</span>
      <span>${lastUpdate}</span>
    </div>
  `;

  return card;
}

// ── Navigation ────────────────────────────────────────────────────────────
function navigateToDetail(hiveId) {
  currentHiveId = hiveId;
  const hive = getHiveById(hiveId);
  if (!hive) return;

  // Populate detail screen
  detailHiveName.textContent = hive.name;
  detailConnection.textContent = hive.connectionMode.toUpperCase();
  detailConnection.className = 'connection-badge';
  if (hive.status === 'offline') {
    detailConnection.style.background = 'rgba(74,85,104,0.12)';
    detailConnection.style.color = '#4a5568';
    detailConnection.style.borderColor = '#4a5568';
  } else {
    detailConnection.style.background = '';
    detailConnection.style.color = '';
    detailConnection.style.borderColor = '';
  }

  renderHealthRing(hive);
  renderSensorGrid(hive);
  renderActuators(hive);
  renderAlertLog(hive);

  // Build charts for this hive
  buildWeightChart(hiveId);
  buildEnvironmentChart(hiveId);
  buildAudioChart(hiveId);

  // Slide transition
  detailScreen.classList.add('active', 'slide-in');
  detailScreen.classList.remove('slide-out');
  overviewScreen.classList.remove('active');
  overviewScreen.classList.add('slide-out');

  // Scroll to top
  document.getElementById('detail-content').scrollTop = 0;
}

function navigateToOverview() {
  currentHiveId = null;

  overviewScreen.classList.add('active', 'slide-in');
  overviewScreen.classList.remove('slide-out');
  detailScreen.classList.remove('active', 'slide-in');

  destroyCharts();

  // Switch tabs back to hives
  const tabs = document.querySelectorAll('.bottom-tab');
  tabs.forEach((t) => t.classList.remove('active'));
  const hivesTab = document.querySelector('[data-tab="hives"]');
  if (hivesTab) hivesTab.classList.add('active');

  // Re-render overview
  renderOverview();
}

// ── Health Ring ───────────────────────────────────────────────────────────
function renderHealthRing(hive) {
  const score = hive.healthScore;
  healthScoreValue.textContent = score;

  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  let strokeColor = '#2ea868';
  let statusLabel = 'GOOD';
  let statusClass = 'good';

  if (hive.status === 'offline') {
    strokeColor = '#4a5568';
    statusLabel = 'OFFLINE';
    statusClass = 'offline';
  } else if (score < 50) {
    strokeColor = '#d94848';
    statusLabel = 'CRITICAL';
    statusClass = 'danger';
  } else if (score < 75) {
    strokeColor = '#d9982b';
    statusLabel = 'WARNING';
    statusClass = 'warning';
  }

  healthRingFill.setAttribute('stroke', strokeColor);
  healthRingFill.setAttribute('stroke-dasharray', circumference);
  healthRingFill.setAttribute('stroke-dashoffset', offset);

  healthStatusText.textContent = statusLabel;
  healthStatusText.className = 'health-status-text ' + statusClass;
}

// ── Sensor Grid ───────────────────────────────────────────────────────────
function renderSensorGrid(hive) {
  if (hive.status === 'offline') {
    sensorGrid.innerHTML = `
      <div class="sensor-tile full-width" style="text-align:center;padding:20px;">
        <span style="color:#54687a;font-size:0.8rem;">Device offline — no live data</span>
      </div>`;
    return;
  }

  const tempStatus = getTempStatus(hive.temperature);
  const humidityStatus = getHumidityStatus(hive.humidity);
  const co2Status = getCo2Status(hive.co2);

  sensorGrid.innerHTML = `
    <div class="sensor-tile">
      <span class="sensor-tile-label">Temperature</span>
      <span class="sensor-tile-value ${tempStatus.class}">${hive.temperature.toFixed(1)}<span class="sensor-tile-unit"> C</span></span>
      <span class="sensor-tile-status ${tempStatus.class}">${tempStatus.label}</span>
    </div>
    <div class="sensor-tile">
      <span class="sensor-tile-label">Humidity</span>
      <span class="sensor-tile-value ${humidityStatus.class}">${Math.round(hive.humidity)}<span class="sensor-tile-unit"> %</span></span>
      <span class="sensor-tile-status ${humidityStatus.class}">${humidityStatus.label}</span>
    </div>
    <div class="sensor-tile">
      <span class="sensor-tile-label">CO2</span>
      <span class="sensor-tile-value ${co2Status.class}">${Math.round(hive.co2)}<span class="sensor-tile-unit"> ppm</span></span>
      <span class="sensor-tile-status ${co2Status.class}">${co2Status.label}</span>
    </div>
    <div class="sensor-tile">
      <span class="sensor-tile-label">Weight</span>
      <span class="sensor-tile-value">${hive.weight.toFixed(1)}<span class="sensor-tile-unit"> kg</span></span>
      <span class="sensor-tile-status good">STABLE</span>
    </div>
    <div class="sensor-tile">
      <span class="sensor-tile-label">Bee Traffic</span>
      <span class="sensor-tile-value">${hive.beeTraffic}<span class="sensor-tile-unit"> /min</span></span>
      <span class="sensor-tile-status ${hive.beeTraffic > 10 ? 'good' : 'warning'}">${hive.beeTraffic > 10 ? 'ACTIVE' : 'LOW'}</span>
    </div>
    <div class="sensor-tile">
      <span class="sensor-tile-label">Audio</span>
      <span class="sensor-tile-value" style="font-size:0.9rem;">${hive.audioStatus.replace('_', ' ')}</span>
      <span class="sensor-tile-status ${hive.audioStatus === 'NORMAL' ? 'good' : hive.audioStatus === 'STRESSED' ? 'warning' : 'danger'}">${hive.audioStatus === 'NORMAL' ? 'HEALTHY' : hive.audioStatus}</span>
    </div>
  `;
}

function updateDetailLiveData() {
  const hive = getHiveById(currentHiveId);
  if (!hive) return;
  renderHealthRing(hive);
  renderSensorGrid(hive);
  renderActuators(hive);
  renderAlertLog(hive);
}

// ── Actuator Panel ────────────────────────────────────────────────────────
function renderActuators(hive) {
  if (hive.status === 'offline') {
    actuatorPanel.innerHTML = `
      <div style="text-align:center;padding:12px;color:#54687a;font-size:0.8rem;">Actuators unavailable — device offline</div>`;
    return;
  }

  const fanLevel = hive.fanPWM > 60 ? 'danger' : hive.fanPWM > 30 ? 'warning' : 'normal';

  actuatorPanel.innerHTML = `
    <div class="actuator-row">
      <span class="actuator-label">Cooling Fan</span>
      <div class="actuator-bar">
        <div class="actuator-bar-fill ${fanLevel}" style="transform:scaleX(${(hive.fanPWM / 100).toFixed(2)})"></div>
      </div>
      <span class="actuator-value">${hive.fanPWM}%</span>
    </div>
    <div class="actuator-row">
      <span class="actuator-label">Servo Vent</span>
      <div class="actuator-bar">
        <div class="actuator-bar-fill normal" style="transform:scaleX(${(hive.servoAngle / 180).toFixed(2)})"></div>
      </div>
      <span class="actuator-value">${hive.servoAngle} deg</span>
    </div>
    <div class="actuator-row">
      <span class="actuator-label">Buzzer</span>
      <span class="actuator-state ${hive.buzzerOn ? 'on' : 'off'}">${hive.buzzerOn ? 'ON' : 'OFF'}</span>
    </div>
    <div class="actuator-row">
      <span class="actuator-label">Mode</span>
      <span class="actuator-state on">AUTO</span>
    </div>
  `;
}

// ── Alert Log ─────────────────────────────────────────────────────────────
function renderAlertLog(hive) {
  if (!hive.alertLog || hive.alertLog.length === 0) {
    alertLog.innerHTML = '<div class="alert-empty">No recent alerts</div>';
    return;
  }

  alertLog.innerHTML = hive.alertLog.map((a) => `
    <div class="alert-entry level-${a.level}">
      <span class="alert-entry-time">${formatTimeAgo(a.timestamp)}</span>
      <span class="alert-entry-msg">${escapeHtml(a.message)}</span>
    </div>
  `).join('');
}

// ── Alert Badge ───────────────────────────────────────────────────────────
function updateAlertBadge() {
  const hives = getHives();
  let count = 0;
  hives.forEach((h) => {
    if (h.status === 'alert') count++;
    if (h.alertLog) {
      h.alertLog.forEach((a) => {
        if (a.level === 'critical') count++;
      });
    }
  });

  alertCount.textContent = count;
  if (count > 0) {
    alertIndicator.classList.add('has-alerts');
  } else {
    alertIndicator.classList.remove('has-alerts');
  }

  // Also update the bottom tab badge
  updateTabAlertBadge();
}

// ── Status Helpers ────────────────────────────────────────────────────────
function getTempStatus(temp) {
  if (temp > 36) return { class: 'danger', label: 'HIGH' };
  if (temp > 34) return { class: 'warning', label: 'ELEVATED' };
  if (temp < 30) return { class: 'warning', label: 'LOW' };
  return { class: 'good', label: 'OPTIMAL' };
}

function getHumidityStatus(hum) {
  if (hum > 70) return { class: 'warning', label: 'HIGH' };
  if (hum < 50) return { class: 'warning', label: 'LOW' };
  return { class: 'good', label: 'OPTIMAL' };
}

function getCo2Status(co2) {
  if (co2 > 3500) return { class: 'danger', label: 'HIGH' };
  if (co2 > 3100) return { class: 'warning', label: 'ELEVATED' };
  return { class: 'good', label: 'OPTIMAL' };
}

// ── Demo Panel ────────────────────────────────────────────────────────────
function toggleDemoPanel() {
  demoPanel.classList.toggle('open');
}

function closeDemoPanel() {
  demoPanel.classList.remove('open');
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

// ── Boot ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
