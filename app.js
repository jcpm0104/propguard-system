const state = {
  tradesToday: 3,
  dailyLossUsed: 12,
  drawdownRemaining: 2750,
  consistency: 84,
  survival: 82,
  lossesInRow: 0,
};

const els = {
  heroStatus: document.getElementById('heroStatus'),
  heroDailyLoss: document.getElementById('heroDailyLoss'),
  heroDrawdown: document.getElementById('heroDrawdown'),
  heroTrades: document.getElementById('heroTrades'),
  heroConsistency: document.getElementById('heroConsistency'),
  heroSurvival: document.getElementById('heroSurvival'),
  dailyLossDisplay: document.getElementById('dailyLossDisplay'),
  drawdownDisplay: document.getElementById('drawdownDisplay'),
  tradesDisplay: document.getElementById('tradesDisplay'),
  consistencyDisplay: document.getElementById('consistencyDisplay'),
  statusPill: document.getElementById('statusPill'),
  alertBox: document.getElementById('alertBox'),
  alertTitle: document.getElementById('alertTitle'),
  alertCopy: document.getElementById('alertCopy'),
  scoreConsistency: document.getElementById('scoreConsistency'),
  scoreSurvival: document.getElementById('scoreSurvival'),
  consistencyBar: document.getElementById('consistencyBar'),
  survivalBar: document.getElementById('survivalBar'),
  quickLogMessage: document.getElementById('quickLogMessage'),
  riskForm: document.getElementById('riskForm'),
  riskOutput: document.getElementById('riskOutput'),
  contractsOutput: document.getElementById('contractsOutput'),
  rrOutput: document.getElementById('rrOutput'),
  impactOutput: document.getElementById('impactOutput'),
  validationBox: document.getElementById('validationBox'),
  validationTitle: document.getElementById('validationTitle'),
  validationCopy: document.getElementById('validationCopy'),
};

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function getStatus() {
  if (state.dailyLossUsed >= 85 || state.lossesInRow >= 3 || state.consistency < 60) return 'STOP TRADING';
  if (state.dailyLossUsed >= 55 || state.lossesInRow >= 2 || state.consistency < 75) return 'CAUTION';
  return 'SAFE';
}

function updateLights(status) {
  document.querySelectorAll('.light').forEach((light) => light.classList.remove('active'));
  if (status === 'SAFE') document.querySelector('.light.green')?.classList.add('active');
  if (status === 'CAUTION') document.querySelector('.light.yellow')?.classList.add('active');
  if (status === 'STOP TRADING') document.querySelector('.light.red')?.classList.add('active');
}

function render() {
  const status = getStatus();
  els.heroStatus.textContent = status;
  els.heroStatus.className = `status-display ${status === 'SAFE' ? 'safe' : status === 'CAUTION' ? 'caution' : 'stop'}`;
  els.heroDailyLoss.textContent = `${state.dailyLossUsed}%`;
  els.heroDrawdown.textContent = formatMoney(state.drawdownRemaining);
  els.heroTrades.textContent = state.tradesToday;
  els.heroConsistency.textContent = state.consistency;
  els.heroSurvival.textContent = `${state.survival}%`;

  els.dailyLossDisplay.textContent = `${state.dailyLossUsed}%`;
  els.drawdownDisplay.textContent = formatMoney(state.drawdownRemaining);
  els.tradesDisplay.textContent = state.tradesToday;
  els.consistencyDisplay.textContent = state.consistency;

  els.statusPill.textContent = status;
  els.statusPill.className = `status-pill ${status === 'SAFE' ? '' : status === 'CAUTION' ? 'caution' : 'stop'}`;

  els.scoreConsistency.textContent = `${state.consistency} / 100`;
  els.scoreSurvival.textContent = `${state.survival}%`;
  els.consistencyBar.style.width = `${Math.max(0, Math.min(100, state.consistency))}%`;
  els.survivalBar.style.width = `${Math.max(0, Math.min(100, state.survival))}%`;

  if (status === 'SAFE') {
    els.alertBox.className = 'alert-box alert-safe';
    els.alertTitle.textContent = 'Low risk state';
    els.alertCopy.textContent = 'You are trading within your current risk plan. Stay selective.';
  } else if (status === 'CAUTION') {
    els.alertBox.className = 'alert-box alert-caution';
    els.alertTitle.textContent = 'Risk increasing';
    els.alertCopy.textContent = 'Your recent behavior suggests caution. Reduce impulsive decisions.';
  } else {
    els.alertBox.className = 'alert-box alert-stop';
    els.alertTitle.textContent = 'High probability of rule violation';
    els.alertCopy.textContent = 'You are close to dangerous account conditions. Consider stopping today.';
  }

  updateLights(status);
}

