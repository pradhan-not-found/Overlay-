// The closed notch, tuned to what you are doing: the AI tool you are coding
// with (hover for its limits, click for all of them), browser utilities when a
// browser is in front, and a line in the middle for greetings, reminders and
// updates. Everything here is switched on or off from the Dashboard.
import { aiMark } from '../assets/ai-logos';

type Invoke = (ch: string, ...a: any[]) => Promise<any>;
type Send = (ch: string, ...a: any[]) => void;
type On = (ch: string, fn: (...a: any[]) => void) => void;
type Ctx = { app: string; kind: 'code' | 'terminal' | 'browser' | 'other' };
type Limit = { kind: string; source: string; label: string; usedPercent: number; resetsAt: number | null };

const NAMES: Record<string, string> = { 'claude-code': 'Claude Code', codex: 'Codex', cursor: 'Cursor', 'gemini-cli': 'Gemini CLI', opencode: 'OpenCode', copilot: 'Copilot CLI', antigravity: 'Antigravity' };
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const svg = (d: string, s = 15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  browser: svg('<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M3 9h18M6.5 6.8h.01M9 6.8h.01"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>', 14),
  water: svg('<path d="M12 3.2c.3.5 5.4 6.4 5.4 9.9a5.4 5.4 0 1 1-10.8 0C6.6 9.6 11.7 3.7 12 3.2Z"/>', 14),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1 1M17.4 17.4l1 1M18.4 5.6l-1 1M6.6 17.4l-1 1"/>', 14),
  moon: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>', 14),
  update: svg('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>', 14),
  open: svg('<path d="M7 17 17 7M9 7h8v8"/>', 13),
  pick: svg('<path d="M16 3.5a2.1 2.1 0 0 1 3 0l1.5 1.5a2.1 2.1 0 0 1 0 3L19 9.5 14.5 5Z"/><path d="m14.5 5 4.5 4.5-9.5 9.5H5v-4.5Z"/>', 14),
  shot: svg('<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 6 9.2 4h5.6L16 6"/><circle cx="12" cy="12" r="2.6"/>', 14),
  clip: svg('<rect x="6" y="4.5" width="12" height="16" rx="2.5"/><path d="M9.5 4.5V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v.5M9.5 10h5M9.5 13.5h5"/>', 14),
  find: svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>', 14),
  link: svg('<path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.5 12.6 4.9a4 4 0 0 1 5.7 5.7L16.7 12"/><path d="m13 17.5-1.6 1.6a4 4 0 0 1-5.7-5.7L7.3 12"/>', 14),
};
const logo = (k: string, s = 16) => `<span class="ctx-logo">${aiMark(k, s)}</span>`;
function resets(ts: number | null) {
  if (!ts) return '';
  const m = Math.max(0, Math.floor((ts - Date.now()) / 60000)), h = Math.floor(m / 60), d = Math.floor(h / 24);
  return d > 0 ? `${d}d ${h % 24}h` : h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export function mountContext(opts: { invoke: Invoke; send: Send; on: On; openSpace: (name: string) => void; isIdle: () => boolean }) {
  const { invoke, send, on, openSpace, isIdle } = opts;
  const pill = document.getElementById('pill')!;
  const slot = document.getElementById('ctx-slot')!;
  const msg = document.getElementById('idle-msg')!;
  const clock = document.getElementById('idle-clock');
  const gh = document.getElementById('btn-idle-github');
  const dc = document.getElementById('btn-idle-discord');
  if (!slot || !msg) return;

  const pop = document.createElement('div');
  pop.className = 'ctx-pop';
  pop.hidden = true;
  document.body.appendChild(pop);

  let cfg: any = {};
  let ctx: Ctx = { app: '', kind: 'other' };
  let snap: any = null;
  let auth = { signedIn: true, name: '' };
  let message: { text: string; ico: string; tone: string; until: number; act?: string } | null = null;
  let popKind = '';
  let lastWater = Date.now();
  let shownKey = '';
  let whatsNewVersion = '';
  const alerted = new Set<string>();

  const opt = (k: string, fallback: boolean) => (cfg[k] === undefined ? fallback : cfg[k] !== false);

  // ── Agent and browser chip ──
  // An agent that wrote to its log in the last two minutes is working right now.
  let activity: Record<string, number> = {};
  const working = () => {
    let best: string | null = null, at = 0;
    for (const [k, t] of Object.entries(activity)) if (t > at && Date.now() - t < 120000) { best = k; at = t; }
    return best;
  };
  const agent = () => {
    const busy = working();
    if (busy) return busy;
    if (!snap?.current) return null;
    const src = (snap.sources || []).find((s: any) => s.kind === snap.current);
    // Only a tool you used in the last half hour counts as the one you are on.
    if (src?.lastActive && Date.now() - src.lastActive > 30 * 60000) return null;
    return snap.current as string;
  };
  const limitsOf = (k: string): Limit[] => (snap?.limits || []).filter((l: Limit) => l.kind === k);
  function paintChip() {
    let html = '';
    if (opt('idleContext', true) && auth.signedIn) {
      const k = agent();
      if (k && (working() || ctx.kind === 'code' || ctx.kind === 'terminal')) {
        const lim = limitsOf(k);
        const top = lim.reduce((m, l) => Math.max(m, l.usedPercent), 0);
        // the 5-hour (session) limit is the one you watch while working; the week takes over only when it is nearly used up
        const sess = lim.find((l) => l.label === 'Session');
        const week = lim.find((l) => l.label === 'Weekly');
        const showWeek = !!week && week.usedPercent >= 80 && (!sess || week.usedPercent > sess.usedPercent);
        const shown = showWeek ? week! : sess || week;
        const tip = [NAMES[k] || k, ...lim.map((l) => `${l.label} ${Math.round(l.usedPercent)}%`)].join(' · ');
        void tip;
        // a second agent working at the same time sits beside the first as a small logo
        const also = Object.entries(activity).filter(([o, t]) => o !== k && Date.now() - t < 120000).sort((x, y) => y[1] - x[1]).map(([o]) => o)[0];
        html = `<span class="ctx-chip${top >= 80 ? ' hot' : ''}" data-pop="agent" data-hover="agent" role="button" tabindex="0" aria-label="${esc(NAMES[k] || k)} limits">${logo(k, 15)}${shown ? `<span>${Math.round(shown.usedPercent)}%${showWeek ? '<small class="ctx-wk">wk</small>' : ''}</span>` : ''}${also ? `<i class="ctx-also" title="${esc(NAMES[also] || also)} is working too">${logo(also, 13)}</i>` : ''}</span>`;
      } else if (ctx.kind === 'browser') {
        html = `<span class="ctx-chip" data-pop="browser" role="button" tabindex="0" aria-label="Browser tools">${I.browser}</span>`;
      }
    }
    slot.innerHTML = html;
    if (!html && !pop.hidden) closePop();
  }

  // ── Hover card: the limits of the tool you are on, without a click ──
  const hover = document.createElement('div');
  hover.className = 'ctx-hover';
  hover.hidden = true;
  document.body.appendChild(hover);
  let hoverTimer = 0;
  function showHover() {
    const k = agent();
    if (!k || !pop.hidden) return;
    const lim = limitsOf(k);
    hover.innerHTML = `<div class="ctx-hover-head">${logo(k, 16)}<b>${esc(NAMES[k] || k)}</b><span>Click for every tool</span></div>
      ${lim.map((l) => `<div class="ctx-lim"><span>${esc(l.label === 'Session' ? '5-hour' : l.label === 'Weekly' ? 'Week' : l.label)}</span><i><em style="width:${Math.min(100, Math.max(2, l.usedPercent))}%" class="${l.usedPercent >= 80 ? 'hot' : ''}"></em></i><b>${Math.round(l.usedPercent)}%</b><small>${l.resetsAt ? `resets in ${resets(l.resetsAt)}` : ''}</small></div>`).join('') || '<p class="ctx-empty">No plan limits read yet.</p>'}`;
    const r = pill.getBoundingClientRect();
    hover.style.top = `${r.bottom + 8}px`;
    hover.style.left = `${r.left + r.width / 2}px`;
    hover.hidden = false;
  }
  const hideHover = () => { clearTimeout(hoverTimer); hover.hidden = true; };
  slot.addEventListener('mouseover', (e) => {
    if (!(e.target as HTMLElement).closest('[data-hover="agent"]')) return;
    clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(showHover, 180);
  });
  slot.addEventListener('mouseout', (e) => {
    const to = (e as MouseEvent).relatedTarget as HTMLElement | null;
    if (!to || !to.closest('[data-hover="agent"]')) hideHover();
  });

  // ── Dropdown under the notch ──
  function placePop() {
    const r = pill.getBoundingClientRect();
    pop.style.top = `${r.bottom + 8}px`;
    pop.style.left = `${r.left + r.width / 2}px`;
  }
  function closePop() { hideHover(); pop.hidden = true; popKind = ''; pill.classList.remove('pop-open'); }
  function openPop(kind: string) {
    hideHover();
    popKind = kind;
    if (kind === 'agent') {
      const tools = [...new Set((snap?.limits || []).map((l: Limit) => l.kind))] as string[];
      const current = agent();
      const order = current ? [current, ...tools.filter((t) => t !== current)] : tools;
      pop.innerHTML = `<div class="ctx-pop-head"><b>AI limits</b><span>${current ? `On ${esc(NAMES[current] || current)} now` : 'All tools'}</span></div>
        ${order.map((k) => `<div class="ctx-tool${k === current ? ' on' : ''}">
          <div class="ctx-tool-name">${logo(k, 15)}<b>${esc(NAMES[k] || k)}</b></div>
          ${limitsOf(k).map((l) => `<div class="ctx-lim"><span>${esc(l.label === 'Session' ? '5-hour' : l.label === 'Weekly' ? 'Week' : l.label)}</span><i><em style="width:${Math.min(100, Math.max(2, l.usedPercent))}%" class="${l.usedPercent >= 80 ? 'hot' : ''}"></em></i><b>${Math.round(l.usedPercent)}%</b><small>${l.resetsAt ? `resets in ${resets(l.resetsAt)}` : ''}</small></div>`).join('')}
        </div>`).join('') || '<p class="ctx-empty">No plan limits read yet.</p>'}
        <button type="button" class="ctx-pop-btn" data-ctx="usage">${I.open}<span>Open AI Usage in the Dashboard</span></button>`;
    } else {
      const links = (cfg.shortcuts || []).filter((s: any) => /^https?:/i.test(s.target || '')).slice(0, 6);
      pop.innerHTML = `<div class="ctx-pop-head"><b>Browser tools</b><span>${esc(ctx.app)}</span></div>
        <div class="ctx-grid">
          <button type="button" data-ctx-space="colour">${I.pick}<span>Pick a colour</span></button>
          <button type="button" data-ctx-space="capture">${I.shot}<span>Screenshot</span></button>
          <button type="button" data-ctx-space="clipboard">${I.clip}<span>Clipboard</span></button>
          <button type="button" data-ctx-space="find">${I.find}<span>Find a file</span></button>
        </div>
        ${links.length ? `<div class="ctx-pop-sub">Your sites</div><div class="ctx-links">${links.map((s: any, i: number) => `<button type="button" data-ctx-link="${i}">${s.iconUrl ? `<img src="${esc(s.iconUrl)}" alt="" width="14" height="14"/>` : I.link}<span>${esc(s.name)}</span></button>`).join('')}</div>` : '<p class="ctx-empty">Add sites under Shortcuts in the Dashboard to open them from here.</p>'}`;
    }
    placePop();
    pop.hidden = false;
    pill.classList.add('pop-open');
  }
  slot.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-pop]');
    if (!chip) return;
    e.stopPropagation();
    if (popKind === chip.dataset.pop) closePop(); else openPop(chip.dataset.pop!);
  });
  pop.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    e.stopPropagation();
    if (t.closest('[data-ctx="usage"]')) { send('open-dashboard', { nav: 'ai' }); closePop(); }
    const sp = t.closest<HTMLElement>('[data-ctx-space]');
    if (sp) { closePop(); openSpace(sp.dataset.ctxSpace!); }
    const ln = t.closest<HTMLElement>('[data-ctx-link]');
    if (ln) {
      const links = (cfg.shortcuts || []).filter((s: any) => /^https?:/i.test(s.target || ''));
      const s = links[Number(ln.dataset.ctxLink)];
      if (s) send('open-external', s.target);
      closePop();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (pop.hidden) return;
    const t = e.target as HTMLElement;
    if (!t.closest('.ctx-pop') && !t.closest('#ctx-slot')) closePop();
  });

  // ── The line in the middle ──
  const greet = () => {
    const h = new Date().getHours();
    const part = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const first = (auth.name || '').trim().split(/\s+/)[0];
    return { text: first ? `${part}, ${first}` : part, ico: '' };
  };
  function say(text: string, ico: string, secs: number, tone = '', act?: string) {
    message = { text, ico, tone, until: Date.now() + secs * 1000, act };
    paintMsg();
  }
  function paintMsg() {
    if (message && Date.now() > message.until) message = null;
    (window as any).__overlayLocked = !auth.signedIn;
    if (!auth.signedIn) message = { text: 'Locked · sign in from the Dashboard', ico: I.lock, tone: 'lock', until: Infinity, act: 'unlock' };
    const show = !!message && isIdle();
    pill.classList.toggle('has-msg', show);
    msg.classList.toggle('on', show);
    msg.dataset.tone = message?.tone || '';
    msg.dataset.act = message?.act || '';
    const key = message ? `${message.tone}|${message.text}` : '';
    if (key !== shownKey) {
      shownKey = key;
      const words = message ? message.text.split(' ').map((w, n) => `<span class="w" style="--i:${n}">${esc(w)}</span>`).join(' ') : '';
      // after an update: the note, then a real What's new button that opens the changelog
      const btn = message?.act === 'whatsnew' ? `<span class="msg-btn" role="button">What's new<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8.5 7H17v8.5"/></svg></span>`
        : message?.act === 'install' ? `<span class="msg-btn" role="button">Restart<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5"/></svg></span>` : '';
      msg.innerHTML = message ? `${message.ico ? `<span class="msg-ico">${message.ico}</span>` : ''}<span class="msg-text">${words}</span>${btn}` : '';
    }
    if (clock) clock.style.display = opt('idleClock', true) && !show ? '' : 'none';
  }
  msg.addEventListener('click', (e) => {
    e.stopPropagation();
    const act = msg.dataset.act;
    if (act === 'unlock') send('open-dashboard', {});
    if (act === 'update') send('open-dashboard', { nav: 'about' });
    if (act === 'download') { send('download-update'); window.setTimeout(() => say('Downloading in the background', I.update, 6, 'update'), 0); }
    if (act === 'install') send('install-update');
    if (act === 'whatsnew') send('open-whats-new', whatsNewVersion);
    if (act !== 'unlock') { message = null; paintMsg(); }
  });

  // A locked Overlay opens the Dashboard to sign in instead of the notch.
  pill.addEventListener('click', (e) => {
    if (auth.signedIn) return;
    e.stopPropagation();
    e.preventDefault();
    send('open-dashboard', {});
  }, true);

  // ── Settings from the Dashboard ──
  function applyCfg() {
    if (gh) gh.style.display = opt('idleGithub', false) ? '' : 'none';
    if (dc) dc.style.display = opt('idleDiscord', false) ? '' : 'none';
    const accent = typeof cfg.accent === 'string' && /^#[0-9a-f]{6}$/i.test(cfg.accent) ? cfg.accent : '#3d6bff';
    document.documentElement.style.setProperty('--accent', accent);
    paintChip();
    paintMsg();
  }

  // ── Wiring ──
  // A limit getting close: the tool's own mark breathes in the middle of the notch.
  function checkLimits() {
    const k = agent() || snap?.current;
    if (!k || !auth.signedIn) return;
    for (const l of limitsOf(k)) {
      const step = l.usedPercent >= 100 ? 100 : l.usedPercent >= 90 ? 90 : l.usedPercent >= 80 ? 80 : 0;
      if (!step) continue;
      const id = `${k}|${l.label}|${step}|${l.resetsAt || ''}`;
      if (alerted.has(id)) continue;
      alerted.add(id);
      const when = l.resetsAt ? ` · resets in ${resets(l.resetsAt)}` : '';
      const text = step >= 100 ? `${NAMES[k] || k} ${l.label.toLowerCase()} limit reached${when}` : `${NAMES[k] || k} ${l.label.toLowerCase()} at ${Math.round(l.usedPercent)}%${when}`;
      say(text, `<span class="limit-mark${step >= 100 ? ' full' : ''}">${logo(k, 15)}</span>`, 14, 'limit');
    }
  }
  const loadSnap = () => invoke('count:snapshot').then((s) => { snap = s; paintChip(); checkLimits(); if (!pop.hidden && popKind === 'agent') openPop('agent'); }).catch(() => {});
  void invoke('get-config').then((c) => { cfg = c || {}; applyCfg(); });
  void invoke('context:app').then((c) => { if (c) { ctx = c; paintChip(); } });
  void invoke('auth:state').then((a) => {
    if (a) auth = a;
    if (auth.signedIn && opt('idleGreeting', true)) { const g = greet(); say(g.text, g.ico, 8); } else paintMsg();
    paintChip();
  });
  void loadSnap();
  on('widget-config', (_e: unknown, c: any) => { cfg = { ...cfg, ...(c || {}) }; applyCfg(); });
  on('context:app', (_e: unknown, c: Ctx) => { ctx = c; paintChip(); });
  on('count:update', () => void loadSnap());
  on('auth-changed', (_e: unknown, a: any) => {
    const was = auth.signedIn;
    auth = a;
    if (a.signedIn && !was && opt('idleGreeting', true)) { const g = greet(); say(g.text, g.ico, 8); } else { message = null; paintMsg(); }
    paintChip();
  });
  on('whats-new', (_e: unknown, w: { version: string }) => {
    whatsNewVersion = w?.version || '';
    say(`Updated to Overlay ${whatsNewVersion}`, I.update, 300, 'update', 'whatsnew');
  });
  on('update-status', (_e: unknown, s: any) => {
    // a short note; the update badge keeps showing the progress after it fades
    // no Windows notification: the notch says it once while it downloads, then offers a restart when ready
    const v = s?.version ? ` ${s.version}` : '';
    if (s?.event === 'available') say(`Downloading Overlay${v}`, I.update, 10, 'update', 'downloading');
    else if (s?.event === 'downloaded') say(`Overlay${v} is ready`, I.update, 900, 'update', 'install');
  });
  setInterval(loadSnap, 60000);
  const loadActivity = () => invoke('count:active').then((a) => {
    const before = working();
    activity = a || {};
    if (working() !== before) paintChip();
  }).catch(() => {});
  void loadActivity();
  setInterval(loadActivity, 4000);
  setInterval(() => {
    const every = Number(cfg.waterEvery ?? 30);
    if (auth.signedIn && every > 0 && Date.now() - lastWater >= every * 60000) {
      lastWater = Date.now();
      say('Time for a glass of water', I.water, 45, 'water');
      send('notify', { title: 'Drink some water', body: 'A glass of water, then back to it.' });
    }
    paintMsg();
  }, 5000);
  window.addEventListener('resize', () => { if (!pop.hidden) placePop(); });

  return {
    phase(idle: boolean) { if (!idle) closePop(); paintMsg(); },
  };
}
