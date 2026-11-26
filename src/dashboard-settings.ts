// Settings, connections and the account, inside the one Dashboard. Every
// switch here does something; nothing is decorative.
import overlayMark from './assets/overlay-mark.png';
import './dashboard-settings.css';

const ipc: any = (() => { try { return (window as any).require('electron').ipcRenderer; } catch { return null; } })();
const invoke = (ch: string, ...a: any[]) => (ipc ? ipc.invoke(ch, ...a) : Promise.resolve(null));
const send = (ch: string, ...a: any[]) => ipc?.send(ch, ...a);
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);

const svg = (d: string, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const SET_ICONS = {
  overview: svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>'),
  connections: svg('<path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.5 12.6 4.9a4 4 0 0 1 5.7 5.7L16.7 12"/><path d="m13 17.5-1.6 1.6a4 4 0 0 1-5.7-5.7L7.3 12"/>'),
  general: svg('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
  notch: svg('<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M8.5 4.5h7v1.8a1.7 1.7 0 0 1-1.7 1.7h-3.6a1.7 1.7 0 0 1-1.7-1.7Z"/>'),
  media: svg('<path d="M9 17.5V6.2l10-2.2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>'),
  shortcuts: svg('<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M7 10h.01M10.5 10h.01M14 10h.01M17.5 10h.01M8 14h8"/>'),
  about: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>'),
  signout: svg('<path d="M14.5 8V6a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2"/><path d="M10 12h10M17 9l3 3-3 3"/>', 16),
  lock: svg('<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>', 16),
  check: svg('<path d="m6 12.5 4 4L18 8"/>', 14),
};
const DISCORD = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.86-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .09.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42Z"/></svg>`;
const GITHUB = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"/></svg>`;
const LEETCODE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M13.48 0a1.37 1.37 0 0 0-.96.44L7.12 6.22l-2.68 2.87a5.27 5.27 0 0 0-1.38 2.94 5.3 5.3 0 0 0 .07 1.8 5.2 5.2 0 0 0 .62 1.6c.25.42.56.81.92 1.15l4.4 4.53a5.7 5.7 0 0 0 7.95.12l2.4-2.36a1.38 1.38 0 1 0-1.93-1.97l-2.4 2.36a2.96 2.96 0 0 1-4.1-.06l-4.38-4.52a2.6 2.6 0 0 1-.66-1.27 2.5 2.5 0 0 1 .05-1.21 2.4 2.4 0 0 1 .61-1.07l3.88-4.15 4.97-5.33A1.37 1.37 0 0 0 13.48 0Zm-2.87 13.24a1.38 1.38 0 1 0 0 2.75h9.74a1.38 1.38 0 1 0 0-2.75Z"/></svg>`;

type Auth = { hasAccount: boolean; signedIn: boolean; name: string; since: number };
let auth: Auth = { hasAccount: false, signedIn: false, name: '', since: 0 };
let config: any = {};

const sw = (on: boolean, attrs: string) => `<button type="button" class="ds-switch${on ? ' on' : ''}" ${attrs} role="switch" aria-checked="${on}"><i></i></button>`;
const row = (title: string, sub: string, control: string) => `<div class="ds-row"><div class="ds-row-text"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>${control}</div>`;
const card = (title: string, body: string, note = '') => `<section class="ds-card">${title ? `<h3>${title}</h3>` : ''}<div class="ds-card-body">${body}</div>${note ? `<p class="ds-note">${note}</p>` : ''}</section>`;
const head = (title: string, sub: string) => `<header class="ds-head"><h2>${title}</h2><p>${sub}</p></header>`;

// ── Account gate ────────────────────────────────────────────────────────────
function paintGate() {
  let gate = $('#ds-gate');
  if (auth.signedIn) { gate?.remove(); document.body.classList.remove('ds-locked'); return; }
  document.body.classList.add('ds-locked');
  if (!gate) { gate = document.createElement('div'); gate.id = 'ds-gate'; document.body.appendChild(gate); }
  const create = !auth.hasAccount;
  gate.innerHTML = `<form class="ds-auth" data-auth="${create ? 'create' : 'signin'}">
    <img src="${overlayMark}" alt="" class="ds-auth-mark"/>
    <h1>${create ? 'Create your Overlay account' : `Welcome back${auth.name ? `, ${esc(auth.name)}` : ''}`}</h1>
    <p>${create ? 'It lives on this PC only. Your password protects the Dashboard and the notch.' : 'Enter your password to unlock Overlay.'}</p>
    ${create ? '<input name="name" placeholder="Your name" autocomplete="name" maxlength="40" required/>' : ''}
    <input name="password" type="password" placeholder="${create ? 'Choose a password' : 'Password'}" autocomplete="${create ? 'new-password' : 'current-password'}" required/>
    ${create ? '<input name="confirm" type="password" placeholder="Repeat the password" autocomplete="new-password" required/>' : ''}
    <button class="ds-btn primary" type="submit">${create ? 'Create account' : 'Unlock'}</button>
    <span class="ds-err" data-auth-err></span>
  </form>`;
  setTimeout(() => $<HTMLInputElement>('#ds-gate input')?.focus(), 50);
}
document.addEventListener('submit', async (e) => {
  const form = (e.target as HTMLElement).closest<HTMLFormElement>('form[data-auth]');
  if (!form) return;
  e.preventDefault();
  const data = new FormData(form);
  const err = $('[data-auth-err]', form)!;
  const password = String(data.get('password') || '');
  let res: any;
  if (form.dataset.auth === 'create') {
    if (password !== String(data.get('confirm') || '')) { err.textContent = 'The two passwords are different.'; return; }
    res = await invoke('auth:create', { name: String(data.get('name') || ''), password });
  } else {
    res = await invoke('auth:signin', { password });
  }
  if (!res?.ok) { err.textContent = res?.error || 'That did not work.'; form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); return; }
  auth = res.state;
  paintGate();
  paintProfile();
});

// ── Profile, at the foot of the sidebar ─────────────────────────────────────
export function profileHtml() {
  const initial = esc((auth.name || 'O').trim().charAt(0).toUpperCase());
  return `<div class="ds-profile" id="ds-profile">
    <button type="button" class="ds-profile-btn" data-profile-toggle>
      <span class="ds-avatar">${initial}</span>
      <span class="ds-profile-text"><b>${esc(auth.name || 'Overlay')}</b><small>Signed in on this PC</small></span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 14 5-5 5 5"/></svg>
    </button>
    <div class="ds-menu" data-profile-menu hidden>
      <button type="button" data-nav-go="account">${SET_ICONS.lock}<span>Account and password</span></button>
      <button type="button" data-signout>${SET_ICONS.signout}<span>Sign out</span></button>
    </div>
  </div>`;
}
function paintProfile() {
  const el = $('#ds-profile');
  if (el) el.outerHTML = profileHtml();
}
document.addEventListener('click', async (e) => {
  const t = e.target as HTMLElement;
  const menu = $('[data-profile-menu]');
  if (t.closest('[data-profile-toggle]')) { if (menu) menu.hidden = !menu.hidden; return; }
  if (menu && !t.closest('[data-profile-menu]')) menu.hidden = true;
  if (t.closest('[data-signout]')) { auth = await invoke('auth:signout'); paintGate(); }
  const go = t.closest<HTMLElement>('[data-nav-go]');
  if (go) { (document.querySelector(`.nav-item[data-nav="${go.dataset.navGo}"]`) as HTMLElement | null)?.click(); if (menu) menu.hidden = true; }
});

// ── Pages ───────────────────────────────────────────────────────────────────
export const SETTINGS_PAGES = ['connections', 'general', 'notch', 'media', 'shortcuts', 'about', 'account'];

async function paintGeneral(el: HTMLElement) {
  const login = !!(await invoke('login-item:get'));
  el.innerHTML = `<div class="ds-page">${head('General', 'How Overlay starts and how long a focus session runs.')}
    ${card('Startup', row('Open at sign-in', 'Start Overlay when you sign in to Windows.', sw(login, 'data-login')))}
    ${card('Focus', row('Session length', 'Used by Lock In in the notch.', `<select class="ds-select" data-cfg-num="pomodoroDuration">${[15, 25, 45, 50, 60, 90].map((m) => `<option value="${m}"${(config.pomodoroDuration || 25) === m ? ' selected' : ''}>${m} min</option>`).join('')}</select>`))}
  </div>`;
}

const ACCENTS = ['#3d6bff', '#0027c4', '#8b5cf6', '#ec4899', '#ff5a4e', '#ff9f43', '#facc15', '#32d27a', '#14b8a6', '#e5e5e5'];
function paintNotch(el: HTMLElement) {
  const on = (k: string, d = true) => (config[k] === undefined ? d : config[k] !== false);
  const accent = config.accent || '#3d6bff';
  const water = Number(config.waterEvery ?? 30);
  el.innerHTML = `<div class="ds-page">${head('Notch', 'Choose what the notch shows, what it reminds you of and its colour.')}
    ${card('Closed notch', [
      row('Greeting and messages', 'Good morning with your name, reminders and updates, in the middle.', sw(on('idleGreeting'), 'data-cfg="idleGreeting"')),
      row('What you are working in', 'Your AI tool while you code, with its limits. Browser tools in a browser.', sw(on('idleContext'), 'data-cfg="idleContext"')),
      row('Clock', '', sw(on('idleClock'), 'data-cfg="idleClock"')),
      row('GitHub', 'Contributions today. Set your name under Connections.', sw(on('idleGithub', false), 'data-cfg-def="0" data-cfg="idleGithub"')),
      row('Discord', 'A dot that turns green in a call.', sw(on('idleDiscord', false), 'data-cfg-def="0" data-cfg="idleDiscord"')),
    ].join(''))}
    ${card('Live activities', [
      row('Now Playing', 'The song and its controls.', sw(on('showMedia'), 'data-cfg="showMedia"')),
      row('Focus timer', 'Lock In, right in the notch.', sw(on('showTimer'), 'data-cfg="showTimer"')),
      row('Calendar', 'Today and your next event.', sw(on('showCalendar'), 'data-cfg="showCalendar"')),
      row('Battery', 'Charge and the charging state.', sw(on('showBattery'), 'data-cfg="showBattery"')),
    ].join(''))}
    ${card('Reminders', row('Drink water', 'A gentle line in the notch and a quiet notification.', `<select class="ds-select" data-cfg-num="waterEvery">${[[0, 'Off'], [30, 'Every 30 min'], [45, 'Every 45 min'], [60, 'Every hour'], [90, 'Every 90 min']].map(([v, l]) => `<option value="${v}"${water === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`))}
    ${card('Colour', `<div class="ds-swatches">${ACCENTS.map((c) => `<button type="button" class="ds-swatch${c === accent ? ' on' : ''}" data-accent="${c}" style="--c:${c}" title="${c}"></button>`).join('')}<label class="ds-swatch custom" title="Custom colour" style="--c:${esc(accent)}"><input type="color" value="${esc(accent)}" data-accent-pick/></label></div>`, 'Used for the notch highlights, progress and the line in the middle.')}
  </div>`;
}

function paintMedia(el: HTMLElement) {
  const src = config.mediaSource || 'now_playing';
  const opt = (v: string, label: string) => `<option value="${v}"${src === v ? ' selected' : ''}>${label}</option>`;
  el.innerHTML = `<div class="ds-page">${head('Media', 'Where Now Playing reads the song from.')}
    ${card('Source', row('Music source', 'Any player that Windows shows in its media controls, or one app only.', `<select class="ds-select" data-cfg-str="mediaSource">${opt('now_playing', 'Any player')}${opt('spotify', 'Spotify')}${opt('apple_music', 'Apple Music')}${opt('youtube', 'YouTube')}</select>`))}
  </div>`;
}

function paintShortcuts(el: HTMLElement) {
  const list: any[] = config.shortcuts || [];
  el.innerHTML = `<div class="ds-page">${head('Shortcuts', 'Keys that work anywhere, and the apps and sites the notch can open.')}
    ${card('Keyboard', [row('Show or hide the notch', '', '<kbd>Alt</kbd><kbd>Space</kbd>'), row('Lock In', '', '<kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>F</kbd>')].join(''))}
    ${card('Launch shortcuts', (list.map((s, i) => row(esc(s.name), esc(s.target), `<button type="button" class="ds-btn ghost" data-sc-del="${i}">Remove</button>`)).join('') || '<p class="ds-empty">No shortcuts yet.</p>') +
      `<form class="ds-inline" data-sc-add><input name="name" placeholder="Name, like Chrome" required/><input name="target" placeholder="Path or https:// address" required/><button class="ds-btn" type="submit">Add</button></form>`)}
  </div>`;
}

async function paintAbout(el: HTMLElement) {
  const version = (await invoke('get-app-version')) || '';
  el.innerHTML = `<div class="ds-page">${head('About', 'Overlay for Windows.')}
    ${card('', `<div class="ds-about"><img src="${overlayMark}" alt=""/><div><b>Overlay</b><span>Version ${esc(version)}</span></div><button type="button" class="ds-btn" data-update>Check for updates</button></div><p class="ds-note" data-update-note></p>`)}
  </div>`;
}

function paintAccount(el: HTMLElement) {
  el.innerHTML = `<div class="ds-page">${head('Account', 'Your Overlay account is stored on this PC only.')}
    ${card('Profile', `<form class="ds-inline" data-rename><input name="name" value="${esc(auth.name)}" maxlength="40" required/><button class="ds-btn" type="submit">Save name</button></form>`, auth.since ? `Created ${new Date(auth.since).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.` : '')}
    ${card('Password', `<form class="ds-stack" data-password><input name="current" type="password" placeholder="Current password" autocomplete="current-password" required/><input name="next" type="password" placeholder="New password, 6 characters or more" autocomplete="new-password" required/><div class="ds-inline-end"><span class="ds-err" data-pw-msg></span><button class="ds-btn" type="submit">Change password</button></div></form>`)}
    ${card('Session', row('Sign out', 'Locks the Dashboard and the notch until you sign in again.', `<button type="button" class="ds-btn danger" data-signout>Sign out</button>`))}
  </div>`;
}

// ── Connections: Discord, GitHub, LeetCode ──────────────────────────────────
let dc: any = null;
async function paintConnections(el: HTMLElement) {
  dc = dc || (await invoke('discord:state')) || { status: 'setup' };
  const gh = String((await invoke('get-setting', 'githubUser', '')) || '');
  const lc = String((await invoke('get-setting', 'leetcodeUser', '')) || '');
  const dcStatus: Record<string, [string, string]> = {
    setup: ['Not set up', ''], connecting: ['Connecting', 'wait'], authorize: ['Approve in Discord', 'wait'],
    ready: ['Connected', 'ok'], closed: ['Discord is closed', 'wait'], error: ['Problem', 'bad'],
  };
  const [dcLabel, dcTone] = dcStatus[dc.status] || ['', ''];
  const discordBody = dc.status === 'setup' || dc.status === 'error'
    ? `<p class="ds-note">Create an application at the Discord Developer Portal. Under OAuth2, add <code>http://localhost</code> as a redirect, then paste the Client ID and Client Secret here. The secret is encrypted on this PC.</p>
       <form class="ds-grid2" data-dc-setup><input name="id" placeholder="Client ID" inputmode="numeric" autocomplete="off" required/><input name="secret" type="password" placeholder="Client Secret" autocomplete="off" required/>
       <div class="ds-inline-end"><button type="button" class="ds-btn ghost" data-dc-portal>Open the portal</button><button class="ds-btn primary" type="submit">Connect Discord</button></div></form>
       ${dc.error ? `<p class="ds-err">${esc(dc.error)}</p>` : ''}`
    : row(dc.user ? `Signed in as ${esc(dc.user.name)}` : 'Discord', dc.status === 'ready' ? (dc.channel ? `In ${esc(dc.channel.name)} now` : 'Calls show up in the notch with who is talking.') : dc.status === 'authorize' ? 'Discord is asking you to approve Overlay.' : 'Open Discord and Overlay connects by itself.',
        `<div class="ds-actions"><button type="button" class="ds-btn ghost" data-dc-retry>Reconnect</button><button type="button" class="ds-btn ghost" data-dc-forget>Disconnect</button></div>`);
  el.innerHTML = `<div class="ds-page">${head('Connections', 'Link the accounts the notch shows. Everything is read on this PC.')}
    <section class="ds-card ds-conn">
      <div class="ds-conn-head"><span class="ds-conn-logo dc">${DISCORD}</span><div><b>Discord</b><span>Voice calls: who is talking, mute, deafen and leave.</span></div><em class="ds-status ${dcTone}">${dcLabel}</em></div>
      <div class="ds-card-body">${discordBody}</div>
    </section>
    <section class="ds-card ds-conn">
      <div class="ds-conn-head"><span class="ds-conn-logo gh">${GITHUB}</span><div><b>GitHub</b><span>Today's contributions and your streak.</span></div><em class="ds-status ${gh ? 'ok' : ''}">${gh ? 'Connected' : 'Not set up'}</em></div>
      <div class="ds-card-body"><form class="ds-inline" data-link="githubUser"><input name="user" value="${esc(gh)}" placeholder="GitHub username" spellcheck="false" autocomplete="off"/><button type="button" class="ds-btn ghost" data-gh-detect>Use my gh login</button><button class="ds-btn primary" type="submit">Save</button></form><p class="ds-note" data-gh-note></p></div>
    </section>
    <section class="ds-card ds-conn">
      <div class="ds-conn-head"><span class="ds-conn-logo lc">${LEETCODE}</span><div><b>LeetCode</b><span>Solved problems and your daily streak.</span></div><em class="ds-status ${lc ? 'ok' : ''}">${lc ? 'Connected' : 'Not set up'}</em></div>
      <div class="ds-card-body"><form class="ds-inline" data-link="leetcodeUser"><input name="user" value="${esc(lc)}" placeholder="LeetCode username" spellcheck="false" autocomplete="off"/><button class="ds-btn primary" type="submit">Save</button></form><p class="ds-note" data-lc-note></p></div>
    </section>
  </div>`;
  if (gh) void invoke('links:github', gh).then((r: any) => {
    const note = $('[data-gh-note]', el);
    if (!note || !r || r.error) return;
    const today = (r.days || []).slice(-1)[0];
    note.textContent = `${today?.count || 0} contributions today · ${r.total ?? ''}${r.total != null ? ' this year' : ''}`.replace(/ · $/, '');
  });
}

// ── Mount ───────────────────────────────────────────────────────────────────
const painters: Record<string, (el: HTMLElement) => void | Promise<void>> = {
  connections: paintConnections, general: paintGeneral, notch: paintNotch, media: paintMedia, shortcuts: paintShortcuts, about: paintAbout, account: paintAccount,
};
export async function paintSettings(page: string) {
  const el = document.getElementById(`panel-${page}`);
  const fn = painters[page];
  if (el && fn) await fn(el);
}
const repaintActive = () => {
  const active = document.querySelector<HTMLElement>('.panel.active');
  const page = active?.id.replace('panel-', '') || '';
  if (painters[page]) void paintSettings(page);
};
const saveConfig = () => send('save-config', config);

export async function mountSettings() {
  // Outside the app (a plain browser preview) there is no account to check.
  auth = (await invoke('auth:state')) || (ipc ? auth : { hasAccount: true, signedIn: true, name: 'Preview', since: Date.now() });
  config = (await invoke('get-config')) || {};
  paintGate();
  paintProfile();
  ipc?.on('auth-changed', (_e: unknown, s: Auth) => { auth = s; paintGate(); paintProfile(); });
  ipc?.on('discord:state', (_e: unknown, s: any) => { dc = s; if ($('#panel-connections.active')) void paintSettings('connections'); });
  ipc?.on('update-status', (_e: unknown, s: any) => {
    const note = $('[data-update-note]');
    if (!note) return;
    note.textContent = s.event === 'checking' ? 'Checking…' : s.event === 'not-available' ? 'You have the latest version.' : s.event === 'available' ? `Version ${s.version} is downloading.` : s.event === 'downloaded' ? 'The update is ready. It installs when Overlay restarts.' : s.event === 'error' ? 'Could not check for updates.' : '';
  });

  document.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const cfgSw = t.closest<HTMLElement>('.ds-switch[data-cfg]');
    if (cfgSw) { const k = cfgSw.dataset.cfg!; const cur = config[k] === undefined ? cfgSw.dataset.cfgDef !== '0' : config[k] !== false; config[k] = !cur; saveConfig(); repaintActive(); return; }
    const acc = t.closest<HTMLElement>('[data-accent]');
    if (acc) { config.accent = acc.dataset.accent; saveConfig(); repaintActive(); return; }
    if (t.closest('.ds-switch[data-login]')) { await invoke('login-item:set', !t.closest('.ds-switch')!.classList.contains('on')); repaintActive(); return; }
    const del = t.closest<HTMLElement>('[data-sc-del]');
    if (del) { const list = [...(config.shortcuts || [])]; list.splice(Number(del.dataset.scDel), 1); config.shortcuts = list; send('save-shortcuts', list); saveConfig(); repaintActive(); return; }
    if (t.closest('[data-update]')) { const n = $('[data-update-note]'); if (n) n.textContent = 'Checking…'; send('check-for-updates'); return; }
    if (t.closest('[data-dc-portal]')) { void invoke('discord:portal'); return; }
    if (t.closest('[data-dc-retry]')) { void invoke('discord:retry'); return; }
    if (t.closest('[data-dc-forget]')) { dc = await invoke('discord:forget').then(() => invoke('discord:state')); repaintActive(); return; }
    if (t.closest('[data-gh-detect]')) {
      const login = await invoke('links:github-login');
      const input = $<HTMLInputElement>('form[data-link="githubUser"] input');
      const note = $('[data-gh-note]');
      if (login && input) input.value = login; else if (note) note.textContent = 'The GitHub CLI is not signed in on this PC.';
    }
  });
  document.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement;
    if (t.matches('[data-cfg-num]')) { const k = t.dataset.cfgNum!; config[k] = Number(t.value); saveConfig(); if (k === 'pomodoroDuration') send('set-setting', 'pomodoro-duration', t.value); }
    if (t.matches('[data-cfg-str]')) { config[t.dataset.cfgStr!] = t.value; saveConfig(); }
    if (t.matches('[data-accent-pick]')) { config.accent = t.value; saveConfig(); repaintActive(); }
  });
  document.addEventListener('submit', async (e) => {
    const form = e.target as HTMLFormElement;
    if (form.matches('[data-auth]')) return;
    e.preventDefault();
    const data = new FormData(form);
    if (form.matches('[data-sc-add]')) {
      const name = String(data.get('name') || '').trim(), target = String(data.get('target') || '').trim();
      if (!name || !target) return;
      let iconUrl = '';
      if (/^https?:/i.test(target)) { try { iconUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${new URL(target).hostname}&size=128`; } catch {} }
      else iconUrl = (await invoke('get-file-icon', target)) || '';
      config.shortcuts = [...(config.shortcuts || []), { name, target, iconUrl }];
      send('save-shortcuts', config.shortcuts);
      saveConfig();
      repaintActive();
    }
    if (form.matches('[data-dc-setup]')) {
      const r = await invoke('discord:setup', { clientId: String(data.get('id') || ''), secret: String(data.get('secret') || '') });
      if (r && !r.ok) { dc = { ...(dc || {}), status: 'setup', error: r.error }; repaintActive(); }
    }
    if (form.matches('[data-link]')) {
      const key = form.dataset.link!;
      send('set-setting', key, String(data.get('user') || '').trim());
      setTimeout(repaintActive, 120);
    }
    if (form.matches('[data-rename]')) { const r = await invoke('auth:rename', String(data.get('name') || '')); if (r?.ok) { auth = r.state; paintProfile(); } }
    if (form.matches('[data-password]')) {
      const r = await invoke('auth:password', { current: String(data.get('current') || ''), next: String(data.get('next') || '') });
      const msg = $('[data-pw-msg]', form);
      if (msg) { msg.textContent = r?.ok ? 'Password changed.' : r?.error || 'That did not work.'; msg.classList.toggle('ok', !!r?.ok); }
      if (r?.ok) form.reset();
    }
  });
}
