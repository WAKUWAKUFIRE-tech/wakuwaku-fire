"use strict";

// RISK RUNNER is intentionally dependency-free so the folder can be uploaded to Cloudflare Pages as-is.

const CONFIG = Object.freeze({
  startingAsset: 1_000_000,
  exitLineAsset: 100_000,
  startingPriceMin: 960,
  startingPriceMax: 1_040,
  chartSampleSeconds: 0.055,
  resultDurationMs: 1_280,
  daysPerYear: 250,
  recordKey: "risk-runner-record-v1",
});

const elements = {
  startScreen: document.querySelector("#startScreen"),
  gameScreen: document.querySelector("#gameScreen"),
  gameOverScreen: document.querySelector("#gameOverScreen"),
  startButton: document.querySelector("#startButton"),
  retryButton: document.querySelector("#retryButton"),
  sellButton: document.querySelector("#sellButton"),
  assetValue: document.querySelector("#assetValue"),
  roundLabel: document.querySelector("#roundLabel"),
  survivalValue: document.querySelector("#survivalValue"),
  roundStartAsset: document.querySelector("#roundStartAsset"),
  accountStatus: document.querySelector("#accountStatus"),
  assetPanel: document.querySelector(".asset-panel"),
  assetMeterFill: document.querySelector("#assetMeterFill"),
  priceValue: document.querySelector("#priceValue"),
  marketMood: document.querySelector("#marketMood"),
  chartCaption: document.querySelector("#chartCaption"),
  chartTimer: document.querySelector("#chartTimer"),
  chartCanvas: document.querySelector("#chartCanvas"),
  chartFrame: document.querySelector("#chartFrame"),
  operatorScene: document.querySelector("#operatorScene"),
  operatorMood: document.querySelector("#operatorMood"),
  operatorSpeech: document.querySelector("#operatorSpeech"),
  eventAlert: document.querySelector("#eventAlert"),
  positionCard: document.querySelector(".position-card"),
  unrealizedValue: document.querySelector("#unrealizedValue"),
  unrealizedRate: document.querySelector("#unrealizedRate"),
  positionBarFill: document.querySelector("#positionBarFill"),
  tradeHint: document.querySelector("#tradeHint"),
  liveMessage: document.querySelector("#liveMessage"),
  roundResult: document.querySelector("#roundResult"),
  resultProfit: document.querySelector("#resultProfit"),
  resultAsset: document.querySelector("#resultAsset"),
  resultPrice: document.querySelector("#resultPrice"),
  resultReactionLabel: document.querySelector("#resultReactionLabel"),
  resultReaction: document.querySelector("#resultReaction"),
  startBestDays: document.querySelector("#startBestDays"),
  startBestAsset: document.querySelector("#startBestAsset"),
  gameOverCopy: document.querySelector("#gameOverCopy"),
  finalSurvival: document.querySelector("#finalSurvival"),
  finalAsset: document.querySelector("#finalAsset"),
  finalHighestAsset: document.querySelector("#finalHighestAsset"),
  finalMaxProfit: document.querySelector("#finalMaxProfit"),
  finalMaxLoss: document.querySelector("#finalMaxLoss"),
  finalAverageReaction: document.querySelector("#finalAverageReaction"),
  finalBestReaction: document.querySelector("#finalBestReaction"),
  finalTrades: document.querySelector("#finalTrades"),
};

const context = elements.chartCanvas.getContext("2d");
const screens = [elements.startScreen, elements.gameScreen, elements.gameOverScreen];

const state = {
  phase: "start",
  asset: CONFIG.startingAsset,
  roundStartAsset: CONFIG.startingAsset,
  entryPrice: 1_000,
  currentPrice: 1_000,
  shares: CONFIG.startingAsset / 1_000,
  day: 0,
  highestAsset: CONFIG.startingAsset,
  maxProfit: 0,
  maxLoss: 0,
  totalTrades: 0,
  reactionTimes: [],
  bestReaction: null,
  pattern: null,
  elapsedSeconds: 0,
  priceVelocity: 0,
  roundStartedAt: 0,
  crashStartedAt: null,
  chartHistory: [],
  lastFrameAt: 0,
  lastChartSampleAt: 0,
  animationId: null,
  nextRoundTimer: null,
  record: loadRecord(),
};

