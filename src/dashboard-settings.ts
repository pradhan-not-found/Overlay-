// Settings, connections and the account, inside the one Dashboard. Every
// switch here does something; nothing is decorative.
import overlayMark from './assets/overlay-mark.png';
import { aiMark, aiName } from './assets/ai-logos';
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
// LeetCode's own mark: the orange bracket and the grey bar
const LEETCODE = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#FFA116" d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0z"/><path fill="#B3B3B3" d="M10.617 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/></svg>`;

type Auth = { hasAccount: boolean; signedIn: boolean; name: string; avatar?: string; since: number };
let auth: Auth = { hasAccount: false, signedIn: false, name: '', avatar: '', since: 0 };
let draftAvatar = '';
let config: any = {};

const sw = (on: boolean, attrs: string) => `<button type="button" class="ds-switch${on ? ' on' : ''}" ${attrs} role="switch" aria-checked="${on}"><i></i></button>`;
const row = (title: string, sub: string, control: string) => `<div class="ds-row"><div class="ds-row-text"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>${control}</div>`;
const card = (title: string, body: string, note = '') => `<section class="ds-card">${title ? `<h3>${title}</h3>` : ''}<div class="ds-card-body">${body}</div>${note ? `<p class="ds-note">${note}</p>` : ''}</section>`;
/** The page header every Dashboard page uses: a title, one plain line, and an optional action on the right. */
export const head = (title: string, sub: string, action = '') => `<header class="ds-head${action ? ' has-action' : ''}"><div><h2>${title}</h2><p>${sub}</p></div>${action}</header>`;

