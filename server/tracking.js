export function validPoint(value) {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) &&
    value[0] >= -4.8 && value[0] <= -3.8 && value[1] >= 15 && value[1] <= 16;
}

export function ridePoints(input) {
  const result = {};
  for (const key of ['pickupPoint', 'destinationPoint']) {
    if (input[key] == null) continue;
    if (!validPoint(input[key])) throw Error('Choisissez un point dans la zone de Kinshasa.');
    result[key] = input[key].map(value => Number(value.toFixed(6)));
  }
  return result;
}

export function trackingAction(path, input, state, user, now = Date.now()) {
  const ride = state.rides.find(item => item.id === input.id);
  const driver = state.drivers.find(item => item.id === user.id && item.status === 'approved');
  if (!ride || !driver || ride.driverId !== user.id || ride.status !== 'accepted') {
    throw Error('Seul le chauffeur affecté peut partager sa position pendant la course.');
  }
  if (path === '/api/rides/location/stop') {
    delete ride.driverLocation;
    return {ok:true};
  }
  if (!validPoint(input.point) || input.mocked === true || !Number.isFinite(input.accuracy) ||
      input.accuracy < 0 || input.accuracy > 100 || !Number.isFinite(input.timestamp) ||
      input.timestamp < now - 30000 || input.timestamp > now + 10000) {
    throw Error('Position GPS trop ancienne ou imprécise. Attendez un signal précis.');
  }
  if (ride.driverLocation && input.timestamp <= ride.driverLocation.timestamp) {
    throw Error('Une position plus récente a déjà été reçue.');
  }
  if (ride.driverLocation && now - ride.driverLocation.receivedAt < 3000) return {ok:true};
  ride.driverLocation = {
    point:input.point.map(value => Number(value.toFixed(6))),
    accuracy:Math.round(input.accuracy), timestamp:input.timestamp, receivedAt:now,
  };
  return {ok:true};
}

export function rideForViewer(ride, now = Date.now()) {
  const {driverLocation, ...result} = ride;
  const live = ride.status === 'accepted' && driverLocation && now - driverLocation.receivedAt <= 30000;
  return {...result, driverLocation:live ? driverLocation : null,
    locationStatus:live ? 'live' : ride.status === 'accepted' && driverLocation ? 'stale' : 'off'};
}
