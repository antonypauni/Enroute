export const cities=['Kinshasa','Matadi','Boma','Kisantu','Kikwit','Lubumbashi','Likasi','Kolwezi'];
export const day=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const initialTrips=()=>[
{id:'t1',from:'Kinshasa',to:'Matadi',date:day(),time:'08:00',price:45000,currency:'CDF',seats:3,driver:'Patrick M.',car:'Toyota Corolla',pickup:'Lemba, Super Lemba'},
{id:'t2',from:'Kinshasa',to:'Kisantu',date:day(),time:'09:30',price:15,currency:'USD',seats:2,driver:'Grâce K.',car:'Hyundai Tucson',pickup:'Limete, 7e rue'},
{id:'t3',from:'Kinshasa',to:'Matadi',date:day(),time:'14:00',price:20,currency:'USD',seats:4,driver:'David B.',car:'Kia Sportage',pickup:'Mont-Ngafula, UPN'},
{id:'t4',from:'Lubumbashi',to:'Likasi',date:day(),time:'11:00',price:25000,currency:'CDF',seats:3,driver:'Sarah D.',car:'Suzuki Swift',pickup:'Centre-ville'}];
