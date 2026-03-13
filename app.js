const instrumentPresets = {
  MNQ: { tickSize: 0.25, tickValue: 0.5, pointValue: 2 },
  NQ: { tickSize: 0.25, tickValue: 5, pointValue: 20 },
  MES: { tickSize: 0.25, tickValue: 1.25, pointValue: 5 },
  ES: { tickSize: 0.25, tickValue: 12.5, pointValue: 50 },
  CL: { tickSize: 0.01, tickValue: 10, pointValue: 1000 },
  CUSTOM: { tickSize: 0.25, tickValue: 1, pointValue: 4 }
};

const propFirmPresets = {
  Apex: { dailyLossLimit: 2500, trailingDrawdown: 2500, maxRiskPercent: 1 },
  Topstep: { dailyLossLimit: 2000, trailingDrawdown: 2000, maxRiskPercent: 0.8 },
  FTMO: { dailyLossLimit: 2500, trailingDrawdown: 5000, maxRiskPercent: 0.75 },
  Custom: null
};

const state = {
  propFirm: "Apex",
  instrument: "MNQ",
  startingBalance: 50000,
  currentBalance: 50000,
  highestBalance: 50000,
  dailyLossLimit: 2500,
  trailingDrawdown: 2500,
  maxRiskPercent: 1,
  tradesToday: 0,
  lossesInRow: 0,
  tradeResults: [],
  tradeHistory: [],
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
  },
  chartPoints: [],
  onboardingDismissed: localStorage.getItem("propguard_onboarding_dismissed") === "1",
  deferredInstallPrompt: null,
  currentUser: null
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
  accountHealthBanner: $("accountHealthBanner"),

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
  chartTooltip: $("chartTooltip"),

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
  tradeSession: $("tradeSession"),
  tradeTag: $("tradeTag"),
  tradeNote: $("tradeNote"),

  winRateOut: $("winRateOut"),
  netPnlOut: $("netPnlOut"),
  avgWinOut: $("avgWinOut"),
  avgLossOut: $("avgLossOut"),
  expectancyOut: $("expectancyOut"),
  bestSessionOut: $("bestSessionOut"),
  historyFilter: $("historyFilter"),
  exportTradesBtn: $("exportTradesBtn"),
  clearTradesBtn: $("clearTradesBtn"),
  emptyTradesState: $("emptyTradesState"),
  tradeHistoryTable: $("tradeHistoryTable"),
  tradeHistoryBody: $("tradeHistoryBody"),

  toastContainer: $("toastContainer"),
  modalBackdrop: $("modalBackdrop"),
  onboardingModal: $("onboardingModal"),
  openOnboarding: $("openOnboarding"),
  installBtn: $("installBtn")
};

function setText(el, value) {
  if (el) el.textContent = value;
}

function setWidth(el, value) {
  if (el) el.style.width = value;
}

function formatMoney(value, maxFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maxFractionDigits
  }).format(Number(value || 0));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function positiveNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatDateTime(value) {
  if (!value) return "—";
  let date;
  if (typeof value?.toDate === "function") date = value.toDate();
  else date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function showToast(message, type = "success", timeout = 3200) {
  if (!els.toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-4px)";
    window.setTimeout(() => toast.remove(), 180);
  }, timeout);
}

function openModal(id) {
  const modal = $(id);
  if (!modal) return;
  els.modalBackdrop?.classList.remove("hidden");
  modal.classList.remove("hidden");
}

function closeModal(id) {
  const modal = $(id);
  if (!modal) return;
  modal.classList.add("hidden");
  if (!document.querySelector(".modal:not(.hidden)")) {
    els.modalBackdrop?.classList.add("hidden");
  }
}

function showOnboardingOnce(force = false) {
  if (!els.onboardingModal) return;
  if (!force && state.onboardingDismissed) return;
  openModal("onboardingModal");
}

function dismissOnboarding() {
  state.onboardingDismissed = true;
  localStorage.setItem("propguard_onboarding_dismissed", "1");
  closeModal("onboardingModal");
}

function drawdownLimitLine() {
  return state.highestBalance - state.trailingDrawdown;
}

function trailingDrawdownRemaining() {
  return Math.max(0, state.currentBalance - drawdownLimitLine());
}

