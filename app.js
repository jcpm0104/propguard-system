const instrumentPresets = {
  MNQ: { tickSize: 0.25, tickValue: 0.5, pointValue: 2 },
  NQ: { tickSize: 0.25, tickValue: 5, pointValue: 20 },
  MES: { tickSize: 0.25, tickValue: 1.25, pointValue: 5 },
  ES: { tickSize: 0.25, tickValue: 12.5, pointValue: 50 },
  CL: { tickSize: 0.01, tickValue: 10, pointValue: 1000 },
  CUSTOM: { tickSize: 0.25, tickValue: 1, pointValue: 4 }
};

const state = {
  propFirm: 'Apex',
  instrument: 'MNQ',
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
  sessions: { London: { trades: 0, pnl: 0 }, 'New York': { trades: 0, pnl: 0 }, Asia: { trades: 0, pnl: 0 } },
  lastCalculation: { riskPerTrade: 0, suggestedContracts: 0, dailyImpact: 0, drawdownImpact: 0 },
};

const $ = (id) => document.getElementById(id);
const els = {
  settingsForm: $('settingsForm'), riskForm: $('riskForm'), quickMode: $('quickMode'), tpRow: $('tpRow'),
  heroStatus: $('heroStatus'), heroStatusText: $('heroStatusText'), heroDailyRisk: $('heroDailyRisk'), heroDrawdown: $('heroDrawdown'), heroConsistency: $('heroConsistency'), heroSurvival: $('heroSurvival'),
  statusBanner: $('statusBanner'), statusBannerCopy: $('statusBannerCopy'), heatFill: $('heatFill'), heatLabel: $('heatLabel'),
  dailyRiskUsed: $('dailyRiskUsed'), drawdownRemaining: $('drawdownRemaining'), tradesToday: $('tradesToday'), currentBalance: $('currentBalance'), consistencyScore: $('consistencyScore'), survivalScore: $('survivalScore'),
  tradeMessage: $('tradeMessage'), behaviorBox: $('behaviorBox'), behaviorTitle: $('behaviorTitle'), behaviorCopy: $('behaviorCopy'), consistencyFill: $('consistencyFill'), survivalFill: $('survivalFill'), consistencyScoreMini: $('consistencyScoreMini'), survivalScoreMini: $('survivalScoreMini'),
  suggestedSize: $('suggestedSize'), riskPerTradeOut: $('riskPerTradeOut'), rrOut: $('rrOut'), dailyImpactOut: $('dailyImpactOut'), pointsOut: $('pointsOut'), ticksOut: $('ticksOut'), riskPerContractOut: $('riskPerContractOut'), riskImpactDailyOut: $('riskImpactDailyOut'), riskImpactDrawdownOut: $('riskImpactDrawdownOut'), riskLimitOut: $('riskLimitOut'),
  ruleGuardBox: $('ruleGuardBox'), ruleGuardTitle: $('ruleGuardTitle'), ruleGuardCopy: $('ruleGuardCopy'),
  sessionLondon: $('sessionLondon'), sessionNewYork: $('sessionNewYork'), sessionAsia: $('sessionAsia'), drawdownRemainingLarge: $('drawdownRemainingLarge'), distanceFromPeak: $('distanceFromPeak'), highestBalanceOut: $('highestBalanceOut'), currentBalanceOut: $('currentBalanceOut'), drawdownFromPeakOut: $('drawdownFromPeakOut'),
  focusToggle: $('focusToggle'), focusOverlay: $('focusOverlay'), focusClose: $('focusClose'), focusStatus: $('focusStatus'), focusDailyRisk: $('focusDailyRisk'), focusDrawdown: $('focusDrawdown'), focusHeatFill: $('focusHeatFill'), focusHeatLabel: $('focusHeatLabel')
};

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function drawdownLimitLine() {
  return state.highestBalance - state.trailingDrawdown;
}

function trailingDrawdownRemaining() {
  return Math.max(0, state.currentBalance - drawdownLimitLine());
}

function dailyRiskUsedPercent() {
  const todaysLoss = state.startingBalance <= state.currentBalance ? 0 : state.startingBalance - state.currentBalance;
  return clamp((todaysLoss / state.dailyLossLimit) * 100, 0, 100);
}

function computeConsistency() {
  let score = 100;
  score -= clamp(dailyRiskUsedPercent() * 0.3, 0, 35);
  score -= state.lossesInRow * 8;
  score -= Math.max(0, state.tradesToday - 4) * 3;
  if (state.lastCalculation.riskPerTrade > state.currentBalance * (state.maxRiskPercent / 100)) score -= 12;
  if (state.lastCalculation.dailyImpact > 30) score -= 8;
  if (state.lossesInRow >= 3 && state.lastCalculation.dailyImpact > 10) score -= 10;
  return clamp(Math.round(score), 25, 99);
}

