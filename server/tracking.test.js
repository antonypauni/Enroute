import test from 'node:test';
import assert from 'node:assert/strict';
import {rideAction,rideState} from './rides.js';
import {rideForViewer,ridePoints,trackingAction} from './tracking.js';

function fixture(){return {drivers:[{id:'driver',status:'approved',category:'standard'}],rides:[{id:'ride',ownerId:'passenger',driverId:'driver',category:'standard',status:'accepted'}]}}
test('GPS réservé au chauffeur affecté et validé, points précis contrôlés',()=>{
  const state=fixture(),input={id:'ride',point:[-4.34,15.32],accuracy:10,timestamp:100000};
  assert.throws(()=>trackingAction('/api/rides/location',input,state,{id:'passenger'},100000));
  assert.throws(()=>trackingAction('/api/rides/location',input,state,{id:'other'},100000));
  assert.throws(()=>trackingAction('/api/rides/location',{...input,point:[48,2]},state,{id:'driver'},100000));
  for(const change of [{accuracy:101},{accuracy:null},{timestamp:1},{timestamp:120000},{mocked:true}])assert.throws(()=>trackingAction('/api/rides/location',{...input,...change},state,{id:'driver'},100000));
  assert.deepEqual(ridePoints({pickupPoint:[-4.34123456,15.32]}),{pickupPoint:[-4.341235,15.32]});
  assert.throws(()=>ridePoints({destinationPoint:'invalide'}));
  state.drivers[0].status='rejected';
  assert.throws(()=>trackingAction('/api/rides/location',input,state,{id:'driver'},100000));
});
test('position périmée masquée, ordre et fréquence contrôlés, arrêt explicite',()=>{
  const state=fixture(),input={id:'ride',point:[-4.34,15.32],accuracy:10,timestamp:100000};
  trackingAction('/api/rides/location',input,state,{id:'driver'},100000);
  assert.equal(rideForViewer(state.rides[0],101000).locationStatus,'live');
  assert.equal(rideForViewer(state.rides[0],130001).driverLocation,null);
  assert.equal(rideForViewer(state.rides[0],130001).locationStatus,'stale');
  assert.throws(()=>trackingAction('/api/rides/location',input,state,{id:'driver'},101000));
  trackingAction('/api/rides/location',{...input,timestamp:101000},state,{id:'driver'},101000);
  assert.equal(state.rides[0].driverLocation.timestamp,100000);
  trackingAction('/api/rides/location/stop',{id:'ride'},state,{id:'driver'},101000);
  assert.equal(rideForViewer(state.rides[0],101000).locationStatus,'off');
});
test('confidentialité et suppression du GPS en fin de course',async()=>{
  const state=fixture();
  trackingAction('/api/rides/location',{id:'ride',point:[-4.34,15.32],accuracy:10,timestamp:Date.now()},state,{id:'driver'});
  assert.equal(rideState(state,{id:'stranger'}).rides.length,0);
  assert.ok(rideState(state,{id:'passenger'}).rides[0].driverLocation);
  await rideAction('/api/rides/complete',{id:'ride'},state,{id:'driver'});
  assert.equal(state.rides[0].driverLocation,undefined);
  await assert.rejects(rideAction('/api/rides/location',{id:'ride'},state,{id:'driver'}));
});
