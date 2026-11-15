import {isCashRide} from '../mobile/ridePayment.mjs';
import {refreshDailyReports} from './financeReports.js';
export const COMMISSION_BPS=700;
export const financialPolicy=state=>({cashThresholdCDF:19000,cashThresholdUSD:null,...state.finance?.policy});
const currencies=['CDF','USD'],methods=['cash','mobile_money','card','bank'];
const activeEntries=state=>(state.finance?.entries||[]).filter(entry=>!entry.voidedAt);
const sum=(entries,predicate)=>entries.filter(predicate).reduce((total,entry)=>total+entry.amountMinor,0);

function statusForBalances(state,balances,id){
 const policy=financialPolicy(state),previous=state.finance?.cashRestrictions?.[id],debts={CDF:0,USD:0},currencies=[];
 for(const currency of ['CDF','USD']){
  debts[currency]=Math.max(0,-(balances.find(driver=>driver.id===id&&driver.currency===currency)?.balance||0));
  const threshold=policy['cashThreshold'+currency];
  if(debts[currency]>0&&((threshold&&debts[currency]>=threshold)||(previous?.active&&previous.currencies.includes(currency))))currencies.push(currency);
 }
 return {cashRestricted:currencies.length>0,currencies,debtCDF:debts.CDF,debtUSD:debts.USD,thresholdCDF:policy.cashThresholdCDF,thresholdUSD:policy.cashThresholdUSD,since:previous?.since||null};
}

export function driverFinancialStatus(state,id,view){return statusForBalances(state,(view||financeOverview(state)).drivers,id);}

function syncHolds(state){
 const balances=financeOverview(state).drivers,ledger=state.finance,changes=[];ledger.cashRestrictions||={};
 const ids=new Set([...balances.map(driver=>driver.id),...Object.keys(ledger.cashRestrictions)]);
 for(const id of ids){
  const previous=ledger.cashRestrictions[id],status=statusForBalances(state,balances,id);
  if(status.cashRestricted){ledger.cashRestrictions[id]={active:true,currencies:status.currencies,since:previous?.active?previous.since:new Date().toISOString()};if(!previous?.active)changes.push({id,cashRestricted:true});}
  else if(previous?.active){ledger.cashRestrictions[id]={...previous,active:false,clearedAt:new Date().toISOString()};changes.push({id,cashRestricted:false});}
 }
 return changes;
}

function commitFinance(state,ledger,initialChanges=[]){
 const candidate={...state,finance:ledger};
 const holdChanges=[...initialChanges,...syncHolds(candidate)];
 refreshDailyReports(candidate,financeOverview);
 state.finance=ledger;return holdChanges;
}

export function amountToMinor(value,currency){
 if(!currencies.includes(currency)||!/^\d{1,10}(?:\.\d{1,2})?$/.test(String(value)))throw Error('Montant invalide. Utilisez un nombre positif, sans séparateur de milliers.');
 const [whole,fraction='']=String(value).split('.');
 if(currency==='CDF'&&Number(fraction)!==0)throw Error('Indiquez un montant entier en FC.');
 const amount=Number(whole)*(currency==='USD'?100:1)+(currency==='USD'?Number(fraction.padEnd(2,'0')):0);
 if(!Number.isSafeInteger(amount)||amount<=0||amount>1000000000000)throw Error('Montant invalide ou trop élevé.');
 return amount;
}

function contractsFor(state){
 const contracts={...(state.finance?.contracts||{})};
 for(const ride of state.rides||[]){
  if(ride.status!=='completed'||!ride.driverId||contracts[ride.id])continue;
  const currency=ride.currency||'CDF',driver=(state.drivers||[]).find(item=>item.id===ride.driverId);
  let fareMinor;try{fareMinor=amountToMinor(ride.total,currency)}catch{continue}
  contracts[ride.id]={id:ride.id,driverId:ride.driverId,driverName:driver?.name||ride.driverName||'Chauffeur',fareMinor,currency,commissionBps:ride.commissionBps??COMMISSION_BPS,completedAt:ride.completedAt||ride.departure||ride.createdAt};
 }
 return contracts;
}

