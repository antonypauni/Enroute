import {useEffect, useState} from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

const origin = 'https://enroute-rdc-test-toman.antonypauniduquetom.chatgpt.site';
const sessionKey = 'enroute-session-v1';
const communes = ['Bandalungwa','Barumbu','Bumbu','Gombe','Kalamu','Kasa-Vubu','Kimbanseke','Kinshasa','Kintambo','Kisenso','Lemba','Limete','Lingwala','Makala','Maluku','Masina','Matete','Mont-Ngafula','Ndjili','Ngaba','Ngaliema','Ngiri-Ngiri','Nsele','Selembao'];
const categories = {standard:'Standard',comfort:'Confort',xl:'XL'};
const statuses = {requested:'En attente',accepted:'Acceptée',completed:'Terminée',cancelled:'Annulée'};
const ink = '#173e36', leaf = '#dbeab8', muted = '#52665d';
const fare = value => `${Number(value).toLocaleString('fr-FR')} FC`;
const inKinshasa = value => new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Kinshasa'}).format(new Date(value));
const nextDeparture = () => new Date(Date.now()+2*60*60*1000).toISOString().slice(0,16).split('T');

async function request(path, data, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
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
  const [page, setPage] = useState('ride');
  const [session, setSession] = useState(null);
  const [account, setAccount] = useState(null);
  const [rides, setRides] = useState([]);
  const [available, setAvailable] = useState([]);
  const [from, setFrom] = useState('Lemba');
  const [to, setTo] = useState('Gombe');
  const [category, setCategory] = useState('standard');
  const [womenOnly, setWomenOnly] = useState(false);
  const [date, setDate] = useState(()=>nextDeparture()[0]);
  const [time, setTime] = useState(()=>nextDeparture()[1]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function forgetSession() {
    setSession(null); setAccount(null); setRides([]); setAvailable([]);
    await SecureStore.deleteItemAsync(sessionKey);
  }

  useEffect(()=>{
    let active = true;
    async function restore() {
      try {
        const token = await SecureStore.getItemAsync(sessionKey);
        if (!token) return;
        const data = await request('state', undefined, token);
        if (active && data.user) {setSession(token);setAccount(data.user)}
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
      if (err.status===401 && session) {await forgetSession();setPage('account')}
      setError(err.name==='AbortError' ? 'La connexion a pris trop de temps. Réessaie.' : err.message);
    } finally {setBusy(false)}
  }

  async function refresh(token = session) {
    const data = await request('rides/state', undefined, token);
    setRides(data.rides || []); setAvailable(data.available || []);
  }

  function navigate(next) {
    if (busy) return;
    setError('');setNotice('');setPage(next);
    if (next==='trips' && session) run(()=>refresh());
  }

  function resetEstimate(setter, value) { setter(value); setEstimate(null); }
  function ridePayload() {return {from,to,category,womenOnly,passengerGender:womenOnly?'woman':undefined};}

  async function confirmRide() {
    if (!session) {setPage('account');setNotice('Connecte-toi pour confirmer ta demande.');return}
    const departure = `${date}T${time}:00+01:00`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isFinite(Date.parse(departure)) || Date.parse(departure)<=Date.now()) throw new Error('Choisis une date et une heure futures à Kinshasa.');
    await request('rides/request',{...ridePayload(),departure,expectedTotal:estimate.total},session);
    setEstimate(null);setPage('trips');setNotice('Demande envoyée.');
    await refresh();
  }

  async function login() {
    if (!email.trim() || !password) throw new Error('Saisis ton adresse e-mail et ton mot de passe.');
    const data = await request('mobile/login',{email,password});
    if (!data.token || !data.user) throw new Error('La connexion mobile n’est pas encore disponible.');
    await SecureStore.setItemAsync(sessionKey,data.token);
    setSession(data.token);setAccount(data.user);setPassword('');setPage('ride');
  }

  async function updateRide(action, id, extra = {}) {
    await request(`rides/${action}`,{id,...extra},session);
    await refresh();
  }

  function rideCard(ride, isAvailable = false) {
    const isClient = ride.ownerId===account?.id;
    const isDriver = ride.driverId===account?.id;
    return <View key={ride.id} style={styles.card}><Text style={styles.label}>{statuses[ride.status]}{ride.womenOnly ? ' · Spécial femme' : ''}</Text><Text style={styles.cardTitle}>{ride.from} → {ride.to}</Text><Text style={styles.body}>{inKinshasa(ride.departure)} · {fare(ride.total)}</Text>{ride.driverName && <Text style={styles.body}>Chauffeur · {ride.driverName}</Text>}{isAvailable && <Button disabled={busy} onPress={()=>run(()=>updateRide('accept',ride.id))}>Accepter</Button>}{isClient && ['requested','accepted'].includes(ride.status) && <Button secondary disabled={busy} onPress={()=>run(()=>updateRide('cancel',ride.id))}>Annuler la demande</Button>}{isDriver && ride.status==='accepted' && <Button disabled={busy} onPress={()=>run(()=>updateRide('complete',ride.id))}>Terminer la course</Button>}{isClient && ride.status==='completed' && (ride.rating ? <Text style={styles.body}>Note · {ride.rating}/5</Text> : <Choice label="Noter le véhicule" value="Choisir une note" options={['1','2','3','4','5']} onChange={value=>run(()=>updateRide('rate',ride.id,{rating:Number(value)}))}/>)}</View>;
  }

  return <SafeAreaProvider><SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS==='ios'?'padding':undefined}>
    <StatusBar style="dark" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text style={styles.brand}>En Route <Text style={styles.arrow}>↗</Text></Text>
      <View style={styles.nav}>{[['ride','Course'],['trips','Mes trajets'],['account','Compte']].map(([id,label])=><Pressable key={id} onPress={()=>navigate(id)} accessibilityRole="tab" accessibilityState={{selected:page===id}} style={[styles.tab,page===id && styles.activeTab]}><Text style={styles.tabText}>{label}</Text></Pressable>)}</View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
      {page==='ride' && <><View style={styles.hero}><Text style={styles.heroLabel}>KINSHASA</Text><Text accessibilityRole="header" style={styles.heroTitle}>Où vas-tu ?</Text></View><View style={styles.card}>
        <Choice label="Départ" value={from} options={communes} onChange={value=>resetEstimate(setFrom,value)}/>
        <Choice label="Destination" value={to} options={communes} onChange={value=>resetEstimate(setTo,value)}/>
        <Choice label="Catégorie" value={categories[category]} options={Object.values(categories)} onChange={value=>resetEstimate(setCategory,Object.keys(categories).find(key=>categories[key]===value))}/>
        <Pressable style={styles.choice} accessibilityRole="checkbox" accessibilityState={{checked:womenOnly}} onPress={()=>resetEstimate(setWomenOnly,!womenOnly)}><Text style={styles.choiceText}>{womenOnly ? '✓' : '○'}  Spécial femme</Text></Pressable>
        {womenOnly && <Text style={styles.body}>Je confirme être une passagère. La course est proposée à des conductrices.</Text>}
        {!estimate && <Button disabled={busy} onPress={()=>run(async()=>setEstimate(await request('rides/quote',ridePayload())))}>Estimer le prix</Button>}
        {estimate && <><View style={styles.price}><Text style={styles.label}>Prix estimé</Text><Text style={styles.amount}>{fare(estimate.total)}</Text><Text style={styles.body}>{estimate.km} km · {estimate.minutes} min environ</Text></View><Field label="Date à Kinshasa (AAAA-MM-JJ)" value={date} onChangeText={setDate} maxLength={10} autoCorrect={false}/><Field label="Heure à Kinshasa (HH:MM)" value={time} onChangeText={setTime} maxLength={5} autoCorrect={false}/><Text style={styles.body}>Version de test. Aucun encaissement.</Text><Button disabled={busy} onPress={()=>run(confirmRide)}>{session?'Envoyer la demande':'Se connecter pour confirmer'}</Button></>}
      </View></>}
      {page==='trips' && <><Text accessibilityRole="header" style={styles.heading}>Mes trajets</Text>{!session ? <View style={styles.card}><Text style={styles.body}>Connecte-toi pour retrouver tes demandes.</Text><Button onPress={()=>navigate('account')}>Se connecter</Button></View> : <><Button secondary disabled={busy} onPress={()=>run(()=>refresh())}>Actualiser</Button>{available.length>0 && <><Text style={styles.subheading}>Demandes disponibles</Text>{available.map(ride=>rideCard(ride,true))}</>}{rides.length ? rides.map(ride=>rideCard(ride)) : <Text style={styles.body}>Aucune course pour le moment.</Text>}</>}</>}
      {page==='account' && <><Text accessibilityRole="header" style={styles.heading}>Mon compte</Text><View style={styles.card}>{account ? <><Text style={styles.cardTitle}>{account.name}</Text><Text style={styles.body}>{account.email}</Text><Button secondary disabled={busy} onPress={()=>run(async()=>{try {await request('logout',{},session)} finally {await forgetSession()}})}>Se déconnecter</Button></> : <><Text style={styles.body}>Utilise ton compte En Route existant.</Text><Field label="Adresse e-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email"/><Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password"/><Button disabled={busy} onPress={()=>run(login)}>Se connecter</Button></>}</View></>}
      {busy && <ActivityIndicator accessibilityLabel="Chargement" color={ink}/>}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#f2f5ed'},content:{paddingHorizontal:20,paddingTop:12,paddingBottom:56,gap:16,maxWidth:560,width:'100%',alignSelf:'center'},
  brand:{color:ink,fontSize:27,fontWeight:'800',letterSpacing:-1},arrow:{color:'#648448'},nav:{flexDirection:'row',gap:6,backgroundColor:'#e5ebdf',padding:5,borderRadius:17},tab:{flex:1,alignItems:'center',justifyContent:'center',minHeight:46,borderRadius:13},activeTab:{backgroundColor:'#fff'},tabText:{fontSize:14,fontWeight:'700',color:ink},
  hero:{backgroundColor:ink,padding:23,borderRadius:23,gap:10},heroLabel:{fontSize:12,letterSpacing:2,fontWeight:'700',color:leaf},heroTitle:{fontSize:40,letterSpacing:-1.5,fontWeight:'800',color:'#fff'},heading:{fontSize:32,fontWeight:'800',color:ink},subheading:{fontSize:20,fontWeight:'700',color:ink},
  card:{backgroundColor:'#fff',borderRadius:22,padding:18,gap:13,borderWidth:1,borderColor:'#e3e9df'},cardTitle:{fontSize:21,fontWeight:'800',color:ink},field:{gap:6},label:{color:muted,fontSize:13,fontWeight:'700'},choice:{minHeight:49,paddingHorizontal:13,paddingVertical:11,backgroundColor:'#f1f5ec',borderRadius:13,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},choiceText:{color:ink,fontSize:16,fontWeight:'600'},options:{flexDirection:'row',flexWrap:'wrap',gap:8},option:{minHeight:44,justifyContent:'center',paddingHorizontal:10,backgroundColor:'#eef3e7',borderRadius:10},input:{minHeight:50,borderRadius:13,paddingHorizontal:13,backgroundColor:'#f1f5ec',color:ink,fontSize:16},
  button:{backgroundColor:ink,minHeight:48,paddingHorizontal:16,paddingVertical:12,borderRadius:14,alignItems:'center',justifyContent:'center'},buttonText:{fontSize:16,color:'#fff',fontWeight:'700',textAlign:'center'},secondary:{backgroundColor:'#e6eddf'},secondaryText:{color:ink},disabled:{opacity:.55},price:{backgroundColor:leaf,padding:15,borderRadius:15,gap:4},amount:{fontSize:32,color:ink,fontWeight:'800'},body:{fontSize:15,lineHeight:22,color:muted},error:{padding:14,backgroundColor:'#fce8e1',color:'#8a3523',borderRadius:12},notice:{padding:14,backgroundColor:leaf,color:ink,borderRadius:12},
});
