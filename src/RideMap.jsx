import React,{useEffect,useRef} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function RideMap({pickup,destination,driver,onPoint}) {
  const root=useRef(null),map=useRef(null),markers=useRef(null),handler=useRef(onPoint);
  handler.current=onPoint;
  useEffect(()=>{
    const instance=L.map(root.current).setView([-4.36,15.32],12);
    map.current=instance;markers.current=L.layerGroup().addTo(instance);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(instance);
    instance.on('click',event=>handler.current?.([event.latlng.lat,event.latlng.lng]));
    const observer=new ResizeObserver(()=>instance.invalidateSize());observer.observe(root.current);
    return()=>{observer.disconnect();instance.remove();map.current=null};
  },[]);
  const a=JSON.stringify(pickup),b=JSON.stringify(destination),c=JSON.stringify(driver);
  useEffect(()=>{
    if(!markers.current)return;
    markers.current.clearLayers();
    [[pickup,'Départ','#173e36'],[destination,'Arrivée','#b37527'],[driver,'Chauffeur · GPS','#2476bf']].forEach(([point,label,color])=>{
      if(point)L.circleMarker(point,{radius:9,color:'#fff',weight:3,fillColor:color,fillOpacity:1}).bindTooltip(label,{permanent:true,direction:'top'}).addTo(markers.current);
    });
  },[a,b,c]);
  useEffect(()=>{
    const points=[pickup,destination].filter(Boolean);
    if(map.current&&points.length)map.current.fitBounds(points,{padding:[45,45],maxZoom:15});
  },[a,b]);
  return <div className="ride-map"><div ref={root} className="ride-map-canvas" role="region" aria-label="Carte du départ, de l’arrivée et du chauffeur"/><small>Vert : départ · Or : arrivée · Bleu : GPS du chauffeur. Les centres de commune sont approximatifs tant qu’aucun point précis n’est choisi.</small></div>;
}
