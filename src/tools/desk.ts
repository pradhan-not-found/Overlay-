// Ask, watchlist, vault, notices, capture, recorder, camera, agents, screen time, wallpapers.

type Invoke = (ch: string, ...a: any[]) => Promise<any>;
type Send = (ch: string, ...a: any[]) => void;

const esc = (v: string) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const $ = (sel: string) => document.querySelector<HTMLElement>(sel);

import { aiMark } from '../assets/ai-logos';

const dsvg = (d: string, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const DI = {
  screen: dsvg('<rect x="3" y="4.5" width="18" height="12.5" rx="2.2"/><path d="M8.5 20h7M12 17v3"/>'),
  area: dsvg('<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/>'),
  window: dsvg('<rect x="3.5" y="5" width="17" height="14" rx="2.2"/><path d="M3.5 9h17M6.5 7h.01M9 7h.01"/>'),
  timer: dsvg('<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.2 1.4M9.5 2.8h5"/>'),
  mic: dsvg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>', 22),
  stop: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor"/></svg>',
  play: '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5Z" fill="currentColor"/></svg>',
  folder: dsvg('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/>', 14),
  x: dsvg('<path d="M7 7l10 10M17 7 7 17"/>', 13),
  plus: dsvg('<path d="M12 5v14M5 12h14"/>', 14),
};
const ago = (t: number) => { const s = (Date.now() - t) / 1000; return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} d ago`; };
const toB64 = (buf: ArrayBuffer) => { const bytes = new Uint8Array(buf); let out = ''; for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(out); };

export function mountDesk(opts: { invoke: Invoke; send: Send }) {
  const { invoke, send } = opts;
  const ask = $('[data-space="ask"]');
  const trade = $('[data-space="trading"]');
  const vault = $('[data-space="vault"]');
  const notices = $('[data-space="notices"]');
  const capture = $('[data-space="capture"]');
  const recorder = $('[data-space="recorder"]');
  const camera = $('[data-space="camera"]');
  const agents = $('[data-space="agents"]');
  const screen = $('[data-space="screentime"]');
  const walls = $('[data-space="wallpapers"]');
  if (!ask || !trade || !vault || !notices || !capture || !recorder || !camera || !agents || !screen || !walls) {
    return { onSpace(_name: string) {} };
  }

  const messages: { role: 'user' | 'assistant'; content: string }[] = [];
  let asking = false;
  const paintAsk = (ready: boolean) => {
    ask.innerHTML = `<div class="link-panel">
      <div class="desk-log" data-ask-log>${messages.map((m) => `<div class="desk-msg ${m.role}"><b>${m.role === 'user' ? 'You' : 'Answer'}</b><span>${esc(m.content)}</span></div>`).join('') || '<p class="link-lead">Ask uses the key you save here. Nothing is sent until you do.</p>'}</div>
      <form class="link-user" data-ask-form>
        <input data-ask placeholder="${ready ? 'Ask anything' : 'Paste an API key, then ask'}" spellcheck="false"/>
        <button class="btn btn-p" type="submit">${asking ? '…' : 'Send'}</button>
      </form>
      ${ready ? '' : `<form class="link-user" data-key-form><input data-key type="password" placeholder="API key" autocomplete="off"/><input data-base placeholder="https://api.openai.com/v1"/><button class="btn btn-g" type="submit">Save</button></form>`}
    </div>`;
  };

  let symbols: string[] = [];
  const paintTrade = (rows: { symbol: string; name: string; price: number; change: number }[], err = '') => {
    trade.innerHTML = `<div class="kit">
      <div class="kit-head"><span><b>${symbols.length}</b> ${symbols.length === 1 ? 'symbol' : 'symbols'}</span><span class="kit-sub">Public quotes, delayed</span></div>
      <div class="kit-list">${rows.map((r) => `<div class="kit-row q-row" data-sym="${esc(r.symbol)}">
          <span class="q-sym">${esc(r.symbol.slice(0, 5))}</span>
          <span class="kit-main"><b>${esc(r.name || r.symbol)}</b><small>${esc(r.symbol)}</small></span>
          <span class="q-price">${Number(r.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          <span class="q-chg ${r.change < 0 ? 'down' : 'up'}">${r.change >= 0 ? '+' : ''}${Number(r.change).toFixed(2)}%</span>
          <span class="kit-acts"><button type="button" data-unsym title="Remove">${DI.x}</button></span>
        </div>`).join('') || `<p class="kit-empty">${err || 'Add a ticker like AAPL, MSFT or BTC-USD.'}</p>`}</div>
      <form class="kit-add" data-tick><span>${DI.plus}</span><input data-symbol placeholder="Add a ticker" maxlength="12" spellcheck="false" autocomplete="off"/></form>
    </div>`;
  };

  let vaultRows: { id: string; name: string; user: string }[] = [];
  const paintVault = () => {
    vault.innerHTML = `<div class="link-panel">
      <div class="desk-list">${vaultRows.map((r) => `<div class="list-row" data-id="${esc(r.id)}"><span><b>${esc(r.name)}</b><small>${esc(r.user)}</small></span><span class="desk-acts"><button type="button" data-reveal>Show</button><button type="button" data-drop>Delete</button></span></div>`).join('') || '<p class="link-lead">Passwords stay on this PC, sealed with your Windows login.</p>'}</div>
      <form class="vault-form" data-vault>
        <input data-name placeholder="Name" maxlength="80"/>
        <input data-user placeholder="Username" maxlength="120"/>
        <input data-secret type="password" placeholder="Password" autocomplete="new-password"/>
        <button class="btn btn-p" type="submit">Save</button>
      </form>
    </div>`;
  };

  const paintCapture = (shots: { file: string; name: string; at: number; thumb: string }[] = [], note = '') => {
    capture.innerHTML = `<div class="kit">
      <div class="cap-modes">
        <button type="button" data-cap="screen">${DI.screen}<b>Full screen</b><small>Saved at once</small></button>
        <button type="button" data-cap="area">${DI.area}<b>Area</b><small>Draw a box</small></button>
        <button type="button" data-cap="window">${DI.window}<b>Window</b><small>Pick a window</small></button>
        <button type="button" data-cap="timer">${DI.timer}<b>In 3 s</b><small>Full screen</small></button>
      </div>
      <div class="kit-head"><span>Recent</span><button type="button" class="kit-link" data-cap-folder>${DI.folder}<span>Open folder</span></button></div>
      <div class="cap-shots">${shots.map((x) => `<button type="button" class="cap-shot" data-open="${esc(x.file)}" title="${esc(x.name)}"><img src="${x.thumb}" alt=""/><small>${ago(x.at)}</small></button>`).join('') || '<p class="kit-empty">Your screenshots show here.</p>'}</div>
      ${note ? `<p class="cap-note">${esc(note)}</p>` : ''}
    </div>`;
  };
  const loadCapture = (note = '') => invoke('desk:shots').then((rows) => paintCapture(rows || [], note)).catch(() => paintCapture([], note));
  paintCapture();

  let rec: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let recStart = 0;
  let recRaf = 0;
  let analyser: AnalyserNode | null = null;
  let audioCtx: AudioContext | null = null;
  const fmtT = (ms: number) => { const s2 = Math.floor(ms / 1000); return `${Math.floor(s2 / 60)}:${String(s2 % 60).padStart(2, '0')}`; };
  const paintRec = (state: 'idle' | 'live' | 'saving', recent: { file: string; name: string; at: number; size: number }[] = [], note = '') => {
    recorder.innerHTML = `<div class="kit rec ${state}">
      <div class="rec-stage">
        <canvas class="rec-wave" data-wave width="520" height="70"></canvas>
        <span class="rec-time" data-rec-time>${state === 'live' ? '0:00' : state === 'saving' ? 'Saving…' : 'Microphone'}</span>
      </div>
      <button type="button" class="rec-btn" data-mic aria-label="${state === 'live' ? 'Stop' : 'Record'}">${state === 'live' ? DI.stop : DI.mic}</button>
      ${state === 'idle' ? `<div class="kit-list rec-list">${recent.map((r) => `<div class="kit-row" data-open="${esc(r.file)}"><span class="kit-ico" style="--tint:#fb923c">${DI.play}</span><span class="kit-main"><b>${esc(new Date(r.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}</b><small>${Math.max(1, Math.round(r.size / 1024))} KB · ${ago(r.at)}</small></span></div>`).join('')}</div>` : ''}
      ${note ? `<p class="cap-note">${esc(note)}</p>` : ''}
    </div>`;
  };
  const loadRec = (note = '') => invoke('desk:recs').then((rows) => paintRec('idle', rows || [], note)).catch(() => paintRec('idle', [], note));
  const drawWave = () => {
    const c = recorder.querySelector<HTMLCanvasElement>('[data-wave]');
    const time = recorder.querySelector<HTMLElement>('[data-rec-time]');
    if (!c || !analyser) return;
    const g = c.getContext('2d')!;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    g.clearRect(0, 0, c.width, c.height);
    const bars = 48, w = c.width / bars;
    for (let b = 0; b < bars; b++) {
      let peak = 0;
      for (let k = 0; k < data.length / bars; k++) peak = Math.max(peak, Math.abs(data[Math.floor(b * data.length / bars + k)] - 128));
      const h = Math.max(3, (peak / 128) * c.height * 1.6);
      g.fillStyle = '#fb923c';
      g.beginPath(); g.roundRect(b * w + w * 0.25, (c.height - h) / 2, w * 0.5, Math.min(c.height, h), 2); g.fill();
    }
    if (time) time.textContent = fmtT(Date.now() - recStart);
    recRaf = requestAnimationFrame(drawWave);
  };
  paintRec('idle');

  camera.innerHTML = `<div class="cam">
    <div class="cam-stage">
      <video data-cam autoplay playsinline muted></video>
      <div class="cam-msg" data-cam-msg><span>Starting the camera…</span></div>
    </div>
    <div class="cam-tools">
      <span class="cam-live" data-cam-live></span>
      <select class="cam-pick" data-cam-pick hidden></select>
      <button class="cam-btn" type="button" data-flip title="Mirror">${CAM_ICON.flip}</button>
    </div>
  </div>`;

  let camStream: MediaStream | null = null;
  let camWanted = false;
  let camTicket = 0;
  let camId = localStorage.getItem('cameraId') || '';
  let camMirror = localStorage.getItem('cameraMirror') !== '0';
  const camVideo = camera.querySelector<HTMLVideoElement>('[data-cam]')!;
  const camMsg = camera.querySelector<HTMLElement>('[data-cam-msg]')!;
  const camPick = camera.querySelector<HTMLSelectElement>('[data-cam-pick]')!;
  const camLive = camera.querySelector<HTMLElement>('[data-cam-live]')!;
  const paintMirror = () => {
    camVideo.classList.toggle('flip', camMirror);
    camera.querySelector('[data-flip]')?.classList.toggle('on', camMirror);
  };
  paintMirror();

  const camProblem = (text: string, retry = true) => {
    camMsg.innerHTML = `<span>${esc(text)}</span>${retry ? '<button class="btn btn-g" type="button" data-cam-retry>Try again</button>' : ''}`;
    camMsg.hidden = false;
    camLive.classList.remove('on');
  };
  const stopCam = () => {
    camWanted = false;
    camTicket++;
    camStream?.getTracks().forEach((t) => t.stop());
    camStream = null;
    camVideo.srcObject = null;
    camLive.classList.remove('on');
  };
  const startCam = async () => {
    stopCam();
    camWanted = true;
    const ticket = ++camTicket;
    camMsg.innerHTML = '<span>Starting the camera…</span>';
    camMsg.hidden = false;
    if (!navigator.mediaDevices?.getUserMedia) { camProblem('This PC has no camera.', false); return; }
    try {
      // `ideal`, so a remembered camera that was unplugged falls back to another one.
      const s = await navigator.mediaDevices.getUserMedia({ video: camId ? { deviceId: { ideal: camId } } : true, audio: false });
      if (ticket !== camTicket || !camWanted) { s.getTracks().forEach((t) => t.stop()); return; }
      camStream = s;
      camVideo.srcObject = s;
      camMsg.hidden = true;
      camLive.classList.add('on');
      // Names are only readable once access is granted.
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      const used = s.getVideoTracks()[0]?.getSettings().deviceId || camId;
      camPick.innerHTML = cams.map((c, n) => `<option value="${esc(c.deviceId)}"${c.deviceId === used ? ' selected' : ''}>${esc(c.label || `Camera ${n + 1}`)}</option>`).join('');
      camPick.hidden = cams.length < 2;
    } catch (err) {
      if (ticket !== camTicket) return;
      const name = (err as DOMException)?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') camProblem('Camera access is off. Allow it in Windows Settings › Privacy › Camera.');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') camProblem('No camera was found.');
      else if (name === 'NotReadableError' || name === 'AbortError') camProblem('Another app is using the camera.');
      else camProblem('The camera could not start.');
    }
  };
  camPick.addEventListener('change', () => {
    camId = camPick.value;
    localStorage.setItem('cameraId', camId);
    void startCam();
  });
  camPick.addEventListener('click', (e) => e.stopPropagation());
  // A hidden window never keeps the camera on.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (camStream) { stopCam(); camWanted = true; } }
    else if (camWanted && !camStream && activeSpace === 'camera') void startCam();
  });
  let activeSpace = '';

  const loadAsk = () => invoke('desk:ask-ready').then((ready) => paintAsk(Boolean(ready))).catch(() => paintAsk(false));
  const loadTrade = () => {
    paintTrade([]);
    if (!symbols.length) return;
    invoke('desk:quotes', symbols).then((rows) => paintTrade(rows || [])).catch((e) => paintTrade([], e?.message || 'Quotes are unavailable.'));
  };
  const loadVault = () => invoke('desk:vault-list').then((rows) => { vaultRows = rows || []; paintVault(); }).catch(() => paintVault());
  const loadNotices = () => {
    notices.innerHTML = `<div class="link-panel"><p class="link-lead">Reading Windows notifications…</p></div>`;
    invoke('desk:notices').then((raw: string) => {
      const text = String(raw || '');
      if (!text || text.includes('DENIED')) {
        notices.innerHTML = `<div class="link-panel"><p class="link-lead">Windows has not allowed Overlay to read other apps' notifications.</p><button class="btn btn-g" type="button" data-note-settings>Notification settings</button></div>`;
        return;
      }
      const rows = text.split(/\r?\n/).filter((line) => line.includes('|')).slice(0, 12);
      notices.innerHTML = `<div class="link-panel"><div class="desk-list">${rows.map((line) => {
        const [app, title, body] = line.split('|');
        return `<div class="list-row"><span><b>${esc(title || app)}</b><small>${esc(app)} ${esc(body || '')}</small></span></div>`;
      }).join('') || '<p class="link-lead">No toasts in the action center.</p>'}</div></div>`;
    }).catch(() => {
      notices.innerHTML = `<div class="link-panel"><p class="link-lead">Windows has not allowed Overlay to read other apps' notifications.</p></div>`;
    });
  };
  const loadAgents = async () => {
    const [snap, act] = await Promise.all([invoke('count:snapshot').catch(() => null), invoke('count:active').catch(() => ({}))]);
    const sources: any[] = snap?.sources || [];
    const fmtTok = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(Math.round(n)));
    agents.innerHTML = `<div class="kit">
      <div class="kit-head"><span><b>${sources.length}</b> AI tools on this PC</span><button type="button" class="kit-link" data-agents-dash><span>AI Usage</span></button></div>
      <div class="kit-list">${sources.map((x) => {
        const last = (act && act[x.kind]) || x.lastActive || 0;
        const live = last && Date.now() - last < 120000;
        const lim = (snap?.limits || []).filter((l: any) => l.kind === x.kind);
        const peak = lim.reduce((m: number, l: any) => Math.max(m, l.usedPercent), 0);
        return `<div class="kit-row ag-row">
          <span class="ag-logo">${aiMark(x.kind, 18)}</span>
          <span class="kit-main"><b>${esc(x.name)}</b><small>${live ? '<i class="ag-live"></i>Working now' : last ? `Active ${ago(last)}` : 'Not used yet'}</small></span>
          <span class="ag-num"><b>${fmtTok(x.today || 0)}</b><small>today</small></span>
          ${lim.length ? `<span class="ag-lim"><i><em style="width:${Math.min(100, peak)}%" class="${peak >= 80 ? 'hot' : ''}"></em></i><small>${Math.round(peak)}%</small></span>` : '<span class="ag-lim none"></span>'}
        </div>`;
      }).join('') || '<p class="kit-empty">No AI coding tools found on this PC yet.</p>'}</div>
    </div>`;
  };
  agents.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('[data-agents-dash]')) { e.stopPropagation(); send('open-dashboard', { nav: 'ai' }); } });

  const loadScreen = () => {
    invoke('desk:screen').then((data: { apps?: Record<string, number>; hour?: Record<string, number>; meta?: Record<string, { label: string; icon: string }> }) => {
      const label = (n: string) => data?.meta?.[n]?.label || n;
      const icon = (n: string, k: number) => {
        const src = data?.meta?.[n]?.icon;
        return src ? `<img class="st-ico" src="${src}" alt=""/>` : `<span class="st-ico st-ico-letter" style="--t:${tint[k] || '#64748b'}">${esc(label(n).charAt(0).toUpperCase())}</span>`;
      };
      const apps = Object.entries(data?.apps || {}).sort((a, b) => b[1] - a[1]);
      const tint = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6'];
      const total = apps.reduce((n, [, sec]) => n + sec, 0);
      const hours = Array.from({ length: 24 }, (_, h) => data?.hour?.[String(h)] || 0);
      const peakH = Math.max(1, ...hours);
      const now = new Date().getHours();
      const top = apps.slice(0, 5);
      const max = Math.max(1, ...top.map(([, sec]) => sec));
      const hm = (sec: number) => { const m = Math.round(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
      screen.innerHTML = `<div class="kit st">
        <div class="st-top"><div><b>${hm(total)}</b><small>Screen time today</small></div><div class="st-legend">${top.slice(0, 3).map(([n], k) => `<span><i style="background:${tint[k]}"></i>${esc(label(n))}</span>`).join('')}</div></div>
        <div class="st-hours">${hours.map((sec, h) => `<span class="${h === now ? 'now' : ''}" title="${h}:00 · ${hm(sec)}"><i style="height:${sec ? Math.max(6, (sec / peakH) * 100) : 0}%"></i></span>`).join('')}</div>
        <div class="st-axis"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span></div>
        <div class="st-apps">${top.map(([n, sec], k) => `<div class="st-app"><span>${icon(n, k)}<em class="st-name">${esc(label(n))}</em></span><i><em style="width:${(sec / max) * 100}%;background:${tint[k]}"></em></i><b>${hm(sec)}</b></div>`).join('') || '<p class="kit-empty">Time counts from the app in front, every 20 seconds.</p>'}</div>
      </div>`;
    });
  };
  const loadWalls = (note = '') => {
    invoke('desk:walls').then((rows: { file: string; name: string; thumb: string }[]) => {
      walls.innerHTML = `<div class="kit">
        <div class="kit-head"><span>From your Pictures</span><button type="button" class="kit-link" data-browse>${DI.plus}<span>Choose a picture</span></button></div>
        <div class="wall-grid">${(rows || []).map((r) => `<button type="button" class="wall" data-file="${esc(r.file)}" title="${esc(r.name)}">${r.thumb ? `<img src="${r.thumb}" alt=""/>` : ''}<span>${esc(r.name.replace(/\.[^.]+$/, ''))}</span></button>`).join('') || '<p class="kit-empty">No pictures in your Pictures folder yet.</p>'}</div>
        <p class="cap-note" data-wall-note>${esc(note || 'Click a picture to set it as your wallpaper.')}</p>
      </div>`;
    });
  };

  ask.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    if (form.dataset.keyForm !== undefined && form.hasAttribute('data-key-form')) {
      const key = form.querySelector<HTMLInputElement>('[data-key]')!.value.trim();
      const base = form.querySelector<HTMLInputElement>('[data-base]')!.value.trim();
      if (!key) return;
      void invoke('desk:ask-key', { key, base: base || 'https://api.openai.com/v1', model: 'gpt-4o-mini' }).then(() => loadAsk());
      return;
    }
    const input = ask.querySelector<HTMLInputElement>('[data-ask]');
    const text = input?.value.trim() || '';
    if (!text || asking) return;
    messages.push({ role: 'user', content: text });
    asking = true;
    paintAsk(true);
    void invoke('desk:ask', { messages }).then((res: { text?: string; error?: string }) => {
      asking = false;
      messages.push({ role: 'assistant', content: res?.error === 'key' ? 'Save an API key first.' : (res?.text || res?.error || 'No answer.') });
      paintAsk(res?.error !== 'key');
    });
  });

  trade.addEventListener('click', (e) => {
    const x = (e.target as HTMLElement).closest('[data-unsym]');
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-sym]');
    if (!x || !row) return;
    e.stopPropagation();
    symbols = symbols.filter((v) => v !== row.dataset.sym);
    send('set-setting', 'tickers', JSON.stringify(symbols));
    loadTrade();
  });
  trade.addEventListener('submit', (e) => {
    e.preventDefault();
    const symbol = trade.querySelector<HTMLInputElement>('[data-symbol]')?.value.trim().toUpperCase() || '';
    if (!symbol) return;
    symbols = [...new Set([...symbols, symbol])].slice(0, 12);
    send('set-setting', 'tickers', JSON.stringify(symbols));
    loadTrade();
  });

  vault.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = vault.querySelector<HTMLInputElement>('[data-name]')?.value.trim() || '';
    const user = vault.querySelector<HTMLInputElement>('[data-user]')?.value.trim() || '';
    const secret = vault.querySelector<HTMLInputElement>('[data-secret]')?.value || '';
    if (!name || !secret) return;
    void invoke('desk:vault-put', { name, user, secret }).then((rows) => { vaultRows = rows || []; paintVault(); });
  });
  vault.addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
    if (!row) return;
    const id = row.dataset.id || '';
    if ((e.target as HTMLElement).closest('[data-drop]')) {
      void invoke('desk:vault-drop', id).then((rows) => { vaultRows = rows || []; paintVault(); });
    } else if ((e.target as HTMLElement).closest('[data-reveal]')) {
      void invoke('desk:vault-open', id).then((secret) => {
        const label = row.querySelector('small');
        if (label) label.textContent = secret || '';
      });
    }
  });

  const shoot = () => invoke('desk:shot').then((file) => loadCapture(file ? 'Saved to Pictures › Overlay.' : '')).catch(() => loadCapture('Could not capture the screen.'));
  capture.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const mode = t.closest<HTMLElement>('[data-cap]')?.dataset.cap;
    if (mode) e.stopPropagation();
    if (mode === 'screen') void shoot();
    if (mode === 'area' || mode === 'window') send('take-screenshot');
    if (mode === 'timer') {
      let n = 3;
      const tick = () => { paintCapture([], `Capturing in ${n}…`); if (n-- <= 0) { void shoot(); return; } setTimeout(tick, 1000); };
      tick();
    }
    const open = t.closest<HTMLElement>('[data-open]');
    if (open) { e.stopPropagation(); void invoke('desk:open', open.dataset.open); }
    if (t.closest('[data-cap-folder]')) { e.stopPropagation(); void invoke('desk:shots').then((rows) => { if (rows?.[0]) void invoke('desk:reveal', rows[0].file); }); }
  });

  recorder.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const open = t.closest<HTMLElement>('[data-open]');
    if (open) { e.stopPropagation(); void invoke('desk:open', open.dataset.open); return; }
    if (!t.closest('[data-mic]')) return;
    e.stopPropagation();
    if (rec) { rec.stop(); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { void loadRec('Microphone access is off in Windows settings.'); return; }
    chunks = [];
    rec = new MediaRecorder(stream);
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
    rec.onstop = () => {
      cancelAnimationFrame(recRaf);
      stream.getTracks().forEach((tr) => tr.stop());
      void audioCtx?.close(); audioCtx = null; analyser = null;
      const blob = new Blob(chunks, { type: rec?.mimeType || 'audio/webm' });
      rec = null;
      paintRec('saving');
      blob.arrayBuffer()
        .then((buf) => invoke('desk:save-media', { kind: 'audio', name: `rec-${Date.now()}.webm`, data: toB64(buf) }))
        .then(() => loadRec('Saved to Music › Overlay.'))
        .catch(() => loadRec('Could not save the recording.'));
    };
    rec.start();
    recStart = Date.now();
    paintRec('live');
    drawWave();
  });

  camera.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-flip]')) {
      e.stopPropagation();
      camMirror = !camMirror;
      localStorage.setItem('cameraMirror', camMirror ? '1' : '0');
      paintMirror();
    }
    if (t.closest('[data-cam-retry]')) { e.stopPropagation(); void startCam(); }
  });

  notices.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-note-settings]')) send('open-shortcut', 'ms-settings:notifications');
  });

  agents.addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-file]');
    if (row?.dataset.file) void invoke('desk:reveal', row.dataset.file);
  });

  const setWall = (file: string) => {
    void invoke('desk:set-wall', file).then(() => {
      const note = walls.querySelector('[data-wall-note]');
      if (note) note.textContent = 'Wallpaper updated.';
      walls.querySelectorAll('.wall').forEach((w) => w.classList.toggle('on', (w as HTMLElement).dataset.file === file));
    });
  };
  walls.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const wall = t.closest<HTMLElement>('[data-file]');
    if (wall?.dataset.file) setWall(wall.dataset.file);
    if (t.closest('[data-browse]')) void invoke('desk:pick-wall').then((file) => { if (file) setWall(file); });
  });

  void invoke('get-setting', 'tickers', '[]').then((raw) => {
    try { symbols = JSON.parse(raw || '[]'); } catch { symbols = []; }
  });

  return {
    onSpace(name: string) {
      activeSpace = name;
      if (name === 'camera') void startCam(); else stopCam();
      if (name === 'ask') loadAsk();
      if (name === 'trading') loadTrade();
      if (name === 'vault') loadVault();
      if (name === 'notices') loadNotices();
      if (name === 'agents') loadAgents();
      if (name === 'screentime') loadScreen();
      if (name === 'wallpapers') loadWalls();
      if (name === 'capture') void loadCapture();
      if (name === 'recorder' && !rec) void loadRec();
    },
  };
}

const CAM_ICON = {
  flip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5v17"/><path d="M8.5 7 3.5 17h5Z"/><path d="M15.5 7l5 10h-5Z"/></svg>',
};
