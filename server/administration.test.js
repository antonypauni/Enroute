import test from 'node:test';
import assert from 'node:assert/strict';
import {adminOverview,manageAdmin} from './administration.js';
import {quote,rideAction} from './rides.js';
import {validateLoginAudience} from './access.js';

const primary={id:'admin',name:'Administrateur',role:'primary'};
const secondary={id:'second',name:'Équipe',role:'secondary'};
test('validation chauffeur sans motif : statut et journal enregistrés, contrôles conservés',()=>{
 for(const admin of [primary,secondary]){
  const state=fixture();state.drivers[0].status='pending';state.drivers[0].documentRevision=2;
  const approval={action:'driver.status',id:'driver',status:'approved',documentRevision:2,note:''};
  assert.throws(()=>manageAdmin(state,{...approval,documentRevision:1},admin),/dossier a changé/);
  assert.equal(state.drivers[0].status,'pending');
  manageAdmin(state,approval,admin);
  assert.equal(state.drivers[0].status,'approved');
  assert.match(state.drivers[0].reviewNote,/Documents vérifiés/);
  assert.equal(state.adminAudit.at(-1).action,'driver.status');
  assert.throws(()=>manageAdmin(state,{action:'driver.status',id:'driver',status:'rejected'},admin),/motif/);
  delete state.drivers[0].documents.insurance;
  assert.throws(()=>manageAdmin(state,approval,admin),/quatre pièces/);
 }
});
function fixture(){return {users:[primary,secondary,{id:'driver',role:'client',name:'Chauffeur',email:'driver@test.example',salt:'private',hash:'secret'},{id:'client',role:'client',name:'Passager',email:'client@test.example'}],guests:[],sessions:[{id:'driver',hash:'private-token'}],trips:[{id:'trip',seats:1}],bookings:[{id:'booking',tripId:'trip',ownerId:'client',seats:2,status:'confirmed'}],drivers:[{id:'driver',name:'Chauffeur',status:'approved',gender:'woman',category:'comfort',owner:'Propriétaire',car:'Voiture',plate:'TEST',documents:{identity:'private',license:'private',registration:'private',insurance:'private'}}],rides:[{id:'ride',ownerId:'client',from:'Lemba',to:'Gombe',category:'comfort',womenOnly:true,immediate:true,status:'requested',total:12000}]}}
test('administration : permissions et protection du compte principal',()=>{
 const s=fixture();
 assert.throws(()=>manageAdmin(s,{action:'ride.cancel',id:'ride',note:'Motif test'},{id:'client',role:'client'}));
 assert.throws(()=>manageAdmin(s,{action:'user.status',id:'driver',blocked:true,note:'Motif test'},secondary));
 assert.throws(()=>manageAdmin(s,{action:'user.status',id:'admin',blocked:true,note:'Motif test'},primary));
 assert.throws(()=>manageAdmin(s,{action:'user.delete',id:'second',note:'Motif test'},primary));
 assert.throws(()=>manageAdmin(s,{action:'ride.cancel',id:'ride'},primary));
 assert.equal(s.rides[0].status,'requested');
});
test('affectation contrôlée, réaffectation, fin et journal',()=>{
 const s=fixture(),input={action:'ride.assign',id:'ride',driverId:'driver'};
 s.drivers[0].gender='man';assert.throws(()=>manageAdmin(s,input,secondary));s.drivers[0].gender='woman';
 s.drivers[0].category='standard';assert.throws(()=>manageAdmin(s,input,secondary));s.drivers[0].category='comfort';
 s.drivers[0].status='pending';assert.throws(()=>manageAdmin(s,input,secondary));s.drivers[0].status='approved';
 manageAdmin(s,input,secondary);assert.equal(s.rides[0].driverId,'driver');assert.equal(s.rides[0].status,'accepted');
 assert.throws(()=>manageAdmin(s,{action:'driver.status',id:'driver',status:'rejected',note:'Motif test'},primary));
 s.rides.push({...s.rides[0],id:'another',status:'requested',driverId:undefined});assert.throws(()=>manageAdmin(s,{...input,id:'another'},primary));
 s.rides[0].driverLocation={point:[-4.3,15.3],receivedAt:Date.now()};
 manageAdmin(s,{action:'ride.release',id:'ride'},primary);assert.equal(s.rides[0].driverLocation,undefined);assert.equal(s.rides[0].driverId,undefined);
 manageAdmin(s,input,primary);manageAdmin(s,{action:'ride.complete',id:'ride'},primary);assert.equal(s.rides[0].status,'completed');
 assert.throws(()=>manageAdmin(s,input,primary));assert.equal(s.adminAudit.at(-1).action,'ride.complete');
});
test('blocage, profil, validation et suppression client',()=>{
 const s=fixture();
 manageAdmin(s,{action:'user.status',id:'driver',blocked:true,note:'Suspension test'},primary);
 assert.equal(s.sessions.length,0);assert.throws(()=>validateLoginAudience('/api/mobile/login',s.users[2]));
 assert.throws(()=>manageAdmin(s,{action:'ride.assign',id:'ride',driverId:'driver'},primary));
 manageAdmin(s,{action:'user.status',id:'driver',blocked:false,note:'Réactivation test'},primary);
 manageAdmin(s,{action:'user.profile',id:'driver',name:'Nouveau nom',email:'new@test.example'},primary);assert.equal(s.drivers[0].name,'Nouveau nom');
 assert.throws(()=>manageAdmin(s,{action:'user.profile',id:'driver',name:'Nom',email:'client@test.example'},primary));
 manageAdmin(s,{action:'driver.status',id:'driver',status:'pending',note:'Vérification test'},secondary);
 manageAdmin(s,{action:'driver.vehicle',id:'driver',car:'Autre voiture',plate:'TEST2',owner:'Propriétaire',category:'comfort',gender:'woman'},secondary);
 manageAdmin(s,{action:'driver.status',id:'driver',status:'approved',note:'Documents contrôlés'},secondary);
 assert.throws(()=>manageAdmin(s,{action:'user.delete',id:'client',note:'Suppression test'},primary));
 manageAdmin(s,{action:'ride.cancel',id:'ride',note:'Annulation test'},secondary);
 manageAdmin(s,{action:'user.delete',id:'client',note:'Suppression test'},primary);assert.ok(!s.users.some(user=>user.id==='client'));assert.equal(s.users[0].role,'primary');
});
test('annulation des réservations : pas de restitution répétée des places',()=>{
 const s=fixture();manageAdmin(s,{action:'booking.cancel',id:'booking',note:'Annulation test'},secondary);assert.equal(s.trips[0].seats,3);
 assert.throws(()=>manageAdmin(s,{action:'booking.cancel',id:'booking',note:'Encore'},secondary));assert.equal(s.trips[0].seats,3);
 manageAdmin(s,{action:'trip.archive',id:'trip',note:'Retrait test'},primary);assert.equal(s.trips.length,0);
});
test('tarifs persistés, montant confirmé et vue sans secrets',async()=>{
 const s=fixture(),f={from:'Lemba',to:'Gombe',category:'comfort'};const before=quote(f,s.pricing);
 assert.throws(()=>manageAdmin(s,{action:'pricing.update',pricing:{baseFare:1000,perKm:800,comfortMultiplier:1.5,xlMultiplier:2}},secondary));
 manageAdmin(s,{action:'pricing.update',pricing:{baseFare:1000,perKm:800,comfortMultiplier:1.5,xlMultiplier:2}},primary);
 assert.notEqual(before.total,quote(f,s.pricing).total);
 await assert.rejects(rideAction('/api/rides/request',{...f,expectedTotal:before.total},s,{id:'new',role:'client'}));
 const view=adminOverview(s);assert.equal(view.users[2].hash,undefined);assert.equal(view.applications[0].documents,undefined);assert.ok(!JSON.stringify(view).includes('private-token'));
});
