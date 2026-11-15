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
 if(!user||(state.drivers||[]).every(driver=>driver.id!==user.id||driver.status!=='approved'))return [];
 const financial=driverFinancialStatus(state,user.id);
 return (state.rides||[]).filter(ride=>canPreviewRide(state,user,ride,now,financial)).map(({passengerPhone,passengerPhoto,photoKey,photoMime,driverLocation,...ride})=>({...ride,hasPassengerPhoto:!!(passengerPhoto||photoKey)}));
}
