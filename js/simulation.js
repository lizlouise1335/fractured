/**
 * Fractured Research — Hydraulic Fracturing Simulator
 * A StimPlan-style fracturing simulation with mock physics engine
 */

// ---- Default Parameters ----

const DEFAULT_PARAMS = {
  well: {
    tvd: 8500,              // ft - True Vertical Depth
    perfTop: 8450,          // ft - Top of perforations
    perfBottom: 8550,       // ft - Bottom of perforations
    numPerfs: 60,           // count
    perfDiameter: 0.42,     // inches
    wellboreID: 5.5,        // inches
    casingID: 4.892,        // inches
  },
  rock: {
    youngsModulus: 4.5e6,   // psi - Young's Modulus
    poissonsRatio: 0.25,    // dimensionless
    stressMin: 5800,        // psi - Minimum horizontal stress at perf depth
    stressMax: 6900,        // psi - Maximum horizontal stress
    overburden: 8500,       // psi - Overburden stress (approx 1 psi/ft)
    toughness: 1500,        // psi*sqrt(in) - Fracture toughness
    leakoffCoeff: 0.0015,   // ft/sqrt(min) - Carter leak-off coefficient
    porosity: 0.08,         // fraction
    permeability: 0.01,     // md
  },
  fluid: {
    type: 'crosslinked-gel',
    viscosity: 250,         // cp at 100 s^-1
    specificGravity: 1.02,
    nPrime: 0.55,           // Power law index
    kPrime: 0.045,          // Consistency index (lbf*s^n'/ft^2)
  },
  schedule: [
    { name: 'Pad',          rate: 25, volume: 8000,  proppantType: 'None',             concentration: 0 },
    { name: 'Stage 1',      rate: 25, volume: 5000,  proppantType: '20/40 Jordan Sand', concentration: 1 },
    { name: 'Stage 2',      rate: 30, volume: 6000,  proppantType: '20/40 Jordan Sand', concentration: 2 },
    { name: 'Stage 3',      rate: 30, volume: 8000,  proppantType: '20/40 Jordan Sand', concentration: 4 },
    { name: 'Stage 4',      rate: 35, volume: 10000, proppantType: '20/40 Resin Coated', concentration: 6 },
    { name: 'Stage 5',      rate: 35, volume: 8000,  proppantType: '20/40 Resin Coated', concentration: 8 },
    { name: 'Flush',        rate: 35, volume: 2500,  proppantType: 'None',             concentration: 0 },
  ]
};

// ---- Simulation State ----

let simParams = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
let simResults = null;
let simRunning = false;

// ---- Simulation Engine (Simplified PKN/KGD Hybrid Model) ----

