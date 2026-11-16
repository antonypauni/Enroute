import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveRefresh} from '../mobile/liveRefresh.mjs';
test('actualisation : réveil pendant une lecture sans requêtes parallèles, résultat puis lecture immédiate',async()=>{
 let resolve,reads=0,scheduled,received=[];
 const live=createLiveRefresh({read:()=>{reads++;return new Promise(r=>resolve=r)},onData:d=>received.push(d),onError:e=>{throw e},schedule:(fn,delay)=>{scheduled={fn,delay};return 1},cancel:()=>{}});
 const pending=live.refresh();await live.refresh();assert.equal(reads,1);resolve({available:[{id:'new-client'}]});await pending;
 assert.equal(received[0].available[0].id,'new-client');assert.equal(scheduled.delay,0);
 live.stop();await scheduled.fn();assert.equal(reads,1);
});
test('actualisation : erreur réseau suivie de reprise et aucune mise à jour après fermeture',async()=>{
 let failures=0,received=[],scheduled,attempt=0;
 const live=createLiveRefresh({read:async()=>{if(!attempt++)throw Error('network');return 'fresh'},onData:d=>received.push(d),onError:()=>failures++,schedule:(fn,delay)=>{scheduled={fn,delay};return 1},cancel:()=>{}});
 await live.refresh();assert.equal(failures,1);assert.equal(scheduled.delay,1500);await scheduled.fn();assert.deepEqual(received,['fresh']);live.stop();await scheduled.fn();assert.equal(attempt,2);
 let resolve;const late=createLiveRefresh({read:()=>new Promise(r=>resolve=r),onData:()=>assert.fail('late result'),onError:()=>assert.fail('late error')});const pending=late.refresh();late.stop();resolve('obsolete');await pending;
});
