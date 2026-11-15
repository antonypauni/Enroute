import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep,basename} from 'node:path';
process.env.ENROUTE_TEST='1';
const folder=await mkdtemp(join(tmpdir(),'enroute-admin-'));
process.env.ENROUTE_DATA=join(folder,'state.json');
const {server}=await import('./index.js');
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
async function call(path,body,token,cookie){
 const response=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
 return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
try {await test('serveur Node : administration mobile, affectation et révocation permanente des sessions',async()=>{
 const password='Administrative-test-123';
 await call('register',{name:'Admin',email:'admin@test.example',password});
 const client=await call('register',{name:'Client',email:'client@test.example',password});
 const driver=await call('register',{name:'Chauffeur',email:'driver@test.example',password});
 const admin=await call('mobile/admin/login',{email:'admin@test.example',password});
 const clientSession=await call('mobile/login',{email:'client@test.example',password});
 const documents=Object.fromEntries(['identity','license','registration','insurance'].map(key=>[key,'data:application/pdf;base64,JVBERg==']));
 assert.equal((await call('drivers/apply',{gender:'woman',owner:'Propriétaire',car:'Voiture',plate:'TEST',category:'comfort',documents},undefined,driver.cookie)).status,200);
 assert.equal((await call('admin/manage',{action:'driver.status',id:driver.data.user.id,status:'approved',note:''},admin.data.token)).status,200);
 const form={from:'Lemba',to:'Gombe',category:'comfort',womenOnly:true,passengerGender:'woman',immediate:true};
 const quote=await call('rides/quote',form);const ride=await call('rides/request',{...form,expectedTotal:quote.data.total},clientSession.data.token);
 assert.equal((await call('admin/manage',{action:'ride.assign',id:ride.data.id,driverId:driver.data.user.id},clientSession.data.token)).status,403);
 assert.equal((await call('admin/manage',{action:'ride.assign',id:ride.data.id,driverId:driver.data.user.id},admin.data.token)).status,200);
 assert.equal((await call('rides/state',undefined,clientSession.data.token)).data.rides[0].status,'accepted');
 assert.equal((await call('admin/manage',{action:'ride.cancel',id:ride.data.id,note:'Annulation contrôlée'},admin.data.token)).status,200);
 assert.equal((await call('admin/manage',{action:'user.status',id:client.data.user.id,blocked:true,note:'Suspension test'},admin.data.token)).status,200);
 assert.equal((await call('state',undefined,clientSession.data.token)).status,401);
 assert.equal((await call('admin/manage',{action:'user.status',id:client.data.user.id,blocked:false,note:'Réactivation test'},admin.data.token)).status,200);
 assert.equal((await call('state',undefined,clientSession.data.token)).status,401);
 assert.equal((await call('mobile/login',{email:'client@test.example',password})).status,200);
 const overview=await call('admin/overview',undefined,admin.data.token);assert.ok(overview.data.audit.some(event=>event.action==='ride.assign'));
 assert.equal(overview.data.users[0].hash,undefined);
});
await test('compte chauffeur créé au dépôt, session invitée transférée et dossier non validé automatiquement',async()=>{
 const admin=await call('mobile/admin/login',{email:'admin@test.example',password:'Administrative-test-123'});
 const guest=await call('guest/session',{mobile:true});
 const form={from:'Lemba',to:'Gombe',category:'standard',passengerName:'Chauffeur futur',passengerPhone:'0812345678',immediate:true};
 const estimate=await call('rides/quote',form);const ride=await call('rides/request',{...form,expectedTotal:estimate.data.total},guest.data.token);
 const documents=Object.fromEntries(['identity','license','registration','insurance'].map(key=>[key,'data:application/pdf;base64,JVBERg==']));
 const payload={name:'Chauffeur automatique',email:'driver-auto@test.example',phone:'0812345678',password:'Driver-auto-pass-123',confirm:'Driver-auto-pass-123',gender:'woman',owner:'Propriétaire test',car:'Voiture test',plate:'AUTO-1',category:'standard',documents,mobile:true,status:'approved'};
 assert.equal((await call('drivers/register',{...payload,role:'primary'})).status,400);
 assert.equal((await call('drivers/register',{...payload,confirm:'incorrect'})).status,400);
 const created=await call('drivers/register',payload,guest.data.token);assert.equal(created.status,200);
 assert.equal(created.data.user.role,'client');assert.equal(created.data.user.accountType,'driver');assert.equal(created.data.application.status,'pending');
 assert.equal((await call('state',undefined,guest.data.token)).status,401);
 const own=await call('rides/state',undefined,created.data.token);assert.equal(own.data.application.status,'pending');assert.equal(own.data.application.documents,undefined);assert.ok(own.data.rides.some(item=>item.id===ride.data.id));
 assert.equal((await call('rides/accept',{id:ride.data.id},created.data.token)).status,400);
 assert.equal((await call('drivers/register',payload)).status,400);
 assert.equal((await call('mobile/login',{email:payload.email,password:payload.password})).data.user.accountType,'driver');
 assert.equal((await call('drivers/resubmit',payload,created.data.token)).status,200);
 assert.equal((await call('admin/manage',{action:'driver.status',id:created.data.user.id,status:'approved',documentRevision:1,note:'Documents contrôlés'},admin.data.token)).status,400);
 assert.equal((await call('admin/manage',{action:'driver.status',id:created.data.user.id,status:'approved',documentRevision:2,note:''},admin.data.token)).status,200);
 assert.equal((await call('drivers/resubmit',payload,created.data.token)).status,400);
});} finally {
 await new Promise(resolve=>server.close(resolve));
 if(resolve(folder).startsWith(resolve(tmpdir())+sep)&&basename(folder).startsWith('enroute-admin-'))await rm(folder,{recursive:true,force:true});
}
