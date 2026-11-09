export const vehicleCategories={standard:{label:'Standard',description:'Une voiture pour les trajets du quotidien.'},comfort:{label:'Confort',description:'Une catégorie pour plus de confort.'},xl:{label:'XL',description:'Un véhicule avec davantage de places.'}};
export function categoryOf(trip){return trip.category||({'kin-1':'standard','kin-2':'comfort','kin-3':'xl'})[trip.id]||'standard'}
