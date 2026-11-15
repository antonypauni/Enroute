export const COMMISSION_BPS=700;
const currencies=['CDF','USD'],methods=['cash','mobile_money','card','bank'];
const activeEntries=state=>(state.finance?.entries||[]).filter(entry=>!entry.voidedAt);
const sum=(entries,predicate)=>entries.filter(predicate).reduce((total,entry)=>total+entry.amountMinor,0);

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
 return {unpricedCourses:(state.rides||[]).filter(ride=>ride.status==='completed'&&ride.driverId&&!contracts.some(contract=>contract.id===ride.id)).map(ride=>ride.id),commissionBps:COMMISSION_BPS,merchantConnected:false,automaticPayouts:false,totals,drivers:[...drivers.values()],courses,entries:(state.finance?.entries||[]).map(({requestSignature,idempotencyKey,...entry})=>entry).slice().reverse()};
}

function validateBalances(view){
 for(const total of Object.values(view.totals)){
  if(Object.values(total.accounts).some(value=>value<0))throw Error('Solde de caisse ou du compte électronique insuffisant. Vérifiez les encaissements et le mode de versement.');
 }
 for(const driver of view.drivers){
  if(driver.cashHeld<0)throw Error('La remise dépasse les espèces encore détenues par ce chauffeur.');
  if(driver.paid>Math.max(0,driver.earned-driver.held+driver.remitted))throw Error('Ce versement dépasse le montant dû au chauffeur sur les sommes encaissées.');
 }
 if(view.courses.some(course=>course.received>course.fareMinor))throw Error('Le total encaissé dépasse le prix de la course.');
}

export function financeAction(state,input,user){
 if(user?.role!=='primary'||user.blocked)throw Error('Seul l’admin principal gère les encaissements et les versements.');
 const note=typeof input.note==='string'?input.note.trim():'';
 if(note.length<3||note.length>300)throw Error('Ajoutez un commentaire de 3 à 300 caractères pour cette écriture.');
 const ledger={entries:structuredClone(state.finance?.entries||[]),contracts:contractsFor(state)};
 if(input.action==='finance.void'){
  const entry=ledger.entries.find(entry=>entry.id===input.id);
  if(!entry)throw Error('Écriture introuvable.');
  if(entry.voidedAt)return {ok:true,id:entry.id,replayed:true};
  entry.voidedAt=new Date().toISOString();entry.voidedBy=user.id;entry.voidNote=note;
  validateBalances(financeOverview({...state,finance:ledger}));state.finance=ledger;
  return {ok:true,id:entry.id};
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
 const id=crypto.randomUUID();
 ledger.entries.push({...normalized,id,occurredAt:new Date(occurredAt).toISOString(),recordedAt:new Date().toISOString(),actor:user.id,actorName:user.name,idempotencyKey:input.idempotencyKey,requestSignature:signature,source:'manual',reference:reference||'CAISSE-'+id.slice(0,8).toUpperCase()});
 validateBalances(financeOverview({...state,finance:ledger}));
 state.finance=ledger;
 return {ok:true,id};
}
