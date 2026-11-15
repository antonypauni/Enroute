import test from 'node:test';
import assert from 'node:assert/strict';
import {rideAction,rideState} from './rides.js';

test('le passager voit son chauffeur dès acceptation, puis uniquement un GPS récent',async()=>{
 const driver={id:'driver',name:'Conducteur test',status:'approved',category:'standard',gender:'man',car:'Toyota test',plate:'TEST',phone:'+243810000000',documents:{identity:'document-secret'},email:'private@example.test'};
 const ride={id:'ride',ownerId:'guest',status:'requested',immediate:true,category:'standard',from:'Lemba',to:'Gombe',total:12000};
 const state={drivers:[driver],users:[],rides:[ride]};
 const passenger={id:'guest',role:'guest'};
 assert.equal(rideState(state,passenger).rides[0].assignedDriver,null);
 await rideAction('/api/rides/accept',{id:'ride'},state,{id:'driver'});
 let view=rideState(state,passenger);
 assert.equal(view.rides[0].status,'accepted');assert.equal(view.rides[0].assignedDriver.name,driver.name);
 assert.equal(view.rides[0].assignedDriver.plate,'TEST');assert.equal(view.rides[0].assignedDriver.phone,driver.phone);
 assert.equal(view.rides[0].locationStatus,'off');assert.equal(view.rides[0].driverLocation,null);
 assert.equal(rideState(state,{id:'other'}).rides.length,0);
 assert.ok(!JSON.stringify(view).includes('document-secret'));assert.ok(!JSON.stringify(view).includes('private@example.test'));
 assert.equal(view.drivers.find(item=>item.id==='driver').plate,undefined);
 const now=Date.now();
 await rideAction('/api/rides/location',{id:'ride',point:[-4.3,15.3],accuracy:12,timestamp:now},state,{id:'driver'});
 assert.equal(rideState(state,passenger).rides[0].locationStatus,'live');
 ride.driverLocation.receivedAt=Date.now()-31000;
 view=rideState(state,passenger);assert.equal(view.rides[0].locationStatus,'stale');assert.equal(view.rides[0].driverLocation,null);
 await rideAction('/api/rides/complete',{id:'ride'},state,{id:'driver'});
 assert.equal(rideState(state,passenger).rides[0].assignedDriver,null);
});
