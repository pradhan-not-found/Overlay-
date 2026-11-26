// Downloads, Ports, Breaks and Find. Each one works on this PC only.

type Invoke = (ch: string, ...a: any[]) => Promise<any>;
type Send = (ch: string, ...a: any[]) => void;

const esc = (v: string) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const $ = (sel: string) => document.querySelector<HTMLElement>(sel);

const size = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(1)} GB`);
function ago(t: number) {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
}

const svg = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  file: svg('<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8Z"/><path d="M14 3.5V8h4.5"/>'),
  image: svg('<rect x="4" y="4.5" width="16" height="15" rx="2.5"/><circle cx="9" cy="9.5" r="1.6"/><path d="m4.5 17 4.5-4.2 3.2 3 2.6-2.4 4.7 4.1"/>'),
  video: svg('<rect x="3.5" y="6" width="12.5" height="12" rx="2.5"/><path d="m16 10.5 4.5-2.7v8.4L16 13.5"/>'),
  audio: svg('<path d="M9 17.5V6.2l10-2.2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>'),
  zip: svg('<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M12 3.5v2M12 7.5v2M12 11.5v2"/><rect x="10.5" y="14" width="3" height="3.5" rx="0.8"/>'),
  doc: svg('<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8Z"/><path d="M14 3.5V8h4.5M9 12.5h6M9 16h4"/>'),
  app: svg('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 12h6M12 9v6"/>'),
  folder: svg('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/>'),
  open: svg('<path d="M7 17 17 7M9 7h8v8"/>'),
  reveal: svg('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/><path d="M12 11.5v5M9.8 14.3 12 16.5l2.2-2.2"/>'),
  stop: svg('<rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/>'),
  refresh: svg('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>'),
  eye: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>'),
  stand: svg('<circle cx="12" cy="5" r="2"/><path d="M12 7.5v7M8 10.5h8M12 14.5l-3 6M12 14.5l3 6"/>'),
  water: svg('<path d="M12 3.2c.3.5 5.4 6.4 5.4 9.9a5.4 5.4 0 1 1-10.8 0C6.6 9.6 11.7 3.7 12 3.2Z"/>'),
};
function kindIcon(name: string, folder = false) {
  if (folder) return { ico: I.folder, tint: '#fbbf24' };
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (/^(png|jpe?g|gif|webp|svg|heic|bmp|ico)$/.test(ext)) return { ico: I.image, tint: '#f472b6' };
  if (/^(mp4|mov|mkv|webm|avi)$/.test(ext)) return { ico: I.video, tint: '#a78bfa' };
  if (/^(mp3|wav|flac|m4a|ogg)$/.test(ext)) return { ico: I.audio, tint: '#34d399' };
  if (/^(zip|rar|7z|tar|gz)$/.test(ext)) return { ico: I.zip, tint: '#fb923c' };
  if (/^(exe|msi|appx|msix)$/.test(ext)) return { ico: I.app, tint: '#60a5fa' };
  if (/^(pdf|docx?|xlsx?|pptx?|txt|md|csv)$/.test(ext)) return { ico: I.doc, tint: '#93c5fd' };
  return { ico: I.file, tint: '#a1a1aa' };
}

type FileRow = { name: string; path: string; size: number; at: number; dir?: string; folder?: boolean };
type PortRow = { port: number; pid: number; name: string; local: boolean; icon?: string };

const fileRow = (f: FileRow, sub: string) => {
  const k = kindIcon(f.name, f.folder);
  return `<div class="kit-row" draggable="${f.folder ? 'false' : 'true'}" data-path="${esc(f.path)}" title="${f.folder ? '' : 'Drag into any app'}">
    <span class="kit-ico" style="--tint:${k.tint}">${k.ico}</span>
    <span class="kit-main"><b>${esc(f.name)}</b><small>${sub}</small></span>
    <span class="kit-acts">
      <button type="button" data-act="open" title="Open">${I.open}</button>
      <button type="button" data-act="reveal" title="Show in folder">${I.reveal}</button>
    </span>
  </div>`;
};

export function mountKit(opts: { invoke: Invoke; send: Send }) {
  const { invoke, send } = opts;
  const dl = $('[data-space="downloads"]');
  const pt = $('[data-space="ports"]');
  const br = $('[data-space="breaks"]');
  const fd = $('[data-space="find"]');
  if (!dl || !pt || !br || !fd) return { onSpace(_n: string) {} };

  // Shared: open, reveal and drag out for file rows.
  const bindFiles = (root: HTMLElement) => {
    root.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      const row = (e.target as HTMLElement).closest<HTMLElement>('[data-path]');
      if (!btn || !row) return;
      e.stopPropagation();
      if (btn.dataset.act === 'open') void invoke('kit:open', row.dataset.path);
      if (btn.dataset.act === 'reveal') void invoke('kit:reveal', row.dataset.path);
    });
    root.addEventListener('dblclick', (e) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>('[data-path]');
      if (row) void invoke('kit:open', row.dataset.path);
    });
    root.addEventListener('dragstart', (e) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>('[data-path]');
      if (!row || row.getAttribute('draggable') !== 'true') return;
      e.preventDefault();
      send('kit:drag', row.dataset.path);
    });
  };

  // ── Downloads ──
  const loadDownloads = async () => {
    const rows: FileRow[] = (await invoke('kit:downloads').catch(() => [])) || [];
    dl.innerHTML = `<div class="kit">
      <div class="kit-head"><span>Newest in Downloads</span><button type="button" class="kit-icon-btn" data-dl-refresh title="Refresh">${I.refresh}</button></div>
      <div class="kit-list">${rows.map((f) => fileRow(f, `${size(f.size)} · ${ago(f.at)}`)).join('') || '<p class="kit-empty">Your Downloads folder is empty.</p>'}</div>
    </div>`;
  };
  bindFiles(dl);
  dl.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('[data-dl-refresh]')) { e.stopPropagation(); void loadDownloads(); } });

  // ── Ports ──
  const loadPorts = async () => {
    if (!pt.innerHTML) pt.innerHTML = '<div class="kit"><p class="kit-empty">Reading local servers…</p></div>';
    pt.querySelector('[data-pt-refresh]')?.classList.add('spin');
    const rows: PortRow[] = (await invoke('kit:ports').catch(() => [])) || [];
    const net = rows.filter((r) => !r.local).length;
    pt.innerHTML = `<div class="kit">
      <div class="kit-head"><span><b>${rows.length}</b> listening${net ? ` · <em class="warn">${net} open to the network</em>` : ''}</span><button type="button" class="kit-icon-btn" data-pt-refresh title="Refresh">${I.refresh}</button></div>
      <div class="kit-list">${rows.map((r) => `<div class="kit-row port" data-port="${r.port}" data-pid="${r.pid}">
          <span class="pt-app">${r.icon ? `<img src="${r.icon}" alt=""/>` : `<i>${esc(r.name.charAt(0).toUpperCase())}</i>`}</span>
          <span class="kit-main"><b>${esc(r.name)}</b><small>${r.local ? 'This PC only' : 'Open to the network'} · PID ${r.pid}</small></span>
          <span class="pt-port${r.local ? '' : ' net'}">${r.port}</span>
          <span class="kit-acts">
            <button type="button" data-port-act="open" title="Open localhost:${r.port}">${I.open}</button>
            <button type="button" data-port-act="stop" class="danger" title="Stop ${esc(r.name)}">${I.stop}</button>
          </span>
        </div>`).join('') || '<p class="kit-empty">No local servers are running.</p>'}</div>
    </div>`;
  };
  pt.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-pt-refresh]')) { e.stopPropagation(); void loadPorts(); return; }
    const btn = t.closest<HTMLElement>('[data-port-act]');
    const row = t.closest<HTMLElement>('[data-port]');
    if (!btn || !row) return;
    e.stopPropagation();
    if (btn.dataset.portAct === 'open') void invoke('kit:open-url', Number(row.dataset.port));
    if (btn.dataset.portAct === 'stop') {
      if (!btn.classList.contains('confirm')) {
        btn.classList.add('confirm');
        btn.title = 'Click again to stop';
        setTimeout(() => btn.classList.remove('confirm'), 2500);
        return;
      }
      void invoke('kit:stop-port', Number(row.dataset.pid)).then(() => setTimeout(loadPorts, 400));
    }
  });

  // ── Breaks: an eye-rest and stand-up rhythm, with a short countdown ──
  type Kind = 'eyes' | 'stand' | 'water';
  const KINDS: Record<Kind, { label: string; every: number; secs: number; line: string; ico: string; tint: string }> = {
    eyes: { label: 'Rest your eyes', every: 20, secs: 20, line: 'Look at something 6 metres away.', ico: I.eye, tint: '#7dd3fc' },
    stand: { label: 'Stand up', every: 50, secs: 60, line: 'Stand, stretch and roll your shoulders.', ico: I.stand, tint: '#86efac' },
    water: { label: 'Drink water', every: 60, secs: 10, line: 'A glass of water, then back to it.', ico: I.water, tint: '#93c5fd' },
  };
  const saved = (() => { try { return JSON.parse(localStorage.getItem('breaks') || '{}'); } catch { return {}; } })();
  const on: Record<Kind, boolean> = { eyes: saved.eyes ?? true, stand: saved.stand ?? true, water: saved.water ?? false };
  const due: Record<Kind, number> = { eyes: 0, stand: 0, water: 0 };
  let running = saved.running ?? false;
  let resting: { kind: Kind; left: number } | null = null;
  const save = () => localStorage.setItem('breaks', JSON.stringify({ ...on, running }));
  const reset = (k: Kind) => { due[k] = Date.now() + KINDS[k].every * 60000; };
  (Object.keys(KINDS) as Kind[]).forEach(reset);

  const mmss = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const paintBreaks = () => {
    if (resting) {
      const k = KINDS[resting.kind];
      const pct = 1 - resting.left / k.secs;
      br.innerHTML = `<div class="kit brk-rest" style="--tint:${k.tint}">
        <div class="brk-ring" style="--p:${pct}"><span>${resting.left}</span></div>
        <b>${k.label}</b><small>${k.line}</small>
        <button type="button" class="btn btn-g" data-brk="skip">Skip</button>
      </div>`;
      return;
    }
    const keys = (Object.keys(KINDS) as Kind[]);
    const next = running ? keys.filter((x) => on[x]).sort((a, b) => due[a] - due[b])[0] : undefined;
    const nk = next ? KINDS[next] : null;
    br.innerHTML = `<div class="kit">
      <div class="brk-hero${running ? ' on' : ''}" style="--tint:${nk ? nk.tint : '#7dd3fc'}">
        <span class="kit-ico">${nk ? nk.ico : I.eye}</span>
        <div class="brk-hero-text">${running && nk ? `<small>Next · ${nk.label}</small><b>${mmss(due[next!] - Date.now())}</b>` : `<small>Gentle reminders to look away, stand and drink water</small><b>Breaks</b>`}</div>
        <button type="button" class="brk-go${running ? ' on' : ''}" data-brk="run">${running ? 'Stop' : 'Start'}</button>
      </div>
      <div class="brk-list">${keys.map((key) => {
        const k = KINDS[key];
        return `<div class="brk${on[key] ? ' on' : ''}" style="--tint:${k.tint}">
          <span class="kit-ico">${k.ico}</span>
          <span class="kit-main"><b>${k.label}</b><small>Every ${k.every} min · ${k.secs < 60 ? `${k.secs} s` : `${k.secs / 60} min`}</small></span>
          <button type="button" class="kit-link" data-brk-now="${key}">Now</button>
          <button type="button" class="brk-switch${on[key] ? ' on' : ''}" data-brk-kind="${key}" aria-label="${k.label}"><i></i></button>
        </div>`;
      }).join('')}</div>
    </div>`;
  };
  const startRest = (kind: Kind) => {
    resting = { kind, left: KINDS[kind].secs };
    reset(kind);
    try { new Notification(KINDS[kind].label, { body: KINDS[kind].line, silent: true }); } catch {}
    paintBreaks();
  };
  br.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const run = t.closest<HTMLElement>('[data-brk]');
    const sw = t.closest<HTMLElement>('[data-brk-kind]');
    const now = t.closest<HTMLElement>('[data-brk-now]');
    if (!run && !sw && !now) return;
    e.stopPropagation();
    if (run?.dataset.brk === 'run') { running = !running; (Object.keys(KINDS) as Kind[]).forEach(reset); save(); }
    if (run?.dataset.brk === 'skip') resting = null;
    if (sw) { const k = sw.dataset.brkKind as Kind; on[k] = !on[k]; reset(k); save(); }
    if (now) { startRest(now.dataset.brkNow as Kind); return; }
    paintBreaks();
  });
  let breaksVisible = false;
  setInterval(() => {
    if (resting) {
      resting.left -= 1;
      if (resting.left <= 0) resting = null;
      if (breaksVisible || !resting) paintBreaks();
      return;
    }
    if (!running) return;
    const ready = (Object.keys(KINDS) as Kind[]).find((k) => on[k] && Date.now() >= due[k]);
    if (ready) startRest(ready);
    else if (breaksVisible) paintBreaks();
  }, 1000);

  // ── Find ──
  fd.innerHTML = `<div class="kit">
    <label class="kit-search">${I.search}<input data-find placeholder="Search files and folders on every drive" spellcheck="false" autocomplete="off"/></label>
    <div class="kit-list" data-find-list><p class="kit-empty">Type a name. Enter opens the first result.</p></div>
  </div>`;
  const findInput = fd.querySelector<HTMLInputElement>('[data-find]')!;
  const findList = fd.querySelector<HTMLElement>('[data-find-list]')!;
  let findTimer = 0;
  let findTicket = 0;
  findInput.addEventListener('input', () => {
    clearTimeout(findTimer);
    const q = findInput.value.trim();
    if (q.length < 2) { findList.innerHTML = '<p class="kit-empty">Type at least two letters.</p>'; return; }
    findTimer = window.setTimeout(async () => {
      const ticket = ++findTicket;
      findList.innerHTML = '<div class="kit-searching"><i></i><span>Searching every drive…</span></div>';
      const rows: FileRow[] = (await invoke('kit:find', q).catch(() => [])) || [];
      if (ticket !== findTicket) return;
      findList.innerHTML = rows.length
        ? `<div class="kit-count">${rows.length}${rows.length >= 40 ? '+' : ''} ${rows.length === 1 ? 'result' : 'results'}</div>` + rows.map((f) => fileRow(f, `${esc(f.dir || '')}${f.folder ? '' : ` · ${size(f.size)}`}`)).join('')
        : `<p class="kit-empty">Nothing named “${esc(q)}” on this PC.</p>`;
    }, 220);
  });
  findInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { const first = findList.querySelector<HTMLElement>('[data-path]'); if (first) void invoke('kit:open', first.dataset.path); }
  });
  bindFiles(fd);

  paintBreaks();
  return {
    onSpace(name: string) {
      breaksVisible = name === 'breaks';
      if (name === 'downloads') void loadDownloads();
      if (name === 'ports') void loadPorts();
      if (name === 'breaks') paintBreaks();
      if (name === 'find') setTimeout(() => findInput.focus(), 80);
    },
  };
}
