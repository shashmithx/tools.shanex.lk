import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowRight, Download, LogIn, MapPin, ReceiptText, Ruler, Scissors } from 'lucide-react';
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
    { path: '/tools/akas-dura', name: 'Akas Dura', icon: MapPin, text: 'Home-to-school distance proof for admissions.' },
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
  const [results, setResults] = useState([]);
  const search = async () => {
    if (!query.trim()) return;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=lk`;
    const data = await fetch(url).then(r => r.json());
    setResults(Array.isArray(data) ? data : []);
  };
  return (
    <div className="location-search">
      <label>{label}</label>
      <div className="inline"><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search(); } }} /><button onClick={search}>Search</button></div>
      {value && <small>{Number(value.lat).toFixed(6)}, {Number(value.lng).toFixed(6)}</small>}
      {!!results.length && <div className="results">{results.map(item => <button key={item.place_id} onClick={() => { onSelect({ lat: Number(item.lat), lng: Number(item.lon), label: item.display_name }); setResults([]); }}>{item.display_name}</button>)}</div>}
    </div>
  );
}

function AkasDura() {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const pickRef = useRef('home');
  const printRef = useRef(null);
  const [pick, setPick] = useState('home');
  const [home, setHome] = useState(null);
  const [school, setSchool] = useState(null);
  const [form, setForm] = useState({ student: '', school: '', address: '', note: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { pickRef.current = pick; }, [pick]);
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current).setView([7.8731, 80.7718], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on('click', e => {
      const point = { lat: e.latlng.lat, lng: e.latlng.lng, label: 'Pinned location' };
      if (pickRef.current === 'home') setHome(point); else setSchool(point);
    });
    mapRef.current = map;
    return () => map.remove();
  }, []);
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const pts = [];
    if (home) { pts.push([home.lat, home.lng]); L.circleMarker([home.lat, home.lng], { radius: 8, color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 1 }).addTo(layer).bindTooltip('Home'); }
    if (school) { pts.push([school.lat, school.lng]); L.circleMarker([school.lat, school.lng], { radius: 8, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }).addTo(layer).bindTooltip('School'); }
    if (pts.length === 2) { L.polyline(pts, { color: '#2563eb', weight: 4 }).addTo(layer); mapRef.current?.fitBounds(pts, { padding: [40, 40] }); }
  }, [home, school]);
  const distance = useMemo(() => {
    if (!home || !school) return 0;
    const rad = d => d * Math.PI / 180;
    const a = Math.sin(rad(school.lat - home.lat) / 2) ** 2 + Math.cos(rad(home.lat)) * Math.cos(rad(school.lat)) * Math.sin(rad(school.lng - home.lng) / 2) ** 2;
    return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [home, school]);
  const generate = async () => {
    if (!home || !school) return alert('Select home and school first.');
    setBusy(true);
    try {
      const name = `Akas-Dura-${(form.student || 'Student').replace(/\W+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
      sendOrDownload(await exportPdf(printRef.current, name));
    } finally { setBusy(false); }
  };
  return (
    <Layout title="Akas Dura" subtitle="Mark home and school locations and generate an A4 distance proof.">
      <div className="workspace">
        <div className="card form">
          <div className="segmented"><button className={pick === 'home' ? 'active' : ''} onClick={() => setPick('home')}>Pick Home</button><button className={pick === 'school' ? 'active' : ''} onClick={() => setPick('school')}>Pick School</button></div>
          <LocationSearch label="Home location" value={home} onSelect={setHome} />
          <LocationSearch label="School location" value={school} onSelect={setSchool} />
          <label>Student name<input value={form.student} onChange={e => setForm({ ...form, student: e.target.value })} /></label>
          <label>School name<input value={form.school} onChange={e => setForm({ ...form, school: e.target.value })} /></label>
          <label>Home address<textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
          <button className="primary" disabled={busy || !home || !school} onClick={generate}>{busy ? 'Generating...' : 'Add to SHANEX Print Queue'}</button>
        </div>
        <div className="card"><div className="map" ref={mapEl} /><div className="notice"><Ruler size={16} /> Straight distance: {distance.toFixed(2)} km</div></div>
      </div>
      <div className="print-stage"><div className="print-sheet" ref={printRef}><SheetHeader title="Akas Dura Distance Certificate" subtitle={new Date().toLocaleDateString('en-LK')} /><div className="map-art"><div className="map-grid" /><div className="route-line" /><div className="pin home">Home</div><div className="pin school">School</div><strong>{distance.toFixed(2)} km</strong></div><InfoTable rows={[['Student', form.student || '-'], ['School', form.school || '-'], ['Home Address', form.address || home?.label || '-'], ['Home Coordinates', home ? `${home.lat.toFixed(6)}, ${home.lng.toFixed(6)}` : '-'], ['School Coordinates', school ? `${school.lat.toFixed(6)}, ${school.lng.toFixed(6)}` : '-']]} /><Footer /></div></div>
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

function BusinessCardPlanner() {
  const printRef = useRef(null);
  const [cfg, setCfg] = useState({ cardW: 90, cardH: 54, paper: 'A4', gap: 4 });
  const paper = cfg.paper === 'A3' ? { w: 297, h: 420 } : cfg.paper === '13x19' ? { w: 330, h: 483 } : cfg.paper === '12x18' ? { w: 305, h: 457 } : { w: 210, h: 297 };
  const cols = Math.max(1, Math.floor((paper.w - 16 + Number(cfg.gap)) / (Number(cfg.cardW) + Number(cfg.gap))));
  const rows = Math.max(1, Math.floor((paper.h - 16 + Number(cfg.gap)) / (Number(cfg.cardH) + Number(cfg.gap))));
  const generate = async () => sendOrDownload(await exportPdf(printRef.current, `Business-Card-Cut-Marks-${cfg.paper}-${Date.now()}.pdf`));
  return (
    <Layout title="Business Card Planner" subtitle="Create card sheets with crop marks.">
      <div className="workspace"><div className="card form">{['cardW', 'cardH', 'gap'].map(k => <label key={k}>{k}<input type="number" value={cfg[k]} onChange={e => setCfg({ ...cfg, [k]: Number(e.target.value) })} /></label>)}<label>Paper<select value={cfg.paper} onChange={e => setCfg({ ...cfg, paper: e.target.value })}><option>A4</option><option>A3</option><option>12x18</option><option>13x19</option></select></label><div className="notice">{cols} x {rows} = {cols * rows} cards per sheet</div><button className="primary" onClick={generate}>Add to SHANEX Print Queue</button></div><div className="card preview"><div className="print-sheet cards" ref={printRef}><div className="card-plan" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>{Array.from({ length: cols * rows }, (_, i) => <div className="planned-card" key={i}>Card {i + 1}</div>)}</div></div></div></div>
    </Layout>
  );
}

function BillNumbering() {
  const printRef = useRef(null);
  const [cfg, setCfg] = useState({ start: 1, quantity: 100, up: 4, pad: 0, prefix: '', suffix: '' });
  const total = Math.max(1, Number(cfg.quantity) || 1);
  const up = Math.max(1, Number(cfg.up) || 1);
  const stack = Math.ceil(total / up);
  const sheets = Array.from({ length: stack }, (_, sheet) => Array.from({ length: up }, (_, pos) => Number(cfg.start) + sheet + pos * stack).filter(n => n < Number(cfg.start) + total));
  const fmt = n => `${cfg.prefix}${String(n).padStart(Number(cfg.pad) || 0, '0')}${cfg.suffix}`;
  const generate = async () => sendOrDownload(await exportPdf(printRef.current, `Bill-Book-Numbering-${cfg.start}-${total}-${up}up.pdf`));
  return (
    <Layout title="Bill Book Numbering" subtitle="Stack numbering for easy cutting.">
      <div className="workspace"><div className="card form"><label>Start<input type="number" value={cfg.start} onChange={e => setCfg({ ...cfg, start: Number(e.target.value) })} /></label><label>Quantity<input type="number" value={cfg.quantity} onChange={e => setCfg({ ...cfg, quantity: Number(e.target.value) })} /></label><label>Layout<select value={cfg.up} onChange={e => setCfg({ ...cfg, up: Number(e.target.value) })}><option value="2">2-up</option><option value="4">4-up</option><option value="6">6-up</option><option value="8">8-up</option></select></label><label>Padding<input type="number" value={cfg.pad} onChange={e => setCfg({ ...cfg, pad: Number(e.target.value) })} /></label><label>Prefix<input value={cfg.prefix} onChange={e => setCfg({ ...cfg, prefix: e.target.value })} /></label><label>Suffix<input value={cfg.suffix} onChange={e => setCfg({ ...cfg, suffix: e.target.value })} /></label><div className="notice">Sheet 1: {sheets[0]?.map(fmt).join(', ')}</div><button className="primary" onClick={generate}>Add to SHANEX Print Queue</button></div><div className="card preview"><div className="print-sheet" ref={printRef}><SheetHeader title="Bill Book Numbering" subtitle={`${total} numbers | ${up}-up | stack ${stack}`} /><div className="number-grid">{sheets.slice(0, 24).map((sheet, i) => <div className="number-row" key={i}><small>Sheet {i + 1}</small><strong>{sheet.map(fmt).join('  |  ')}</strong></div>)}</div><Footer /></div></div></div>
    </Layout>
  );
}

function App() {
  const pages = { '/': <ToolsHome />, '/desktop-login': <DesktopLogin />, '/tools': <ToolsHome />, '/tools/akas-dura': <AkasDura />, '/tools/business-card-planner': <BusinessCardPlanner />, '/tools/bill-numbering': <BillNumbering /> };
  return pages[route()] || <ToolsHome />;
}

createRoot(document.getElementById('root')).render(<App />);