function dailyRiskUsedPercent() {
  const todaysLoss = state.startingBalance <= state.currentBalance ? 0 : state.startingBalance - state.currentBalance;
  return clamp((todaysLoss / Math.max(state.dailyLossLimit, 1)) * 100, 0, 100);
}

function computeConsistency() {
  let score = 100;
  score -= clamp(dailyRiskUsedPercent() * 0.3, 0, 35);
  score -= state.lossesInRow * 8;
  score -= Math.max(0, state.tradesToday - 4) * 3;
  if (state.lastCalculation.riskPerTrade > state.currentBalance * (state.maxRiskPercent / 100)) score -= 12;
  if (state.lastCalculation.dailyImpact > 30) score -= 8;
  if (state.lossesInRow >= 3 && state.lastCalculation.dailyImpact > 10) score -= 10;
  return clamp(Math.round(score), 25, 100);
}

function computeSurvival(consistency) {
  let score = consistency;
  score -= clamp(dailyRiskUsedPercent() * 0.2, 0, 20);
  if (trailingDrawdownRemaining() < state.trailingDrawdown * 0.2) score -= 18;
  else if (trailingDrawdownRemaining() < state.trailingDrawdown * 0.4) score -= 8;
  score -= state.lossesInRow * 3;
  return clamp(Math.round(score), 15, 100);
}

function riskHeatValue(consistency, survival) {
  return Math.round(clamp(dailyRiskUsedPercent() * 0.5 + (100 - consistency) * 0.3 + (100 - survival) * 0.2, 0, 100));
}

function statusFromMetrics(consistency, survival) {
  const daily = dailyRiskUsedPercent();
  const drawdownLeft = trailingDrawdownRemaining();
  if (daily >= 90 || drawdownLeft <= state.trailingDrawdown * 0.12 || consistency < 60 || survival < 55) return "STOP TRADING";
  if (daily >= 60 || drawdownLeft <= state.trailingDrawdown * 0.35 || consistency < 78 || survival < 72) return "CAUTION";
  return "SAFE";
}

function setStatusClasses(el, status) {
  if (!el) return;
  el.classList.remove("safe", "caution", "stop");
  el.classList.add(status === "SAFE" ? "safe" : status === "CAUTION" ? "caution" : "stop");
}

function updateTrafficLights(status) {
  document.querySelectorAll(".traffic-lights .light").forEach((l) => l.classList.remove("active"));
  const target = status === "SAFE" ? ".light.green" : status === "CAUTION" ? ".light.yellow" : ".light.red";
  document.querySelector(target)?.classList.add("active");
}