function runSimulation() {
  if (simRunning) return;
  simRunning = true;

  readInputs();

  const params = simParams;
  const schedule = params.schedule;

  // Calculate total treatment
  const totalVolume = schedule.reduce((s, stg) => s + stg.volume, 0); // gallons
  const totalProppant = schedule.reduce((s, stg) => s + (stg.volume / 42) * stg.concentration, 0); // lbs (conc in ppa = lb/gal)
  const totalTime = schedule.reduce((s, stg) => s + stg.volume / (stg.rate * 42), 0); // minutes (rate in bpm, 42 gal/bbl)

  // Time-stepping simulation
  const dt = 0.5; // minutes
  const numSteps = Math.ceil(totalTime / dt);
  const timeData = [];
  const pressureData = [];
  const netPressureData = [];
  const widthData = [];
  const halfLengthData = [];
  const heightData = [];
  const efficiencyData = [];
  const proppantConcData = [];
  const slurryRateData = [];

  let cumulativeVol = 0;     // gallons pumped
  let fracHalfLength = 0;    // ft
  let fracHeight = params.perfBottom - params.perfTop; // ft (initial = perf interval)
  let fracWidth = 0;         // inches
  let leakoffVol = 0;        // gallons
  let scheduleIdx = 0;
  let stageVolPumped = 0;

  const E = params.rock.youngsModulus;
  const nu = params.rock.poissonsRatio;
  const Ep = E / (1 - nu * nu); // Plane strain modulus
  const Cl = params.rock.leakoffCoeff;
  const stressMin = params.rock.stressMin;
  const perfInterval = params.perfBottom - params.perfTop;

  // Stress barriers (simplified)
  const stressAbove = stressMin + 800;  // psi - higher stress above zone
  const stressBelow = stressMin + 600;  // psi - higher stress below zone

  for (let step = 0; step <= numSteps; step++) {
    const t = step * dt;

    // Determine current stage
    while (scheduleIdx < schedule.length - 1 && stageVolPumped >= schedule[scheduleIdx].volume) {
      stageVolPumped -= schedule[scheduleIdx].volume;
      scheduleIdx++;
    }
    const currentStage = schedule[Math.min(scheduleIdx, schedule.length - 1)];
    const currentRate = currentStage.rate; // bpm
    const currentConc = currentStage.concentration; // ppa

    const rateGalMin = currentRate * 42; // gal/min
    const volThisStep = rateGalMin * dt;
    cumulativeVol += volThisStep;
    stageVolPumped += volThisStep;

    // Leak-off (Carter model)
    const tMinutes = Math.max(t, 0.1);
    const leakoffRate = 2 * Cl * fracHalfLength * fracHeight * 2 / (Math.sqrt(tMinutes) * 7.48); // gal/min approx
    leakoffVol += leakoffRate * dt;

    // Net volume in fracture
    const netVol = Math.max(cumulativeVol - leakoffVol, cumulativeVol * 0.3);

    // Fluid efficiency
    const efficiency = netVol / Math.max(cumulativeVol, 1);

    // PKN-style geometry
    // Width ~ (Q * mu * L / Ep)^(1/4)  (simplified)
    const Qft3 = rateGalMin / 7.48 / 60; // ft^3/s
    const muPas = params.fluid.viscosity * 0.001; // Pa*s
    const L = Math.max(fracHalfLength, 10);

    // Fracture half-length growth
    const netVolFt3 = netVol / 7.48;
    fracHalfLength = Math.pow(netVolFt3 / (Math.max(fracHeight, perfInterval) * 0.02), 0.6) * 2.5;
    fracHalfLength = Math.min(fracHalfLength, 1800); // cap

    // Fracture width (PKN approx)
    fracWidth = 2.5 * Math.pow((muPas * Qft3 * fracHalfLength) / Ep, 0.25) * 12; // inches
    fracWidth = Math.max(fracWidth, 0.05);
    fracWidth = Math.min(fracWidth, 1.2);

    // Height growth with stress barriers
    const netPressure = Ep * (fracWidth / 12) / (2 * Math.max(fracHeight, perfInterval));
    const heightGrowthUp = netPressure > (stressAbove - stressMin) ?
      Math.pow((netPressure - (stressAbove - stressMin)) / 200, 0.7) * dt * 2 : 0;
    const heightGrowthDown = netPressure > (stressBelow - stressMin) ?
      Math.pow((netPressure - (stressBelow - stressMin)) / 200, 0.7) * dt * 2 : 0;
    fracHeight = perfInterval + heightGrowthUp + heightGrowthDown;
    fracHeight = Math.min(fracHeight, 500); // cap

    // Bottomhole treating pressure
    const bhp = stressMin + netPressure + 50 * Math.sin(t / totalTime * Math.PI * 0.3);

    // Proppant concentration in fracture
    const fracConc = currentConc * (1 - efficiency * 0.3);

    timeData.push(t);
    pressureData.push(bhp);
    netPressureData.push(netPressure);
    widthData.push(fracWidth);
    halfLengthData.push(fracHalfLength);
    heightData.push(fracHeight);
    efficiencyData.push(efficiency * 100);
    proppantConcData.push(fracConc);
    slurryRateData.push(currentRate);
  }

  // Generate fracture geometry profile (width vs height at wellbore)
  const finalHeight = heightData[heightData.length - 1];
  const finalWidth = widthData[widthData.length - 1];
  const widthProfile = [];
  const heightPoints = 50;
  for (let i = 0; i <= heightPoints; i++) {
    const hFrac = i / heightPoints;
    const hPos = -finalHeight / 2 + hFrac * finalHeight;
    // Elliptical width profile
    const wFrac = Math.sqrt(1 - Math.pow(2 * (hFrac - 0.5), 2));
    widthProfile.push({ height: hPos, width: finalWidth * wFrac });
  }

  // Generate 2D proppant concentration map for fracture face
  const concMap = generateProppantMap(
    halfLengthData[halfLengthData.length - 1],
    finalHeight,
    proppantConcData,
    timeData,
    halfLengthData
  );

  simResults = {
    time: timeData,
    pressure: pressureData,
    netPressure: netPressureData,
    width: widthData,
    halfLength: halfLengthData,
    height: heightData,
    efficiency: efficiencyData,
    proppantConc: proppantConcData,
    slurryRate: slurryRateData,
    widthProfile,
    concMap,
    summary: {
      finalHalfLength: halfLengthData[halfLengthData.length - 1],
      finalHeight: finalHeight,
      finalWidth: finalWidth,
      maxNetPressure: Math.max(...netPressureData),
      avgWidth: widthData.reduce((a, b) => a + b, 0) / widthData.length,
      maxBHP: Math.max(...pressureData),
      totalVolume: totalVolume,
      totalProppant: totalProppant,
      pumpTime: totalTime,
      efficiency: efficiencyData[efficiencyData.length - 1],
      fractureArea: halfLengthData[halfLengthData.length - 1] * finalHeight * 2,
      proppantCoverage: totalProppant / (halfLengthData[halfLengthData.length - 1] * finalHeight * 2 / 144),
    }
  };

  simRunning = false;
  return simResults;
}

