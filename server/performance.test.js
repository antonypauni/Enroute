import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveRefresh} from '../mobile/liveRefresh.mjs';
import {shouldRefreshRides} from '../mobile/rideRefreshPolicy.mjs';
import {driverOffers,canPreviewRide} from './driverOffers.js';
test('background polling pauses, ignores late results and resumes immediately',async()=>{
 let active=true,resolve,reads=0,received=0,scheduled=0;
 const live=createLiveRefresh({isActive:()=>active,read:()=>{reads++;return new Promise(r=>resolve=r)},onData:()=>received++,onError:()=>assert.fail('unexpected error'),schedule:()=>{scheduled++;return 1},cancel:()=>{}});
 const first=live.refresh();active=false;resolve({});await first;
 assert.equal(received,0);assert.equal(scheduled,0);await live.refresh();assert.equal(reads,1);
 active=true;const resumed=live.refresh();resolve({});await resumed;assert.equal(reads,2);assert.equal(received,1);assert.equal(scheduled,1);live.stop();
});
test('passenger and guest polling is independent of selected screen',()=>{
 for(const role of ['guest','client'])assert.equal(shouldRefreshRides('token',{role}),true);
 assert.equal(shouldRefreshRides('token',{role:'client',accountType:'driver'}),true);
 for(const role of ['primary','secondary'])assert.equal(shouldRefreshRides('token',{role}),false);
 assert.equal(shouldRefreshRides(null,{role:'guest'}),false);
});
test('optimized offer filtering preserves permission and eligibility rules',()=>{
 const user={id:'driver',role:'client'},now=10000;
 for(const online of [true,false])for(const blocked of [true,false])for(const active of [true,false]){
  const state={users:[{...user,blocked},{id:'blocked',blocked:true}],drivers:[{id:'driver',status:'approved',category:'standard',gender:'woman',online}],rides:[],trips:[],bookings:[]};
  for(let i=0;i<120;i++)state.rides.push({id:String(i),ownerId:i%7===0?'driver':i%5===0?'blocked':'guest',status:i%11===0?'cancelled':'requested',category:i%3===0?'comfort':'standard',womenOnly:i%2===0,immediate:i%4===0,departure:new Date(i%6===0?5000:20000).toISOString(),paymentMethod:i%3===0?'mpesa':'cash',paymentStatus:i%2===0?'paid':'pending',paymentSource:'merchant',passengerPhone:'private'});
  if(active)state.rides.push({id:'busy',driverId:'driver',status:'accepted'});
  const expected=state.rides.filter(r=>canPreviewRide(state,user,r,now)).map(r=>r.id);
  const actual=driverOffers(state,user,now);assert.deepEqual(actual.map(r=>r.id),expected);assert.ok(actual.every(r=>!('passengerPhone' in r)));
 }
});
