/**
 * data.js — Hive data model, simulation engine, and health score logic
 * IoT Smart Apiary Dashboard Demo
 */

// ── Optimal Ranges (from Apiary System.md §1.2.2) ──────────────────────────
const OPTIMAL = {
  temperature: { min: 30, max: 36 },       // °C
  humidity:    { min: 50, max: 70 },       // %
  co2:         { min: 2500, max: 3500 },   // ppm
};

// ── Baseline Hive Definitions ─────────────────────────────────────────────
const HIVE_DEFS = [
  {
    id: 'hive-a1',
    name: 'Hive A1',
    temperature: 33.2,
    humidity: 62,
    co2: 2800,
    weight: 45.8,
    audioStatus: 'NORMAL',
    beeTraffic: 42,
    fanPWM: 15,
    servoAngle: 90,
    buzzerOn: false,
    status: 'online',
    connectionMode: 'local',
  },
  {
    id: 'hive-b2',
    name: 'Hive B2',
    temperature: 34.3,
    humidity: 55,
    co2: 3100,
    weight: 52.1,
    audioStatus: 'NORMAL',
    beeTraffic: 38,
    fanPWM: 30,
    servoAngle: 105,
    buzzerOn: false,
    status: 'online',
    connectionMode: 'local',
  },
  {
    id: 'hive-c3',
    name: 'Hive C3',
    temperature: 32.8,
    humidity: 58,
    co2: 2950,
    weight: 41.2,
    audioStatus: 'STRESSED',
    beeTraffic: 25,
    fanPWM: 20,
    servoAngle: 95,
    buzzerOn: false,
    status: 'online',
    connectionMode: 'remote',
  },
  {
    id: 'hive-d4',
    name: 'Hive D4',
    temperature: 31.5,
    humidity: 60,
    co2: 2700,
    weight: 48.0,
    audioStatus: 'NORMAL',
    beeTraffic: 0,
    fanPWM: 0,
    servoAngle: 90,
    buzzerOn: false,
    status: 'offline',
    connectionMode: 'remote',
    lastSeen: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    id: 'hive-e5',
    name: 'Hive E5',
    temperature: 33.0,
    humidity: 64,
    co2: 2750,
    weight: 43.5,
    audioStatus: 'NORMAL',
    beeTraffic: 48,
    fanPWM: 10,
    servoAngle: 90,
    buzzerOn: false,
    status: 'online',
    connectionMode: 'local',
  },
  {
    id: 'hive-f6',
    name: 'Hive F6',
    temperature: 32.5,
    humidity: 60,
    co2: 2850,
    weight: 50.2,
    audioStatus: 'NORMAL',
    beeTraffic: 35,
    fanPWM: 12,
    servoAngle: 90,
    buzzerOn: false,
    status: 'online',
    connectionMode: 'local',
  },
  {
    id: 'hive-g7',
    name: 'Hive G7',
    temperature: 29.4,
    humidity: 52,
    co2: 2600,
    weight: 47.0,
    audioStatus: 'NORMAL',
    beeTraffic: 30,
    fanPWM: 5,
    servoAngle: 75,
    buzzerOn: false,
    status: 'online',
    connectionMode: 'local',
  },
  {
    id: 'hive-h8',
    name: 'Hive H8',
    temperature: 33.8,
    humidity: 58,
    co2: 2900,
    weight: 49.5,
    audioStatus: 'NORMAL',
    beeTraffic: 55,
    fanPWM: 18,
    servoAngle: 90,
    buzzerOn: false,
    status: 'online',
    connectionMode: 'local',
  },
  {
    id: 'hive-i9',
    name: 'Hive I9',
    temperature: 34.0,
    humidity: 56,
    co2: 3380,
    weight: 46.2,
    audioStatus: 'NORMAL',
    beeTraffic: 32,
    fanPWM: 35,
    servoAngle: 110,
    buzzerOn: false,
    status: 'online',
    connectionMode: 'local',
  },
  {
    id: 'hive-j10',
    name: 'Hive J10',
    temperature: 32.0,
    humidity: 63,
    co2: 2700,
    weight: 51.0,
    audioStatus: 'NORMAL',
    beeTraffic: 40,
    fanPWM: 10,
    servoAngle: 90,
    buzzerOn: false,
    status: 'online',
    connectionMode: 'remote',
  },
  {
    id: 'hive-k11',
    name: 'Hive K11',
    temperature: 33.1,
    humidity: 59,
    co2: 3000,
    weight: 44.0,
    audioStatus: 'NORMAL',
    beeTraffic: 28,
    fanPWM: 15,
    servoAngle: 92,
    buzzerOn: false,
    status: 'online',
    connectionMode: 'local',
  },
  {
    id: 'hive-l12',
    name: 'Hive L12',
    temperature: 32.2,
    humidity: 61,
    co2: 2800,
    weight: 38.5,
    audioStatus: 'NORMAL',
    beeTraffic: 45,
    fanPWM: 12,
    servoAngle: 90,
    buzzerOn: false,
    status: 'online',
    connectionMode: 'local',
  },
];

