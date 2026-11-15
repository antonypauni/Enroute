import test from 'node:test';
import assert from 'node:assert/strict';
import {rideAction,rideState} from './rides.js';
import {driverOffers} from './driverOffers.js';
import {manageAdmin} from './administration.js';
import {financeOverview,recordDriverCash} from './finance.js';
import {performRideAction} from '../mobile/rideAcceptance.mjs';
const driver={id:'driver',name:'Chauffeur test',role:'client'},admin={id:'admin',name:'Admin test',role:'primary'};
const fixture=()=>({users:[driver,admin],drivers:[{id:'driver',name:'Chauffeur test',status:'approved',category:'standard',gender:'man'}],rides:[{id:'ride',ownerId:'guest',from:'Lemba',to:'Gombe',status:'requested',category:'standard',immediate:true,total:271429,paymentMethod:'cash'}],trips:[],bookings:[]});
test('disponibilité : hors ligne masque les demandes et bloque une nouvelle acceptation, sans empêcher la fin de course',async()=>{
 const state=fixture();assert.equal(driverOffers(state,driver).length,1);
 await rideAction('/api/drivers/availability',{online:false},state,driver);assert.equal(driverOffers(state,driver).length,0);
 await assert.rejects(rideAction('/api/rides/accept',{id:'ride'},state,driver),/en ligne/);
 assert.throws(()=>manageAdmin(state,{action:'ride.assign',id:'ride',driverId:'driver'},admin),/hors ligne/);
 await assert.rejects(rideAction('/api/drivers/availability',{online:'true'},state,driver));
 await rideAction('/api/drivers/availability',{online:true},state,driver);await rideAction('/api/rides/accept',{id:'ride'},state,driver);
 await rideAction('/api/drivers/availability',{online:false},state,driver);await rideAction('/api/rides/complete',{id:'ride'},state,driver);assert.equal(state.rides[0].status,'completed');
});
test('étapes : arrivée puis client à bord, réservées au chauffeur affecté et sans doublon de date',async()=>{
 const state=fixture();await rideAction('/api/rides/accept',{id:'ride'},state,driver);
 await assert.rejects(rideAction('/api/rides/progress',{id:'ride',stage:'in_progress'},state,driver),/ordre/);
 await assert.rejects(rideAction('/api/rides/progress',{id:'ride',stage:'arrived'},state,{id:'guest'}),/chauffeur affecté/);
 await rideAction('/api/rides/progress',{id:'ride',stage:'arrived'},state,driver);const arrivedAt=state.rides[0].arrivedAt;
 await rideAction('/api/rides/progress',{id:'ride',stage:'arrived'},state,driver);assert.equal(state.rides[0].arrivedAt,arrivedAt);
 await rideAction('/api/rides/progress',{id:'ride',stage:'in_progress'},state,driver);assert.ok(state.rides[0].startedAt);
 assert.equal(rideState(state,{id:'guest'}).rides[0].progress,'in_progress');
});
test('fin avec espèces : déclaration attribuée au chauffeur, commission cumulée, bilan et aucun double encaissement',async()=>{
 const state=fixture();await rideAction('/api/rides/accept',{id:'ride'},state,driver);
 await rideAction('/api/rides/complete',{id:'ride',cashReceived:true},state,driver);
 let finance=financeOverview(state);assert.equal(finance.entries.length,1);assert.equal(finance.entries[0].source,'driver_declared');assert.equal(finance.entries[0].actor,'driver');assert.equal(finance.totals.CDF.cashReceipts,271429);assert.equal(finance.totals.CDF.commission,19000);assert.equal(finance.drivers[0].financialStatus.cashRestricted,true);assert.equal(finance.dailyReports[0].totals.CDF.cash,271429);
 await rideAction('/api/rides/complete',{id:'ride',cashReceived:true},state,driver);assert.equal(financeOverview(state).entries.length,1);
 assert.ok(state.adminAudit.some(event=>event.action==='ride.cash.declared'));
 assert.throws(()=>recordDriverCash(state,state.rides[0],{id:'other',role:'client'}));
});
test('fin sans espèces et paiement électronique : aucune recette fictive',async()=>{
 const state=fixture();await rideAction('/api/rides/accept',{id:'ride'},state,driver);
 await assert.rejects(rideAction('/api/rides/complete',{id:'ride',cashReceived:'true'},state,driver));
 await rideAction('/api/rides/complete',{id:'ride',cashReceived:false},state,driver);assert.equal(financeOverview(state).entries.length,0);
 await assert.rejects(rideAction('/api/rides/complete',{id:'ride',cashReceived:true},state,driver),/déjà terminée/);
});
test('réponse perdue : fin et étape réconciliées sans deuxième POST',async()=>{
 for(const [action,extra,ride] of [['complete',{cashReceived:true},{id:'ride',driverId:'driver',status:'completed',cashCollectionConfirmed:true}],['progress',{stage:'arrived'},{id:'ride',driverId:'driver',status:'accepted',progress:'in_progress'}]]){
  let posts=0;const result=await performRideAction({rideId:'ride',userId:'driver',action,extra,send:async()=>{posts++;throw new TypeError('Failed to fetch')},readState:async()=>({rides:[ride]})});assert.equal(result,ride);assert.equal(posts,1);
 }
});
