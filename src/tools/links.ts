// GitHub, Discord and LeetCode on the notch. Same graphite surface and Instrument Sans as the other tools.

type Invoke = (ch: string, ...a: any[]) => Promise<any>;
type Send = (ch: string, ...a: any[]) => void;

export const marks = {
  github: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
  discord: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286ZM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189Zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>`,
  leetcode: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/></svg>`,
};

const SHADES = ['rgba(255,255,255,0.07)', '#16224f', '#1d3aa6', '#3d6bff', '#8fa8ff'];
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type Day = { date: string; count: number; level: number };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function todayKey() {
  return iso(new Date());
}

function columns(days: Day[], weeks = 22): (Day | null)[][] {
  const by = new Map(days.map((d) => [d.date, d]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = today.getTime();
  const sunday = end - today.getDay() * 86400000;
  const cols: (Day | null)[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const col: (Day | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const t = sunday - w * 7 * 86400000 + d * 86400000;
      if (t > end) { col.push(null); continue; }
      const date = iso(new Date(t));
      col.push(by.get(date) || { date, count: 0, level: 0 });
    }
    cols.push(col);
  }
  return cols;
}

function streakOf(days: Day[]) {
  const on = new Set(days.filter((d) => d.count > 0 || d.level > 0).map((d) => d.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let t = today.getTime();
  if (!on.has(iso(new Date(t)))) t -= 86400000;
  let n = 0;
  while (on.has(iso(new Date(t)))) { n += 1; t -= 86400000; }
  return n;
}

function heat(days: Day[]) {
  return `<div class="link-heat" aria-hidden="true">${columns(days).map((col) =>
    `<div class="link-col">${col.map((d) => d
      ? `<i style="background:${SHADES[Math.max(0, Math.min(4, d.level))]}" title="${d.count} on ${d.date}"></i>`
      : '<i class="empty"></i>').join('')}</div>`).join('')}</div>`;
}

const COPY: Record<string, string> = {
  name: 'Use the public name, with no @.',
  missing: 'That name is not on the site.',
  parse: 'The calendar could not be read. Try again in a moment.',
  failed: 'The site did not answer.',
  offline: 'No connection.',
};

export function mountLinks(opts: { invoke: Invoke; send: Send; on?: (ch: string, fn: (...a: any[]) => void) => void }) {
  const { invoke, send, on } = opts;
  const ghEl = document.querySelector<HTMLElement>('[data-space="github"]')!;
  const dcEl = document.querySelector<HTMLElement>('[data-space="discord"]')!;
  const lcEl = document.querySelector<HTMLElement>('[data-space="leetcode"]')!;
  const ghCount = document.getElementById('gh-idle-count');
  const lcCount = document.getElementById('lc-idle-count');
  const dcDot = document.getElementById('dc-idle-dot');

  let githubUser = 'pradhan-not-found';
  let leetUser = '';
  let sample: DcState | null = null;
  let real: DcState | null = null;
  let dc: DcState = { status: 'setup', user: null, channel: null, members: [], self: { mute: false, deaf: false }, error: '' };
  let ghData: any = null;
  let lcData: any = null;

  const setting = async (key: string, fallback: string) => {
    try {
      const v = await invoke('get-setting', key, fallback);
      return typeof v === 'string' ? v : fallback;
    } catch { return fallback; }
  };

  function paintIdle() {
    if (ghCount) {
      const today = ghData && !ghData.error ? (ghData.days as Day[]).find((d) => d.date === todayKey()) : null;
      ghCount.textContent = today && today.count ? String(today.count) : '';
    }
    if (lcCount) {
      lcCount.textContent = lcData && !lcData.error && lcData.streak ? String(lcData.streak) : '';
    }
    if (dcDot) {
      dcDot.classList.toggle('on', dc.status === 'ready' && !!dc.channel);
      dcDot.classList.toggle('talk', dc.members.some((m) => m.speaking));
    }
  }

  function userForm(kind: string, value: string, placeholder: string) {
    return `<form class="link-user" data-form="${kind}">
      <input data-name value="${esc(value)}" placeholder="${esc(placeholder)}" spellcheck="false" autocomplete="off" maxlength="39"/>
      <button class="btn btn-g" type="submit">Save</button>
    </form>`;
  }

  function renderGithub() {
    if (!ghEl) return;
    const err = ghData && ghData.error;
    const body = !githubUser
      ? `<p class="link-lead">Add your GitHub name. Overlay reads the public calendar only, then opens the profile in your browser.</p>`
      : err
        ? `<p class="link-lead">${COPY[err] || COPY.failed}</p>`
        : !ghData
          ? `<p class="link-lead">Reading the public calendar…</p>`
          : (() => {
              const days = ghData.days as Day[];
              const today = days.find((d) => d.date === todayKey());
              return `<div class="link-top">
                <img class="link-avatar" alt="" src="https://github.com/${esc(ghData.user)}.png?size=64" width="36" height="36"/>
                <div class="link-id"><b>${esc(ghData.user)}</b><span>Public contributions</span></div>
                <button class="btn btn-p" data-open="github" type="button">Open</button>
              </div>
              <div class="link-stats">
                <div><b>${Number(ghData.total || 0).toLocaleString()}</b><span>This year</span></div>
                <div><b>${today ? today.count : 0}</b><span>Today</span></div>
                <div><b>${streakOf(days)}d</b><span>Streak</span></div>
              </div>
              ${heat(days)}`;
            })();
    ghEl.innerHTML = `<div class="link-panel">${body}${userForm('github', githubUser, 'GitHub name')}</div>`;
  }

  // Voice call, through Discord's own app on this PC (see electron/discord.cjs).
  function renderDiscord() {
    if (!dcEl) return;
    if (sample) dc = sample;
    const head = (sub: string, chip = '') => `<div class="link-top">
        <span class="link-badge dc">${marks.discord}</span>
        <div class="link-id"><b>${dc.channel ? esc(dc.channel.name) : 'Discord'}</b><span>${sub}</span></div>
        ${chip}
      </div>`;

    if (dc.status === 'setup') {
      dcEl.innerHTML = `<div class="link-panel">
        ${head('Your voice call, right in the notch')}
        <p class="link-lead">Create an app in the Discord Developer Portal, add <b>http://localhost</b> as a redirect under OAuth2, then paste its Client ID and Secret. The secret is encrypted on this PC.</p>
        <form class="dc-setup" data-dc-setup>
          <input name="id" placeholder="Client ID" inputmode="numeric" spellcheck="false" autocomplete="off"/>
          <input name="secret" type="password" placeholder="Client Secret" spellcheck="false" autocomplete="off"/>
          <button class="btn btn-p" type="submit">Connect</button>
          <button class="btn btn-g" type="button" data-dc="portal">Open the portal</button>
        </form>
        <button class="dc-link" type="button" data-dc="sample">See a sample call</button>
        ${dc.error ? `<p class="dc-err">${esc(dc.error)}</p>` : ''}
      </div>`;
      return;
    }

    if (dc.status !== 'ready') {
      const copy: Record<string, string> = {
        connecting: 'Connecting to Discord…',
        authorize: 'Approve Overlay in the Discord window',
        closed: 'Discord is not running',
        error: dc.error || 'Discord did not answer',
      };
      dcEl.innerHTML = `<div class="link-panel">
        ${head(esc(copy[dc.status] || ''), `<span class="chip">${dc.status === 'authorize' ? 'Waiting' : dc.status === 'connecting' ? 'Connecting' : 'Offline'}</span>`)}
        <div class="link-actions">
          ${dc.status === 'closed' ? '<button class="btn btn-p" data-open="discord" type="button">Open Discord</button>' : ''}
          <button class="btn btn-g" data-dc="retry" type="button">Try again</button>
          <button class="btn btn-g" data-dc="forget" type="button">Change app</button>
        </div>
      </div>`;
      return;
    }

    if (!dc.channel) {
      dcEl.innerHTML = `<div class="link-panel">
        ${head(`Signed in as ${esc(dc.user?.name || 'you')}`, '<span class="chip live">Connected</span>')}
        <div class="dc-empty">
          <span class="dc-empty-ico">${marks.discord}</span>
          <b>Not in a call</b>
          <span>Join a voice channel and it shows up here, with who is talking.</span>
          <button class="dc-link" type="button" data-dc="sample">See a sample call</button>
        </div>
      </div>`;
      return;
    }

    const initials = (n: string) => esc(n.trim().slice(0, 1).toUpperCase() || '?');
    const people = dc.members.map((m) => `<div class="dc-person${m.speaking ? ' speaking' : ''}" title="${esc(m.name)}">
        <span class="dc-av">${m.avatar ? `<img src="${esc(m.avatar)}" alt="" onerror="this.remove()"/>` : ''}<i>${initials(m.name)}</i>
          ${m.deaf ? `<em class="dc-flag">${ICON.deaf}</em>` : m.mute ? `<em class="dc-flag">${ICON.micOff}</em>` : ''}
        </span>
        <small>${esc(m.name)}</small>
      </div>`).join('');
    const talking = dc.members.filter((m) => m.speaking).map((m) => m.name);
    dcEl.innerHTML = `<div class="link-panel">
      ${sample ? '<span class="dc-sample">Sample call · nothing here is real</span>' : ''}
      ${head(esc(dc.channel.guild ? `${dc.channel.guild} · ${dc.members.length} in call` : `${dc.members.length} in call`), `<span class="dc-eq${talking.length ? ' on' : ''}"><i></i><i></i><i></i><i></i></span>`)}
      <div class="dc-people">${people}</div>
      <div class="dc-bar">
        <span class="dc-talk">${talking.length ? `${esc(talking.slice(0, 2).join(', '))}${talking.length > 2 ? ` +${talking.length - 2}` : ''} talking` : 'Quiet'}</span>
        <button class="dc-btn${dc.self.mute ? ' on' : ''}" data-dc="mute" type="button" title="${dc.self.mute ? 'Unmute' : 'Mute'}">${dc.self.mute ? ICON.micOff : ICON.mic}</button>
        <button class="dc-btn${dc.self.deaf ? ' on' : ''}" data-dc="deaf" type="button" title="${dc.self.deaf ? 'Undeafen' : 'Deafen'}">${dc.self.deaf ? ICON.deaf : ICON.head}</button>
        <button class="dc-btn leave" data-dc="leave" type="button" title="Leave call">${ICON.hang}</button>
      </div>
    </div>`;
  }

  function renderLeet() {
    if (!lcEl) return;
    const err = lcData && lcData.error;
    const body = !leetUser
      ? `<p class="link-lead">Add your LeetCode name. Overlay reads the public streak and solved counts.</p>`
      : err
        ? `<p class="link-lead">${COPY[err] || COPY.failed}</p>`
        : !lcData
          ? `<p class="link-lead">Reading the public profile…</p>`
          : `<div class="link-top">
              <span class="link-badge lc">${marks.leetcode}</span>
              <div class="link-id"><b>${esc(lcData.user)}</b><span>Public practice</span></div>
              <button class="btn btn-p" data-open="leetcode" type="button">Open</button>
            </div>
            <div class="link-stats">
              <div><b>${Number(lcData.solved || 0).toLocaleString()}</b><span>Solved</span></div>
              <div><b>${lcData.streak}d</b><span>Streak</span></div>
              <div><b>${Number(lcData.active || 0).toLocaleString()}</b><span>Active days</span></div>
            </div>
            <div class="link-pills">
              <span class="chip">Easy ${lcData.easy}</span>
              <span class="chip">Medium ${lcData.medium}</span>
              <span class="chip">Hard ${lcData.hard}</span>
            </div>
            ${heat(lcData.days || [])}`;
    lcEl.innerHTML = `<div class="link-panel">${body}${userForm('leetcode', leetUser, 'LeetCode name')}</div>`;
  }

  async function loadGithub() {
    if (!githubUser) { ghData = null; renderGithub(); paintIdle(); return; }
    ghData = null;
    renderGithub();
    ghData = await invoke('links:github', githubUser) || { error: 'failed' };
    renderGithub();
    paintIdle();
  }

  async function loadLeet() {
    if (!leetUser) { lcData = null; renderLeet(); paintIdle(); return; }
    lcData = null;
    renderLeet();
    lcData = await invoke('links:leetcode', leetUser) || { error: 'failed' };
    renderLeet();
    paintIdle();
  }

  async function loadDiscord() {
    const res = await invoke('discord:state').catch(() => null);
    if (res) { real = res; if (!sample) dc = res; }
    renderDiscord();
    paintIdle();
  }

  function bind(root: HTMLElement, kind: 'github' | 'discord' | 'leetcode') {
    root.addEventListener('submit', (e) => {
      const form = (e.target as HTMLElement).closest('form[data-form]');
      if (!form) return;
      e.preventDefault();
      e.stopPropagation();
      const value = (form.querySelector('input')?.value || '').trim();
      if (kind === 'github') { githubUser = value; send('set-setting', 'githubUser', value); void loadGithub(); }
      if (kind === 'leetcode') { leetUser = value; send('set-setting', 'leetcodeUser', value); void loadLeet(); }
    });
    root.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-open]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const open = btn.dataset.open;
      if (open === 'github') void invoke('links:open', { kind: 'github', user: githubUser });
      if (open === 'leetcode') void invoke('links:open', { kind: 'leetcode', user: leetUser });
      if (open === 'discord') void invoke('links:open', { kind: 'discord' });
    });
  }

  bind(ghEl, 'github');
  bind(dcEl, 'discord');
  bind(lcEl, 'leetcode');
  renderGithub();
  renderDiscord();
  renderLeet();

  void (async () => {
    githubUser = (await setting('githubUser', '')).trim();
    if (!githubUser) {
      const detected = await invoke('links:github-login');
      if (typeof detected === 'string' && detected.trim()) {
        githubUser = detected.trim();
        send('set-setting', 'githubUser', githubUser);
      }
    }
    leetUser = (await setting('leetcodeUser', '')).trim();
    renderGithub();
    renderDiscord();
    renderLeet();
    void loadGithub();
    void loadDiscord();
    if (leetUser) void loadLeet();
  })();

  on?.('discord:state', (_e: unknown, next: DcState) => { real = next; if (!sample) { dc = next; renderDiscord(); paintIdle(); } });
  // The sample's speakers take turns, so the view moves like a real call.
  setInterval(() => {
    if (!sample) return;
    const turn = Math.floor(Math.random() * sample.members.length);
    sample = { ...sample, members: sample.members.map((m, n) => ({ ...m, speaking: n === turn && !m.mute })) };
    renderDiscord();
    paintIdle();
  }, 1400);
  dcEl.addEventListener('submit', (e) => {
    const form = (e.target as HTMLElement).closest<HTMLFormElement>('form[data-dc-setup]');
    if (!form) return;
    e.preventDefault();
    e.stopPropagation();
    const data = new FormData(form);
    void invoke('discord:setup', { clientId: String(data.get('id') || ''), secret: String(data.get('secret') || '') }).then((r) => {
      if (r && !r.ok) { dc = { ...dc, error: r.error }; renderDiscord(); }
    });
  });
  dcEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-dc]');
    if (!btn) return;
    e.stopPropagation();
    const act = btn.dataset.dc;
    if (act === 'sample') { real = dc; sample = sampleCall(); renderDiscord(); paintIdle(); return; }
    if (sample) {
      if (act === 'mute') sample = { ...sample, self: { ...sample.self, mute: !sample.self.mute } };
      if (act === 'deaf') sample = { ...sample, self: { ...sample.self, deaf: !sample.self.deaf } };
      if (act === 'leave') { sample = null; if (real) dc = real; }
      renderDiscord();
      paintIdle();
      return;
    }
    if (act === 'mute') void invoke('discord:mute');
    if (act === 'deaf') void invoke('discord:deaf');
    if (act === 'leave') void invoke('discord:leave');
    if (act === 'retry') void invoke('discord:retry');
    if (act === 'forget') void invoke('discord:forget');
    if (act === 'portal') void invoke('discord:portal');
  });

  return {
    onSpace(name: string) {
      if (name === 'github') void loadGithub();
      if (name === 'discord') void loadDiscord();
      if (name === 'leetcode') void loadLeet();
    },
  };
}



