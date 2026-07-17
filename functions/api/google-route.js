function readPoint(url, prefix) {
  const lat = Number(url.searchParams.get(`${prefix}Lat`));
  const lng = Number(url.searchParams.get(`${prefix}Lng`));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);
  if (hours > 0) return `${hours} hr ${minutes} min`;
  return `${Math.max(1, minutes)} min`;
}

function mapUrlFromRequest(url) {
  const params = new URLSearchParams(url.searchParams);
  params.delete('bust');
  return `/api/google-map?${params.toString()}`;
}

export async function onRequestGet({ request, env }) {
  const key = env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Response.json({ ok: false, configured: false, error: 'GOOGLE_MAPS_API_KEY is not configured' }, { status: 503 });
  }

  const url = new URL(request.url);
  const home = readPoint(url, 'home');
  const school = readPoint(url, 'school');
  if (!home || !school) return Response.json({ ok: false, error: 'Invalid coordinates' }, { status: 400 });

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: home.lat, longitude: home.lng } } },
        destination: { location: { latLng: { latitude: school.lat, longitude: school.lng } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_UNAWARE',
        computeAlternativeRoutes: false,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      return Response.json({ ok: false, configured: true, error: 'Google Routes API failed', detail }, { status: 502 });
    }
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) return Response.json({ ok: false, configured: true, error: 'No route found' }, { status: 404 });

    const distanceMeters = Number(route.distanceMeters || 0);
    const durationSeconds = Number(String(route.duration || '0s').replace('s', ''));
    return Response.json({
      ok: true,
      configured: true,
      distanceMeters,
      distanceKm: distanceMeters / 1000,
      distanceText: `${(distanceMeters / 1000).toFixed(1)} km`,
      durationSeconds,
      durationText: formatDuration(durationSeconds),
      encodedPolyline: route.polyline?.encodedPolyline || '',
      mapUrl: mapUrlFromRequest(url),
    });
  } catch (error) {
    return Response.json({ ok: false, configured: true, error: error?.message || 'Google route failed' }, { status: 502 });
  }
}
