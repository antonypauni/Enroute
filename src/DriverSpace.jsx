import Rides from './Rides';
import React,{useEffect,useState} from 'react';
import DriverRegistration from './DriverRegistration';

export default function DriverSpace({user,onLogin,onDone}){
  const [application,setApplication]=useState(null),[error,setError]=useState(''),[panel,setPanel]=useState('requests');
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
    refresh();const timer=setInterval(refresh,5000);
    return()=>{active=false;clearInterval(timer)};
  },[user?.id]);
  if(application?.status==='approved'&&user?.role==='client')return <><nav className="driver-space-nav" aria-label="Espace chauffeur"><button className={panel==='requests'?'primary':''} onClick={()=>setPanel('requests')}>Demandes clients et mes courses</button><button className={panel==='dossier'?'primary':''} onClick={()=>setPanel('dossier')}>Mon dossier chauffeur</button></nav>{panel==='requests'?<Rides user={user} onLogin={onLogin} driverMode/>:<div className="bookings ride-center"><DriverRegistration user={user} application={application} onLogin={onLogin}/></div>}</>;
  return <div className="bookings ride-center">
    {error&&<p role="alert" className="auth-error">{error} Le dossier affiché ci-dessous reste conservé.</p>}
    <DriverRegistration user={user} application={application} onLogin={onLogin} onDone={async result=>{
      setApplication(result.application);
      await onDone?.(result);
    }}/>
  </div>;
}
