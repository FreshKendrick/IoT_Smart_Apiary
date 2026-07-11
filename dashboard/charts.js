/**
 * charts.js — Chart.js visualization for hive detail view
 * IoT Smart Apiary Dashboard Demo
 * Dark, utilitarian, no-glow aesthetic.
 */

// ── Chart Instances ───────────────────────────────────────────────────────
let weightChartInstance = null;
let environmentChartInstance = null;
let audioChartInstance = null;

// ── Chart Defaults ────────────────────────────────────────────────────────
Chart.defaults.color = '#8899aa';
Chart.defaults.borderColor = '#1e3348';
Chart.defaults.font.family = "'Realtime Text', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.tooltip.backgroundColor = '#1b2838';
Chart.defaults.plugins.tooltip.borderColor = '#2a4058';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.titleColor = '#e2e8f0';
Chart.defaults.plugins.tooltip.bodyColor = '#e2e8f0';
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 4;

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
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#3b82f6',
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
          grid: { color: '#1a2a3a' },
          ticks: {
            color: '#5a6e80',
            maxTicksLimit: 8,
            maxRotation: 0,
          },
        },
        y: {
          display: true,
          grid: { color: '#1a2a3a' },
          ticks: {
            color: '#5a6e80',
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
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#ef4444',
          fill: false,
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          label: 'Humidity (%)',
          data: humidityData,
          borderColor: '#22c55e',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#22c55e',
          fill: false,
          tension: 0.3,
          yAxisID: 'y1',
        },
        {
          label: 'CO2 (ppm)',
          data: co2Data,
          borderColor: '#eab308',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#eab308',
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
            color: '#8899aa',
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
          grid: { color: '#1a2a3a' },
          ticks: {
            color: '#5a6e80',
            maxTicksLimit: 8,
            maxRotation: 0,
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: '#1a2a3a' },
          ticks: {
            color: '#ef4444',
            callback: (v) => v.toFixed(1) + 'C',
            maxTicksLimit: 5,
          },
          title: {
            display: false,
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#22c55e',
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
            color: '#eab308',
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

  // Map audio status to numeric for stepped line
  const statusMap = { 'NORMAL': 0, 'STRESSED': 1, 'PRE_SWARM': 2, 'QUEENLESS': 3 };
  const data = history.audio.map((p) => statusMap[p.status] || 0);

  audioChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Audio Status',
        data,
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#a855f7',
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
          grid: { color: '#1a2a3a' },
          ticks: {
            color: '#5a6e80',
            maxTicksLimit: 8,
            maxRotation: 0,
          },
        },
        y: {
          display: true,
          min: -0.2,
          max: 3.2,
          grid: { color: '#1a2a3a' },
          ticks: {
            color: '#8899aa',
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
    if (s >= 75) return '#22c55e';
    if (s >= 50) return '#eab308';
    return '#ef4444';
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
          grid: { color: '#1a2a3a' },
          ticks: { color: '#5a6e80', stepSize: 20 },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#8899aa',
            font: { size: 10 },
          },
        },
      },
    },
  });
}

// ── Temperature Heatmap ───────────────────────────────────────────────────
function buildTempHeatmap(hives, canvasId) {
  if (tempHeatmapInstance) tempHeatmapInstance.destroy();

  const ctx = document.getElementById(canvasId).getContext('2d');

  // Build heatmap data: rows = hives, cols = time points (use first hive's timestamps)
  const history = getHistory(hives[0].id);
  const timeLabels = history.sensors.map((p) => {
    const d = new Date(p.timestamp);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  });

  const datasets = hives.map((hive, idx) => {
    const h = getHistory(hive.id);
    const temps = h.sensors.map((p) => p.temperature);
    return {
      label: hive.name,
      data: temps,
      borderWidth: 0,
      borderRadius: 0,
    };
  });

  tempHeatmapInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: timeLabels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0]?.dataset?.label + ' | ' + items[0]?.label,
            label: (item) => item.raw.toFixed(1) + 'C',
          },
        },
      },
      scales: {
        x: {
          stacked: false,
          grid: { color: '#1a2a3a' },
          ticks: {
            color: '#5a6e80',
            maxTicksLimit: 8,
            maxRotation: 0,
            font: { size: 9 },
          },
        },
        y: {
          stacked: false,
          grid: { color: '#1a2a3a' },
          ticks: {
            color: '#8899aa',
            font: { size: 10 },
          },
          title: {
            display: true,
            text: 'Temperature (C)',
            color: '#5a6e80',
            font: { size: 10 },
          },
        },
      },
    },
  });

  // Color each dataset by the hive's average temperature
  // Apply color after creation since Chart.js dataset-level bar colors need plugin
  applyTempColors(datasets);
}

function applyTempColors(datasets) {
  // Post-render color coding: each hive's bars colored by temp value
  if (!tempHeatmapInstance) return;

  const meta = tempHeatmapInstance.getDatasetMeta(0);
  if (!meta || !meta.data) return;

  // Color each dataset's bars based on their temperature values
  datasets.forEach((ds, dsIdx) => {
    const dsMeta = tempHeatmapInstance.getDatasetMeta(dsIdx);
    if (!dsMeta || !dsMeta.data) return;
    dsMeta.data.forEach((bar, i) => {
      const temp = ds.data[i];
      let color = '#3b82f6'; // cool blue
      if (temp > 36) color = '#ef4444';      // hot red
      else if (temp > 34) color = '#eab308'; // warm yellow
      else if (temp > 32) color = '#22c55e'; // optimal green
      else if (temp > 30) color = '#60a5fa'; // mild blue
      else color = '#93c5fd';                 // cool light blue
      bar.options = bar.options || {};
      bar.options.backgroundColor = color;
    });
  });

  tempHeatmapInstance.update('none');
}

// ── Weight Comparison Bar Chart ───────────────────────────────────────────
function buildWeightBars(hives, canvasId) {
  if (weightBarsInstance) weightBarsInstance.destroy();

  const ctx = document.getElementById(canvasId).getContext('2d');
  const labels = hives.map((h) => h.name);
  const weights = hives.map((h) => h.weight);
  const colors = hives.map((h) => {
    if (h.status === 'offline') return '#6b7280';
    return '#3b82f6';
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
          grid: { color: '#1a2a3a' },
          ticks: {
            color: '#5a6e80',
            callback: (v) => v.toFixed(1) + ' kg',
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#8899aa',
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