const phaseLabels = {
  opening: "初動を読む",
  warmup: "値動き観察",
  rise: "上昇の勢い",
  spike: "急騰",
  flat: "横ばい",
  fake: "一時調整",
  rebound: "再上昇",
  swing: "不安定",
  softfall: "じわじわ下落",
  crash: "急落開始",
  fall: "下落中",
  tail: "売り圧力",
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function choose(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value) {
  return Math.max(0, Math.round(value)).toLocaleString("ja-JP");
}

function formatYen(value) {
  return `${formatNumber(value)}円`;
}

function formatSignedYen(value) {
  const rounded = Math.round(value);
  const sign = rounded >= 0 ? "+" : "−";
  return `${sign}${Math.abs(rounded).toLocaleString("ja-JP")}円`;
}

function formatPrice(value) {
  return `¥${formatNumber(value)}`;
}

function formatRate(value) {
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function formatSeconds(milliseconds) {
  return `${(milliseconds / 1_000).toFixed(2)}秒`;
}

function formatSurvival(days) {
  const years = Math.floor(days / CONFIG.daysPerYear);
  const remainingDays = days % CONFIG.daysPerYear;
  return `${years}年 ${remainingDays}日`;
}

function safeReadRecord() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG.recordKey) || "null");
    if (!saved || typeof saved !== "object") return null;
    return {
      bestDays: Number.isFinite(saved.bestDays) ? Math.max(0, saved.bestDays) : 0,
      bestAsset: Number.isFinite(saved.bestAsset) ? Math.max(CONFIG.startingAsset, saved.bestAsset) : CONFIG.startingAsset,
    };
  } catch {
    return null;
  }
}

function loadRecord() {
  return safeReadRecord() || { bestDays: 0, bestAsset: CONFIG.startingAsset };
}

function saveRecord() {
  state.record.bestDays = Math.max(state.record.bestDays, state.day);
  state.record.bestAsset = Math.max(state.record.bestAsset, state.highestAsset, state.asset);
  try {
    localStorage.setItem(CONFIG.recordKey, JSON.stringify(state.record));
  } catch {
    // Private browsing can disable storage; the game still works without records.
  }
  updateRecordView();
}

function updateRecordView() {
  elements.startBestDays.textContent = formatSurvival(state.record.bestDays);
  elements.startBestAsset.textContent = formatYen(state.record.bestAsset);
}

function showScreen(target) {
  screens.forEach((screen) => {
    const isTarget = screen === target;
    screen.hidden = !isTarget;
    screen.classList.toggle("is-active", isTarget);
  });
  window.scrollTo({ top: 0, behavior: "auto" });
}

function getDifficulty(day) {
  return {
    // The first few days should already demand a decision; later days tighten gradually.
    speed: 1 + Math.min(0.52, day / 160),
    risk: 1.08 + Math.min(0.52, day / 180),
    volatility: 1.12 + Math.min(0.65, day / 145),
  };
}

function makePhase(type, seconds, drift, volatility, difficulty) {
  const duration = Number.isFinite(seconds) ? (seconds * 1_000) / difficulty.speed : Infinity;
  const driftBoost = type === "crash" || type === "fall" || type === "tail" ? difficulty.risk : 1;
  return {
    type,
    duration,
    drift: drift * driftBoost,
    volatility: volatility * difficulty.volatility,
  };
}

