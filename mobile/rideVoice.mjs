// One tracker per signed-in identity. Initial history is never read aloud.
export function createRideVoice(announce) {
  const seen = new Map();
  return ({rides = [], available = []}, driver = false) => {
    const messages = [];
    for (const ride of rides) {
      const state = ride.status === 'accepted' ? (ride.progress || 'en_route') : ride.status;
      const previous = seen.get(ride.id);
      seen.set(ride.id, state);
      if (previous === state || (previous === undefined && ['completed','cancelled'].includes(state))) continue;
      const text = {
        requested: driver ? null : 'Votre demande est envoyée. Nous recherchons un chauffeur.',
        en_route: driver ? 'Course acceptée. Rendez-vous au point de départ.' : 'Votre chauffeur a accepté la course. Il est en route.',
        arrived: driver ? 'Arrivée au point de départ confirmée.' : 'Votre chauffeur est arrivé au point de départ.',
        in_progress: 'La course commence. Bon voyage avec Enroute.',
        completed: 'La course est terminée. Merci de voyager avec Enroute.',
        cancelled: 'La course a été annulée.',
      }[state];
      if (text) messages.push(text);
    }
    if (driver) {
      let count = 0;
      for (const ride of available) {
        if (!seen.has(ride.id)) { seen.set(ride.id, 'offer'); count++; }
      }
      if (count) messages.push(count === 1 ? 'Une nouvelle demande de course est disponible.' : `${count} nouvelles demandes de course sont disponibles.`);
    }
    if (messages.length) announce([...new Set(messages)].join(' '));
  };
}
