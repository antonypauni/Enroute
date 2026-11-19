import test from 'node:test';
import assert from 'node:assert/strict';
import {focusedPassengerRide} from '../mobile/focusedRide.mjs';
const guest={id:'guest',role:'guest'};
test('guest keeps the same ride visible through acceptance, progress and completion',()=>{
 const old={id:'old',ownerId:'guest',status:'completed'};
 for(const status of ['requested','accepted','completed','cancelled']) {
   const ride={id:'current',ownerId:'guest',status};
   assert.equal(focusedPassengerRide([old,ride],guest,'current'),ride);
 }
});
test('restores active guest ride after reload without selecting old history or another user',()=>{
 const rides=[{id:'foreign',ownerId:'other',status:'accepted'},{id:'old',ownerId:'guest',status:'completed'},{id:'active',ownerId:'guest',status:'accepted'}];
 assert.equal(focusedPassengerRide(rides,guest,null).id,'active');
 assert.equal(focusedPassengerRide(rides.slice(0,2),guest,null),null);
 assert.equal(focusedPassengerRide(rides,{...guest,accountType:'driver'},null),null);
 assert.equal(focusedPassengerRide(rides,null,null),null);
});
