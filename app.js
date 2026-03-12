const instrumentPresets = {
  MNQ: { tickSize: 0.25, tickValue: 0.5, pointValue: 2 },
  NQ: { tickSize: 0.25, tickValue: 5, pointValue: 20 },
  MES: { tickSize: 0.25, tickValue: 1.25, pointValue: 5 },
  ES: { tickSize: 0.25, tickValue: 12.5, pointValue: 50 },
  CL: { tickSize: 0.01, tickValue: 10, pointValue: 1000 },
  CUSTOM: { tickSize: 0.25, tickValue: 1, pointValue: 4 }
};

const state = {
  propFirm: "Apex",
  instrument: "MNQ",
  startingBalance: 50000,
  currentBalance: 50000,
  highestBalance: 50000,
  dailyLossLimit: 2000,
  trailingDrawdown: 2500,
  maxRiskPercent: 1,
  tradesToday: 0,
  lossesInRow: 0,
  tradeResults: [],
  balanceHistory: [50000],
  sessions: {
    London: { trades: 0, pnl: 0 },
    "New York": { trades: 0, pnl: 0 },
    Asia: { trades: 0, pnl: 0 }
  },
  lastCalculation: {
    riskPerTrade: 0,
    suggestedContracts: 0,
    dailyImpact: 0,
    drawdownImpact: 0
  }
};

const $ = (id) => document.getElementById(id);

const els = {
  settingsForm: $("settingsForm"),
  riskForm: $("riskForm"),
  quickMode: $("quickMode"),
  tpRow: $("tpRow"),

  statusBanner: $("statusBanner"),
  statusBannerCopy: $("statusBannerCopy"),
  heatFill: $("heatFill"),
  heatLabel: $("heatLabel"),

  dailyRiskUsed: $("dailyRiskUsed"),
  drawdownRemaining: $("drawdownRemaining"),
  tradesToday: $("tradesToday"),
  currentBalance: $("currentBalance"),
  consistencyScore: $("consistencyScore"),
  survivalScore: $("survivalScore"),

  tradeMessage: $("tradeMessage"),
  behaviorBox: $("behaviorBox"),
  behaviorTitle: $("behaviorTitle"),
  behaviorCopy: $("behaviorCopy"),
  consistencyFill: $("consistencyFill"),
  survivalFill: $("survivalFill"),
  consistencyScoreMini: $("consistencyScoreMini"),
  survivalScoreMini: $("survivalScoreMini"),

  suggestedSize: $("suggestedSize"),
  riskPerTradeOut: $("riskPerTradeOut"),
  rrOut: $("rrOut"),
  dailyImpactOut: $("dailyImpactOut"),
  pointsOut: $("pointsOut"),
  ticksOut: $("ticksOut"),
  riskPerContractOut: $("riskPerContractOut"),
  riskImpactDailyOut: $("riskImpactDailyOut"),
  riskImpactDrawdownOut: $("riskImpactDrawdownOut"),
  riskLimitOut: $("riskLimitOut"),

  ruleGuardBox: $("ruleGuardBox"),
  ruleGuardTitle: $("ruleGuardTitle"),
  ruleGuardCopy: $("ruleGuardCopy"),

  sessionLondon: $("sessionLondon"),
  sessionNewYork: $("sessionNewYork"),
  sessionAsia: $("sessionAsia"),
  drawdownRemainingLarge: $("drawdownRemainingLarge"),
  distanceFromPeak: $("distanceFromPeak"),
  highestBalanceOut: $("highestBalanceOut"),
  currentBalanceOut: $("currentBalanceOut"),
  drawdownFromPeakOut: $("drawdownFromPeakOut"),

  focusToggle: $("focusToggle"),
  focusOverlay: $("focusOverlay"),
  focusClose: $("focusClose"),
  focusStatus: $("focusStatus"),
  focusDailyRisk: $("focusDailyRisk"),
  focusDrawdown: $("focusDrawdown"),
  focusHeatFill: $("focusHeatFill"),
  focusHeatLabel: $("focusHeatLabel"),

  equityCanvas: $("equityCanvas"),

  propFirm: $("propFirm"),
  instrument: $("instrument"),
  startingBalanceInput: $("startingBalanceInput"),
  currentBalanceInput: $("currentBalanceInput"),
  highestBalanceInput: $("highestBalanceInput"),
  dailyLossLimitInput: $("dailyLossLimitInput"),
  trailingDrawdownInput: $("trailingDrawdownInput"),
  maxRiskPercentInput: $("maxRiskPercentInput"),

  entryInput: $("entryInput"),
  stopInput: $("stopInput"),
  takeProfitInput: $("takeProfitInput"),
  manualContractsInput: $("manualContractsInput"),

  tradePnl: $("tradePnl"),
  tradeSession: $("tradeSession")
};

