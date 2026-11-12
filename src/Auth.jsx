import AdminProfile from './AdminProfile';
import React,{useState,useEffect} from 'react';

export function Auth({setup,audience='client',onDone,onClose}) {
  const [register,setRegister]=useState(location.hash==='#inscription');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const admin=setup || audience==='admin';
  async function submit(event) {
    event.preventDefault();
    setBusy(true);setError('');
    try {
      const fields=Object.fromEntries(new FormData(event.target));
      const endpoint=setup||register?'register':admin?'admin/login':'client/login';
      const response=await fetch('/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fields)});
      const body=await response.json();
      if(!response.ok) throw Error(body.error);
      onDone(body.user);
    } catch(error) {setError(error.message)}
    finally {setBusy(false)}
  }
  return <div className="overlay"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
    <button className="close" onClick={onClose} aria-label="Fermer">×</button>
    <div className="eyebrow">EN ROUTE · {admin?'ADMINISTRATION':'ESPACE CLIENT'}</div>
    <h2 id="auth-title">{setup?'Configurer l’administrateur':register?'Créer mon compte client':admin?'Connexion administrateur':'Connexion client'}</h2>
    <form onSubmit={submit}>
      {(setup||register)&&<label>Votre nom<input name="name" autoComplete="name" minLength="2" maxLength="60" required/></label>}
      <label>Adresse e-mail<input name="email" type="email" autoComplete="email" maxLength="180" required/></label>
      <label>Mot de passe<input name="password" type="password" minLength={setup||register?10:1} maxLength="128" autoComplete={setup||register?'new-password':'current-password'} required/></label>
      {error&&<p role="alert" className="auth-error">{error}</p>}
      <button disabled={busy} className="primary full">{busy?'Connexion…':setup?'Créer l’administrateur':register?'Créer mon compte':'Se connecter'}</button>
    </form>
    {!admin&&<button className="link" onClick={()=>{setRegister(!register);setError('')}}>{register?'J’ai déjà un compte':'Créer un compte client'}</button>}
  </section></div>;
}
export function Admin({user,onUpdated}){const[data,D]=useState(null),[error,E]=useState(''),[notice,N]=useState('');async function load(){const r=await fetch('/api/admin/overview');const d=await r.json();if(r.ok)D(d);else E(d.error)}useEffect(()=>{load()},[]);async function create(e){e.preventDefault();const form=e.target;E('');N('');try{const r=await fetch('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))}),d=await r.json();if(!r.ok)throw Error(d.error);form.reset();N('Admin secondaire créé. Il peut se connecter avec ses identifiants.');await load()}catch(e){E(e.message)}}return <section className="bookings"><div className="eyebrow">ADMINISTRATION · {user.role==='primary'?'ADMIN PRINCIPAL':'ADMIN SECONDAIRE'}</div><h1>Tableau de bord</h1><AdminProfile user={user} onUpdated={onUpdated}/>{data&&<><div className="admin-stats"><article><b>{data.users.length}</b><p>Comptes</p></article><article><b>{data.trips.length}</b><p>Trajets</p></article><article><b>{data.bookings.length}</b><p>Réservations</p></article></div><h2>Comptes utilisateurs</h2>{data.users.map(u=><div className="user-row" key={u.id}><strong>{u.name}</strong><span>{u.email}</span><span>{({primary:'Admin principal',secondary:'Admin secondaire',client:'Client'})[u.role]}</span></div>)}</>}{user.role==='primary'&&<section className="admin-create"><h2>Créer un admin secondaire</h2><form onSubmit={create} className="form-grid"><label>Nom<input required name="name" minLength="2" maxLength="60"/></label><label>E-mail<input required name="email" type="email"/></label><label>Mot de passe initial<input required name="password" type="password" minLength="10" maxLength="128" autoComplete="new-password"/></label><button className="primary">Créer l’admin 2</button></form></section>}{error&&<p role="alert" className="auth-error">{error}</p>}{notice&&<p role="status">{notice}</p>}</section>}
