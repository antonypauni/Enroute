import {decodeFile} from '../server/fileData.js';
import {isAdmin} from '../server/access.js';

export async function storeRequestFiles(env, state, path, result, user, cache) {
  async function store(label, value, types, limit) {
    if (cache.has(label)) return cache.get(label);
    if (!env.BUCKET) throw Error('Le stockage privé des fichiers est indisponible. Réessayez sans photo.');
    const file = decodeFile(value, types, limit);
    const key = `private/${user.id}/${crypto.randomUUID()}`;
    await env.BUCKET.put(key, file.bytes, {httpMetadata:{contentType:file.mime}});
    const reference = {key, mime:file.mime};
    cache.set(label, reference);
    return reference;
  }
  if (path === '/api/rides/request' && result.passengerPhoto) {
    const file = await store('passengerPhoto',result.passengerPhoto,['image/jpeg','image/png'],150*1024);
    result.photoKey=file.key;
    result.photoMime=file.mime;
    delete result.passengerPhoto;
  }
  if (path === '/api/drivers/apply') {
    const driver = state.drivers.find(driver=>driver.id===user.id);
    for (const [kind,value] of Object.entries(driver.documents)) {
      driver.documents[kind] = await store(kind,value,['image/jpeg','image/png','application/pdf'],1000000);
    }
  }
}

export async function privateData(env, file) {
  if (typeof file === 'string') return file;
  if (!file?.key || !env.BUCKET) throw Error('Fichier introuvable.');
  const object = await env.BUCKET.get(file.key);
  if (!object) throw Error('Fichier introuvable.');
  const bytes = new Uint8Array(await object.arrayBuffer());
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return `data:${file.mime};base64,${btoa(binary)}`;
}

export async function ridePhoto(env,state,user,id) {
  const ride=(state.rides || []).find(ride=>ride.id===id);
  if(!user || !ride || !(isAdmin(user)||ride.ownerId===user.id||ride.driverId===user.id)) throw Error('Photo indisponible pour ce compte.');
  if(!ride.photoKey && !ride.passengerPhoto)throw Error('Aucune photo pour cette course.');
  return {data:await privateData(env,ride.passengerPhoto || {key:ride.photoKey,mime:ride.photoMime})};
}

export async function drainFileDeletionQueue(env) {
  if(!env.BUCKET)return;
  for(let attempt=0;attempt<2;attempt++) {
    const row=await env.DB.prepare('SELECT data,revision FROM enroute_state WHERE id=1').first();
    if(!row)return;
    const state=JSON.parse(row.data),keys=(state.fileDeletionQueue || []).slice(0,10);
    if(!keys.length)return;
    const removed=[];
    for(const key of keys) {
      try {await env.BUCKET.delete(key);removed.push(key);} catch {}
    }
    if(!removed.length)return;
    const latest=await env.DB.prepare('SELECT data,revision FROM enroute_state WHERE id=1').first();
    const updated=JSON.parse(latest.data);
    updated.fileDeletionQueue=(updated.fileDeletionQueue || []).filter(key=>!removed.includes(key));
    const saved=await env.DB.prepare('UPDATE enroute_state SET data=?,revision=revision+1 WHERE id=1 AND revision=?').bind(JSON.stringify(updated),latest.revision).run();
    if(saved.meta.changes)return;
  }
}
