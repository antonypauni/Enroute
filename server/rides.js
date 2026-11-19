import {canPreviewRide} from './driverOffers.js';
import {canReceiveRidePayment,isCashRide} from '../mobile/ridePayment.mjs';
import {financeOverview,driverFinancialStatus,snapshotCompletedRide,recordDriverCash} from './finance.js';
import {submitDriverApplication} from './driverRegistration.js';
import {pricingFor,manageAdmin,recordAdminEvent} from './administration.js';
import {ridePoints,trackingAction,rideForViewer} from './tracking.js';
import {passengerContact} from './guest.js';
import {photoData} from './fileData.js';
import {isAdmin} from './access.js';
const randomUUID=()=>crypto.randomUUID();
import {centers} from '../src/kin.js';
export const demoDrivers=[{id:'demo-1',name:'Jonathan K.',gender:'man',owner:'Jonathan K.',car:'Toyota Vitz',category:'standard',rating:4.7,demo:true,status:'approved'},{id:'demo-2',name:'Esther M.',gender:'woman',owner:'Esther M.',car:'Toyota IST',category:'comfort',rating:4.9,demo:true,status:'approved'},{id:'demo-3',name:'Alain B.',gender:'man',owner:'Flotte Congo',car:'Toyota Noah',category:'xl',rating:4.6,demo:true,status:'approved'}];
export const passengerCapacity = {standard:4,comfort:4,xl:6};
function passengersFor(input) {
  const count = input.passengers ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > passengerCapacity[input.category]) throw Error('Vérifiez le nombre de passagers pour cette catégorie.');
  return count;
}
function landmark(value) {
  if (value === undefined) return '';
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) throw Error('Indiquez un lieu précis de 1 à 120 caractères.');
  return value.trim();
}
export function quote(f,pricing){if(!Object.hasOwn(centers,f.from)||!Object.hasOwn(centers,f.to)||!['standard','comfort','xl'].includes(f.category))throw Error('Choisissez deux communes différentes et une catégorie.');const sameCommune=f.from===f.to;
if(sameCommune&&(typeof f.pickupLandmark!=='string'||typeof f.destinationLandmark!=='string'||!f.pickupLandmark.trim()||!f.destinationLandmark.trim()||f.pickupLandmark.trim().toLocaleLowerCase('fr-FR')===f.destinationLandmark.trim().toLocaleLowerCase('fr-FR'))) throw Error('Précisez deux lieux différents pour un trajet dans la même commune.');
const passengers=passengersFor(f);const a=centers[f.from],b=centers[f.to],rad=x=>x*Math.PI/180;const h=Math.sin(rad(b[0]-a[0])/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(rad(b[1]-a[1])/2)**2;const km=sameCommune?1.5:Math.round(6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))*1.3*10)/10;const rules=pricingFor({pricing});const multiplier={standard:1,comfort:rules.comfortMultiplier,xl:rules.xlMultiplier}[f.category];return {passengers,km,total:Math.ceil((rules.baseFare+km*rules.perKm)*multiplier/100)*100,currency:'CDF',minutes:Math.max(5,Math.ceil(km/25*60)),basis:sameCommune?'Estimation de 1,5 km dans la même commune. Le lieu précis doit être confirmé avec le chauffeur.':'Distance estimée entre centres des communes, majorée de 30 %. Tarif de démonstration.'};}
export function assignedDriverFor(state,ride){
 if(ride.status!=='accepted')return null;
 const driver=(state.drivers||[]).find(item=>item.id===ride.driverId);
 if(!driver)return null;
 return {name:driver.name,car:driver.car,plate:driver.plate,category:driver.category,phone:driver.phone||'',rating:driver.rating||null};
}
export function rideState(state,user){const financial=financeOverview(state);const drivers=[...demoDrivers,...(state.drivers||[]).filter(d=>d.status==='approved'&&!(state.users||[]).some(account=>account.id===d.id&&account.blocked)).map(({documents,plate,id,name,car,category,owner,rating,gender,demo,online})=>({id,name,car,category,owner,rating,gender,demo,online:online!==false,cashRestricted:driverFinancialStatus(state,id,financial).cashRestricted}))];return {drivers,financialStatus:(state.drivers||[]).some(driver=>driver.id===user?.id)?driverFinancialStatus(state,user.id,financial):null,rides:(state.rides||[]).filter(r=>user&&(r.ownerId===user.id||r.driverId===user.id||['primary','secondary'].includes(user.role))).map(ride=>({...rideForViewer(ride),assignedDriver:assignedDriverFor(state,ride)})),application:(state.drivers||[]).find(d=>d.id===user?.id)?((({documents,...driver})=>driver)(state.drivers.find(d=>d.id===user.id))):null,applications:['primary','secondary'].includes(user?.role)?(state.drivers||[]).map(({documents,...d})=>({...d,documentNames:Object.keys(documents)})):[]};}
export async function rideAction(path,f,state,user){state.rides||=[];state.drivers||=[];if(path==='/api/rides/quote')return quote(f,state.pricing);if(!user)throw Error('Connectez-vous pour continuer.');if(['/api/rides/location','/api/rides/location/stop'].includes(path))return trackingAction(path,f,state,user);if(path==='/api/drivers/availability'){
 const driver=state.drivers.find(driver=>driver.id===user.id&&driver.status==='approved'&&!driver.demo);
 if(!driver||user.role!=='client'||typeof f.online!=='boolean')throw Error('Seul un chauffeur validé peut choisir sa disponibilité.');
 driver.online=f.online;return {ok:true,online:driver.online};
}if(['/api/drivers/apply','/api/drivers/resubmit'].includes(path))return submitDriverApplication(state,user,f,path==='/api/drivers/resubmit');if(path==='/api/drivers/review')return manageAdmin(state,{action:'driver.status',id:f.id,status:f.status,note:f.note||'Validation du dossier chauffeur'},user);if(path==='/api/drivers/document'){if(!['primary','secondary'].includes(user.role))throw Error('Accès administrateur requis.');const d=state.drivers.find(d=>d.id===f.id);if(!d?.documents[f.kind])throw Error('Document introuvable.');return {data:d.documents[f.kind]};}if(path==='/api/rides/request'){if(isAdmin(user))throw Error('Utilisez un compte client pour commander une course.');const contact=passengerContact(f,user.role==='guest');const photo=photoData(f.passengerPhoto);const fare=quote(f,state.pricing);const pickupLandmark=landmark(f.pickupLandmark),destinationLandmark=landmark(f.destinationLandmark);if(f.expectedTotal!==fare.total)throw Error('Vérifiez le montant actualisé avant de confirmer.');if(f.womenOnly&&f.passengerGender!=='woman')throw Error('Cette option est réservée aux passagères et conductrices.');const immediate = f.immediate === true || !f.departure;
const when = immediate ? new Date() : new Date(f.departure);
if (!Number.isFinite(when.getTime()) || (!immediate && when.getTime() < Date.now()-60000)) throw Error('Choisissez une heure de départ future.');
if (immediate && state.rides.some(ride => ride.ownerId === user.id && ride.immediate && ['requested','accepted'].includes(ride.status))) throw Error('Vous avez déjà une course en cours. Retrouvez-la dans vos courses.');
if(f.paymentStatus!==undefined||f.paymentSource!==undefined)throw Error('Le paiement doit être confirmé par le serveur, jamais par le client.');if(f.paymentMethod&&f.paymentMethod!=='cash')throw Error('Paiement électronique indisponible : compte marchand à connecter. Aucune course payée ni aucun débit créé.');
const r={...ridePoints(f),...contact,...photo,pickupLandmark,destinationLandmark,id:randomUUID(),ownerId:user.id,paymentMethod:'cash',paymentStatus:'due',from:f.from,to:f.to,category:f.category,womenOnly:!!f.womenOnly,immediate,departure:when.toISOString(),...fare,status:'requested',createdAt:new Date().toISOString()};state.rides.push(r);return r;}const r=state.rides.find(r=>r.id===f.id);if(!r)throw Error('Course introuvable.');if(path==='/api/rides/photo'){if(!(isAdmin(user)||r.ownerId===user.id||r.driverId===user.id||canPreviewRide(state,user,r))||!r.passengerPhoto)throw Error('Photo indisponible pour ce compte.');return{data:r.passengerPhoto};}if(path==='/api/rides/accept'){if(!canReceiveRidePayment(driverFinancialStatus(state,user.id),r))throw Error(isCashRide(r)?'Cette course en espèces est indisponible : commission cumulée à régulariser. Le compte reste actif pour les courses électroniques confirmées.':'Le paiement électronique de cette course n’est pas encore confirmé par le serveur.');const d=state.drivers.find(d=>d.id===user.id&&d.status==='approved');if(state.rides.some(other=>other.id!==r.id&&other.driverId===user.id&&other.status==='accepted'))throw Error('Terminez votre course en cours avant d’en accepter une autre.');if(d?.online===false)throw Error('Passez en ligne pour accepter une nouvelle course.');if(!d||d.category!==r.category||(r.womenOnly&&d.gender!=='woman')||r.ownerId===user.id||r.status!=='requested'||(!r.immediate&&Date.parse(r.departure)<=Date.now()))throw Error('Course indisponible pour ce chauffeur.');r.driverId=d.id;r.driverName=d.name;r.status='accepted';r.progress='en_route';return r;}if(path==='/api/rides/progress'){
 if(r.driverId!==user.id||r.status!=='accepted')throw Error('Seul le chauffeur affecté peut actualiser cette course.');
 if(!['arrived','in_progress'].includes(f.stage))throw Error('Étape de course invalide.');
 const current=r.progress||'en_route';if(current===f.stage)return r;
 if(f.stage==='arrived'&&current!=='en_route'||f.stage==='in_progress'&&current!=='arrived')throw Error('Confirmez les étapes de la course dans leur ordre.');
 r.progress=f.stage;r[f.stage==='arrived'?'arrivedAt':'startedAt']=new Date().toISOString();return r;
}if(path==='/api/rides/cancel'){if(r.ownerId!==user.id||!['requested','accepted'].includes(r.status))throw Error('Annulation indisponible.');r.status='cancelled';delete r.driverLocation;return r;}if(path==='/api/rides/complete'){
 if(r.driverId!==user.id||!['accepted','completed'].includes(r.status))throw Error('Course indisponible.');
 if(f.cashReceived!==undefined&&typeof f.cashReceived!=='boolean')throw Error('Confirmez explicitement si les espèces ont été reçues.');
 if(r.status==='completed'){if(f.cashReceived===true&&!r.cashCollectionConfirmed)throw Error('Cette course est déjà terminée. Faites vérifier son règlement par l’administration.');return r;}
 if(f.cashReceived===true&&!isCashRide(r))throw Error('Un paiement électronique ne peut pas être déclaré comme espèces reçues.');
 if(isCashRide(r)&&f.cashReceived!==true)throw Error('Confirmez la réception des espèces avant de terminer la course.');
 if(!isCashRide(r)&&!canReceiveRidePayment(null,r))throw Error('Le paiement électronique doit être confirmé avant de terminer la course.');
 // Commit the receipt and completion together; a failed receipt leaves the ride active.
 const draft=structuredClone(state),completed=draft.rides.find(ride=>ride.id===r.id);
 completed.status='completed';delete completed.driverLocation;snapshotCompletedRide(draft,completed);
 if(f.cashReceived===true){const entry=recordDriverCash(draft,completed,user);completed.cashCollectionConfirmed=true;completed.cashCollectionEntryId=entry.id||null;if(!entry.replayed){recordAdminEvent(draft,user,'ride.cash.declared',r.id,'Espèces reçues déclarées par le chauffeur à la fin de course.');for(const change of entry.holdChanges||[])recordAdminEvent(draft,user,change.cashRestricted?'driver.cash.restrict':'driver.cash.restore',change.id,change.cashRestricted?'Seuil atteint : courses électroniques uniquement.':'Commission régularisée : espèces rétablies.');}}
 Object.assign(state,draft);
 return completed;
}if(path==='/api/rides/rate'){if(r.ownerId!==user.id||r.status!=='completed'||r.rating||!Number.isInteger(f.rating)||f.rating<1||f.rating>5)throw Error('Note indisponible.');r.rating=f.rating;const d=state.drivers.find(d=>d.id===r.driverId),ratings=state.rides.filter(x=>x.driverId===r.driverId&&x.rating).map(x=>x.rating);d.rating=Math.round(ratings.reduce((a,b)=>a+b,0)/ratings.length*10)/10;return r;}throw Error('Action introuvable.');}
