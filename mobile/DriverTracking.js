import {useEffect,useState} from 'react';
import {AppState,Pressable,Text,View} from 'react-native';
import * as Location from 'expo-location';

export default function DriverTracking({rideId,send}) {
  const [sharing,setSharing]=useState(false);
  const [status,setStatus]=useState('Le GPS est arrêté.');
  const [visibility,setVisibility]=useState(AppState.currentState);
  useEffect(()=>{const subscription=AppState.addEventListener('change',state=>{setVisibility(state);if(state!=='active')setSharing(false)});return()=>subscription.remove()},[]);
  useEffect(()=>{
    if(!sharing||visibility!=='active')return;
    let active=true,watcher,pending=false,lastSent=0;
    async function start(){try{
      const permission=await Location.requestForegroundPermissionsAsync();
      if(!active)return;
      if(permission.status!=='granted')throw Error('Autorise la localisation pour partager ta position.');
      const subscription=await Location.watchPositionAsync({accuracy:Location.Accuracy.High,timeInterval:5000,distanceInterval:0},async position=>{
        if(!active||pending||Date.now()-lastSent<5000)return;
        pending=true;lastSent=Date.now();
        try{await send('rides/location',{id:rideId,point:[position.coords.latitude,position.coords.longitude],accuracy:position.coords.accuracy,timestamp:position.timestamp,mocked:position.mocked===true});if(active)setStatus('Position transmise au passager. Garde cet écran ouvert.');}
        catch(error){if(active)setStatus(error.message)}finally{pending=false}
      },error=>{if(active)setStatus(String(error))});
      if(active)watcher=subscription;else subscription.remove();
    }catch(error){if(active){setStatus(error.message);setSharing(false)}}}
    start();
    return()=>{active=false;watcher?.remove();send('rides/location/stop',{id:rideId}).catch(()=>{});};
  },[sharing,visibility,rideId,send]);
  return <View style={{gap:10,padding:14,backgroundColor:'#edf4df',borderRadius:16}}>
    <Text style={{color:'#173e36',fontWeight:'700'}}>Position du chauffeur</Text>
    <Text style={{color:'#52665d',lineHeight:20}}>{status} Le partage fonctionne uniquement lorsque l’application est au premier plan, pendant cette course.</Text>
    <Pressable accessibilityRole="button" onPress={()=>{setSharing(value=>!value);setStatus(sharing?'Le GPS est arrêté.':'Recherche du signal GPS…')}} style={{padding:13,backgroundColor:'#173e36',borderRadius:12}}><Text style={{color:'#fff',textAlign:'center',fontWeight:'700'}}>{sharing?'Arrêter le partage GPS':'Partager mon GPS avec le passager'}</Text></Pressable>
  </View>;
}
