function extractCoordinates(input) {
  const raw = String(input || '');
  const decoded = (() => {
    try { return decodeURIComponent(raw); } catch { return raw; }
  })();
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:,|\b)/,
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
  ];
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

function isAllowedMapUrl(url) {
  return ['www.google.com', 'google.com', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'].includes(url.hostname.toLowerCase());
}

export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  const source = requestUrl.searchParams.get('url') || '';
  let target;
  try {
    target = new URL(source);
  } catch {
    return Response.json({ ok: false, error: 'Invalid URL' }, { status: 400 });
  }
  if (!isAllowedMapUrl(target)) {
    return Response.json({ ok: false, error: 'Only Google Maps links are allowed' }, { status: 400 });
  }

  const direct = extractCoordinates(source);
  if (direct) return Response.json({ ok: true, ...direct, resolvedUrl: source });

  try {
    const response = await fetch(target.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 SHANEX-Tools/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const resolvedUrl = response.url || source;
    const resolved = extractCoordinates(resolvedUrl);
    if (resolved) return Response.json({ ok: true, ...resolved, resolvedUrl });

    const html = await response.text();
    const fromHtml = extractCoordinates(html);
    if (fromHtml) return Response.json({ ok: true, ...fromHtml, resolvedUrl });

    return Response.json({ ok: false, error: 'Coordinates not found' }, { status: 404 });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || 'Failed to resolve link' }, { status: 502 });
  }
}