// ── Runtime State ──────────────────────────────────────────────────────────
let hives = [];

// Historical data: map of hiveId -> array of { timestamp, temperature, humidity, co2, weight }
let historyStore = {};

// ── Health Score Calculation ───────────────────────────────────────────────
function calculateHealthScore(hive) {
  if (hive.status === 'offline') return 0;

  let score = 100;

  // Temperature penalty
  if (hive.temperature < OPTIMAL.temperature.min) {
    score -= (OPTIMAL.temperature.min - hive.temperature) * 5;
  } else if (hive.temperature > OPTIMAL.temperature.max) {
    score -= (hive.temperature - OPTIMAL.temperature.max) * 8;
  }

  // Humidity penalty
  if (hive.humidity < OPTIMAL.humidity.min) {
    score -= (OPTIMAL.humidity.min - hive.humidity) * 1.5;
  } else if (hive.humidity > OPTIMAL.humidity.max) {
    score -= (hive.humidity - OPTIMAL.humidity.max) * 1.5;
  }

  // CO2 penalty
  if (hive.co2 > OPTIMAL.co2.max) {
    score -= (hive.co2 - OPTIMAL.co2.max) * 0.05;
  }

  // Audio status penalty
  if (hive.audioStatus === 'STRESSED') score -= 15;
  if (hive.audioStatus === 'PRE_SWARM') score -= 30;
  if (hive.audioStatus === 'QUEENLESS') score -= 40;

  // Bee traffic penalty (low activity)
  if (hive.beeTraffic < 10 && hive.status === 'online') score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Sensor Fluctuation ─────────────────────────────────────────────────────
function fluctuate(value, range, decimals = 1) {
  const delta = (Math.random() - 0.5) * 2 * range;
  return Math.round((value + delta) * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function tickSimulation() {
  const now = new Date().toISOString();

  hives.forEach((hive) => {
    if (hive.status === 'offline') return;

    hive.temperature = fluctuate(hive.temperature, 0.3, 1);
    hive.humidity = fluctuate(hive.humidity, 1.0, 0);
    hive.co2 = fluctuate(hive.co2, 50, 0);
    hive.weight = fluctuate(hive.weight, 0.15, 1);
    hive.beeTraffic = Math.max(0, fluctuate(hive.beeTraffic, 5, 0));
    hive.lastUpdated = now;

    // Occasional audio status shift for C3 and K11
    if ((hive.id === 'hive-c3' || hive.id === 'hive-k11') && Math.random() < 0.1) {
      hive.audioStatus = Math.random() < 0.5 ? 'NORMAL' : 'STRESSED';
    }

    // Auto-adjust fan based on temperature
    if (hive.temperature > 35) {
      hive.fanPWM = Math.min(100, hive.fanPWM + 10);
    } else if (hive.temperature < 33 && hive.fanPWM > 10) {
      hive.fanPWM = Math.max(10, hive.fanPWM - 5);
    }

    // Auto-adjust fan for high CO2 (I9)
    if (hive.id === 'hive-i9' && hive.co2 > 3400) {
      hive.fanPWM = Math.min(100, hive.fanPWM + 8);
    }

    hive.healthScore = calculateHealthScore(hive);
  });
}

// ── History Generator ──────────────────────────────────────────────────────
function generateHistory(hiveDef) {
  const points = [];
  const now = Date.now();
  const interval = 30 * 60 * 1000; // 30 minutes
  const count = 48; // 24 hours

  let t = hiveDef.temperature;
  let h = hiveDef.humidity;
  let c = hiveDef.co2;
  let w = hiveDef.weight;

  for (let i = count; i >= 0; i--) {
    const ts = new Date(now - i * interval).toISOString();
    t = fluctuate(t, 0.5, 1);
    h = fluctuate(h, 1.5, 0);
    c = fluctuate(c, 80, 0);
    w = fluctuate(w, 0.1, 1);

    // Slight upward weight trend for A1 and E5 (honey flow)
    if (hiveDef.id === 'hive-a1' || hiveDef.id === 'hive-e5') {
      w += 0.03;
    }

    // Slight upward weight for L12 (new hive building up)
    if (hiveDef.id === 'hive-l12') {
      w += 0.02;
    }

    // Cooler baseline for G7
    if (hiveDef.id === 'hive-g7') {
      t = Math.max(28.5, t - 0.1);
    }

    // Higher CO2 baseline for I9
    if (hiveDef.id === 'hive-i9') {
      c = Math.min(3500, c + 5);
    }

    points.push({
      timestamp: ts,
      temperature: t,
      humidity: h,
      co2: c,
      weight: w,
    });
  }

  return points;
}

// ── Audio Timeline Generator ───────────────────────────────────────────────
function generateAudioTimeline(hiveDef) {
  const points = [];
  const now = Date.now();
  const interval = 30 * 60 * 1000;
  const count = 48;
  const states = ['NORMAL', 'NORMAL', 'NORMAL', 'STRESSED', 'NORMAL', 'NORMAL', 'PRE_SWARM', 'NORMAL', 'NORMAL', 'NORMAL'];

  for (let i = count; i >= 0; i--) {
    const ts = new Date(now - i * interval).toISOString();
    let state;
    if (hiveDef.id === 'hive-c3' || hiveDef.id === 'hive-k11') {
      state = states[Math.floor(Math.random() * states.length)];
    } else {
      state = Math.random() < 0.08 ? 'STRESSED' : 'NORMAL';
    }
    points.push({ timestamp: ts, status: state });
  }

  return points;
}

// ── Alert Log Generator ────────────────────────────────────────────────────
function generateAlertLog(hiveDef) {
  const alerts = [];
  const now = Date.now();

  if (hiveDef.id === 'hive-c3') {
    alerts.push({
      timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      level: 'warning',
      message: 'Audio classification: STRESSED pattern detected',
    });
    alerts.push({
      timestamp: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      level: 'info',
      message: 'Weight fluctuation above normal range',
    });
  }

  if (hiveDef.id === 'hive-b2') {
    alerts.push({
      timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      level: 'warning',
      message: 'Temperature approaching upper threshold (35.1C)',
    });
  }

  if (hiveDef.id === 'hive-d4') {
    alerts.push({
      timestamp: new Date(now - 14 * 60 * 1000).toISOString(),
      level: 'critical',
      message: 'Node heartbeat lost -- device offline',
    });
  }

  if (hiveDef.id === 'hive-g7') {
    alerts.push({
      timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      level: 'info',
      message: 'Temperature below optimal range (28.9C)',
    });
  }

  if (hiveDef.id === 'hive-i9') {
    alerts.push({
      timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
      level: 'warning',
      message: 'CO2 approaching upper threshold (3390ppm)',
    });
  }

  if (hiveDef.id === 'hive-k11') {
    alerts.push({
      timestamp: new Date(now - 90 * 60 * 1000).toISOString(),
      level: 'info',
      message: 'Intermittent STRESSED audio patterns observed',
    });
  }

  return alerts;
}

// ── Init ───────────────────────────────────────────────────────────────────
function initData(count) {
  const limit = count || HIVE_DEFS.length;
  const defs = HIVE_DEFS.slice(0, limit);

  hives = defs.map((def) => {
    const hive = { ...def };
    hive.lastUpdated = hive.lastUpdated || new Date().toISOString();
    hive.healthScore = calculateHealthScore(hive);
    hive.alertLog = generateAlertLog(hive);
    return hive;
  });

  // Generate history for each hive
  defs.forEach((def) => {
    historyStore[def.id] = {
      sensors: generateHistory(def),
      audio: generateAudioTimeline(def),
    };
  });

  return hives;
}

// ── Public API ─────────────────────────────────────────────────────────────
function getHives() {
  return hives;
}

function getHiveById(id) {
  return hives.find((h) => h.id === id);
}

function getHistory(hiveId) {
  return historyStore[hiveId] || { sensors: [], audio: [] };
}

function resetAllHives(count) {
  hives = [];
  historyStore = {};
  return initData(count);
}
