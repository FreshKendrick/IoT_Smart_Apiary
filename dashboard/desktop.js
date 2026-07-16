/**
 * desktop.js — Desktop command-center dashboard logic
 * IoT Smart Apiary Dashboard Demo
 * Sidebar navigation + page views (dashboard / hive detail / user profile)
 */

// ── State ─────────────────────────────────────────────────────────────────
let currentHiveId = null;
let simulationTimer = null;
let detailChartInstances = {};
let sidebarCollapsed = false;
let activePage = 'dashboard';

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initData(12);
  initSidebar();
  renderAll();
  startSimulation();
  buildScenarioButtons();

  // Demo panel
  document.getElementById('demo-trigger').addEventListener('click', toggleDemoPanel);
  document.getElementById('demo-close').addEventListener('click', closeDemoPanel);
});

// ── Page View Navigation ──────────────────────────────────────────────────
function showPage(pageName) {
  // Hide all page views
  document.querySelectorAll('.page-view').forEach((v) => v.classList.remove('active'));
  // Show the target page
  const page = document.getElementById(pageName + '-view') || document.getElementById(pageName + '-page');
  if (page) page.classList.add('active');
  activePage = pageName;
}

// ── Sidebar ───────────────────────────────────────────────────────────────
function initSidebar() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const mainWrapper = document.getElementById('main-wrapper');

  // Toggle collapse
  toggleBtn.addEventListener('click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    mainWrapper.classList.toggle('sidebar-collapsed', sidebarCollapsed);
  });

  // Nav item clicks
  const navItems = document.querySelectorAll('.sidebar-item');
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach((ni) => ni.classList.remove('active'));
      item.classList.add('active');

      const page = item.dataset.page;
      const label = item.querySelector('span')?.textContent || 'Dashboard';
      document.getElementById('topbar-title').textContent = label;

      switch (page) {
        case 'dashboard':
          showPage('dashboard');
          currentHiveId = null;
          destroyDetailCharts();
          break;
        case 'hive-status':
          showPage('dashboard');
          document.getElementById('hive-grid-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        case 'analytics':
          showPage('dashboard');
          document.querySelector('.comparison-row')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        case 'users':
          showPage('user-profile');
          break;
        case 'notifications':
          showPage('notifications');
          renderNotificationsPage();
          break;
        case 'settings':
          showPage('dashboard');
          document.getElementById('kpi-row').scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
      }
    });
  });

  // Back button on detail page
  const backBtn = document.getElementById('detail-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showPage('dashboard');
      currentHiveId = null;
      destroyDetailCharts();
      renderHiveGrid();
      document.getElementById('topbar-title').textContent = 'Dashboard';
      document.querySelectorAll('.sidebar-item').forEach((ni) => ni.classList.remove('active'));
      const dashItem = document.querySelector('[data-page="dashboard"]');
      if (dashItem) dashItem.classList.add('active');
    });
  }
}

function updateSidebarBadge() {
  const hives = getHives();
  let alerts = 0;
  hives.forEach((h) => {
    if (h.status === 'alert') alerts++;
    if (h.alertLog) {
      h.alertLog.forEach((a) => { if (a.level === 'critical') alerts++; });
    }
  });
  const badge = document.getElementById('sidebar-alert-count');
  badge.textContent = alerts > 0 ? alerts : '';
  badge.setAttribute('data-count', alerts);
}

// ── Notifications Page ────────────────────────────────────────────────────
function renderNotificationsPage() {
  const hives = getHives();
  let allAlerts = [];
  hives.forEach((h) => {
    if (h.alertLog && h.alertLog.length > 0) {
      h.alertLog.forEach((a) => {
        allAlerts.push({ ...a, hiveName: h.name, hiveId: h.id });
      });
    }
  });

  // Sort newest first
  allAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const countEl = document.getElementById('notifications-count');
  countEl.textContent = allAlerts.length + ' alert' + (allAlerts.length !== 1 ? 's' : '');

  const listEl = document.getElementById('notifications-list');
  if (allAlerts.length === 0) {
    listEl.innerHTML = `
      <div class="notifications-empty">
        <div class="notifications-empty-icon">&#128276;</div>
        <p style="font-size:var(--text-base);color:var(--text-muted);">No notifications</p>
        <p style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">Alerts from hive events will appear here</p>
      </div>`;
    return;
  }

  const iconMap = { critical: '!', warning: '&#9888;', info: 'i' };

  listEl.innerHTML = allAlerts.map((a) => `
    <div class="notification-item level-${a.level}" onclick="navigateToHiveDetail('${a.hiveId}')">
      <div class="notification-icon ${a.level}">${iconMap[a.level] || 'i'}</div>
      <div class="notification-body">
        <div class="notification-body-header">
          <span class="notification-hive-name">${escapeHtml(a.hiveName)}</span>
          <span class="notification-time">${formatTimeAgo(a.timestamp)}</span>
        </div>
        <div class="notification-message">${escapeHtml(a.message)}</div>
      </div>
    </div>
  `).join('');
}

