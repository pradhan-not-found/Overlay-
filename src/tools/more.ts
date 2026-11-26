// Weather, Clocks, Calc, Shelf, Colour and Launcher.

type Invoke = (ch: string, ...a: any[]) => Promise<any>;
type Send = (ch: string, ...a: any[]) => void;

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const stroke = (d: string, size = 16, sw = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const getJSON = async <T,>(invoke: Invoke, key: string, fallback: T): Promise<T> => {
  try { const v = await invoke('get-setting', key, ''); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
};

// ── Weather icons (drawn to match the outline set) ──────────────────────────
const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2.75v1.5M12 19.75v1.5M4.75 12h-1.5M20.75 12h-1.5M6.9 6.9 5.8 5.8M18.2 18.2l-1.1-1.1M6.9 17.1l-1.1 1.1M18.2 5.8l-1.1 1.1"/>';
const MOON = '<path d="M19.5 14.6A7.75 7.75 0 0 1 9.4 4.5a7.75 7.75 0 1 0 10.1 10.1Z"/>';
const CLOUD = '<path d="M7.25 18.5h10a4 4 0 0 0 .5-7.97 5.75 5.75 0 0 0-11.1 1.55A3.25 3.25 0 0 0 7.25 18.5Z"/>';
const PARTLY = '<path d="M9 5.25V4M4.6 7.1l-.9-.9M3.25 11.5H2M13.4 7.1l.9-.9"/><path d="M5.3 13.7a4 4 0 1 1 7.1-3.6"/><path d="M9.25 19.5h8.5a3.5 3.5 0 0 0 .4-6.98 5 5 0 0 0-9.6 1.35A2.85 2.85 0 0 0 9.25 19.5Z"/>';
const RAIN = '<path d="M7.25 14.5h10a4 4 0 0 0 .5-7.97 5.75 5.75 0 0 0-11.1 1.55A3.25 3.25 0 0 0 7.25 14.5Z"/><path d="m8.5 17.5-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>';
const SNOW = '<path d="M7.25 14.5h10a4 4 0 0 0 .5-7.97 5.75 5.75 0 0 0-11.1 1.55A3.25 3.25 0 0 0 7.25 14.5Z"/><path d="M8 18.25h.01M12 19.75h.01M16 18.25h.01M10 21.25h.01M14 21.25h.01" stroke-width="2.4"/>';
const STORM = '<path d="M7.25 14.5h10a4 4 0 0 0 .5-7.97 5.75 5.75 0 0 0-11.1 1.55A3.25 3.25 0 0 0 7.25 14.5Z"/><path d="m12.75 15.5-2.25 3.25h3l-2.25 3.25"/>';
const FOG = '<path d="M7.25 12.5h10a4 4 0 0 0 .5-7.97 5.75 5.75 0 0 0-11.1 1.55A3.25 3.25 0 0 0 7.25 12.5Z"/><path d="M4 16h16M6 19.5h12"/>';

function weatherIcon(code: number, day = true): string {
  if (code === 0) return day ? SUN : MOON;
  if (code <= 2) return PARTLY;
  if (code === 3) return CLOUD;
  if (code === 45 || code === 48) return FOG;
  if (code >= 95) return STORM;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return SNOW;
  if (code >= 51) return RAIN;
  return CLOUD;
}
function weatherText(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Cloudy';
}

// ── Safe calculator (no eval) ───────────────────────────────────────────────
function calculate(expr: string): number | null {
  const src = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '').replace(/\s+/g, '');
  if (!src) return null;
  let i = 0;
  const FN: Record<string, (x: number) => number> = {
    sqrt: Math.sqrt, sin: (x) => Math.sin((x * Math.PI) / 180), cos: (x) => Math.cos((x * Math.PI) / 180),
    tan: (x) => Math.tan((x * Math.PI) / 180), log: Math.log10, ln: Math.log, abs: Math.abs,
  };
  const peek = () => src[i];
  function number(): number {
    const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
    if (m) { i += m[0].length; return parseFloat(m[0]); }
    const w = /^[a-z]+/i.exec(src.slice(i));
    if (w) {
      i += w[0].length;
      const name = w[0].toLowerCase();
      if (name === 'pi') return Math.PI;
      if (name === 'e') return Math.E;
      if (FN[name] && peek() === '(') { i++; const v = expression(); if (src[i++] !== ')') throw new Error('paren'); return FN[name](v); }
      throw new Error('name');
    }
    if (peek() === '(') { i++; const v = expression(); if (src[i++] !== ')') throw new Error('paren'); return v; }
    throw new Error('token');
  }
  function unary(): number {
    if (peek() === '-') { i++; return -unary(); }
    if (peek() === '+') { i++; return unary(); }
    let v = number();
    while (peek() === '%') { i++; v /= 100; }
    return v;
  }
  function power(): number { const b = unary(); if (peek() === '^') { i++; return Math.pow(b, power()); } return b; }
  function term(): number {
    let v = power();
    while (peek() === '*' || peek() === '/') { const op = src[i++]; const r = power(); v = op === '*' ? v * r : v / r; }
    return v;
  }
  function expression(): number {
    let v = term();
    while (peek() === '+' || peek() === '-') { const op = src[i++]; const r = term(); v = op === '+' ? v + r : v - r; }
    return v;
  }
  try { const v = expression(); return i === src.length && Number.isFinite(v) ? v : null; } catch { return null; }
}
const fmtNum = (v: number) => (Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-6 && v !== 0) ? v.toExponential(6) : Number(v.toPrecision(12)).toLocaleString(undefined, { maximumFractionDigits: 10 }));

