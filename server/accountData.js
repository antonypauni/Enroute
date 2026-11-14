export function deleteClientData(state, user) {
  if (!user || !['client','guest'].includes(user.role)) throw Error('La suppression directe est réservée aux comptes clients.');
  const files = (state.rides || []).filter(ride=>ride.ownerId===user.id).map(ride=>ride.photoKey).filter(Boolean);
  const driver=(state.drivers || []).find(driver=>driver.id===user.id);
  for(const document of Object.values(driver?.documents || {})) if(document && typeof document==='object' && document.key)files.push(document.key);
  state.fileDeletionQueue = [...new Set([...(state.fileDeletionQueue || []),...files])];
  const tripIds = new Set(state.trips.filter(trip => trip.ownerId === user.id).map(trip => trip.id));
  for (const booking of state.bookings) {
    if (booking.ownerId === user.id) {
      const trip = state.trips.find(trip => trip.id === booking.tripId);
      if (trip) trip.seats += booking.seats;
    } else if (tripIds.has(booking.tripId)) {
      booking.status = 'cancelled_driver_account';
    }
  }
  state.bookings = state.bookings.filter(booking => booking.ownerId !== user.id);
  state.trips = state.trips.filter(trip => trip.ownerId !== user.id);
  state.rides = (state.rides || []).filter(ride => ride.ownerId !== user.id);
  for (const ride of state.rides) {
    if (ride.driverId === user.id) {
      delete ride.driverId;
      delete ride.driverLocation;
      delete ride.driverName;
      if (ride.status === 'accepted') ride.status = 'cancelled';
    }
  }
  state.drivers = (state.drivers || []).filter(driver => driver.id !== user.id);
  state.guests = (state.guests || []).filter(guest=>guest.id!==user.id);
  state.users = state.users.filter(account => account.id !== user.id);
  if (state.sessions) state.sessions = state.sessions.filter(session => session.id !== user.id);
}
