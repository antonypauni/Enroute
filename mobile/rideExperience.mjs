export const rideProgress=ride=>ride.progress||'en_route';
export function rideStatusLabel(ride){
 if(ride.status==='accepted')return {en_route:'Chauffeur en route',arrived:'Chauffeur arrivé au départ',in_progress:'Course en cours'}[rideProgress(ride)]||'Course acceptée';
 return {requested:'En attente d’un chauffeur',completed:'Course terminée',cancelled:'Course annulée'}[ride.status]||ride.status;
}
export const nextRideStep=ride=>ride.status!=='accepted'?null:rideProgress(ride)==='en_route'?{stage:'arrived',label:'Je suis arrivé au point de départ'}:rideProgress(ride)==='arrived'?{stage:'in_progress',label:'Client à bord · démarrer la course'}:null;