const UNITS: Record<string, Record<string, number>> = {
  Length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
  Weight: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.0283495, lb: 0.453592 },
  Data: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 },
  Time: { s: 1, min: 60, h: 3600, day: 86400, week: 604800 },
  Speed: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, kn: 0.514444 },
  Temperature: { '°C': 1, '°F': 1, K: 1 },
};
function convert(cat: string, v: number, from: string, to: string): number {
  if (cat === 'Temperature') {
    const c = from === '°C' ? v : from === '°F' ? (v - 32) * (5 / 9) : v - 273.15;
    return to === '°C' ? c : to === '°F' ? c * (9 / 5) + 32 : c + 273.15;
  }
  return (v * UNITS[cat][from]) / UNITS[cat][to];
}

const ZONES = [
  ['London', 'Europe/London'], ['Paris', 'Europe/Paris'], ['Berlin', 'Europe/Berlin'], ['Dubai', 'Asia/Dubai'],
  ['Kolkata', 'Asia/Kolkata'], ['Singapore', 'Asia/Singapore'], ['Tokyo', 'Asia/Tokyo'], ['Sydney', 'Australia/Sydney'],
  ['New York', 'America/New_York'], ['Chicago', 'America/Chicago'], ['Denver', 'America/Denver'], ['San Francisco', 'America/Los_Angeles'],
  ['São Paulo', 'America/Sao_Paulo'], ['Toronto', 'America/Toronto'], ['Moscow', 'Europe/Moscow'], ['Shanghai', 'Asia/Shanghai'],
  ['Seoul', 'Asia/Seoul'], ['Auckland', 'Pacific/Auckland'], ['Johannesburg', 'Africa/Johannesburg'], ['UTC', 'UTC'],
];

function analog(tz: string, size = 40): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  const day = h >= 7 && h < 19;
  const ha = ((h % 12) + m / 60) * 30; const ma = m * 6;
  const c = size / 2;
  const hand = (a: number, len: number, w: number, col: string) => {
    const r = (a - 90) * (Math.PI / 180);
    return `<line x1="${c}" y1="${c}" x2="${c + Math.cos(r) * len}" y2="${c + Math.sin(r) * len}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
  };
  const ticks = Array.from({ length: 12 }, (_, k) => { const r = (k * 30 - 90) * (Math.PI / 180); return `<circle cx="${c + Math.cos(r) * (c - 4)}" cy="${c + Math.sin(r) * (c - 4)}" r="${k % 3 ? 0.6 : 1}" fill="${day ? '#000' : '#fff'}" opacity="${k % 3 ? 0.35 : 0.7}"/>`; }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${c - 0.5}" fill="${day ? '#f2f2f5' : '#1c1c21'}" stroke="rgba(255,255,255,0.08)"/>${ticks}${hand(ha, c * 0.5, 2, day ? '#000' : '#fff')}${hand(ma, c * 0.72, 1.4, day ? '#000' : '#fff')}<circle cx="${c}" cy="${c}" r="1.6" fill="#ff9f43"/></svg>`;
}