function computeSurvival(consistency) {
  let score = consistency;
  score -= clamp(dailyRiskUsedPercent() * 0.2, 0, 20);
  score -= trailingDrawdownRemaining() < state.trailingDrawdown * 0.2 ? 18 : trailingDrawdownRemaining() < state.trailingDrawdown * 0.4 ? 8 : 0;
  score -= state.lossesInRow * 3;
  return clamp(Math.round(score), 15, 99);
}

function riskHeatValue(consistency, survival) {
  const v = clamp((dailyRiskUsedPercent() * 0.5) + ((100 - consistency) * 0.3) + ((100 - survival) * 0.2), 0, 100);
  return Math.round(v);
}

function statusFromMetrics(consistency, survival) {
  const daily = dailyRiskUsedPercent();
  const drawdownLeft = trailingDrawdownRemaining();
  if (daily >= 90 || drawdownLeft <= state.trailingDrawdown * 0.12 || consistency < 60 || survival < 55) return 'STOP TRADING';
  if (daily >= 60 || drawdownLeft <= state.trailingDrawdown * 0.35 || consistency < 78 || survival < 72) return 'CAUTION';
  return 'SAFE';
}

function setStatusClasses(el, status) {
  el.classList.remove('safe', 'caution', 'stop');
  el.classList.add(status === 'SAFE' ? 'safe' : status === 'CAUTION' ? 'caution' : 'stop');
}

function updateTrafficLights(status) {
  document.querySelectorAll('.traffic-lights .light').forEach(l => l.classList.remove('active'));
  const target = status === 'SAFE' ? '.light.green' : status === 'CAUTION' ? '.light.yellow' : '.light.red';
  document.querySelector(target)?.classList.add('active');
}

function currentStatusCopy(status) {
  if (status === 'SAFE') return 'You are trading within your current funded-account risk limits.';
  if (status === 'CAUTION') return 'Risk is increasing. Trade smaller or be highly selective.';
  return 'You are close to violating prop firm rules. Consider stopping today.';
}

function updateBehavior(consistency, survival) {
  let title = 'Behavior stable';
  let copy = 'No revenge-trading pattern detected.';
  let cls = 'behavior safe-box';

  if (state.lossesInRow >= 3 && state.lastCalculation.dailyImpact > 10) {
    title = 'Revenge trading pattern detected';
    copy = 'You increased exposure after consecutive losses. High danger behavior.';
    cls = 'behavior danger-box';
  } else if (dailyRiskUsedPercent() >= 60 || state.lossesInRow >= 2) {
    title = 'Risk behavior increasing';
    copy = 'You are stacking pressure on the account. Slow down and protect the funded balance.';
    cls = 'behavior warning-box';
  }

  els.behaviorBox.className = cls;
  els.behaviorTitle.textContent = title;
  els.behaviorCopy.textContent = copy;
  els.consistencyFill.style.width = `${consistency}%`;
  els.survivalFill.style.width = `${survival}%`;
  els.consistencyScoreMini.textContent = consistency;
  els.survivalScoreMini.textContent = `${survival}%`;
}

function updateRuleGuard() {
  const drawImpact = state.lastCalculation.drawdownImpact;
  const dailyImpact = state.lastCalculation.dailyImpact;
  let title = 'Rule safe';
  let copy = 'This trade is within your current prop firm risk limits.';
  let cls = 'behavior safe-box';
  let riskLimitText = 'Safe';
  const riskCap = state.currentBalance * (state.maxRiskPercent / 100);

  if (state.lastCalculation.riskPerTrade > riskCap || dailyImpact >= 40 || drawImpact >= 35) {
    title = 'Rule violation warning';
    copy = 'This trade may break a prop firm rule or push the account too close to danger.';
    cls = 'behavior danger-box';
    riskLimitText = 'Exceeded';
  } else if (dailyImpact >= 20 || drawImpact >= 18) {
    title = 'Rule caution';
    copy = 'This trade uses a meaningful part of your available account risk.';
    cls = 'behavior warning-box';
    riskLimitText = 'Caution';
  }

  els.ruleGuardBox.className = cls;
  els.ruleGuardTitle.textContent = title;
  els.ruleGuardCopy.textContent = copy;
  els.riskLimitOut.textContent = riskLimitText;
}

