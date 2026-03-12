const riskForm = document.getElementById('riskForm');
const warningBox = document.getElementById('warningBox');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const statusMessage = document.getElementById('statusMessage');
const dailyLossUsed = document.getElementById('dailyLossUsed');
const logMessage = document.getElementById('logMessage');

function updateStatus(mode, message, lossUsedValue) {
  statusDot.className = 'status-dot';
  warningBox.className = 'warning-box';

  if (mode === 'safe') {
    statusDot.classList.add('safe');
    statusText.textContent = 'SAFE';
    warningBox.classList.add('safe');
  } else if (mode === 'caution') {
    statusDot.classList.add('caution');
    statusText.textContent = 'CAUTION';
    warningBox.classList.add('caution');
  } else {
    statusDot.classList.add('stop');
    statusText.textContent = 'STOP TRADING';
    warningBox.classList.add('stop');
  }

  statusMessage.textContent = message;
  if (lossUsedValue) {
    dailyLossUsed.textContent = lossUsedValue;
    document.getElementById('heroLoss').textContent = lossUsedValue;
  }
}

function formatMoney(value) {
  return `$${value.toFixed(2)}`;
}

function calculateRisk(event) {
  event.preventDefault();

  const accountSize = Number(document.getElementById('accountSize').value);
  const dailyLossLimit = Number(document.getElementById('dailyLossLimit').value);
  const riskPercent = Number(document.getElementById('riskPercent').value);
  const entryPrice = Number(document.getElementById('entryPrice').value);
  const stopLoss = Number(document.getElementById('stopLoss').value);
  const takeProfit = Number(document.getElementById('takeProfit').value);

  const stopDistance = Math.abs(entryPrice - stopLoss);
  const rewardDistance = Math.abs(takeProfit - entryPrice);
  const riskPerTrade = accountSize * (riskPercent / 100);
  const positionSize = stopDistance > 0 ? riskPerTrade / stopDistance : 0;
  const rrRatio = stopDistance > 0 ? rewardDistance / stopDistance : 0;
  const lossImpact = dailyLossLimit > 0 ? (riskPerTrade / dailyLossLimit) * 100 : 0;

  document.getElementById('riskPerTrade').textContent = formatMoney(riskPerTrade);
  document.getElementById('stopDistance').textContent = stopDistance.toFixed(2);
  document.getElementById('positionSize').textContent = `${positionSize.toFixed(2)} units`;
  document.getElementById('rrRatio').textContent = `1:${rrRatio.toFixed(2)}`;
  document.getElementById('lossImpact').textContent = `${lossImpact.toFixed(1)}%`;

  let mode = 'safe';
  let message = 'You are trading within your risk plan.';

  if (stopDistance <= 0 || takeProfit === entryPrice) {
    mode = 'stop';
    message = 'Invalid trade setup. Check entry, stop loss, and take profit.';
    warningBox.textContent = message;
    updateStatus(mode, message, '100%');
    return;
  }

  if (lossImpact >= 100 || riskPercent > 2) {
    mode = 'stop';
    message = 'This trade could violate your prop firm rules and threaten your account.';
  } else if (lossImpact >= 70 || rrRatio < 1.2) {
    mode = 'caution';
    message = 'Risk is increasing. Review the setup carefully before entering.';
  }

  warningBox.textContent = message;
  updateStatus(mode, message, `${Math.min(lossImpact, 100).toFixed(0)}%`);
}

riskForm.addEventListener('submit', calculateRisk);

const logButtons = document.querySelectorAll('.log-btn');
let trades = 3;
let consistency = 86;
let survival = 82;
let streak = 1;

logButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const result = button.dataset.result;
    trades += 1;
    document.getElementById('tradesToday').textContent = trades;
    document.getElementById('heroTrades').textContent = trades;

    if (result === 'LOSS') {
      streak += 1;
      consistency = Math.max(50, consistency - 4);
      survival = Math.max(45, survival - 5);
      logMessage.textContent = `Logged: ${result}. Caution — losing streak increased.`;
    } else if (result === 'WIN') {
      streak = 0;
      consistency = Math.min(99, consistency + 1);
      survival = Math.min(97, survival + 1);
      logMessage.textContent = `Logged: ${result}. Strong discipline helps account survival.`;
    } else {
      streak = Math.max(0, streak - 1);
      logMessage.textContent = `Logged: ${result}. No major score change.`;
    }

    document.getElementById('lossStreak').textContent = streak;
    document.getElementById('consistencyScore').textContent = consistency;
    document.getElementById('heroConsistency').textContent = consistency;
    document.getElementById('survivalScore').textContent = `${survival}%`;

    if (streak >= 3) {
      updateStatus('stop', 'High probability of rule violation. Consider stopping today.', dailyLossUsed.textContent);
      warningBox.textContent = 'High-risk behavior detected after multiple losses.';
      warningBox.className = 'warning-box stop';
    }
  });
});

riskForm.dispatchEvent(new Event('submit'));