function generateProppantMap(maxLength, maxHeight, concData, timeData, lengthData) {
  const nx = 60;
  const ny = 30;
  const map = [];

  for (let iy = 0; iy < ny; iy++) {
    const row = [];
    const yFrac = iy / (ny - 1);
    const y = -maxHeight / 2 + yFrac * maxHeight;
    const yNorm = Math.abs(2 * (yFrac - 0.5));

    for (let ix = 0; ix < nx; ix++) {
      const xFrac = ix / (nx - 1);
      const x = xFrac * maxLength;

      // Proppant concentration decreases with distance from wellbore
      // and towards top/bottom of fracture (settling)
      const distFactor = Math.exp(-1.5 * xFrac);
      const settlingFactor = 1 + 0.8 * (yFrac - 0.5); // more at bottom
      const heightFactor = Math.max(0, 1 - Math.pow(yNorm, 2.5));

      // Find what time fracture reached this length
      let arrivalConc = 0;
      for (let k = lengthData.length - 1; k >= 0; k--) {
        if (lengthData[k] >= x) {
          arrivalConc = concData[k];
        }
      }

      const conc = arrivalConc * distFactor * Math.max(0.1, settlingFactor) * heightFactor;
      row.push(Math.max(0, conc));
    }
    map.push(row);
  }

  return { data: map, nx, ny, maxLength, maxHeight };
}

// ---- Input Reading ----

function readInputs() {
  const get = id => {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) : null;
  };
  const getStr = id => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  simParams.well.tvd = get('sim-tvd') || simParams.well.tvd;
  simParams.well.perfTop = get('sim-perf-top') || simParams.well.perfTop;
  simParams.well.perfBottom = get('sim-perf-bottom') || simParams.well.perfBottom;
  simParams.well.numPerfs = get('sim-num-perfs') || simParams.well.numPerfs;
  simParams.well.wellboreID = get('sim-wellbore-id') || simParams.well.wellboreID;

  simParams.rock.youngsModulus = get('sim-youngs') || simParams.rock.youngsModulus;
  simParams.rock.poissonsRatio = get('sim-poissons') || simParams.rock.poissonsRatio;
  simParams.rock.stressMin = get('sim-stress-min') || simParams.rock.stressMin;
  simParams.rock.stressMax = get('sim-stress-max') || simParams.rock.stressMax;
  simParams.rock.toughness = get('sim-toughness') || simParams.rock.toughness;
  simParams.rock.leakoffCoeff = get('sim-leakoff') || simParams.rock.leakoffCoeff;
  simParams.rock.porosity = get('sim-porosity') || simParams.rock.porosity;
  simParams.rock.permeability = get('sim-perm') || simParams.rock.permeability;

  simParams.fluid.type = getStr('sim-fluid-type') || simParams.fluid.type;
  simParams.fluid.viscosity = get('sim-viscosity') || simParams.fluid.viscosity;
  simParams.fluid.specificGravity = get('sim-sg') || simParams.fluid.specificGravity;
  simParams.fluid.nPrime = get('sim-nprime') || simParams.fluid.nPrime;
  simParams.fluid.kPrime = get('sim-kprime') || simParams.fluid.kPrime;

  // Read pump schedule from table
  readPumpSchedule();
}

function readPumpSchedule() {
  const tbody = document.getElementById('sim-schedule-body');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  const schedule = [];
  rows.forEach(row => {
    const cells = row.querySelectorAll('input, select');
    if (cells.length >= 5) {
      schedule.push({
        name: cells[0].value,
        rate: parseFloat(cells[1].value) || 25,
        volume: parseFloat(cells[2].value) || 5000,
        proppantType: cells[3].value,
        concentration: parseFloat(cells[4].value) || 0,
      });
    }
  });
  if (schedule.length > 0) {
    simParams.schedule = schedule;
  }
}

// ---- Pump Schedule Table ----

