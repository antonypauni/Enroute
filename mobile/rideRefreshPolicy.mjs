// Passenger tracking and voice must remain live on the booking screen as well.
export const shouldRefreshRides=(session,account)=>!!session&&!['primary','secondary'].includes(account?.role);
