import {canReceiveRidePayment} from '../mobile/ridePayment.mjs';
import {financeOverview,financeAction,snapshotCompletedRide,driverFinancialStatus} from './finance.js';
import {isAdmin} from './access.js';
import {rideForViewer} from './tracking.js';
import {deleteClientData} from './accountData.js';

export const defaultPricing={baseFare:1500,perKm:700,comfortMultiplier:1.4,xlMultiplier:1.8};
export const pricingFor=state=>({...defaultPricing,...state?.pricing});

export function recordAdminEvent(state,user,action,target,note) {
  state.adminAudit||=[];
  state.adminAudit.push({id:crypto.randomUUID(),at:new Date().toISOString(),actor:user.id,actorName:user.name,action,target,note});
  state.adminAudit=state.adminAudit.slice(-500);
}

export function adminOverview(state) {
  const financial=financeOverview(state);
  return {
    users:(state.users||[]).map(({id,name,email,role,blocked,accountType})=>({id,name,email,role,accountType:accountType||((state.drivers||[]).some(driver=>driver.id===id)?'driver':role==='client'?'client':'admin'),blocked:!!blocked})),
    guests:(state.guests||[]).map(({id,name,createdAt})=>({id,name,createdAt})),
    trips:state.trips||[],bookings:state.bookings||[],
    rides:(state.rides||[]).map(ride=>rideForViewer(ride)),
    applications:(state.drivers||[]).map(({documents,...driver})=>({...driver,documentNames:Object.keys(documents||{}),financialStatus:driverFinancialStatus(state,driver.id,financial)})),
    pricing:pricingFor(state),audit:(state.adminAudit||[]).slice(-100).reverse(),
    payments:{enabled:false,label:'Compte marchand non connecté — transferts automatiques désactivés'},
    finance:financial,
  };
}

function requiredItem(items,id,label) {
  const item=(items||[]).find(item=>item.id===id);
  if(!item)throw Error(`${label} introuvable.`);
  return item;
}
function activeRideFor(state,id){return (state.rides||[]).some(ride=>ride.status==='accepted'&&(ride.ownerId===id||ride.driverId===id))}
function noteFor(input,required=false){
  const note=typeof input.note==='string'?input.note.trim():'';
  if(note.length>300||required&&note.length<3)throw Error('Indiquez un motif de 3 à 300 caractères.');
  return note||'Gestion administrative';
}

