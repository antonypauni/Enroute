export function connectionMessage(error){
  if(error?.status)return error.message;
  if(error?.name==='AbortError')return 'La connexion a pris trop de temps. Actualisez vos courses avant de réessayer.';
  if(error instanceof TypeError||/failed to fetch|network request failed|load failed/i.test(error?.message||''))return 'Connexion au serveur interrompue. Vérifiez votre réseau et actualisez vos courses avant de réessayer.';
  return error?.message||'Le serveur est indisponible. Réessayez.';
}

// A lost response does not prove that the acceptance failed. Read the server
// state before asking the driver to retry; never repeat the POST automatically.
export async function acceptRide({send,readState,rideId,userId}){
  try{return await send('rides/accept',{id:rideId})}
  catch(error){
    if(error.status)throw error;
    try{
      const state=await readState();
      const ride=state.rides?.find(ride=>ride.id===rideId&&ride.driverId===userId&&ride.status==='accepted');
      if(ride)return ride;
    }catch(verificationError){if(verificationError.status===401)throw verificationError;}
    throw new Error(connectionMessage(error));
  }
}

export function retainAcceptedRide(previous,ride){
  return {...previous,rides:[...(previous.rides||[]).filter(item=>item.id!==ride.id),ride],available:(previous.available||[]).filter(item=>item.id!==ride.id)};
}
