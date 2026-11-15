export const isCashRide=ride=>!ride.paymentMethod||ride.paymentMethod==='cash';
export const ridePaymentLabel=ride=>isCashRide(ride)?'Espèces':({mpesa:'M-Pesa',airtel_money:'Airtel Money',orange_money:'Orange Money',afrimoney:'AfriMoney',card:'Carte',bank:'Virement',mobile_money:'Mobile Money'}[ride.paymentMethod]||'Électronique');
export function canReceiveRidePayment(financialStatus,ride){
 if(isCashRide(ride))return !financialStatus?.cashRestricted;
 return ['mobile_money','mpesa','airtel_money','orange_money','afrimoney','card','bank'].includes(ride.paymentMethod)&&ride.paymentStatus==='paid'&&['merchant','admin_verified'].includes(ride.paymentSource);
}
