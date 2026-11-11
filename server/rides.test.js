import test from 'node:test';
import assert from 'node:assert/strict';
import {quote,rideAction} from './rides.js';
test('tarif automatique et catégories',()=>{const f={from:'Lemba',to:'Gombe',category:'standard'};assert.ok(quote(f).total>0);assert.ok(quote({...f,category:'xl'}).total>quote(f).total);assert.throws(()=>quote({...f,to:'Lemba'}));});
test('course femme, acceptation autorisée et note après arrivée',async()=>{const state={drivers:[{id:'driver',status:'approved',gender:'woman',category:'comfort'}]},client={id:'client'},driver={id:'driver'};const f={from:'Lemba',to:'Gombe',category:'comfort',womenOnly:true,passengerGender:'woman',departure:new Date(Date.now()+3600000).toISOString()};await assert.rejects(rideAction('/api/rides/request',{...f,passengerGender:'man'},state,client));f.expectedTotal=quote(f).total;const r=await rideAction('/api/rides/request',f,state,client);await assert.rejects(rideAction('/api/rides/accept',{id:r.id},state,{id:'intruder'}));await rideAction('/api/rides/accept',{id:r.id},state,driver);await assert.rejects(rideAction('/api/rides/accept',{id:r.id},state,driver));await assert.rejects(rideAction('/api/rides/rate',{id:r.id,rating:5},state,client));await rideAction('/api/rides/complete',{id:r.id},state,driver);await rideAction('/api/rides/rate',{id:r.id,rating:5},state,client);assert.equal(state.drivers[0].rating,5);});

import {rideState} from './rides.js';
test('commande immédiate, acceptation après le départ et absence de doublon', async () => {
  const state = {drivers:[{id:'driver-now',status:'approved',gender:'woman',category:'standard'}]};
  const client = {id:'passenger-now'};
  const input = {from:'Lemba',to:'Gombe',category:'standard',immediate:true};
  input.expectedTotal = quote(input).total;
  const result = await rideAction('/api/rides/request',input,state,client);
  assert.equal(result.immediate,true);
  assert.equal(result.status,'requested');
  await assert.rejects(rideAction('/api/rides/request',input,state,client));
  result.departure = new Date(Date.now()-5000).toISOString();
  await rideAction('/api/rides/accept',{id:result.id},state,{id:'driver-now'});
  assert.equal(result.status,'accepted');
  assert.equal(rideState(state,client).rides.length,1);
});