// ── Account gate: brand panel on the left, the form on the right ────────────
// Shrinks a picked photo to a 192 px square so it stays small in the database.
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 192, c = document.createElement('canvas');
        c.width = size; c.height = size;
        const g = c.getContext('2d')!;
        const k = Math.max(size / img.width, size / img.height);
        g.drawImage(img, (size - img.width * k) / 2, (size - img.height * k) / 2, img.width * k, img.height * k);
        resolve(c.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = () => reject(new Error('That file is not an image.'));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
export function avatarHtml(name: string, src: string | undefined, size: number) {
  const initials = esc(name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'O');
  return src ? `<img class="ds-avatar" src="${esc(src)}" alt="" style="width:${size}px;height:${size}px"/>` : `<span class="ds-avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px">${initials}</span>`;
}

async function paintGate() {
  let gate = $('#ds-gate');
  if (auth.signedIn) { gate?.remove(); document.body.classList.remove('ds-locked'); return; }
  document.body.classList.add('ds-locked');
  if (!gate) { gate = document.createElement('div'); gate.id = 'ds-gate'; document.body.appendChild(gate); }
  const create = !auth.hasAccount;
  const snap: any = create ? await invoke('count:snapshot').catch(() => null) : null;
  const found: string[] = [...new Set<string>((snap?.sources || []).map((x: any) => x.kind))];
  gate.innerHTML = `<div class="ds-gate-brand">
      <div class="ds-gate-logo"><img src="${overlayMark}" alt=""/><span>Overlay</span></div>
      <img class="ds-gate-mark" src="${overlayMark}" alt=""/>
      <div class="ds-gate-copy">
        <h2>Everything you reach for, at the top of the screen.</h2>
        <p>Music, focus, your calendar and every AI tool's limits, in a notch that opens on a click. It all stays on this PC.</p>
      </div>
    </div>
    <div class="ds-gate-side">
      <form class="ds-auth" data-auth="${create ? 'create' : 'signin'}">
        <h1>${create ? 'Welcome to Overlay' : 'Welcome back'}</h1>
        <p>${create ? 'Set up your profile. It stays on this device.' : 'Enter your password to unlock Overlay.'}</p>
        ${create ? `<div class="ds-auth-id">
            <label class="ds-avatar-pick" title="Add a photo">${avatarHtml('', draftAvatar, 64)}<span class="ds-avatar-plus">+</span><input type="file" accept="image/*" data-avatar-file hidden/></label>
            <div class="ds-field"><label>Your name</label><input name="name" placeholder="Your name" autocomplete="name" maxlength="40" required/></div>
          </div>` : `<div class="ds-auth-who">${avatarHtml(auth.name, auth.avatar, 56)}<b>${esc(auth.name)}</b></div>`}
        <div class="ds-field"><label>${create ? 'Password' : 'Password'}</label><input name="password" type="password" placeholder="${create ? 'At least 6 characters' : 'Your password'}" autocomplete="${create ? 'new-password' : 'current-password'}" required/></div>
        ${create ? '<div class="ds-field"><label>Repeat the password</label><input name="confirm" type="password" placeholder="Same again" autocomplete="new-password" required/></div>' : ''}
        ${create ? `<div class="ds-found"><span>${found.length ? 'Found on this PC' : 'No AI tools found yet'}</span><div>${found.map((k) => `<em title="${esc(aiName(k))}">${aiMark(k, 15)}</em>`).join('')}</div></div>` : ''}
        <button class="ds-btn primary" type="submit">${create ? 'Continue' : 'Unlock'}</button>
        <span class="ds-err" data-auth-err></span>
      </form>
    </div>`;
  setTimeout(() => $<HTMLInputElement>('#ds-gate input[name="name"], #ds-gate input[name="password"]')?.focus(), 50);
}
document.addEventListener('change', async (e) => {
  const t = e.target as HTMLInputElement;
  if (!t.matches('[data-avatar-file]') || !t.files?.[0]) return;
  try {
    const src = await shrink(t.files[0]);
    if (t.closest('#ds-gate')) {
      draftAvatar = src;
      const pick = t.closest('.ds-avatar-pick');
      pick?.querySelector('.ds-avatar')?.replaceWith(Object.assign(document.createElement('img'), { className: 'ds-avatar', src, style: 'width:64px;height:64px' }));
    } else {
      const r = await invoke('auth:avatar', src);
      if (r?.ok) { auth = r.state; paintProfile(); repaintActiveSoon(); }
    }
  } catch (err) {
    const box = $('[data-auth-err]') || $('[data-pw-msg]');
    if (box) box.textContent = err instanceof Error ? err.message : 'Could not use that image.';
  }
});
document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (!t.matches?.('.pf-name input')) return;
  const btn = t.form?.querySelector<HTMLButtonElement>('button');
  if (btn) btn.hidden = !t.value.trim() || t.value.trim() === auth.name;
});
document.addEventListener('click', (e) => {
  const go = (e.target as HTMLElement).closest<HTMLElement>('[data-scroll="password"]');
  if (go) setTimeout(() => document.getElementById('pf-password')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
});
let repaintActiveSoon = () => {};
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
    res = await invoke('auth:create', { name: String(data.get('name') || ''), password, avatar: draftAvatar });
  } else {
    res = await invoke('auth:signin', { password });
  }
  if (!res?.ok) { err.textContent = res?.error || 'That did not work.'; form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); return; }
  auth = res.state;
  void paintGate();
  paintProfile();
});

