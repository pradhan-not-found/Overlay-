// Ask, watchlist, vault, notices, capture, recorder, camera, agents, screen time, wallpapers.

type Invoke = (ch: string, ...a: any[]) => Promise<any>;
type Send = (ch: string, ...a: any[]) => void;

const esc = (v: string) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const $ = (sel: string) => document.querySelector<HTMLElement>(sel);

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
    trade.innerHTML = `<div class="link-panel">
      <div class="desk-list">${rows.map((r) => `<div class="list-row"><span><b>${esc(r.symbol)}</b> ${esc(r.name)}</span><b class="${r.change < 0 ? 'down' : 'up'}">${Number(r.price).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${r.change >= 0 ? '+' : ''}${Number(r.change).toFixed(2)}%</b></div>`).join('') || `<p class="link-lead">${err || 'Add a ticker. The price is the public quote.'}</p>`}</div>
      <form class="link-user" data-tick><input data-symbol placeholder="AAPL" maxlength="12" spellcheck="false"/><button class="btn btn-g" type="submit">Add</button></form>
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

  capture.innerHTML = `<div class="link-panel">
    <p class="link-lead">A shot is saved to Pictures\\Overlay. Snip opens the Windows clip tool.</p>
    <div class="link-actions">
      <button class="btn btn-p" type="button" data-shot>Save screen</button>
      <button class="btn btn-g" type="button" data-snip>Snip</button>
    </div>
    <p class="link-lead" data-shot-path></p>
  </div>`;

  let rec: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  const paintRec = (state: string) => {
    recorder.innerHTML = `<div class="link-panel">
      <div class="link-top"><div class="link-id"><b>Recorder</b><span>${state}</span></div></div>
      <div class="link-actions"><button class="btn btn-p" type="button" data-mic>${rec ? 'Stop' : 'Record microphone'}</button></div>
      <p class="link-lead">Audio is saved under Music\\Overlay. This records the microphone only.</p>
    </div>`;
  };
  paintRec('Ready');

  camera.innerHTML = `<div class="link-panel cam">
    <video data-cam autoplay playsinline muted></video>
    <div class="link-actions"><button class="btn btn-p" type="button" data-cam-on>Start camera</button><button class="btn btn-g" type="button" data-flip>Flip</button></div>
    <p class="link-lead" data-cam-note>The picture stays in this panel. Nothing is saved.</p>
  </div>`;

  let camStream: MediaStream | null = null;
  const stopCam = () => {
    camStream?.getTracks().forEach((t) => t.stop());
    camStream = null;
    const video = camera.querySelector<HTMLVideoElement>('[data-cam]');
    if (video) video.srcObject = null;
  };

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
  const loadAgents = () => {
    agents.innerHTML = `<div class="link-panel"><p class="link-lead">Reading local agent sessions…</p></div>`;
    invoke('desk:agents').then((rows: { project: string; file: string; at: number }[]) => {
      agents.innerHTML = `<div class="link-panel"><div class="desk-list">${(rows || []).map((r) => `<button type="button" class="list-row" data-file="${esc(r.file)}"><span><b>${esc(r.project)}</b><small>${new Date(r.at).toLocaleString()}</small></span></button>`).join('') || '<p class="link-lead">No Cursor agent sessions on this PC.</p>'}</div></div>`;
    });
  };
  const loadScreen = () => {
    invoke('desk:screen').then((data: { apps?: Record<string, number> }) => {
      const apps = Object.entries(data?.apps || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
      const total = apps.reduce((n, [, s]) => n + s, 0);
      screen.innerHTML = `<div class="link-panel">
        <div class="link-id"><b>${Math.round(total / 60)} min</b><span>Today, while Overlay is open</span></div>
        <div class="desk-list">${apps.map(([name, secs]) => `<div class="list-row"><span>${esc(name)}</span><b>${Math.round(secs / 60)}m</b></div>`).join('') || '<p class="link-lead">Time starts counting from the foreground app.</p>'}</div>
      </div>`;
    });
  };
  const loadWalls = () => {
    invoke('desk:walls').then((rows: { file: string; name: string }[]) => {
      walls.innerHTML = `<div class="link-panel">
        <div class="wall-grid">${(rows || []).map((r) => `<button type="button" class="wall" data-file="${esc(r.file)}">${esc(r.name)}</button>`).join('') || '<p class="link-lead">No pictures in your Pictures folder yet.</p>'}</div>
        <button class="btn btn-g" type="button" data-browse>Choose a picture</button>
        <p class="link-lead" data-wall-note>A click sets that picture as the desktop wallpaper.</p>
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

  capture.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-snip]')) send('take-screenshot');
    if (t.closest('[data-shot]')) {
      void invoke('desk:shot').then((file) => {
        const note = capture.querySelector('[data-shot-path]');
        if (note) note.textContent = file || '';
        if (file) void invoke('desk:reveal', file);
      });
    }
  });

  recorder.addEventListener('click', async (e) => {
    if (!(e.target as HTMLElement).closest('[data-mic]')) return;
    if (rec) {
      rec.stop();
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    rec = new MediaRecorder(stream);
    rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: rec?.mimeType || 'audio/webm' });
      rec = null;
      paintRec('Saving…');
      blob.arrayBuffer().then((buf) => {
        const data = btoa(String.fromCharCode(...new Uint8Array(buf)));
        return invoke('desk:save-media', { kind: 'audio', name: `rec-${Date.now()}.webm`, data });
      }).then((file) => { paintRec(file ? 'Saved' : 'Ready'); if (file) void invoke('desk:reveal', file); }).catch(() => paintRec('Could not save'));
    };
    rec.start();
    paintRec('Recording');
  });

  camera.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const video = camera.querySelector<HTMLVideoElement>('[data-cam]');
    if (t.closest('[data-flip]') && video) video.classList.toggle('flip');
    if (!t.closest('[data-cam-on]') || !video) return;
    if (camStream) { stopCam(); return; }
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video.srcObject = camStream;
      const note = camera.querySelector('[data-cam-note]');
      if (note) note.textContent = 'Camera is on. Leaving this panel turns it off.';
    } catch {
      const note = camera.querySelector('[data-cam-note]');
      if (note) note.textContent = 'The camera is not available.';
    }
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
      if (name !== 'camera') stopCam();
      if (name === 'ask') loadAsk();
      if (name === 'trading') loadTrade();
      if (name === 'vault') loadVault();
      if (name === 'notices') loadNotices();
      if (name === 'agents') loadAgents();
      if (name === 'screentime') loadScreen();
      if (name === 'wallpapers') loadWalls();
    },
  };
}
