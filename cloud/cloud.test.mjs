import test from 'node:test';import assert from 'node:assert/strict';import{DatabaseSync}from'node:sqlite';import worker from './worker.js';const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE enroute_state(id INTEGER PRIMARY KEY,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0)');const env={DB:{prepare(sql){let params=[];return{bind(...p){params=p;return this},async first(){return db.prepare(sql).get(...params)},async run(){const r=db.prepare(sql).run(...params);return{meta:{changes:Number(r.changes)}}}}}}};const files=new Map();env.BUCKET={async put(key,bytes,options){files.set(key,{bytes:new Uint8Array(bytes),options})},async get(key){const f=files.get(key);return f?{arrayBuffer:async()=>f.bytes.buffer,httpMetadata:f.options?.httpMetadata}:null},async delete(key){files.delete(key)}};const call=async(path,data,cookie,token)=>{const r=await worker.fetch(new Request('https://example.test'+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:'https://example.test'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},...(data?{body:JSON.stringify(data)}:{})}),env);return{status:r.status,data:await r.json(),cookie:r.headers.get('Set-Cookie')?.split(';')[0]}};await test('cloud state, auth, persistent session, booking and privacy',async()=>{let s=await call('/api/state');assert.equal(s.status,200);assert.equal(s.data.setupRequired,true);const a=await call('/api/register',{name:'Test Admin',email:'cloud@example.com',password:'Strong-test-pass-123'});assert.equal(a.data.user.role,'primary');s=await call('/api/state',null,a.cookie);assert.equal(s.data.user.name,'Test Admin');const b=await call('/api/bookings',{tripId:'t1',seats:1},a.cookie);assert.equal(b.status,200);assert.equal((await call('/api/state',null,a.cookie)).data.bookings.length,1);assert.equal((await call('/api/state')).data.bookings.length,0);assert.equal((await call('/api/cancel',{id:b.data.id},a.cookie)).status,200);await call('/api/logout',{},a.cookie);assert.equal((await call('/api/state',null,a.cookie)).data.user,null);assert.equal((await call('/api/bookings',{tripId:'t1',seats:1})).status,401)});await test('récupération: expiration, clé invalide, usage unique et données préservées',async()=>{const key='test-recovery-key-which-is-not-a-production-secret';env.ADMIN_RECOVERY_HASH=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))),x=>x.toString(16).padStart(2,'0')).join('');env.ADMIN_RECOVERY_EXPIRES=String(Date.now()+60000);const payload={key,email:'recovered@example.test',password:'New-strong-pass-123',confirm:'New-strong-pass-123'};assert.equal((await call('/api/admin/recover',{...payload,key:'wrong'})).status,400);env.ADMIN_RECOVERY_EXPIRES='1';assert.equal((await call('/api/admin/recover',payload)).status,400);env.ADMIN_RECOVERY_EXPIRES=String(Date.now()+60000);const before=JSON.parse(db.prepare('SELECT data FROM enroute_state WHERE id=1').get().data);const result=await call('/api/admin/recover',payload);assert.equal(result.status,200);assert.equal(result.data.user.role,'primary');assert.equal((await call('/api/admin/recover',payload)).status,400);assert.equal((await call('/api/login',{email:payload.email,password:payload.password})).status,200);const after=JSON.parse(db.prepare('SELECT data FROM enroute_state WHERE id=1').get().data);assert.equal(after.trips.length,before.trips.length);assert.equal(after.users.length,before.users.length)});await test('parcours client, validation chauffeur et course spéciale femme',async()=>{const admin=await call('/api/login',{email:'recovered@example.test',password:'New-strong-pass-123'});const reg=async name=>call('/api/register',{name,email:`${name}@example.test`,password:'Strong-test-pass-123'});const [passenger,driver,other]=[await reg('passenger'),await reg('driver'),await reg('other')];const documents=Object.fromEntries(['identity','license','registration','insurance'].map(k=>[k,'data:application/pdf;base64,JVBERg==']));assert.equal((await call('/api/drivers/apply',{gender:'woman',category:'comfort',owner:'Propriétaire test',car:'Voiture test',plate:'TEST-123',documents},driver.cookie)).status,200);assert.equal((await call('/api/drivers/document',{id:driver.data.user.id,kind:'identity'},other.cookie)).status,400);assert.equal((await call('/api/drivers/review',{id:driver.data.user.id,status:'approved'},admin.cookie)).status,200);const f={from:'Lemba',to:'Gombe',category:'comfort',womenOnly:true,passengerGender:'woman',departure:new Date(Date.now()+3600000).toISOString()};const estimate=await call('/api/rides/quote',f);assert.equal(estimate.status,200);assert.equal((await call('/api/rides/request',{...f,expectedTotal:1},passenger.cookie)).status,400);const ride=await call('/api/rides/request',{...f,expectedTotal:estimate.data.total},passenger.cookie);assert.equal(ride.status,200);const list=await call('/api/rides/state',null,driver.cookie);assert.equal(list.data.available[0].id,ride.data.id);assert.equal(Object.hasOwn(list.data.drivers.find(d=>d.id===driver.data.user.id),'plate'),false);assert.equal((await call('/api/rides/accept',{id:ride.data.id},other.cookie)).status,400);assert.equal((await call('/api/rides/accept',{id:ride.data.id},driver.cookie)).status,200);assert.equal((await call('/api/rides/complete',{id:ride.data.id},driver.cookie)).status,200);assert.equal((await call('/api/rides/rate',{id:ride.data.id,rating:5},passenger.cookie)).status,200);assert.equal((await call('/api/rides/state',null,other.cookie)).data.rides.length,0);assert.equal((await call('/api/rides/rate',{id:ride.data.id,rating:5},passenger.cookie)).status,400)});
await test('connexion mobile, accès limité aux courses et déconnexion', async () => {
  const login = await call('/api/mobile/login', {email:'passenger@example.test', password:'Strong-test-pass-123'});
  assert.equal(login.status, 200);
  assert.match(login.data.token, /^[a-f0-9]{64}$/);
  assert.equal(login.cookie, undefined);
  assert.equal((await call('/api/state', undefined, undefined, login.data.token)).data.user.role, 'client');
  assert.equal((await call('/api/admin/overview', undefined, undefined, login.data.token)).status, 403);
  assert.ok((await call('/api/rides/state', undefined, undefined, login.data.token)).data.rides.every(ride=>ride.ownerId===login.data.user.id||ride.driverId===login.data.user.id));
  assert.equal((await call('/api/state', undefined, `enroute_session=${login.data.token}`)).data.user, null);
  assert.equal((await call('/api/logout', {}, undefined, login.data.token)).status, 200);
  assert.equal((await call('/api/state', undefined, undefined, login.data.token)).status, 401);
});
await test('accès administrateur et client distincts et lieux précis',async()=>{
 const adminCredentials={email:'recovered@example.test',password:'New-strong-pass-123'};
 const clientCredentials={email:'other@example.test',password:'Strong-test-pass-123'};
 assert.equal((await call('/api/client/login',adminCredentials)).status,400);
 assert.equal((await call('/api/mobile/login',adminCredentials)).status,400);
 assert.equal((await call('/api/admin/login',clientCredentials)).status,400);
 assert.equal((await call('/api/mobile/admin/login',clientCredentials)).status,400);
 const admin=await call('/api/mobile/admin/login',adminCredentials);
 assert.equal(admin.status,200);
 const overview=await call('/api/admin/overview',undefined,undefined,admin.data.token);assert.equal(overview.status,200);assert.ok(Array.isArray(overview.data.rides));assert.ok(Array.isArray(overview.data.applications));
 const client=await call('/api/mobile/login',clientCredentials);
 const form={from:'Lemba',to:'Gombe',category:'standard',passengers:3,pickupLandmark:'  Entrée du marché  ',destinationLandmark:' Gare centrale ',immediate:true};
 const estimate=await call('/api/rides/quote',form);
 assert.equal(estimate.status,200);
 assert.equal(estimate.data.passengers,3);
 assert.equal((await call('/api/rides/request',{...form,expectedTotal:estimate.data.total},undefined,admin.data.token)).status,400);
 const course=await call('/api/rides/request',{...form,expectedTotal:estimate.data.total},undefined,client.data.token);
 assert.equal(course.status,200);
 assert.equal(course.data.pickupLandmark,'Entrée du marché');
 assert.equal(course.data.destinationLandmark,'Gare centrale');
 assert.equal(course.data.passengers,3);
 assert.equal((await call('/api/rides/quote',{...form,passengers:5})).status,400);
 assert.equal((await call('/api/rides/request',{...form,pickupLandmark:'',expectedTotal:estimate.data.total},undefined,client.data.token)).status,400);
 const local=await call('/api/rides/quote',{...form,to:'Lemba'});
 assert.equal(local.status,200);
});await test('inscription mobile client et suppression protégée',async()=>{
 const registration=await call('/api/mobile/register',{name:'Client suppression',email:'delete-client@example.test',password:'Delete-password-123'});
 assert.equal(registration.status,200);
 assert.equal(registration.data.user.role,'client');
 assert.ok(registration.data.token);
 assert.equal((await call('/api/mobile/register',{name:'Intrus',email:'intrus@example.test',password:'Delete-password-123',role:'primary'})).status,400);
 assert.equal((await call('/api/account/delete',{password:'wrong'},undefined,registration.data.token)).status,400);
 assert.equal((await call('/api/state',undefined,undefined,registration.data.token)).data.user.role,'client');
 const course={from:'Lemba',to:'Gombe',category:'standard',passengers:2,pickupLandmark:'Marché',destinationLandmark:'Gare',immediate:true};
 const quote=await call('/api/rides/quote',course);
 assert.equal((await call('/api/rides/request',{...course,expectedTotal:quote.data.total},undefined,registration.data.token)).status,200);
 assert.equal((await call('/api/account/delete',{password:'Delete-password-123'},undefined,registration.data.token)).status,200);
 assert.equal((await call('/api/state',undefined,undefined,registration.data.token)).status,401);
 assert.equal((await call('/api/mobile/login',{email:'delete-client@example.test',password:'Delete-password-123'})).status,400);
 const state=JSON.parse(db.prepare('SELECT data FROM enroute_state WHERE id=1').get().data);
 assert.ok(!state.users.some(user=>user.id===registration.data.user.id));
 assert.ok(!state.rides.some(ride=>ride.ownerId===registration.data.user.id));
 assert.ok(state.users.some(user=>user.role==='primary'));
});


