/**
 * scenarios.js — Pre-scripted demo scenarios + demo controls panel
 * IoT Smart Apiary Dashboard Demo
 */

// ── Scenario State ────────────────────────────────────────────────────────
let activeScenario = null;
let scenarioTimer = null;
let scenarioStep = 0;
let scenarioStepsTotal = 0;
let savedHiveState = null;

// ── Scenario Definitions ──────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 'overheating',
    label: 'Overheating Alert',
    targetHiveId: 'hive-b2',
    duration: 30, // seconds
    description: 'Hive B2 temperature climbs past threshold. Fan ramps to max.',
    steps: [
      { time: 0,  action: () => applyDelta('hive-b2', { temperature: 35.0, fanPWM: 40, status: 'warning' }) },
      { time: 6,  action: () => applyDelta('hive-b2', { temperature: 36.2, fanPWM: 65, status: 'warning' }) },
      { time: 12, action: () => { applyDelta('hive-b2', { temperature: 37.5, fanPWM: 90, status: 'alert' }); addAlert('hive-b2', 'critical', 'THERMAL EMERGENCY: Hive temperature at 37.5C'); } },
      { time: 18, action: () => applyDelta('hive-b2', { temperature: 38.1, fanPWM: 100, status: 'alert' }) },
      { time: 24, action: () => { applyDelta('hive-b2', { temperature: 37.8, fanPWM: 100, status: 'alert' }); addAlert('hive-b2', 'warning', 'Fan at maximum -- temperature stabilizing'); } },
      { time: 30, action: () => resetScenario },
    ],
  },
  {
    id: 'swarm',
    label: 'Swarm Warning',
    targetHiveId: 'hive-a1',
    duration: 30,
    description: 'Hive A1 audio pattern shifts to pre-swarm. Weight dips.',
    steps: [
      { time: 0,  action: () => applyDelta('hive-a1', { audioStatus: 'STRESSED', status: 'warning' }) },
      { time: 8,  action: () => { applyDelta('hive-a1', { audioStatus: 'STRESSED', weight: 45.1, status: 'warning' }); addAlert('hive-a1', 'warning', 'Audio classification: STRESSED behavior detected'); } },
      { time: 16, action: () => applyDelta('hive-a1', { audioStatus: 'PRE_SWARM', weight: 44.6, status: 'alert' }) },
      { time: 22, action: () => { applyDelta('hive-a1', { audioStatus: 'PRE_SWARM', weight: 44.8, status: 'alert' }); addAlert('hive-a1', 'warning', 'PRE-SWARM condition -- check colony activity'); } },
      { time: 30, action: () => resetScenario },
    ],
  },
  {
    id: 'theft',
    label: 'Theft Detection',
    targetHiveId: 'hive-c3',
    duration: 30,
    description: 'Hive C3 weight drops rapidly. Buzzer alarm triggers.',
    steps: [
      { time: 0,  action: () => applyDelta('hive-c3', { weight: 40.5, status: 'warning' }) },
      { time: 5,  action: () => { applyDelta('hive-c3', { weight: 39.0, buzzerOn: true, status: 'alert' }); addAlert('hive-c3', 'critical', 'RAPID WEIGHT LOSS: Possible hive theft or movement'); } },
      { time: 10, action: () => applyDelta('hive-c3', { weight: 37.2, buzzerOn: true, status: 'alert' }) },
      { time: 15, action: () => { applyDelta('hive-c3', { weight: 36.0, buzzerOn: true, status: 'alert' }); addAlert('hive-c3', 'critical', 'Weight loss continues -- 5.2kg lost in 15 seconds'); } },
      { time: 20, action: () => applyDelta('hive-c3', { weight: 36.5, buzzerOn: true, status: 'alert' }) },
      { time: 25, action: () => applyDelta('hive-c3', { weight: 37.0, buzzerOn: true, status: 'alert' }) },
      { time: 30, action: () => resetScenario },
    ],
  },
];

