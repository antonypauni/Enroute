import test from 'node:test';
import assert from 'node:assert/strict';
import {financeAction,financeOverview,driverFinancialStatus} from './finance.js';
import {refreshDailyReports,kinshasaDay} from './financeReports.js';
import {rideAction,rideState} from './rides.js';
import {manageAdmin} from './administration.js';
const admin={id:'admin',name:'Admin test',role:'primary'},driver={id:'driver',name:'Chauffeur',role:'client'};
const fixture=()=>({users:[admin,driver],drivers:[{id:'driver',name:'Chauffeur',status:'approved',category:'standard'}],rides:[{id:'completed',driverId:'driver',status:'completed',total:400000,completedAt:new Date().toISOString()},{id:'next',ownerId:'passenger',status:'requested',category:'standard',immediate:true}],bookings:[],trips:[]});
const receipt={action:'finance.receipt',rideId:'completed',amount:'400000',method:'cash',holder:'driver',note:'Espèces reçues et vérifiées',idempotencyKey:'hold-test-receipt-001'};
test('19 000 FC : espèces refusées, compte actif et courses électroniques confirmées autorisées',async()=>{
 const state=fixture();manageAdmin(state,{...receipt,amount:'271429'},admin);
 const status=driverFinancialStatus(state,'driver');assert.equal(status.debtCDF,19000);assert.equal(status.cashRestricted,true);assert.equal(state.users[1].blocked,undefined);
 assert.ok(rideState(state,driver).drivers.some(item=>item.id==='driver'));
 await assert.rejects(rideAction('/api/rides/accept',{id:'next'},state,driver),/espèces/);
 assert.throws(()=>manageAdmin(state,{action:'ride.assign',id:'next',driverId:'driver'},admin),/Mode de paiement/);
 state.rides.push({id:'electronic',ownerId:'passenger',status:'requested',category:'standard',immediate:true,paymentMethod:'mobile_money',paymentStatus:'paid',paymentSource:'merchant'});
 await rideAction('/api/rides/accept',{id:'electronic'},state,driver);assert.equal(state.rides[2].status,'accepted');
 assert.ok(state.adminAudit.some(event=>event.action==='driver.cash.restrict'));
});
test('règlement partiel et reprise des espèces après régularisation intégrale',async()=>{
 const state=fixture();manageAdmin(state,receipt,admin);
 for(const [amount,key] of [['10000','partial'],['18000','final']]){
  manageAdmin(state,{action:'finance.remittance',driverId:'driver',currency:'CDF',amount,method:'mobile_money',reference:'REGULARISE-'+key,note:'Règlement groupé vérifié',idempotencyKey:'regularise-commission-'+key},admin);
  assert.equal(driverFinancialStatus(state,'driver').cashRestricted,key==='partial');
 }
 await rideAction('/api/rides/accept',{id:'next'},state,driver);assert.equal(state.rides[1].status,'accepted');
 assert.ok(state.adminAudit.some(event=>event.action==='driver.cash.restore'));
});
test('des encaissements électroniques compensent la dette cumulée, sans virement après chaque course',()=>{
 const state=fixture();financeAction(state,{...receipt,amount:'271429'},admin);
 for(const [id,total] of [['electronic-a',10000],['electronic-b',11000]]){
  state.rides.push({id,driverId:'driver',status:'completed',total});
  financeAction(state,{...receipt,rideId:id,amount:String(total),method:'mobile_money',holder:'company',reference:'MERCHANT-'+id,idempotencyKey:'merchant-receipt-'+id},admin);
  assert.equal(driverFinancialStatus(state,'driver').cashRestricted,id==='electronic-a');
 }
 assert.equal(financeOverview(state).drivers[0].balance,530);assert.equal(state.finance.entries.filter(entry=>entry.kind==='remittance').length,0);
});
test('aucune fausse confirmation électronique : non confirmé refusé et déclaration client impossible',async()=>{
 const state=fixture();financeAction(state,receipt,admin);
 state.rides.push({id:'unpaid',ownerId:'passenger',status:'requested',category:'standard',immediate:true,paymentMethod:'card',paymentStatus:'pending'});
 await assert.rejects(rideAction('/api/rides/accept',{id:'unpaid'},state,driver));
 const form={from:'Lemba',to:'Gombe',category:'standard',immediate:true,paymentMethod:'mobile_money',paymentStatus:'paid',expectedTotal:13000};
 await assert.rejects(rideAction('/api/rides/request',form,state,{id:'another',role:'client'}),/confirmé par le serveur/);
 await assert.rejects(rideAction('/api/rides/request',{...form,paymentStatus:undefined},state,{id:'another',role:'client'}),/compte marchand/);
});
test('un versement ancien reste légitime après une nouvelle commission en espèces',()=>{
 const state=fixture();state.rides.push({id:'old',driverId:'driver',status:'completed',total:10000});
 financeAction(state,{...receipt,rideId:'old',amount:'10000',holder:'company',idempotencyKey:'old-company-income-001'},admin);
 const paid={action:'finance.payout',driverId:'driver',currency:'CDF',amount:'9300',method:'cash',note:'Ancienne course réglée',idempotencyKey:'old-driver-payout-001'};
 const payout=financeAction(state,paid,admin);financeAction(state,receipt,admin);
 assert.equal(driverFinancialStatus(state,'driver').debtCDF,28000);assert.equal(financeAction(state,paid,admin).replayed,true);
 assert.throws(()=>financeAction(state,{action:'finance.void',id:state.finance.entries[0].id,note:'Correction du revenu antérieur'},admin));
 financeAction(state,{action:'finance.void',id:payout.id,note:'Correction du versement antérieur'},admin);
});
test('seuil configurable par le principal, devises séparées',()=>{
 const state=fixture();financeAction(state,{action:'finance.policy',thresholdCDF:'30000',note:'Politique de test'},admin);financeAction(state,receipt,admin);
 assert.equal(driverFinancialStatus(state,'driver').cashRestricted,false);
 assert.throws(()=>financeAction(state,{action:'finance.policy',thresholdCDF:'28000',note:'Politique de test'},{role:'secondary'}));
 financeAction(state,{action:'finance.policy',thresholdCDF:'28000',thresholdUSD:'20',note:'Politique de test'},admin);
 assert.equal(driverFinancialStatus(state,'driver').cashRestricted,true);assert.equal(financeOverview(state).policy.cashThresholdUSD,2000);
});
test('bilan sauvegardé à chaque opération ; correction ultérieure sans réécriture de la journée clôturée',()=>{
 const state=fixture();financeAction(state,{...receipt,holder:'company',amount:'10000'},admin);
 const today=kinshasaDay(Date.now());assert.equal(state.finance.dailyReports[today].totals.CDF.cash,10000);
 // Shift this synthetic entry and contract to yesterday, then rebuild once.
 const yesterday=kinshasaDay(Date.now()-86400000),entry=state.finance.entries[0];
 entry.recordedAt=yesterday+'T12:00:00+01:00';entry.occurredAt=entry.recordedAt;
 state.finance.contracts.completed.completedAt=yesterday+'T10:00:00+01:00';state.finance.dailyReports={};
 refreshDailyReports(state,financeOverview);
 const before=structuredClone(state.finance.dailyReports[yesterday]);assert.equal(before.closed,true);assert.equal(before.totals.CDF.cash,10000);
 financeAction(state,{action:'finance.void',id:entry.id,note:'Correction comptable vérifiée'},admin);
 assert.deepEqual(state.finance.dailyReports[yesterday].totals,before.totals);
 assert.equal(state.finance.dailyReports[today].totals.CDF.cash,-10000);assert.equal(state.finance.dailyReports[today].correctionCount,1);
 const count=Object.keys(state.finance.dailyReports).length;financeAction(state,{action:'finance.report',note:'Enregistrer le bilan du jour'},admin);assert.equal(Object.keys(state.finance.dailyReports).length,count);
});