await test('commande invitée sans compte, téléphone obligatoire et suppression',async()=>{
 const guest=await call('/api/guest/session',{mobile:true});
 assert.equal(guest.status,200);assert.equal(guest.data.user.role,'guest');
 const form={from:'Lemba',to:'Gombe',category:'standard',passengers:2,pickupLandmark:'Marché',destinationLandmark:'Gare',immediate:true};
 const quote=await call('/api/rides/quote',form);
 assert.equal((await call('/api/rides/request',{...form,expectedTotal:quote.data.total},undefined,guest.data.token)).status,400);
 const ride=await call('/api/rides/request',{...form,passengerName:'Passager test',passengerPhone:'0812345678',expectedTotal:quote.data.total},undefined,guest.data.token);
 assert.equal(ride.status,200);assert.equal(ride.data.passengerPhone,'+243812345678');
 assert.equal((await call('/api/rides/state',undefined,undefined,guest.data.token)).data.rides.length,1);
 assert.equal((await call('/api/admin/overview',undefined,undefined,guest.data.token)).status,403);
 assert.equal((await call('/api/guest/delete',{},undefined,guest.data.token)).status,200);
 assert.equal((await call('/api/state',undefined,undefined,guest.data.token)).status,401);
});



await test('photo privée et conservation des courses après inscription invitée',async()=>{
 const guest=await call('/api/guest/session',{mobile:true});
 const form={from:'Lemba',to:'Gombe',category:'standard',passengerName:'Invité test',passengerPhone:'0812345678',pickupLandmark:'Marché',destinationLandmark:'Gare',immediate:true,passengerPhoto:'data:image/jpeg;base64,/9j/AA=='};
 const quote=await call('/api/rides/quote',form);
 const ride=await call('/api/rides/request',{...form,expectedTotal:quote.data.total},undefined,guest.data.token);
 assert.equal(ride.status,200);assert.ok(ride.data.photoKey);assert.equal(ride.data.passengerPhoto,undefined);
 assert.equal((await call('/api/rides/photo',{id:ride.data.id},undefined,guest.data.token)).data.data,form.passengerPhoto);
 const client=await call('/api/mobile/register',{name:'Invité inscrit',email:'guest-registered@example.test',password:'Strong-test-pass-123'},undefined,guest.data.token);
 assert.equal(client.status,200);
 assert.equal((await call('/api/rides/state',undefined,undefined,client.data.token)).data.rides[0].id,ride.data.id);
 assert.equal((await call('/api/state',undefined,undefined,guest.data.token)).status,401);
 assert.equal((await call('/api/account/delete',{password:'Strong-test-pass-123'},undefined,client.data.token)).status,200);
 assert.equal(files.has(ride.data.photoKey),false);
});


