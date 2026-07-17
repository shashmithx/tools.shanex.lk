function readPoint(url, prefix) {
  const lat = Number(url.searchParams.get(`${prefix}Lat`));
  const lng = Number(url.searchParams.get(`${prefix}Lng`));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function appendCommonParams(target, home, school, key) {
  target.searchParams.set('size', '640x500');
  target.searchParams.set('scale', '2');
  target.searchParams.set('maptype', 'roadmap');
  target.searchParams.append('markers', `color:red|label:H|${home.lat},${home.lng}`);
  target.searchParams.append('markers', `color:red|label:S|${school.lat},${school.lng}`);
  target.searchParams.set('key', key);
}

export async function onRequestGet({ request, env }) {
  const key = env.GOOGLE_MAPS_API_KEY;
  if (!key) return new Response('GOOGLE_MAPS_API_KEY is not configured', { status: 503 });

  const url = new URL(request.url);
  const home = readPoint(url, 'home');
  const school = readPoint(url, 'school');
  if (!home || !school) return new Response('Invalid coordinates', { status: 400 });

  const staticUrl = new URL('https://maps.googleapis.com/maps/api/staticmap');
  appendCommonParams(staticUrl, home, school, key);

  try {
    const route = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: home.lat, longitude: home.lng } } },
        destination: { location: { latLng: { latitude: school.lat, longitude: school.lng } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
        computeAlternativeRoutes: false,
      }),
    }).then(r => r.ok ? r.json() : null);
    const polyline = route?.routes?.[0]?.polyline?.encodedPolyline;
    if (polyline) staticUrl.searchParams.append('path', `color:0x1a2cff|weight:6|enc:${polyline}`);
    else staticUrl.searchParams.append('path', `color:0xf6c21a|weight:5|${home.lat},${home.lng}|${school.lat},${school.lng}`);
  } catch {
    staticUrl.searchParams.append('path', `color:0xf6c21a|weight:5|${home.lat},${home.lng}|${school.lat},${school.lng}`);
  }

  const image = await fetch(staticUrl.toString());
  const headers = new Headers(image.headers);
  headers.set('Cache-Control', 'public, max-age=86400');
  headers.delete('set-cookie');
  return new Response(image.body, { status: image.status, headers });
}
