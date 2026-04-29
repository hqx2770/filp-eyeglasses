// ═══════════════════════════════════════════════════════════
// config.js — 参数配置管理
// ═══════════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
  stimulusType: 'E',             // 视标类型: E, C, plane
  flipperDiopter: '2.00',        // 镜片度数: 1.00, 1.50, 2.00, 2.50
  stimulusSize: 'medium',        // 视标大小: small, medium, large
  displayScalePercent: '50',     // 训练显示缩放基准
  flipInterval: 30,              // 翻转间隔(秒)
  trainingDuration: 3,           // 训练时长(分钟)
  bgColor: 'white',              // 背景: white, black, redGreen
  calibrationPxPerMm: '',        // 每毫米像素数
};

const STIMULUS_SIZE_MM_MAP = {
  small: 1.27,
  medium: 1.59,
  large: 2.06,
};

const DEFAULT_PX_PER_MM = 96 / 25.4;
const CALIBRATION_TARGET_MM = 10;

const CONFIG_KEYS = {
  stimulusType: 'stimulus_type',
  flipperDiopter: 'flipper_diopter',
  stimulusSize: 'stimulus_size',
  displayScalePercent: 'display_scale_percent',
  flipInterval: 'flip_interval',
  trainingDuration: 'training_duration',
  bgColor: 'bg_color',
  calibrationPxPerMm: 'calibration_px_per_mm',
};

function getConfig() {
  const config = { ...DEFAULT_CONFIG };
  for (const [key, storageKey] of Object.entries(CONFIG_KEYS)) {
    const val = localStorage.getItem(storageKey);
    if (val !== null) config[key] = val;
  }
  if (!STIMULUS_SIZE_MM_MAP[config.stimulusSize]) {
    const numericSize = parseInt(config.stimulusSize, 10);
    if (!Number.isNaN(numericSize)) {
      config.stimulusSize = numericSize <= 17 ? 'small' : numericSize >= 24 ? 'large' : 'medium';
    } else {
      config.stimulusSize = DEFAULT_CONFIG.stimulusSize;
    }
  }
  return config;
}

function setConfig(key, value) {
  localStorage.setItem(CONFIG_KEYS[key], value);
}

function resetConfig() {
  for (const storageKey of Object.values(CONFIG_KEYS)) {
    localStorage.removeItem(storageKey);
  }
}

function getPxPerMm() {
  const config = getConfig();
  const pxPerMm = parseFloat(config.calibrationPxPerMm);
  return Number.isFinite(pxPerMm) && pxPerMm > 0 ? pxPerMm : DEFAULT_PX_PER_MM;
}

function getStimulusPixelSize(sizeKey) {
  const sizeMm = STIMULUS_SIZE_MM_MAP[sizeKey] || STIMULUS_SIZE_MM_MAP[DEFAULT_CONFIG.stimulusSize];
  return Math.max(1, sizeMm * getPxPerMm());
}

function getDisplayScaleMultiplier() {
  const config = getConfig();
  const scalePercent = parseFloat(config.displayScalePercent);
  return Number.isFinite(scalePercent) && scalePercent > 0 ? scalePercent / 50 : 1;
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateText) {
  const match = String(dateText || '').match(/(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
  if (!match) return '';
  const [, year, month, day] = match;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════
// stimulus.js — E 字 SVG 生成器
// ═══════════════════════════════════════════════════════════

const DIRECTIONS = ['up', 'down', 'left', 'right'];
const STIMULUS_ROTATION_MAP = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};

function randomDirection() {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
}

function getStimulusRenderSize(size) {
  const rawSize = Math.max(1, Number(size) || 0);
  const pixelRatio = window.devicePixelRatio || 1;
  return Math.max(1, Math.round(rawSize * pixelRatio) / pixelRatio);
}

function polarToCartesian(centerX, centerY, radius, angleDeg) {
  const angleRad = (angleDeg - 90) * Math.PI / 180;
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  };
}

function createStimulusSVG(type, direction, size) {
  switch (type) {
    case 'C': return createCSVG(direction, size);
    case 'plane': return createPlaneSVG(direction, size);
    default: return createESVG(direction, size);
  }
}

function createESVG(direction, size) {
  const colors = getColors();
  const canvasSize = getStimulusRenderSize(size);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(canvasSize));
  svg.setAttribute('height', String(canvasSize));
  svg.setAttribute('viewBox', '0 0 5 5');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('aria-label', `E stimulus ${direction}`);
  svg.style.shapeRendering = 'crispEdges';

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', `translate(2.5,2.5) rotate(${STIMULUS_ROTATION_MAP[direction] || 0}) translate(-2.5,-2.5)`);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M 0 0 H 5 V 1 H 1 V 2 H 4 V 3 H 1 V 4 H 5 V 5 H 0 Z');
  path.setAttribute('fill', colors.fg);
  g.appendChild(path);

  svg.appendChild(g);
  return svg;
}