export function snapshotCompletedRide(state,ride){
 if(ride.status!=='completed')return;
 ride.completedAt||=new Date().toISOString();ride.commissionBps??=COMMISSION_BPS;
 state.finance||={entries:[],contracts:{}};
 state.finance.contracts=contractsFor(state);
}

export function financeOverview(state){
 const contracts=Object.values(contractsFor(state)),entries=activeEntries(state),drivers=new Map();
 const totals=Object.fromEntries(currencies.map(currency=>[currency,{cashReceipts:0,electronicReceipts:0,companyCash:0,companyElectronic:0,driverCash:0,commission:0,unpaid:0,payable:0,receivable:0,payouts:0,accounts:Object.fromEntries(methods.map(method=>[method,0]))}]));
 function driverFor(id,currency,name){
  const key=id+':'+currency;
  if(!drivers.has(key))drivers.set(key,{id,currency,name:name||(state.drivers||[]).find(driver=>driver.id===id)?.name||'Chauffeur',earned:0,held:0,remitted:0,paid:0,balance:0,cashHeld:0});
  return drivers.get(key);
 }
 const courses=contracts.map(contract=>{
  const receipts=entries.filter(entry=>entry.kind==='receipt'&&entry.rideId===contract.id);
  const received=sum(receipts,()=>true),commission=Math.round(received*contract.commissionBps/10000),share=received-commission;
  const driver=driverFor(contract.driverId,contract.currency,contract.driverName);
  driver.earned+=share;driver.held+=sum(receipts,entry=>entry.holder==='driver');
  totals[contract.currency].commission+=commission;totals[contract.currency].unpaid+=contract.fareMinor-received;
  return {...contract,received,remaining:contract.fareMinor-received,commission,driverShare:share};
 });
 for(const entry of entries){
  const total=totals[entry.currency];
  if(entry.kind==='receipt'){
   total[entry.method==='cash'?'cashReceipts':'electronicReceipts']+=entry.amountMinor;
   if(entry.holder==='company')total.accounts[entry.method]+=entry.amountMinor;
  }else{
   const driver=driverFor(entry.driverId,entry.currency,entry.driverName);
   if(entry.kind==='remittance'){driver.remitted+=entry.amountMinor;total.accounts[entry.method]+=entry.amountMinor;}
   if(entry.kind==='payout'){driver.paid+=entry.amountMinor;total.payouts+=entry.amountMinor;total.accounts[entry.method]-=entry.amountMinor;}
  }
 }
 for(const driver of drivers.values()){
  driver.cashHeld=driver.held-driver.remitted;
  driver.balance=driver.earned-driver.held+driver.remitted-driver.paid;
  totals[driver.currency].driverCash+=driver.cashHeld;
  totals[driver.currency].payable+=Math.max(0,driver.balance);
  totals[driver.currency].receivable+=Math.max(0,-driver.balance);
 }
 for(const total of Object.values(totals)){
  total.companyCash=total.accounts.cash;
  total.companyElectronic=total.accounts.mobile_money+total.accounts.card+total.accounts.bank;
 }
 return {unpricedCourses:(state.rides||[]).filter(ride=>ride.status==='completed'&&ride.driverId&&!contracts.some(contract=>contract.id===ride.id)).map(ride=>ride.id),commissionBps:COMMISSION_BPS,merchantConnected:false,automaticPayouts:false,totals,policy:financialPolicy(state),dailyReports:Object.values(state.finance?.dailyReports||{}).map(report=>({...report,closed:report.closed||report.day<new Date(Date.now()+3600000).toISOString().slice(0,10)})).sort((a,b)=>b.day.localeCompare(a.day)),drivers:[...drivers.values()].map(driver=>({...driver,financialStatus:statusForBalances(state,[...drivers.values()],driver.id)})),courses,entries:(state.finance?.entries||[]).map(({requestSignature,idempotencyKey,...entry})=>entry).slice().reverse()};
}

