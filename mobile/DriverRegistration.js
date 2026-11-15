import {useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

const kinds=[['identity','Pièce d’identité'],['license','Permis de conduire'],['registration','Carte grise'],['insurance','Assurance']];
const labels={pending:'En attente de validation',approved:'Dossier validé',rejected:'Dossier refusé / à compléter'};
function Button({children,onPress,disabled,secondary}){return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button,secondary&&s.secondary,disabled&&{opacity:.5}]}><Text style={[s.buttonText,secondary&&{color:'#173e36'}]}>{children}</Text></Pressable>}
function Field({label,...props}){return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} style={s.input} placeholderTextColor="#71816e" {...props}/></View>}
function Choices({label,value,options,onChange}){return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.choices}>{options.map(([id,title])=><Pressable accessibilityRole="button" accessibilityState={{selected:value===id}} key={id} onPress={()=>onChange(id)} style={[s.choice,value===id&&s.selected]}><Text style={{color:'#173e36',fontWeight:'700'}}>{title}</Text></Pressable>)}</View></View>}

export default function DriverRegistration({user,api,onDone,onLogin}) {
  const [application,setApplication]=useState(null),[editing,setEditing]=useState(false),[loading,setLoading]=useState(user?.role==='client');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[files,setFiles]=useState({});
  const [form,setForm]=useState({name:'',email:'',password:'',confirm:'',phone:'',owner:'',car:'',plate:'',gender:'man',category:'standard'});
  const newAccount=!user||user.role==='guest';
  const set=(key,value)=>setForm(previous=>({...previous,[key]:value}));
  useEffect(()=>{
    if(user?.role!=='client'){setLoading(false);return;}
    let active=true,timer;
    async function refresh(){try{const result=await api('rides/state');if(active)setApplication(result.application||null)}catch(error){if(active)setError(error.message)}finally{if(active){setLoading(false);timer=setTimeout(refresh,10000)}}}
    refresh();return()=>{active=false;clearTimeout(timer)};
  },[api,user?.id]);
  async function choose(kind){if(busy)return;setBusy(true);setError('');let cachedUri;
    try{
      const selected=await DocumentPicker.getDocumentAsync({type:['application/pdf','image/jpeg','image/png'],multiple:false,copyToCacheDirectory:true});
      if(selected.canceled)return;
      const asset=selected.assets[0];cachedUri=asset.uri;
      const info=await FileSystem.getInfoAsync(asset.uri);const size=asset.size??info.size;
      const inferred=/\.pdf$/i.test(asset.name)?'application/pdf':/\.png$/i.test(asset.name)?'image/png':/\.jpe?g$/i.test(asset.name)?'image/jpeg':'';
      const mime=['application/pdf','image/jpeg','image/png'].includes(asset.mimeType)?asset.mimeType:inferred;
      if(!['application/pdf','image/jpeg','image/png'].includes(mime)||!Number.isFinite(size)||size<=0||size>1000000)throw Error('Choisis un PDF, JPEG ou PNG de moins de 1 Mo.');
      const base64=await FileSystem.readAsStringAsync(asset.uri,{encoding:FileSystem.EncodingType.Base64});
      if(base64.length>1333340)throw Error('Ce document dépasse 1 Mo.');
      setFiles(previous=>({...previous,[kind]:{name:asset.name,data:'data:'+mime+';base64,'+base64}}));
    }catch(error){setError(error.message)}finally{
      if(cachedUri&&FileSystem.cacheDirectory&&cachedUri.startsWith(FileSystem.cacheDirectory))await FileSystem.deleteAsync(cachedUri,{idempotent:true}).catch(()=>{});
      setBusy(false);
    }
  }
  async function submit(){if(busy)return;setBusy(true);setError('');setNotice('');
    try{
      if(newAccount&&(form.name.trim().length<2||!form.email.trim()||form.password.length<10||form.password!==form.confirm))throw Error('Indique ton nom, ton e-mail et confirme un mot de passe d’au moins 10 caractères.');
      if(!form.phone.trim()||!form.car.trim()||!form.owner.trim()||!form.plate.trim())throw Error('Complète ton téléphone et les informations de la voiture.');
      if(kinds.some(([key])=>!files[key]))throw Error('Ajoute les quatre documents avant l’envoi.');
      const payload={phone:form.phone,owner:form.owner,car:form.car,plate:form.plate,gender:form.gender,category:form.category,documents:Object.fromEntries(kinds.map(([key])=>[key,files[key].data]))};
      if(newAccount)Object.assign(payload,{name:form.name,email:form.email,password:form.password,confirm:form.confirm,mobile:true});
      const result=await api(newAccount?'drivers/register':application?'drivers/resubmit':'drivers/apply',payload);
      setFiles({});setApplication({name:newAccount?form.name:user.name,phone:form.phone,car:form.car,owner:form.owner,plate:form.plate,gender:form.gender,category:form.category,...result.application,status:'pending'});setForm(previous=>({...previous,password:'',confirm:''}));setEditing(false);
      setNotice(newAccount?'Ton compte chauffeur est créé. Ton dossier attend la validation de l’administration.':'Ton dossier a été envoyé à la validation.');
      await onDone(result);
    }catch(error){setError(error.name==='AbortError'?'L’envoi a pris trop de temps. Vérifie Internet. Si le compte a été créé, connecte-toi pour retrouver le dossier.':error.message)}finally{setBusy(false)}
  }
  function edit(){setForm(previous=>({...previous,phone:application.phone||'',car:application.car,owner:application.owner,plate:application.plate,gender:application.gender,category:application.category}));setFiles({});setEditing(true)}
  return <View style={s.root}><View style={s.hero}><Text style={s.kicker}>EN ROUTE · ESPACE CHAUFFEUR</Text><Text style={s.heroTitle}>Un dossier.{ '\n' }Un compte créé.</Text><Text style={s.heroText}>Tes informations et tes documents, en un seul envoi.</Text></View>
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!notice&&<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
    {loading?<ActivityIndicator color="#173e36"/>:user&&['primary','secondary'].includes(user.role)?<View style={s.card}><Text style={s.body}>Le compte chauffeur est distinct du compte administrateur.</Text><Button onPress={onLogin}>Connexion chauffeur</Button></View>:<>
      {application&&!editing&&<View style={s.card}><Text style={s.badge}>{labels[application.status]||application.status}</Text><Text style={s.title}>{application.car} · {application.plate}</Text><Text style={s.body}>{application.reviewNote||'L’administration doit vérifier tes documents avant d’autoriser les courses.'}</Text><Text style={s.body}>{application.status==='approved'?'Ouvre Mes trajets pour les courses compatibles.':'Tu ne peux pas encore accepter de courses.'}</Text>{application.status!=='approved'&&<Button secondary disabled={busy} onPress={edit}>Compléter ou remplacer mon dossier</Button>}{newAccount&&<Button secondary disabled={busy} onPress={onLogin}>Me connecter à mon compte chauffeur</Button>}</View>}
      {(!application||editing)&&<View style={s.card}>
        <Text style={s.title}>{newAccount?'Créer mon compte chauffeur':'Mon dossier chauffeur'}</Text>
        {newAccount?<><Field label="Nom et prénom" value={form.name} onChangeText={value=>set('name',value)} maxLength={60} autoComplete="name"/><Field label="E-mail de connexion" value={form.email} onChangeText={value=>set('email',value)} maxLength={180} autoCapitalize="none" keyboardType="email-address" autoComplete="email"/><Field label="Choisir un mot de passe" value={form.password} onChangeText={value=>set('password',value)} secureTextEntry maxLength={128} autoCapitalize="none" autoComplete="new-password"/><Field label="Confirmer le mot de passe" value={form.confirm} onChangeText={value=>set('confirm',value)} secureTextEntry maxLength={128} autoCapitalize="none" autoComplete="new-password"/></>:<Text style={s.body}>Le dossier sera rattaché à ton compte {user.name} · {user.email}.</Text>}
        <Field label="Numéro portable" value={form.phone} onChangeText={value=>set('phone',value)} keyboardType="phone-pad" maxLength={30} placeholder="+243…"/>
        <Choices label="Identité du chauffeur" value={form.gender} options={[["man","Conducteur"],["woman","Conductrice"]]} onChange={value=>set('gender',value)}/>
        {[['owner','Propriétaire de la voiture'],['car','Marque et modèle'],['plate','Immatriculation']].map(([key,label])=><Field key={key} label={label} value={form[key]} onChangeText={value=>set(key,value)} maxLength={100}/>)}
        <Choices label="Catégorie de voiture" value={form.category} options={[["standard","Standard"],["comfort","Confort"],["xl","XL"]]} onChange={value=>set('category',value)}/>
        <Text style={s.title}>Les quatre documents</Text><Text style={s.small}>PDF, JPEG ou PNG · 1 Mo maximum chacun. Les fichiers sont privés.</Text>
        {kinds.map(([key,label])=><View key={key} style={s.field}><Text style={s.label}>{label}</Text><Button secondary disabled={busy} onPress={()=>choose(key)}>{files[key]?'Remplacer · '+files[key].name:'Choisir le document'}</Button></View>)}
        <Text style={s.body}>L’envoi crée ton compte automatiquement. L’administration doit valider le dossier avant que tu puisses accepter une course.</Text>
        <Button disabled={busy} onPress={submit}>{busy?'Envoi du dossier…':newAccount?'Envoyer et créer mon compte chauffeur':'Envoyer mon dossier à la validation'}</Button>
        {editing&&<Button secondary disabled={busy} onPress={()=>setEditing(false)}>Annuler la modification</Button>}
        {newAccount&&<Button secondary disabled={busy} onPress={onLogin}>J’ai déjà un compte : me connecter</Button>}
      </View>}
    </>}{busy&&<ActivityIndicator color="#173e36"/>}
  </View>;
}
const s=StyleSheet.create({root:{gap:16},hero:{padding:26,borderRadius:27,backgroundColor:'#173e36',gap:12},kicker:{color:'#dbeab8',fontSize:11,fontWeight:'700',letterSpacing:2},heroTitle:{fontSize:36,fontWeight:'800',letterSpacing:-1,color:'#fff'},heroText:{color:'#d5e3d6',fontSize:15,lineHeight:22},card:{padding:22,gap:16,backgroundColor:'#fff',borderRadius:24,borderWidth:1,borderColor:'#e0e7db'},field:{gap:8},label:{fontSize:13,fontWeight:'700',color:'#52665d'},input:{minHeight:50,paddingHorizontal:13,paddingVertical:12,borderRadius:12,backgroundColor:'#f3f6ed',fontSize:16,color:'#173e36'},body:{fontSize:14,lineHeight:23,color:'#52665d'},small:{fontSize:12,lineHeight:19,color:'#6c7e6b'},title:{fontSize:22,fontWeight:'800',color:'#173e36'},badge:{fontSize:13,fontWeight:'700',color:'#608441'},button:{minHeight:49,padding:14,borderRadius:13,backgroundColor:'#173e36',justifyContent:'center'},buttonText:{textAlign:'center',fontSize:14,fontWeight:'700',color:'#fff'},secondary:{backgroundColor:'#e9efdf'},choices:{flexDirection:'row',flexWrap:'wrap',gap:8},choice:{padding:13,borderRadius:12,borderWidth:1,borderColor:'#dfe7d7',backgroundColor:'#f5f8f0',minHeight:46},selected:{backgroundColor:'#dfecc6',borderColor:'#54723d'},error:{padding:16,borderRadius:13,backgroundColor:'#fceee5',color:'#8a3523'},notice:{padding:16,borderRadius:13,backgroundColor:'#e7f0d6',color:'#214d35'}});