function renderSessions() {
  const fmt = (s) => `${s.trades} trades | ${formatMoney(s.pnl)}`;
  els.sessionLondon.textContent = fmt(state.sessions['London']);
  els.sessionNewYork.textContent = fmt(state.sessions['New York']);
  els.sessionAsia.textContent = fmt(state.sessions['Asia']);
}

function renderChart() {
  const canvas = $('equityCanvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 260 * dpr;
  ctx.scale(dpr, dpr);
  const width = rect.width;
  const height = 260;
  ctx.clearRect(0, 0, width, height);

  const data = state.balanceHistory;
  const min = Math.min(...data, drawdownLimitLine()) - 100;
  const max = Math.max(...data, state.highestBalance) + 100;
  const padding = { left: 18, right: 18, top: 18, bottom: 24 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 4; i++) {
    const y = padding.top + (innerH / 3) * i;
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y); ctx.stroke();
  }

  const ddY = padding.top + (1 - ((drawdownLimitLine() - min) / (max - min))) * innerH;
  ctx.strokeStyle = 'rgba(239,92,92,0.6)';
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(padding.left, ddY); ctx.lineTo(width - padding.right, ddY); ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  data.forEach((value, i) => {
    const x = padding.left + (i / Math.max(1, data.length - 1)) * innerW;
    const y = padding.top + (1 - ((value - min) / (max - min))) * innerH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#1e6bff';
  ctx.lineWidth = 3;
  ctx.stroke();

  const last = data[data.length - 1];
  const x = padding.left + innerW;
  const y = padding.top + (1 - ((last - min) / (max - min))) * innerH;
  ctx.fillStyle = '#23c16b';
  ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
}

function render() {
  const consistency = computeConsistency();
  const survival = computeSurvival(consistency);
  const status = statusFromMetrics(consistency, survival);
  const drawdownLeft = trailingDrawdownRemaining();
  const dailyUsed = Math.round(dailyRiskUsedPercent());
  const heat = riskHeatValue(consistency, survival);
  const statusCopy = currentStatusCopy(status);

  els.heroStatus.textContent = status;
  els.statusBanner.textContent = status;
  els.focusStatus.textContent = status;
  [els.heroStatus, els.statusBanner, els.focusStatus].forEach(el => setStatusClasses(el, status));
  els.heroStatusText.textContent = statusCopy;
  els.statusBannerCopy.textContent = statusCopy;
  updateTrafficLights(status);

  const heatLabel = heat < 34 ? 'SAFE' : heat < 67 ? 'MODERATE' : 'HIGH';
  els.heatFill.style.width = `${heat}%`;
  els.focusHeatFill.style.width = `${heat}%`;
  els.heatLabel.textContent = heatLabel;
  els.focusHeatLabel.textContent = heatLabel;

  els.heroDailyRisk.textContent = `${dailyUsed}%`;
  els.heroDrawdown.textContent = formatMoney(drawdownLeft);
  els.heroConsistency.textContent = consistency;
  els.heroSurvival.textContent = `${survival}%`;

  els.dailyRiskUsed.textContent = `${dailyUsed}%`;
  els.drawdownRemaining.textContent = formatMoney(drawdownLeft);
  els.drawdownRemainingLarge.textContent = formatMoney(drawdownLeft);
  els.tradesToday.textContent = state.tradesToday;
  els.currentBalance.textContent = formatMoney(state.currentBalance);
  els.consistencyScore.textContent = `${consistency} / 100`;
  els.survivalScore.textContent = `${survival}%`;

  els.focusDailyRisk.textContent = `${dailyUsed}%`;
  els.focusDrawdown.textContent = formatMoney(drawdownLeft);

  els.highestBalanceOut.textContent = formatMoney(state.highestBalance);
  els.currentBalanceOut.textContent = formatMoney(state.currentBalance);
  els.drawdownFromPeakOut.textContent = formatMoney(state.currentBalance - state.highestBalance);
  els.distanceFromPeak.textContent = formatMoney(state.currentBalance - state.highestBalance);

  updateBehavior(consistency, survival);
  updateRuleGuard();
  renderSessions();
  renderChart();
}

function calculateTrade() {
  const instrument = $('instrument').value;
  const preset = instrumentPresets[instrument] || instrumentPresets.MNQ;
  const entry = parseFloat($('entryInput').value || '0');
  const stop = parseFloat($('stopInput').value || '0');
  const tp = parseFloat($('takeProfitInput').value || '0');
  const manualContracts = parseFloat($('manualContractsInput').value || '0');
  const pointDistance = Math.abs(entry - stop);
  const ticks = preset.tickSize > 0 ? pointDistance / preset.tickSize : 0;
  const riskPerContract = ticks * preset.tickValue;
  const suggestedRiskCap = state.currentBalance * (state.maxRiskPercent / 100);
  const suggestedContracts = riskPerContract > 0 ? Math.max(1, Math.floor(suggestedRiskCap / riskPerContract)) : 0;
  const contracts = manualContracts > 0 ? manualContracts : suggestedContracts;
  const riskPerTrade = riskPerContract * contracts;
  const rewardDistance = Math.abs(tp - entry);
  const rr = pointDistance > 0 && !$('quickMode').checked ? rewardDistance / pointDistance : 0;
  const dailyImpact = state.dailyLossLimit > 0 ? (riskPerTrade / state.dailyLossLimit) * 100 : 0;
  const drawdownImpact = state.trailingDrawdown > 0 ? (riskPerTrade / state.trailingDrawdown) * 100 : 0;

  state.lastCalculation = { riskPerTrade, suggestedContracts, dailyImpact, drawdownImpact };

  $('suggestedSize').textContent = `${contracts || 0} contract${contracts === 1 ? '' : 's'}`;
  $('riskPerTradeOut').textContent = formatMoney(riskPerTrade);
  $('rrOut').textContent = $('quickMode').checked ? 'Quick mode' : `1 : ${rr.toFixed(2)}`;
  $('dailyImpactOut').textContent = `${dailyImpact.toFixed(1)}%`;

  $('pointsOut').textContent = pointDistance.toFixed(2);
  $('ticksOut').textContent = ticks.toFixed(0);
  $('riskPerContractOut').textContent = formatMoney(riskPerContract);
  $('riskImpactDailyOut').textContent = `${dailyImpact.toFixed(1)}%`;
  $('riskImpactDrawdownOut').textContent = `${drawdownImpact.toFixed(1)}%`;

  render();
}

els.settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  state.propFirm = $('propFirm').value;
  state.instrument = $('instrument').value;
  state.startingBalance = parseFloat($('startingBalanceInput').value || '50000');
  state.currentBalance = parseFloat($('currentBalanceInput').value || '50000');
  state.highestBalance = parseFloat($('highestBalanceInput').value || '50000');
  state.dailyLossLimit = parseFloat($('dailyLossLimitInput').value || '2000');
  state.trailingDrawdown = parseFloat($('trailingDrawdownInput').value || '2500');
  state.maxRiskPercent = parseFloat($('maxRiskPercentInput').value || '1');
  state.balanceHistory = [state.currentBalance];
  render();
  calculateTrade();
});