// ── Simulation ────────────────────────────────────────────────────────────
function startSimulation() {
  simulationTimer = setInterval(() => {
    tickSimulation();
    refreshAll();
  }, 5000);
}

// ── Render Everything ─────────────────────────────────────────────────────
function renderAll() {
  updateTopbar();
  updateSidebarBadge();
  updateKPIs();
  renderComparisonCharts();
  renderHiveGrid();
}

function refreshAll() {
  updateTopbar();
  updateSidebarBadge();
  updateKPIs();
  if (activePage === 'dashboard') {
    renderComparisonCharts();
    renderHiveGrid();
  }
  if (currentHiveId && activePage === 'hive-detail') {
    renderHiveDetailPage(currentHiveId); // refresh live data
  }
  updateScenarioButtons();
}

// ── Topbar ────────────────────────────────────────────────────────────────
function updateTopbar() {
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

  const onlineEl = document.getElementById('topbar-online');
  onlineEl.textContent = online + ' / ' + total;
  if (online === total) {
    onlineEl.style.color = '';
  } else if (online < total * 0.8) {
    onlineEl.style.color = '#d94848';
  } else {
    onlineEl.style.color = '#d9982b';
  }

  document.getElementById('topbar-alerts').textContent = alerts;
  const alertsStat = document.getElementById('topbar-alerts-stat');
  if (alerts > 0) {
    alertsStat.classList.add('has-alerts');
  } else {
    alertsStat.classList.remove('has-alerts');
  }

  document.getElementById('topbar-updated').textContent = new Date().toLocaleTimeString();

  const dot = document.getElementById('sidebar-connection-dot');
  dot.classList.remove('remote', 'offline');
  if (online === 0) {
    dot.classList.add('offline');
  }
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
  if (!grid) return;
  const hives = getHives();

  grid.innerHTML = hives.map((hive) => {
    let statusClass = '';
    if (hive.status === 'offline') statusClass = 'status-offline';
    else if (hive.status === 'alert') statusClass = 'status-alert';
    else if (hive.status === 'warning') statusClass = 'status-warning';

    const activeClass = currentHiveId === hive.id ? 'active' : '';

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
      ? `<div class="card-desk-metric"><span class="card-desk-metric-label">Status</span><span class="card-desk-metric-value text-offline">OFFLINE</span></div>`
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
           onclick="navigateToHiveDetail('${hive.id}')">
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

// ── Hive Detail Page Navigation ───────────────────────────────────────────
function navigateToHiveDetail(hiveId) {
  currentHiveId = hiveId;
  const hive = getHiveById(hiveId);
  if (!hive) return;

  showPage('hive-detail');
  document.getElementById('topbar-title').textContent = hive.name;
  document.querySelectorAll('.sidebar-item').forEach((ni) => ni.classList.remove('active'));

  renderHiveDetailPage(hiveId);
}

function renderHiveDetailPage(hiveId) {
  const hive = getHiveById(hiveId);
  if (!hive) return;

  // Header
  document.getElementById('detail-page-hive-name').textContent = hive.name + ' — Detail View';

  const statusEl = document.getElementById('detail-page-status');
  statusEl.textContent = hive.status.toUpperCase();
  statusEl.className = 'detail-page-status';
  if (hive.status === 'online') {
    statusEl.style.background = 'var(--green-bg)';
    statusEl.style.color = 'var(--green)';
  } else if (hive.status === 'warning') {
    statusEl.style.background = 'var(--yellow-bg)';
    statusEl.style.color = 'var(--yellow)';
  } else if (hive.status === 'alert') {
    statusEl.style.background = 'var(--red-bg)';
    statusEl.style.color = 'var(--red)';
  } else {
    statusEl.style.background = '';
    statusEl.style.color = 'var(--offline)';
  }

  // Content
  const content = document.getElementById('detail-page-content');
  const score = hive.healthScore;
  let scoreColor = '#2ea868';
  if (score < 50) scoreColor = '#d94848';
  else if (score < 75) scoreColor = '#d9982b';

  content.innerHTML = `
    <!-- Health Score + Key Metrics -->
    <div class="detail-page-metrics">
      <div class="detail-page-metric">
        <span class="detail-page-metric-label">Health Score</span>
        <span class="detail-page-metric-value" style="color:${scoreColor}">${score}</span>
      </div>
      <div class="detail-page-metric">
        <span class="detail-page-metric-label">Temperature</span>
        <span class="detail-page-metric-value">${hive.status === 'offline' ? '--' : hive.temperature.toFixed(1) + '°C'}</span>
      </div>
      <div class="detail-page-metric">
        <span class="detail-page-metric-label">Weight</span>
        <span class="detail-page-metric-value">${hive.status === 'offline' ? '--' : hive.weight.toFixed(1) + 'kg'}</span>
      </div>
      <div class="detail-page-metric">
        <span class="detail-page-metric-label">Audio</span>
        <span class="detail-page-metric-value" style="font-size:var(--text-base)">${hive.audioStatus.replace('_', ' ')}</span>
      </div>
    </div>

    <!-- Sensor Grid -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
      <div class="sensor-tile" style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:12px;">
        <span class="sensor-tile-label" style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;">Temperature</span>
        <span class="sensor-tile-value" style="font-size:1.2rem;font-weight:700;">${hive.status === 'offline' ? '--' : hive.temperature.toFixed(1)+'°C'}</span>
      </div>
      <div class="sensor-tile" style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:12px;">
        <span class="sensor-tile-label" style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;">Humidity</span>
        <span class="sensor-tile-value" style="font-size:1.2rem;font-weight:700;">${hive.status === 'offline' ? '--' : Math.round(hive.humidity)+'%'}</span>
      </div>
      <div class="sensor-tile" style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:12px;">
        <span class="sensor-tile-label" style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;">CO2</span>
        <span class="sensor-tile-value" style="font-size:1.2rem;font-weight:700;">${hive.status === 'offline' ? '--' : Math.round(hive.co2)+'ppm'}</span>
      </div>
    </div>

    <!-- Charts -->
    <div class="detail-page-charts">
      <div class="detail-page-chart-panel">
        <div class="accordion-chart-title">Weight Trend (24h)</div>
        <div class="accordion-chart-wrap"><canvas id="detail-weight-chart"></canvas></div>
      </div>
      <div class="detail-page-chart-panel">
        <div class="accordion-chart-title">Environment (24h)</div>
        <div class="accordion-chart-wrap"><canvas id="detail-env-chart"></canvas></div>
      </div>
      <div class="detail-page-chart-panel">
        <div class="accordion-chart-title">Audio Timeline</div>
        <div class="accordion-chart-wrap"><canvas id="detail-audio-chart"></canvas></div>
      </div>
    </div>

    <!-- Actuators + Alerts -->
    <div class="detail-page-bottom">
      <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:16px;">
        <div class="accordion-chart-title" style="margin-bottom:8px;">Actuators</div>
        ${renderActuatorsHTML(hive)}
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:16px;">
        <div class="accordion-chart-title" style="margin-bottom:8px;">Alert Log</div>
        ${renderAlertsHTML(hive)}
      </div>
    </div>
  `;

  // Build charts
  setTimeout(() => {
    buildDetailWeightChart(hiveId);
    buildDetailEnvChart(hiveId);
    buildDetailAudioChart(hiveId);
  }, 100);
}

// ── Accordion (kept for backward compatibility) ───────────────────────────
function toggleAccordion(hiveId) {
  navigateToHiveDetail(hiveId);
}

function closeAccordion() {
  currentHiveId = null;
  document.getElementById('accordion-panel').classList.remove('open');
  destroyDetailCharts();
  renderHiveGrid();
}

function renderAccordion(hiveId) {
  navigateToHiveDetail(hiveId);
}

function renderActuatorsHTML(hive) {
  if (hive.status === 'offline') {
    return `<div style="text-align:center;padding:12px;color:#54687a;font-size:0.7rem;">Actuators unavailable — device offline</div>`;
  }
  const fanLevel = hive.fanPWM > 60 ? 'danger' : hive.fanPWM > 30 ? 'warning' : 'normal';
  return `
    <div class="actuator-row">
      <span class="actuator-label">Cooling Fan</span>
      <div class="actuator-bar"><div class="actuator-bar-fill ${fanLevel}" style="transform:scaleX(${(hive.fanPWM / 100).toFixed(2)})"></div></div>
      <span class="actuator-value">${hive.fanPWM}%</span>
    </div>
    <div class="actuator-row">
      <span class="actuator-label">Servo Vent</span>
      <div class="actuator-bar"><div class="actuator-bar-fill normal" style="transform:scaleX(${(hive.servoAngle / 180).toFixed(2)})"></div></div>
      <span class="actuator-value">${hive.servoAngle} deg</span>
    </div>
    <div class="actuator-row">
      <span class="actuator-label">Buzzer</span>
      <span class="actuator-state ${hive.buzzerOn ? 'on' : 'off'}">${hive.buzzerOn ? 'ON' : 'OFF'}</span>
    </div>`;
}

function renderAlertsHTML(hive) {
  if (!hive.alertLog || hive.alertLog.length === 0) {
    return `<div class="alert-empty">No recent alerts</div>`;
  }
  return hive.alertLog.map((a) => `
    <div class="alert-entry level-${a.level}">
      <span class="alert-entry-time">${formatTimeAgo(a.timestamp)}</span>
      <span class="alert-entry-msg">${escapeHtml(a.message)}</span>
    </div>`).join('');
}

// ── Detail Charts ─────────────────────────────────────────────────────────
function buildDetailWeightChart(hiveId) {
  destroyDetailChart('weight');
  const history = getHistory(hiveId);
  const canvas = document.getElementById('detail-weight-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
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
        label: 'Weight (kg)', data,
        borderColor: '#e6a83e', backgroundColor: 'rgba(230,168,62,0.08)',
        borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 3, fill: true, tension: 0.3,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#1c2530' }, ticks: { color: '#54687a', maxTicksLimit: 6, maxRotation: 0, font: { size: 9 } } },
        y: { grid: { color: '#1c2530' }, ticks: { color: '#54687a', font: { size: 9 }, callback: (v) => v.toFixed(1) + ' kg' } },
      },
    },
  });
}

