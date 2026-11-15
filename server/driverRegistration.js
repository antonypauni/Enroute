import {isAdmin} from './access.js';
import {passengerContact} from './guest.js';
import {decodeFile} from './fileData.js';

export const driverDocumentKinds=['identity','license','registration','insurance'];

export function validateDriverSignup(input,state,user) {
  if(user&&user.role!=='guest')throw Error('Vous avez déjà un compte. Envoyez le dossier depuis votre espace chauffeur.');
  if(!(state.users||[]).some(isAdmin))throw Error('L’administrateur doit d’abord configurer la plateforme.');
  if(input.role!==undefined)throw Error('Le rôle du compte ne peut pas être choisi.');
  const name=typeof input.name==='string'?input.name.trim():'';
  const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
  if(name.length<2||name.length>60||email.length>180||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof input.password!=='string'||input.password.length<10||input.password.length>128||input.password!==input.confirm)throw Error('Indiquez votre nom, un e-mail et confirmez un mot de passe de 10 à 128 caractères.');
  if((state.users||[]).some(account=>account.email===email))throw Error('Inscription impossible avec cet e-mail. Si vous avez déjà un compte, connectez-vous pour envoyer le dossier.');
  const phone=passengerContact({passengerName:name,passengerPhone:input.phone},true).passengerPhone;
  validateDriverDocuments(input);
  return {name,email,phone};
}

export function validateDriverDocuments(input) {
  if(!['woman','man'].includes(input.gender)||!['standard','comfort','xl'].includes(input.category)||['owner','car','plate'].some(key=>typeof input[key]!=='string'||!input[key].trim()||input[key].trim().length>100))throw Error('Complétez votre identité, le propriétaire, le véhicule et la plaque.');
  for(const kind of driverDocumentKinds)decodeFile(input.documents?.[kind],['application/pdf','image/png','image/jpeg'],1000000);
}

export function submitDriverApplication(state,user,input,resubmit=false) {
  if(user?.role!=='client'||user.blocked)throw Error('Un compte chauffeur ou client actif est requis.');
  state.drivers||=[];
  const existing=state.drivers.find(driver=>driver.id===user.id);
  if(existing&&!resubmit)throw Error('Un dossier existe déjà. Retrouvez-le dans votre espace chauffeur.');
  if(resubmit&&(!existing||existing.status==='approved'))throw Error('Seuls les dossiers en attente ou refusés peuvent être remplacés.');
  validateDriverDocuments(input);
  const phone=input.phone===undefined?existing?.phone||user.phone||'':passengerContact({passengerName:user.name,passengerPhone:input.phone},true).passengerPhone;
  const record={id:user.id,name:user.name,email:user.email,phone,gender:input.gender,owner:input.owner.trim(),car:input.car.trim(),plate:input.plate.trim(),category:input.category,documents:{...input.documents},status:'pending',rating:existing?.rating??null,demo:false,documentRevision:(existing?.documentRevision||0)+1,submittedAt:new Date().toISOString()};
  if(existing){
    const keys=Object.values(existing.documents||{}).filter(value=>value&&typeof value==='object'&&value.key).map(value=>value.key);
    state.fileDeletionQueue=[...new Set([...(state.fileDeletionQueue||[]),...keys])];
    state.drivers[state.drivers.indexOf(existing)]=record;
  }else state.drivers.push(record);
  const account=(state.users||[]).find(account=>account.id===user.id);
  if(account){account.accountType='driver';if(phone)account.phone=phone;}
  return {ok:true,application:{status:'pending',documentRevision:record.documentRevision,submittedAt:record.submittedAt}};
}
