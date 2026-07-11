/**
 * app.js — App initialization, navigation, and rendering
 * IoT Smart Apiary Dashboard Demo
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
  renderOverview();
  startSimulation();

  // Event listeners
  backButton.addEventListener('click', navigateToOverview);
  demoTrigger.addEventListener('click', toggleDemoPanel);
  demoClose.addEventListener('click', closeDemoPanel);
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
  const circumference = 2 * Math.PI * 22; // r=22
  const offset = circumference - (score / 100) * circumference;
  let strokeColor = '#22c55e';
  if (score < 50) strokeColor = '#ef4444';
  else if (score < 75) strokeColor = '#eab308';

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
    detailConnection.style.background = 'rgba(107,114,128,0.12)';
    detailConnection.style.color = '#6b7280';
    detailConnection.style.borderColor = '#6b7280';
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
}

// ── Health Ring ───────────────────────────────────────────────────────────
function renderHealthRing(hive) {
  const score = hive.healthScore;
  healthScoreValue.textContent = score;

  const circumference = 2 * Math.PI * 52; // r=52
  const offset = circumference - (score / 100) * circumference;

  let strokeColor = '#22c55e';
  let statusLabel = 'GOOD';
  let statusClass = 'good';

  if (hive.status === 'offline') {
    strokeColor = '#6b7280';
    statusLabel = 'OFFLINE';
    statusClass = 'offline';
  } else if (score < 50) {
    strokeColor = '#ef4444';
    statusLabel = 'CRITICAL';
    statusClass = 'danger';
  } else if (score < 75) {
    strokeColor = '#eab308';
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
        <span style="color:#6b7280;font-size:0.8rem;">Device offline -- no live data</span>
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
      <div style="text-align:center;padding:12px;color:#6b7280;font-size:0.8rem;">Actuators unavailable -- device offline</div>`;
    return;
  }

  const fanLevel = hive.fanPWM > 60 ? 'danger' : hive.fanPWM > 30 ? 'warning' : 'normal';

  actuatorPanel.innerHTML = `
    <div class="actuator-row">
      <span class="actuator-label">Cooling Fan</span>
      <div class="actuator-bar">
        <div class="actuator-bar-fill ${fanLevel}" style="width:${hive.fanPWM}%"></div>
      </div>
      <span class="actuator-value">${hive.fanPWM}%</span>
    </div>
    <div class="actuator-row">
      <span class="actuator-label">Servo Vent</span>
      <div class="actuator-bar">
        <div class="actuator-bar-fill normal" style="width:${(hive.servoAngle / 180 * 100).toFixed(0)}%"></div>
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
