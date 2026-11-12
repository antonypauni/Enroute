import test from 'node:test';
import assert from 'node:assert/strict';
import {deleteClientData} from './accountData.js';
test('suppression client conserve les autres comptes et retire les documents',()=>{
 const user={id:'deleted',role:'client'};
 const state={users:[user,{id:'admin',role:'primary'},{id:'other',role:'client'}],drivers:[{id:'deleted',documents:{identity:'private'}}],trips:[{id:'owned',ownerId:'deleted',seats:2},{id:'other-trip',ownerId:'other',seats:0}],bookings:[{id:'own',ownerId:'deleted',tripId:'other-trip',seats:1},{id:'foreign',ownerId:'other',tripId:'owned',seats:1}],rides:[{id:'own-ride',ownerId:'deleted',status:'requested'},{id:'foreign-ride',ownerId:'other',driverId:'deleted',driverName:'Private name',status:'accepted'}],sessions:[{id:'deleted'},{id:'admin'}]};
 deleteClientData(state,user);
 assert.equal(state.users.length,2);assert.equal(state.drivers.length,0);
 assert.equal(state.bookings[0].status,'cancelled_driver_account');assert.equal(state.trips[0].seats,1);
 assert.equal(state.rides[0].status,'cancelled');assert.equal(state.rides[0].driverName,undefined);
 assert.deepEqual(state.sessions,[{id:'admin'}]);
 assert.throws(()=>deleteClientData(state,{id:'admin',role:'primary'}));
});
