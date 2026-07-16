/**
 * charts.js — Chart.js visualization for hive detail view
 * IoT Smart Apiary Dashboard Demo
 * Unified dark theme with honey-amber accents
 */

// ── Chart Instances ───────────────────────────────────────────────────────
let weightChartInstance = null;
let environmentChartInstance = null;
let audioChartInstance = null;

// ── Chart Defaults — Unified Theme ────────────────────────────────────────
Chart.defaults.color = '#8b9eb0';
Chart.defaults.borderColor = '#1c2530';
Chart.defaults.font.family = "'Realtime Text', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.tooltip.backgroundColor = '#111620';
Chart.defaults.plugins.tooltip.borderColor = '#263244';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.titleColor = '#e8edf2';
Chart.defaults.plugins.tooltip.bodyColor = '#e8edf2';
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 6;

// ── Weight Trend Chart ────────────────────────────────────────────────────
function buildWeightChart(hiveId) {
  if (weightChartInstance) weightChartInstance.destroy();

  const history = getHistory(hiveId);
  const ctx = document.getElementById('weight-chart').getContext('2d');

  const labels = history.sensors.map((p) => {
    const d = new Date(p.timestamp);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  });
  const data = history.sensors.map((p) => p.weight);

  weightChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Weight (kg)',
        data,
        borderColor: '#e6a83e',
        backgroundColor: 'rgba(230, 168, 62, 0.08)',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#e6a83e',
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          display: true,
          grid: { color: '#1c2530' },
          ticks: {
            color: '#54687a',
            maxTicksLimit: 8,
            maxRotation: 0,
          },
        },
        y: {
          display: true,
          grid: { color: '#1c2530' },
          ticks: {
            color: '#54687a',
            callback: (v) => v.toFixed(1) + ' kg',
          },
        },
      },
    },
  });
}

// ── Environment Chart (Temp / Humidity / CO2) ─────────────────────────────
function buildEnvironmentChart(hiveId) {
  if (environmentChartInstance) environmentChartInstance.destroy();

  const history = getHistory(hiveId);
  const ctx = document.getElementById('environment-chart').getContext('2d');

  const labels = history.sensors.map((p) => {
    const d = new Date(p.timestamp);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  });

  const tempData = history.sensors.map((p) => p.temperature);
  const humidityData = history.sensors.map((p) => p.humidity);
  const co2Data = history.sensors.map((p) => p.co2);

  environmentChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Temp (C)',
          data: tempData,
          borderColor: '#d94848',
          backgroundColor: 'rgba(217, 72, 72, 0.05)',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#d94848',
          fill: false,
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          label: 'Humidity (%)',
          data: humidityData,
          borderColor: '#2ea868',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#2ea868',
          fill: false,
          tension: 0.3,
          yAxisID: 'y1',
        },
        {
          label: 'CO2 (ppm)',
          data: co2Data,
          borderColor: '#d9982b',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#d9982b',
          fill: false,
          tension: 0.3,
          yAxisID: 'y2',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#8b9eb0',
            usePointStyle: true,
            pointStyleWidth: 8,
            padding: 16,
            boxWidth: 8,
            font: { size: 10 },
          },
        },
      },
      scales: {
        x: {
          display: true,
          grid: { color: '#1c2530' },
          ticks: {
            color: '#54687a',
            maxTicksLimit: 8,
            maxRotation: 0,
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: '#1c2530' },
          ticks: {
            color: '#d94848',
            callback: (v) => v.toFixed(1) + 'C',
            maxTicksLimit: 5,
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#2ea868',
            callback: (v) => v + '%',
            maxTicksLimit: 5,
          },
          min: 30,
          max: 90,
        },
        y2: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#d9982b',
            callback: (v) => (v / 1000).toFixed(1) + 'k',
            maxTicksLimit: 5,
          },
        },
      },
    },
  });
}

// ── Audio Classification Timeline ─────────────────────────────────────────
function buildAudioChart(hiveId) {
  if (audioChartInstance) audioChartInstance.destroy();

  const history = getHistory(hiveId);
  const ctx = document.getElementById('audio-chart').getContext('2d');

  const labels = history.audio.map((p) => {
    const d = new Date(p.timestamp);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  });

  const statusMap = { 'NORMAL': 0, 'STRESSED': 1, 'PRE_SWARM': 2, 'QUEENLESS': 3 };
  const data = history.audio.map((p) => statusMap[p.status] || 0);

  audioChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Audio Status',
        data,
        borderColor: '#8b7ec8',
        backgroundColor: 'rgba(139, 126, 200, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#8b7ec8',
        fill: true,
        stepped: true,
        tension: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          display: true,
          grid: { color: '#1c2530' },
          ticks: {
            color: '#54687a',
            maxTicksLimit: 8,
            maxRotation: 0,
          },
        },
        y: {
          display: true,
          min: -0.2,
          max: 3.2,
          grid: { color: '#1c2530' },
          ticks: {
            color: '#8b9eb0',
            stepSize: 1,
            callback: (v) => {
              const labels = ['NORMAL', 'STRESSED', 'PRE_SWARM', 'QUEENLESS'];
              return labels[v] || '';
            },
          },
        },
      },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Desktop Comparison Charts ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

