import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowRight, LogIn, MapPin, ReceiptText, Ruler, Scissors } from 'lucide-react';
import './styles.css';

const shopStoreKey = 'shanex-tools-session';
const defaultUser = { id: 1, name: 'SHANEX User', email: 'admin@shanex.com', password: 'admin123', role: 'customer' };

const templates = [
  { id: 'fast-a4-bw', name: 'Fast A4 B&W', description: 'Everyday school document printing with safe margins.', version: '1.0.0', settings: { paperSize: 'A4', orientation: 'portrait', colorMode: 'grayscale', duplex: 'single', pagesPerSheet: 1, scale: 'fit95', paperSafeMargin: 3 } },
  { id: 'business-card-a4', name: 'Business Card Sheet', description: 'Color A4 output suitable for imposed card sheets.', version: '1.0.0', settings: { paperSize: 'A4', orientation: 'portrait', colorMode: 'color', duplex: 'single', pagesPerSheet: 1, scale: 'noscale', paperSafeMargin: 0 } },
  { id: 'bill-book-numbering', name: 'Bill Book Numbering', description: 'Single-sided numbering output for bill books and receipt books.', version: '1.0.0', settings: { paperSize: 'A4', orientation: 'portrait', colorMode: 'grayscale', duplex: 'single', pagesPerSheet: 1, scale: 'noscale', paperSafeMargin: 3 } },
];

function getSession() {
  try { return JSON.parse(localStorage.getItem(shopStoreKey) || 'null'); } catch { return null; }
}

function setSession(session) {
  if (!session) localStorage.removeItem(shopStoreKey);
  else localStorage.setItem(shopStoreKey, JSON.stringify(session));
}

function params() {
  return new URLSearchParams(window.location.search || '');
}

function route() {
  return (window.location.pathname || '/').replace(/\/+$/, '') || '/';
}

function isDesktop() {
  return !!params().get('desktop');
}

function postDesktop(message) {
  if (!isDesktop()) return false;
  window.parent?.postMessage({ source: 'shanex-online-tools', ...message }, '*');
  return true;
}

