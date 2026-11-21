import React,{useEffect,useState} from 'react';
import {createLiveRefresh} from '../mobile/liveRefresh.mjs';
export default function DriverRequestNotice({user,onOpen}){
 const [count,setCount]=useState(0),[error,setError]=useState('');
 useEffect(()=>{
  if(user?.accountType!=='driver')return;
  const live=createLiveRefresh({isActive:()=>!document.hidden,interval:2000,read:async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   try{const response=await fetch('/api/rides/state',{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('Actualisation indisponible');return await response.json();}finally{clearTimeout(timer)}
  },onData:data=>{setCount(data.available?.length||0);setError('')},onError:()=>setError('Connexion interrompue · demandes à actualiser')});
  const wake=()=>{if(document.visibilityState!=='hidden')live.refresh()};live.refresh();window.addEventListener('focus',wake);window.addEventListener('online',wake);document.addEventListener('visibilitychange',wake);
  return()=>{live.stop();window.removeEventListener('focus',wake);window.removeEventListener('online',wake);document.removeEventListener('visibilitychange',wake)};
 },[user?.id,user?.accountType]);
 if(user?.accountType!=='driver')return null;
 return <aside className="driver-availability" aria-live="polite"><strong>{error||`${count} demande(s) compatible(s) à accepter`}</strong><button className="primary" onClick={onOpen}>Ouvrir les demandes clients</button></aside>;
}