function clampScores() {
  state.dailyLossUsed = Math.max(0, Math.min(100, state.dailyLossUsed));
  state.drawdownRemaining = Math.max(0, state.drawdownRemaining);
  state.consistency = Math.max(20, Math.min(99, state.consistency));
  state.survival = Math.max(15, Math.min(99, state.survival));
}

document.querySelectorAll('.log-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const result = btn.dataset.result;
    state.tradesToday += 1;

    if (result === 'win') {
      state.lossesInRow = 0;
      state.consistency += 2;
      state.survival += 1;
      state.dailyLossUsed = Math.max(0, state.dailyLossUsed - 4);
      state.drawdownRemaining += 75;
      els.quickLogMessage.textContent = 'Win recorded. Discipline profile improved.';
    }

    if (result === 'loss') {
      state.lossesInRow += 1;
      state.consistency -= 5;
      state.survival -= 4;
      state.dailyLossUsed += 14;
      state.drawdownRemaining -= 125;
      els.quickLogMessage.textContent = 'Loss recorded. Watch your pace and daily limit.';
    }

    if (result === 'be') {
      state.lossesInRow = 0;
      state.consistency += 0;
      state.survival += 0;
      els.quickLogMessage.textContent = 'Break-even recorded. Capital preserved.';
    }

    clampScores();
    render();
  });
});

els.riskForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const accountSize = parseFloat(document.getElementById('accountSize').value);
  const dailyLimit = parseFloat(document.getElementById('dailyLimit').value);
  const riskPercent = parseFloat(document.getElementById('riskPercent').value);
  const entry = parseFloat(document.getElementById('entryPrice').value);
  const stop = parseFloat(document.getElementById('stopLoss').value);
  const takeProfit = parseFloat(document.getElementById('takeProfit').value);
  const pointValue = parseFloat(document.getElementById('pointValue').value);

  const riskDollars = accountSize * (riskPercent / 100);
  const stopDistance = Math.abs(entry - stop);
  const rewardDistance = Math.abs(takeProfit - entry);
  const riskPerContract = stopDistance * pointValue;
  const contracts = riskPerContract > 0 ? Math.max(1, Math.floor(riskDollars / riskPerContract)) : 0;
  const rr = stopDistance > 0 ? rewardDistance / stopDistance : 0;
  const dailyImpact = dailyLimit > 0 ? (riskDollars / dailyLimit) * 100 : 0;

  els.riskOutput.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(riskDollars);
  els.contractsOutput.textContent = contracts;
  els.rrOutput.textContent = `1 : ${rr.toFixed(2)}`;
  els.impactOutput.textContent = `${dailyImpact.toFixed(0)}%`;

  if (dailyImpact >= 80 || contracts === 0) {
    els.validationBox.className = 'validation danger-box';
    els.validationTitle.textContent = 'RULE VIOLATION RISK';
    els.validationCopy.textContent = 'This trade could put your funded account at risk. Size down or skip it.';
  } else if (dailyImpact >= 45) {
    els.validationBox.className = 'validation warning-box';
    els.validationTitle.textContent = 'CAUTION';
    els.validationCopy.textContent = 'This trade uses a large portion of your daily loss limit. Be selective.';
  } else {
    els.validationBox.className = 'validation safe-box';
    els.validationTitle.textContent = 'VALID TRADE';
    els.validationCopy.textContent = 'This setup is within your current daily loss parameters.';
  }
});

render();
document.getElementById('riskForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
