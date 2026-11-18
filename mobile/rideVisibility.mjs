// Presentation only: completed records remain available to finance and history.
export function matchesRideView(ride,view='active') {
  if(view==='active')return ['requested','accepted'].includes(ride.status);
  if(view==='history')return ['completed','cancelled'].includes(ride.status);
  return view==='all'||ride.status===view;
}