function buildDetailEnvChart(hiveId) {
  destroyDetailChart('env');
  const history = getHistory(hiveId);
  const canvas = document.getElementById('detail-env-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const labels = history.sensors.map((p) => {
    const d = new Date(p.timestamp);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  });

  detailChartInstances.env = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Temp (C)', data: history.sensors.map((p) => p.temperature), borderColor: '#d94848', borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 3, fill: false, tension: 0.3, yAxisID: 'y' },
        { label: 'Humidity (%)', data: history.sensors.map((p) => p.humidity), borderColor: '#2ea868', borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 3, fill: false, tension: 0.3, yAxisID: 'y1' },
        { label: 'CO2 (ppm)', data: history.sensors.map((p) => p.co2), borderColor: '#d9982b', borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 3, fill: false, tension: 0.3, yAxisID: 'y2' },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: true, position: 'bottom', labels: { color: '#8b9eb0', usePointStyle: true, boxWidth: 6, padding: 12, font: { size: 9 } } } },
      scales: {
        x: { grid: { color: '#1c2530' }, ticks: { color: '#54687a', maxTicksLimit: 6, maxRotation: 0, font: { size: 9 } } },
        y: { type: 'linear', position: 'left', grid: { color: '#1c2530' }, ticks: { color: '#d94848', font: { size: 9 }, maxTicksLimit: 4, callback: (v) => v.toFixed(1) + 'C' } },
        y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#2ea868', font: { size: 9 }, maxTicksLimit: 4, callback: (v) => v + '%' }, min: 30, max: 90 },
        y2: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#d9982b', font: { size: 9 }, maxTicksLimit: 4, callback: (v) => (v / 1000).toFixed(1) + 'k' } },
      },
    },
  });
}