export function manageAdmin(state,input,user) {
  if(!isAdmin(user)||user.blocked)throw Error('Accès administrateur requis.');
  const action=input.action;
  if(typeof action==='string'&&action.startsWith('finance.')){const result=financeAction(state,input,user);if(!result.replayed){recordAdminEvent(state,user,action,result.id,input.note.trim());for(const change of result.holdChanges||[])recordAdminEvent(state,user,change.cashRestricted?'driver.cash.restrict':'driver.cash.restore',change.id,change.cashRestricted?'Commission cumulée : espèces désactivées, compte actif pour les courses électroniques.':'Commission régularisée : courses en espèces de nouveau autorisées.')}return result;}
  const approval=action==='driver.status'&&input.status==='approved';
  const note=noteFor(approval&&!String(input.note||'').trim()?{...input,note:'Documents vérifiés et chauffeur validé par l’administration.'}:input,['ride.cancel','driver.status','user.status','user.delete','trip.archive','booking.cancel'].includes(action));
  let target=input.id||'tarifs';
  if(action==='ride.assign') {
    const ride=requiredItem(state.rides,input.id,'Course');
    if(!['requested','accepted'].includes(ride.status))throw Error('Cette course est déjà clôturée.');
    if(!ride.immediate&&Date.parse(ride.departure)<=Date.now())throw Error('Cette demande planifiée a expiré.');
    const driver=requiredItem(state.drivers,input.driverId,'Chauffeur');
    const account=requiredItem(state.users,driver.id,'Compte chauffeur');
    if((state.users||[]).some(item=>item.id===ride.ownerId&&item.blocked))throw Error('Le compte du passager est suspendu.');
    if(!canReceiveRidePayment(driverFinancialStatus(state,driver.id),ride))throw Error('Mode de paiement indisponible pour ce chauffeur : électronique confirmé uniquement tant que la commission reste à régulariser.');
    if(driver.demo||driver.status!=='approved'||account.blocked||driver.id===ride.ownerId||driver.category!==ride.category||ride.womenOnly&&driver.gender!=='woman')throw Error('Choisissez un chauffeur validé, actif et compatible avec cette course.');
    if((state.rides||[]).some(other=>other.id!==ride.id&&other.status==='accepted'&&other.driverId===driver.id))throw Error('Ce chauffeur a déjà une course en cours.');
    ride.driverId=driver.id;ride.driverName=driver.name;ride.status='accepted';delete ride.driverLocation;
  } else if(action==='ride.release') {
    const ride=requiredItem(state.rides,input.id,'Course');
    if(ride.status!=='accepted')throw Error('Seule une course affectée peut être remise en attente.');
    delete ride.driverId;delete ride.driverName;delete ride.driverLocation;ride.status='requested';
  } else if(action==='ride.cancel'||action==='ride.complete') {
    const ride=requiredItem(state.rides,input.id,'Course');
    if(action==='ride.complete'&&ride.status!=='accepted'||action==='ride.cancel'&&!['requested','accepted'].includes(ride.status))throw Error('Cette transition de course est indisponible.');
    ride.status=action==='ride.complete'?'completed':'cancelled';ride.adminNote=note;delete ride.driverLocation;if(ride.status==='completed')snapshotCompletedRide(state,ride);
  } else if(action==='driver.status') {
    const driver=requiredItem(state.drivers,input.id,'Chauffeur');
    if(driver.demo||!['approved','rejected','pending'].includes(input.status))throw Error('Statut de dossier invalide.');
    const account=requiredItem(state.users,driver.id,'Compte chauffeur');
    if(account.blocked&&input.status==='approved')throw Error('Réactivez le compte avant de valider ce chauffeur.');
    if(input.status!=='approved'&&activeRideFor(state,driver.id))throw Error('Réaffectez ou clôturez la course en cours avant de suspendre ce chauffeur.');
    if(input.status==='approved'&&input.documentRevision!==undefined&&input.documentRevision!==(driver.documentRevision||0))throw Error('Le dossier a changé. Rechargez et vérifiez les nouveaux documents avant validation.');
    if(input.status==='approved'&&!['identity','license','registration','insurance'].every(key=>driver.documents?.[key]))throw Error('Les quatre pièces du dossier sont nécessaires.');
    driver.status=input.status;driver.reviewNote=note;
  } else if(action==='driver.vehicle') {
    const driver=requiredItem(state.drivers,input.id,'Chauffeur');
    if(activeRideFor(state,driver.id))throw Error('Terminez ou réaffectez la course avant de modifier le véhicule.');
    if(!['standard','comfort','xl'].includes(input.category)||['car','owner','plate'].some(key=>typeof input[key]!=='string'||!input[key].trim()||input[key].length>100))throw Error('Vérifiez le véhicule, son propriétaire, la plaque et sa catégorie.');
    if(input.gender!==undefined&&!['woman','man'].includes(input.gender))throw Error('Identité du chauffeur invalide.');
    for(const key of ['car','owner','plate','category'])driver[key]=input[key].trim();
    if(input.gender!==undefined)driver.gender=input.gender;
  } else if(action==='user.profile') {
    if(user.role!=='primary')throw Error('Seul l’admin principal modifie les autres comptes.');
    const account=requiredItem(state.users,input.id,'Compte');
    const name=String(input.name||'').trim(),email=String(input.email||'').trim().toLowerCase();
    if(account.role==='primary'||account.id===user.id)throw Error('Utilisez Mon compte pour modifier le compte principal.');
    if(name.length<2||name.length>60||email.length>180||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||(state.users||[]).some(item=>item.id!==account.id&&item.email===email))throw Error('Nom ou adresse e-mail invalide ou déjà utilisé.');
    account.name=name;account.email=email;
    const driver=(state.drivers||[]).find(item=>item.id===account.id);if(driver)driver.name=name;
    state.sessions=(state.sessions||[]).filter(session=>session.id!==account.id);
  } else if(action==='user.status') {
    if(user.role!=='primary')throw Error('Seul l’admin principal gère les accès des comptes.');
    const account=requiredItem(state.users,input.id,'Compte');
    if(account.role==='primary'||account.id===user.id||typeof input.blocked!=='boolean')throw Error('Le compte administrateur principal est protégé.');
    if(input.blocked&&(activeRideFor(state,account.id)||(state.rides||[]).some(ride=>ride.ownerId===account.id&&ride.status==='requested')))throw Error('Clôturez ou réaffectez les courses en cours de ce compte.');
    account.blocked=input.blocked;
    state.sessions=(state.sessions||[]).filter(session=>session.id!==account.id);
  } else if(action==='user.delete') {
    if(user.role!=='primary')throw Error('Seul l’admin principal supprime les comptes clients.');
    const account=(state.users||[]).find(item=>item.id===input.id)||(state.guests||[]).find(item=>item.id===input.id);
    if(!account||!['client','guest'].includes(account.role))throw Error('Seuls les clients et invités peuvent être supprimés.');
    if(activeRideFor(state,account.id)||(state.rides||[]).some(ride=>ride.ownerId===account.id&&ride.status==='requested'))throw Error('Clôturez les courses de ce compte avant sa suppression.');
    deleteClientData(state,account);
  } else if(action==='booking.cancel') {
    const booking=requiredItem(state.bookings,input.id,'Réservation');
    if(booking.status&&booking.status!=='confirmed')throw Error('Cette réservation est déjà clôturée.');
    const trip=(state.trips||[]).find(trip=>trip.id===booking.tripId);
    if(trip)trip.seats+=booking.seats;
    state.bookings=state.bookings.filter(item=>item.id!==booking.id);
  } else if(action==='trip.archive') {
    const trip=requiredItem(state.trips,input.id,'Trajet');
    state.bookings=(state.bookings||[]).filter(booking=>booking.tripId!==trip.id);
    state.trips=state.trips.filter(item=>item.id!==trip.id);
  } else if(action==='pricing.update') {
    if(user.role!=='primary')throw Error('Seul l’admin principal modifie les tarifs.');
    const pricing=Object.fromEntries(Object.keys(defaultPricing).map(key=>[key,Number(input.pricing?.[key])]));
    if(!Object.values(pricing).every(Number.isFinite)||pricing.baseFare<0||pricing.baseFare>100000||pricing.perKm<100||pricing.perKm>100000||pricing.comfortMultiplier<1||pricing.comfortMultiplier>10||pricing.xlMultiplier<1||pricing.xlMultiplier>10)throw Error('Tarifs invalides : vérifiez les montants et multiplicateurs.');
    state.pricing=pricing;
  } else throw Error('Action administrative inconnue.');
  recordAdminEvent(state,user,action,target,note);
  return {ok:true};
}