export function mountMoreTools(opts: { invoke: Invoke; send: Send }) {
  const { invoke, send } = opts;
  const $ = (sel: string) => document.querySelector<HTMLElement>(sel)!;
  const electron = (window as any).require ? (window as any).require('electron') : null;

  // ── Weather ─────────────────────────────────────────────────────────────
  const wEl = $('[data-space="weather"]');
  type Place = { name: string; country?: string; lat: number; lon: number };
  let place: Place | null = null;
  let wx: any = null;
  let wxAt = 0;
  let searching = false;
  let results: Place[] = [];
  function renderWeather() {
    if (!place || searching) {
      wEl.innerHTML = `
        <form class="tool-search" data-w-form>${stroke('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>', 15)}
          <input data-w-input placeholder="${place ? 'Search another city' : 'Type your city to see the weather'}" maxlength="80"/></form>
        <div class="w-results">${results.map((r, k) => `<button class="list-row" data-w-pick="${k}"><b>${esc(r.name)}</b><span>${esc(r.country || '')}</span></button>`).join('')}</div>
        <p class="tool-empty">Forecasts come from Open-Meteo. Only the city's coordinates are sent.</p>`;
      return;
    }
    if (!wx) { wEl.innerHTML = '<p class="tool-empty">Loading the forecast…</p>'; return; }
    const cur = wx.current; const d = wx.daily;
    wEl.innerHTML = `
      <div class="w-now">
        <div class="w-icon">${stroke(weatherIcon(cur.weather_code, cur.is_day === 1), 54, 1.4)}</div>
        <div class="w-main"><span class="w-temp">${Math.round(cur.temperature_2m)}°</span><span class="w-desc">${weatherText(cur.weather_code)}</span></div>
        <div class="w-side">
          <button class="w-place" data-w-change title="Change city">${stroke('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.25"/>', 13)}${esc(place.name)}</button>
          <span>Feels ${Math.round(cur.apparent_temperature)}° · H ${Math.round(d.temperature_2m_max[0])}° L ${Math.round(d.temperature_2m_min[0])}°</span>
          <span>Wind ${Math.round(cur.wind_speed_10m)} km/h · Humidity ${cur.relative_humidity_2m}%</span>
        </div>
      </div>
      <div class="w-days">${d.time.slice(0, 5).map((t: string, k: number) => `
        <div class="w-day"><span>${k === 0 ? 'Today' : new Date(`${t}T12:00`).toLocaleDateString([], { weekday: 'short' })}</span>
          ${stroke(weatherIcon(d.weather_code[k]), 20, 1.6)}<b>${Math.round(d.temperature_2m_max[k])}°</b><small>${Math.round(d.temperature_2m_min[k])}°</small></div>`).join('')}</div>`;
  }
  async function loadWeather(force = false) {
    if (!place || (!force && wx && Date.now() - wxAt < 15 * 60_000)) { renderWeather(); return; }
    const q = new URLSearchParams({
      latitude: String(place.lat), longitude: String(place.lon), timezone: 'auto', forecast_days: '5',
      current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    });
    try { wx = await (await fetch(`https://api.open-meteo.com/v1/forecast?${q}`)).json(); wxAt = Date.now(); } catch { wx = null; }
    renderWeather();
  }
  wEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = wEl.querySelector<HTMLInputElement>('[data-w-input]')!.value.trim();
    if (!name) return;
    try {
      const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name, count: '5' })}`)).json();
      results = (r.results || []).map((x: any) => ({ name: x.name, country: [x.admin1, x.country].filter(Boolean).join(', '), lat: x.latitude, lon: x.longitude }));
    } catch { results = []; }
    renderWeather();
  });
  wEl.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    e.stopPropagation();
    const pick = t.closest<HTMLElement>('[data-w-pick]');
    if (pick) { place = results[Number(pick.dataset.wPick)]; results = []; searching = false; wx = null; send('set-setting', 'weatherPlace', JSON.stringify(place)); void loadWeather(true); }
    if (t.closest('[data-w-change]')) { searching = true; renderWeather(); wEl.querySelector<HTMLInputElement>('[data-w-input]')?.focus(); }
  });
  void getJSON<Place | null>(invoke, 'weatherPlace', null).then((p) => { place = p; renderWeather(); });

  // ── Clocks ──────────────────────────────────────────────────────────────
  const cEl = $('[data-space="clocks"]');
  let zones: string[] = [];
  function renderClocks() {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const all = [local, ...zones.filter((z) => z !== local)];
    const now = new Date();
    const offset = (tz: string) => {
      const a = new Date(now.toLocaleString('en-US', { timeZone: tz })).getTime();
      const b = new Date(now.toLocaleString('en-US', { timeZone: local })).getTime();
      const h = Math.round((a - b) / 360000) / 10;
      return h === 0 ? 'Same time' : `${h > 0 ? '+' : ''}${h} h`;
    };
    const label = (tz: string) => (ZONES.find((z) => z[1] === tz)?.[0]) || tz.split('/').pop()!.replace(/_/g, ' ');
    cEl.innerHTML = `
      <div class="clock-grid">${all.map((tz, k) => `
        <div class="clock-card">
          ${analog(tz)}
          <div class="clock-text"><b>${now.toLocaleTimeString([], { timeZone: tz, hour: 'numeric', minute: '2-digit' })}</b>
            <span>${k === 0 ? 'Local' : esc(label(tz))}</span><small>${k === 0 ? now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) : offset(tz)}</small></div>
          ${k ? `<button class="ibtn ibtn-sm clock-del" data-clock-del="${esc(tz)}" title="Remove">${stroke('<path d="M17 7 7 17M7 7l10 10"/>', 12)}</button>` : ''}
        </div>`).join('')}
        ${all.length < 6 ? `<label class="clock-card clock-add">${stroke('<path d="M12 5.5v13M5.5 12h13"/>', 16)}<span>Add a city</span>
          <select data-clock-add><option value="">Add a city</option>${ZONES.filter((z) => !all.includes(z[1])).map((z) => `<option value="${z[1]}">${z[0]}</option>`).join('')}</select></label>` : ''}
      </div>`;
  }
  cEl.addEventListener('change', (e) => {
    const sel = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-clock-add]');
    if (!sel || !sel.value) return;
    zones.push(sel.value); send('set-setting', 'clocks', JSON.stringify(zones)); renderClocks();
  });
  cEl.addEventListener('click', (e) => {
    const del = (e.target as HTMLElement).closest<HTMLElement>('[data-clock-del]');
    e.stopPropagation();
    if (!del) return;
    zones = zones.filter((z) => z !== del.dataset.clockDel); send('set-setting', 'clocks', JSON.stringify(zones)); renderClocks();
  });
  void getJSON<string[]>(invoke, 'clocks', ['Europe/London', 'America/New_York', 'Asia/Tokyo']).then((z) => { zones = z; renderClocks(); });

  // ── Calc ────────────────────────────────────────────────────────────────
  const kEl = $('[data-space="calc"]');
  let mode: 'calc' | 'convert' = 'calc';
  let calcHistory: { expr: string; result: string }[] = [];
  let cat = 'Length'; let from = 'km'; let to = 'mi'; let amount = '1';
  function renderCalc() {
    const tabs = `<div class="seg"><button class="${mode === 'calc' ? 'on' : ''}" data-mode="calc">Calculator</button><button class="${mode === 'convert' ? 'on' : ''}" data-mode="convert">Converter</button></div>`;
    if (mode === 'calc') {
      kEl.innerHTML = `${tabs}
        <div class="calc-box"><input class="calc-input" data-calc placeholder="12 × (3 + 4) ÷ 2, sqrt(81), 15%" spellcheck="false"/><span class="calc-result" data-calc-result></span></div>
        <div class="calc-history">${calcHistory.map((h) => `<button class="list-row" data-copy="${esc(h.result)}" title="Copy result"><span>${esc(h.expr)}</span><b>= ${esc(h.result)}</b></button>`).join('') || '<p class="tool-empty">Press Enter to keep a result here. Click one to copy it.</p>'}</div>`;
      return;
    }
    const units = Object.keys(UNITS[cat]);
    if (!units.includes(from)) from = units[0];
    if (!units.includes(to)) to = units[1];
    const v = parseFloat(amount);
    const out = Number.isFinite(v) ? fmtNum(convert(cat, v, from, to)) : '—';
    kEl.innerHTML = `${tabs}
      <div class="conv-cats">${Object.keys(UNITS).map((c) => `<button class="chip-btn${c === cat ? ' on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
      <div class="conv-row">
        <div class="conv-field"><input data-amount value="${esc(amount)}" inputmode="decimal"/><select data-from>${units.map((u) => `<option ${u === from ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
        <button class="ibtn conv-swap" data-swap title="Swap">${stroke('<path d="M7 4.5 3.5 8 7 11.5M3.5 8h13M17 12.5l3.5 3.5-3.5 3.5M20.5 16h-13"/>', 16)}</button>
        <div class="conv-field out"><span class="conv-out">${out}</span><select data-to>${units.map((u) => `<option ${u === to ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
      </div>`;
  }
  kEl.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.matches('[data-calc]')) {
      const r = calculate(t.value);
      kEl.querySelector('[data-calc-result]')!.textContent = r === null ? '' : `= ${fmtNum(r)}`;
    }
    if (t.matches('[data-amount]')) {
      amount = t.value;
      const v = parseFloat(amount);
      kEl.querySelector('.conv-out')!.textContent = Number.isFinite(v) ? fmtNum(convert(cat, v, from, to)) : '—';
    }
  });
  kEl.addEventListener('keydown', (e) => {
    const t = e.target as HTMLInputElement;
    if (e.key !== 'Enter' || !t.matches('[data-calc]')) return;
    const r = calculate(t.value);
    if (r === null) return;
    calcHistory.unshift({ expr: t.value, result: fmtNum(r) });
    calcHistory = calcHistory.slice(0, 6);
    renderCalc();
    kEl.querySelector<HTMLInputElement>('[data-calc]')!.focus();
  });
  kEl.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement;
    if (t.matches('[data-from]')) from = t.value;
    if (t.matches('[data-to]')) to = t.value;
    renderCalc();
  });
  kEl.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    e.stopPropagation();
    const m = t.closest<HTMLElement>('[data-mode]');
    if (m) { mode = m.dataset.mode as any; renderCalc(); setTimeout(() => kEl.querySelector<HTMLInputElement>('[data-calc],[data-amount]')?.focus(), 30); return; }
    const c = t.closest<HTMLElement>('[data-cat]');
    if (c) { cat = c.dataset.cat!; const u = Object.keys(UNITS[cat]); from = u[0]; to = u[1]; renderCalc(); return; }
    if (t.closest('[data-swap]')) { [from, to] = [to, from]; renderCalc(); return; }
    const copy = t.closest<HTMLElement>('[data-copy]');
    if (copy) void navigator.clipboard.writeText(copy.dataset.copy!.replace(/,/g, ''));
  });
  renderCalc();

  // ── Shelf ───────────────────────────────────────────────────────────────
  const sEl = $('[data-space="shelf"]');
  let shelf: string[] = [];
  const icons = new Map<string, string>();
  const saveShelf = () => send('set-setting', 'shelf', JSON.stringify(shelf));
  function renderShelf() {
    sEl.innerHTML = shelf.length ? `
      <div class="shelf-grid">${shelf.map((f) => {
        const name = f.split(/[\\/]/).pop() || f;
        return `<div class="shelf-item" draggable="true" data-file="${esc(f)}" title="${esc(f)}">
          <span class="shelf-icon">${icons.get(f) ? `<img src="${icons.get(f)}" width="32" height="32"/>` : stroke('<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8Z"/><path d="M14 3.5V8h4.5"/>', 28, 1.4)}</span>
          <span class="shelf-name">${esc(name)}</span>
          <span class="shelf-acts">
            <button class="ibtn ibtn-sm" data-reveal title="Show in folder">${stroke('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/>', 12)}</button>
            <button class="ibtn ibtn-sm" data-unshelf title="Remove">${stroke('<path d="M17 7 7 17M7 7l10 10"/>', 12)}</button>
          </span></div>`;
      }).join('')}</div>
      <div class="note-foot"><span class="cnt-muted">Drag a file out into any app, or click to open it.</span><button class="tool-link" data-shelf-clear>Clear shelf</button></div>`
      : `<div class="shelf-empty">${stroke('<path d="M4 13.5 6.5 6a2 2 0 0 1 1.9-1.4h7.2A2 2 0 0 1 17.5 6l2.5 7.5"/><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>', 30, 1.4)}
          <b>Drop files on the notch</b><span>They wait here until you drag them into another app.</span></div>`;
    shelf.filter((f) => !icons.has(f)).forEach((f) => {
      icons.set(f, '');
      void invoke('get-file-icon', f).then((d: string | null) => { if (d) { icons.set(f, d); renderShelf(); } });
    });
  }
  sEl.addEventListener('dragstart', (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>('[data-file]');
    if (!item) return;
    e.preventDefault();
    send('shelf:drag', item.dataset.file);
  });
  sEl.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    e.stopPropagation();
    const item = t.closest<HTMLElement>('[data-file]');
    if (t.closest('[data-shelf-clear]')) { shelf = []; saveShelf(); renderShelf(); return; }
    if (!item) return;
    const f = item.dataset.file!;
    if (t.closest('[data-unshelf]')) { shelf = shelf.filter((x) => x !== f); saveShelf(); renderShelf(); return; }
    if (t.closest('[data-reveal]')) { void invoke('reveal-path', f); return; }
    void invoke('open-path', f);
  });
  void getJSON<string[]>(invoke, 'shelf', []).then((s) => { shelf = s; renderShelf(); });

  // ── Colour ──────────────────────────────────────────────────────────────
  const oEl = $('[data-space="colour"]');
  let swatches: string[] = [];
  let current = '';
  let copiedFmt = '';
  const rgbOf = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hslOf = (hex: string) => {
    const [r, g, b] = rgbOf(hex).map((v) => v / 255);
    const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2;
    let h = 0; let s = 0;
    if (max !== min) {
      const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  };
  // Readable text on any colour.
  const lightText = (hex: string) => { const [r, g, b] = rgbOf(hex); return (r * 299 + g * 587 + b * 114) / 1000 < 150; };
  const DROP = stroke('<path d="m14.5 4.5 5 5M17 7l-9.5 9.5L5 19.5 4.5 19 7.5 16.5 17 7Z"/><path d="M16 3.5a2.1 2.1 0 0 1 3 0l1.5 1.5a2.1 2.1 0 0 1 0 3L19 9.5 14.5 5Z"/>', 16, 1.8);
  const COPY = stroke('<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>', 14, 1.8);
  const TICK = stroke('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 14, 2.2);
  function renderColour() {
    const formats: [string, string][] = current ? [['HEX', current.toUpperCase()], ['RGB', rgbOf(current).join(', ')], ['HSL', hslOf(current).replace(/^hsl\(|\)$/g, '')]] : [];
    const full = (k: string, v: string) => (k === 'RGB' ? `rgb(${v})` : k === 'HSL' ? `hsl(${v})` : v);
    oEl.innerHTML = `<div class="kit cl">
      <div class="cl-main">
        <button type="button" class="cl-swatch${current ? '' : ' empty'}" data-pick style="${current ? `--c:${current};color:${lightText(current) ? '#fff' : '#0d0f16'}` : ''}" title="Pick a colour from the screen">
          ${current ? `<b>${current.toUpperCase()}</b>` : `${DROP}<b>Pick from screen</b><small>Any pixel, any app</small>`}
        </button>
        <div class="cl-values">
          ${formats.length ? formats.map(([k, v]) => `<button type="button" class="cl-val${copiedFmt === full(k, v) ? ' done' : ''}" data-copy-col="${full(k, v)}"><span>${k}</span><code>${v}</code><i>${copiedFmt === full(k, v) ? TICK : COPY}</i></button>`).join('') : '<p class="kit-empty">Pick any pixel on your screen to get its colour as HEX, RGB and HSL.</p>'}
          <button type="button" class="cl-pick" data-pick>${DROP}<span>${current ? 'Pick another' : 'Pick a colour'}</span></button>
        </div>
      </div>
      ${swatches.length ? `<div class="cl-recent"><span>Recent</span><div>${swatches.map((c) => `<button type="button" class="cl-dot${c === current ? ' on' : ''}" data-swatch="${c}" style="--c:${c}" title="${c.toUpperCase()}"></button>`).join('')}</div></div>` : ''}
    </div>`;
  }
  oEl.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    e.stopPropagation();
    if (t.closest('[data-pick]')) {
      const ED = (window as any).EyeDropper;
      if (!ED) return;
      try {
        const res = await new ED().open();
        current = res.sRGBHex.length === 7 ? res.sRGBHex : current;
        swatches = [current, ...swatches.filter((c) => c !== current)].slice(0, 14);
        send('set-setting', 'swatches', JSON.stringify(swatches));
      } catch { /* cancelled */ }
      renderColour();
      return;
    }
    const sw = t.closest<HTMLElement>('[data-swatch]');
    if (sw) { current = sw.dataset.swatch!; renderColour(); return; }
    const cp = t.closest<HTMLElement>('[data-copy-col]');
    if (cp) { copiedFmt = cp.dataset.copyCol!; void navigator.clipboard.writeText(copiedFmt); renderColour(); setTimeout(() => { copiedFmt = ''; renderColour(); }, 1200); }
  });
  void getJSON<string[]>(invoke, 'swatches', []).then((s) => { swatches = s; current = s[0] || ''; renderColour(); });

  // ── Launcher ────────────────────────────────────────────────────────────
  const lEl = $('[data-space="launcher"]');
  let apps: { name: string; path: string }[] = [];
  let appsReady = false;
  let query = '';
  let sel = 0;
  const appIcons = new Map<string, string>();
  lEl.innerHTML = `<form class="tool-search" data-l-form>${stroke('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>', 15)}<input data-l-input placeholder="Search your apps" spellcheck="false"/><kbd>Enter</kbd></form><div class="l-list" data-l-list></div>`;
  const list = lEl.querySelector<HTMLElement>('[data-l-list]')!;
  const input = lEl.querySelector<HTMLInputElement>('[data-l-input]')!;
  function matches() {
    const q = query.trim().toLowerCase();
    if (!q) return apps.slice(0, 8);
    return apps
      .map((a) => { const n = a.name.toLowerCase(); const i = n.indexOf(q); const initials = n.split(/\s+/).map((w) => w[0]).join(''); return { a, score: n.startsWith(q) ? 0 : initials.startsWith(q) ? 1 : i >= 0 ? 2 + i / 100 : 9 }; })
      .filter((x) => x.score < 9).sort((x, y) => x.score - y.score || x.a.name.length - y.a.name.length).slice(0, 7).map((x) => x.a);
  }
  function renderList() {
    const found = matches();
    if (sel >= found.length) sel = 0;
    list.innerHTML = found.length ? found.map((a, k) => `
      <button class="l-row${k === sel ? ' on' : ''}" data-app="${k}">
        <span class="l-icon">${appIcons.get(a.path) ? `<img src="${appIcons.get(a.path)}" width="22" height="22"/>` : ''}</span>
        <b>${esc(a.name)}</b>${k === sel ? '<kbd>Enter</kbd>' : ''}</button>`).join('')
      : `<p class="tool-empty">${query.trim() ? 'No apps match.' : appsReady ? 'No apps in the Start menu.' : 'Reading your Start menu…'}</p>`;
    found.filter((a) => !appIcons.has(a.path)).forEach((a) => {
      appIcons.set(a.path, '');
      void invoke('get-file-icon', a.path).then((d: string | null) => { if (d) { appIcons.set(a.path, d); renderList(); } });
    });
  }
  const launch = (k: number) => { const a = matches()[k]; if (!a) return; void invoke('open-path', a.path); query = ''; input.value = ''; renderList(); };
  input.addEventListener('input', () => { query = input.value; sel = 0; renderList(); });
  input.addEventListener('keydown', (e) => {
    const n = matches().length;
    if (e.key === 'ArrowDown') { sel = Math.min(n - 1, sel + 1); renderList(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); renderList(); e.preventDefault(); }
  });
  lEl.addEventListener('submit', (e) => { e.preventDefault(); launch(sel); });
  list.addEventListener('click', (e) => { e.stopPropagation(); const row = (e.target as HTMLElement).closest<HTMLElement>('[data-app]'); if (row) launch(Number(row.dataset.app)); });

  return {
    onSpace(name: string) {
      if (name === 'weather') void loadWeather();
      if (name === 'clocks') renderClocks();
      if (name === 'launcher') {
        if (!apps.length) void invoke('apps:list').then((a: any) => { apps = a || []; appsReady = true; renderList(); });
        renderList();
        setTimeout(() => input.focus(), 250);
      }
      if (name === 'calc') setTimeout(() => kEl.querySelector<HTMLInputElement>('[data-calc],[data-amount]')?.focus(), 250);
    },
    tick() { if (document.querySelector('[data-space="clocks"].active')) renderClocks(); },
    addToShelf(files: string[]) {
      const fresh = files.filter((f) => f && !shelf.includes(f));
      if (!fresh.length) return;
      shelf = [...fresh, ...shelf].slice(0, 24);
      saveShelf();
      renderShelf();
    },
    pathFor(file: File): string {
      try { return electron?.webUtils?.getPathForFile(file) || ''; } catch { return ''; }
    },
  };
}