await test('GPS mobile du chauffeur, lecture du passager et arrêt de partage',async()=>{
 const driver=await call('/api/mobile/login',{email:'driver@example.test',password:'Strong-test-pass-123'});
 const guest=await call('/api/guest/session',{mobile:true});
 const form={from:'Lemba',to:'Gombe',category:'comfort',passengerName:'Test GPS',passengerPhone:'0812345678',pickupPoint:[-4.41,15.33],destinationPoint:[-4.30,15.31],immediate:true};
 const quote=await call('/api/rides/quote',form);
 const ride=await call('/api/rides/request',{...form,expectedTotal:quote.data.total},undefined,guest.data.token);
 assert.equal(ride.status,200);assert.deepEqual(ride.data.pickupPoint,form.pickupPoint);
 assert.equal((await call('/api/rides/accept',{id:ride.data.id},undefined,driver.data.token)).status,200);
 const gps={id:ride.data.id,point:[-4.35,15.32],accuracy:12,timestamp:Date.now()};
 assert.equal((await call('/api/rides/location',gps,undefined,guest.data.token)).status,400);
 assert.equal((await call('/api/rides/location',gps,undefined,driver.data.token)).status,200);
 const list=await call('/api/rides/state',undefined,undefined,guest.data.token);
 assert.deepEqual(list.data.rides[0].driverLocation.point,gps.point);
 assert.equal((await call('/api/rides/location/stop',{id:ride.data.id},undefined,driver.data.token)).status,200);
 assert.equal((await call('/api/rides/state',undefined,undefined,guest.data.token)).data.rides[0].driverLocation,null);
 assert.equal((await call('/api/rides/cancel',{id:ride.data.id},undefined,guest.data.token)).status,200);
 assert.equal((await call('/api/rides/location',{...gps,timestamp:Date.now()},undefined,driver.data.token)).status,400);
});


