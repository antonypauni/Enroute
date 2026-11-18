import React from 'react';
export default function VehicleArt({category='standard'}){
 const tall=category==='xl',dark=category==='comfort';
 return <svg viewBox="0 0 180 80" className="vehicle-art" aria-hidden="true"><ellipse cx="90" cy="67" rx="75" ry="5" fill="#123c3420"/><path d={tall?'M17 51 24 24Q26 19 39 19H130Q140 19 146 29L157 47 168 51V63H13V54Z':'M13 51 40 44 57 25Q61 22 72 22H112Q122 23 139 43L162 48Q170 51 168 62H12Z'} fill={dark?'#38534e':'#c6d3cf'} stroke="#21463b" strokeWidth="2"/><path d={tall?'M35 25H71V42H29ZM78 25H112V42H78ZM119 25H132L142 42H119Z':'M61 28H84V42H47ZM91 28H110Q119 29 131 42H91Z'} fill="#e9f4f0" stroke="#668a7c"/><path d="M26 49H151M85 47V58" stroke={dark?'#849e94':'#8ba399'}/><path d="M17 51H27M153 51H165" stroke="#f5dd85" strokeWidth="4"/><circle cx="43" cy="61" r="12" fill="#15382e"/><circle cx="140" cy="61" r="12" fill="#15382e"/><circle cx="43" cy="61" r="6" fill="#d2ddd7"/><circle cx="140" cy="61" r="6" fill="#d2ddd7"/></svg>;
}
