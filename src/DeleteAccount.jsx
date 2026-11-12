import React,{useState} from 'react';
export default function DeleteAccount({user,onLogin,onDeleted}) {
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [done,setDone]=useState(false);
  async function submit(event) {
    event.preventDefault();setBusy(true);setError('');
    try {
      const response=await fetch('/api/account/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      const result=await response.json();
      if(!response.ok)throw Error(result.error);
      setPassword('');setDone(true);onDeleted();
    }catch(error){setError(error.message)}finally{setBusy(false)}
  }
  return <section className="bookings"><h1>Supprimer mon compte</h1>{done?<p role="status">Ton compte a été supprimé.</p>:<>
    <p>La suppression retire ton compte client, tes documents chauffeurs et tes données personnelles associées. Les courses actives sont annulées.</p>
    {!user?<button className="primary" onClick={onLogin}>Connexion client</button>:user.role!=='client'?<p>Connecte-toi avec le compte client à supprimer.</p>:<form onSubmit={submit}>
      <label>Mot de passe<input type="password" required maxLength="128" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></label>
      <label><input type="checkbox" checked={confirm} onChange={event=>setConfirm(event.target.checked)} required/> Je confirme la suppression définitive de mon compte client.</label>
      {error&&<p role="alert">{error}</p>}
      <button disabled={busy||!confirm} className="primary">{busy?'Suppression…':'Supprimer définitivement'}</button>
    </form>}
  </>}</section>;
}