await test('administration Cloud : affectation, accès mobile, prix et comptes',async()=>{
 const admin=await call('/api/mobile/admin/login',{email:'recovered@example.test',password:'New-strong-pass-123'});
 const client=await call('/api/register',{name:'Gestion client',email:'manage-client@example.test',password:'Strong-test-pass-123'});
 const clientSession=await call('/api/mobile/login',{email:'manage-client@example.test',password:'Strong-test-pass-123'});
 const driver=await call('/api/mobile/login',{email:'driver@example.test',password:'Strong-test-pass-123'});
 const form={from:'Lemba',to:'Gombe',category:'comfort',immediate:true};
 const estimate=await call('/api/rides/quote',form);
 const ride=await call('/api/rides/request',{...form,expectedTotal:estimate.data.total},undefined,clientSession.data.token);
 const manage=body=>call('/api/admin/manage',body,undefined,admin.data.token);
 assert.equal((await call('/api/admin/manage',{action:'ride.assign',id:ride.data.id,driverId:driver.data.user.id},undefined,clientSession.data.token)).status,403);
 assert.equal((await manage({action:'ride.assign',id:ride.data.id,driverId:driver.data.user.id})).status,200);
 assert.equal((await call('/api/rides/state',undefined,undefined,clientSession.data.token)).data.rides[0].status,'accepted');
 assert.equal((await manage({action:'ride.complete',id:ride.data.id})).status,200);
 const pricing={baseFare:2500,perKm:900,comfortMultiplier:1.5,xlMultiplier:2};
 assert.equal((await manage({action:'pricing.update',pricing})).status,200);
 assert.notEqual((await call('/api/rides/quote',form)).data.total,estimate.data.total);
 assert.equal((await call('/api/rides/request',{...form,expectedTotal:estimate.data.total},undefined,clientSession.data.token)).status,400);
 assert.equal((await manage({action:'user.status',id:client.data.user.id,blocked:true,note:'Suspension contrôlée'})).status,200);
 assert.equal((await call('/api/mobile/login',{email:'manage-client@example.test',password:'Strong-test-pass-123'})).status,400);
 assert.equal((await call('/api/state',undefined,undefined,clientSession.data.token)).status,401);
 assert.equal((await manage({action:'user.status',id:client.data.user.id,blocked:false,note:'Réactivation contrôlée'})).status,200);
 assert.equal((await call('/api/state',undefined,undefined,clientSession.data.token)).status,401);
 const overview=await call('/api/admin/overview',undefined,undefined,admin.data.token);assert.ok(overview.data.audit.some(event=>event.action==='pricing.update'));
 assert.equal(overview.data.payments.enabled,false);
 assert.equal((await call('/api/drivers/document',{id:driver.data.user.id,kind:'license'},undefined,admin.data.token)).status,200);
});


