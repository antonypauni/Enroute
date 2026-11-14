import React,{useEffect,useRef,useState} from 'react';

export default function DriverTracking({rideId,send}) {
  const [sharing,setSharing]=useState(false),[status,setStatus]=useState('Partage arrêté.');
  const api=useRef(send);api.current=send;
  useEffect(()=>{
    if(!sharing)return;
    let active=true,lastSent=0,pending=false;
    const pause=()=>{if(document.hidden)setSharing(false)};
    document.addEventListener('visibilitychange',pause);
    if(!navigator.geolocation){setStatus('GPS indisponible sur ce navigateur.');setSharing(false);return()=>document.removeEventListener('visibilitychange',pause)}
    const watch=navigator.geolocation.watchPosition(async position=>{
      if(!active||pending||Date.now()-lastSent<5000)return;
      pending=true;lastSent=Date.now();
      try{await api.current('rides/location',{id:rideId,point:[position.coords.latitude,position.coords.longitude],accuracy:position.coords.accuracy,timestamp:position.timestamp});if(active)setStatus('Position transmise au passager. Gardez cette page visible.');}
      catch(error){if(active)setStatus(error.message)}finally{pending=false}
    },error=>{if(active){setStatus(error.code===1?'Autorisez la localisation pour partager le GPS.':'Signal GPS indisponible.');if(error.code===1)setSharing(false)}},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
    return()=>{active=false;navigator.geolocation.clearWatch(watch);document.removeEventListener('visibilitychange',pause);api.current('rides/location/stop',{id:rideId}).catch(()=>{})};
  },[sharing,rideId]);
  return <div className="driver-sharing"><strong>GPS du chauffeur</strong><p role="status">{status} Le partage fonctionne pendant la course, avec cette page au premier plan.</p><button type="button" onClick={()=>{setSharing(value=>!value);setStatus(sharing?'Partage arrêté.':'Recherche du signal GPS…')}}>{sharing?'Arrêter le partage GPS':'Partager mon GPS avec le passager'}</button></div>;
}
