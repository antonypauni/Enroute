import{randomBytes,scrypt as rawScrypt,timingSafeEqual,createHash}from'node:crypto';
import{promisify}from'node:util';
const scrypt=promisify(rawScrypt);const sessions=new Map(),attempts=new Map();
export const publicUser=u=>u?{id:u.id,name:u.name,email:u.email,role:u.role}:null;
export function requestToken(req) {
  return /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1] ||
    (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith('enroute_session='))?.slice(16);
}
export function currentUser(req, state) {
  const token = requestToken(req);
  if (!token) return null;
  const key = createHash('sha256').update(token).digest('hex');
  const session = sessions.get(key);
  if (!session || session.expires < Date.now()) { sessions.delete(key); return null; }
  if (Boolean(session.mobile) !== Boolean(req.headers.authorization)) return null;
  return state.users.find(user => user.id === session.id) || null;
}
const cookie=(res,value,maxAge)=>res.setHeader('Set-Cookie',`enroute_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`);
export async function auth(path,f,req,res,state,persist,user){state.users||=[];if(path==='/api/register'&&state.users.length===0&&process.env.ADMIN_EMAIL&&String(f.email||'').trim().toLowerCase()!==process.env.ADMIN_EMAIL.trim().toLowerCase())throw Error('La configuration initiale est réservée à l’administrateur.');if(path==='/api/logout'){const token=requestToken(req);if(token)sessions.delete(createHash('sha256').update(token).digest('hex'));cookie(res,'',0);return{ok:true}}
if(path==='/api/admin/profile'){if(!user||!['primary','secondary'].includes(user.role))throw Error('Accès administrateur requis.');const password=typeof f.currentPassword==='string'&&f.currentPassword.length<=128?f.currentPassword:'';const actual=await scrypt(password,user.salt,64);if(!timingSafeEqual(actual,Buffer.from(user.hash,'hex')))throw Error('Mot de passe actuel incorrect.');const name=String(f.name||'').trim(),email=String(f.email||'').trim().toLowerCase();if(name.length<2||name.length>60||email.length>180||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Vérifiez le nom et l’adresse e-mail.');if(state.users.some(u=>u.id!==user.id&&u.email===email))throw Error('Adresse e-mail indisponible.');if(f.password&&(typeof f.password!=='string'||f.password.length<10||f.password.length>128||f.password!==f.confirm))throw Error('Confirmez un mot de passe de 10 à 128 caractères.');const before={...user};user.name=name;user.email=email;if(f.password){user.salt=randomBytes(16).toString('hex');user.hash=(await scrypt(f.password,user.salt,64)).toString('hex')}try{await persist()}catch(e){Object.assign(user,before);throw e}for(const [key,s]of sessions)if(s.id===user.id)sessions.delete(key);cookie(res,'',0);return{user:publicUser(user)}}
if(path==='/api/register'||path==='/api/admin/users'){if(path==='/api/admin/users'&&user?.role!=='primary')throw Error('Seul l’admin principal peut créer un admin secondaire.');if(path==='/api/register'&&f.role)throw Error('Rôle non autorisé.');const email=String(f.email||'').trim().toLowerCase(),name=String(f.name||'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>180||name.length<2||name.length>60||typeof f.password!=='string'||f.password.length<10||f.password.length>128)throw Error('Indiquez un nom, un e-mail et un mot de passe de 10 à 128 caractères.');if(state.users.some(u=>u.email===email))throw Error('Inscription impossible avec cet e-mail.');const salt=randomBytes(16).toString('hex'),hash=(await scrypt(f.password,salt,64)).toString('hex');const role=path==='/api/admin/users'?'secondary':state.users.length===0?'primary':'client';const created={id:randomBytes(16).toString('hex'),name,email,role,salt,hash};state.users.push(created);try{await persist()}catch(e){state.users.pop();throw e}if(path==='/api/admin/users')return{user:publicUser(created)};return login(created,res)}
if(path==='/api/login'||path==='/api/mobile/login'){const key=req.socket.remoteAddress;const a=attempts.get(key)||{count:0,until:Date.now()+600000};if(a.until<Date.now()){a.count=0;a.until=Date.now()+600000}if(++a.count>20)throw Error('Trop de tentatives. Réessayez dans 10 minutes.');attempts.set(key,a);const u=state.users.find(u=>u.email===String(f.email||'').trim().toLowerCase());const p=typeof f.password==='string'&&f.password.length<=128?f.password:'';const h=await scrypt(p,u?.salt||'invalid',64);if(!u||!timingSafeEqual(h,Buffer.from(u.hash,'hex')))throw Error('E-mail ou mot de passe incorrect.');attempts.delete(key);return login(u,res,path==='/api/mobile/login')}return null}
function login(user, res, mobile = false) {
  const token = randomBytes(32).toString('hex');
  sessions.set(createHash('sha256').update(token).digest('hex'), {id:user.id,expires:Date.now()+86400000,mobile});
  if (mobile) return {user:publicUser(user),token};
  cookie(res,token,86400);
  return {user:publicUser(user)};
}
