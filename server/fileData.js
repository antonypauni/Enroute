export function decodeFile(value, allowedTypes, maxBytes) {
  if (typeof value !== 'string' || value.length > Math.ceil(maxBytes*4/3)+100) throw Error('Le fichier est trop volumineux.');
  const match = /^data:([^;]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || !allowedTypes.includes(match[1])) throw Error('Format de fichier non pris en charge.');
  let binary;
  try { binary = atob(match[2]); } catch { throw Error('Fichier invalide.'); }
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  if (!bytes.length || bytes.length > maxBytes) throw Error('Le fichier est trop volumineux.');
  const valid = match[1] === 'image/jpeg' ? bytes[0]===255 && bytes[1]===216 && bytes[2]===255 : match[1] === 'image/png' ? [137,80,78,71,13,10,26,10].every((byte,index)=>bytes[index]===byte) : String.fromCharCode(...bytes.slice(0,4))==='%PDF';
  if (!valid) throw Error('Le contenu du fichier ne correspond pas à son format.');
  return {mime:match[1],bytes};
}

export function photoData(value) {
  if (value === undefined || value === null || value === '') return {};
  decodeFile(value, ['image/jpeg','image/png'], 150*1024);
  return {passengerPhoto:value};
}
