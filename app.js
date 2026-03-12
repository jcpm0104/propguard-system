const instrumentPresets = {
MNQ:{tickSize:0.25,tickValue:0.5,pointValue:2},
NQ:{tickSize:0.25,tickValue:5,pointValue:20},
MES:{tickSize:0.25,tickValue:1.25,pointValue:5},
ES:{tickSize:0.25,tickValue:12.5,pointValue:50},
CL:{tickSize:0.01,tickValue:10,pointValue:1000},
CUSTOM:{tickSize:0.25,tickValue:1,pointValue:4}
};

const state={
propFirm:'Apex',
instrument:'MNQ',
startingBalance:50000,
currentBalance:50000,
highestBalance:50000,
dailyLossLimit:2000,
trailingDrawdown:2500,
maxRiskPercent:1,
tradesToday:0,
lossesInRow:0,
tradeResults:[],
balanceHistory:[50000],
sessions:{
London:{trades:0,pnl:0},
"New York":{trades:0,pnl:0},
Asia:{trades:0,pnl:0}
},
lastCalculation:{
riskPerTrade:0,
suggestedContracts:0,
dailyImpact:0,
drawdownImpact:0
}
};

const $=(id)=>document.getElementById(id);

function formatMoney(value){
return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
}

function clamp(v,min,max){
return Math.max(min,Math.min(max,v));
}

function drawdownLimitLine(){
return state.highestBalance-state.trailingDrawdown;
}

function trailingDrawdownRemaining(){
return Math.max(0,state.currentBalance-drawdownLimitLine());
}

function dailyRiskUsedPercent(){
const todaysLoss=state.startingBalance<=state.currentBalance?0:state.startingBalance-state.currentBalance;
return clamp((todaysLoss/state.dailyLossLimit)*100,0,100);
}

function computeConsistency(){
let score=100;

score-=clamp(dailyRiskUsedPercent()*0.3,0,35);
score-=state.lossesInRow*8;
score-=Math.max(0,state.tradesToday-4)*3;

if(state.lastCalculation.riskPerTrade>state.currentBalance*(state.maxRiskPercent/100)){
score-=12;
}

if(state.lastCalculation.dailyImpact>30){
score-=8;
}

if(state.lossesInRow>=3&&state.lastCalculation.dailyImpact>10){
score-=10;
}

return clamp(Math.round(score),25,99);
}

function computeSurvival(consistency){
let score=consistency;

score-=clamp(dailyRiskUsedPercent()*0.2,0,20);

score-=trailingDrawdownRemaining()<state.trailingDrawdown*0.2?18:trailingDrawdownRemaining()<state.trailingDrawdown*0.4?8:0;

score-=state.lossesInRow*3;

return clamp(Math.round(score),15,99);
}

function riskHeatValue(consistency,survival){
const v=clamp((dailyRiskUsedPercent()*0.5)+((100-consistency)*0.3)+((100-survival)*0.2),0,100);
return Math.round(v);
}

function calculateTrade(){

const instrument=$('instrument')?.value||'MNQ';
const preset=instrumentPresets[instrument];

const entry=parseFloat($('entryInput')?.value||0);
const stop=parseFloat($('stopInput')?.value||0);
const tp=parseFloat($('takeProfitInput')?.value||0);

const manualContracts=parseFloat($('manualContractsInput')?.value||0);

const pointDistance=Math.abs(entry-stop);

const ticks=preset.tickSize>0?pointDistance/preset.tickSize:0;

const riskPerContract=ticks*preset.tickValue;

const suggestedRiskCap=state.currentBalance*(state.maxRiskPercent/100);

const suggestedContracts=riskPerContract>0?Math.max(1,Math.floor(suggestedRiskCap/riskPerContract)):0;

const contracts=manualContracts>0?manualContracts:suggestedContracts;

const riskPerTrade=riskPerContract*contracts;

const rewardDistance=Math.abs(tp-entry);

const rr=pointDistance>0?rewardDistance/pointDistance:0;

const dailyImpact=state.dailyLossLimit>0?(riskPerTrade/state.dailyLossLimit)*100:0;

const drawdownImpact=state.trailingDrawdown>0?(riskPerTrade/state.trailingDrawdown)*100:0;

state.lastCalculation={
riskPerTrade,
suggestedContracts,
dailyImpact,
drawdownImpact
};

$('suggestedSize').textContent=`${contracts} contracts`;
$('riskPerTradeOut').textContent=formatMoney(riskPerTrade);
$('rrOut').textContent=`1 : ${rr.toFixed(2)}`;
$('dailyImpactOut').textContent=`${dailyImpact.toFixed(1)}%`;

$('pointsOut').textContent=pointDistance.toFixed(2);
$('ticksOut').textContent=ticks.toFixed(0);
$('riskPerContractOut').textContent=formatMoney(riskPerContract);

$('riskImpactDailyOut').textContent=`${dailyImpact.toFixed(1)}%`;
$('riskImpactDrawdownOut').textContent=`${drawdownImpact.toFixed(1)}%`;

render();
}

function applyTrade(result){

const pnlBase=Math.abs(parseFloat($('tradePnl').value||0));
const session=$('tradeSession').value;

let pnl=0;

if(result==='win')pnl=pnlBase;
if(result==='loss')pnl=-pnlBase;

state.tradesToday+=1;

state.currentBalance+=pnl;

if(state.currentBalance>state.highestBalance){
state.highestBalance=state.currentBalance;
}

state.balanceHistory.push(state.currentBalance);

state.sessions[session].trades+=1;
state.sessions[session].pnl+=pnl;

if(result==='loss'){
state.lossesInRow+=1;
}else{
state.lossesInRow=0;
}

render();
}

document.querySelectorAll('.action-btn').forEach(btn=>{
btn.addEventListener('click',()=>{
applyTrade(btn.dataset.result);
});
});

$('riskForm')?.addEventListener('submit',(e)=>{
e.preventDefault();
calculateTrade();
});

function render(){

const consistency=computeConsistency();
const survival=computeSurvival(consistency);

const drawdownLeft=trailingDrawdownRemaining();
const dailyUsed=Math.round(dailyRiskUsedPercent());

$('dailyRiskUsed').textContent=`${dailyUsed}%`;
$('drawdownRemaining').textContent=formatMoney(drawdownLeft);
$('tradesToday').textContent=state.tradesToday;
$('currentBalance').textContent=formatMoney(state.currentBalance);

$('consistencyScore').textContent=`${consistency} / 100`;
$('survivalScore').textContent=`${survival}%`;

$('highestBalanceOut').textContent=formatMoney(state.highestBalance);
$('currentBalanceOut').textContent=formatMoney(state.currentBalance);

$('drawdownRemainingLarge').textContent=formatMoney(drawdownLeft);
$('distanceFromPeak').textContent=formatMoney(state.currentBalance-state.highestBalance);

const heat=riskHeatValue(consistency,survival);

$('heatFill').style.width=`${heat}%`;
}

window.propguardRefreshUI=render;

render();