function validateHistoricalPayouts(state,ledger){
 const entries=[];
 for(const entry of ledger.entries){
  if(entry.voidedAt)continue;
  if(entry.kind==='payout'){
   const view=financeOverview({...state,finance:{...ledger,entries}});
   const balance=view.drivers.find(driver=>driver.id===entry.driverId&&driver.currency===entry.currency)?.balance||0;
   if(entry.amountMinor>Math.max(0,balance))throw Error('Cette correction invaliderait un versement antérieur. Annulez d’abord le versement concerné.');
  }
  entries.push(entry);
 }
}

function validateBalances(view){
 for(const total of Object.values(view.totals)){
  if(Object.values(total.accounts).some(value=>value<0))throw Error('Solde de caisse ou du compte électronique insuffisant. Vérifiez les encaissements et le mode de versement.');
 }
 for(const driver of view.drivers){
  if(driver.cashHeld<0)throw Error('La remise dépasse les espèces encore détenues par ce chauffeur.');
 }
 if(view.courses.some(course=>course.received>course.fareMinor))throw Error('Le total encaissé dépasse le prix de la course.');
}

export function financeAction(state,input,user){
 if(user?.role!=='primary'||user.blocked)throw Error('Seul l’admin principal gère les encaissements et les versements.');
 const note=typeof input.note==='string'?input.note.trim():'';
 if(note.length<3||note.length>300)throw Error('Ajoutez un commentaire de 3 à 300 caractères pour cette écriture.');
 const ledger={...structuredClone(state.finance||{}),entries:structuredClone(state.finance?.entries||[]),contracts:contractsFor(state)};
 const initialChanges=syncHolds({...state,finance:ledger});
 if(input.action==='finance.policy'){
  const cashThresholdCDF=amountToMinor(input.thresholdCDF,'CDF');
  ledger.policy={cashThresholdCDF,cashThresholdUSD:input.thresholdUSD?amountToMinor(input.thresholdUSD,'USD'):null};
  const holdChanges=commitFinance(state,ledger,initialChanges);return {ok:true,id:'commission-policy',holdChanges};
 }
 if(input.action==='finance.report'){const holdChanges=commitFinance(state,ledger,initialChanges);return {ok:true,id:new Date(Date.now()+3600000).toISOString().slice(0,10),holdChanges};}
 if(input.action==='finance.void'){
  const entry=ledger.entries.find(entry=>entry.id===input.id);
  if(!entry)throw Error('Écriture introuvable.');
  if(entry.voidedAt)return {ok:true,id:entry.id,replayed:true};
  entry.voidedAt=new Date().toISOString();entry.voidedBy=user.id;entry.voidNote=note;
  validateBalances(financeOverview({...state,finance:ledger}));validateHistoricalPayouts(state,ledger);const holdChanges=commitFinance(state,ledger,initialChanges);
  return {ok:true,id:entry.id,holdChanges};
 }
 const kind=input.action?.replace('finance.','');
 if(!['receipt','remittance','payout'].includes(kind))throw Error('Opération financière inconnue.');
 if(!/^[A-Za-z0-9-]{16,100}$/.test(input.idempotencyKey||''))throw Error('Identifiant de règlement invalide. Actualisez la page.');
 const contract=kind==='receipt'?ledger.contracts[input.rideId]:null;
 if(kind==='receipt'&&!contract)throw Error('Choisissez une course terminée avec un chauffeur affecté.');
 const currency=contract?.currency||input.currency;
 const amountMinor=amountToMinor(input.amount,currency),method=input.method;
 if(!methods.includes(method)||(kind!=='receipt'&&method==='card'))throw Error('Mode de règlement invalide.');
 const driverId=contract?.driverId||input.driverId;
 const knownDriver=Object.values(ledger.contracts).find(item=>item.driverId===driverId&&item.currency===currency);
 if(!knownDriver)throw Error('Aucun solde de course pour ce chauffeur et cette devise.');
 const holder=kind==='receipt'?input.holder:'company';
 if(kind==='receipt'&&!['company','driver'].includes(holder))throw Error('Indiquez qui a reçu le paiement.');
 if(kind==='receipt'&&holder==='driver'&&method!=='cash')throw Error('Les paiements électroniques de cette caisse doivent être reçus sur le compte En Route.');
 const reference=typeof input.reference==='string'?input.reference.trim():'';
 if(reference.length>100||(method!=='cash'&&reference.length<3))throw Error('Indiquez la référence réelle de la transaction électronique (3 à 100 caractères).');
 const occurredAt=input.occurredAt||new Date().toISOString();
 if(!Number.isFinite(Date.parse(occurredAt))||Date.parse(occurredAt)>Date.now()+300000)throw Error('Date de règlement invalide ou future.');
 const normalized={kind,rideId:contract?.id||null,driverId,driverName:knownDriver.driverName,currency,amountMinor,method,holder,reference,occurredAt:input.occurredAt||null,note};
 const signature=JSON.stringify(normalized);
 const previous=ledger.entries.find(entry=>entry.idempotencyKey===input.idempotencyKey);
 if(previous){if(previous.requestSignature!==signature)throw Error('Ce règlement a déjà été envoyé avec des informations différentes.');return {ok:true,id:previous.id,replayed:true};}
 if(reference&&method!=='cash'&&ledger.entries.some(entry=>!entry.voidedAt&&entry.method!=='cash'&&entry.reference.toLocaleLowerCase()===reference.toLocaleLowerCase()))throw Error('Cette référence électronique est déjà enregistrée.');
 if(kind==='payout'){
  const before=financeOverview({...state,finance:ledger});
  const balance=before.drivers.find(driver=>driver.id===driverId&&driver.currency===currency)?.balance||0;
  if(amountMinor>Math.max(0,balance))throw Error('Ce versement dépasse le montant dû au chauffeur sur les sommes encaissées.');
 }
 const id=crypto.randomUUID();
 ledger.entries.push({...normalized,id,occurredAt:new Date(occurredAt).toISOString(),recordedAt:new Date().toISOString(),actor:user.id,actorName:user.name,idempotencyKey:input.idempotencyKey,requestSignature:signature,source:'manual',reference:reference||'CAISSE-'+id.slice(0,8).toUpperCase()});
 validateBalances(financeOverview({...state,finance:ledger}));
 const holdChanges=commitFinance(state,ledger,initialChanges);
 return {ok:true,id,holdChanges};
}

