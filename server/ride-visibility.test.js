import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesRideView} from '../mobile/rideVisibility.mjs';
test('closed rides leave active views without deleting their financial records',()=>{
 const rides=[{id:1,status:'requested',total:100},{id:2,status:'accepted',total:200},{id:3,status:'completed',total:300},{id:4,status:'cancelled',total:400}];
 const before=structuredClone(rides);
 assert.deepEqual(rides.filter(r=>matchesRideView(r)).map(r=>r.id),[1,2]);
 assert.deepEqual(rides.filter(r=>matchesRideView(r,'history')).map(r=>r.id),[3,4]);
 assert.equal(rides.filter(r=>matchesRideView(r,'all')).length,4);
 assert.deepEqual(rides,before);
 rides[1].status='completed';
 assert.deepEqual(rides.filter(r=>matchesRideView(r)).map(r=>r.id),[1]);
 assert.equal(rides.filter(r=>matchesRideView(r,'completed')).reduce((s,r)=>s+r.total,0),500);
});