function makeToken(session) {
  const payload = {
    token: session.token,
    user: session.user,
    appVersion: params().get('appVersion') || '',
    hardwareId: params().get('hardwareId') || '',
    licenseStatus: params().get('licenseStatus') || '',
    expiresAt: Date.now() + 12 * 60 * 60 * 1000,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

function Logo() {
  return <div className="logo-mark">SX</div>;
}

function Layout({ title, subtitle, children }) {
  return (
    <main className="page">
      <section className="shell">
        <header className="topbar">
          <a className="brand" href={`/tools${window.location.search || ''}`}><Logo /><span>SHANEX Tools</span></a>
          <nav>
            <a href={`/tools${window.location.search || ''}`}>Tools</a>
            <a href={`/desktop-login${window.location.search || ''}`}>Login</a>
            {isDesktop() && <button type="button" onClick={() => postDesktop({ type: 'close' })}>Close</button>}
          </nav>
        </header>
        <div className="hero"><h1>{title}</h1><p>{subtitle}</p></div>
        {children}
      </section>
    </main>
  );
}

async function exportPdf(element, fileName) {
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#fff', useCORS: true });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
  return { dataUrl: pdf.output('datauristring'), fileName, mime: 'application/pdf' };
}

function download(dataUrl, fileName) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function sendOrDownload(file) {
  if (!postDesktop({ type: 'generated-file', file })) download(file.dataUrl, file.fileName);
}

function DesktopLogin() {
  const [session, updateSession] = useState(getSession);
  const [form, setForm] = useState({ email: '', password: '' });
  const [notice, setNotice] = useState('');

  const connect = (next = session) => {
    if (!next) return;
    postDesktop({ type: 'login-complete', session: { token: makeToken(next), user: next.user, expiresAt: Date.now() + 12 * 60 * 60 * 1000 } });
    setNotice('Login sent to SHANEX Print Manager.');
  };

  useEffect(() => { if (session && isDesktop()) connect(session); }, []);

  const login = (event) => {
    event.preventDefault();
    if (form.email.trim().toLowerCase() !== defaultUser.email || form.password !== defaultUser.password) {
      setNotice('Invalid login details.');
      return;
    }
    const next = { token: `static-${defaultUser.id}-${Date.now()}`, user: { id: defaultUser.id, name: defaultUser.name, email: defaultUser.email, role: defaultUser.role } };
    setSession(next);
    updateSession(next);
    connect(next);
  };

  return (
    <Layout title="Desktop Login" subtitle="Connect tools.shanex.lk with SHANEX Print Manager.">
      <div className="card narrow">
        {session ? (
          <>
            <h2>Logged in as {session.user.name}</h2>
            <p>{session.user.email}</p>
            <button className="primary" onClick={() => connect(session)}>Connect Desktop <LogIn size={18} /></button>
            <button className="ghost" onClick={() => { setSession(null); updateSession(null); }}>Use another account</button>
          </>
        ) : (
          <form className="form" onSubmit={login}>
            <label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@shanex.com" /></label>
            <label>Password<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="admin123" /></label>
            <button className="primary" type="submit">Login</button>
          </form>
        )}
        {notice && <div className="notice">{notice}</div>}
      </div>
    </Layout>
  );
}

function ToolsHome() {
  const importTemplate = (template) => {
    if (!postDesktop({ type: 'import-template', template })) alert('Open this page inside SHANEX Print Manager to import templates.');
  };
  const tools = [
    { path: '/tools/ahas-dura', name: 'Ahas Dura', icon: MapPin, text: 'Sky distance proof for school admissions.' },
    { path: '/tools/business-card-planner', name: 'Business Card Planner', icon: Scissors, text: 'Card sheets with bleed and cut marks.' },
    { path: '/tools/bill-numbering', name: 'Bill Book Numbering', icon: ReceiptText, text: 'Stack numbering for easy cutting.' },
  ];
  return (
    <Layout title="Online Tools" subtitle="Generate print-ready files and import templates into SHANEX Print Manager.">
      <div className="grid three">
        {tools.map(tool => {
          const Icon = tool.icon;
          return <a className="card tool-link" key={tool.path} href={`${tool.path}${window.location.search || ''}`}><Icon size={30} /><h2>{tool.name}</h2><p>{tool.text}</p><span>Open <ArrowRight size={16} /></span></a>;
        })}
      </div>
      <div className="card">
        <h2>Print Templates</h2>
        <div className="grid three">
          {templates.map(template => <div className="template" key={template.id}><strong>{template.name}</strong><p>{template.description}</p><button onClick={() => importTemplate(template)}>Import</button></div>)}
        </div>
      </div>
    </Layout>
  );
}

function LocationSearch({ label, value, onSelect }) {
  const [query, setQuery] = useState('');
  const [pasteValue, setPasteValue] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('');
  const applyPoint = (point) => {
    onSelect(point);
    setResults([]);
    setStatus('');
  };
  const parseCoordinates = (text) => {
    const raw = String(text || '').trim();
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
        return { lat, lng, label: /^https?:\/\//i.test(raw) ? 'Pasted Google Maps location' : raw };
      }
    }
    return null;
  };
  const pasteLocation = async () => {
    const text = pasteValue.trim();
    if (!text) return;
    setStatus('Reading location...');
    const direct = parseCoordinates(text);
    if (direct) {
      applyPoint(direct);
      return;
    }
    if (/^https?:\/\//i.test(text)) {
      try {
        const resolved = await fetch(`/api/resolve-map-link?url=${encodeURIComponent(text)}`).then(r => r.ok ? r.json() : null);
        if (resolved?.lat && resolved?.lng) {
          applyPoint({ lat: Number(resolved.lat), lng: Number(resolved.lng), label: resolved.resolvedUrl || text });
          return;
        }
      } catch {
        // Fall through to the user-facing status below.
      }
    }
    setStatus('Could not read coordinates from that paste. Use a Google Maps link or lat,lng.');
  };
  const search = async () => {
    if (!query.trim()) return;
    setStatus('Searching...');
    setResults([]);
    const q = /\bsri\s*lanka\b/i.test(query) ? query : `${query}, Sri Lanka`;
    try {
      const nominatim = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=8&countrycodes=lk&addressdetails=1&accept-language=en`;
      const data = await fetch(nominatim, { headers: { Accept: 'application/json' } }).then(r => r.ok ? r.json() : []);
      if (Array.isArray(data) && data.length) {
        setResults(data.map(item => ({ id: `osm-${item.place_id}`, lat: Number(item.lat), lng: Number(item.lon), label: item.display_name })));
        setStatus('');
        return;
      }
      const photon = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en&bbox=79.3,5.7,82.2,10.1`;
      const fallback = await fetch(photon).then(r => r.ok ? r.json() : null);
      const features = Array.isArray(fallback?.features) ? fallback.features : [];
      setResults(features.map((feature, index) => {
        const props = feature.properties || {};
        const [lng, lat] = feature.geometry?.coordinates || [];
        const labelParts = [props.name, props.street, props.city || props.county, props.state, props.country].filter(Boolean);
        return { id: `photon-${index}-${lat}-${lng}`, lat: Number(lat), lng: Number(lng), label: labelParts.join(', ') || q };
      }).filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng)));
      setStatus(features.length ? '' : 'No results found. Try a nearby town or click the map.');
    } catch {
      setStatus('Search failed. Try again or click the map to pin manually.');
    }
  };
  return (
    <div className="location-search">
      <label>{label}</label>
      <div className="inline"><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search(); } }} /><button onClick={search}>Search</button></div>
      <div className="inline">
        <input value={pasteValue} onChange={e => setPasteValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); pasteLocation(); } }} placeholder="Paste Google Maps link or 6.872031, 80.139786" />
        <button onClick={pasteLocation}>Use Paste</button>
      </div>
      {value && <small>{Number(value.lat).toFixed(6)}, {Number(value.lng).toFixed(6)}</small>}
      {status && <small>{status}</small>}
      {!!results.length && <div className="results">{results.map(item => <button key={item.id} onClick={() => applyPoint(item)}>{item.label}</button>)}</div>}
    </div>
  );
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForMapTiles(map) {
  if (!map) return Promise.resolve();
  map.invalidateSize();
  const container = map.getContainer();
  const tiles = Array.from(container.querySelectorAll('img.leaflet-tile'));
  const pending = tiles.filter(tile => !tile.complete || tile.naturalWidth === 0);
  if (!pending.length) return wait(250);
  return Promise.race([
    Promise.all(pending.map(tile => new Promise(resolve => {
      tile.addEventListener('load', resolve, { once: true });
      tile.addEventListener('error', resolve, { once: true });
    }))),
    wait(4500),
  ]).then(() => wait(350));
}

