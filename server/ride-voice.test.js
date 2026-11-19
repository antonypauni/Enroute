import test from 'node:test';
import assert from 'node:assert/strict';
import {createRideVoice} from '../mobile/rideVoice.mjs';
test('guest ride announces transitions once, ignores GPS-only updates and old history',()=>{
 const messages=[],track=createRideVoice(t=>messages.push(t));
 track({rides:[{id:'old',status:'completed'},{id:'r',status:'requested'}]});
 track({rides:[{id:'r',status:'requested',driverLocation:{}}]});
 track({rides:[{id:'r',status:'accepted'}]});
 track({rides:[{id:'r',status:'accepted',progress:'arrived'}]});
 track({rides:[{id:'r',status:'cancelled'}]});
 assert.equal(messages.length,4);assert.match(messages[1],/accepté/);assert.match(messages[2],/arrivé/);
});
test('driver offers are grouped and never repeated by polling',()=>{
 const messages=[],track=createRideVoice(t=>messages.push(t));
 const state={available:[{id:'a'},{id:'b'}]};track(state,true);track(state,true);track({available:[]},true);track(state,true);
 assert.equal(messages.length,1);assert.match(messages[0],/2 nouvelles/);
 track({rides:[{id:'a',status:'accepted'}]},true);assert.match(messages[1],/Course acceptée/);
});
