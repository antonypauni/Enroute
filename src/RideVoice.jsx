import {useEffect} from 'react';
import {createLiveRefresh} from '../mobile/liveRefresh.mjs';
import {createRideVoice} from '../mobile/rideVoice.mjs';

export default function RideVoice({user}) {
  useEffect(() => {
    if (!user?.id || ['primary','secondary'].includes(user.role) || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    let pending = '', unlocked = navigator.userActivation?.hasBeenActive || false, disposed = false;
    const speak = text => {
      pending = text;
      if (!unlocked || document.visibilityState === 'hidden') return;
      pending = '';
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR'; utterance.rate = 1; utterance.volume = 1;
      const voice = synth.getVoices().find(v => v.lang.startsWith('fr'));
      if (voice) utterance.voice = voice;
      utterance.onerror = event => { if (!disposed && event.error === 'not-allowed') { unlocked = false; pending = text; } };
      synth.speak(utterance);
    };
    const unlock = () => { unlocked = true; if (pending) speak(pending); };
    const track = createRideVoice(speak);
    const live = createLiveRefresh({interval:2000, read:async()=>{
      const response = await fetch('/api/rides/state', {cache:'no-store',signal:AbortSignal.timeout(10000)});
      if (!response.ok) throw Error('Actualisation indisponible');
      return response.json();
    }, onData:data=>{if (!disposed && document.visibilityState !== 'hidden') track(data,user.accountType === 'driver');}, onError:()=>{}});
    const wake = () => {if(document.visibilityState !== 'hidden') live.refresh();};
    window.addEventListener('pointerdown',unlock); window.addEventListener('keydown',unlock);
    document.addEventListener('visibilitychange',wake); live.refresh();
    return () => {disposed=true;live.stop();synth.cancel();window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);document.removeEventListener('visibilitychange',wake);};
  },[user?.id,user?.role,user?.accountType]);
  return null;
}