await test('inscription chauffeur atomique, documents privés et doublons contrôlés',async()=>{
 const documents=Object.fromEntries(['identity','license','registration','insurance'].map(key=>[key,'data:application/pdf;base64,JVBERg==']));
 const payload={name:'Chauffeur automatique',email:'auto-driver@example.test',phone:'0812345678',password:'Auto-driver-pass-123',confirm:'Auto-driver-pass-123',gender:'woman',owner:'Propriétaire test',car:'Voiture test',plate:'AUTO-1',category:'standard',documents,mobile:true,status:'approved'};
 const before=JSON.parse(db.prepare('SELECT data FROM enroute_state WHERE id=1').get().data);
 assert.equal((await call('/api/drivers/register',{...payload,role:'primary'})).status,400);
 assert.equal((await call('/api/drivers/register',{...payload,documents:{...documents,insurance:undefined}})).status,400);
 assert.equal(JSON.parse(db.prepare('SELECT data FROM enroute_state WHERE id=1').get().data).users.length,before.users.length);
 const guest=await call('/api/guest/session',{mobile:true});
 const created=await call('/api/drivers/register',payload,undefined,guest.data.token);assert.equal(created.status,200);
 assert.equal(created.data.user.accountType,'driver');assert.equal(created.data.user.role,'client');assert.equal(created.data.application.status,'pending');
 assert.equal((await call('/api/state',undefined,undefined,guest.data.token)).status,401);
 const own=await call('/api/rides/state',undefined,undefined,created.data.token);assert.equal(own.data.application.phone,'+243812345678');assert.equal(own.data.application.documents,undefined);
 let stored=JSON.parse(db.prepare('SELECT data FROM enroute_state WHERE id=1').get().data);const driver=stored.drivers.find(driver=>driver.id===created.data.user.id);
 const oldKeys=Object.values(driver.documents).map(file=>file.key);assert.ok(oldKeys.every(key=>files.has(key)));
 assert.equal((await call('/api/admin/overview',undefined,undefined,created.data.token)).status,403);
 const login=await call('/api/mobile/login',{email:payload.email,password:payload.password});assert.equal(login.status,200);assert.equal(login.data.user.accountType,'driver');
 assert.equal((await call('/api/drivers/register',payload)).status,400);
 assert.equal((await call('/api/drivers/resubmit',payload,undefined,created.data.token)).status,200);
 assert.ok(oldKeys.every(key=>!files.has(key)));
 stored=JSON.parse(db.prepare('SELECT data FROM enroute_state WHERE id=1').get().data);assert.equal(stored.drivers.find(driver=>driver.id===created.data.user.id).documentRevision,2);
 const browser=await call('/api/drivers/register',{...payload,email:'browser-driver@example.test',mobile:false});assert.equal(browser.status,200);assert.ok(browser.cookie);assert.equal(browser.data.token,undefined);assert.equal((await call('/api/state',undefined,browser.cookie)).data.user.accountType,'driver');
});
await test('échec de stockage : aucun compte chauffeur ni fichier orphelin',async()=>{
 const before=JSON.parse(db.prepare('SELECT data FROM enroute_state WHERE id=1').get().data),count=files.size;
 const documents=Object.fromEntries(['identity','license','registration','insurance'].map(key=>[key,'data:application/pdf;base64,JVBERg==']));
 const payload={name:'Test stockage',email:'failed-driver@example.test',phone:'0812345678',password:'Auto-driver-pass-123',confirm:'Auto-driver-pass-123',gender:'man',owner:'Propriétaire test',car:'Voiture test',plate:'FAIL',category:'standard',documents,mobile:true};
 const original=env.BUCKET.put;let uploads=0;env.BUCKET.put=async(...args)=>{if(++uploads===2)throw Error('Échec de stockage fictif');return original(...args)};
 try{assert.equal((await call('/api/drivers/register',payload)).status,400)}finally{env.BUCKET.put=original}
 const after=JSON.parse(db.prepare('SELECT data FROM enroute_state WHERE id=1').get().data);assert.equal(after.users.length,before.users.length);assert.equal(after.drivers.length,before.drivers.length);assert.equal(files.size,count);
});
await test('deux dépôts simultanés ne créent pas deux comptes pour le même e-mail',async()=>{
 const documents=Object.fromEntries(['identity','license','registration','insurance'].map(key=>[key,'data:application/pdf;base64,JVBERg==']));
 const payload={name:'Dépôt concurrent',email:'concurrent-driver@example.test',phone:'0812345678',password:'Auto-driver-pass-123',confirm:'Auto-driver-pass-123',gender:'man',owner:'Propriétaire test',car:'Voiture test',plate:'CONCURRENT',category:'standard',documents,mobile:true};
 const count=files.size;const responses=await Promise.all([call('/api/drivers/register',payload),call('/api/drivers/register',payload)]);assert.deepEqual(responses.map(result=>result.status).sort(),[200,400]);
 const stored=JSON.parse(db.prepare('SELECT data FROM enroute_state WHERE id=1').get().data);assert.equal(stored.users.filter(user=>user.email===payload.email).length,1);assert.equal(files.size,count+4);
});


