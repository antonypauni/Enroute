import {useEffect,useRef,useState} from 'react';
import {Linking,StyleSheet,Text,View} from 'react-native';
import {WebView} from 'react-native-webview';

const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0;background:#edf2e8}.leaflet-tooltip{font-family:Arial;font-weight:600}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
if(window.L){
const map=L.map('map').setView([-4.36,15.32],12),markers=L.layerGroup().addTo(map);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
let selection=null,lastBounds='';
window.setRideMap=function(data){
selection=data.selectTarget;markers.clearLayers();
const pins=[[data.pickup,'Départ','#173e36'],[data.destination,'Arrivée','#b37527'],[data.driver,'Chauffeur · GPS','#2476bf']];
pins.forEach(function(pin){if(pin[0])L.circleMarker(pin[0],{radius:9,color:'#fff',weight:3,fillColor:pin[2],fillOpacity:1}).bindTooltip(pin[1],{direction:'top',permanent:true}).addTo(markers)});
const bounds=JSON.stringify([data.pickup,data.destination]);
if(bounds!==lastBounds){lastBounds=bounds;const points=pins.map(p=>p[0]).filter(Boolean);if(points.length)map.fitBounds(points,{padding:[40,40],maxZoom:15});}
};
map.on('click',function(e){if(selection)window.ReactNativeWebView.postMessage(JSON.stringify({type:'point',target:selection,point:[e.latlng.lat,e.latlng.lng]}));});
window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
}else window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'}));
</script></body></html>`;

export default function RideMap({pickup,destination,driver,selectTarget,onPoint}) {
  const ref=useRef(null);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!ready)return;
    const data=JSON.stringify({pickup,destination,driver,selectTarget}).replace(/</g,'\\u003c');
    ref.current?.injectJavaScript(`window.setRideMap&&window.setRideMap(${data});true;`);
  },[ready,pickup,destination,driver,selectTarget]);
  return <View style={styles.container}>
    <WebView ref={ref} source={{html,baseUrl:'https://enroute-rdc-test-toman.antonypauniduquetom.chatgpt.site/'}}
      style={styles.map} scrollEnabled={false} javaScriptEnabled domStorageEnabled={false}
      mixedContentMode="never" allowFileAccess={false} setSupportMultipleWindows={false}
      onError={()=>setError('Carte indisponible. Vérifie ta connexion Internet.')}
      onShouldStartLoadWithRequest={request=>{
        if(request.url.startsWith('about:blank')||request.url.startsWith('https://enroute-rdc-test-toman.antonypauniduquetom.chatgpt.site/'))return true;
        if(request.url.startsWith('https://www.openstreetmap.org/'))Linking.openURL(request.url).catch(()=>{});
        return false;
      }}
      onMessage={event=>{try{const data=JSON.parse(event.nativeEvent.data);
        if(data.type==='ready')setReady(true);
        if(data.type==='error')setError('Le fond de carte n’a pas pu être chargé.');
        if(data.type==='point'&&data.target===selectTarget&&Array.isArray(data.point)&&data.point.length===2&&data.point.every(Number.isFinite))onPoint?.(data.target,data.point);
      }catch{setError('La carte n’a pas pu lire ce point.')}}}/>
    {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Text style={styles.credit}>Carte OpenStreetMap · Internet requis. Les repères de commune sont approximatifs tant qu’aucun point précis n’est choisi.</Text>
  </View>;
}
const styles=StyleSheet.create({container:{overflow:'hidden',borderRadius:20,borderWidth:1,borderColor:'#dde6d9'},map:{height:290,backgroundColor:'#edf2e8'},credit:{fontSize:11,lineHeight:16,color:'#52665d',padding:10},error:{fontSize:13,color:'#8a3523',padding:12}});
