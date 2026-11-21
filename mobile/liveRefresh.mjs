// One request at a time. A wake-up during a request is delivered immediately after it.
export function createLiveRefresh({read,onData,onError,interval=1500,isActive=()=>true,schedule=setTimeout,cancel=clearTimeout}){
 let stopped=false,running=false,again=false,timer;
 async function refresh(){
  if(stopped||!isActive())return;
  cancel(timer);
  if(running){again=true;return;}
  running=true;
  try{const data=await read();if(!stopped&&isActive())onData(data);}catch(error){if(!stopped&&isActive())onError(error);}
  finally{running=false;if(!stopped&&isActive()){const delay=again?0:interval;again=false;timer=schedule(refresh,delay);}}
 }
 return {refresh,stop(){stopped=true;cancel(timer);}};
}