// Each pattern has a readable shape, but its timing and intensity are varied for every round.
function buildMarketPattern(day) {
  const difficulty = getDifficulty(day);
  // A red or flat opening is now common enough that the first decision is never free.
  const openingDrifts = [-0.034, -0.024, -0.012, -0.003, 0.004, 0.016, 0.025];
  const opening = makePhase("opening", randomBetween(0.55, 1.05), choose(openingDrifts), 0.009, difficulty);
  const crash = (drift = -0.16) => makePhase("crash", randomBetween(0.68, 1.12), drift, 0.018, difficulty);
  const fall = makePhase("fall", randomBetween(2.6, 4.1), -0.095, 0.014, difficulty);
  const tail = makePhase("tail", Infinity, -0.6, 0.01, difficulty);
  const patternIndex = randomInt(0, 5);
  let phases;

  switch (patternIndex) {
    case 0:
      // A: steady climb followed by a sharp break.
      phases = [
        opening,
        makePhase("rise", randomBetween(1.45, 2.3), 0.023, 0.006, difficulty),
        makePhase("rise", randomBetween(0.8, 1.6), 0.014, 0.0065, difficulty),
        crash(-0.145),
        fall,
        tail,
      ];
      break;
    case 1:
      // B: a tempting spike, pause, and a sharper fall.
      phases = [
        opening,
        makePhase("spike", randomBetween(0.75, 1.2), 0.088, 0.009, difficulty),
        makePhase("flat", randomBetween(0.85, 1.5), 0.001, 0.0055, difficulty),
        makePhase("flat", randomBetween(0.5, 1.1), -0.004, 0.006, difficulty),
        crash(-0.17),
        fall,
        tail,
      ];
      break;
    case 2:
      // C: the first dip is a fakeout; the real break comes later.
      phases = [
        opening,
        makePhase("rise", randomBetween(1.1, 1.8), 0.025, 0.006, difficulty),
        makePhase("fake", randomBetween(0.3, 0.55), -0.064, 0.009, difficulty),
        makePhase("rebound", randomBetween(1.0, 1.8), 0.035, 0.007, difficulty),
        makePhase("rise", randomBetween(0.8, 1.5), 0.016, 0.006, difficulty),
        crash(-0.145),
        fall,
        tail,
      ];
      break;
    case 3:
      // D: a long climb that makes waiting feel rational.
      phases = [
        opening,
        makePhase("rise", randomBetween(1.7, 2.5), 0.017, 0.0055, difficulty),
        makePhase("rise", randomBetween(1.45, 2.25), 0.022, 0.006, difficulty),
        makePhase("rise", randomBetween(1.2, 2.0), 0.012, 0.0065, difficulty),
        makePhase("rise", randomBetween(0.8, 1.6), 0.024, 0.007, difficulty),
        crash(-0.138),
        fall,
        tail,
      ];
      break;
    case 4:
      // E: a restless market with several opposing swings before the break.
      phases = [
        opening,
        makePhase("swing", randomBetween(0.65, 1.1), 0.043, 0.011, difficulty),
        makePhase("swing", randomBetween(0.6, 1.05), -0.041, 0.012, difficulty),
        makePhase("swing", randomBetween(0.75, 1.25), 0.034, 0.011, difficulty),
        makePhase("swing", randomBetween(0.6, 1.05), -0.051, 0.013, difficulty),
        makePhase("swing", randomBetween(0.85, 1.5), 0.025, 0.01, difficulty),
        crash(-0.15),
        fall,
        tail,
      ];
      break;
    default:
      // F: a slow leak of confidence before the sudden drop.
      phases = [
        opening,
        makePhase("softfall", randomBetween(1.25, 2.15), -0.018, 0.007, difficulty),
        makePhase("softfall", randomBetween(0.9, 1.7), -0.029, 0.008, difficulty),
        makePhase("rebound", randomBetween(0.5, 0.95), 0.014, 0.009, difficulty),
        makePhase("softfall", randomBetween(0.65, 1.15), -0.039, 0.01, difficulty),
        crash(-0.153),
        fall,
        tail,
      ];
      break;
  }

  return { phases, patternIndex };
}

