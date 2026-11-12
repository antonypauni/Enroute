export function createGuest(state) {
  state.guests ||= [];
  const guest = {id:crypto.randomUUID(), name:'Invité', role:'guest', createdAt:new Date().toISOString()};
  state.guests.push(guest);
  return guest;
}

export function passengerContact(input, required) {
  const name = typeof input.passengerName === 'string' ? input.passengerName.trim() : '';
  const rawPhone = typeof input.passengerPhone === 'string' ? input.passengerPhone.trim() : '';
  if (!required && !name && !rawPhone) return {};
  if (name.length < 2 || name.length > 60 || !/^[+0-9 ().-]+$/.test(rawPhone)) throw Error('Indiquez votre nom et votre numéro de téléphone.');
  let phone = rawPhone.replace(/[ ().-]/g,'');
  if (/^0\d{9}$/.test(phone)) phone = '+243' + phone.slice(1);
  else if (/^\d{9}$/.test(phone)) phone = '+243' + phone;
  else if (/^243\d{9}$/.test(phone)) phone = '+' + phone;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw Error('Vérifiez le numéro de téléphone, par exemple +243 suivi du numéro local.');
  return {passengerName:name, passengerPhone:phone};
}

export function allowGuestCreation(state, key, now=Date.now()) {
  state.guestLimits ||= {};
  for(const id of Object.keys(state.guestLimits))if(state.guestLimits[id].expires<=now)delete state.guestLimits[id];
  const entry=state.guestLimits[key] || {count:0,expires:now+3600000};
  if(entry.count>=60)throw Error('Trop de demandes de session. Réessayez plus tard.');
  entry.count++;
  state.guestLimits[key]=entry;
}

export function transferGuestOrders(state, guest, client) {
  if (guest?.role !== 'guest' || client?.role !== 'client') return false;
  for (const ride of state.rides || []) if (ride.ownerId === guest.id) ride.ownerId = client.id;
  for (const booking of state.bookings || []) if (booking.ownerId === guest.id) booking.ownerId = client.id;
  state.guests = (state.guests || []).filter(item => item.id !== guest.id);
  state.sessions = (state.sessions || []).filter(item => item.id !== guest.id);
  return true;
}
