export async function preparePassengerPhoto(file) {
  if (!file) return '';
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 10000000) {
    throw new Error('Choisissez une photo JPEG ou PNG de moins de 10 Mo.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const ratio = Math.min(1, 320 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const photo = canvas.toDataURL('image/jpeg', 0.65);
    if (photo.length > 204800) throw new Error('Choisissez une photo plus petite.');
    return photo;
  } finally {
    URL.revokeObjectURL(url);
  }
}