function setText(el, value) {
  if (el) el.textContent = value;
}

function setWidth(el, value) {
  if (el) el.style.width = value;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function drawdownLimitLine() {
  return state.highestBalance - state.trailingDrawdown;
}

function trailingDrawdownRemaining() {
  return Math.max(0, state.currentBalance - drawdownLimitLine());
}

function dailyRiskUsedPercent() {
  const todaysLoss =
    state.startingBalance <= state.currentBalance
      ? 0
      : state.startingBalance - state.currentBalance;

  return clamp((todaysLoss / Math.max(state.dailyLossLimit, 1)) * 100, 0, 100);
}

function computeConsistency() {
  let score = 100;
  score -= clamp(dailyRiskUsedPercent() * 0.3, 0, 35);
  score -= state.lossesInRow * 8;
  score -= Math.max(0, state.tradesToday - 4) * 3;

  if (state.lastCalculation.riskPerTrade > state.currentBalance * (state.maxRiskPercent / 100)) {
    score -= 12;
  }

  if (state.lastCalculation.dailyImpact > 30) {
    score -= 8;
  }

  if (state.lossesInRow >= 3 && state.lastCalculation.dailyImpact > 10) {
    score -= 10;
  }

  return clamp(Math.round(score), 25, 99);
}

function computeSurvival(consistency) {
  let score = consistency;
  score -= clamp(dailyRiskUsedPercent() * 0.2, 0, 20);

  if (trailingDrawdownRemaining() < state.trailingDrawdown * 0.2) {
    score -= 18;
  } else if (trailingDrawdownRemaining() < state.trailingDrawdown * 0.4) {
    score -= 8;
  }

  score -= state.lossesInRow * 3;
  return clamp(Math.round(score), 15, 99);
}

function riskHeatValue(consistency, survival) {
  const v = clamp(
    dailyRiskUsedPercent() * 0.5 +
      (100 - consistency) * 0.3 +
      (100 - survival) * 0.2,
    0,
    100
  );

  return Math.round(v);
}

function statusFromMetrics(consistency, survival) {
  const daily = dailyRiskUsedPercent();
  const drawdownLeft = trailingDrawdownRemaining();

  if (
    daily >= 90 ||
    drawdownLeft <= state.trailingDrawdown * 0.12 ||
    consistency < 60 ||
    survival < 55
  ) {
    return "STOP TRADING";
  }

  if (
    daily >= 60 ||
    drawdownLeft <= state.trailingDrawdown * 0.35 ||
    consistency < 78 ||
    survival < 72
  ) {
    return "CAUTION";
  }

  return "SAFE";
}

function setStatusClasses(el, status) {
  if (!el) return;
  el.classList.remove("safe", "caution", "stop");
  el.classList.add(
    status === "SAFE" ? "safe" : status === "CAUTION" ? "caution" : "stop"
  );
}

function updateTrafficLights(status) {
  document.querySelectorAll(".traffic-lights .light").forEach((l) => {
    l.classList.remove("active");
  });

  const target =
    status === "SAFE"
      ? ".light.green"
      : status === "CAUTION"
      ? ".light.yellow"
      : ".light.red";

  document.querySelector(target)?.classList.add("active");
}

function currentStatusCopy(status) {
  if (status === "SAFE") {
    return "You are trading within your current funded-account risk limits.";
  }

  if (status === "CAUTION") {
    return "Risk is increasing. Trade smaller or be highly selective.";
  }

  return "You are close to violating prop firm rules. Consider stopping today.";
}

function updateBehavior(consistency, survival) {
  let title = "Behavior stable";
  let copy = "No revenge-trading pattern detected.";
  let cls = "behavior safe-box";

  if (state.lossesInRow >= 3 && state.lastCalculation.dailyImpact > 10) {
    title = "Revenge trading pattern detected";
    copy = "You increased exposure after consecutive losses. High danger behavior.";
    cls = "behavior danger-box";
  } else if (dailyRiskUsedPercent() >= 60 || state.lossesInRow >= 2) {
    title = "Risk behavior increasing";
    copy = "You are stacking pressure on the account. Slow down and protect the funded balance.";
    cls = "behavior warning-box";
  }

  if (els.behaviorBox) els.behaviorBox.className = cls;
  setText(els.behaviorTitle, title);
  setText(els.behaviorCopy, copy);
  setWidth(els.consistencyFill, `${consistency}%`);
  setWidth(els.survivalFill, `${survival}%`);
  setText(els.consistencyScoreMini, consistency);
  setText(els.survivalScoreMini, `${survival}%`);
}

function updateRuleGuard() {
  const drawImpact = state.lastCalculation.drawdownImpact;
  const dailyImpact = state.lastCalculation.dailyImpact;
  const riskCap = state.currentBalance * (state.maxRiskPercent / 100);

  let title = "Rule safe";
  let copy = "This trade is within your current prop firm risk limits.";
  let cls = "behavior safe-box";
  let riskLimitText = "Safe";

  if (
    state.lastCalculation.riskPerTrade > riskCap ||
    dailyImpact >= 40 ||
    drawImpact >= 35
  ) {
    title = "Rule violation warning";
    copy = "This trade may break a prop firm rule or push the account too close to danger.";
    cls = "behavior danger-box";
    riskLimitText = "Exceeded";
  } else if (dailyImpact >= 20 || drawImpact >= 18) {
    title = "Rule caution";
    copy = "This trade uses a meaningful part of your available account risk.";
    cls = "behavior warning-box";
    riskLimitText = "Caution";
  }

  if (els.ruleGuardBox) els.ruleGuardBox.className = cls;
  setText(els.ruleGuardTitle, title);
  setText(els.ruleGuardCopy, copy);
  setText(els.riskLimitOut, riskLimitText);
}

function renderSessions() {
  const fmt = (s) => `${s.trades} trades | ${formatMoney(s.pnl)}`;
  setText(els.sessionLondon, fmt(state.sessions["London"]));
  setText(els.sessionNewYork, fmt(state.sessions["New York"]));
  setText(els.sessionAsia, fmt(state.sessions["Asia"]));
}

function renderChart() {
  const canvas = els.equityCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;

  canvas.width = rect.width * dpr;
  canvas.height = 260 * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = 260;

  ctx.clearRect(0, 0, width, height);

  const data =
    state.balanceHistory && state.balanceHistory.length
      ? state.balanceHistory
      : [state.currentBalance];

  const min = Math.min(...data, drawdownLimitLine()) - 100;
  const max = Math.max(...data, state.highestBalance) + 100;

  const padding = { left: 18, right: 18, top: 18, bottom: 24 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;

  for (let i = 0; i < 4; i++) {
    const y = padding.top + (innerH / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  const ddY =
    padding.top + (1 - (drawdownLimitLine() - min) / (max - min)) * innerH;

  ctx.strokeStyle = "rgba(239,92,92,0.6)";
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(padding.left, ddY);
  ctx.lineTo(width - padding.right, ddY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  data.forEach((value, i) => {
    const x = padding.left + (i / Math.max(1, data.length - 1)) * innerW;
    const y =
      padding.top + (1 - (value - min) / (max - min)) * innerH;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#1e6bff";
  ctx.lineWidth = 3;
  ctx.stroke();

  const last = data[data.length - 1];
  const x = padding.left + (data.length === 1 ? 0 : innerW);
  const y =
    padding.top + (1 - (last - min) / (max - min)) * innerH;

  ctx.fillStyle = "#23c16b";
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function render() {
  const consistency = computeConsistency();
  const survival = computeSurvival(consistency);
  const status = statusFromMetrics(consistency, survival);
  const drawdownLeft = trailingDrawdownRemaining();
  const dailyUsed = Math.round(dailyRiskUsedPercent());
  const heat = riskHeatValue(consistency, survival);
  const statusCopy = currentStatusCopy(status);

  setText(els.statusBanner, status);
  setText(els.focusStatus, status);

  setStatusClasses(els.statusBanner, status);
  setStatusClasses(els.focusStatus, status);

  setText(els.statusBannerCopy, statusCopy);
  updateTrafficLights(status);

  const heatLabel = heat < 34 ? "SAFE" : heat < 67 ? "MODERATE" : "HIGH";
  setWidth(els.heatFill, `${heat}%`);
  setWidth(els.focusHeatFill, `${heat}%`);
  setText(els.heatLabel, heatLabel);
  setText(els.focusHeatLabel, heatLabel);

  setText(els.dailyRiskUsed, `${dailyUsed}%`);
  setText(els.drawdownRemaining, formatMoney(drawdownLeft));
  setText(els.drawdownRemainingLarge, formatMoney(drawdownLeft));
  setText(els.tradesToday, state.tradesToday);
  setText(els.currentBalance, formatMoney(state.currentBalance));
  setText(els.consistencyScore, `${consistency} / 100`);
  setText(els.survivalScore, `${survival}%`);

  setText(els.focusDailyRisk, `${dailyUsed}%`);
  setText(els.focusDrawdown, formatMoney(drawdownLeft));

  setText(els.highestBalanceOut, formatMoney(state.highestBalance));
  setText(els.currentBalanceOut, formatMoney(state.currentBalance));
  setText(
    els.drawdownFromPeakOut,
    formatMoney(state.currentBalance - state.highestBalance)
  );
  setText(
    els.distanceFromPeak,
    formatMoney(state.currentBalance - state.highestBalance)
  );

  updateBehavior(consistency, survival);
  updateRuleGuard();
  renderSessions();
  renderChart();
}

function calculateTrade() {
  const instrument = els.instrument?.value || state.instrument;
  const preset = instrumentPresets[instrument] || instrumentPresets.MNQ;

  const entry = parseFloat(els.entryInput?.value || "0");
  const stop = parseFloat(els.stopInput?.value || "0");
  const tp = parseFloat(els.takeProfitInput?.value || "0");
  const manualContracts = parseFloat(els.manualContractsInput?.value || "0");

  const pointDistance = Math.abs(entry - stop);
  const ticks = preset.tickSize > 0 ? pointDistance / preset.tickSize : 0;
  const riskPerContract = ticks * preset.tickValue;
  const suggestedRiskCap = state.currentBalance * (state.maxRiskPercent / 100);

  const suggestedContracts =
    riskPerContract > 0
      ? Math.max(1, Math.floor(suggestedRiskCap / riskPerContract))
      : 0;

  const contracts = manualContracts > 0 ? manualContracts : suggestedContracts;
  const riskPerTrade = riskPerContract * contracts;
  const rewardDistance = Math.abs(tp - entry);

  const rr =
    pointDistance > 0 && !els.quickMode?.checked
      ? rewardDistance / pointDistance
      : 0;

  const dailyImpact =
    state.dailyLossLimit > 0
      ? (riskPerTrade / state.dailyLossLimit) * 100
      : 0;

  const drawdownImpact =
    state.trailingDrawdown > 0
      ? (riskPerTrade / state.trailingDrawdown) * 100
      : 0;

  state.lastCalculation = {
    riskPerTrade,
    suggestedContracts,
    dailyImpact,
    drawdownImpact
  };

  setText(
    els.suggestedSize,
    `${contracts || 0} contract${contracts === 1 ? "" : "s"}`
  );
  setText(els.riskPerTradeOut, formatMoney(riskPerTrade));
  setText(
    els.rrOut,
    els.quickMode?.checked ? "Quick mode" : `1 : ${rr.toFixed(2)}`
  );
  setText(els.dailyImpactOut, `${dailyImpact.toFixed(1)}%`);

  setText(els.pointsOut, pointDistance.toFixed(2));
  setText(els.ticksOut, ticks.toFixed(0));
  setText(els.riskPerContractOut, formatMoney(riskPerContract));
  setText(els.riskImpactDailyOut, `${dailyImpact.toFixed(1)}%`);
  setText(els.riskImpactDrawdownOut, `${drawdownImpact.toFixed(1)}%`);

  render();
}

function rebuildFromTrades(trades = []) {
  state.tradeResults = [];
  state.balanceHistory = [state.startingBalance];
  state.tradesToday = 0;
  state.lossesInRow = 0;
  state.sessions = {
    London: { trades: 0, pnl: 0 },
    "New York": { trades: 0, pnl: 0 },
    Asia: { trades: 0, pnl: 0 }
  };

  let runningBalance = state.startingBalance;
  let highest = state.highestBalance || state.startingBalance;
  let lossesInRow = 0;

  trades.forEach((trade) => {
    const result = trade.result || "be";
    const pnl = Number(trade.pnl || 0);
    const session = trade.session || "New York";

    state.tradesToday += 1;
    runningBalance += pnl;
    highest = Math.max(highest, runningBalance);
    state.balanceHistory.push(runningBalance);
    state.tradeResults.push(result);

    if (!state.sessions[session]) {
      state.sessions[session] = { trades: 0, pnl: 0 };
    }

    state.sessions[session].trades += 1;
    state.sessions[session].pnl += pnl;

    if (result === "loss" || pnl < 0) lossesInRow += 1;
    else lossesInRow = 0;
  });

  state.currentBalance = runningBalance;
  state.highestBalance = highest;
  state.lossesInRow = lossesInRow;

  if (state.balanceHistory.length > 20) {
    state.balanceHistory = state.balanceHistory.slice(-20);
  }
}

async function saveProfileToCloud() {
  if (!window.propguardCloud?.saveProfile) return;

  await window.propguardCloud.saveProfile({
    propFirm: state.propFirm,
    instrument: state.instrument,
    startingBalance: state.startingBalance,
    currentBalance: state.currentBalance,
    highestBalance: state.highestBalance,
    dailyLossLimit: state.dailyLossLimit,
    trailingDrawdown: state.trailingDrawdown,
    maxRiskPercent: state.maxRiskPercent,
    tradesToday: state.tradesToday,
    lossesInRow: state.lossesInRow,
    tradeResults: state.tradeResults,
    balanceHistory: state.balanceHistory,
    sessions: state.sessions,
    lastCalculation: state.lastCalculation
  });
}

async function applyTrade(result) {
  const pnlBase = Math.abs(parseFloat(els.tradePnl?.value || "0"));
  const session = els.tradeSession?.value || "New York";

  let pnl = 0;
  if (result === "win") pnl = pnlBase;
  if (result === "loss") pnl = -pnlBase;
  if (result === "be") pnl = 0;

  state.tradesToday += 1;
  state.currentBalance += pnl;

  if (state.currentBalance > state.highestBalance) {
    state.highestBalance = state.currentBalance;
  }

  state.balanceHistory.push(state.currentBalance);
  state.tradeResults.push(result);

  if (!state.sessions[session]) {
    state.sessions[session] = { trades: 0, pnl: 0 };
  }

  state.sessions[session].trades += 1;
  state.sessions[session].pnl += pnl;

  if (result === "loss") state.lossesInRow += 1;
  else state.lossesInRow = 0;

  if (state.balanceHistory.length > 20) {
    state.balanceHistory = state.balanceHistory.slice(-20);
  }

  if (els.currentBalanceInput) {
    els.currentBalanceInput.value = state.currentBalance.toFixed(0);
  }

  if (els.highestBalanceInput) {
    els.highestBalanceInput.value = state.highestBalance.toFixed(0);
  }

  setText(
    els.tradeMessage,
    result === "win"
      ? "Win recorded. Dashboard updated in real time."
      : result === "loss"
      ? "Loss recorded. Risk meters updated instantly."
      : "Break-even recorded. Account preserved."
  );

  if (window.propguardCloud?.saveTrade) {
    await window.propguardCloud.saveTrade({
      result,
      pnl,
      session,
      balanceAfter: state.currentBalance
    });
  }

  await saveProfileToCloud();
  render();
}

if (els.settingsForm) {
  els.settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    state.propFirm = els.propFirm?.value || "Apex";
    state.instrument = els.instrument?.value || "MNQ";
    state.startingBalance = parseFloat(els.startingBalanceInput?.value || "50000");
    state.currentBalance = parseFloat(els.currentBalanceInput?.value || "50000");
    state.highestBalance = parseFloat(els.highestBalanceInput?.value || "50000");
    state.dailyLossLimit = parseFloat(els.dailyLossLimitInput?.value || "2000");
    state.trailingDrawdown = parseFloat(els.trailingDrawdownInput?.value || "2500");
    state.maxRiskPercent = parseFloat(els.maxRiskPercentInput?.value || "1");

    if (!state.balanceHistory.length) {
      state.balanceHistory = [state.currentBalance];
    } else if (state.balanceHistory.length === 1) {
      state.balanceHistory[0] = state.currentBalance;
    }

    await saveProfileToCloud();
    calculateTrade();
    render();
  });
}

if (els.quickMode) {
  els.quickMode.addEventListener("change", () => {
    if (els.tpRow) {
      els.tpRow.style.display = els.quickMode.checked ? "none" : "grid";
    }
    calculateTrade();
  });
}

if (els.riskForm) {
  els.riskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    calculateTrade();
  });
}

document.querySelectorAll(".action-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    await applyTrade(btn.dataset.result);
  });
});

if (els.focusToggle && els.focusOverlay) {
  els.focusToggle.addEventListener("click", () => {
    els.focusOverlay.classList.remove("hidden");
  });
}

if (els.focusClose && els.focusOverlay) {
  els.focusClose.addEventListener("click", () => {
    els.focusOverlay.classList.add("hidden");
  });
}

window.addEventListener("resize", renderChart);

window.applyCloudState = function applyCloudState(profile, trades = []) {
  if (profile) {
    state.propFirm = profile.propFirm ?? state.propFirm;
    state.instrument = profile.instrument ?? state.instrument;
    state.startingBalance = Number(profile.startingBalance ?? state.startingBalance);
    state.currentBalance = Number(profile.currentBalance ?? state.currentBalance);
    state.highestBalance = Number(profile.highestBalance ?? state.highestBalance);
    state.dailyLossLimit = Number(profile.dailyLossLimit ?? state.dailyLossLimit);
    state.trailingDrawdown = Number(profile.trailingDrawdown ?? state.trailingDrawdown);
    state.maxRiskPercent = Number(profile.maxRiskPercent ?? state.maxRiskPercent);
    state.lastCalculation = profile.lastCalculation ?? state.lastCalculation;

    if (els.propFirm) els.propFirm.value = state.propFirm;
    if (els.instrument) els.instrument.value = state.instrument;
    if (els.startingBalanceInput) els.startingBalanceInput.value = state.startingBalance;
    if (els.currentBalanceInput) els.currentBalanceInput.value = state.currentBalance;
    if (els.highestBalanceInput) els.highestBalanceInput.value = state.highestBalance;
    if (els.dailyLossLimitInput) els.dailyLossLimitInput.value = state.dailyLossLimit;
    if (els.trailingDrawdownInput) els.trailingDrawdownInput.value = state.trailingDrawdown;
    if (els.maxRiskPercentInput) els.maxRiskPercentInput.value = state.maxRiskPercent;
  }

  if (Array.isArray(trades) && trades.length) {
    rebuildFromTrades(trades);
    if (els.currentBalanceInput) els.currentBalanceInput.value = state.currentBalance.toFixed(0);
    if (els.highestBalanceInput) els.highestBalanceInput.value = state.highestBalance.toFixed(0);
  } else {
    state.balanceHistory = [state.currentBalance];
    state.tradesToday = profile?.tradesToday ?? 0;
    state.lossesInRow = profile?.lossesInRow ?? 0;
    state.tradeResults = profile?.tradeResults ?? [];
    state.sessions = profile?.sessions ?? state.sessions;
  }

  if (els.tpRow) {
    els.tpRow.style.display = els.quickMode?.checked ? "none" : "grid";
  }

  calculateTrade();
  render();
};

window.propguardRefreshUI = function propguardRefreshUI() {
  render();
};

if (els.tpRow) {
  els.tpRow.style.display = "grid";
}

calculateTrade();
render();