async function preparePrintMap(map, points, routePoints, onReady) {
  if (!map) return null;
  const bounds = L.latLngBounds(points);
  if (routePoints?.length) bounds.extend(routePoints);
  map.invalidateSize(true);
  map.fitBounds(bounds, { padding: [90, 90], animate: false });
  await wait(150);
  map.invalidateSize(true);
  map.fitBounds(bounds, { padding: [90, 90], animate: false });
  await waitForMapTiles(map);
  map.eachLayer(layer => {
    if (typeof layer.redraw === 'function') layer.redraw();
  });
  const container = map.getContainer();
  const homePoint = map.latLngToContainerPoint(points[0]);
  const schoolPoint = map.latLngToContainerPoint(points[1]);
  const projectedRoute = (routePoints?.length ? routePoints : points).map(point => {
    const projected = map.latLngToContainerPoint(point);
    return { left: projected.x, top: projected.y };
  });
  const next = {
    home: { left: homePoint.x, top: homePoint.y },
    school: { left: schoolPoint.x, top: schoolPoint.y },
    route: projectedRoute,
    line: {
      left: homePoint.x,
      top: homePoint.y,
      width: Math.hypot(schoolPoint.x - homePoint.x, schoolPoint.y - homePoint.y),
      angle: Math.atan2(schoolPoint.y - homePoint.y, schoolPoint.x - homePoint.x) * 180 / Math.PI,
    },
    mapWidth: container.clientWidth,
    mapHeight: container.clientHeight,
  };
  onReady?.(next);
  await wait(250);
  return next;
}

function makePin(label) {
  return L.divIcon({
    className: 'map-pin-label',
    html: `<span class="map-pin-dot"></span><strong>${label}</strong>`,
    iconSize: [132, 78],
    iconAnchor: [28, 54],
  });
}