// C 字视标 — 开口方向标识
function createCSVG(direction, size) {
  const colors = getColors();
  const canvasSize = getStimulusRenderSize(size);
  const center = 2.5;
  const outerRadius = 2.3;
  const innerRadius = 1.3;
  const gapAngle = 32;
  const startAngle = gapAngle / 2;
  const endAngle = 360 - (gapAngle / 2);
  const outerStart = polarToCartesian(center, center, outerRadius, startAngle);
  const outerEnd = polarToCartesian(center, center, outerRadius, endAngle);
  const innerStart = polarToCartesian(center, center, innerRadius, startAngle);
  const innerEnd = polarToCartesian(center, center, innerRadius, endAngle);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(canvasSize));
  svg.setAttribute('height', String(canvasSize));
  svg.setAttribute('viewBox', '0 0 5 5');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('aria-label', `C stimulus ${direction}`);
  svg.style.shapeRendering = 'geometricPrecision';

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', `translate(2.5,2.5) rotate(${STIMULUS_ROTATION_MAP[direction] || 0}) translate(-2.5,-2.5)`);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 1 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 1 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' '));
  path.setAttribute('fill', colors.fg);
  g.appendChild(path);

  svg.appendChild(g);
  return svg;
}

// ✈︎ 飞机视标 — 机头方向标识
function createPlaneSVG(direction) {
  const colors = getColors();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const rotationMap = {
    right: 0,
    down: 90,
    left: 180,
    up: 270,
  };

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', `translate(50,50) rotate(${rotationMap[direction] || 0}) translate(-50,-50)`);

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '50');
  text.setAttribute('y', '52');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('fill', colors.fg);
  text.setAttribute('font-size', '72');
  text.setAttribute('font-family', 'Segoe UI Symbol, Segoe UI Emoji, Arial Unicode MS, sans-serif');
  text.textContent = '✈';
  g.appendChild(text);

  svg.appendChild(g);
  return svg;
}

// 获取颜色方案
function getColors() {
  const config = getConfig();
  switch (config.bgColor) {
    case 'black':
      return { bg: '#1a1a2e', fg: '#ffffff' };
    case 'redGreen':
      return { bg: '#fef2f2', fg: '#166534' };
    default:
      return { bg: '#ffffff', fg: '#1a1a2e' };
  }
}

// ═══════════════════════════════════════════════════════════
// timer.js — 计时器管理
// ═══════════════════════════════════════════════════════════

class TrainingTimer {
  constructor() {
    this.totalSeconds = 0;
    this.remainingSeconds = 0;
    this.flipInterval = 30;
    this.flipElapsed = 0;
    this.intervalId = null;
    this.onTick = null;
    this.onFlip = null;
    this.onComplete = null;
    this.isPaused = false;
  }

  start(totalMinutes, flipInterval) {
    this.totalSeconds = totalMinutes * 60;
    this.remainingSeconds = this.totalSeconds;
    this.flipInterval = flipInterval;
    this.flipElapsed = 0;
    this.isPaused = false;
    if (this.onTick) this.onTick(this.remainingSeconds);
    this.intervalId = setInterval(() => this._tick(), 1000);
  }