function getCurrentPhase() {
  let elapsed = 0;
  for (let index = 0; index < state.pattern.phases.length; index += 1) {
    const phase = state.pattern.phases[index];
    const phaseSeconds = phase.duration / 1_000;
    if (state.elapsedSeconds < elapsed + phaseSeconds || index === state.pattern.phases.length - 1) {
      return { phase, index, phaseElapsed: state.elapsedSeconds - elapsed };
    }
    elapsed += phaseSeconds;
  }
  return { phase: state.pattern.phases.at(-1), index: state.pattern.phases.length - 1, phaseElapsed: 0 };
}

function calculateEquity() {
  return Math.max(0, state.roundStartAsset + state.shares * (state.currentPrice - state.entryPrice));
}

function updateAssetStats(equity) {
  state.asset = equity;
  state.highestAsset = Math.max(state.highestAsset, equity);
}

function updateOperatorMood(unrealized, rate, crashActive) {
  const mode = crashActive || unrealized < 0 ? "loss" : rate > 0.1 ? "profit" : "neutral";
  elements.operatorScene.classList.toggle("is-loss", mode === "loss");
  elements.operatorScene.classList.toggle("is-profit", mode === "profit");
  elements.operatorScene.classList.toggle("is-neutral", mode === "neutral");

  if (mode === "loss") {
    elements.operatorMood.textContent = "PANIC MODE";
    elements.operatorSpeech.textContent = "まずい…！";
  } else if (mode === "profit") {
    elements.operatorMood.textContent = "GOOD VIBES";
    elements.operatorSpeech.textContent = rate > 4 ? "まだいける？" : "いい感じ";
  } else {
    elements.operatorMood.textContent = "WATCH MODE";
    elements.operatorSpeech.textContent = "見極め中…";
  }
}

function updateHUD(phase) {
  const equity = calculateEquity();
  const unrealized = equity - state.roundStartAsset;
  const rate = state.roundStartAsset > 0 ? (unrealized / state.roundStartAsset) * 100 : 0;
  const isLoss = unrealized < 0;

  updateAssetStats(equity);
  updateOperatorMood(unrealized, rate, state.crashStartedAt !== null);
  elements.assetValue.textContent = formatYen(equity);
  elements.roundLabel.textContent = String(state.day + 1).padStart(3, "0");
  elements.survivalValue.textContent = formatSurvival(state.day);
  elements.roundStartAsset.textContent = formatYen(state.roundStartAsset);
  elements.priceValue.textContent = formatPrice(state.currentPrice);
  elements.unrealizedValue.textContent = formatSignedYen(unrealized);
  elements.unrealizedRate.textContent = formatRate(rate);
  elements.marketMood.textContent = phaseLabels[phase.type] || "値動き観察";
  elements.chartTimer.textContent = `${state.elapsedSeconds.toFixed(1).padStart(4, "0")}s`;

  elements.assetPanel.classList.toggle("is-profit", !isLoss && Math.abs(unrealized) > 1);
  elements.assetPanel.classList.toggle("is-loss", isLoss);
  elements.positionCard.classList.toggle("is-loss", isLoss);
  elements.accountStatus.textContent = state.crashStartedAt ? "急落警戒" : "保有中";

  const meterWidth = clamp(30 + rate * 1.7, 6, 100);
  elements.assetMeterFill.style.width = `${meterWidth}%`;
  elements.assetMeterFill.style.background = isLoss
    ? "linear-gradient(90deg, #ff706b, #d94d58)"
    : "linear-gradient(90deg, #6edbff, #b8ff62)";

  const positionWidth = clamp(50 + rate * 2.8, 3, 97);
  elements.positionBarFill.style.width = `${positionWidth}%`;
  elements.positionBarFill.style.background = isLoss ? "var(--red)" : "var(--lime)";

  if (state.crashStartedAt) {
    elements.tradeHint.textContent = "急落中。反応して売却";
    elements.liveMessage.textContent = "急落開始。いま押せば反応速度を記録。";
    elements.chartCaption.textContent = "急落を検知";
    elements.sellButton.classList.add("is-warning");
  } else if (phase.type === "fake") {
    elements.tradeHint.textContent = "一瞬の下落。これはダマシか？";
    elements.liveMessage.textContent = "小さな下落では反応速度は始まらない。";
    elements.chartCaption.textContent = "一時調整を検知";
    elements.sellButton.classList.remove("is-warning");
  } else if (isLoss) {
    elements.tradeHint.textContent = "含み損。戻りを待つか、損切り";
    elements.liveMessage.textContent = "小さな下落で慌てない。崩れたら逃げる。";
    elements.chartCaption.textContent = "下落の強さを読む";
    elements.sellButton.classList.remove("is-warning");
  } else if (rate > 4) {
    elements.tradeHint.textContent = "利益は伸びている。欲張り注意";
    elements.liveMessage.textContent = "まだ上がる？ それとも、ここで利確？";
    elements.chartCaption.textContent = "利益を引っ張る";
    elements.sellButton.classList.remove("is-warning");
  } else {
    elements.tradeHint.textContent = "上昇か下落かを見極める";
    elements.liveMessage.textContent = "利益を伸ばすか、先に逃げるか。";
    elements.chartCaption.textContent = "チャートは止まらない";
    elements.sellButton.classList.remove("is-warning");
  }
}