function AhasDura() {
  const mapEl = useRef(null);
  const printMapEl = useRef(null);
  const mapRef = useRef(null);
  const printMapRef = useRef(null);
  const layerRef = useRef(null);
  const printLayerRef = useRef(null);
  const pickRef = useRef('home');
  const printRef = useRef(null);
  const [pick, setPick] = useState('home');
  const [home, setHome] = useState(null);
  const [school, setSchool] = useState(null);
  const [form, setForm] = useState({ student: '', school: '', address: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [printOverlay, setPrintOverlay] = useState(null);
  const [mapProvider, setMapProvider] = useState('osm');
  const [googleRoute, setGoogleRoute] = useState(null);
  const [googleStatus, setGoogleStatus] = useState('');
  const [streetRoute, setStreetRoute] = useState(null);
  const [streetStatus, setStreetStatus] = useState('');

  useEffect(() => { pickRef.current = pick; }, [pick]);
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current).setView([7.8731, 80.7718], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, crossOrigin: true, attribution: '&copy; OpenStreetMap' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on('click', e => {
      const point = { lat: e.latlng.lat, lng: e.latlng.lng, label: 'Pinned location' };
      if (pickRef.current === 'home') setHome(point); else setSchool(point);
    });
    mapRef.current = map;
    return () => map.remove();
  }, []);
  useEffect(() => {
    if (!printMapEl.current || printMapRef.current) return;
    const map = L.map(printMapEl.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false }).setView([7.8731, 80.7718], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, crossOrigin: true }).addTo(map);
    printLayerRef.current = L.layerGroup().addTo(map);
    printMapRef.current = map;
    return () => map.remove();
  }, []);
  useEffect(() => {
    const layer = layerRef.current;
    const printLayer = printLayerRef.current;
    if (!layer || !printLayer) return;
    layer.clearLayers();
    printLayer.clearLayers();
    const pts = [];
    if (home) {
      pts.push([home.lat, home.lng]);
      L.marker([home.lat, home.lng], { icon: makePin('Home') }).addTo(layer);
    }
    if (school) {
      pts.push([school.lat, school.lng]);
      L.marker([school.lat, school.lng], { icon: makePin(form.school || 'School') }).addTo(layer);
    }
    if (pts.length === 2) {
      L.polyline(pts, { color: '#f6c21a', weight: 5, opacity: 0.95 }).addTo(layer);
      if (streetRoute?.points?.length) {
        L.polyline(streetRoute.points, { color: '#1d4ed8', weight: 5, opacity: 0.95 }).addTo(layer);
      }
      mapRef.current?.fitBounds(pts, { padding: [70, 70] });
      printMapRef.current?.fitBounds(pts, { padding: [90, 90] });
    } else {
      setPrintOverlay(null);
    }
  }, [home, school, form.school, streetRoute]);
  const distance = useMemo(() => {
    if (!home || !school) return 0;
    const rad = d => d * Math.PI / 180;
    const a = Math.sin(rad(school.lat - home.lat) / 2) ** 2 + Math.cos(rad(home.lat)) * Math.cos(rad(school.lat)) * Math.sin(rad(school.lng - home.lng) / 2) ** 2;
    return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [home, school]);
  useEffect(() => {
    let cancelled = false;
    setGoogleRoute(null);
    setGoogleStatus('');
    if (!home || !school || mapProvider !== 'google') return;
    const loadRoute = async () => {
      setGoogleStatus('Loading Google route...');
      const qs = new URLSearchParams({
        homeLat: String(home.lat),
        homeLng: String(home.lng),
        schoolLat: String(school.lat),
        schoolLng: String(school.lng),
      });
      try {
        const data = await fetch(`/api/google-route?${qs}`).then(r => r.ok ? r.json() : null);
        if (cancelled) return;
        if (data?.ok) {
          setGoogleRoute(data);
          setGoogleStatus('');
        } else {
          setGoogleStatus('Google Maps is not configured yet. Using OpenStreetMap PDF output.');
        }
      } catch {
        if (!cancelled) setGoogleStatus('Google Maps failed. Using OpenStreetMap PDF output.');
      }
    };
    loadRoute();
    return () => { cancelled = true; };
  }, [home, school, mapProvider]);
  useEffect(() => {
    let cancelled = false;
    setStreetRoute(null);
    setStreetStatus('');
    if (!home || !school) return;
    const loadRoute = async () => {
      setStreetStatus('Loading street route...');
      const url = `https://router.project-osrm.org/route/v1/driving/${home.lng},${home.lat};${school.lng},${school.lat}?overview=full&geometries=geojson`;
      try {
        const data = await fetch(url).then(r => r.ok ? r.json() : null);
        if (cancelled) return;
        const route = data?.routes?.[0];
        if (!route?.geometry?.coordinates?.length) {
          setStreetStatus('Street route not found. Showing sky distance only.');
          return;
        }
        const seconds = Number(route.duration || 0);
        const minutes = Math.max(1, Math.round(seconds / 60));
        const km = Number(route.distance || 0) / 1000;
        setStreetRoute({
          distanceKm: km,
          distanceText: `${km.toFixed(1)} km`,
          durationText: minutes >= 60 ? `${Math.floor(minutes / 60)} hr ${minutes % 60} min` : `${minutes} min`,
          points: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        });
        setStreetStatus('');
      } catch {
        if (!cancelled) setStreetStatus('Street route failed. Showing sky distance only.');
      }
    };
    loadRoute();
    return () => { cancelled = true; };
  }, [home, school]);
  const generate = async () => {
    if (!home || !school) return alert('Select home and school first.');
    setBusy(true);
    try {
      if (!googleRoute?.ok) {
        await preparePrintMap(printMapRef.current, [[home.lat, home.lng], [school.lat, school.lng]], streetRoute?.points, setPrintOverlay);
        await wait(100);
      }
      const name = `Ahas-Dura-${(form.student || 'Student').replace(/\W+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
      sendOrDownload(await exportPdf(printRef.current, name));
    } finally { setBusy(false); }
  };
  return (
    <Layout title="Ahas Dura" subtitle="Sky Distance proof with a printable map, straight-line route, and distance label.">
      <div className="workspace">
        <div className="card form">
          <div className="segmented">
            <button className={mapProvider === 'osm' ? 'active' : ''} onClick={() => setMapProvider('osm')}>Street Map</button>
            <button className={mapProvider === 'google' ? 'active' : ''} onClick={() => setMapProvider('google')}>Google Map</button>
          </div>
          {googleStatus && <div className="notice">{googleStatus}</div>}
          {streetStatus && <div className="notice">{streetStatus}</div>}
          <div className="segmented"><button className={pick === 'home' ? 'active' : ''} onClick={() => setPick('home')}>Pick Home</button><button className={pick === 'school' ? 'active' : ''} onClick={() => setPick('school')}>Pick School</button></div>
          <LocationSearch label="Home location" value={home} onSelect={setHome} />
          <LocationSearch label="School location" value={school} onSelect={setSchool} />
          <label>Student name<input value={form.student} onChange={e => setForm({ ...form, student: e.target.value })} /></label>
          <label>School name<input value={form.school} onChange={e => setForm({ ...form, school: e.target.value })} /></label>
          <label>Student home address<textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Student's full home address" /></label>
          <button className="primary" disabled={busy || !home || !school} onClick={generate}>{busy ? 'Generating...' : 'Add to SHANEX Print Queue'}</button>
        </div>
        <div className="card"><div className="map" ref={mapEl} /><div className="notice"><Ruler size={16} /> Sky distance: {distance.toFixed(2)} km{streetRoute ? ` | Street: ${streetRoute.distanceText}, ${streetRoute.durationText}` : ''}{googleRoute?.ok ? ` | Google: ${googleRoute.distanceText}, ${googleRoute.durationText}` : ''}</div></div>
      </div>
      <div className="print-stage">
        <div className="print-sheet sky-distance-sheet" ref={printRef}>
          {googleRoute?.ok ? (
            <div className="google-map-sheet">
              <div className="google-route-meta">Two-wheeler&nbsp;&nbsp; {googleRoute.distanceText}&nbsp;&nbsp; {googleRoute.durationText}</div>
              <div className="google-title">
                {home.lat.toFixed(7)}, {home.lng.toFixed(7)} to<br />
                {form.school || school?.label || 'School'}
              </div>
              <img className="google-static-map" alt="Google route map" src={googleRoute.mapUrl} />
              <div className="google-map-credit">Imagery and map data by Google</div>
              <div className="google-measure-box">
                <span>Measure distance</span>
                <strong>Total distance: {distance.toFixed(2)} km ({(distance * 0.621371).toFixed(2)} mi)</strong>
              </div>
              <div className="sky-details google-details">
                <InfoTable rows={[['Student', form.student || '-'], ['School', form.school || school?.label || '-'], ['Home Address', form.address || home?.label || '-'], ['Sky Distance', `${distance.toFixed(2)} km`], ['Road Route', `${googleRoute.distanceText} | ${googleRoute.durationText}`], ['Generated Date', new Date().toLocaleDateString('en-LK')]]} />
              </div>
            </div>
          ) : (
            <>
          <div className="sky-title">Sky Distance : {form.school || 'School'} - Home</div>
          <div className="paper-map-wrap">
            <div className="paper-map" ref={printMapEl} />
            {printOverlay && (
              <div className="paper-route-layer">
                {streetRoute?.points?.length ? (
                  <svg className="paper-road-route" viewBox={`0 0 ${printOverlay.mapWidth} ${printOverlay.mapHeight}`} preserveAspectRatio="none">
                    <polyline points={printOverlay.route.map(point => `${point.left},${point.top}`).join(' ')} />
                  </svg>
                ) : (
                  <div
                    className="paper-route-line"
                    style={{
                      left: printOverlay.line.left,
                      top: printOverlay.line.top,
                      width: printOverlay.line.width,
                      transform: `rotate(${printOverlay.line.angle}deg)`,
                    }}
                  />
                )}
                <div className="paper-route-pin paper-route-pin-home" style={{ left: printOverlay.home.left, top: printOverlay.home.top }}>
                  <span />
                  <strong>Home</strong>
                </div>
                <div className="paper-route-pin paper-route-pin-school" style={{ left: printOverlay.school.left, top: printOverlay.school.top }}>
                  <span />
                  <strong>{form.school || 'School'}</strong>
                </div>
              </div>
            )}
            <div className="distance-label">{distance.toFixed(2)} km</div>
          </div>
          <div className="sky-details">
            <InfoTable rows={[['Student', form.student || '-'], ['School', form.school || school?.label || '-'], ['Home Address', form.address || home?.label || '-'], ['Sky Distance', `${distance.toFixed(2)} km`], ['Street Route', streetRoute ? `${streetRoute.distanceText} | ${streetRoute.durationText}` : '-'], ['Generated Date', new Date().toLocaleDateString('en-LK')]]} />
          </div>
            </>
          )}
          <Footer />
        </div>
      </div>
    </Layout>
  );
}

function SheetHeader({ title, subtitle }) {
  return <div className="sheet-head"><Logo /><div><h2>{title}</h2><p>{subtitle}</p></div></div>;
}

function InfoTable({ rows }) {
  return <table className="info-table"><tbody>{rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>;
}

function Footer() {
  return <div className="sheet-footer">Generated by SHANEX Online Tools</div>;
}

const MM_TO_PT = 72 / 25.4;
const paperSizes = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  '12x18': { w: 305, h: 457 },
  '13x19': { w: 330, h: 483 },
};

function pt(mm) {
  return Number(mm) * MM_TO_PT;
}

function safeSlug(value, fallback = 'file') {
  return String(value || fallback).replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

async function readPdfUpload(file) {
  if (!file) return null;
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const firstPage = pdf.getPage(0);
  const size = firstPage.getSize();
  return { name: file.name, bytes, pageCount: pdf.getPageCount(), widthPt: size.width, heightPt: size.height };
}

async function pdfBytesToToolFile(bytes, fileName) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const dataUrl = await new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
  return { dataUrl, fileName, mime: 'application/pdf' };
}

function drawCropMarks(page, x, y, w, h, mark = pt(4), gap = pt(1.5)) {
  const color = rgb(0.02, 0.04, 0.08);
  const thickness = 0.55;
  const lines = [
    [[x - gap - mark, y], [x - gap, y]], [[x, y - gap - mark], [x, y - gap]],
    [[x + w + gap, y], [x + w + gap + mark, y]], [[x + w, y - gap - mark], [x + w, y - gap]],
    [[x - gap - mark, y + h], [x - gap, y + h]], [[x, y + h + gap], [x, y + h + gap + mark]],
    [[x + w + gap, y + h], [x + w + gap + mark, y + h]], [[x + w, y + h + gap], [x + w, y + h + gap + mark]],
  ];
  for (const [[x1, y1], [x2, y2]] of lines) {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
  }
}

function fitInside(sourceW, sourceH, boxW, boxH) {
  const scale = Math.min(boxW / sourceW, boxH / sourceH);
  const w = sourceW * scale;
  const h = sourceH * scale;
  return { w, h, x: (boxW - w) / 2, y: (boxH - h) / 2 };
}

function layoutForUp(up) {
  if (Number(up) === 2) return { cols: 1, rows: 2 };
  if (Number(up) === 6) return { cols: 2, rows: 3 };
  if (Number(up) === 8) return { cols: 2, rows: 4 };
  return { cols: 2, rows: 2 };
}

function BusinessCardPlanner() {
  const printRef = useRef(null);
  const [cfg, setCfg] = useState({ cardW: 90, cardH: 54, paper: 'A4', gap: 4, bleed: 2, margin: 8 });
  const [upload, setUpload] = useState(null);
  const [busy, setBusy] = useState(false);
  const paper = paperSizes[cfg.paper] || paperSizes.A4;
  const cols = Math.max(1, Math.floor((paper.w - (Number(cfg.margin) * 2) + Number(cfg.gap)) / (Number(cfg.cardW) + Number(cfg.gap))));
  const rows = Math.max(1, Math.floor((paper.h - (Number(cfg.margin) * 2) + Number(cfg.gap)) / (Number(cfg.cardH) + Number(cfg.gap))));
  const generate = async () => {
    if (!upload) return alert('Upload the card design PDF first.');
    setBusy(true);
    try {
      const srcDoc = await PDFDocument.load(upload.bytes, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      const embedded = await out.embedPage(srcDoc.getPage(0));
      const pageW = pt(paper.w);
      const pageH = pt(paper.h);
      const cardW = pt(cfg.cardW);
      const cardH = pt(cfg.cardH);
      const gap = pt(cfg.gap);
      const bleed = pt(cfg.bleed);
      const totalW = cols * cardW + (cols - 1) * gap;
      const totalH = rows * cardH + (rows - 1) * gap;
      const startX = (pageW - totalW) / 2;
      const startY = (pageH - totalH) / 2;
      const page = out.addPage([pageW, pageH]);
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = startX + col * (cardW + gap);
          const y = pageH - startY - (row + 1) * cardH - row * gap;
          page.drawPage(embedded, { x: x - bleed, y: y - bleed, width: cardW + bleed * 2, height: cardH + bleed * 2 });
          drawCropMarks(page, x, y, cardW, cardH);
        }
      }
      const fileName = `Business-Cards-${safeSlug(upload.name.replace(/\.pdf$/i, ''))}-${cfg.paper}-${cols * rows}up.pdf`;
      sendOrDownload(await pdfBytesToToolFile(await out.save(), fileName));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Layout title="Business Card Planner" subtitle="Create card sheets with crop marks.">
      <div className="workspace">
        <div className="card form">
          <label>Card design PDF<input type="file" accept="application/pdf,.pdf" onChange={async e => setUpload(await readPdfUpload(e.target.files?.[0]))} /></label>
          {upload && <div className="notice">{upload.name} | {upload.pageCount} page(s)</div>}
          {['cardW', 'cardH', 'gap', 'bleed', 'margin'].map(k => <label key={k}>{k}<input type="number" value={cfg[k]} onChange={e => setCfg({ ...cfg, [k]: Number(e.target.value) })} /></label>)}
          <label>Paper<select value={cfg.paper} onChange={e => setCfg({ ...cfg, paper: e.target.value })}><option>A4</option><option>A3</option><option>12x18</option><option>13x19</option></select></label>
          <div className="notice">{cols} x {rows} = {cols * rows} cards per sheet</div>
          <button className="primary" disabled={busy || !upload} onClick={generate}>{busy ? 'Generating...' : 'Generate Print PDF'}</button>
        </div>
        <div className="card preview"><div className="print-sheet cards" ref={printRef}><div className="card-plan" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>{Array.from({ length: cols * rows }, (_, i) => <div className="planned-card" key={i}>{upload ? upload.name : `Card ${i + 1}`}</div>)}</div></div></div>
      </div>
    </Layout>
  );
}

function BillNumbering() {
  const printRef = useRef(null);
  const [cfg, setCfg] = useState({ start: 1, quantity: 100, up: 4, pad: 0, prefix: '', suffix: '', paper: 'A4', pos: 'top-right', fontSize: 18 });
  const [upload, setUpload] = useState(null);
  const [busy, setBusy] = useState(false);
  const total = Math.max(1, Number(cfg.quantity) || 1);
  const up = Math.max(1, Number(cfg.up) || 1);
  const stack = Math.ceil(total / up);
  const sheets = Array.from({ length: stack }, (_, sheet) => Array.from({ length: up }, (_, pos) => Number(cfg.start) + sheet + pos * stack).filter(n => n < Number(cfg.start) + total));
  const fmt = n => `${cfg.prefix}${String(n).padStart(Number(cfg.pad) || 0, '0')}${cfg.suffix}`;
  const generate = async () => {
    setBusy(true);
    try {
      const paper = paperSizes[cfg.paper] || paperSizes.A4;
      const pageW = pt(paper.w);
      const pageH = pt(paper.h);
      const out = await PDFDocument.create();
      const font = await out.embedFont(StandardFonts.HelveticaBold);
      let embedded = null;
      let sourceSize = null;
      if (upload) {
        const srcDoc = await PDFDocument.load(upload.bytes, { ignoreEncryption: true });
        const srcPage = srcDoc.getPage(0);
        embedded = await out.embedPage(srcPage);
        sourceSize = srcPage.getSize();
      }
      const layout = layoutForUp(up);
      const margin = pt(8);
      const gap = pt(4);
      const cellW = (pageW - margin * 2 - (layout.cols - 1) * gap) / layout.cols;
      const cellH = (pageH - margin * 2 - (layout.rows - 1) * gap) / layout.rows;
      const fontSize = Number(cfg.fontSize) || 18;
      for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex += 1) {
        const page = out.addPage([pageW, pageH]);
        for (let pos = 0; pos < up; pos += 1) {
          const n = sheets[sheetIndex][pos];
          if (!n) continue;
          const col = pos % layout.cols;
          const row = Math.floor(pos / layout.cols);
          const x = margin + col * (cellW + gap);
          const y = pageH - margin - (row + 1) * cellH - row * gap;
          let numberBox = { x, y, w: cellW, h: cellH };
          if (embedded && sourceSize) {
            const fit = fitInside(sourceSize.width, sourceSize.height, cellW, cellH);
            page.drawPage(embedded, { x: x + fit.x, y: y + fit.y, width: fit.w, height: fit.h });
            numberBox = { x: x + fit.x, y: y + fit.y, w: fit.w, h: fit.h };
          } else {
            page.drawRectangle({ x, y, width: cellW, height: cellH, borderColor: rgb(0.75, 0.82, 0.9), borderWidth: 1 });
          }
          drawCropMarks(page, x, y, cellW, cellH, pt(3), pt(1));
          const text = fmt(n);
          const textW = font.widthOfTextAtSize(text, fontSize);
          const pad = pt(6);
          const positions = {
            'top-left': { tx: numberBox.x + pad, ty: numberBox.y + numberBox.h - pad - fontSize },
            'top-right': { tx: numberBox.x + numberBox.w - pad - textW, ty: numberBox.y + numberBox.h - pad - fontSize },
            'bottom-left': { tx: numberBox.x + pad, ty: numberBox.y + pad },
            'bottom-right': { tx: numberBox.x + numberBox.w - pad - textW, ty: numberBox.y + pad },
            center: { tx: numberBox.x + (numberBox.w - textW) / 2, ty: numberBox.y + (numberBox.h - fontSize) / 2 },
          };
          const p = positions[cfg.pos] || positions['top-right'];
          page.drawText(text, { x: p.tx, y: p.ty, size: fontSize, font, color: rgb(0.02, 0.04, 0.08) });
        }
      }
      const fileName = `Bill-Book-${cfg.start}-${total}-${up}up-${safeSlug(upload?.name?.replace(/\.pdf$/i, '') || 'numbering')}.pdf`;
      sendOrDownload(await pdfBytesToToolFile(await out.save(), fileName));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Layout title="Bill Book Numbering" subtitle="Stack numbering for easy cutting.">
      <div className="workspace">
        <div className="card form">
          <label>Bill design PDF<input type="file" accept="application/pdf,.pdf" onChange={async e => setUpload(await readPdfUpload(e.target.files?.[0]))} /></label>
          {upload && <div className="notice">{upload.name} | {upload.pageCount} page(s)</div>}
          <label>Start<input type="number" value={cfg.start} onChange={e => setCfg({ ...cfg, start: Number(e.target.value) })} /></label>
          <label>Quantity<input type="number" value={cfg.quantity} onChange={e => setCfg({ ...cfg, quantity: Number(e.target.value) })} /></label>
          <label>Layout<select value={cfg.up} onChange={e => setCfg({ ...cfg, up: Number(e.target.value) })}><option value="2">2-up</option><option value="4">4-up</option><option value="6">6-up</option><option value="8">8-up</option></select></label>
          <label>Paper<select value={cfg.paper} onChange={e => setCfg({ ...cfg, paper: e.target.value })}><option>A4</option><option>A3</option><option>12x18</option><option>13x19</option></select></label>
          <label>Number position<select value={cfg.pos} onChange={e => setCfg({ ...cfg, pos: e.target.value })}><option value="top-right">Top right</option><option value="top-left">Top left</option><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option><option value="center">Center</option></select></label>
          <label>Font size<input type="number" value={cfg.fontSize} onChange={e => setCfg({ ...cfg, fontSize: Number(e.target.value) })} /></label>
          <label>Padding<input type="number" value={cfg.pad} onChange={e => setCfg({ ...cfg, pad: Number(e.target.value) })} /></label>
          <label>Prefix<input value={cfg.prefix} onChange={e => setCfg({ ...cfg, prefix: e.target.value })} /></label>
          <label>Suffix<input value={cfg.suffix} onChange={e => setCfg({ ...cfg, suffix: e.target.value })} /></label>
          <div className="notice">Sheet 1: {sheets[0]?.map(fmt).join(', ')}</div>
          <button className="primary" disabled={busy} onClick={generate}>{busy ? 'Generating...' : 'Generate Numbered PDF'}</button>
        </div>
        <div className="card preview"><div className="print-sheet" ref={printRef}><SheetHeader title="Bill Book Numbering" subtitle={`${total} numbers | ${up}-up | stack ${stack}`} /><div className="number-grid">{sheets.slice(0, 24).map((sheet, i) => <div className="number-row" key={i}><small>Sheet {i + 1}</small><strong>{sheet.map(fmt).join('  |  ')}</strong></div>)}</div><Footer /></div></div>
      </div>
    </Layout>
  );
}

function App() {
  const pages = { '/': <ToolsHome />, '/desktop-login': <DesktopLogin />, '/tools': <ToolsHome />, '/tools/ahas-dura': <AhasDura />, '/tools/akas-dura': <AhasDura />, '/tools/business-card-planner': <BusinessCardPlanner />, '/tools/bill-numbering': <BillNumbering /> };
  return pages[route()] || <ToolsHome />;
}

createRoot(document.getElementById('root')).render(<App />);