await test('dépôts concurrents indépendants : les deux comptes et documents sont conservés',async()=>{
 const documents=Object.fromEntries(['identity','license','registration','insurance'].map(key=>[key,'data:application/pdf;base64,JVBERg==']));
 const payload={name:'Dépôt indépendant',phone:'0812345678',password:'Auto-driver-pass-123',confirm:'Auto-driver-pass-123',gender:'man',owner:'Propriétaire test',car:'Voiture test',plate:'INDEPENDENT',category:'standard',documents,mobile:true};
 const count=files.size;const responses=await Promise.all([call('/api/drivers/register',{...payload,email:'independent-driver-a@example.test'}),call('/api/drivers/register',{...payload,email:'independent-driver-b@example.test'})]);
 assert.deepEqual(responses.map(result=>result.status),[200,200]);assert.equal(files.size,count+8);
 for(const result of responses){const state=await call('/api/rides/state',undefined,undefined,result.data.token);assert.equal(state.data.application.status,'pending');assert.equal(state.data.application.documents,undefined)}
});
await test('caisse Cloud persistante : double envoi unique, accès principal et versement chauffeur',async()=>{
 const admin=await call('/api/mobile/admin/login',{email:'recovered@example.test',password:'New-strong-pass-123'});
 assert.equal(admin.status,200);
 const overview=await call('/api/admin/overview',undefined,undefined,admin.data.token);
 const course=overview.data.finance.courses.find(course=>course.currency==='CDF');assert.ok(course);
 const payload={action:'finance.receipt',rideId:course.id,amount:String(course.fareMinor),method:'mobile_money',holder:'company',reference:'CLOUD-RECEIPT-UNIQUE',note:'Transaction externe vérifiée en test',idempotencyKey:'cloud-finance-idempotency-001'};
 const duplicate=await Promise.all([call('/api/admin/manage',payload,undefined,admin.data.token),call('/api/admin/manage',payload,undefined,admin.data.token)]);
 assert.deepEqual(duplicate.map(result=>result.status),[200,200]);
 let finance=(await call('/api/admin/overview',undefined,undefined,admin.data.token)).data.finance;
 assert.equal(finance.entries.filter(entry=>entry.reference==='CLOUD-RECEIPT-UNIQUE').length,1);
 const driver=finance.drivers.find(driver=>driver.id===course.driverId&&driver.currency==='CDF');assert.ok(driver.balance>0);
 const paid=await call('/api/admin/manage',{action:'finance.payout',driverId:driver.id,currency:'CDF',amount:String(driver.balance),method:'mobile_money',reference:'CLOUD-PAYOUT-UNIQUE',note:'Versement externe confirmé en test',idempotencyKey:'cloud-finance-idempotency-002'},undefined,admin.data.token);
 assert.equal(paid.status,200);
 finance=(await call('/api/admin/overview',undefined,undefined,admin.data.token)).data.finance;
 assert.equal(finance.drivers.find(item=>item.id===driver.id&&item.currency==='CDF').balance,0);
 assert.equal(finance.automaticPayouts,false);
 const client=await call('/api/mobile/login',{email:'other@example.test',password:'Strong-test-pass-123'});
 assert.notEqual((await call('/api/admin/manage',payload,undefined,client.data.token)).status,200);
});

db.close();