function currentStatusCopy(status) {
  if (status === "SAFE") return "You are trading within your current funded-account risk limits.";
  if (status === "CAUTION") return "Risk is increasing. Trade smaller or be highly selective.";
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
  if (state.lastCalculation.riskPerTrade > riskCap || dailyImpact >= 40 || drawImpact >= 35) {
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
  setText(els.sessionLondon, fmt(state.sessions["London"] || { trades: 0, pnl: 0 }));
  setText(els.sessionNewYork, fmt(state.sessions["New York"] || { trades: 0, pnl: 0 }));
  setText(els.sessionAsia, fmt(state.sessions["Asia"] || { trades: 0, pnl: 0 }));
}

function calculateAdvancedMetrics() {
  const history = state.tradeHistory || [];
  const wins = history.filter((t) => Number(t.pnl) > 0);
  const losses = history.filter((t) => Number(t.pnl) < 0);
  const total = history.length;
  const winRate = total ? (wins.length / total) * 100 : 0;
  const netPnl = history.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
  const avgWin = wins.length ? wins.reduce((sum, t) => sum + Number(t.pnl || 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((sum, t) => sum + Number(t.pnl || 0), 0) / losses.length : 0;
  const expectancy = total ? netPnl / total : 0;

  const bestSession = Object.entries(state.sessions)
    .map(([name, data]) => ({ name, pnl: Number(data?.pnl || 0) }))
    .sort((a, b) => b.pnl - a.pnl)[0];

  setText(els.winRateOut, `${winRate.toFixed(1)}%`);
  setText(els.netPnlOut, formatMoney(netPnl));
  setText(els.avgWinOut, formatMoney(avgWin));
  setText(els.avgLossOut, formatMoney(avgLoss));
  setText(els.expectancyOut, formatMoney(expectancy, 2));
  setText(els.bestSessionOut, bestSession && bestSession.pnl !== 0 ? `${bestSession.name} (${formatMoney(bestSession.pnl)})` : "N/A");
}

function renderTradeHistory() {
  if (!els.tradeHistoryBody || !els.tradeHistoryTable || !els.emptyTradesState) return;
  const filter = els.historyFilter?.value || "all";
  const rows = (state.tradeHistory || []).filter((trade) => filter === "all" || trade.session === filter);
  els.tradeHistoryBody.innerHTML = "";

  if (!rows.length) {
    els.tradeHistoryTable.classList.add("hidden");
    els.emptyTradesState.classList.remove("hidden");
    return;
  }

  els.tradeHistoryTable.classList.remove("hidden");
  els.emptyTradesState.classList.add("hidden");

  rows.slice().reverse().forEach((trade, idx) => {
    const tr = document.createElement("tr");
    const result = String(trade.result || "be").toUpperCase();
    tr.innerHTML = `
      <td>${rows.length - idx}</td>
      <td><strong>${result}</strong></td>
      <td>${formatMoney(trade.pnl)}</td>
      <td>${trade.session || "—"}</td>
      <td>${trade.tag || "—"}</td>
      <td>${trade.note || "—"}</td>
      <td>${formatMoney(trade.balanceAfter)}</td>
      <td>${formatDateTime(trade.createdAt)}</td>
    `;
    els.tradeHistoryBody.appendChild(tr);
  });
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

  const data = state.balanceHistory?.length ? state.balanceHistory : [state.currentBalance];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const padding = 28;
  const safeRange = Math.max(1, max - min);
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = padding + ((height - padding * 2) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  state.chartPoints = data.map((value, index) => {
    const x = padding + stepX * index;
    const y = height - padding - ((value - min) / safeRange) * (height - padding * 2);
    return { x, y, value, index };
  });

  ctx.beginPath();
  state.chartPoints.forEach((p, index) => {
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#2a84ff";
  ctx.stroke();

  const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
  gradient.addColorStop(0, "rgba(42,132,255,.28)");
  gradient.addColorStop(1, "rgba(42,132,255,0)");
  ctx.lineTo(width - padding, height - padding);
  ctx.lineTo(padding, height - padding);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  const last = state.chartPoints[state.chartPoints.length - 1];
  if (last) {
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
}

function updateChartTooltip(clientX, clientY) {
  if (!els.chartTooltip || !els.equityCanvas || !state.chartPoints?.length) return;
  const rect = els.equityCanvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const nearest = state.chartPoints.reduce((best, point) => {
    const dist = Math.abs(point.x - x);
    return !best || dist < best.dist ? { ...point, dist } : best;
  }, null);
  if (!nearest || nearest.dist > 28) {
    els.chartTooltip.classList.add("hidden");
    return;
  }
  els.chartTooltip.classList.remove("hidden");
  els.chartTooltip.textContent = `Trade ${nearest.index}: ${formatMoney(nearest.value)}`;
  els.chartTooltip.style.left = `${nearest.x + 10}px`;
  els.chartTooltip.style.top = `${Math.max(12, nearest.y - 34)}px`;
}

function resetTradeCalculatorOutputs() {
  setText(els.suggestedSize, "0 contracts");
  setText(els.riskPerTradeOut, "$0");
  setText(els.rrOut, els.quickMode?.checked ? "Quick mode" : "1 : 0");
  setText(els.dailyImpactOut, "0%");
  setText(els.pointsOut, "0");
  setText(els.ticksOut, "0");
  setText(els.riskPerContractOut, "$0");
  setText(els.riskImpactDailyOut, "0%");
  setText(els.riskImpactDrawdownOut, "0%");
}

function validateAccountInputs() {
  const startingBalance = positiveNumber(els.startingBalanceInput?.value, 0);
  const currentBalance = positiveNumber(els.currentBalanceInput?.value, 0);
  const highestBalance = positiveNumber(els.highestBalanceInput?.value, 0);
  const dailyLossLimit = positiveNumber(els.dailyLossLimitInput?.value, 0);
  const trailingDrawdown = positiveNumber(els.trailingDrawdownInput?.value, 0);
  const maxRiskPercent = positiveNumber(els.maxRiskPercentInput?.value, 0);

  if (startingBalance <= 0) return { error: "Starting balance must be greater than 0." };
  if (currentBalance <= 0) return { error: "Current balance must be greater than 0." };
  if (highestBalance < currentBalance) return { error: "Highest balance cannot be less than current balance." };
  if (dailyLossLimit <= 0) return { error: "Daily loss limit must be greater than 0." };
  if (trailingDrawdown <= 0) return { error: "Trailing drawdown must be greater than 0." };
  if (maxRiskPercent <= 0 || maxRiskPercent > 10) return { error: "Max risk per trade should be between 0.1 and 10%." };

  return { startingBalance, currentBalance, highestBalance, dailyLossLimit, trailingDrawdown, maxRiskPercent };
}

function validateTradeInputs() {
  const instrument = els.instrument?.value || state.instrument;
  const preset = instrumentPresets[instrument] || instrumentPresets.MNQ;
  const entry = positiveNumber(els.entryInput?.value, 0);
  const stop = positiveNumber(els.stopInput?.value, 0);
  const tp = positiveNumber(els.takeProfitInput?.value, 0);
  const manualContracts = positiveNumber(els.manualContractsInput?.value, 0);

  if (entry <= 0 || stop <= 0) return { error: "Entry price and stop loss must be greater than 0." };
  if (entry === stop) return { error: "Entry price and stop loss cannot be the same." };

  const pointDistance = Math.abs(entry - stop);
  const ticks = preset.tickSize > 0 ? pointDistance / preset.tickSize : 0;
  if (pointDistance <= 0) return { error: "Stop distance must be greater than 0." };
  if (ticks < 1) return { error: "Stop distance is too small for this instrument." };
  if (ticks > 2000) return { error: "Stop distance is too large. Please review the trade inputs." };
  if (!els.quickMode?.checked && tp <= 0) return { error: "Take profit must be greater than 0." };
  if (manualContracts < 0) return { error: "Manual contracts cannot be negative." };

  return { instrument, entry, stop, tp, manualContracts };
}

function validateTradeLogInput(result) {
  const pnl = positiveNumber(els.tradePnl?.value, 0);
  if ((result === "win" || result === "loss") && pnl <= 0) return { error: "Trade P&L must be greater than 0." };
  if (pnl < 0) return { error: "Trade P&L cannot be negative. Use the WIN / LOSS buttons to choose direction." };
  return { pnl };
}

function renderVerificationBanner() {
  if (!els.accountHealthBanner) return;
  if (!state.currentUser) {
    els.accountHealthBanner.classList.add("hidden");
    return;
  }
  if (state.currentUser.emailVerified) {
    els.accountHealthBanner.textContent = "Account verified. Profile and trade journal are active.";
    els.accountHealthBanner.className = "verification-banner success-banner";
    return;
  }
  els.accountHealthBanner.textContent = "Email not verified yet. Verification is recommended before public sale so support, password reset, and account trust feel production-ready.";
  els.accountHealthBanner.className = "verification-banner warning-banner";
}

function render() {
  const consistency = computeConsistency();
  const survival = computeSurvival(consistency);
  const status = statusFromMetrics(consistency, survival);
  const drawdownLeft = trailingDrawdownRemaining();
  const dailyUsed = Math.round(dailyRiskUsedPercent());
  const heat = riskHeatValue(consistency, survival);

  setText(els.statusBanner, status);
  setText(els.focusStatus, status);
  setStatusClasses(els.statusBanner, status);
  setStatusClasses(els.focusStatus, status);
  setText(els.statusBannerCopy, currentStatusCopy(status));
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
  setText(els.drawdownFromPeakOut, formatMoney(state.currentBalance - state.highestBalance));
  setText(els.distanceFromPeak, formatMoney(state.currentBalance - state.highestBalance));

  updateBehavior(consistency, survival);
  updateRuleGuard();
  renderSessions();
  renderChart();
  renderTradeHistory();
  calculateAdvancedMetrics();
  renderVerificationBanner();
}

function calculateTrade(showMessages = true) {
  const validated = validateTradeInputs();
  if (validated.error) {
    resetTradeCalculatorOutputs();
    if (showMessages) showToast(validated.error, "error");
    return false;
  }

  const { instrument, entry, stop, tp, manualContracts } = validated;
  const preset = instrumentPresets[instrument] || instrumentPresets.MNQ;
  const pointDistance = Math.abs(entry - stop);
  const ticks = preset.tickSize > 0 ? pointDistance / preset.tickSize : 0;
  const riskPerContract = ticks * preset.tickValue;
  const suggestedRiskCap = state.currentBalance * (state.maxRiskPercent / 100);
  const suggestedContracts = riskPerContract > 0 ? Math.max(1, Math.floor(suggestedRiskCap / riskPerContract)) : 0;
  const contracts = manualContracts > 0 ? manualContracts : suggestedContracts;
  const riskPerTrade = riskPerContract * contracts;
  const rewardDistance = Math.abs(tp - entry);
  const rr = pointDistance > 0 && !els.quickMode?.checked ? rewardDistance / pointDistance : 0;
  const dailyImpact = state.dailyLossLimit > 0 ? (riskPerTrade / state.dailyLossLimit) * 100 : 0;
  const drawdownImpact = state.trailingDrawdown > 0 ? (riskPerTrade / state.trailingDrawdown) * 100 : 0;

  state.lastCalculation = { riskPerTrade, suggestedContracts, dailyImpact, drawdownImpact };
  setText(els.suggestedSize, `${contracts || 0} contract${contracts === 1 ? "" : "s"}`);
  setText(els.riskPerTradeOut, formatMoney(riskPerTrade));
  setText(els.rrOut, els.quickMode?.checked ? "Quick mode" : `1 : ${rr.toFixed(2)}`);
  setText(els.dailyImpactOut, `${dailyImpact.toFixed(1)}%`);
  setText(els.pointsOut, pointDistance.toFixed(2));
  setText(els.ticksOut, ticks.toFixed(0));
  setText(els.riskPerContractOut, formatMoney(riskPerContract));
  setText(els.riskImpactDailyOut, `${dailyImpact.toFixed(1)}%`);
  setText(els.riskImpactDrawdownOut, `${drawdownImpact.toFixed(1)}%`);

  render();
  return true;
}

function rebuildFromTrades(trades = []) {
  state.tradeHistory = [];
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
  let highest = Math.max(state.startingBalance, state.highestBalance || state.startingBalance);
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
    state.tradeHistory.push({ ...trade, balanceAfter: Number(trade.balanceAfter ?? runningBalance) });

    if (!state.sessions[session]) state.sessions[session] = { trades: 0, pnl: 0 };
    state.sessions[session].trades += 1;
    state.sessions[session].pnl += pnl;

    if (result === "loss" || pnl < 0) lossesInRow += 1;
    else lossesInRow = 0;
  });

  state.currentBalance = runningBalance;
  state.highestBalance = highest;
  state.lossesInRow = lossesInRow;
  if (state.balanceHistory.length > 120) state.balanceHistory = state.balanceHistory.slice(-120);
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
  const validatedPnl = validateTradeLogInput(result);
  if (validatedPnl.error) {
    showToast(validatedPnl.error, "error");
    return;
  }

  const pnlBase = Math.abs(parseFloat(els.tradePnl?.value || "0"));
  const session = els.tradeSession?.value || "New York";
  const tag = (els.tradeTag?.value || "").trim();
  const note = (els.tradeNote?.value || "").trim();

  let pnl = 0;
  if (result === "win") pnl = pnlBase;
  if (result === "loss") pnl = -pnlBase;
  if (result === "be") pnl = 0;

  state.tradesToday += 1;
  state.currentBalance += pnl;
  if (state.currentBalance > state.highestBalance) state.highestBalance = state.currentBalance;
  state.balanceHistory.push(state.currentBalance);
  state.tradeResults.push(result);
  if (state.balanceHistory.length > 120) state.balanceHistory = state.balanceHistory.slice(-120);

  if (!state.sessions[session]) state.sessions[session] = { trades: 0, pnl: 0 };
  state.sessions[session].trades += 1;
  state.sessions[session].pnl += pnl;

  if (result === "loss") state.lossesInRow += 1;
  else state.lossesInRow = 0;

  const tradeRecord = {
    result,
    pnl,
    session,
    tag,
    note,
    balanceAfter: state.currentBalance,
    createdAt: new Date().toISOString()
  };
  state.tradeHistory.push(tradeRecord);

  if (els.currentBalanceInput) els.currentBalanceInput.value = state.currentBalance.toFixed(0);
  if (els.highestBalanceInput) els.highestBalanceInput.value = state.highestBalance.toFixed(0);
  if (els.tradeTag) els.tradeTag.value = "";
  if (els.tradeNote) els.tradeNote.value = "";

  setText(
    els.tradeMessage,
    result === "win" ? "Win recorded. Dashboard updated in real time." : result === "loss" ? "Loss recorded. Risk meters updated instantly." : "Break-even recorded. Account preserved."
  );

  if (window.propguardCloud?.saveTrade) {
    await window.propguardCloud.saveTrade(tradeRecord);
  }

  await saveProfileToCloud();
  render();
  showToast(result === "loss" ? "Loss logged." : result === "win" ? "Win logged." : "Break-even logged.", result === "loss" ? "warning" : "success");
}

function exportTradesToCSV() {
  const rows = state.tradeHistory || [];
  if (!rows.length) {
    showToast("There are no trades to export yet.", "warning");
    return;
  }
  const headers = ["Result", "PnL", "Session", "Tag", "Note", "Balance After", "Time"];
  const csv = [headers.join(",")].concat(
    rows.map((trade) => [
      trade.result,
      trade.pnl,
      trade.session,
      JSON.stringify(trade.tag || ""),
      JSON.stringify(trade.note || ""),
      trade.balanceAfter,
      formatDateTime(trade.createdAt)
    ].join(","))
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "propguard-trade-history.csv";
  link.click();
  URL.revokeObjectURL(url);
  showToast("CSV export ready.", "success");
}


function resetTradeCalculatorOutputs() {
  setText(els.suggestedSize, "0 contracts");
  setText(els.riskPerTradeOut, formatMoney(0));
  setText(els.rrOut, els.quickMode?.checked ? "Quick mode" : "1 : 0");
  setText(els.dailyImpactOut, "0%");
  setText(els.pointsOut, "0");
  setText(els.ticksOut, "0");
  setText(els.riskPerContractOut, formatMoney(0));
  setText(els.riskImpactDailyOut, "0%");
  setText(els.riskImpactDrawdownOut, "0%");
}

function resetJournalStateToBaseline() {
  state.tradeHistory = [];
  state.tradeResults = [];
  state.balanceHistory = [state.startingBalance];
  state.currentBalance = state.startingBalance;
  state.highestBalance = state.startingBalance;
  state.tradesToday = 0;
  state.lossesInRow = 0;
  state.sessions = {
    London: { trades: 0, pnl: 0 },
    "New York": { trades: 0, pnl: 0 },
    Asia: { trades: 0, pnl: 0 }
  };
  state.lastCalculation = {
    riskPerTrade: 0,
    suggestedContracts: 0,
    dailyImpact: 0,
    drawdownImpact: 0
  };

  if (els.currentBalanceInput) els.currentBalanceInput.value = state.currentBalance;
  if (els.highestBalanceInput) els.highestBalanceInput.value = state.highestBalance;
  if (els.tradePnl) els.tradePnl.value = "";
  if (els.tradeTag) els.tradeTag.value = "";
  if (els.tradeNote) els.tradeNote.value = "";
  resetTradeCalculatorOutputs();
}

async function clearTrades() {
  if (!window.confirm("Clear all saved trades from the current journal? This will fully reset the active account metrics and cannot be undone.")) return;
  resetJournalStateToBaseline();
  if (window.propguardCloud?.clearTrades) await window.propguardCloud.clearTrades();
  await saveProfileToCloud();
  render();
  showToast("Trade journal cleared. Account metrics reset to baseline.", "success");
}

function applyPropFirmDefaults(name) {
  const preset = propFirmPresets[name];
  if (!preset) return;
  if (els.dailyLossLimitInput) els.dailyLossLimitInput.value = preset.dailyLossLimit;
  if (els.trailingDrawdownInput) els.trailingDrawdownInput.value = preset.trailingDrawdown;
  if (els.maxRiskPercentInput) els.maxRiskPercentInput.value = preset.maxRiskPercent;
}

if (els.settingsForm) {
  els.settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const validated = validateAccountInputs();
    if (validated.error) {
      showToast(validated.error, "error");
      return;
    }

    state.propFirm = els.propFirm?.value || "Apex";
    state.instrument = els.instrument?.value || "MNQ";
    state.startingBalance = validated.startingBalance;
    state.currentBalance = validated.currentBalance;
    state.highestBalance = validated.highestBalance;
    state.dailyLossLimit = validated.dailyLossLimit;
    state.trailingDrawdown = validated.trailingDrawdown;
    state.maxRiskPercent = validated.maxRiskPercent;

    if (!state.balanceHistory.length) state.balanceHistory = [state.currentBalance];
    else state.balanceHistory[0] = state.startingBalance;

    await saveProfileToCloud();
    calculateTrade(false);
    render();
    showToast("Account rules updated.", "success");
  });
}

els.propFirm?.addEventListener("change", () => applyPropFirmDefaults(els.propFirm.value));

if (els.quickMode) {
  els.quickMode.addEventListener("change", () => {
    if (els.tpRow) els.tpRow.style.display = els.quickMode.checked ? "none" : "grid";
    calculateTrade(false);
  });
}

if (els.riskForm) {
  els.riskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (calculateTrade(true)) showToast("Trade risk calculated.", "success");
  });
}

document.querySelectorAll(".action-btn").forEach((btn) => {
  btn.addEventListener("click", async () => applyTrade(btn.dataset.result));
});

if (els.focusToggle && els.focusOverlay) {
  els.focusToggle.addEventListener("click", () => els.focusOverlay.classList.remove("hidden"));
}
if (els.focusClose && els.focusOverlay) {
  els.focusClose.addEventListener("click", () => els.focusOverlay.classList.add("hidden"));
}

els.historyFilter?.addEventListener("change", renderTradeHistory);
els.exportTradesBtn?.addEventListener("click", exportTradesToCSV);
els.clearTradesBtn?.addEventListener("click", clearTrades);
els.openOnboarding?.addEventListener("click", () => showOnboardingOnce(true));
els.installBtn?.addEventListener("click", async () => {
  if (!state.deferredInstallPrompt) return;
  state.deferredInstallPrompt.prompt();
  await state.deferredInstallPrompt.userChoice.catch(() => null);
  state.deferredInstallPrompt = null;
  els.installBtn.classList.add("hidden");
});

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  state.deferredInstallPrompt = e;
  els.installBtn?.classList.remove("hidden");
});