export function recordDriverCash(state,ride,user){
 const approved=(state.drivers||[]).some(driver=>driver.id===user?.id&&driver.status==='approved'&&!driver.demo);
 if(!approved||user?.role!=='client'||user?.blocked||(state.users||[]).some(account=>account.id===user.id&&account.blocked)||ride.driverId!==user.id||ride.status!=='completed'||!isCashRide(ride))throw Error('Seul le chauffeur affecté peut déclarer les espèces de sa course terminée.');
 const ledger={...structuredClone(state.finance||{}),entries:structuredClone(state.finance?.entries||[]),contracts:contractsFor(state)};
 const key='driver-cash-'+ride.id,previous=ledger.entries.find(entry=>entry.idempotencyKey===key);
 if(previous){if(previous.voidedAt)throw Error('Cette déclaration a été corrigée par l’administration. Contactez En Route.');return {id:previous.id,replayed:true};}
 const contract=ledger.contracts[ride.id];if(!contract)throw Error('Le montant de cette course doit être vérifié par l’administration.');
 const received=ledger.entries.filter(entry=>!entry.voidedAt&&entry.kind==='receipt'&&entry.rideId===ride.id).reduce((sum,entry)=>sum+entry.amountMinor,0),amountMinor=contract.fareMinor-received;
 if(amountMinor<=0)return {replayed:true};
 const initialChanges=syncHolds({...state,finance:ledger}),id=crypto.randomUUID(),now=new Date().toISOString();
 ledger.entries.push({id,idempotencyKey:key,kind:'receipt',rideId:ride.id,driverId:user.id,driverName:contract.driverName,currency:contract.currency,amountMinor,method:'cash',holder:'driver',reference:'CHAUFFEUR-'+id.slice(0,8).toUpperCase(),occurredAt:now,recordedAt:now,actor:user.id,actorName:user.name||contract.driverName,source:'driver_declared',note:'Espèces reçues déclarées par le chauffeur à la fin de course.'});
 validateBalances(financeOverview({...state,finance:ledger}));
 const holdChanges=commitFinance(state,ledger,initialChanges);
 return {id,holdChanges};
}
