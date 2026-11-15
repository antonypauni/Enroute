import AdminConsole from './AdminConsole';
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
export function Admin(props){return <AdminConsole {...props}/>;}
