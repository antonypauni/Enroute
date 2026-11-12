import test from 'node:test';import assert from 'node:assert/strict';import{auth,currentUser}from'./auth.js';
test('profil admin: mot de passe, rôle conservé et sessions invalidées',async()=>{const state={users:[]},headers={},res={setHeader:(k,v)=>headers[k]=v},req={headers:{},socket:{remoteAddress:'profile-test'}},persist=async()=>{};await auth('/api/register',{name:'adminP',email:'test@example.test',password:'InitialPass123'},req,res,state,persist);const u=state.users[0];req.headers.cookie=headers['Set-Cookie'].split(';')[0];assert.equal(currentUser(req,state).id,u.id);await assert.rejects(auth('/api/admin/profile',{name:'Nouveau',email:'new@example.test',currentPassword:'wrong'},req,res,state,persist,u));assert.equal(u.name,'adminP');await auth('/api/admin/profile',{name:'Nouveau',email:'new@example.test',currentPassword:'InitialPass123',password:'UpdatedPass123',confirm:'UpdatedPass123'},req,res,state,persist,u);assert.equal(u.name,'Nouveau');assert.equal(u.role,'primary');assert.equal(currentUser(req,state),null);await assert.rejects(auth('/api/login',{email:u.email,password:'InitialPass123'},req,res,state,persist));await auth('/api/login',{email:u.email,password:'UpdatedPass123'},req,res,state,persist);await assert.rejects(auth('/api/admin/profile',{},req,res,state,persist,{role:'client'}));});


test('connexion mobile sur serveur Node, restriction du jeton et déconnexion',async()=>{
  const state={users:[]},res={setHeader:()=>{}},req={headers:{},socket:{remoteAddress:'node-mobile-test'}};
  const persist=async()=>{};
  await auth('/api/register',{name:'Admin mobile',email:'mobile@example.test',password:'MobilePassword123'},req,res,state,persist);
  await auth('/api/register',{name:'Client mobile',email:'client-mobile@example.test',password:'MobilePassword123'},req,res,state,persist);
  const result=await auth('/api/mobile/login',{email:'client-mobile@example.test',password:'MobilePassword123'},req,res,state,persist);
  assert.match(result.token,/^[a-f0-9]{64}$/);
  const mobileReq={...req,headers:{authorization:`Bearer ${result.token}`}};
  assert.equal(currentUser(mobileReq,state).role,'client');
  assert.equal(currentUser({...req,headers:{cookie:`enroute_session=${result.token}`}},state),null);
  await auth('/api/logout',{},mobileReq,res,state,persist,state.users[0]);
  assert.equal(currentUser(mobileReq,state),null);
});