els.quickMode.addEventListener('change', () => {
  els.tpRow.style.display = els.quickMode.checked ? 'none' : 'grid';
  calculateTrade();
});

els.riskForm.addEventListener('submit', (e) => { e.preventDefault(); calculateTrade(); });

function applyTrade(result) {
  const pnlBase = Math.abs(parseFloat($('tradePnl').value || '0'));
  const session = $('tradeSession').value;
  let pnl = 0;
  if (result === 'win') pnl = pnlBase;
  if (result === 'loss') pnl = -pnlBase;
  if (result === 'be') pnl = 0;

  state.tradesToday += 1;
  state.currentBalance += pnl;
  if (state.currentBalance > state.highestBalance) state.highestBalance = state.currentBalance;
  state.balanceHistory.push(state.currentBalance);
  state.tradeResults.push(result);
  state.sessions[session].trades += 1;
  state.sessions[session].pnl += pnl;

  if (result === 'loss') state.lossesInRow += 1; else state.lossesInRow = 0;

  if (state.balanceHistory.length > 20) state.balanceHistory = state.balanceHistory.slice(-20);
  $('currentBalanceInput').value = state.currentBalance.toFixed(0);
  $('highestBalanceInput').value = state.highestBalance.toFixed(0);

  els.tradeMessage.textContent = result === 'win'
    ? 'Win recorded. Dashboard updated in real time.'
    : result === 'loss'
      ? 'Loss recorded. Risk meters updated instantly.'
      : 'Break-even recorded. Account preserved.';

  render();
}

document.querySelectorAll('.action-btn').forEach(btn => btn.addEventListener('click', () => applyTrade(btn.dataset.result)));

els.focusToggle.addEventListener('click', () => els.focusOverlay.classList.remove('hidden'));
els.focusClose.addEventListener('click', () => els.focusOverlay.classList.add('hidden'));

window.addEventListener('resize', renderChart);

// initial render
els.tpRow.style.display = 'grid';
calculateTrade();
render();
