import React,{useState} from 'react';

const documents=[['identity','Pièce d’identité'],['license','Permis de conduire'],['registration','Carte grise'],['insurance','Assurance']];
const statuses={pending:'En attente de validation',approved:'Dossier validé',rejected:'Dossier refusé / à compléter'};

export default function DriverRegistration({user,application,onDone,onLogin}) {
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[editing,setEditing]=useState(false);
  const newAccount=!user||user.role==='guest';
  async function submit(event){
    event.preventDefault();event.stopPropagation();if(busy)return;const form=event.target;
    setBusy(true);setError('');setNotice('');
    try{
      const values=new FormData(form),payload=Object.fromEntries(values);payload.documents={};
      if(newAccount&&payload.password!==payload.confirm)throw Error('Les mots de passe ne correspondent pas.');
      for(const [key,label] of documents){
        const file=values.get(key);
        const inferred=/\.pdf$/i.test(file?.name||'')?'application/pdf':/\.png$/i.test(file?.name||'')?'image/png':/\.jpe?g$/i.test(file?.name||'')?'image/jpeg':'';const mime=['application/pdf','image/jpeg','image/png'].includes(file?.type)?file.type:inferred;
        if(!file?.size||file.size>1000000||!mime)throw Error(label+' : choisissez un PDF, JPEG ou PNG de moins de 1 Mo.');
        payload.documents[key]=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve('data:'+mime+';base64,'+String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Impossible de lire '+label));reader.readAsDataURL(file)});delete payload[key];
      }
      const path=newAccount?'drivers/register':application?'drivers/resubmit':'drivers/apply';
      const response=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json();if(!response.ok)throw Error(result.error||'Le dossier n’a pas pu être envoyé.');
      form.reset();setEditing(false);setNotice(newAccount?'Votre compte chauffeur est créé. Votre dossier attend la validation de l’administration.':'Votre dossier a été envoyé à l’administration.');
      await onDone?.(result);
    }catch(error){setError(error.message)}finally{setBusy(false)}
  }
  return <section className="driver-enrollment" id="devenir-chauffeur">
    <div className="eyebrow">EN ROUTE · ESPACE CHAUFFEUR</div><h2>Votre dossier.<br/><span>Votre compte, automatiquement.</span></h2>
    <p>Complétez vos informations et joignez les quatre documents. Un seul envoi crée votre compte chauffeur et soumet le dossier à l’administration.</p>
    {notice&&<p role="status" className="admin-notice">{notice}</p>}{error&&<p role="alert" className="auth-error">{error}</p>}
    {user&&['primary','secondary'].includes(user.role)?<div><p>Le compte chauffeur est distinct du compte administrateur. Connectez-vous avec un compte chauffeur ou client pour déposer son dossier.</p><button type="button" onClick={onLogin}>Connexion chauffeur</button></div>:<>
      {application&&!editing&&<div className="driver-application-status"><span className="badge">{statuses[application.status]||application.status}</span><h3>{application.car} · {application.plate}</h3><p>{application.reviewNote||'L’administration vérifie vos documents avant d’autoriser les courses.'}</p><p>{application.status==='approved'?'Votre compte peut recevoir les courses compatibles.':'Vous ne pouvez pas encore accepter de courses.'}</p>{application.status!=='approved'&&<button onClick={()=>setEditing(true)}>Compléter ou remplacer mon dossier</button>}</div>}
      {(!application||editing)&&<form className="form-grid" onSubmit={submit}>
        {newAccount?<><label>Nom et prénom<input name="name" required minLength="2" maxLength="60" autoComplete="name"/></label><label>Adresse e-mail de connexion<input name="email" type="email" required maxLength="180" autoComplete="email"/></label><label>Choisir un mot de passe<input name="password" type="password" required minLength="10" maxLength="128" autoComplete="new-password"/></label><label>Confirmer le mot de passe<input name="confirm" type="password" required minLength="10" maxLength="128" autoComplete="new-password"/></label></>:<p>Le dossier sera rattaché automatiquement à votre compte : <strong>{user.name}</strong> · {user.email}.</p>}
        <label>Numéro portable<input name="phone" type="tel" required maxLength="30" autoComplete="tel" placeholder="+243…" defaultValue={application?.phone||''}/></label>
        <label>Identité du chauffeur<select name="gender" defaultValue={application?.gender||'man'}><option value="man">Conducteur</option><option value="woman">Conductrice</option></select></label>
        {[['owner','Propriétaire de la voiture'],['car','Marque et modèle'],['plate','Immatriculation']].map(([key,label])=><label key={key}>{label}<input name={key} required maxLength="100" defaultValue={application?.[key]||''}/></label>)}
        <label>Catégorie de voiture<select name="category" defaultValue={application?.category||'standard'}><option value="standard">Standard</option><option value="comfort">Confort</option><option value="xl">XL</option></select></label>
        {documents.map(([key,label])=><label key={key}>{label}<input type="file" name={key} required accept="application/pdf,image/jpeg,image/png"/><small>PDF, JPEG ou PNG · 1 Mo maximum</small></label>)}
        <p className="note">Les documents restent privés. Le compte est créé à l’envoi, mais l’accès aux courses dépend de la validation de l’administration. Pour remplacer un dossier, joignez à nouveau les quatre documents à jour.</p>
        <button type="submit" className="primary" disabled={busy}>{busy?'Envoi sécurisé du dossier…':newAccount?'Envoyer le dossier et créer mon compte chauffeur':'Envoyer mon dossier à la validation'}</button>
        {editing&&<button type="button" disabled={busy} onClick={()=>setEditing(false)}>Annuler la modification</button>}
        {newAccount&&<button type="button" className="link" disabled={busy} onClick={onLogin}>J’ai déjà un compte : me connecter</button>}
      </form>}
    </>}
  </section>;
}