// ── Scenario Engine ───────────────────────────────────────────────────────
function applyDelta(hiveId, changes) {
  const hive = getHiveById(hiveId);
  if (!hive) return;
  Object.assign(hive, changes);
  hive.healthScore = calculateHealthScore(hive);
  hive.lastUpdated = new Date().toISOString();

  // Refresh UI
  renderOverview();
  updateAlertBadge();
  if (currentHiveId === hiveId) {
    updateDetailLiveData();
  }
}

function addAlert(hiveId, level, message) {
  const hive = getHiveById(hiveId);
  if (!hive) return;
  if (!hive.alertLog) hive.alertLog = [];
  hive.alertLog.unshift({
    timestamp: new Date().toISOString(),
    level,
    message,
  });
}

function startScenario(scenarioId) {
  if (activeScenario) return; // Only one at a time

  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) return;

  // Save state
  const hive = getHiveById(scenario.targetHiveId);
  savedHiveState = { ...hive };
  savedHiveState.alertLog = [...(hive.alertLog || [])];

  activeScenario = scenarioId;
  scenarioStep = 0;
  scenarioStepsTotal = scenario.steps.length;

  // Execute first step immediately
  executeScenarioStep(scenario);

  // Schedule remaining steps
  scenarioTimer = setInterval(() => {
    scenarioStep++;
    if (scenarioStep >= scenarioStepsTotal) {
      stopScenario(true);
      return;
    }
    executeScenarioStep(scenario);
  }, 6000); // Step every 6 seconds (6 * 5 steps = 30s)

  updateScenarioButtons();
}

function executeScenarioStep(scenario) {
  const step = scenario.steps[scenarioStep];
  if (step && step.action) {
    step.action();
  }
}

function stopScenario(restoreState) {
  clearInterval(scenarioTimer);
  scenarioTimer = null;

  if (restoreState && savedHiveState) {
    const hive = getHiveById(activeScenario ? SCENARIOS.find((s) => s.id === activeScenario)?.targetHiveId : null);
    if (hive && savedHiveState) {
      // Restore original state (but keep scenario alerts for demo effect)
      const alerts = hive.alertLog ? [...hive.alertLog] : [];
      Object.assign(hive, savedHiveState);
      hive.alertLog = alerts;
      hive.healthScore = calculateHealthScore(hive);
      hive.lastUpdated = new Date().toISOString();
    }
  }

  activeScenario = null;
  savedHiveState = null;
  scenarioStep = 0;

  renderOverview();
  updateAlertBadge();
  if (currentHiveId) updateDetailLiveData();
  updateScenarioButtons();
}

function resetScenario() {
  // Called as last step action — handled by stopScenario(true) from the interval
}

// ── Scenario Buttons ──────────────────────────────────────────────────────
function buildScenarioButtons() {
  const container = document.getElementById('demo-scenarios');
  if (!container) return;

  container.innerHTML = SCENARIOS.map((s) => `
    <button class="demo-scenario-btn" data-scenario="${s.id}" ${activeScenario && activeScenario !== s.id ? 'disabled' : ''}>
      <span class="scenario-label">${escapeHtml(s.label)}</span>
      <span class="scenario-status">${activeScenario === s.id ? 'RUNNING...' : activeScenario ? '--' : 'RUN'}</span>
    </button>
  `).join('');

  // Attach listeners
  container.querySelectorAll('.demo-scenario-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.scenario;
      if (activeScenario === id) {
        stopScenario(true);
      } else if (!activeScenario) {
        startScenario(id);
      }
    });
  });

  // Reset button
  const resetBtn = document.getElementById('demo-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (activeScenario) stopScenario(true);

      // Clear all alert logs
      const currentHives = getHives();
      const hiveCount = currentHives.length;
      currentHives.forEach((h) => {
        h.alertLog = [];
      });

      resetAllHives(hiveCount);
      renderOverview();
      updateAlertBadge();
      if (currentHiveId) {
        navigateToDetail(currentHiveId);
      }
    });
  }
}

function updateScenarioButtons() {
  buildScenarioButtons();
}

// ── Init ──────────────────────────────────────────────────────────────────
// buildScenarioButtons() is called by the dashboard's own init (desktop.js or app.js)