function renderScheduleTable() {
  const tbody = document.getElementById('sim-schedule-body');
  if (!tbody) return;

  tbody.innerHTML = simParams.schedule.map((stg, i) => `
    <tr>
      <td><input type="text" value="${stg.name}" class="sim-input sim-input-sm"></td>
      <td><input type="number" value="${stg.rate}" min="1" max="100" step="1" class="sim-input sim-input-sm"></td>
      <td><input type="number" value="${stg.volume}" min="100" step="500" class="sim-input sim-input-sm"></td>
      <td>
        <select class="sim-input sim-input-sm">
          <option value="None" ${stg.proppantType === 'None' ? 'selected' : ''}>None</option>
          <option value="20/40 Jordan Sand" ${stg.proppantType === '20/40 Jordan Sand' ? 'selected' : ''}>20/40 Jordan Sand</option>
          <option value="20/40 Ottawa Sand" ${stg.proppantType === '20/40 Ottawa Sand' ? 'selected' : ''}>20/40 Ottawa Sand</option>
          <option value="20/40 Resin Coated" ${stg.proppantType === '20/40 Resin Coated' ? 'selected' : ''}>20/40 Resin Coated</option>
          <option value="20/40 Ceramic" ${stg.proppantType === '20/40 Ceramic' ? 'selected' : ''}>20/40 Ceramic</option>
          <option value="30/50 Sand" ${stg.proppantType === '30/50 Sand' ? 'selected' : ''}>30/50 Sand</option>
          <option value="16/30 Ceramic" ${stg.proppantType === '16/30 Ceramic' ? 'selected' : ''}>16/30 Ceramic</option>
        </select>
      </td>
      <td><input type="number" value="${stg.concentration}" min="0" max="16" step="0.5" class="sim-input sim-input-sm"></td>
      <td>
        <button class="sim-row-delete" onclick="removeScheduleRow(${i})" title="Remove stage">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

function addScheduleRow() {
  const lastStage = simParams.schedule[simParams.schedule.length - 1];
  simParams.schedule.push({
    name: `Stage ${simParams.schedule.length}`,
    rate: lastStage ? lastStage.rate : 25,
    volume: 5000,
    proppantType: '20/40 Jordan Sand',
    concentration: lastStage ? Math.min(lastStage.concentration + 2, 12) : 2,
  });
  renderScheduleTable();
}

function removeScheduleRow(index) {
  if (simParams.schedule.length <= 1) return;
  readPumpSchedule();
  simParams.schedule.splice(index, 1);
  renderScheduleTable();
}

function resetParameters() {
  simParams = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
  populateInputs();
  renderScheduleTable();
  showToast('Parameters reset to defaults');
}

function populateInputs() {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  set('sim-tvd', simParams.well.tvd);
  set('sim-perf-top', simParams.well.perfTop);
  set('sim-perf-bottom', simParams.well.perfBottom);
  set('sim-num-perfs', simParams.well.numPerfs);
  set('sim-wellbore-id', simParams.well.wellboreID);

  set('sim-youngs', simParams.rock.youngsModulus);
  set('sim-poissons', simParams.rock.poissonsRatio);
  set('sim-stress-min', simParams.rock.stressMin);
  set('sim-stress-max', simParams.rock.stressMax);
  set('sim-toughness', simParams.rock.toughness);
  set('sim-leakoff', simParams.rock.leakoffCoeff);
  set('sim-porosity', simParams.rock.porosity);
  set('sim-perm', simParams.rock.permeability);

  set('sim-fluid-type', simParams.fluid.type);
  set('sim-viscosity', simParams.fluid.viscosity);
  set('sim-sg', simParams.fluid.specificGravity);
  set('sim-nprime', simParams.fluid.nPrime);
  set('sim-kprime', simParams.fluid.kPrime);
}

// ---- Visualization: Canvas Charts ----

function drawChart(canvasId, datasets, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;

  const margin = { top: 35, right: 20, bottom: 45, left: 65 };
  const plotW = w - margin.left - margin.right;
  const plotH = h - margin.top - margin.bottom;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Compute ranges
  let xMin = options.xMin ?? Infinity, xMax = options.xMax ?? -Infinity;
  let yMin = options.yMin ?? Infinity, yMax = options.yMax ?? -Infinity;

  datasets.forEach(ds => {
    ds.x.forEach(v => { if (v < xMin) xMin = v; if (v > xMax) xMax = v; });
    ds.y.forEach(v => { if (v < yMin) yMin = v; if (v > yMax) yMax = v; });
  });

  if (options.yMin !== undefined) yMin = options.yMin;
  if (options.yMax !== undefined) yMax = options.yMax;

  const yPad = (yMax - yMin) * 0.08 || 1;
  if (options.yMin === undefined) yMin -= yPad;
  if (options.yMax === undefined) yMax += yPad;
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  if (xMin === xMax) { xMin -= 1; xMax += 1; }

  const xScale = v => margin.left + ((v - xMin) / (xMax - xMin)) * plotW;
  const yScale = v => margin.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  // Grid
  ctx.strokeStyle = '#f0ece6';
  ctx.lineWidth = 1;
  const numGridY = 5;
  for (let i = 0; i <= numGridY; i++) {
    const y = margin.top + (i / numGridY) * plotH;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotW, y);
    ctx.stroke();
  }
  const numGridX = 6;
  for (let i = 0; i <= numGridX; i++) {
    const x = margin.left + (i / numGridX) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + plotH);
    ctx.stroke();
  }

  // Axes border
  ctx.strokeStyle = '#e8e4de';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotH);
  ctx.lineTo(margin.left + plotW, margin.top + plotH);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = '#6b6560';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i <= numGridX; i++) {
    const val = xMin + (i / numGridX) * (xMax - xMin);
    const x = margin.left + (i / numGridX) * plotW;
    ctx.fillText(formatAxisVal(val), x, margin.top + plotH + 18);
  }
  ctx.textAlign = 'right';
  for (let i = 0; i <= numGridY; i++) {
    const val = yMax - (i / numGridY) * (yMax - yMin);
    const y = margin.top + (i / numGridY) * plotH;
    ctx.fillText(formatAxisVal(val), margin.left - 8, y + 4);
  }

  // Axis titles
  ctx.fillStyle = '#2c2825';
  ctx.font = '600 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(options.xLabel || '', margin.left + plotW / 2, h - 5);

  ctx.save();
  ctx.translate(14, margin.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(options.yLabel || '', 0, 0);
  ctx.restore();

  // Title
  ctx.fillStyle = '#2c2825';
  ctx.font = '600 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(options.title || '', margin.left, margin.top - 12);

  // Plot data
  datasets.forEach(ds => {
    ctx.strokeStyle = ds.color || '#8b5e3c';
    ctx.lineWidth = ds.lineWidth || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (ds.dashed) {
      ctx.setLineDash([6, 3]);
    } else {
      ctx.setLineDash([]);
    }

    // Area fill
    if (ds.fill) {
      ctx.beginPath();
      ctx.moveTo(xScale(ds.x[0]), yScale(0));
      for (let i = 0; i < ds.x.length; i++) {
        ctx.lineTo(xScale(ds.x[i]), yScale(ds.y[i]));
      }
      ctx.lineTo(xScale(ds.x[ds.x.length - 1]), yScale(0));
      ctx.closePath();
      ctx.fillStyle = ds.fill;
      ctx.fill();
    }

    // Line
    ctx.beginPath();
    for (let i = 0; i < ds.x.length; i++) {
      const px = xScale(ds.x[i]);
      const py = yScale(ds.y[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Legend
  if (datasets.length > 1 && datasets.some(ds => ds.label)) {
    const legendX = margin.left + plotW - 10;
    let legendY = margin.top + 12;
    ctx.textAlign = 'right';
    ctx.font = '11px Inter, sans-serif';

    datasets.forEach(ds => {
      if (!ds.label) return;
      ctx.strokeStyle = ds.color || '#8b5e3c';
      ctx.lineWidth = ds.lineWidth || 2;
      if (ds.dashed) ctx.setLineDash([4, 2]);
      else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(legendX - ctx.measureText(ds.label).width - 18, legendY - 3);
      ctx.lineTo(legendX - ctx.measureText(ds.label).width - 4, legendY - 3);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ds.color || '#8b5e3c';
      ctx.fillText(ds.label, legendX, legendY);
      legendY += 16;
    });
  }
}

function formatAxisVal(v) {
  if (Math.abs(v) >= 10000) return (v / 1000).toFixed(1) + 'k';
  if (Math.abs(v) >= 100) return Math.round(v).toString();
  if (Math.abs(v) >= 1) return v.toFixed(1);
  if (Math.abs(v) >= 0.01) return v.toFixed(2);
  return v.toFixed(4);
}

// ---- Visualization: Fracture Geometry ----

function drawFractureGeometry(canvasId) {
  if (!simResults) return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;

  const margin = { top: 40, right: 30, bottom: 50, left: 70 };
  const plotW = w - margin.left - margin.right;
  const plotH = h - margin.top - margin.bottom;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const maxL = simResults.summary.finalHalfLength;
  const maxH = simResults.summary.finalHeight;
  const perfTop = simParams.well.perfTop;
  const perfBottom = simParams.well.perfBottom;
  const perfMid = (perfTop + perfBottom) / 2;
  const depthTop = perfMid - maxH / 2 - 50;
  const depthBottom = perfMid + maxH / 2 + 50;

  const xScale = v => margin.left + (v / (maxL * 1.1)) * plotW;
  const yScale = v => margin.top + ((v - depthTop) / (depthBottom - depthTop)) * plotH;

  // Grid
  ctx.strokeStyle = '#f0ece6';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 5; i++) {
    const x = margin.left + (i / 5) * plotW;
    ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, margin.top + plotH); ctx.stroke();
    const y = margin.top + (i / 5) * plotH;
    ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + plotW, y); ctx.stroke();
  }

  // Stress barriers (shaded zones)
  const barrierTop = yScale(perfMid - maxH / 2 - 30);
  const barrierTopEnd = yScale(perfMid - maxH / 2);
  const barrierBot = yScale(perfMid + maxH / 2);
  const barrierBotEnd = yScale(perfMid + maxH / 2 + 30);

  ctx.fillStyle = 'rgba(192, 57, 43, 0.06)';
  ctx.fillRect(margin.left, barrierTop, plotW, barrierTopEnd - barrierTop);
  ctx.fillRect(margin.left, barrierBot, plotW, barrierBotEnd - barrierBot);

  // Draw proppant concentration as colored fracture body
  const concMap = simResults.concMap;
  const cellW = plotW / concMap.nx;
  const fracYTop = yScale(perfMid - maxH / 2);
  const fracYBot = yScale(perfMid + maxH / 2);
  const fracPlotH = fracYBot - fracYTop;
  const cellH = fracPlotH / concMap.ny;

  const maxConc = Math.max(...simParams.schedule.map(s => s.concentration), 1);

  for (let iy = 0; iy < concMap.ny; iy++) {
    for (let ix = 0; ix < concMap.nx; ix++) {
      const conc = concMap.data[iy][ix];
      if (conc < 0.01) continue;
      const intensity = Math.min(conc / maxConc, 1);

      // Color gradient: blue (low) -> green -> yellow -> red (high)
      const r = intensity > 0.5 ? Math.round(255 * Math.min(1, (intensity - 0.25) * 2)) : Math.round(60 * intensity * 2);
      const g = intensity < 0.5 ? Math.round(180 + 75 * intensity * 2) : Math.round(255 - 200 * (intensity - 0.5) * 2);
      const b = intensity < 0.3 ? Math.round(200 - 150 * intensity * 3) : Math.round(50 * (1 - intensity));

      ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
      ctx.fillRect(
        margin.left + ix * cellW,
        fracYTop + iy * cellH,
        cellW + 0.5,
        cellH + 0.5
      );
    }
  }

  // Fracture outline
  ctx.strokeStyle = '#2c2825';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Top edge (curved)
  for (let i = 0; i <= 40; i++) {
    const frac = i / 40;
    const xPos = xScale(frac * maxL);
    const heightAtX = maxH * Math.sqrt(1 - Math.pow(frac, 1.5)) * 0.5;
    const yPos = yScale(perfMid - heightAtX);
    if (i === 0) ctx.moveTo(xPos, yPos);
    else ctx.lineTo(xPos, yPos);
  }
  // Bottom edge (curved, reverse)
  for (let i = 40; i >= 0; i--) {
    const frac = i / 40;
    const xPos = xScale(frac * maxL);
    const heightAtX = maxH * Math.sqrt(1 - Math.pow(frac, 1.5)) * 0.5;
    const yPos = yScale(perfMid + heightAtX);
    ctx.lineTo(xPos, yPos);
  }
  ctx.closePath();
  ctx.stroke();

  // Wellbore line
  ctx.strokeStyle = '#2c2825';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotH);
  ctx.stroke();

  // Perforation interval
  ctx.strokeStyle = '#8b5e3c';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(margin.left, yScale(perfTop));
  ctx.lineTo(margin.left, yScale(perfBottom));
  ctx.stroke();

  // Perf markers
  ctx.fillStyle = '#8b5e3c';
  const numPerfDraw = Math.min(simParams.well.numPerfs, 15);
  for (let i = 0; i < numPerfDraw; i++) {
    const py = yScale(perfTop + (i / (numPerfDraw - 1)) * (perfBottom - perfTop));
    ctx.beginPath();
    ctx.moveTo(margin.left, py);
    ctx.lineTo(margin.left + 12, py - 2);
    ctx.lineTo(margin.left + 12, py + 2);
    ctx.closePath();
    ctx.fill();
  }

  // Axis labels
  ctx.fillStyle = '#6b6560';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 5; i++) {
    const val = (i / 5) * maxL * 1.1;
    ctx.fillText(Math.round(val) + ' ft', margin.left + (i / 5) * plotW, margin.top + plotH + 18);
  }
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const depth = depthTop + (i / 5) * (depthBottom - depthTop);
    ctx.fillText(Math.round(depth) + "'", margin.left - 8, margin.top + (i / 5) * plotH + 4);
  }

  // Axis titles
  ctx.fillStyle = '#2c2825';
  ctx.font = '600 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Fracture Half-Length (ft)', margin.left + plotW / 2, h - 5);
  ctx.save();
  ctx.translate(14, margin.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('True Vertical Depth (ft)', 0, 0);
  ctx.restore();

  // Title
  ctx.font = '600 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Fracture Geometry — Side View with Proppant Concentration', margin.left, margin.top - 14);

  // Color bar
  drawColorBar(ctx, w - 28, margin.top, 14, plotH, maxConc);
}

function drawColorBar(ctx, x, y, w, h, maxVal) {
  const steps = 50;
  for (let i = 0; i < steps; i++) {
    const frac = 1 - i / steps;
    const intensity = frac;
    const r = intensity > 0.5 ? Math.round(255 * Math.min(1, (intensity - 0.25) * 2)) : Math.round(60 * intensity * 2);
    const g = intensity < 0.5 ? Math.round(180 + 75 * intensity * 2) : Math.round(255 - 200 * (intensity - 0.5) * 2);
    const b = intensity < 0.3 ? Math.round(200 - 150 * intensity * 3) : Math.round(50 * (1 - intensity));

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y + (i / steps) * h, w, h / steps + 1);
  }
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = '#6b6560';
  ctx.font = '9px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(maxVal.toFixed(1), x + w + 3, y + 8);
  ctx.fillText('0', x + w + 3, y + h + 3);
  ctx.fillText('ppa', x + w + 3, y + h / 2 + 3);
}

// ---- Visualization: Width Profile ----

function drawWidthProfile(canvasId) {
  if (!simResults) return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  const margin = { top: 35, right: 20, bottom: 45, left: 55 };
  const plotW = w - margin.left - margin.right;
  const plotH = h - margin.top - margin.bottom;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const profile = simResults.widthProfile;
  const maxWidth = Math.max(...profile.map(p => p.width)) * 1.15;
  const minH = Math.min(...profile.map(p => p.height));
  const maxH = Math.max(...profile.map(p => p.height));

  // Grid
  ctx.strokeStyle = '#f0ece6';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 5; i++) {
    const x = margin.left + (i / 5) * plotW;
    const y = margin.top + (i / 5) * plotH;
    ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, margin.top + plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + plotW, y); ctx.stroke();
  }

  ctx.strokeStyle = '#e8e4de';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotH);
  ctx.lineTo(margin.left + plotW, margin.top + plotH);
  ctx.stroke();

  const xScale = v => margin.left + (v / maxWidth) * plotW;
  const yScale = v => margin.top + ((v - minH) / (maxH - minH)) * plotH;

  // Fill
  ctx.fillStyle = 'rgba(139, 94, 60, 0.15)';
  ctx.beginPath();
  ctx.moveTo(xScale(0), yScale(profile[0].height));
  profile.forEach(p => ctx.lineTo(xScale(p.width), yScale(p.height)));
  ctx.lineTo(xScale(0), yScale(profile[profile.length - 1].height));
  ctx.closePath();
  ctx.fill();

  // Line
  ctx.strokeStyle = '#8b5e3c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  profile.forEach((p, i) => {
    const px = xScale(p.width);
    const py = yScale(p.height);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#6b6560';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 4; i++) {
    const val = (i / 4) * maxWidth;
    ctx.fillText(val.toFixed(2) + '"', margin.left + (i / 4) * plotW, margin.top + plotH + 18);
  }
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const val = minH + (i / 4) * (maxH - minH);
    ctx.fillText(val.toFixed(0) + "'", margin.left - 6, margin.top + (i / 4) * plotH + 4);
  }

  ctx.fillStyle = '#2c2825';
  ctx.font = '600 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Fracture Width (in)', margin.left + plotW / 2, h - 5);
  ctx.save();
  ctx.translate(14, margin.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Relative Height (ft)', 0, 0);
  ctx.restore();

  ctx.font = '600 13px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Width Profile at Wellbore', margin.left, margin.top - 12);
}

// ---- Main Render Function ----

function runAndRender() {
  const btn = document.getElementById('sim-run-btn');
  if (btn) {
    btn.textContent = 'Running...';
    btn.disabled = true;
  }

  // Brief delay for UI update
  setTimeout(() => {
    runSimulation();
    renderResults();

    if (btn) {
      btn.textContent = 'Run Simulation';
      btn.disabled = false;
    }
    showToast('Simulation complete');

    // Scroll to results
    const results = document.getElementById('sim-results');
    if (results) {
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}

function renderResults() {
  if (!simResults) return;

  const resultsDiv = document.getElementById('sim-results');
  if (resultsDiv) resultsDiv.style.display = 'block';

  const s = simResults.summary;

  // Summary cards
  const summaryEl = document.getElementById('sim-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="sim-stat-card">
        <div class="sim-stat-value">${s.finalHalfLength.toFixed(0)}<span class="sim-stat-unit">ft</span></div>
        <div class="sim-stat-label">Fracture Half-Length</div>
      </div>
      <div class="sim-stat-card">
        <div class="sim-stat-value">${s.finalHeight.toFixed(0)}<span class="sim-stat-unit">ft</span></div>
        <div class="sim-stat-label">Fracture Height</div>
      </div>
      <div class="sim-stat-card">
        <div class="sim-stat-value">${s.finalWidth.toFixed(3)}<span class="sim-stat-unit">in</span></div>
        <div class="sim-stat-label">Max Width at Wellbore</div>
      </div>
      <div class="sim-stat-card">
        <div class="sim-stat-value">${s.avgWidth.toFixed(3)}<span class="sim-stat-unit">in</span></div>
        <div class="sim-stat-label">Average Width</div>
      </div>
      <div class="sim-stat-card">
        <div class="sim-stat-value">${s.maxBHP.toFixed(0)}<span class="sim-stat-unit">psi</span></div>
        <div class="sim-stat-label">Max BHP</div>
      </div>
      <div class="sim-stat-card">
        <div class="sim-stat-value">${s.maxNetPressure.toFixed(0)}<span class="sim-stat-unit">psi</span></div>
        <div class="sim-stat-label">Max Net Pressure</div>
      </div>
      <div class="sim-stat-card">
        <div class="sim-stat-value">${s.efficiency.toFixed(1)}<span class="sim-stat-unit">%</span></div>
        <div class="sim-stat-label">Fluid Efficiency</div>
      </div>
      <div class="sim-stat-card">
        <div class="sim-stat-value">${(s.totalProppant / 1000).toFixed(1)}<span class="sim-stat-unit">klb</span></div>
        <div class="sim-stat-label">Total Proppant</div>
      </div>
      <div class="sim-stat-card">
        <div class="sim-stat-value">${s.pumpTime.toFixed(1)}<span class="sim-stat-unit">min</span></div>
        <div class="sim-stat-label">Pump Time</div>
      </div>
      <div class="sim-stat-card">
        <div class="sim-stat-value">${(s.totalVolume / 42).toFixed(0)}<span class="sim-stat-unit">bbl</span></div>
        <div class="sim-stat-label">Total Slurry</div>
      </div>
    `;
  }

  // Draw all charts
  const r = simResults;

  // Downsample for performance
  const step = Math.max(1, Math.floor(r.time.length / 200));
  const t = r.time.filter((_, i) => i % step === 0 || i === r.time.length - 1);
  const ds = (arr) => arr.filter((_, i) => i % step === 0 || i === arr.length - 1);

  drawChart('sim-chart-pressure', [
    { x: t, y: ds(r.pressure), color: '#c0392b', label: 'BHP', lineWidth: 2 },
    { x: t, y: ds(r.netPressure), color: '#2980b9', label: 'Net Pressure', lineWidth: 1.5, dashed: true },
  ], {
    title: 'Pressure vs Time',
    xLabel: 'Time (min)',
    yLabel: 'Pressure (psi)',
    yMin: 0,
  });

  drawChart('sim-chart-geometry', [
    { x: t, y: ds(r.halfLength), color: '#8b5e3c', label: 'Half-Length (ft)', lineWidth: 2 },
    { x: t, y: ds(r.height), color: '#27ae60', label: 'Height (ft)', lineWidth: 2 },
  ], {
    title: 'Fracture Dimensions vs Time',
    xLabel: 'Time (min)',
    yLabel: 'Dimension (ft)',
    yMin: 0,
  });

  drawChart('sim-chart-width', [
    { x: t, y: ds(r.width), color: '#8b5e3c', lineWidth: 2, fill: 'rgba(139, 94, 60, 0.1)' },
  ], {
    title: 'Fracture Width vs Time',
    xLabel: 'Time (min)',
    yLabel: 'Width (in)',
    yMin: 0,
  });

  drawChart('sim-chart-efficiency', [
    { x: t, y: ds(r.efficiency), color: '#2980b9', lineWidth: 2, fill: 'rgba(41, 128, 185, 0.08)' },
  ], {
    title: 'Fluid Efficiency vs Time',
    xLabel: 'Time (min)',
    yLabel: 'Efficiency (%)',
    yMin: 0,
    yMax: 100,
  });

  drawChart('sim-chart-proppant', [
    { x: t, y: ds(r.proppantConc), color: '#d35400', lineWidth: 2, fill: 'rgba(211, 84, 0, 0.1)' },
  ], {
    title: 'Proppant Concentration vs Time',
    xLabel: 'Time (min)',
    yLabel: 'Concentration (ppa)',
    yMin: 0,
  });

  drawChart('sim-chart-rate', [
    { x: t, y: ds(r.slurryRate), color: '#2c3e50', lineWidth: 2 },
  ], {
    title: 'Slurry Rate vs Time',
    xLabel: 'Time (min)',
    yLabel: 'Rate (bpm)',
    yMin: 0,
  });

  drawFractureGeometry('sim-chart-fracture');
  drawWidthProfile('sim-chart-widthprofile');
}

// ---- Tab Switching ----

function switchSimTab(tabId, btn) {
  document.querySelectorAll('.sim-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sim-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');
}

// ---- Initialize Simulation Page ----

function initSimulation() {
  populateInputs();
  renderScheduleTable();
}

// ---- Handle Window Resize ----

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (simResults && currentPage === 'simulation') {
      renderResults();
    }
  }, 250);
});
