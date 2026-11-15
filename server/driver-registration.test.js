import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDriverSignup} from './driverRegistration.js';
import {auth,currentUser} from './auth.js';

const documents=Object.fromEntries(['identity','license','registration','insurance'].map(key=>[key,'data:application/pdf;base64,JVBERg==']));
const payload={name:'Chauffeur test',email:'driver-atomic@example.test',phone:'0812345678',password:'Automatic-driver-123',confirm:'Automatic-driver-123',gender:'man',car:'Voiture test',owner:'Propriétaire test',plate:'TEST',category:'standard',documents};

test('le dépôt chauffeur ne crée jamais le premier administrateur',()=>{
  const state={users:[]};assert.throws(()=>validateDriverSignup(payload,state,null));assert.equal(state.users.length,0);
  assert.throws(()=>validateDriverSignup({...payload,role:'primary'},{users:[{role:'primary'}]},null));
});

test('échec de sauvegarde : pas de compte incomplet et session invitée conservée',async()=>{
  const state={users:[],trips:[],bookings:[]},headers={},res={setHeader:(name,value)=>headers[name]=value};
  const req={headers:{},socket:{remoteAddress:'driver-atomic-test'}},persist=async()=>{};
  await auth('/api/register',{name:'Admin test',email:'admin-atomic@example.test',password:'Admin-atomic-123'},req,res,state,persist);
  await auth('/api/guest/session',{},req,res,state,persist);
  req.headers.cookie=headers['Set-Cookie'].split(';')[0];const guest=currentUser(req,state),before=JSON.stringify(state),cookie=headers['Set-Cookie'];
  await assert.rejects(auth('/api/drivers/register',payload,req,res,state,async()=>{throw Error('Échec de disque fictif')},guest));
  assert.equal(JSON.stringify(state),before);assert.equal(headers['Set-Cookie'],cookie);assert.equal(currentUser(req,state).id,guest.id);
  const created=await auth('/api/drivers/register',payload,req,res,state,persist,guest);assert.equal(created.user.accountType,'driver');assert.equal(created.application.status,'pending');assert.equal(state.users.filter(user=>user.email===payload.email).length,1);
});