function buildDetailAudioChart(hiveId) {
  destroyDetailChart('audio');
  const history = getHistory(hiveId);
  const canvas = document.getElementById('detail-audio-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
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
        borderColor: '#8b7ec8', backgroundColor: 'rgba(139,126,200,0.1)',
        borderWidth: 2, pointRadius: 0, pointHoverRadius: 3, fill: true, stepped: true, tension: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#1c2530' }, ticks: { color: '#54687a', maxTicksLimit: 6, maxRotation: 0, font: { size: 9 } } },
        y: { min: -0.2, max: 3.2, grid: { color: '#1c2530' }, ticks: { color: '#8b9eb0', stepSize: 1, font: { size: 9 }, callback: (v) => ['NORMAL', 'STRESSED', 'PRE_SWARM', 'QUEENLESS'][v] || '' } },
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

function navigateToDetail(hiveId) {
  if (hiveId) navigateToHiveDetail(hiveId);
}

function updateAlertBadge() {
  updateSidebarBadge();
  updateTopbar();
  updateKPIs();
}

function updateDetailLiveData() {
  if (currentHiveId) {
    if (activePage === 'hive-detail') {
      renderHiveDetailPage(currentHiveId);
    } else {
      const hive = getHiveById(currentHiveId);
      if (hive) {
        const actuatorsEl = document.getElementById('accord-actuators');
        const alertsEl = document.getElementById('accord-alerts');
        if (actuatorsEl) actuatorsEl.innerHTML = renderActuatorsHTML(hive);
        if (alertsEl) alertsEl.innerHTML = renderAlertsHTML(hive);
      }
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
