import React,{useEffect,useState} from 'react';
import DriverRegistration from './DriverRegistration';

export default function DriverSpace({user,onLogin,onDone}){
  const [application,setApplication]=useState(null),[error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    async function refresh(){
      try{
        const response=await fetch('/api/rides/state');
        const result=await response.json();
        if(!response.ok)throw Error(result.error||'Impossible de vérifier le statut du dossier.');
        if(active){setApplication(result.application);setError('')}
      }catch(error){if(active)setError(error.message)}
    }
    refresh();const timer=setInterval(refresh,10000);
    return()=>{active=false;clearInterval(timer)};
  },[user?.id]);
  return <div className="bookings ride-center">
    {error&&<p role="alert" className="auth-error">{error} Le dossier affiché ci-dessous reste conservé.</p>}
    <DriverRegistration user={user} application={application} onLogin={onLogin} onDone={async result=>{
      setApplication(result.application);
      await onDone?.(result);
    }}/>
  </div>;
}
