import {matchesRideView} from './rideVisibility.mjs';
import VehicleArt from './VehicleArt';
import {rideStatusLabel,nextRideStep} from './rideExperience.mjs';
import {isCashRide} from './ridePayment.mjs';
import {createLiveRefresh} from './liveRefresh.mjs';
import PaymentMethods from './PaymentMethods';
import {ridePaymentLabel} from './ridePayment.mjs';
import {acceptRide,connectionMessage,performRideAction} from './rideAcceptance.mjs';
import DriverRegistration from './DriverRegistration';
import AdminConsole from './AdminConsole';
import RideMap from './RideMap';
import DriverTracking from './DriverTracking';
import {centers,inServiceArea,closestCommune} from './places';
import * as Location from 'expo-location';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, AppState, Alert, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as SecureStore from 'expo-secure-store';

const origin = (process.env.EXPO_PUBLIC_API_URL || 'https://enroute-rdc-test-toman.antonypauniduquetom.chatgpt.site').replace(/\/$/, '');
const sessionKey = 'enroute-session-v1';
const communes = ['Bandalungwa','Barumbu','Bumbu','Gombe','Kalamu','Kasa-Vubu','Kimbanseke','Kinshasa','Kintambo','Kisenso','Lemba','Limete','Lingwala','Makala','Maluku','Masina','Matete','Mont-Ngafula','Ndjili','Ngaba','Ngaliema','Ngiri-Ngiri','Nsele','Selembao'];
const categories = {standard:'Standard',comfort:'Confort',xl:'XL'};
const statuses = {requested:'En attente',accepted:'Acceptée',completed:'Terminée',cancelled:'Annulée'};
const ink = '#103e34', leaf = '#f2d66c', muted = '#536b60';
const fare = value => `${Number(value).toLocaleString('fr-FR')} FC`;
const inKinshasa = value => new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Kinshasa'}).format(new Date(value));

async function request(path, data, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ['drivers/register','drivers/apply','drivers/resubmit'].includes(path)?120000:12000);
  try {
    const response = await fetch(`${origin}/api/${path}`, {
      method: data ? 'POST' : 'GET',
      credentials:'omit',
      headers: {...(data && {'Content-Type':'application/json'}), ...(token && {Authorization:`Bearer ${token}`})},
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(body.error || 'Le service est momentanément indisponible.'), {status:response.status});
    return body;
  } finally { clearTimeout(timer); }
}

function Button({children, onPress, secondary, disabled}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{children}</Text></Pressable>;
}

function Field({label, ...props}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={muted} style={styles.input} {...props}/></View>;
}

function Choice({label, value, options, onChange}) {
  const [open, setOpen] = useState(false);
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityState={{expanded:open}} accessibilityLabel={`${label}, ${value}`} onPress={()=>setOpen(!open)} style={styles.choice}><Text style={styles.choiceText}>{value}</Text><Text style={styles.choiceText}>{open ? '−' : '+'}</Text></Pressable>{open && <View style={styles.options}>{options.map(option=><Pressable accessibilityRole="button" key={option} onPress={()=>{onChange(option);setOpen(false)}} style={styles.option}><Text style={styles.choiceText}>{option}</Text></Pressable>)}</View>}</View>;
}