if (els.equityCanvas) {
  els.equityCanvas.addEventListener("mousemove", (e) => updateChartTooltip(e.clientX, e.clientY));
  els.equityCanvas.addEventListener("mouseleave", () => els.chartTooltip?.classList.add("hidden"));
}

window.addEventListener("resize", renderChart);

document.querySelectorAll("[data-open-modal]").forEach((btn) => btn.addEventListener("click", () => openModal(btn.dataset.openModal)));
document.querySelectorAll("[data-close-modal]").forEach((btn) => btn.addEventListener("click", () => {
  if (btn.dataset.closeModal === "onboardingModal") dismissOnboarding();
  else closeModal(btn.dataset.closeModal);
}));
els.modalBackdrop?.addEventListener("click", () => {
  document.querySelectorAll(".modal:not(.hidden)").forEach((modal) => closeModal(modal.id));
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal:not(.hidden)").forEach((modal) => closeModal(modal.id));
    els.focusOverlay?.classList.add("hidden");
  }
});

window.applyCloudState = function applyCloudState(profile, trades = [], user = null) {
  state.currentUser = user || state.currentUser;
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
    state.tradesToday = Number(profile?.tradesToday ?? 0);
    state.lossesInRow = Number(profile?.lossesInRow ?? 0);
    state.tradeResults = profile?.tradeResults ?? [];
    state.sessions = profile?.sessions ?? state.sessions;
    state.tradeHistory = [];
  }

  if (els.tpRow) els.tpRow.style.display = els.quickMode?.checked ? "none" : "grid";
  calculateTrade(false);
  render();
  showOnboardingOnce();
};

window.propguardRefreshUI = function propguardRefreshUI() {
  render();
};

if (els.tpRow) els.tpRow.style.display = "grid";
calculateTrade(false);
render();
