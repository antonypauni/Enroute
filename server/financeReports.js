export const kinshasaDay=value=>new Date(Number(value)+3600000).toISOString().slice(0,10);
const dayStart=day=>Date.parse(day+'T00:00:00+01:00');

// Financial entries are journaled by their server registration date. A later
// correction belongs to the correction day, never rewrites a closed report.
export function refreshDailyReports(state,overview,now=Date.now()){
 const ledger=state.finance,entries=ledger.entries||[],today=kinshasaDay(now);
 ledger.dailyReports||={};
 const existing=Object.keys(ledger.dailyReports),eventDays=entries.flatMap(entry=>[entry.recordedAt,entry.voidedAt].filter(Boolean).map(value=>kinshasaDay(Date.parse(value))));
 const first=[today,...existing,...eventDays].sort()[0];
 function asOf(timestamp){
  const contracts=Object.fromEntries(Object.entries(ledger.contracts||{}).filter(([,contract])=>!contract.completedAt||Date.parse(contract.completedAt)<=timestamp));
  const selected=entries.filter(entry=>Date.parse(entry.recordedAt)<=timestamp).map(entry=>entry.voidedAt&&Date.parse(entry.voidedAt)>timestamp?{...entry,voidedAt:null}:entry);
  return overview({...state,rides:[],finance:{...ledger,contracts,entries:selected,dailyReports:{}}});
 }
 for(let time=dayStart(first);time<=dayStart(today);time+=86400000){
  const day=kinshasaDay(time),saved=ledger.dailyReports[day];
  if(saved&&day<today){saved.closed=true;saved.closedAt||=new Date(now).toISOString();continue;}
  const end=Math.min(now,time+86400000-1),opening=asOf(time-1),closing=asOf(end);
  const flows={CDF:{cash:0,electronic:0,remittances:0,payouts:0},USD:{cash:0,electronic:0,remittances:0,payouts:0}};
  let count=0,corrections=0;
  for(const entry of entries){
   for(const [at,sign] of [[entry.recordedAt,1],[entry.voidedAt,-1]]){
    if(!at||Date.parse(at)<time||Date.parse(at)>end)continue;
    if(sign===1)count++;else corrections++;
    const field=entry.kind==='receipt'?(entry.method==='cash'?'cash':'electronic'):entry.kind==='remittance'?'remittances':'payouts';
    flows[entry.currency][field]+=sign*entry.amountMinor;
   }
  }
  ledger.dailyReports[day]={day,updatedAt:new Date(now).toISOString(),closed:day<today,closedAt:day<today?new Date(now).toISOString():null,entryCount:count,correctionCount:corrections,totals:Object.fromEntries(['CDF','USD'].map(currency=>[currency,{...flows[currency],commission:closing.totals[currency].commission-opening.totals[currency].commission,openingCash:opening.totals[currency].companyCash,closingCash:closing.totals[currency].companyCash,openingElectronic:opening.totals[currency].companyElectronic,closingElectronic:closing.totals[currency].companyElectronic,driverCash:closing.totals[currency].driverCash,payable:closing.totals[currency].payable,receivable:closing.totals[currency].receivable}]))};
 }
}
