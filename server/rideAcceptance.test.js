import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptRide,retainAcceptedRide} from '../src/rideAcceptance.js';
const ride={id:'ride',status:'accepted',driverId:'driver'};
test('réponse perdue après acceptation : confirmation par lecture, aucun second POST',async()=>{
 let posts=0;
 const result=await acceptRide({rideId:'ride',userId:'driver',send:async()=>{posts++;throw new TypeError('Failed to fetch')},readState:async()=>({rides:[ride]})});
 assert.equal(result,ride);assert.equal(posts,1);
 const displayed=retainAcceptedRide({rides:[{id:'other'}],available:[{id:'ride'},{id:'available'}]},result);
 assert.deepEqual(displayed.rides,[{id:'other'},ride]);assert.deepEqual(displayed.available,[{id:'available'}]);
});
test('réseau coupé ou autre chauffeur : aucune fausse confirmation',async()=>{
 for(const readState of [async()=>{throw new TypeError('Failed to fetch')},async()=>({rides:[{...ride,driverId:'other'}]}),async()=>({rides:[{...ride,status:'completed'}]})]){
  await assert.rejects(acceptRide({rideId:'ride',userId:'driver',send:async()=>{throw new TypeError('Failed to fetch')},readState}),/Connexion au serveur interrompue/);
 }
});
test('refus serveur et session expirée : erreur conservée, aucune réconciliation trompeuse',async()=>{
 for(const status of [400,401,409]){
  const error=Object.assign(new Error('Refus serveur'),{status});
  await assert.rejects(acceptRide({rideId:'ride',userId:'driver',send:async()=>{throw error},readState:async()=>{assert.fail('lecture superflue')}}),value=>value===error);
 }
});
test('acceptation confirmée : affichage disponible sans seconde requête',async()=>{
 const result=await acceptRide({rideId:'ride',userId:'driver',send:async()=>ride,readState:async()=>assert.fail('lecture superflue')});
 assert.equal(result,ride);
});