export default function App() {
  const [rideView,setRideView]=useState("active");
  const [checkoutStep,setCheckoutStep]=useState(0);
  const rideRevision=useRef(0);
  const [pickupPoint,setPickupPoint]=useState(null);
  const [destinationPoint,setDestinationPoint]=useState(null);
  const [mapTarget,setMapTarget]=useState('pickup');
  const [trackingNow,setTrackingNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setTrackingNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
  const [page, setPage] = useState('ride');
  const [session, setSession] = useState(null);
  const [account, setAccount] = useState(null);
  const [rides, setRides] = useState([]);
  const [available, setAvailable] = useState([]);
  const [from, setFrom] = useState('Lemba');
  const [to, setTo] = useState('Gombe');
  const [category, setCategory] = useState('standard');
  const [womenOnly, setWomenOnly] = useState(false);
  const [pickupLandmark,setPickupLandmark]=useState('');
  const [destinationLandmark,setDestinationLandmark]=useState('');
  const [passengers,setPassengers]=useState(1);
  const [passengerName,setPassengerName]=useState('');
  const [passengerPhone,setPassengerPhone]=useState('');
  const [passengerPhoto,setPassengerPhoto]=useState(null);
  const [ridePhotos,setRidePhotos]=useState({});
  const [loginMode,setLoginMode]=useState('client');
  const [register,setRegister]=useState(false);
  const [name,setName]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [deletePassword,setDeletePassword]=useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const [quoteError, setQuoteError] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [notice, setNotice] = useState('');
  const [justAccepted,setJustAccepted]=useState(null);
  const [financialStatus,setFinancialStatus]=useState(null);
  const [driverOnline,setDriverOnline]=useState(true);
  const [liveError,setLiveError]=useState(''),[lastSync,setLastSync]=useState(null);
  const [expandedOffer,setExpandedOffer]=useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sendAuthenticated=useCallback((path,data)=>request(path,data,session),[session]);
  async function useGPS(){const permission=await Location.requestForegroundPermissionsAsync();if(permission.status!=='granted')throw Error('Localisation refusée. Choisis ton départ sur la carte.');let timeout;let position;try{position=await Promise.race([Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Le GPS ne répond pas. Choisis ton départ sur la carte.')),20000)})])}finally{clearTimeout(timeout)}if(!Number.isFinite(position.coords.accuracy)||position.coords.accuracy>100)throw Error('Signal GPS imprécis. Choisis le départ sur la carte.');selectMapPoint('pickup',[position.coords.latitude,position.coords.longitude]);}
  function selectMapPoint(target,point){if(!inServiceArea(point))throw Error('Choisis un point dans la zone de Kinshasa.');if(target==='pickup'){setPickupPoint(point);setFrom(closestCommune(point))}else{setDestinationPoint(point);setTo(closestCommune(point))}setEstimate(null);setQuoteAttempt(value=>value+1)}

  async function driverRegistrationDone(result){
    if(result.token){await SecureStore.setItemAsync(sessionKey,result.token);setSession(result.token);setAccount(result.user);await refresh(result.token)}
    else{const state=await request('state',undefined,session);setAccount(state.user);await refresh(session)}
    setPage('driver');setNotice('Dossier envoyé. Ton compte chauffeur est prêt, en attente de validation.');
  }

  async function forgetSession() {
    setFinancialStatus(null);
    setSession(null); setAccount(null); setRides([]); setAvailable([]);
    setPassword('');setPasswordVisible(false);setDeletePassword('');setConfirmPassword('');
    await SecureStore.deleteItemAsync(sessionKey);
  }

  useEffect(()=>{
    let active = true;
    async function restore() {
      try {
        const token = await SecureStore.getItemAsync(sessionKey);
        if (!token) return;
        const data = await request('state', undefined, token);
        if (active && data.user) {setSession(token);setAccount(data.user);if(['primary','secondary'].includes(data.user.role)){setLoginMode('admin');setPage('admin')}else if(data.user.accountType==='driver'){setLoginMode('driver');setPage('offers')}}
      } catch (err) {
        if (active && err.status===401) await forgetSession();
        else if (active) setError('Vérifie ta connexion pour retrouver ta session.');
      }
    }
    restore();
    return ()=>{active=false};
  },[]);

  async function run(action) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {await action()}
    catch (err) {
      if (err.status===401 && session) {await forgetSession();setPage(account&&['primary','secondary'].includes(account.role)?'account':'ride')}
      setError(connectionMessage(err));
    } finally {setBusy(false)}
  }

  async function refresh(token = session) {
    const revision=rideRevision.current;
    const data = await request('rides/state', undefined, token);
    if(revision===rideRevision.current){setRides(data.rides || []); setAvailable(data.available || []);setFinancialStatus(data.financialStatus||null);setDriverOnline(data.application?.online!==false);}
  }

  useEffect(() => {
    if (!session || !(account?.accountType==='driver'||['trips','offers'].includes(page))) return;
    const live=createLiveRefresh({
      read:async()=>({revision:rideRevision.current,data:await request('rides/state',undefined,session)}),
      onData:({revision,data})=>{if(revision!==rideRevision.current)return;setRides(data.rides||[]);setAvailable(data.available||[]);setFinancialStatus(data.financialStatus||null);setDriverOnline(data.application?.online!==false);setLiveError('');setLastSync(Date.now());},
      onError:error=>setLiveError(connectionMessage(error))
    });
    live.refresh();
    const subscription=AppState.addEventListener('change',state=>{if(state==='active')live.refresh()});
    return()=>{live.stop();subscription.remove();};
  },[session,page,account?.accountType]);

  function navigate(next) {
    if (busy) return;
    setError('');setNotice('');setPage(next);
    if (next==='trips' && session) run(()=>refresh());
    if (next==='ride' && !estimate) setQuoteAttempt(value=>value+1);
  }

  function resetEstimate(setter, value) { setter(value); setEstimate(null); }
  function ridePayload() {return {from,to,pickupPoint,destinationPoint,category,passengers,womenOnly,passengerGender:womenOnly?'woman':undefined};}

  useEffect(() => {
    let active = true;
    setQuoteError('');
    setEstimate(null);
    const timer = setTimeout(async () => {
      try {
        const quote = await request('rides/quote', {from,to,category,womenOnly,passengers,pickupLandmark,destinationLandmark});
        if (active) setEstimate(quote);
      } catch (error) {
        if (active) setQuoteError(error.name==='AbortError'?'Le calcul a pris trop de temps. Réessaie.':error.message);
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [from,to,category,womenOnly,passengers,pickupLandmark,destinationLandmark,quoteAttempt]);

  async function confirmRide() {
    if (!pickupLandmark.trim() || !destinationLandmark.trim()) throw new Error('Indique le lieu précis de départ et d’arrivée.');
    if (!estimate) throw new Error('Le montant doit être recalculé avant de commander.');
    if(passengerName.trim().length<2 || !passengerPhone.trim())throw new Error('Indique ton nom et ton numéro de téléphone.');
    let token=session;
    if(!token){
      const guest=await request('guest/session',{mobile:true});
      await SecureStore.setItemAsync(sessionKey,guest.token);
      token=guest.token;setSession(token);setAccount(guest.user);
    }
    try {await request('rides/request',{...ridePayload(),passengerName:passengerName.trim(),passengerPhone:passengerPhone.trim(),...(passengerPhoto?{passengerPhoto}:{}),pickupLandmark:pickupLandmark.trim(),destinationLandmark:destinationLandmark.trim(),immediate:true,expectedTotal:estimate.total},token);} catch(error){if(error.message.includes('montant actualisé')){setEstimate(null);setQuoteAttempt(value=>value+1);setNotice('Le tarif a changé. Vérifie le nouveau montant avant de confirmer à nouveau.')}throw error}
    setEstimate(null);setRideView('active');setPage('trips');setNotice('Demande envoyée. Recherche d’un chauffeur.');
    await refresh(token);
  }

  async function choosePassengerPhoto() {
    const selected=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:1,exif:false});
    if(selected.canceled)return;
    const result=await ImageManipulator.manipulateAsync(selected.assets[0].uri,[{resize:{width:320}}],{compress:0.65,format:ImageManipulator.SaveFormat.JPEG,base64:true});
    if(!result.base64 || result.base64.length>204800)throw new Error('Cette photo est trop volumineuse. Choisis une autre image.');
    setPassengerPhoto('data:image/jpeg;base64,'+result.base64);
  }

  async function login() {
    if (!email.trim() || !password) throw new Error('Saisis ton adresse e-mail et ton mot de passe.');
    if(register && password!==confirmPassword)throw new Error('Les mots de passe ne correspondent pas.');
    if(register && (name.trim().length<2||password.length<10))throw new Error('Indique ton nom et un mot de passe d’au moins 10 caractères.');
    const endpoint=register?'mobile/register':loginMode==='admin'?'mobile/admin/login':'mobile/login';
    const data = await request(endpoint,{email,password,...(register?{name}: {})},account?.role==='guest'&&loginMode==='client'?session:undefined);
    if (!data.token || !data.user) throw new Error('La connexion mobile n’est pas encore disponible.');
    await SecureStore.setItemAsync(sessionKey,data.token);
    setSession(data.token);setAccount(data.user);setPassword('');setRegister(false);setConfirmPassword('');setPage(loginMode==='admin'?'admin':loginMode==='driver'||data.user.accountType==='driver'?'offers':'ride');
  }

  async function updateRide(action, id, extra = {}) {
    if(action==='accept'){
      const ride=await acceptRide({send:(path,body)=>request(path,body,session),readState:()=>request('rides/state',undefined,session),rideId:id,userId:account?.id});
      rideRevision.current++;setJustAccepted(id);setRides(previous=>[...previous.filter(item=>item.id!==id),ride]);setAvailable(previous=>previous.filter(item=>item.id!==id));
      setRideView('active');setPage('trips');setNotice('Course acceptée. Les coordonnées du passager sont disponibles.');return;
    }
    if(action==='progress'||action==='complete'){
      const ride=await performRideAction({send:(path,body)=>request(path,body,session),readState:()=>request('rides/state',undefined,session),rideId:id,userId:account?.id,action,extra});
      rideRevision.current++;setRides(previous=>previous.map(item=>item.id===id?ride:item));
      setNotice(action==='complete'?'Course terminée.'+(ride.cashCollectionConfirmed?' Déclaration des espèces enregistrée.':' Aucun nouvel encaissement déclaré.'):rideStatusLabel(ride));return;
    }
    await request(`rides/${action}`,{id,...extra},session);
    await refresh();
  }

  function confirmCompletion(ride){
    const finish=cashReceived=>run(()=>updateRide('complete',ride.id,{cashReceived}));
    Alert.alert('Terminer la course',isCashRide(ride)?fare(ride.total)+' · As-tu reçu les espèces restant dues ? La déclaration alimente le registre et la commission cumulée de 7 %.':'Confirmer la fin du trajet ?',isCashRide(ride)?[{text:'Revenir',style:'cancel'},{text:'Terminer sans encaissement',onPress:()=>finish(false)},{text:'Espèces reçues',onPress:()=>finish(true)}]:[{text:'Revenir',style:'cancel'},{text:'Terminer',onPress:()=>finish(false)}]);
  }

  function confirmGuestDeletion() {
    Alert.alert('Effacer les données invité ?', 'Tes données invité et tes courses seront supprimées. Tes courses actives seront annulées.',[
      {text:'Conserver',style:'cancel'},
      {text:'Effacer',style:'destructive',onPress:()=>run(async()=>{await request('guest/delete',{},session);await forgetSession();setPassengerPhoto(null);setPassengerName('');setPassengerPhone('');setPage('ride');setNotice('Données invité supprimées.');})},
    ]);
  }

  function confirmAccountDeletion() {
    if(!deletePassword){setError('Saisis ton mot de passe pour confirmer la suppression.');return}
    Alert.alert('Supprimer ton compte ?', 'Ton compte, tes documents et tes données personnelles seront supprimés. Tes courses actives seront annulées.',[
      {text:'Garder mon compte',style:'cancel'},
      {text:'Supprimer définitivement',style:'destructive',onPress:()=>run(async()=>{
        await request('account/delete',{password:deletePassword},session);
        await forgetSession();setPage('account');setNotice('Ton compte a été supprimé.');
      })},
    ]);
  }

  function confirmCancellation(ride) {
    Alert.alert('Annuler cette course ?', `${ride.from} → ${ride.to}`, [
      {text:'Garder la course',style:'cancel'},
      {text:'Annuler la course',style:'destructive',onPress:()=>run(()=>updateRide('cancel',ride.id))},
    ]);
  }

  function rideCard(ride, isAvailable = false) {
    const gpsLive=ride.driverLocation&&trackingNow-ride.driverLocation.receivedAt<=30000;
    const isClient = ride.ownerId===account?.id;
    const isDriver = ride.driverId===account?.id;
    return <View key={ride.id} style={styles.card}>{isAvailable&&<Text style={styles.offerRibbon}>NOUVELLE DEMANDE</Text>}{(isAvailable||isDriver)&&<View style={styles.offerIdentity}><View style={styles.offerAvatar}>{ridePhotos[ride.id]?<Image source={{uri:ridePhotos[ride.id]}} accessibilityLabel="Photo facultative du client" style={{width:64,height:64,borderRadius:18}}/>:<Text style={styles.offerInitial}>{(ride.passengerName||'Client').slice(0,1).toUpperCase()}</Text>}</View><View style={{flex:1,gap:6}}><Text style={styles.label}>CLIENT</Text><Text style={styles.cardTitle}>{ride.passengerName||'Client'}</Text></View></View>}<Text style={styles.label}>{rideStatusLabel(ride)}{ride.womenOnly ? ' · Spécial femme' : ''}</Text><Text style={styles.cardTitle}>{ride.from} → {ride.to}</Text><Text style={styles.body}>{ride.immediate?'Départ immédiat':inKinshasa(ride.departure)} · {fare(ride.total)}</Text><Text style={styles.body}>Paiement · {ridePaymentLabel(ride)}</Text><Text style={styles.body}>Départ · {ride.pickupLandmark||ride.from}</Text>{['requested','accepted'].includes(ride.status)&&(!isAvailable||expandedOffer===ride.id)&&<RideMap pickup={ride.pickupPoint||centers[ride.from]} destination={ride.destinationPoint||centers[ride.to]} driver={gpsLive?ride.driverLocation.point:null}/>} {ride.status==='accepted'&&<Text style={styles.body}>{gpsLive?'GPS reçu à '+new Date(ride.driverLocation.receivedAt).toLocaleTimeString('fr-FR')+' · précision '+ride.driverLocation.accuracy+' m':(ride.locationStatus==='stale'||ride.driverLocation)?'Position du chauffeur non actualisée.':'En attente du partage GPS du chauffeur.'}</Text>}{isDriver&&ride.status==='accepted'&&<DriverTracking rideId={ride.id} send={sendAuthenticated} onPosition={location=>{if(!location)return;rideRevision.current++;setRides(previous=>previous.map(item=>item.id===ride.id?{...item,driverLocation:location,locationStatus:'live'}:item))}} autoStart={justAccepted===ride.id}/>} <Text style={styles.body}>Arrivée · {ride.destinationLandmark||ride.to}</Text><Text style={styles.body}>{ride.passengers||1} passager{(ride.passengers||1)>1?'s':''}</Text>{ride.passengerName&&!isAvailable&&!isDriver&&<Text style={styles.body}>Client · {ride.passengerName}</Text>}{ride.passengerPhone&&<Button secondary onPress={()=>Linking.openURL('tel:'+ride.passengerPhone).catch(()=>setError('Impossible d’ouvrir le téléphone.'))}>Appeler {ride.passengerPhone}</Button>}{(ride.hasPassengerPhoto||ride.photoKey||ride.passengerPhoto)&&<><Button secondary disabled={busy} onPress={()=>run(async()=>{const photo=await request('rides/photo',{id:ride.id},session);setRidePhotos(previous=>({...previous,[ride.id]:photo.data}))})}>Voir la photo</Button>{ridePhotos[ride.id]&&!isAvailable&&!isDriver&&<Image accessibilityLabel="Photo fournie par le client" source={{uri:ridePhotos[ride.id]}} style={{width:80,height:80,borderRadius:40}}/>}</>}{ride.assignedDriver&&!isDriver?<View style={styles.card}><Text style={styles.cardTitle}>Votre chauffeur est confirmé</Text><Text style={styles.body}>{ride.assignedDriver.name} · {ride.assignedDriver.car}</Text><Text style={styles.body}>Plaque · {ride.assignedDriver.plate}</Text>{!!ride.assignedDriver.phone&&<Button secondary onPress={()=>Linking.openURL('tel:'+ride.assignedDriver.phone).catch(()=>setError('Impossible d’ouvrir le téléphone.'))}>Appeler le chauffeur</Button>}<Text style={styles.body}>{gpsLive?'Position GPS en direct sur la carte.':'Chauffeur affecté · en attente de son signal GPS.'}</Text></View>:!isDriver&&ride.driverName && <Text style={styles.body}>Chauffeur · {ride.driverName}</Text>}{isAvailable&&<><Button secondary onPress={()=>setExpandedOffer(expandedOffer===ride.id?null:ride.id)}>{expandedOffer===ride.id?'Masquer la carte':'Voir le point client'}</Button><Text style={styles.body}>Le numéro du client sera disponible après acceptation. Autorise ensuite le GPS pour lui montrer ton arrivée.</Text></>}{isAvailable && <Button disabled={busy} onPress={()=>run(()=>updateRide('accept',ride.id))}>Accepter et partager mon GPS</Button>}{isClient && ['requested','accepted'].includes(ride.status) && <Button secondary disabled={busy} onPress={()=>confirmCancellation(ride)}>Annuler la demande</Button>}{isDriver && ride.status==='accepted' && (nextRideStep(ride)?<Button disabled={busy} onPress={()=>run(()=>updateRide('progress',ride.id,{stage:nextRideStep(ride).stage}))}>{nextRideStep(ride).label}</Button>:<Button disabled={busy} onPress={()=>confirmCompletion(ride)}>Terminer la course</Button>)}{isClient && ride.status==='completed' && (ride.rating ? <Text style={styles.body}>Note · {ride.rating}/5</Text> : <Choice label="Noter le véhicule" value="Choisir une note" options={['1','2','3','4','5']} onChange={value=>run(()=>updateRide('rate',ride.id,{rating:Number(value)}))}/>)}</View>;
  }

  return <SafeAreaProvider><SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS==='ios'?'padding':undefined}>
    <StatusBar style="dark" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text style={styles.brand}>Enroute <Text style={styles.arrow}>↗</Text></Text>
      <Text style={{color:muted,fontSize:11}}>Version 1.8.1 · Enroute</Text><View style={styles.nav}>{(account&&['primary','secondary'].includes(account.role)?[['admin','Administration'],['account','Compte']]:(account?.accountType==='driver'?[['offers','Demandes clients ('+available.length+')'],['trips','Mes courses'],['driver','Dossier'],['account','Compte']]:[['ride','Course'],['trips','Mes trajets'],['account','Compte']])).map(([id,label])=><Pressable key={id} onPress={()=>navigate(id)} accessibilityRole="tab" accessibilityState={{selected:page===id}} style={[styles.tab,page===id && styles.activeTab]}><Text style={styles.tabText}>{label}</Text></Pressable>)}</View>
      {session&&account?.accountType==='driver'&&<View style={styles.card}><Text accessibilityLiveRegion="polite" style={styles.body}>{liveError?'Actualisation interrompue : '+liveError:lastSync?'Demandes actualisées à '+new Date(lastSync).toLocaleTimeString('fr-FR'):'Connexion aux demandes…'}</Text>{available.length>0&&page!=='offers'&&<Button onPress={()=>navigate('offers')}>{available.length} demande(s) à accepter · Voir les clients</Button>}</View>}
      {financialStatus&&account?.accountType==='driver'&&<View style={styles.card}><Text style={styles.cardTitle}>{financialStatus.cashRestricted?'Compte actif · courses électroniques uniquement':'Votre commission cumulée'}</Text><Text style={styles.body}>{financialStatus.debtCDF.toLocaleString('fr-FR')} FC · seuil {financialStatus.thresholdCDF.toLocaleString('fr-FR')} FC{financialStatus.debtUSD>0?' · '+(financialStatus.debtUSD/100).toFixed(2)+' USD':''}</Text><Text style={styles.body}>{financialStatus.cashRestricted?'Les nouvelles courses en espèces sont indisponibles. Continuez les courses électroniques confirmées ; les espèces reviennent après régularisation de la commission.':'Les 7 % s’accumulent sans virement après chaque course.'}</Text></View>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
      {page==='ride' && <><View style={styles.rideHeading}><Text style={styles.heroLabel}>KINSHASA · RDC</Text><Text style={styles.heading}>On va où ?</Text><Text style={styles.body}>Votre prochaine course commence ici.</Text></View><Choice label="Point à placer sur la carte" value={mapTarget==='pickup'?'Départ':'Arrivée'} options={['Départ','Arrivée']} onChange={value=>setMapTarget(value==='Départ'?'pickup':'destination')}/><RideMap pickup={pickupPoint||centers[from]} destination={destinationPoint||centers[to]} selectTarget={mapTarget} onPoint={(target,point)=>{try{selectMapPoint(target,point)}catch(error){setError(error.message)}}}/><Text style={styles.body}>Touche la carte pour fixer {mapTarget==='pickup'?'ton départ':'ton arrivée'} précis. Le point jaune représente le client, le point vert l’arrivée et l’icône voiture le chauffeur.</Text><Button secondary disabled={busy} onPress={()=>run(useGPS)}>Utiliser mon GPS pour le départ</Button><View style={styles.bookingSheet}><Text style={styles.stepLabel}>{checkoutStep===0?"01 / 02 · VOTRE TRAJET":"02 / 02 · LE PASSAGER"}</Text><Text style={styles.cardTitle}>{checkoutStep===0?"Préparez votre trajet":"Qui voyage ?"}</Text>{checkoutStep===0?<><Choice label="Départ" value={from} options={communes} onChange={value=>{setPickupPoint(null);resetEstimate(setFrom,value)}}/>
        <Field label="Lieu précis de départ" value={pickupLandmark} onChangeText={setPickupLandmark} maxLength={120} placeholder="Quartier, avenue, numéro ou repère"/>
        <Choice label="Destination" value={to} options={communes} onChange={value=>{setDestinationPoint(null);resetEstimate(setTo,value)}}/>
        <Field label="Lieu précis d’arrivée" value={destinationLandmark} onChangeText={setDestinationLandmark} maxLength={120} placeholder="Quartier, avenue, numéro ou repère"/>
        <Text style={styles.label}>Choisis ta voiture</Text><View style={styles.categoryRow}>{Object.entries(categories).map(([id,title])=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:category===id}} onPress={()=>{resetEstimate(setCategory,id);setPassengers(count=>Math.min(count,id==='xl'?6:4))}} style={[styles.categoryCard,category===id&&styles.categorySelected]}><VehicleArt category={id}/><Text style={styles.categoryTitle}>{title}</Text><Text style={styles.categorySeats}>{id==='xl'?'6':'4'} places</Text></Pressable>)}</View>
        </>:<><Field label="Ton nom" value={passengerName} onChangeText={setPassengerName} maxLength={60} autoComplete="name"/>
        <Field label="Numéro de portable" value={passengerPhone} onChangeText={setPassengerPhone} keyboardType="phone-pad" autoComplete="tel" maxLength={30} placeholder="+243…"/>
        <Button secondary disabled={busy} onPress={()=>run(choosePassengerPhoto)}>{passengerPhoto?'Changer la photo':'Ajouter une photo (facultatif)'}</Button>
        {passengerPhoto&&<View style={styles.field}><Image accessibilityLabel="Ta photo facultative" source={{uri:passengerPhoto}} style={{width:80,height:80,borderRadius:40}}/><Button secondary onPress={()=>setPassengerPhoto(null)}>Retirer la photo</Button></View>}
        <PaymentMethods/><Choice label="Passagers" value={`${passengers} passager${passengers>1?'s':''}`} options={Array.from({length:category==='xl'?6:4},(_,index)=>`${index+1} passager${index?'s':''}`)} onChange={value=>resetEstimate(setPassengers,Number.parseInt(value,10))}/>
        <Pressable style={styles.choice} accessibilityRole="checkbox" accessibilityState={{checked:womenOnly}} onPress={()=>resetEstimate(setWomenOnly,!womenOnly)}><Text style={styles.choiceText}>{womenOnly ? '✓' : '○'}  Spécial femme</Text></Pressable>
        {womenOnly && <Text style={styles.body}>Je confirme être une passagère. La course est proposée à des conductrices.</Text>}
        </>}{estimate ? <View style={styles.price}><Text style={styles.label}>Prix estimé</Text><Text style={styles.amount}>{fare(estimate.total)}</Text><Text style={styles.body}>{estimate.km} km · {estimate.minutes} min environ</Text></View> : quoteError ? <View style={styles.field}><Text accessibilityRole="alert" style={styles.error}>{quoteError}</Text><Button secondary disabled={busy} onPress={()=>setQuoteAttempt(value=>value+1)}>Réessayer le calcul</Button></View> : <Text accessibilityLiveRegion="polite" style={styles.body}>Calcul du prix…</Text>}
        <Text style={styles.body}>Départ immédiat · Paiement en espèces au chauffeur.</Text>
        <Button disabled={busy || !estimate} onPress={()=>checkoutStep===0?(pickupLandmark.trim()&&destinationLandmark.trim()?setCheckoutStep(1):setError("Précise les lieux de départ et d’arrivée.")):run(confirmRide)}>{checkoutStep===0?"Continuer →":"Commander maintenant →"}</Button>{checkoutStep===1&&<Button secondary disabled={busy} onPress={()=>setCheckoutStep(0)}>← Modifier le trajet</Button>}
      </View></>}
      {page==='offers'&&<><View style={styles.hero}><Text style={styles.heroLabel}>ESPACE CHAUFFEUR</Text><Text style={styles.heroTitle}>Bonjour{account?.name?", "+account.name.split(" ")[0]:""}.</Text><Text style={styles.heroSubtitle}>Prêt pour la prochaine course ?</Text></View>{!session?<View style={styles.card}><Text style={styles.body}>Connecte-toi à ton compte chauffeur.</Text><Button onPress={()=>{setLoginMode('driver');setPage('account')}}>Connexion chauffeur</Button></View>:<><View style={styles.card}><Text style={styles.cardTitle}>{driverOnline?'En ligne · demandes actives':'Hors ligne'}</Text><Text style={styles.body}>Passer hors ligne arrête les nouvelles demandes. Ta course en cours reste accessible.</Text><Button disabled={busy} secondary onPress={()=>run(async()=>{const result=await request('drivers/availability',{online:!driverOnline},session);rideRevision.current++;setDriverOnline(result.online);await refresh()})}>{driverOnline?'Passer hors ligne':'Passer en ligne'}</Button></View><Button secondary disabled={busy} onPress={()=>run(()=>refresh())}>Actualiser les demandes</Button><Text style={styles.subheading}>{available.length} demande(s) compatible(s)</Text>{available.length?available.map(ride=>rideCard(ride,true)):<View style={styles.card}><Text style={styles.cardTitle}>Aucune nouvelle demande pour le moment.</Text><Text style={styles.body}>Les demandes apparaissent automatiquement pour les chauffeurs validés. Termine ta course en cours avant d’en accepter une autre.</Text><Button secondary onPress={()=>navigate('driver')}>Mon dossier chauffeur</Button></View>}</>}</>}
      {page==='driver'&&<DriverRegistration user={account} api={sendAuthenticated} onDone={driverRegistrationDone} onLogin={()=>{setLoginMode('driver');setRegister(false);setPage('account')}}/>}
      {page==='trips' && <><Text accessibilityRole="header" style={styles.heading}>Mes trajets</Text><View style={styles.categoryRow}><View style={{flex:1}}><Button secondary={rideView!=='active'} onPress={()=>setRideView('active')}>En cours</Button></View><View style={{flex:1}}><Button secondary={rideView!=='history'} onPress={()=>setRideView('history')}>Historique</Button></View></View>{!session ? <View style={styles.card}><Text style={styles.body}>Tes courses apparaîtront ici après ta première commande.</Text><Button onPress={()=>navigate('ride')}>Commander une course</Button></View> : <><Button secondary disabled={busy} onPress={()=>run(()=>refresh())}>Actualiser</Button>{account?.role==='guest'&&<Text style={styles.body}>Mode invité. Conserve cet appareil pour retrouver tes courses.</Text>}{available.length>0 && <><Text style={styles.subheading}>Demandes disponibles</Text>{available.map(ride=>rideCard(ride,true))}</>}{rides.some(ride=>matchesRideView(ride,rideView)) ? rides.filter(ride=>matchesRideView(ride,rideView)).map(ride=>rideCard(ride)) : <Text style={styles.body}>{rideView==='active'?'Aucune course en cours. Les courses terminées et annulées sont dans l’historique.':'Aucune course dans l’historique.'}</Text>}</>}</>}
      {page==='account' && <><Text accessibilityRole="header" style={styles.heading}>Mon compte</Text>{!['primary','secondary'].includes(account?.role)&&<Button secondary onPress={()=>navigate('driver')}>{account?.accountType==='driver'?'Mon dossier chauffeur':'Devenir chauffeur · envoyer mon dossier'}</Button>}{account?.role==='guest'&&<View style={styles.card}><Text style={styles.cardTitle}>Mode invité</Text><Text style={styles.body}>Tu peux commander directement avec ton nom et ton téléphone.</Text><Button secondary disabled={busy} onPress={confirmGuestDeletion}>Effacer mes données invité</Button></View>}<View style={styles.card}>{account && account.role!=='guest' ? <><Text style={styles.cardTitle}>{account.name}</Text><Text style={styles.body}>{account.email}</Text><Button secondary disabled={busy} onPress={()=>run(async()=>{try {await request('logout',{},session)} finally {await forgetSession()}})}>Se déconnecter</Button>{account.role==='client'&&<><Field label="Mot de passe pour supprimer le compte" value={deletePassword} onChangeText={setDeletePassword} secureTextEntry autoCapitalize="none" autoCorrect={false}/><Button secondary disabled={busy} onPress={confirmAccountDeletion}>Supprimer mon compte</Button></>}</> : <><View style={styles.loginBadge}><Text style={styles.loginBadgeText}>Enroute ↗</Text></View><View style={styles.loginRoles}>{[['client','Client'],['driver','Chauffeur'],['admin','Admin']].map(([id,title])=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:loginMode===id}} style={[styles.loginRole,loginMode===id&&styles.loginRoleActive]} onPress={()=>{setLoginMode(id);setRegister(false);setPassword('');setError('')}}><Text style={[styles.loginRoleText,loginMode===id&&{color:'#fff'}]}>{title}</Text></Pressable>)}</View><Text style={styles.body}>{loginMode==='admin'?'Connecte-toi avec ton compte administrateur Enroute.':loginMode==='driver'?'Connecte-toi avec ton compte chauffeur Enroute.':'Connecte-toi avec ton compte client Enroute.'}</Text>{register&&<Field label="Ton nom" value={name} onChangeText={setName} maxLength={60} autoComplete="name"/>}<Field label="Adresse e-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email"/><Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false} autoComplete={register?"new-password":"current-password"}/>{register&&<Field label="Confirmer le mot de passe" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password"/>}<Button secondary disabled={busy} onPress={()=>setPasswordVisible(value=>!value)}>{passwordVisible?'Masquer le mot de passe':'Afficher le mot de passe'}</Button><Button disabled={busy} onPress={()=>run(login)}>{register?'Créer mon compte client':'Se connecter'}</Button>{loginMode==='client'&&<Button secondary disabled={busy} onPress={()=>{setRegister(value=>!value);setPassword('');setConfirmPassword('');setError('')}}>{register?'J’ai déjà un compte':'Créer un compte client'}</Button>}</>}</View></>}
      {page==='admin' && account && ['primary','secondary'].includes(account.role) && <AdminConsole api={sendAuthenticated} user={account} onUpdated={async()=>{await forgetSession();setLoginMode('admin');setPage('account');setNotice('Compte modifié. Reconnectez-vous avec vos nouveaux identifiants.')}}/>}
      {busy && <ActivityIndicator accessibilityLabel="Chargement" color={ink}/>}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView></SafeAreaProvider>;
}

const styles = StyleSheet.create({loginBadge:{backgroundColor:ink,borderRadius:17,padding:18,alignSelf:"flex-start"},loginBadgeText:{color:leaf,fontSize:22,fontWeight:"800",fontStyle:"italic"},loginRoles:{flexDirection:"row",gap:5,backgroundColor:"#eaf0e8",padding:5,borderRadius:14},loginRole:{flex:1,minHeight:46,alignItems:"center",justifyContent:"center",borderRadius:10},loginRoleActive:{backgroundColor:ink},loginRoleText:{color:ink,fontSize:13,fontWeight:"700"},rideHeading:{gap:7,paddingVertical:8},bookingSheet:{backgroundColor:"#fff",borderRadius:28,padding:20,gap:16,borderWidth:1,borderColor:"#dfe7e3"},stepLabel:{color:"#517562",fontSize:11,fontWeight:"700",letterSpacing:1.5},offerRibbon:{backgroundColor:"#f2d66c",color:ink,padding:12,borderRadius:10,fontSize:12,fontWeight:"800",letterSpacing:1},offerIdentity:{flexDirection:'row',alignItems:'center',gap:14},offerAvatar:{width:64,height:64,borderRadius:18,backgroundColor:'#e6efd8',alignItems:'center',justifyContent:'center',overflow:'hidden'},offerInitial:{fontSize:29,fontWeight:'800',color:'#173e36'},
  screen:{flex:1,backgroundColor:'#f5f7f6'},content:{paddingHorizontal:20,paddingTop:16,paddingBottom:56,gap:20,maxWidth:560,width:'100%',alignSelf:'center'},
  brand:{color:ink,fontSize:30,fontWeight:'800',letterSpacing:-1.4},arrow:{color:'#437c62'},nav:{flexDirection:'row',gap:4,backgroundColor:'#e8eeea',padding:5,borderRadius:18},tab:{flex:1,alignItems:'center',justifyContent:'center',minHeight:50,paddingHorizontal:3,borderRadius:14},activeTab:{backgroundColor:'#fff',borderWidth:1,borderColor:'#d7e3da'},tabText:{fontSize:13,fontWeight:'700',color:ink,textAlign:'center'},
  hero:{backgroundColor:ink,padding:26,borderRadius:28,gap:12},heroSubtitle:{color:'#d4e5db',fontSize:15,lineHeight:22},heroPill:{backgroundColor:'#2d5a48',borderRadius:20,padding:10},heroPillText:{color:'#d9efae',fontSize:11,fontWeight:'600'},categoryRow:{flexDirection:'row',gap:8},categoryCard:{flex:1,borderRadius:18,padding:7,borderWidth:1,borderColor:'#e0e8dc',backgroundColor:'#f7f9f3',gap:7},categorySelected:{borderColor:ink,backgroundColor:'#e5f1d1',borderWidth:2},categoryArrow:{color:ink,fontSize:27},categoryTitle:{color:ink,fontWeight:'800',fontSize:14},categorySeats:{color:muted,fontSize:12},heroLabel:{fontSize:12,letterSpacing:2,fontWeight:'700',color:'#5b7d65'},heroTitle:{fontSize:40,letterSpacing:-1.5,fontWeight:'800',color:'#fff'},heading:{fontSize:32,fontWeight:'800',color:ink},subheading:{fontSize:20,fontWeight:'700',color:ink},
  card:{backgroundColor:'#fff',borderRadius:24,padding:20,gap:16,borderWidth:1,borderColor:'#dfe7e3'},cardTitle:{fontSize:21,fontWeight:'800',color:ink},field:{gap:6},label:{color:muted,fontSize:13,fontWeight:'700'},choice:{minHeight:54,paddingHorizontal:13,paddingVertical:11,backgroundColor:'#f3f6f4',borderRadius:13,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},choiceText:{color:ink,fontSize:16,fontWeight:'600'},options:{flexDirection:'row',flexWrap:'wrap',gap:8},option:{minHeight:44,justifyContent:'center',paddingHorizontal:10,backgroundColor:'#eef3e7',borderRadius:10},input:{minHeight:54,borderRadius:13,paddingHorizontal:13,backgroundColor:'#f3f6f4',color:ink,fontSize:16},
  button:{backgroundColor:ink,minHeight:54,paddingHorizontal:18,paddingVertical:15,borderRadius:16,alignItems:'center',justifyContent:'center'},buttonText:{fontSize:16,color:'#fff',fontWeight:'700',textAlign:'center'},secondary:{backgroundColor:'#e6eddf'},secondaryText:{color:ink},disabled:{opacity:.55},price:{backgroundColor:'#f8edbd',padding:22,borderRadius:20,gap:7},amount:{fontSize:36,letterSpacing:-1,color:ink,fontWeight:'800'},body:{fontSize:15,lineHeight:22,color:muted},error:{padding:14,backgroundColor:'#fce8e1',color:'#8a3523',borderRadius:12},notice:{padding:16,backgroundColor:'#e8f2e9',color:ink,borderRadius:12},
});