// ── Profile, at the foot of the sidebar ─────────────────────────────────────
export function profileHtml() {
  return `<div class="ds-profile" id="ds-profile">
    <button type="button" class="ds-profile-btn" data-profile-toggle>
      ${avatarHtml(auth.name || 'Overlay', auth.avatar, 32)}
      <span class="ds-profile-text"><b>${esc(auth.name || 'Overlay')}</b><small>Signed in to this PC</small></span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 14 5-5 5 5"/></svg>
    </button>
    <div class="ds-menu" data-profile-menu hidden>
      <button type="button" data-nav-go="account">${svg('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5"/>')}<span>Profile</span></button>
      <button type="button" data-nav-go="account" data-scroll="password">${SET_ICONS.lock}<span>Password</span></button>
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
  if (t.closest('[data-signout]')) { auth = await invoke('auth:signout'); void paintGate(); }
  if (t.closest('[data-avatar-clear]')) { const r = await invoke('auth:avatar', ''); if (r?.ok) { auth = r.state; paintProfile(); repaintActiveSoon(); } }
  const go = t.closest<HTMLElement>('[data-nav-go]');
  if (go) { (document.querySelector(`.nav-item[data-nav="${go.dataset.navGo}"]`) as HTMLElement | null)?.click(); if (menu) menu.hidden = true; }
});

// ── Pages ───────────────────────────────────────────────────────────────────
function paintUpdateBadge() {
  const item = document.querySelector('.nav-item[data-nav="about"]');
  if (!item) return;
  item.classList.toggle('has-update', upd.event === 'downloaded' || upd.event === 'available' || upd.event === 'downloading');
}
export const SETTINGS_PAGES = ['connections', 'general', 'notch', 'media', 'shortcuts', 'about', 'account'];

/** A row of choices, like the notch's own length picker. */
function seg(key: string, values: number[], current: number, unit: string) {
  return `<div class="ds-seg" role="radiogroup" data-seg="${key}">${values.map((v) => `<button type="button" role="radio" aria-checked="${v === current}" data-seg-val="${v}"><b>${v}</b><small>${unit}</small></button>`).join('')}</div>`;
}
async function paintGeneral(el: HTMLElement) {
  const login = !!(await invoke('login-item:get'));
  el.innerHTML = `<div class="ds-page">${head('General', 'How Overlay starts and how long a focus session runs.')}
    ${card('Startup', row('Launch at startup', 'Open Overlay every time you sign in to Windows. Turn it off and it stays off.', sw(login, 'data-login')))}
    ${card('Lock In', [
      `<div class="ds-row ds-row-stack"><div class="ds-row-text"><b>Session length</b><span>How long one focus session runs. You can also change it in the notch.</span></div>${seg('pomodoroDuration', [15, 25, 45, 60, 90], Number(config.pomodoroDuration) || 25, 'min')}</div>`,
      `<div class="ds-row ds-row-stack"><div class="ds-row-text"><b>Break</b><span>The short rest after each session.</span></div>${seg('breakMinutes', [5, 10, 15], Number(config.breakMinutes) || 5, 'min')}</div>`,
    ].join(''))}
  </div>`;
}

const ACCENTS: [string, string][] = [['#3d6bff', 'Blue'], ['#0027c4', 'Royal'], ['#8b5cf6', 'Violet'], ['#ec4899', 'Pink'], ['#ff5a4e', 'Red'], ['#ff9f43', 'Orange'], ['#facc15', 'Yellow'], ['#32d27a', 'Green'], ['#14b8a6', 'Teal'], ['#e5e5e5', 'White']];
const DEFAULT_ACCENT = '#3d6bff';
const validHex = (v: unknown) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
/** The colour card: swatches with a tick, a custom colour, and a live preview of the notch. */
function colourCard(accent: string) {
  const preset = ACCENTS.find(([c]) => c.toLowerCase() === accent.toLowerCase());
  const tick = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  return `<div class="ds-colour" style="--pick:${esc(accent)}">
    <div class="ds-preview" aria-hidden="true">
      <div class="ds-prev-notch"><span class="ds-prev-glass"></span><b>18:04</b><em>Focus</em><i class="ds-prev-bar"><i></i></i><span class="ds-prev-dot"></span></div>
      <div class="ds-prev-meta"><b data-accent-name>${esc(preset ? preset[1] : 'Custom')}</b><span data-accent-hex>${esc(accent.toUpperCase())}</span>${accent.toLowerCase() !== DEFAULT_ACCENT ? '<button type="button" class="ds-link" data-accent-reset>Reset</button>' : ''}</div>
    </div>
    <div class="ds-swatches" role="radiogroup" aria-label="Accent colour">
      ${ACCENTS.map(([c, name]) => `<button type="button" role="radio" aria-checked="${c === preset?.[0]}" class="ds-swatch${c === preset?.[0] ? ' on' : ''}${c === '#e5e5e5' ? ' light' : ''}" data-accent="${c}" style="--c:${c}" title="${name}">${tick}</button>`).join('')}
      <label class="ds-swatch custom${preset ? '' : ' on'}" title="Custom colour" style="--c:${esc(accent)}">${preset ? '' : tick}<input type="color" value="${esc(accent)}" data-accent-pick aria-label="Custom colour"/></label>
    </div>
  </div>`;
}
function paintNotch(el: HTMLElement) {
  const on = (k: string, d = true) => (config[k] === undefined ? d : config[k] !== false);
  const accent = validHex(config.accent) ? config.accent : DEFAULT_ACCENT;
  const water = Number(config.waterEvery ?? 30);
  el.innerHTML = `<div class="ds-page">${head('Notch', 'Choose what the notch shows, what it reminds you of and its colour.')}
    ${card('Closed notch', [
      row('Open on hover', 'Rest the pointer on the notch to open it; move away to close.', sw(on('openOnHover'), 'data-cfg="openOnHover"')),
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
    ${card('Colour', colourCard(accent), 'Used across the notch and the Dashboard: highlights, progress bars, Lock In and switches.')}
  </div>`;
}

function paintMedia(el: HTMLElement) {
  const src = config.mediaSource || 'now_playing';
  const SOURCES: [string, string, string][] = [
    ['now_playing', 'Any player', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>'],
    ['spotify', 'Spotify', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1DB954"/><path d="M7 9.6c3.4-1 7.2-.7 10.2.9M7.6 12.6c2.8-.8 5.8-.5 8.3.8M8.2 15.4c2.2-.6 4.4-.4 6.3.6" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>'],
    ['apple_music', 'Apple Music', '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5.5" fill="#FA2D48"/><path d="M15.5 6.5v8.2a2 2 0 1 1-1.4-1.9V8.6l-4.3 1v6.2a2 2 0 1 1-1.4-1.9V8.3z" fill="#fff"/></svg>'],
    ['youtube', 'YouTube', '<svg viewBox="0 0 24 24"><rect x="1.5" y="5" width="21" height="14" rx="4" fill="#FF0033"/><path d="m10 9 5 3-5 3z" fill="#fff"/></svg>'],
  ];
  el.innerHTML = `<div class="ds-page">${head('Media', 'Where Now Playing reads the song from.')}
    ${card('Source', `<div class="ds-row ds-row-stack"><div class="ds-row-text"><b>Music source</b><span>Any player Windows shows in its media controls, or just one app.</span></div>
      <div class="ds-seg wide" role="radiogroup" data-seg-str="mediaSource">${SOURCES.map(([v, label, ico]) => `<button type="button" role="radio" aria-checked="${src === v}" data-seg-str-val="${v}">${ico}<span>${label}</span></button>`).join('')}</div></div>`)}
  </div>`;
}

let scAdding: '' | 'app' | 'site' = '';
async function paintShortcuts(el: HTMLElement) {
  const list: any[] = config.shortcuts || [];
  const keys: { id: string; accel: string; label: string; ok: boolean }[] = (await invoke('hotkeys:state')) || [
    { id: 'toggle', accel: 'Alt+Space', label: 'Open or close the notch', ok: true },
    { id: 'lockin', accel: 'Control+Shift+F', label: 'Start or pause Lock In', ok: true },
  ];
  const kbd = (accel: string) => accel.split('+').map((k) => `<kbd>${esc(k === 'Control' ? 'Ctrl' : k)}</kbd>`).join('<i class="sc-plus">+</i>');
  const host = (t: string) => { try { return new URL(t).hostname.replace(/^www\./, ''); } catch { return ''; } };
  const where = (t: string) => /^https?:/i.test(t) ? host(t) : t.split(/[\\/]/).pop() || t;
  const tile = (s: any, i: number) => `<div class="sc-tile" title="${esc(s.target)}">
      <span class="sc-ico">${s.iconUrl ? `<img src="${esc(s.iconUrl)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('b'),{textContent:'${esc((s.name || '?').charAt(0).toUpperCase())}'}))"/>` : `<b>${esc((s.name || '?').charAt(0).toUpperCase())}</b>`}</span>
      <span class="sc-text"><b>${esc(s.name)}</b><small>${esc(where(s.target))}</small></span>
      <button type="button" class="sc-del" data-sc-del="${i}" title="Remove" aria-label="Remove ${esc(s.name)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </div>`;
  const addPanel = scAdding === 'site'
    ? `<form class="sc-add-form" data-sc-add><input name="target" placeholder="https://example.com" required autofocus/><input name="name" placeholder="Name (optional)"/><button class="ds-btn primary" type="submit">Add site</button><button class="ds-btn ghost" type="button" data-sc-cancel>Cancel</button></form>`
    : '';
  el.innerHTML = `<div class="ds-page">${head('Shortcuts', 'Keys that work anywhere, and the apps and sites the notch opens in one click.')}
    ${card('Keyboard', keys.map((k) => `<div class="ds-row"><div class="ds-row-text"><b>${esc(k.label)}</b><span>${k.ok ? 'Works in any app.' : 'Another app already uses these keys, so Overlay could not take them.'}</span></div><span class="sc-keys${k.ok ? '' : ' off'}">${kbd(k.accel)}</span></div>`).join(''))}
    ${card('Apps and sites', `<div class="sc-grid">${list.map(tile).join('')}
        <button type="button" class="sc-tile sc-new" data-sc-new="app"><span class="sc-ico"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg></span><span class="sc-text"><b>Add an app</b><small>Pick it from your PC</small></span></button>
        <button type="button" class="sc-tile sc-new" data-sc-new="site"><span class="sc-ico"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 2.6 14.6 0 17M12 3.5c-2.6 2.4-2.6 14.6 0 17"/></svg></span><span class="sc-text"><b>Add a website</b><small>Paste its address</small></span></button>
      </div>${addPanel}`, 'The first five show as buttons in the open notch, and the first three in the closed notch.')}
  </div>`;
  if (scAdding === 'site') (el.querySelector('[data-sc-add] input[name="target"]') as HTMLInputElement | null)?.focus();
}

// ── Updates ─────────────────────────────────────────────────────────────────
let upd: any = { event: 'idle' };
function updateBody() {
  const ago = (t: number) => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };
  const e = upd.event;
  const status: [string, string, string] =
    e === 'checking' ? ['Checking for updates…', '', 'wait']
    : e === 'available' ? [`Overlay ${esc(upd.version)} is available`, upd.feature ? 'New features. Download it in the background, then restart once.' : 'A small fix, downloading in the background.', upd.feature ? 'ok' : 'wait']
    : e === 'downloading' ? [`Downloading ${esc(upd.version || 'the update')}`, `${upd.percent ?? 0}% · ${upd.total ? `${(upd.transferred / 1048576).toFixed(1)} of ${(upd.total / 1048576).toFixed(1)} MB` : ''}`, 'wait']
    : e === 'downloaded' ? [`Overlay ${esc(upd.version)} is ready`, 'Restart now, or it installs by itself when you step away.', 'ok']
    : e === 'error' ? ['Could not check for updates', 'Check your connection and try again.', 'bad']
    : upd.dev ? ['Running from source', 'Updates install in the downloaded app, not in a development copy.', '']
    : ['You are up to date', upd.lastChecked ? `Checked ${ago(upd.lastChecked)}` : 'Overlay checks by itself every 5 minutes.', 'ok'];
  const bar = e === 'downloading' ? `<div class="ds-upd-bar"><i style="width:${upd.percent ?? 0}%"></i></div>` : '';
  const action = e === 'downloaded'
    ? `<button type="button" class="ds-btn primary" data-install>Restart and update</button>`
    : e === 'available' && upd.feature
    ? `<button type="button" class="ds-btn primary" data-download>Download</button>`
    : `<button type="button" class="ds-btn" data-update ${e === 'checking' || e === 'downloading' || e === 'available' ? 'disabled' : ''}>Check for updates</button>`;
  return `<div class="ds-upd"><span class="ds-upd-dot ${status[2]}"></span><div class="ds-row-text"><b>${status[0]}</b><span>${status[1]}</span></div>${action}</div>${bar}`;
}
async function paintAbout(el: HTMLElement) {
  const version = (await invoke('get-app-version')) || '';
  const st = await invoke('update:state');
  if (st) upd = { ...upd, ...st };
  el.innerHTML = `<div class="ds-page">${head('About', 'Overlay for Windows.')}
    ${card('', `<div class="ds-about"><img src="${overlayMark}" alt=""/><div><b>Overlay</b><span>Version ${esc(version)}</span></div><button type="button" class="ds-btn" data-whatsnew>What's new</button></div>`)}
    ${card('Updates', `<div data-upd>${updateBody()}</div>`, 'Updates download and install by themselves. The notch tells you when one is ready.')}
  </div>`;
}

function paintAccount(el: HTMLElement) {
  const since = auth.since ? new Date(auth.since).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  el.innerHTML = `<div class="ds-page">${head('Profile', 'Your name and photo. Everything is stored on this PC only.')}
    <section class="pf-card">
      <label class="pf-photo" title="Change photo">
        ${avatarHtml(auth.name, auth.avatar, 96)}
        <span class="pf-photo-edit"><svg viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3l1.4-2h5.6l1.4 2h1.3A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.4"/></svg></span>
        <input type="file" accept="image/png,image/jpeg,image/webp" data-avatar-file hidden/>
      </label>
      <div class="pf-main">
        <form class="pf-name" data-rename>
          <input name="name" value="${esc(auth.name)}" maxlength="40" required aria-label="Your name" spellcheck="false"/>
          <button class="ds-btn primary" type="submit" hidden>Save</button>
        </form>
        <p class="pf-meta">Signed in to this PC${since ? ` · since ${since}` : ''}</p>
        <div class="pf-actions">
          <label class="ds-btn">Change photo<input type="file" accept="image/png,image/jpeg,image/webp" data-avatar-file hidden/></label>
          ${auth.avatar ? '<button type="button" class="ds-btn ghost" data-avatar-clear>Remove photo</button>' : ''}
          <span class="pf-saved" data-pf-saved></span>
        </div>
      </div>
    </section>
    <div id="pf-password"></div>
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
    setup: ['Not connected', ''], unavailable: ['Unavailable', ''], connecting: ['Connecting', 'wait'], authorize: ['Approve in Discord', 'wait'],
    ready: ['Connected', 'ok'], closed: ['Discord is closed', 'wait'], error: ['Problem', 'bad'],
  };
  const [dcLabel, dcTone] = dcStatus[dc.status] || ['', ''];
  const discordBody = dc.status === 'unavailable'
    ? `<p class="ds-note">This copy of Overlay was built without Discord.</p>`
    : dc.status === 'setup' || dc.status === 'error'
    ? row('Connect with Discord', 'Discord opens and asks you to approve Overlay. Nothing to copy or paste.', `<button type="button" class="ds-btn primary" data-dc-connect>${DISCORD}<span>Connect</span></button>`) + (dc.error ? `<p class="ds-err">${esc(dc.error)}</p>` : '')
    : row(dc.user ? `Signed in as ${esc(dc.user.name)}` : 'Discord', dc.status === 'ready' ? (dc.channel ? `In ${esc(dc.channel.name)} now` : 'Calls show up in the notch with who is talking.') : dc.status === 'authorize' ? 'Approve Overlay in the Discord window.' : 'Open Discord and Overlay connects by itself.',
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

// The chosen colour: saved, sent to the notch, and used by the Dashboard itself.
function applyAccentHere(c: string) {
  document.documentElement.style.setProperty('--blue', c);
  document.documentElement.style.setProperty('--pick', c);
}
function setAccent(c: string) {
  if (!validHex(c)) return;
  config.accent = c;
  applyAccentHere(c);
  saveConfig();
  repaintActive();
}
// while the custom picker is open, preview without saving on every move
document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (!t.matches?.('[data-accent-pick]')) return;
  const box = t.closest<HTMLElement>('.ds-colour');
  box?.style.setProperty('--pick', t.value);
  (t.closest('.ds-swatch') as HTMLElement | null)?.style.setProperty('--c', t.value);
  const hex = box?.querySelector('[data-accent-hex]'); if (hex) hex.textContent = t.value.toUpperCase();
  const name = box?.querySelector('[data-accent-name]'); if (name) name.textContent = 'Custom';
  send('save-config', { accent: t.value });
});

export async function mountSettings() {
  // Outside the app (a plain browser preview) there is no account to check.
  auth = (await invoke('auth:state')) || (ipc ? auth : { hasAccount: !location.hash.includes('gate=create'), signedIn: !location.hash.includes('gate='), name: 'Souradeep', since: Date.now() });
  config = (await invoke('get-config')) || {};
  if (validHex(config.accent)) applyAccentHere(config.accent);
  await paintGate();
  paintProfile();
  ipc?.on('auth-changed', (_e: unknown, s: Auth) => { auth = s; void paintGate(); paintProfile(); });
  repaintActiveSoon = () => repaintActive();
  ipc?.on('discord:state', (_e: unknown, s: any) => { dc = s; if ($('#panel-connections.active')) void paintSettings('connections'); });
  ipc?.on('update-status', (_e: unknown, s: any) => {
    upd = { ...upd, ...s, lastChecked: s.event === 'not-available' || s.event === 'available' ? Date.now() : upd.lastChecked };
    const box = $('[data-upd]');
    if (box) box.innerHTML = updateBody();
    paintUpdateBadge();
  });
  void invoke('update:state').then((st: any) => { if (st) { upd = { ...upd, ...st }; paintUpdateBadge(); } });

  document.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const cfgSw = t.closest<HTMLElement>('.ds-switch[data-cfg]');
    if (cfgSw) { const k = cfgSw.dataset.cfg!; const cur = config[k] === undefined ? cfgSw.dataset.cfgDef !== '0' : config[k] !== false; config[k] = !cur; saveConfig(); repaintActive(); return; }
    const acc = t.closest<HTMLElement>('[data-accent]');
    if (acc) { setAccent(acc.dataset.accent!); return; }
    const strBtn = t.closest<HTMLElement>('[data-seg-str-val]');
    if (strBtn) {
      const key = strBtn.closest<HTMLElement>('[data-seg-str]')!.dataset.segStr!;
      config[key] = strBtn.dataset.segStrVal; saveConfig();
      strBtn.parentElement!.querySelectorAll('[data-seg-str-val]').forEach((b) => b.setAttribute('aria-checked', String(b === strBtn)));
      return;
    }
    const segBtn = t.closest<HTMLElement>('[data-seg-val]');
    if (segBtn) {
      const key = segBtn.closest<HTMLElement>('[data-seg]')!.dataset.seg!;
      const v = Number(segBtn.dataset.segVal);
      config[key] = v; saveConfig();
      if (key === 'pomodoroDuration') send('set-setting', 'focusMinutes', String(v));
      segBtn.parentElement!.querySelectorAll('[data-seg-val]').forEach((b) => b.setAttribute('aria-checked', String(b === segBtn)));
      return;
    }
    if (t.closest('[data-accent-reset]')) { setAccent(DEFAULT_ACCENT); return; }
    if (t.closest('.ds-switch[data-login]')) { await invoke('login-item:set', !t.closest('.ds-switch')!.classList.contains('on')); repaintActive(); return; }
    const scNew = t.closest<HTMLElement>('[data-sc-new]');
    if (scNew) {
      if (scNew.dataset.scNew === 'site') { scAdding = 'site'; repaintActive(); return; }
      const picked = await invoke('shortcut:pick-app');
      if (picked?.target) {
        const iconUrl = (await invoke('get-file-icon', picked.target)) || '';
        config.shortcuts = [...(config.shortcuts || []), { name: picked.name, target: picked.target, iconUrl }];
        send('save-shortcuts', config.shortcuts); saveConfig();
      }
      scAdding = ''; repaintActive(); return;
    }
    if (t.closest('[data-sc-cancel]')) { scAdding = ''; repaintActive(); return; }
    const del = t.closest<HTMLElement>('[data-sc-del]');
    if (del) { const list = [...(config.shortcuts || [])]; list.splice(Number(del.dataset.scDel), 1); config.shortcuts = list; send('save-shortcuts', list); saveConfig(); repaintActive(); return; }
    if (t.closest('[data-update]')) { upd = { ...upd, event: 'checking' }; const box = $('[data-upd]'); if (box) box.innerHTML = updateBody(); send('check-for-updates'); return; }
    if (t.closest('[data-install]')) { send('install-update'); return; }
    if (t.closest('[data-download]')) { send('download-update'); return; }
    if (t.closest('[data-whatsnew]')) { send('open-whats-new'); return; }
    if (t.closest('[data-dc-connect]')) { void invoke('discord:connect'); return; }
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
    if (t.matches('[data-accent-pick]')) setAccent(t.value);
  });
  document.addEventListener('submit', async (e) => {
    const form = e.target as HTMLFormElement;
    if (form.matches('[data-auth]')) return;
    e.preventDefault();
    const data = new FormData(form);
    if (form.matches('[data-sc-add]')) {
      let target = String(data.get('target') || '').trim();
      if (target && !/^[a-z]+:/i.test(target) && /\.[a-z]{2,}/i.test(target)) target = `https://${target}`;
      let name = String(data.get('name') || '').trim();
      if (!name) { try { const h = new URL(target).hostname.replace(/^www\./, ''); name = h.split('.')[0].replace(/^./, (c) => c.toUpperCase()); } catch { name = target; } }
      if (!target) return;
      scAdding = '';
      let iconUrl = '';
      if (/^https?:/i.test(target)) { try { iconUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${new URL(target).hostname}&size=128`; } catch {} }
      else iconUrl = (await invoke('get-file-icon', target)) || '';
      config.shortcuts = [...(config.shortcuts || []), { name, target, iconUrl }];
      send('save-shortcuts', config.shortcuts);
      saveConfig();
      repaintActive();
    }
    if (form.matches('[data-link]')) {
      const key = form.dataset.link!;
      send('set-setting', key, String(data.get('user') || '').trim());
      setTimeout(repaintActive, 120);
    }
    if (form.matches('[data-rename]')) {
      const r = await invoke('auth:rename', String(data.get('name') || ''));
      if (r?.ok) { auth = r.state; paintProfile(); const s = $('[data-pf-saved]'); if (s) { s.textContent = 'Name saved'; setTimeout(() => { s.textContent = ''; }, 2200); } }
      form.querySelector<HTMLButtonElement>('button')!.hidden = true;
      (document.activeElement as HTMLElement | null)?.blur();
    }
    if (form.matches('[data-password]')) {
      const r = await invoke('auth:password', { current: String(data.get('current') || ''), next: String(data.get('next') || '') });
      const msg = $('[data-pw-msg]', form);
      if (msg) { msg.textContent = r?.ok ? 'Password changed.' : r?.error || 'That did not work.'; msg.classList.toggle('ok', !!r?.ok); }
      if (r?.ok) form.reset();
    }
  });
}
