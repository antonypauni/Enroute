import test from 'node:test';
import assert from 'node:assert/strict';
import {driverOffers,canPreviewRide} from './driverOffers.js';
import {rideAction} from './rides.js';
import {financeAction} from './finance.js';
const driver={id:'driver',role:'client',name:'Chauffeur'};
function fixture(){return {users:[driver],drivers:[{id:'driver',status:'approved',gender:'woman',category:'comfort'}],rides:[{id:'offer',ownerId:'guest',status:'requested',immediate:true,category:'comfort',womenOnly:true,passengerName:'Cliente fictive',passengerPhone:'+243810000000',passengerPhoto:'data:image/png;base64,iVBORw0KGgo=',from:'Lemba',to:'Gombe',total:12000}]};}
test('espace chauffeur : nom et photo facultative avant acceptation, téléphone réservé à la course affectée',async()=>{
 const state=fixture(),offers=driverOffers(state,driver);
 assert.equal(offers.length,1);assert.equal(offers[0].passengerName,'Cliente fictive');assert.equal(offers[0].hasPassengerPhoto,true);
 for(const field of ['passengerPhone','passengerPhoto','photoKey','photoMime','driverLocation'])assert.equal(offers[0][field],undefined);
 assert.match((await rideAction('/api/rides/photo',{id:'offer'},state,driver)).data,/^data:image/);
 await assert.rejects(rideAction('/api/rides/photo',{id:'offer'},state,{id:'other',role:'client'}));
 await rideAction('/api/rides/accept',{id:'offer'},state,driver);
 assert.equal(driverOffers(state,driver).length,0);assert.equal(state.rides[0].driverId,'driver');
});
test('aperçus refusés pour les dossiers non validés, incompatibles, suspendus ou déjà en course',()=>{
 for(const update of [state=>state.drivers[0].status='pending',state=>state.drivers[0].category='standard',state=>state.drivers[0].gender='man',state=>state.users[0]={...driver,blocked:true},state=>state.rides.push({id:'active',driverId:'driver',status:'accepted'})]){
  const state=fixture();update(state);assert.equal(driverOffers(state,driver).length,0);assert.equal(canPreviewRide(state,driver,state.rides[0]),false);
 }
});
test('la restriction espèces masque les demandes physiques, sans masquer les demandes électroniques confirmées',()=>{
 const state=fixture();state.rides.push({id:'old',driverId:'driver',status:'completed',total:400000});
 financeAction(state,{action:'finance.receipt',rideId:'old',amount:'400000',method:'cash',holder:'driver',note:'Encaissement fictif confirmé',idempotencyKey:'offers-restriction-0001'},{id:'admin',name:'Admin',role:'primary'});
 assert.equal(driverOffers(state,driver).length,0);
 Object.assign(state.rides[0],{paymentMethod:'mpesa',paymentStatus:'paid',paymentSource:'merchant'});
 assert.equal(driverOffers(state,driver).length,1);
});
