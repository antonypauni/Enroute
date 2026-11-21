import {driverFinancialStatus} from './finance.js';
import {canReceiveRidePayment} from '../mobile/ridePayment.mjs';

export function canPreviewRide(state,user,ride,now=Date.now(),financial){
 if(!user||user.blocked||!ride||ride.status!=='requested'||ride.ownerId===user.id)return false;
 const driver=(state.drivers||[]).find(item=>item.id===user.id&&item.status==='approved'&&!item.demo);
 if(!driver||driver.online===false||(state.users||[]).some(account=>(account.id===user.id||account.id===ride.ownerId)&&account.blocked))return false;
 if((state.rides||[]).some(other=>other.driverId===user.id&&other.status==='accepted'))return false;
 return driver.category===ride.category&&(!ride.womenOnly||driver.gender==='woman')&&(ride.immediate||Date.parse(ride.departure)>now)&&canReceiveRidePayment(financial||driverFinancialStatus(state,user.id),ride);
}

export function driverOffers(state,user,now=Date.now()){
 if(!user||user.blocked)return [];
 const driver=(state.drivers||[]).find(item=>item.id===user.id&&item.status==='approved'&&!item.demo);
 if(!driver||driver.online===false)return [];
 const blocked=new Set((state.users||[]).filter(account=>account.blocked).map(account=>account.id));
 if(blocked.has(user.id)||(state.rides||[]).some(ride=>ride.driverId===user.id&&ride.status==='accepted'))return [];
 const financial=driverFinancialStatus(state,user.id);
 // Account and active-trip checks are invariant across offers: compute them once.
 return (state.rides||[]).filter(ride=>ride.status==='requested'&&ride.ownerId!==user.id&&!blocked.has(ride.ownerId)&&driver.category===ride.category&&(!ride.womenOnly||driver.gender==='woman')&&(ride.immediate||Date.parse(ride.departure)>now)&&canReceiveRidePayment(financial,ride)).map(({passengerPhone,passengerPhoto,photoKey,photoMime,driverLocation,...ride})=>({...ride,hasPassengerPhoto:!!(passengerPhoto||photoKey)}));
}
