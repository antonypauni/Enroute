import test from 'node:test';
import assert from 'node:assert/strict';
import {financeOverview,financeAction,amountToMinor,snapshotCompletedRide} from './finance.js';
import {manageAdmin,adminOverview} from './administration.js';
const admin={id:'admin',name:'Administrateur test',role:'primary'};
const fixture=()=>({users:[admin],drivers:[{id:'driver',name:'Chauffeur test'}],rides:[{id:'ride',driverId:'driver',status:'completed',total:10000,departure:new Date().toISOString()}],bookings:[],trips:[]});
let sequence=0;
const input=(action,extra={})=>({action:'finance.'+action,rideId:'ride',driverId:'driver',currency:'CDF',amount:'10000',method:'cash',holder:'company',note:'Règlement réel vérifié',idempotencyKey:'test-idempotency-'+(++sequence),...extra});
test('espèces : 7 % de commission, paiement chauffeur et solde entreprise exacts',()=>{
 const state=fixture();manageAdmin(state,input('receipt'),admin);
 let view=financeOverview(state);assert.equal(view.totals.CDF.cashReceipts,10000);assert.equal(view.totals.CDF.commission,700);assert.equal(view.drivers[0].balance,9300);
 manageAdmin(state,input('payout',{amount:'9300'}),admin);view=financeOverview(state);
 assert.equal(view.totals.CDF.companyCash,700);assert.equal(view.drivers[0].balance,0);assert.equal(state.adminAudit.length,2);
 assert.throws(()=>manageAdmin(state,input('payout',{amount:'1'}),admin),/dépasse/);
});
test('espèces chauffeur : remise de la commission ou remise totale puis versement, sans double recette',()=>{
 for(const remitted of ['700','10000']){
  const state=fixture();financeAction(state,input('receipt',{holder:'driver'}),admin);
  let view=financeOverview(state);assert.equal(view.totals.CDF.companyCash,0);assert.equal(view.totals.CDF.driverCash,10000);assert.equal(view.drivers[0].balance,-700);
  financeAction(state,input('remittance',{amount:remitted}),admin);
  if(remitted==='10000')financeAction(state,input('payout',{amount:'9300'}),admin);
  view=financeOverview(state);assert.equal(view.totals.CDF.cashReceipts,10000);assert.equal(view.totals.CDF.companyCash,700);assert.equal(view.drivers[0].balance,0);
 }
});
test('électronique et USD séparés, référence obligatoire, aucun transfert automatique',()=>{
 const state=fixture();state.rides.push({id:'usd',driverId:'driver',status:'completed',currency:'USD',total:10});
 financeAction(state,input('receipt',{method:'mobile_money',reference:'MOBILE-0001'}),admin);
 financeAction(state,input('receipt',{rideId:'usd',amount:'10.00',method:'bank',reference:'BANK-USD-0001'}),admin);
 let view=financeOverview(state);assert.equal(view.totals.USD.electronicReceipts,1000);assert.equal(view.totals.USD.commission,70);assert.equal(view.totals.CDF.electronicReceipts,10000);assert.equal(view.automaticPayouts,false);
 assert.throws(()=>financeAction(state,input('payout',{amount:'9300',method:'cash'}),admin),/Solde/);
 financeAction(state,input('payout',{amount:'9300',method:'mobile_money',reference:'PAYOUT-0001'}),admin);
 assert.equal(financeOverview(state).totals.CDF.companyElectronic,700);
 assert.throws(()=>financeAction(state,input('payout',{amount:'1',method:'bank',reference:''}),admin),/référence/);
 assert.throws(()=>amountToMinor('1.25','CDF'));assert.equal(amountToMinor('1.25','USD'),125);
});
test('doublons, droits, surencaissement et écritures annulées contrôlés',()=>{
 const state=fixture(),receipt=input('receipt');manageAdmin(state,receipt,admin);
 assert.equal(manageAdmin(state,receipt,admin).replayed,true);assert.equal(state.adminAudit.length,1);assert.equal(state.finance.entries.length,1);
 assert.throws(()=>financeAction(state,{...receipt,amount:'1'},admin),/différentes/);
 assert.throws(()=>financeAction(state,input('receipt',{amount:'1'}),admin),/dépasse/);
 for(const role of ['secondary','client','guest'])assert.throws(()=>financeAction(state,input('payout',{amount:'1'}),{role}),/admin principal/);
 const payout=financeAction(state,input('payout',{amount:'9300'}),admin);
 assert.throws(()=>financeAction(state,{action:'finance.void',id:state.finance.entries[0].id,note:'Correction du reçu'},admin),/insuffisant|dépasse|versement antérieur/);
 financeAction(state,{action:'finance.void',id:payout.id,note:'Correction du versement'},admin);
 financeAction(state,{action:'finance.void',id:state.finance.entries[0].id,note:'Correction du reçu'},admin);
 assert.equal(financeOverview(state).totals.CDF.cashReceipts,0);assert.equal(state.finance.entries.length,2);
});
test('paiements partiels, référence électronique unique et instantané conservé',()=>{
 const state=fixture();snapshotCompletedRide(state,state.rides[0]);
 financeAction(state,input('receipt',{amount:'5000',method:'bank',reference:'UNIQUE-REF'}),admin);
 assert.equal(financeOverview(state).drivers[0].balance,4650);assert.equal(financeOverview(state).courses[0].remaining,5000);
 assert.throws(()=>financeAction(state,input('receipt',{amount:'5000',method:'bank',reference:'unique-ref'}),admin),/déjà enregistrée/);
 state.rides=[];state.drivers=[];
 assert.equal(adminOverview(state).finance.drivers[0].earned,4650);
 assert.equal(financeOverview(state).courses[0].commissionBps,700);
 assert.equal(JSON.stringify(adminOverview(state)).includes('requestSignature'),false);
});