let healthBarsInstance = null;
let tempHeatmapInstance = null;
let weightBarsInstance = null;

// ── Health Score Bar Chart ────────────────────────────────────────────────
function buildHealthBars(hives, canvasId) {
  if (healthBarsInstance) healthBarsInstance.destroy();

  const ctx = document.getElementById(canvasId).getContext('2d');
  const labels = hives.map((h) => h.name);
  const scores = hives.map((h) => h.healthScore);
  const colors = scores.map((s) => {
    if (s >= 75) return '#2ea868';
    if (s >= 50) return '#d9982b';
    return '#d94848';
  });

  healthBarsInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Health Score',
        data: scores,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 0,
        borderRadius: 2,
        barThickness: 14,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          grid: { color: '#1c2530' },
          ticks: { color: '#54687a', stepSize: 20 },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#8b9eb0',
            font: { size: 10 },
          },
        },
      },
    },
  });
}

// ── Temperature Timeline (Line Chart, 24h) ────────────────────────────────
function buildTempHeatmap(hives, canvasId) {
  if (tempHeatmapInstance) tempHeatmapInstance.destroy();

  const ctx = document.getElementById(canvasId).getContext('2d');

  const history = getHistory(hives[0].id);
  const timeLabels = history.sensors.map((p) => {
    const d = new Date(p.timestamp);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  });

  // Subtle line colors per hive so they don't overwhelm
  const palette = [
    '#e6a83e', '#4a9ec8', '#2ea868', '#d9982b', '#d94848',
    '#8b7ec8', '#5a9e8e', '#c47e5a', '#6babcd', '#c8906a',
    '#7ea8c4', '#b8a04e'
  ];

  const datasets = hives.map((hive, idx) => {
    const h = getHistory(hive.id);
    const temps = h.sensors.map((p) => p.temperature);
    return {
      label: hive.name,
      data: temps,
      borderColor: palette[idx % palette.length],
      backgroundColor: 'transparent',
      borderWidth: 1.2,
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0.3,
    };
  });

  tempHeatmapInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#8b9eb0',
            usePointStyle: true,
            boxWidth: 6,
            padding: 8,
            font: { size: 8 },
          },
        },
        tooltip: {
          callbacks: {
            title: (items) => items[0]?.dataset?.label + ' | ' + items[0]?.label,
            label: (item) => item.raw.toFixed(1) + 'C',
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#1c2530' },
          ticks: {
            color: '#54687a',
            maxTicksLimit: 8,
            maxRotation: 0,
            font: { size: 9 },
          },
        },
        y: {
          grid: { color: '#1c2530' },
          ticks: {
            color: '#8b9eb0',
            font: { size: 10 },
            callback: (v) => v.toFixed(1) + 'C',
          },
          title: {
            display: true,
            text: 'Temperature (C)',
            color: '#54687a',
            font: { size: 10 },
          },
        },
      },
    },
  });
}

// applyTempColors no longer used — colors set at dataset creation

// ── Weight Comparison Bar Chart ───────────────────────────────────────────
function buildWeightBars(hives, canvasId) {
  if (weightBarsInstance) weightBarsInstance.destroy();

  const ctx = document.getElementById(canvasId).getContext('2d');
  const labels = hives.map((h) => h.name);
  const weights = hives.map((h) => h.weight);
  const colors = hives.map((h) => {
    if (h.status === 'offline') return '#4a5568';
    return '#e6a83e';
  });

  weightBarsInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Weight (kg)',
        data: weights,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 0,
        borderRadius: 2,
        barThickness: 14,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          grid: { color: '#1c2530' },
          ticks: {
            color: '#54687a',
            callback: (v) => v.toFixed(1) + ' kg',
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#8b9eb0',
            font: { size: 10 },
          },
        },
      },
    },
  });
}

// ── Destroy Desktop Charts ────────────────────────────────────────────────
function destroyDesktopCharts() {
  if (healthBarsInstance) { healthBarsInstance.destroy(); healthBarsInstance = null; }
  if (tempHeatmapInstance) { tempHeatmapInstance.destroy(); tempHeatmapInstance = null; }
  if (weightBarsInstance) { weightBarsInstance.destroy(); weightBarsInstance = null; }
}

// ── Cleanup ───────────────────────────────────────────────────────────────
function destroyCharts() {
  if (weightChartInstance) { weightChartInstance.destroy(); weightChartInstance = null; }
  if (environmentChartInstance) { environmentChartInstance.destroy(); environmentChartInstance = null; }
  if (audioChartInstance) { audioChartInstance.destroy(); audioChartInstance = null; }
}