  pause() {
    this.isPaused = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.intervalId = setInterval(() => this._tick(), 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  _tick() {
    if (this.remainingSeconds <= 0) {
      this.stop();
      if (this.onComplete) this.onComplete();
      return;
    }

    this.remainingSeconds--;
    this.flipElapsed++;

    if (this.onTick) this.onTick(this.remainingSeconds);

    if (this.flipElapsed >= this.flipInterval) {
      this.flipElapsed = 0;
      if (this.onFlip) this.onFlip();
    }
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}

// ═══════════════════════════════════════════════════════════
// flipper.js — 翻转拍状态机
// ═══════════════════════════════════════════════════════════

class Flipper {
  constructor() {
    this.mode = 'positive';
    this.diopter = 2.00;
    this.onModeChange = null;
  }

  setDiopter(value) {
    this.diopter = parseFloat(value);
  }

  getCurrentMode() {
    return this.mode;
  }

  getDisplayLabel() {
    const sign = this.mode === 'positive' ? '+' : '-';
    return `${sign}${this.diopter.toFixed(2)}D (${this.mode === 'positive' ? '正镜' : '负镜'})`;
  }

  toggle() {
    this.mode = this.mode === 'positive' ? 'negative' : 'positive';
    if (this.onModeChange) this.onModeChange(this.mode);
  }
}

// ═══════════════════════════════════════════════════════════
// scorer.js — 计分与统计
// ═══════════════════════════════════════════════════════════

class Scorer {
  constructor() {
    this.reset();
  }

  reset() {
    this.correctCount = 0;
    this.wrongCount = 0;
    this.positiveCorrect = 0;
    this.positiveAttempts = 0;
    this.negativeCorrect = 0;
    this.negativeAttempts = 0;
    this.skipCount = 0;
    this.totalScore = 0;
  }

  recordCorrect(mode) {
    this.correctCount++;
    this.totalScore += 5;

    if (mode === 'positive') {
      this.positiveCorrect++;
      this.positiveAttempts++;
    } else {
      this.negativeCorrect++;
      this.negativeAttempts++;
    }
  }

  recordWrong(mode) {
    this.wrongCount++;

    if (mode === 'positive') {
      this.positiveAttempts++;
    } else {
      this.negativeAttempts++;
    }
  }

  recordSkip() {
    this.skipCount++;
  }

  getAccuracy() {
    const total = this.correctCount + this.wrongCount;
    if (total === 0) return 0;
    return Math.round((this.correctCount / total) * 100);
  }

  getPositiveAccuracy() {
    if (this.positiveAttempts === 0) return 0;
    return Math.round((this.positiveCorrect / this.positiveAttempts) * 100);
  }

  getNegativeAccuracy() {
    if (this.negativeAttempts === 0) return 0;
    return Math.round((this.negativeCorrect / this.negativeAttempts) * 100);
  }

  getRating() {
    const acc = this.getAccuracy();
    if (acc >= 90) return { text: '优秀', color: 'green' };
    if (acc >= 75) return { text: '良好', color: 'blue' };
    if (acc >= 60) return { text: '合格', color: 'orange' };
    return { text: '需加强', color: 'red' };
  }
}

// ═══════════════════════════════════════════════════════════
// storage.js — LocalStorage 历史记录
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'flipper_history';

function saveTrainingRecord(record) {
  const history = getHistory();
  const now = new Date();
  history.unshift({
    ...record,
    id: Date.now(),
    date: now.toLocaleString('zh-CN'),
    dateKey: getLocalDateKey(now),
    ratingText: typeof record.rating === 'object' ? record.rating.text : record.rating,
  });
  if (history.length > 100) history.length = 100;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

// ═══════════════════════════════════════════════════════════
// keyboard.js — 键盘事件处理
// ═══════════════════════════════════════════════════════════

let _keyboardHandler = null;

function bindKeyboard(callback) {
  _keyboardHandler = (e) => {
    const key = e.code;
    let action = null;

    switch (key) {
      case 'ArrowUp': action = 'up'; break;
      case 'ArrowDown': action = 'down'; break;
      case 'ArrowLeft': action = 'left'; break;
      case 'ArrowRight': action = 'right'; break;
      case 'Space': action = 'pause'; break;
      case 'KeyR': action = 'redo'; break;
      case 'KeyC': action = 'cantSee'; break;
      case 'Escape': action = 'exit'; break;
    }

    if (!action) return;
    e.preventDefault();
    callback(action);
  };
  document.addEventListener('keydown', _keyboardHandler);
}

function unbindKeyboard() {
  if (_keyboardHandler) {
    document.removeEventListener('keydown', _keyboardHandler);
    _keyboardHandler = null;
  }
}

// ═══════════════════════════════════════════════════════════
// app.js — 应用入口
// ═══════════════════════════════════════════════════════════

(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    start: $('#screen-start'),
    training: $('#screen-training'),
  };

  const els = {
    timerDisplay: $('#timer-display'),
    flipperMode: $('#flipper-mode'),
    scoreDisplay: $('#score-display'),
    correctCount: $('#correct-count'),
    wrongCount: $('#wrong-count'),
    gridContainer: $('#grid-container'),
    configPanel: $('#config-panel'),
    configToggle: $('#btn-config'),
    configClose: $('#config-close'),
    configReset: $('#config-reset'),
    reportOverlay: $('#report-overlay'),
    reportClose: $('#report-close'),
    reportRetry: $('#report-retry'),
    reportHistory: $('#report-history'),
    historyOverlay: $('#history-overlay'),
    historyClose: $('#history-close'),
    historyClear: $('#history-clear'),
    historyTableBody: $('#history-table-body'),
    historyDateFilter: $('#history-date-filter'),
    historyDiopterFilter: $('#history-diopter-filter'),
    historyChart: $('#history-chart'),
    calibrationPreview: $('#calibration-preview'),
    calibrationSlider: $('#calibration-slider'),
    calibrationWidthLabel: $('#calibration-width-label'),
    calibrationStatus: $('#calibration-status'),
    calibrationSave: $('#calibration-save'),
    helpOverlay: $('#help-overlay'),
    helpClose: $('#help-close'),
    helpOpen: $('#btn-help'),
    btnStart: $('#btn-start'),
    btnExit: $('#btn-exit'),
    btnPause: $('#btn-pause'),
    btnRedo: $('#btn-redo'),
    btnCantSee: $('#btn-cantsee'),
    btnHistoryTop: $('#btn-history'),
    softKeyboard: $('#soft-keyboard'),
  };

  // 模块实例
  const timer = new TrainingTimer();
  const flipper = new Flipper();
  const scorer = new Scorer();

  // 网格状态
  let grid = [];         // grid[row][col] = 'up'|'down'|'left'|'right'
  let targetRow = 2;     // 默认中心
  let targetCol = 2;
  let pendingDirection = null;

  let isTraining = false;
  let isPaused = false;

  function setCalibrationPreviewWidth(pxWidth) {
    els.calibrationPreview.style.width = `${pxWidth}px`;
    els.calibrationWidthLabel.textContent = `当前标尺宽度：${pxWidth}px = 10mm`;
  }

  function updateCalibrationPanel() {
    const config = getConfig();
    const savedPxPerMm = parseFloat(config.calibrationPxPerMm);
    const effectivePxPerMm = getPxPerMm();
    const previewWidth = Math.round(effectivePxPerMm * CALIBRATION_TARGET_MM);
    const sliderWidth = Math.min(160, Math.max(20, previewWidth));

    els.calibrationSlider.value = String(sliderWidth);
    setCalibrationPreviewWidth(sliderWidth);

    if (Number.isFinite(savedPxPerMm) && savedPxPerMm > 0) {
      els.calibrationStatus.textContent = `已校准：1mm 约等于 ${savedPxPerMm.toFixed(2)}px，视标将按实际物理尺寸换算。`;
    } else {
      els.calibrationStatus.textContent = `未校准：当前使用默认估算值 1mm 约等于 ${DEFAULT_PX_PER_MM.toFixed(2)}px。`;
    }
  }

  function saveCalibration() {
    const pxWidth = parseInt(els.calibrationSlider.value, 10);
    const pxPerMm = pxWidth / CALIBRATION_TARGET_MM;
    setConfig('calibrationPxPerMm', pxPerMm.toFixed(4));
    updateCalibrationPanel();
    if (screens.training.style.display !== 'none') {
      buildGrid();
    }
  }

  function normalizeHistoryRecord(record) {
    return {
      ...record,
      dateKey: record.dateKey || parseDateKey(record.date),
      ratingText: typeof record.rating === 'object' ? record.rating.text : (record.ratingText || record.rating || '-'),
    };
  }

  // ── 屏幕切换 ──
  function showScreen(name) {
    screens.start.style.display = name === 'start' ? 'flex' : 'none';
    screens.training.style.display = name === 'training' ? 'flex' : 'none';
  }

  function toggleConfig() {
    els.configPanel.classList.toggle('open');
  }

  function applyTrainingScale() {
    document.documentElement.style.setProperty('--training-scale', getDisplayScaleMultiplier().toFixed(2));
  }

  // ── 弹窗 ──
  function showReport(data) {
    $('#report-total-time').textContent = data.totalTime;
    $('#report-total-score').textContent = data.totalScore;
    $('#report-accuracy').textContent = data.accuracy + '%';
    $('#report-correct').textContent = data.correctCount;
    $('#report-wrong').textContent = data.wrongCount;
    $('#report-pos-acc').textContent = data.positiveAccuracy + '%';
    $('#report-neg-acc').textContent = data.negativeAccuracy + '%';
    $('#report-flips').textContent = data.totalFlips;
    $('#report-skips').textContent = data.skipCount;

    const rating = data.rating;
    const ratingEl = $('#report-rating');
    ratingEl.textContent = rating.text;
    ratingEl.style.color =
      rating.color === 'green' ? 'var(--accent-green)' :
      rating.color === 'blue' ? 'var(--accent-blue)' :
      rating.color === 'orange' ? 'var(--accent-orange)' : 'var(--accent-red)';

    els.reportOverlay.classList.remove('hidden');
  }

  function hideReport() { els.reportOverlay.classList.add('hidden'); }

  function getFilteredHistory() {
    const dateFilter = els.historyDateFilter.value;
    const diopterFilter = els.historyDiopterFilter.value;

    return getHistory()
      .map(normalizeHistoryRecord)
      .filter((record) => {
        if (dateFilter && record.dateKey !== dateFilter) return false;
        if (diopterFilter !== 'all' && record.diopter !== diopterFilter) return false;
        return true;
      });
  }

  function renderHistoryChart(records) {
    const canvas = els.historyChart;
    const context = canvas.getContext('2d');
    const width = canvas.clientWidth || 520;
    const height = canvas.clientHeight || 180;
    const ratio = window.devicePixelRatio || 1;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    context.fillStyle = '#64748b';
    context.font = '12px Segoe UI';

    if (!records.length) {
      context.fillText('当前筛选条件下暂无趋势数据', 16, 28);
      return;
    }

    const chartRecords = [...records].reverse();
    const padding = { top: 20, right: 20, bottom: 28, left: 30 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    context.strokeStyle = '#cbd5e1';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(padding.left, padding.top);
    context.lineTo(padding.left, height - padding.bottom);
    context.lineTo(width - padding.right, height - padding.bottom);
    context.stroke();

    for (let mark = 0; mark <= 100; mark += 25) {
      const y = padding.top + innerHeight - (mark / 100) * innerHeight;
      context.strokeStyle = '#dbeafe';
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();

      context.fillStyle = '#64748b';
      context.fillText(`${mark}%`, 2, y + 4);
    }

    context.strokeStyle = '#2563eb';
    context.lineWidth = 2;
    context.beginPath();
    chartRecords.forEach((record, index) => {
      const x = padding.left + (chartRecords.length === 1 ? innerWidth / 2 : (index / (chartRecords.length - 1)) * innerWidth);
      const y = padding.top + innerHeight - (Number(record.accuracy || 0) / 100) * innerHeight;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.stroke();

    chartRecords.forEach((record, index) => {
      const x = padding.left + (chartRecords.length === 1 ? innerWidth / 2 : (index / (chartRecords.length - 1)) * innerWidth);
      const y = padding.top + innerHeight - (Number(record.accuracy || 0) / 100) * innerHeight;
      context.fillStyle = '#2563eb';
      context.beginPath();
      context.arc(x, y, 3, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#475569';
      const label = (record.dateKey || '').slice(5).replace('-', '/');
      if (label) context.fillText(label, x - 14, height - 8);
    });
  }

  function renderHistory() {
    const history = getFilteredHistory();
    els.historyTableBody.innerHTML = '';

    if (history.length === 0) {
      els.historyTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-light)">暂无符合条件的训练记录</td></tr>';
    } else {
      history.forEach((record) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${record.date}</td>
          <td>±${record.diopter}D</td>
          <td>${record.correctCount}/${record.total}</td>
          <td>${record.accuracy}%</td>
          <td>${record.totalScore}</td>
          <td>${record.ratingText}</td>
        `;
        els.historyTableBody.appendChild(tr);
      });
    }

    renderHistoryChart(history);
  }

  function showHistory() {
    renderHistory();
    els.historyOverlay.classList.remove('hidden');
  }

  function hideHistory() { els.historyOverlay.classList.add('hidden'); }
  function showHelp() { els.helpOverlay.classList.remove('hidden'); }
  function hideHelp() { els.helpOverlay.classList.add('hidden'); }

  // ── 网格渲染 ──
  function buildGrid() {
    const config = getConfig();
    const size = getStimulusPixelSize(config.stimulusSize) * getDisplayScaleMultiplier();
    const container = els.gridContainer;
    container.innerHTML = '';

    grid = [];

    for (let row = 0; row < 5; row++) {
      grid[row] = [];
      for (let col = 0; col < 5; col++) {
        const dir = randomDirection();
        grid[row][col] = dir;

        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        if (row === targetRow && col === targetCol) {
          cell.classList.add('is-target');
        }

        const svg = createStimulusSVG(config.stimulusType, dir, size);
        svg.style.width = size + 'px';
        svg.style.height = size + 'px';
        cell.appendChild(svg);
        container.appendChild(cell);
      }
    }
  }

  function refreshTarget() {
    targetRow = Math.floor(Math.random() * 5);
    targetCol = Math.floor(Math.random() * 5);
  }

  function nextRound() {
    pendingDirection = null;
    refreshTarget();
    buildGrid();
  }

  function updateScoreboard() {
    els.scoreDisplay.textContent = `当前得分: ${scorer.totalScore}`;
    els.correctCount.textContent = scorer.correctCount;
    els.wrongCount.textContent = scorer.wrongCount;
  }

  function resolvePendingAnswer() {
    if (!pendingDirection) return;

    const correct = grid[targetRow][targetCol] === pendingDirection;
    const mode = flipper.getCurrentMode();

    if (correct) {
      scorer.recordCorrect(mode);
    } else {
      scorer.recordWrong(mode);
    }

    updateScoreboard();
  }

  function handleTimedFlip() {
    resolvePendingAnswer();
    flipper.toggle();
    els.flipperMode.textContent = flipper.getDisplayLabel();
    els.flipperMode.className = 'flipper-mode ' + flipper.getCurrentMode();
    nextRound();
  }

  // ── 处理回答 ──
  function handleAnswer(direction) {
    if (!isTraining || isPaused) return;
    pendingDirection = direction;
  }

  // ── 开始训练 ──
  function startTraining() {
    const config = getConfig();
    timer.stop();
    showScreen('training');
    applyTrainingScale();

    flipper.setDiopter(config.flipperDiopter);
    flipper.mode = 'positive';
    scorer.reset();

    els.flipperMode.textContent = flipper.getDisplayLabel();
    els.flipperMode.className = 'flipper-mode positive';
    els.btnPause.textContent = '暂停';
    pendingDirection = null;
    updateScoreboard();

    targetRow = 2;
    targetCol = 2;

    timer.onTick = (remaining) => {
      els.timerDisplay.textContent = '剩余时间: ' + timer.formatTime(remaining);
    };
    timer.onFlip = () => handleTimedFlip();
    timer.onComplete = () => finishTraining();

    timer.start(config.trainingDuration, config.flipInterval);

    buildGrid();
    isTraining = true;
    isPaused = false;

    bindKeyboard(onKeyAction);
    applyBgColor();
  }

  function applyBgColor() {
    const colors = getColors();
    document.body.style.background = colors.bg;
    document.body.style.color = colors.fg;
  }

  function finishTraining() {
    timer.stop();
    isTraining = false;
    isPaused = false;
    unbindKeyboard();
    pendingDirection = null;
    els.btnPause.textContent = '暂停';
    document.body.style.background = '';
    document.body.style.color = '';

    const config = getConfig();
    const data = {
      totalTime: timer.formatTime(timer.totalSeconds),
      totalScore: scorer.totalScore,
      accuracy: scorer.getAccuracy(),
      correctCount: scorer.correctCount,
      wrongCount: scorer.wrongCount,
      total: scorer.correctCount + scorer.wrongCount,
      positiveAccuracy: scorer.getPositiveAccuracy(),
      negativeAccuracy: scorer.getNegativeAccuracy(),
      totalFlips: Math.floor(timer.totalSeconds / config.flipInterval),
      skipCount: scorer.skipCount,
      rating: scorer.getRating(),
      diopter: config.flipperDiopter,
    };

    saveTrainingRecord(data);
    showReport(data);
    showScreen('start');
  }

  function pauseTraining() {
    if (!isTraining) return;
    isPaused = !isPaused;
    if (isPaused) {
      timer.pause();
      els.btnPause.textContent = '继续';
    } else {
      timer.resume();
      els.btnPause.textContent = '暂停';
    }
  }

  function exitTraining() {
    if (isTraining) {
      timer.stop();
      isTraining = false;
      isPaused = false;
      unbindKeyboard();
      pendingDirection = null;
      document.body.style.background = '';
      document.body.style.color = '';
      els.btnPause.textContent = '暂停';
    }
    showScreen('start');
  }

  // ── 键盘事件 ──
  function onKeyAction(action) {
    switch (action) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
        handleAnswer(action);
        break;
      case 'pause':
        pauseTraining();
        break;
      case 'redo':
        pendingDirection = null;
        nextRound();
        break;
      case 'cantSee':
        scorer.recordSkip();
        pendingDirection = null;
        nextRound();
        break;
      case 'exit':
        exitTraining();
        break;
    }
  }

  // ── 绑定事件 ──
  els.btnStart.addEventListener('click', startTraining);
  els.btnExit.addEventListener('click', exitTraining);
  els.btnPause.addEventListener('click', pauseTraining);
  els.btnRedo.addEventListener('click', () => {
    pendingDirection = null;
    nextRound();
  });
  els.btnCantSee.addEventListener('click', () => {
    scorer.recordSkip();
    pendingDirection = null;
    nextRound();
  });

  els.configToggle.addEventListener('click', toggleConfig);
  els.configClose.addEventListener('click', toggleConfig);
  els.configReset.addEventListener('click', () => {
    resetConfig();
    populateConfigPanel();
    if (screens.training.style.display !== 'none') {
      buildGrid();
      applyBgColor();
    }
  });

  $$('[data-config]').forEach(select => {
    select.addEventListener('change', () => {
      const configKey = select.dataset.config;
      setConfig(configKey, select.value);

      if (configKey === 'displayScalePercent') {
        applyTrainingScale();
      }

      if (screens.training.style.display !== 'none') {
        if (configKey === 'displayScalePercent' || configKey === 'stimulusSize' || configKey === 'stimulusType') {
          buildGrid();
        }
        if (configKey === 'bgColor') {
          applyBgColor();
        }
      }
    });
  });

  if (els.softKeyboard) {
    els.softKeyboard.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        onKeyAction(button.dataset.action);
      });
    });
  }

  els.calibrationSlider.addEventListener('input', () => {
    setCalibrationPreviewWidth(parseInt(els.calibrationSlider.value, 10));
  });
  els.calibrationSave.addEventListener('click', saveCalibration);

  if (els.reportClose) els.reportClose.addEventListener('click', hideReport);
  els.reportRetry.addEventListener('click', () => { hideReport(); startTraining(); });
  els.reportHistory.addEventListener('click', () => { hideReport(); showHistory(); });

  els.historyClose.addEventListener('click', hideHistory);
  els.historyClear.addEventListener('click', () => {
    clearHistory();
    els.historyDateFilter.value = '';
    els.historyDiopterFilter.value = 'all';
    renderHistory();
  });
  els.historyDateFilter.addEventListener('change', renderHistory);
  els.historyDiopterFilter.addEventListener('change', renderHistory);

  els.helpOpen.addEventListener('click', showHelp);
  els.helpClose.addEventListener('click', hideHelp);

  els.btnHistoryTop.addEventListener('click', showHistory);

  els.reportOverlay.addEventListener('click', (e) => { if (e.target === els.reportOverlay) hideReport(); });
  els.historyOverlay.addEventListener('click', (e) => { if (e.target === els.historyOverlay) hideHistory(); });
  els.helpOverlay.addEventListener('click', (e) => { if (e.target === els.helpOverlay) hideHelp(); });

  // 初始化配置面板
  function populateConfigPanel() {
    const config = getConfig();
    $$('#config-panel select[data-config]').forEach(select => {
      select.value = config[select.dataset.config];
    });
    applyTrainingScale();
    updateCalibrationPanel();
  }
  populateConfigPanel();

  // F11 全屏
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  });
})();