function triggerCrash(timestamp) {
  state.crashStartedAt = timestamp;
  elements.eventAlert.hidden = false;
  elements.chartFrame.classList.add("is-crash");
  window.setTimeout(() => elements.chartFrame.classList.remove("is-crash"), 520);
}

function appendChartSample() {
  state.chartHistory.push(state.currentPrice);
  if (state.chartHistory.length > 108) state.chartHistory.shift();
}

function resizeChart() {
  const rect = elements.chartCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  elements.chartCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
  elements.chartCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawChart();
}

function drawChart() {
  const width = elements.chartCanvas.clientWidth;
  const height = elements.chartCanvas.clientHeight;
  if (!width || !height) return;

  context.clearRect(0, 0, width, height);
  const values = state.chartHistory.length ? [...state.chartHistory, state.currentPrice] : [state.currentPrice];
  const floor = Math.min(state.entryPrice, ...values);
  const ceiling = Math.max(state.entryPrice, ...values);
  const paddingTop = 33;
  const paddingBottom = 22;
  const range = Math.max(8, ceiling - floor);
  const minValue = Math.max(0, floor - range * 0.16);
  const maxValue = ceiling + range * 0.16;
  const chartHeight = height - paddingTop - paddingBottom;

  const yFor = (value) => paddingTop + ((maxValue - value) / Math.max(1, maxValue - minValue)) * chartHeight;
  const xFor = (index) => (index / Math.max(1, values.length - 1)) * width;
  const entryY = yFor(state.entryPrice);
  const isLoss = state.currentPrice < state.entryPrice;
  const lineColor = state.crashStartedAt || isLoss ? "#ff706b" : "#b8ff62";

  context.save();
  context.setLineDash([5, 5]);
  context.strokeStyle = "rgba(160, 181, 216, 0.28)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, entryY);
  context.lineTo(width, entryY);
  context.stroke();
  context.restore();

  context.beginPath();
  values.forEach((value, index) => {
    const x = xFor(index);
    const y = yFor(value);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.lineTo(width, height - paddingBottom);
  context.lineTo(0, height - paddingBottom);
  context.closePath();
  const area = context.createLinearGradient(0, paddingTop, 0, height);
  area.addColorStop(0, state.crashStartedAt || isLoss ? "rgba(255, 112, 107, 0.24)" : "rgba(184, 255, 98, 0.2)");
  area.addColorStop(1, "rgba(10, 20, 33, 0)");
  context.fillStyle = area;
  context.fill();

  context.beginPath();
  values.forEach((value, index) => {
    const x = xFor(index);
    const y = yFor(value);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.lineJoin = "round";
  context.lineCap = "round";
  context.lineWidth = state.crashStartedAt ? 3 : 2.3;
  context.strokeStyle = lineColor;
  context.shadowColor = lineColor;
  context.shadowBlur = state.crashStartedAt ? 13 : 8;
  context.stroke();
  context.shadowBlur = 0;

  const currentX = width;
  const currentY = yFor(state.currentPrice);
  context.beginPath();
  context.arc(currentX - 1, currentY, 4, 0, Math.PI * 2);
  context.fillStyle = lineColor;
  context.fill();
  context.beginPath();
  context.arc(currentX - 1, currentY, 8, 0, Math.PI * 2);
  context.strokeStyle = state.crashStartedAt ? "rgba(255, 112, 107, 0.28)" : "rgba(184, 255, 98, 0.25)";
  context.lineWidth = 1;
  context.stroke();
}

function animate(timestamp) {
  if (state.phase !== "playing") return;

  if (!state.lastFrameAt) state.lastFrameAt = timestamp;
  const deltaSeconds = clamp((timestamp - state.lastFrameAt) / 1_000, 0, 0.08);
  state.lastFrameAt = timestamp;
  state.elapsedSeconds = (timestamp - state.roundStartedAt) / 1_000;

  const { phase } = getCurrentPhase();
  if (phase.type === "crash" && state.crashStartedAt === null) triggerCrash(timestamp);

  const response = phase.type === "crash" ? 8 : phase.type === "fake" ? 5 : 3;
  const desiredVelocity = state.currentPrice * phase.drift;
  state.priceVelocity += (desiredVelocity - state.priceVelocity) * Math.min(1, deltaSeconds * response);
  const noise = (Math.random() - 0.5) * phase.volatility * Math.sqrt(Math.max(deltaSeconds, 0.001)) * state.currentPrice;
  state.currentPrice = Math.max(0, state.currentPrice + state.priceVelocity * deltaSeconds + noise);

  if (state.elapsedSeconds - state.lastChartSampleAt >= CONFIG.chartSampleSeconds) {
    appendChartSample();
    state.lastChartSampleAt = state.elapsedSeconds;
  }

  const equity = calculateEquity();
  updateHUD(phase);
  drawChart();

  // Treat the clearly stated 10万円 exit line as the bankruptcy threshold.
  if (equity <= CONFIG.exitLineAsset || state.currentPrice <= 0.5) {
    state.asset = equity;
    endGame("資産が10万円以下になりました。ここで退場です。");
    return;
  }

  state.animationId = window.requestAnimationFrame(animate);
}

function cancelAnimation() {
  if (state.animationId !== null) {
    window.cancelAnimationFrame(state.animationId);
    state.animationId = null;
  }
}

function resetRoundValues() {
  state.roundStartAsset = state.asset;
  state.entryPrice = randomBetween(CONFIG.startingPriceMin, CONFIG.startingPriceMax);
  state.currentPrice = state.entryPrice;
  state.shares = state.roundStartAsset / state.entryPrice;
  state.pattern = buildMarketPattern(state.day);
  state.elapsedSeconds = 0;
  state.priceVelocity = 0;
  state.roundStartedAt = performance.now();
  state.crashStartedAt = null;
  state.lastFrameAt = 0;
  state.lastChartSampleAt = 0;
  state.chartHistory = Array.from({ length: 48 }, (_, index) => {
    const slope = (index - 47) * 0.00003;
    return state.entryPrice * (1 + slope);
  });
}

function beginRound() {
  window.clearTimeout(state.nextRoundTimer);
  cancelAnimation();
  elements.roundResult.hidden = true;
  elements.eventAlert.hidden = true;
  elements.chartFrame.classList.remove("is-crash");
  elements.sellButton.disabled = false;
  elements.sellButton.classList.remove("is-warning");
  state.phase = "playing";
  resetRoundValues();
  showScreen(elements.gameScreen);
  resizeChart();
  updateHUD({ type: "warmup" });
  drawChart();
  state.animationId = window.requestAnimationFrame(animate);
}

function startGame() {
  window.clearTimeout(state.nextRoundTimer);
  cancelAnimation();
  state.phase = "start";
  state.asset = CONFIG.startingAsset;
  state.roundStartAsset = CONFIG.startingAsset;
  state.day = 0;
  state.highestAsset = CONFIG.startingAsset;
  state.maxProfit = 0;
  state.maxLoss = 0;
  state.totalTrades = 0;
  state.reactionTimes = [];
  state.bestReaction = null;
  beginRound();
}

function finishRound() {
  if (state.phase !== "playing") return;

  const sellTimestamp = performance.now();
  const soldPrice = state.currentPrice;
  const soldAsset = calculateEquity();
  const profit = soldAsset - state.roundStartAsset;
  const reactionTime = state.crashStartedAt === null ? null : Math.max(0, sellTimestamp - state.crashStartedAt);

  cancelAnimation();
  state.phase = "result";
  state.asset = soldAsset;
  state.day += 1;
  state.totalTrades += 1;
  state.maxProfit = Math.max(state.maxProfit, profit);
  state.maxLoss = Math.min(state.maxLoss, profit);
  if (reactionTime !== null) {
    state.reactionTimes.push(reactionTime);
    state.bestReaction = state.bestReaction === null ? reactionTime : Math.min(state.bestReaction, reactionTime);
  }
  state.highestAsset = Math.max(state.highestAsset, soldAsset);
  saveRecord();

  elements.sellButton.disabled = true;
  elements.sellButton.classList.remove("is-warning");
  elements.eventAlert.hidden = true;
  elements.chartFrame.classList.remove("is-crash");
  elements.accountStatus.textContent = "決済完了";
  elements.roundResult.hidden = false;
  elements.resultProfit.textContent = formatSignedYen(profit);
  elements.resultAsset.textContent = formatYen(soldAsset);
  elements.resultPrice.textContent = formatPrice(soldPrice);
  elements.resultReactionLabel.textContent = reactionTime === null ? "判定" : "反応速度";
  elements.resultReaction.textContent = reactionTime === null ? "急落前に利確" : formatSeconds(reactionTime);
  elements.resultProfit.parentElement.classList.toggle("is-loss", profit < 0);
  elements.liveMessage.textContent = reactionTime === null ? "急落前に決済。次の営業日へ。" : `急落から${formatSeconds(reactionTime)}で決済。`;

  state.nextRoundTimer = window.setTimeout(() => {
    if (state.asset <= CONFIG.exitLineAsset) {
      endGame("資産が10万円以下になりました。次は、もう少し早く逃げよう。");
    } else {
      beginRound();
    }
  }, CONFIG.resultDurationMs);
}

function endGame(message) {
  window.clearTimeout(state.nextRoundTimer);
  cancelAnimation();
  state.phase = "gameover";
  state.asset = Math.max(0, state.asset);
  elements.eventAlert.hidden = true;
  elements.roundResult.hidden = true;
  elements.gameOverCopy.textContent = message;
  elements.finalSurvival.textContent = formatSurvival(state.day);
  elements.finalAsset.textContent = formatYen(state.asset);
  elements.finalHighestAsset.textContent = formatYen(state.highestAsset);
  elements.finalMaxProfit.textContent = formatSignedYen(state.maxProfit);
  elements.finalMaxLoss.textContent = state.maxLoss === 0 ? "0円" : formatSignedYen(state.maxLoss);
  elements.finalAverageReaction.textContent = state.reactionTimes.length
    ? formatSeconds(state.reactionTimes.reduce((sum, value) => sum + value, 0) / state.reactionTimes.length)
    : "—";
  elements.finalBestReaction.textContent = state.bestReaction === null ? "—" : formatSeconds(state.bestReaction);
  elements.finalTrades.textContent = `${state.totalTrades.toLocaleString("ja-JP")}回`;
  saveRecord();
  showScreen(elements.gameOverScreen);
}

function handlePointerSell(event) {
  event.preventDefault();
  finishRound();
}

elements.startButton.addEventListener("click", startGame);
elements.retryButton.addEventListener("click", startGame);
elements.sellButton.addEventListener("pointerdown", handlePointerSell, { passive: false });
elements.sellButton.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    finishRound();
  }
});

window.addEventListener("resize", resizeChart, { passive: true });

updateRecordView();
