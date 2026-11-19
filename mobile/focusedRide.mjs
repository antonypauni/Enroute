export function focusedPassengerRide(rides, user, pinnedId) {
  if (!user || !['guest','client'].includes(user.role) || user.accountType === 'driver') return null;
  const own = rides.filter(ride => ride.ownerId === user.id);
  return own.find(ride => ride.id === pinnedId) || own.find(ride => ['requested','accepted'].includes(ride.status)) || null;
}