type DcMember = { id: string; name: string; avatar: string; mute: boolean; deaf: boolean; speaking: boolean };
type DcState = {
  status: 'setup' | 'connecting' | 'authorize' | 'ready' | 'closed' | 'error';
  user: { id: string; name: string } | null;
  channel: { id: string; name: string; guild: string } | null;
  members: DcMember[];
  self: { mute: boolean; deaf: boolean };
  error: string;
};

const svg = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),
  micOff: svg('<path d="M15 9.5V6a3 3 0 0 0-5.6-1.5M9 9v2a3 3 0 0 0 4.6 2.5M5.5 11a6.5 6.5 0 0 0 10.3 5.3M18.5 11a6.5 6.5 0 0 1-.6 2.7M12 17.5V21M3.5 3.5l17 17"/>'),
  head: svg('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3.5" y="13.5" width="4.5" height="7" rx="2"/><rect x="16" y="13.5" width="4.5" height="7" rx="2"/>'),
  deaf: svg('<path d="M4 14v-2a8 8 0 0 1 12.5-6.6M20 12v2"/><rect x="3.5" y="13.5" width="4.5" height="7" rx="2"/><path d="M16 16v2.5a2 2 0 0 0 2 2h.5a2 2 0 0 0 2-2v-3M3.5 3.5l17 17"/>'),
  hang: svg('<path d="M3.2 14.6c-.6-.6-.6-1.6.1-2.2 4.9-4.3 12.5-4.3 17.4 0 .7.6.7 1.6.1 2.2l-1.6 1.6c-.5.5-1.3.6-1.9.2l-2-1.3c-.5-.3-.7-.8-.7-1.4V12a11 11 0 0 0-5.2 0v1.7c0 .6-.3 1.1-.7 1.4l-2 1.3c-.6.4-1.4.3-1.9-.2Z"/>'),
};

function sampleCall(): DcState {
  const m = (id: string, name: string, extra: Partial<DcMember> = {}): DcMember => ({ id, name, avatar: '', mute: false, deaf: false, speaking: false, ...extra });
  return {
    status: 'ready',
    user: { id: '0', name: 'You' },
    channel: { id: 'sample', name: 'Design sync', guild: 'Studio' },
    members: [m('1', 'Ava'), m('2', 'Kabir'), m('3', 'Mina', { mute: true }), m('4', 'Leo'), m('5', 'You')],
    self: { mute: false, deaf: false },
    error: '',
  };
}
