import { useEffect, useState } from 'react';
import './index.css';
import './notch.css';
import './pages.css';
import NotchDemo, { type Space } from './NotchDemo';
import changelog from 'virtual:changelog';
import { CLAUDE, DISCORD, GCAL, GITHUB, OPENAI, SPOTIFY } from './brand/marks';

// The source repo is private, so installers live in the public overlay-releases
// repo. GitHub's latest/download URL always points at the newest release and
// answers with an attachment, so the click starts the download straight away.
const WINDOWS = import.meta.env.VITE_DOWNLOAD_URL
  || 'https://github.com/pradhan-not-found/overlay-releases/releases/latest/download/Overlay-Setup.exe';

type View = 'home' | 'features' | 'pricing' | 'changelog' | 'privacy' | 'terms';

const NAV: { id: View; label: string }[] = [
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'changelog', label: 'Changelog' },
];

const Stroke = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const Mark = ({ m }: { m: { d: string; color: string } }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={m.d} fill={m.color} /></svg>
);
const ICON = {
  timer: 'M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM12 9.5v4l2.5 1.5M9.5 2.75h5',
  calendar: 'M6.5 4.5h11a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-10a3 3 0 0 1 3-3ZM8 2.75v3.5M16 2.75v3.5M3.5 9.5h17',
  clipboard: 'M8.5 4.5h7a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 18V7a2.5 2.5 0 0 1 2.5-2.5ZM9.5 10h5M9.5 13.5h5M9.5 17h3',
  chip: 'M8.5 6.5h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3',
  check: 'M12 20.25a8.25 8.25 0 1 0 0-16.5 8.25 8.25 0 0 0 0 16.5ZM8.5 12.25l2.4 2.4 4.6-4.9',
  music: 'M9 17.5V6.2a1 1 0 0 1 .78-.98l9-2a1 1 0 0 1 1.22.98V15.5M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM20 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  spark: 'M12 3.5 13.9 10l6.6 2-6.6 2L12 20.5 10.1 14 3.5 12l6.6-2Z',
  shield: 'M12 3.5 19 6v5.5c0 4.4-2.9 8-7 9-4.1-1-7-4.6-7-9V6Z',
};

const tint = (d: string, color: string) => <i className="tint" style={{ color }}><Stroke d={d} /></i>;
const EXTRA = {
  note: 'M14.5 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h10a2.5 2.5 0 0 0 2.5-2.5V9.5M18 3.5l2.5 2.5-7.5 7.5-3.25.75.75-3.25Z',
  weather: 'M9 5.25V4M4.6 7.1l-.9-.9M3.25 11.5H2M13.4 7.1l.9-.9M5.3 13.7a4 4 0 1 1 7.1-3.6M9.25 19.5h8.5a3.5 3.5 0 0 0 .4-6.98 5 5 0 0 0-9.6 1.35A2.85 2.85 0 0 0 9.25 19.5Z',
  globe: 'M12 20.25a8.25 8.25 0 1 0 0-16.5 8.25 8.25 0 0 0 0 16.5ZM3.75 12h16.5M12 3.75c2.3 2.3 3.4 5 3.4 8.25S14.3 17.95 12 20.25M12 3.75C9.7 6.05 8.6 8.75 8.6 12s1.1 5.95 3.4 8.25',
  calc: 'M7.5 3.5h9a2.5 2.5 0 0 1 2.5 2.5v12a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18V6a2.5 2.5 0 0 1 2.5-2.5ZM8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01',
  tray: 'M4 13.5 6.5 6a2 2 0 0 1 1.9-1.4h7.2A2 2 0 0 1 17.5 6l2.5 7.5M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z',
  pipette: 'M16 3.5a2.1 2.1 0 0 1 3 0l1.5 1.5a2.1 2.1 0 0 1 0 3L19 9.5 14.5 5ZM14.5 5l4.5 4.5-9.5 9.5H5v-4.5Z',
  search: 'M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM20 20l-4.4-4.4',
  terminal: 'M5.5 4.5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2ZM7.5 9.5l3 2.5-3 2.5M12.5 15h4',
};
const TAGS: { label: string; node: React.ReactNode }[] = [
  { label: 'Spotify, with live lyrics', node: <Mark m={SPOTIFY} /> },
  { label: 'Claude and ChatGPT limits', node: <span className="duo"><Mark m={CLAUDE} /><Mark m={{ ...OPENAI, color: '#0d0f16' }} /></span> },
  { label: 'Google Calendar, at a glance', node: <Mark m={GCAL} /> },
  { label: 'Clipboard history', node: tint(ICON.clipboard, '#14b8a6') },
  { label: 'Focus sessions', node: tint(ICON.timer, '#ff9f43') },
  { label: 'To-dos and notes', node: tint(ICON.check, '#10b981') },
  { label: 'GitHub activity', node: <Mark m={GITHUB} /> },
  { label: 'Discord, one click away', node: <Mark m={DISCORD} /> },
  { label: 'Weather and world clocks', node: tint(EXTRA.weather, '#0ea5e9') },
  { label: 'Calculator and converter', node: tint(EXTRA.calc, '#65a30d') },
  { label: 'A shelf for your files', node: tint(EXTRA.tray, '#f97316') },
  { label: 'Colour picker', node: tint(EXTRA.pipette, '#c026d3') },
  { label: 'App launcher', node: tint(EXTRA.search, '#ef4444') },
  { label: 'CPU, memory and GPU', node: tint(ICON.chip, '#3b82f6') },
];

const LINES = ['The notch, for Windows.', 'Your music, up top.', 'AI limits, at a glance.', 'Your day, in one place.', 'Focus, one click away.'];

/** Shows one item at a time; the previous one blurs out as the next blurs in. */
function Rotator({ index, render, className }: { index: number; render: (i: number) => React.ReactNode; className: string }) {
  const [shown, setShown] = useState({ cur: index, prev: -1 });
  useEffect(() => {
    setShown((s) => (s.cur === index ? s : { cur: index, prev: s.cur }));
    const t = window.setTimeout(() => setShown((s) => ({ ...s, prev: -1 })), 700);
    return () => window.clearTimeout(t);
  }, [index]);
  return (
    <div className={`rotator ${className}`}>
      {shown.prev >= 0 && <div className="rot-item out" key={`p${shown.prev}`}>{render(shown.prev)}</div>}
      <div className="rot-item in" key={`c${shown.cur}`}>{render(shown.cur)}</div>
    </div>
  );
}

/** Cycles through items on a timer. */
function useCycle(length: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((v) => (v + 1) % length), ms);
    return () => window.clearInterval(t);
  }, [length, ms]);
  return i;
}

function WindowsMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M0 3.449 9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  );
}

// The installer lives in the public overlay-releases repository. Ask GitHub
// whether a release exists, so the button never promises a file that is not there.
type Release = { state: 'checking' } | { state: 'ready'; url: string; version: string; size: number } | { state: 'none' };
let releaseCache: Promise<Release> | null = null;
function latestRelease(): Promise<Release> {
  if (import.meta.env.VITE_DOWNLOAD_URL) return Promise.resolve({ state: 'ready', url: WINDOWS, version: '', size: 0 });
  releaseCache ||= fetch('https://api.github.com/repos/pradhan-not-found/overlay-releases/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((rel): Release => {
      const asset = rel?.assets?.find((a: { name: string }) => /\.exe$/i.test(a.name));
      return asset ? { state: 'ready', url: asset.browser_download_url, version: String(rel.tag_name || '').replace(/^v/, ''), size: asset.size } : { state: 'none' };
    })
    .catch((): Release => ({ state: 'none' }));
  return releaseCache;
}
function useRelease() {
  const [rel, setRel] = useState<Release>({ state: 'checking' });
  useEffect(() => { let live = true; void latestRelease().then((r) => live && setRel(r)); return () => { live = false; }; }, []);
  return rel;
}

function Download({ wide = false }: { wide?: boolean }) {
  const rel = useRelease();
  const [clicked, setClicked] = useState(false);
  const ready = rel.state === 'ready';
  const mb = ready && rel.size ? `${Math.round(rel.size / 1048576)} MB` : '';
  return (
    <div className={`dl-wrap${wide ? ' wide' : ''}`}>
      {ready ? (
        <a className={`download${wide ? ' wide' : ''}`} href={rel.url} rel="noopener" onClick={() => setClicked(true)}>
          <WindowsMark />Download for Windows
        </a>
      ) : (
        <span className={`download soon${wide ? ' wide' : ''}`} aria-disabled="true">
          <WindowsMark />{rel.state === 'checking' ? 'Download for Windows' : 'Coming soon for Windows'}
        </span>
      )}
      <p className={`dl-note${clicked || rel.state === 'none' || (ready && (rel.version || mb)) ? ' show' : ''}`} aria-live="polite">
        {clicked ? 'Downloading Overlay-Setup.exe. Open it when it finishes.'
          : rel.state === 'none' ? 'The first Windows build is on its way.'
          : ready ? [rel.version && `Version ${rel.version}`, mb, 'Windows 10 and 11'].filter(Boolean).join(' · ') : ''}
      </p>
    </div>
  );
}

const FEATURES: { title: string; body: string; logo: React.ReactNode }[] = [
  { title: 'Now Playing', body: 'The song, its cover and the line being sung, from Spotify or any player. Play, skip and set the volume without leaving your work.', logo: <Mark m={SPOTIFY} /> },
  { title: 'AI Usage', body: 'Session and weekly limits for Claude Code, Codex and Cursor, read on your PC. When one runs low, carry on in another with your context.', logo: <span className="duo"><Mark m={CLAUDE} /><Mark m={{ ...OPENAI, color: '#0d0f16' }} /></span> },
  { title: 'Calendar', body: 'Your next event and the day ahead from Google Calendar, a glance away.', logo: <Mark m={GCAL} /> },
  { title: 'Focus', body: 'A Lock In timer with breaks, streaks and a week of history, right in the notch.', logo: tint(ICON.timer, '#ff9f43') },
  { title: 'Discord', body: 'Your voice call in the notch: who is speaking, with mute, deafen and hang up.', logo: <Mark m={DISCORD} /> },
  { title: 'GitHub', body: 'Today\'s contributions and your streak, without opening a browser.', logo: <Mark m={GITHUB} /> },
  { title: 'To-Dos and Note', body: 'A short list and a scratch note that stay in sync with the Dashboard.', logo: tint(ICON.check, '#10b981') },
  { title: 'Clipboard', body: 'The last things you copied, kept in memory only and never written to disk.', logo: tint(ICON.clipboard, '#14b8a6') },
  { title: 'Weather and Clocks', body: 'The forecast where you are and the time where your team is.', logo: tint(EXTRA.weather, '#0ea5e9') },
  { title: 'Calculator', body: 'Sums and unit conversions as you type, with a short history.', logo: tint(EXTRA.calc, '#65a30d') },
  { title: 'Shelf and Launcher', body: 'Park files to drag out later, and open any app by typing its name.', logo: tint(EXTRA.search, '#ef4444') },
  { title: 'Hardware', body: 'CPU, memory, GPU, disk and network, live while the notch is open.', logo: tint(ICON.chip, '#3b82f6') },
];

// Folder covers: [cover, text, back sheet, middle sheet].
const COVERS: [string, string, string, string][] = [
  ['#1ed760', '#06240f', '#0d0f16', '#f1f2f4'],
  ['#d97757', '#fff', '#2b2f3a', '#f3d9cc'],
  ['#0027c4', '#fff', '#ffcf3f', '#e7ebff'],
  ['#ffd23f', '#2a2100', '#ff6b3d', '#fff6d6'],
  ['#5865f2', '#fff', '#0d0f16', '#dfe2ff'],
  ['#14171f', '#fff', '#1ed760', '#d7dae1'],
  ['#ffb3d9', '#4a0f2c', '#e8175d', '#fff'],
  ['#e9ecef', '#14171f', '#14b8a6', '#fff'],
  ['#38bdf8', '#04263a', '#0d0f16', '#e3f6ff'],
  ['#c6f432', '#1d2600', '#14171f', '#f6ffd6'],
  ['#ff5a4e', '#fff', '#ffd23f', '#ffe1de'],
  ['#2e3440', '#fff', '#3b82f6', '#dfe3ea'],
];

// Changelog lines get the logo of the thing they are about.
const LOGO_RULES: [RegExp, string, React.ReactNode][] = [
  [/spotify|song|music|lyric|player|playing/i, 'music', <Mark m={SPOTIFY} />],
  [/claude/i, 'claude', <Mark m={CLAUDE} />],
  [/codex|gpt|openai|chatgpt/i, 'openai', <Mark m={{ ...OPENAI, color: '#0d0f16' }} />],
  [/\bai\b|usage|limit|session|context|handoff|token/i, 'ai', tint(ICON.spark, '#6366f1')],
  [/calendar|event|agenda/i, 'cal', <Mark m={GCAL} />],
  [/discord|voice|call/i, 'discord', <Mark m={DISCORD} />],
  [/\bgit\b|contribution|streak/i, 'github', <Mark m={GITHUB} />],
  [/focus|timer|lock in|pomodoro/i, 'focus', tint(ICON.timer, '#ff9f43')],
  [/to-?do|task/i, 'todo', tint(ICON.check, '#10b981')],
  [/\bnote/i, 'note', tint(EXTRA.note, '#f59e0b')],
  [/clipboard|copied|copy/i, 'clip', tint(ICON.clipboard, '#14b8a6')],
  [/weather|forecast/i, 'weather', tint(EXTRA.weather, '#0ea5e9')],
  [/clock|time ?zone|world/i, 'globe', tint(EXTRA.globe, '#ec4899')],
  [/calc|convert/i, 'calc', tint(EXTRA.calc, '#65a30d')],
  [/shelf|drag/i, 'tray', tint(EXTRA.tray, '#f97316')],
  [/colou?r|picker|pipette/i, 'colour', tint(EXTRA.pipette, '#a855f7')],
  [/launch|search/i, 'search', tint(EXTRA.search, '#ef4444')],
  [/terminal|shell/i, 'term', tint(EXTRA.terminal, '#0d0f16')],
  [/cpu|gpu|memory|hardware|battery|charg|disk|network/i, 'chip', tint(ICON.chip, '#3b82f6')],
  [/dashboard|sync|stor|history/i, 'dash', tint(ICON.calendar, '#0027c4')],
  [/privacy|secure|safe|local/i, 'shield', tint(ICON.shield, '#0d0f16')],
];
const FALLBACK_LOGO = { key: 'spark', node: tint(ICON.spark, '#0027c4') };
// "a, b and c" → ["A", "B", "C"], for the checklist in each release shot.
function splitTitle(t: string, points: string[] = []) {
  const out = t.split(/,\s*|\s+and\s+/i).map((x) => x.trim()).filter(Boolean).map(sentence);
  // A one-line title borrows short phrases from its notes, so every picture has a few items.
  for (const pt of points) {
    if (out.length >= 4) break;
    const short = pt.split(/[:;,.]|\s+-\s+/)[0].split(/\s+/).slice(0, 5).join(' ');
    if (short && !out.includes(sentence(short))) out.push(sentence(short));
  }
  return out.slice(0, 6);
}
function sentence(t: string) { return t.charAt(0).toUpperCase() + t.slice(1); }
function logoFor(text: string) {
  const r = LOGO_RULES.find(([re]) => re.test(text));
  return r ? { key: r[1], node: r[2] } : FALLBACK_LOGO;
}

const PLANS = [
  { name: 'Basic', price: '$0', per: '/forever', note: 'Everything you need to start, free for everyone.', items: ['The notch and Now Playing', 'Focus timer and Today', 'To-Dos, Note and Clipboard', 'Hardware'], cta: 'Download' },
  { name: 'Pro', price: '$49', per: '/year', note: 'For people who live in AI tools all day.', items: ['Everything in Basic', 'AI Usage for every tool', 'One-click handoff between tools', 'Synced lyrics', 'Priority updates'], cta: 'Download', featured: true },
  { name: 'Lifetime', price: '$149', per: '/once', note: 'Pay once and keep every update.', items: ['Everything in Pro', 'Every future update', 'Early builds'], cta: 'Download' },
];

// ── Release pictures ────────────────────────────────────────────────────
// Each release gets one of three scenes, picked from what it is about, and
// never the same scene twice in a row.
type ShotKind = 'list' | 'notch' | 'chart';
const SHOT_ORDER: ShotKind[] = ['notch', 'list', 'chart'];
function shotKinds(titles: string[]): ShotKind[] {
  const out: ShotKind[] = [];
  titles.forEach((t, k) => {
    let kind: ShotKind =
      /\bai\b|usage|limit|dashboard|history|stat|chart/i.test(t) ? 'chart'
      : /notch|player|music|song|lyric|zoom|island/i.test(t) ? 'notch'
      : SHOT_ORDER[k % SHOT_ORDER.length];
    if (k > 0 && out[k - 1] === kind) kind = SHOT_ORDER[(SHOT_ORDER.indexOf(kind) + 1 + (k % 3)) % SHOT_ORDER.length];
    if (k > 0 && out[k - 1] === kind) kind = SHOT_ORDER[(SHOT_ORDER.indexOf(kind) + 1) % SHOT_ORDER.length];
    out.push(kind);
  });
  return out;
}
function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;
}

function Shot({ kind, items, version, when, seed }: { kind: ShotKind; items: string[]; version: string; when: string; seed: string }) {
  const rnd = seeded(seed);
  const list = items.length ? items : ['Polish'];

  if (kind === 'notch') {
    const start: Space = /\bai\b|usage|limit|claude|codex/i.test(seed) ? 'ai'
      : /calendar|today|event/i.test(seed) ? 'today'
      : /focus|timer/i.test(seed) ? 'focus'
      : /to-?do/i.test(seed) ? 'todos'
      : /hardware|battery|cpu/i.test(seed) ? 'hardware'
      : (['media', 'ai', 'today', 'hardware', 'focus', 'todos'] as Space[])[Math.floor(rnd() * 6)];
    return (
      <figure className="rel-shot shot-notch">
        <div className="display shot-display">
          <div className="wall" aria-hidden="true" />
          <NotchDemo open start={start} onOpen={() => {}} onClose={() => {}} />
        </div>
      </figure>
    );
  }

  if (kind === 'chart') {
    const bars = Array.from({ length: 14 }, () => 0.25 + rnd() * 0.75);
    const pct = 55 + Math.round(rnd() * 40);
    const r = 34, circ = 2 * Math.PI * r;
    return (
      <figure className="rel-shot shot-chart" aria-hidden="true">
        <div className="sc-card">
          <div className="sc-top"><img src="/mark.png" alt="" /><b>Dashboard</b><span>{when}</span></div>
          <div className="sc-body">
            <svg className="sc-bars" viewBox="0 0 420 160" preserveAspectRatio="none">
              {[40, 80, 120].map((y) => <line key={y} x1="0" x2="420" y1={y} y2={y} stroke="#0d0f16" strokeOpacity="0.06" />)}
              {bars.map((b, n) => (
                <rect key={n} x={n * 30 + 6} y={160 - b * 150} width="18" height={b * 150} rx="5" fill={n === bars.length - 1 ? '#0027c4' : '#c9d2ff'} />
              ))}
            </svg>
            <div className="sc-ring">
              <svg viewBox="0 0 84 84">
                <circle cx="42" cy="42" r={r} fill="none" stroke="#e8ebf3" strokeWidth="8" />
                <circle cx="42" cy="42" r={r} fill="none" stroke="#0027c4" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(circ * pct) / 100} ${circ}`} transform="rotate(-90 42 42)" />
              </svg>
              <b>{pct}%</b>
            </div>
          </div>
          <ul className="sc-legend">
            {list.slice(0, 4).map((it, n) => <li key={n}><span className="it-logo">{logoFor(it).node}</span>{it}</li>)}
          </ul>
        </div>
      </figure>
    );
  }

  return (
    <figure className="rel-shot shot-list" aria-hidden="true">
      <svg className="shot-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f6fd6" /><stop offset="0.45" stopColor="#7aa6e8" /><stop offset="0.75" stopColor="#cdb7d8" /><stop offset="1" stopColor="#f3b88f" /></linearGradient>
          <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#fff" /><stop offset="0.35" stopColor="#fff" stopOpacity="0.7" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#sky)" />
        <circle cx="1200" cy="260" r="200" fill="url(#sun)" />
        <path d="M0 620Q300 500 620 580T1240 540T1600 560V900H0Z" fill="#fff" fillOpacity="0.16" />
        <path d="M0 720Q380 600 820 690T1600 650V900H0Z" fill="#fff" fillOpacity="0.26" />
        <path d="M0 820Q500 740 1000 800T1600 780V900H0Z" fill="#fff" fillOpacity="0.32" />
      </svg>
      <div className="display shot-display shot-over"><NotchDemo open={false} onOpen={() => {}} onClose={() => {}} /></div>
      <div className="rel-win">
        <div className="rel-bar"><img src="/mark.png" alt="" /><b>Overlay</b><span>{version === 'Beta' ? 'Beta build' : `Version ${version}`}</span></div>
        <time>{when}</time>
        <h4>Overlay {version === 'Beta' ? 'beta' : version}</h4>
        <p>What's new:</p>
        <ul>{list.map((it, n) => <li key={n}><span className="tick" /><span className="it-logo">{logoFor(it).node}</span>{it}</li>)}</ul>
      </div>
    </figure>
  );
}

export default function App() {
  // Each page has a link: #features, #pricing, #changelog, #privacy, #terms.
  const [view, setView] = useState<View>(() => {
    const h = window.location.hash.slice(1) as View;
    return (['features', 'pricing', 'changelog', 'privacy', 'terms'] as View[]).includes(h) ? h : 'home';
  });
  const [risen, setRisen] = useState(false);
  // #zoom opens straight into the notch, so the close-up can be linked.
  const [zoomed, setZoomed] = useState(() => window.location.hash === '#zoom');
  // Keep the stage clipped until the close-up has fully eased back out.
  const [clip, setClip] = useState(zoomed);
  useEffect(() => {
    if (zoomed) { setClip(true); return; }
    const t = window.setTimeout(() => setClip(false), 1400);
    return () => window.clearTimeout(t);
  }, [zoomed]);
  useEffect(() => {
    document.documentElement.classList.toggle('paged', view !== 'home');
  }, [view]);
  const line = useCycle(LINES.length, 3400);
  const tag = useCycle(TAGS.length, 2400);

  useEffect(() => {
    const id = requestAnimationFrame(() => setRisen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoomed(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (v: View) => {
    setView(v);
    setZoomed(false);
    window.scrollTo({ top: 0 });
    window.history.replaceState(null, '', v === 'home' ? window.location.pathname : `#${v}`);
  };

  return (
    <div className={`sheet${view === 'home' ? '' : ' scroll'}`}>
      <header className="top">
        <a className="mark" href="#top" onClick={() => go('home')}>
          <img src="/mark.png" alt="" width="30" height="27" />
          <span>Overlay</span>
          <em className="beta">Beta</em>
        </a>
        <nav>
          {NAV.map((item) => (
            <button key={item.id} type="button" className={view === item.id ? 'on' : ''} onClick={() => go(item.id)}>{item.label}</button>
          ))}
          <button type="button" className={`cta${view === 'home' ? ' on' : ''}`} onClick={() => go('home')}>Get Access</button>
        </nav>
      </header>

      <main id="top">
        {view === 'home' && (
          <div className="hero">
            <aside className="side side-left" aria-live="polite">
              <Rotator className="left" index={line} render={(i) => <h1>{LINES[i]}</h1>} />
            </aside>

            <div className="center">
              <div className={`stage${clip ? ' clip' : ''}`} onClick={() => setZoomed(false)} title={zoomed ? 'Click outside the notch to zoom out' : ''}>
                <div className={`device${risen ? ' risen' : ''}${zoomed ? ' zoomed' : ''}`}>
                  <div className="lid">
                    <span className="cam" aria-hidden="true" />
                    <div className="display">
                      <div className="wall" aria-hidden="true" />
                      <div className="glare" aria-hidden="true" />
                      <NotchDemo open={zoomed} onOpen={() => setZoomed(true)} onClose={() => setZoomed(false)} />
                    </div>
                  </div>
                  <div className="hinge" />
                  <div className="deck" aria-hidden="true">
                    <svg viewBox="0 0 1000 30" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="alu" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#fbfbfc" />
                          <stop offset="0.16" stopColor="#e6e7ea" />
                          <stop offset="0.55" stopColor="#c8cad0" />
                          <stop offset="0.82" stopColor="#a6a9b0" />
                          <stop offset="1" stopColor="#7b7e86" />
                        </linearGradient>
                        <linearGradient id="alu-side" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0" stopColor="#000" stopOpacity="0.14" />
                          <stop offset="0.05" stopColor="#000" stopOpacity="0" />
                          <stop offset="0.95" stopColor="#000" stopOpacity="0" />
                          <stop offset="1" stopColor="#000" stopOpacity="0.14" />
                        </linearGradient>
                        <linearGradient id="scoop" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#8e9198" />
                          <stop offset="1" stopColor="#c4c7cd" />
                        </linearGradient>
                      </defs>
                      {/* The slab: a straight top edge, ends that roll under, a slightly narrower foot. */}
                      <path d="M6 0H994Q1000 0 999.4 5L997 19Q995 27 982 28.6Q900 30 500 30Q100 30 18 28.6Q5 27 3 19L0.6 5Q0 0 6 0Z" fill="url(#alu)" />
                      <path d="M6 0H994Q1000 0 999.4 5L997 19Q995 27 982 28.6Q900 30 500 30Q100 30 18 28.6Q5 27 3 19L0.6 5Q0 0 6 0Z" fill="url(#alu-side)" />
                      {/* The thumb scoop, cut into the top edge. */}
                      <path d="M432 0Q438 0 440 4Q443 11 456 11H544Q557 11 560 4Q562 0 568 0Z" fill="url(#scoop)" />
                      <path d="M440 4Q443 11 456 11H544Q557 11 560 4" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                      {/* A crisp highlight along the front edge. */}
                      <path d="M6 0.6H432M568 0.6H994" stroke="#fff" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                  <div className="floor" />
                </div>
              </div>
              <div className="actions">
                <button type="button" className={zoomed ? 'zoom on' : 'zoom'} onClick={() => setZoomed((v) => !v)} aria-pressed={zoomed}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="6.5" />
                    <path d={zoomed ? 'm20 20-4.4-4.4M8.5 11h5' : 'm20 20-4.4-4.4M8.5 11h5M11 8.5v5'} />
                  </svg>
                  {zoomed ? 'Zoom out' : 'Open the notch'}
                </button>
                <Download />
              </div>
            </div>

            <aside className="side side-right" aria-live="polite">
              <Rotator className="right" index={tag} render={(i) => (
                <div className="tag"><span className="tag-logo">{TAGS[i].node}</span><span>{TAGS[i].label}</span></div>
              )} />
            </aside>
          </div>
        )}

        {view === 'features' && (
          <section className="page">
            <header className="page-head">
              <h2>Everything you reach for, at the top of the screen.</h2>
            </header>
            <div className="feature-grid">
              {FEATURES.map((f, i) => {
                const [bg, ink, back, mid] = COVERS[i % COVERS.length];
                return (
                  <article className="folder" key={f.title} style={{ '--bg': bg, '--ink': ink, '--back': back, '--mid': mid } as React.CSSProperties}>
                    <div className="folder-art">
                      <span className="sheet-back" />
                      <span className="sheet-mid" />
                      <div className="cover">
                        <span className="cover-logo">{f.logo}</span>
                      </div>
                    </div>
                    <div className="folder-cap">
                      <h3>{f.title}</h3>
                      <p>{f.body}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {view === 'pricing' && (
          <section className="page">
            <header className="page-head center-text">
              <h2>Start free. Upgrade anytime.</h2>
            </header>
            <div className="plans">
              {PLANS.map((p) => (
                <a className={`plan${p.featured ? ' featured' : ''}`} key={p.name} href="#download" onClick={(e) => { e.preventDefault(); go('home'); }} aria-label={`${p.name}: get Overlay`}>
                  <h3>{p.name}</h3>
                  <p className="price"><b>{p.price}</b>{p.per && <span>{p.per}</span>}</p>
                  <p className="plan-note">{p.note}</p>
                  <ul>{p.items.map((it) => <li key={it}>{it}</li>)}</ul>
                  <span className="plan-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M8.5 7H17v8.5" /></svg></span>
                </a>
              ))}
            </div>
            <p className="fine">Prices in USD. The Windows beta is free while it lasts.</p>
          </section>
        )}

        {view === 'changelog' && (
          <section className="page narrow wide-log">
            <header className="page-head">
              <h2>What's new in Overlay.</h2>
            </header>
            <ol className="changelog">
              {changelog.map((c, k) => {
                const kinds = shotKinds(changelog.map((e) => e.title));
                const when = new Date(`${c.date}T12:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const items = splitTitle(c.title, c.points);
                const id = `v-${c.date}-${k}`;
                return (
                  <li key={k} id={id}>
                    <div className="rel-meta">
                      <a className="ver-pill" href="#changelog" onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                        <WindowsMark />{c.version}
                      </a>
                      <time>{when}</time>
                    </div>
                    <article className="rel">
                      <h3>{sentence(c.title)}</h3>
                      {c.points.length > 0 && <p className="rel-text">{c.points.map((pt) => pt.replace(/\.?$/, '.')).join(' ')}</p>}
                      <Shot kind={kinds[k]} items={items} version={c.version} when={when} seed={c.title} />
                    </article>
                  </li>
                );
              })}
            </ol>
            {changelog.length === 0 && <p className="fine">No entries yet.</p>}
          </section>
        )}

        {view === 'privacy' && (
          <section className="page narrow legal">
            <header className="page-head"><h2>Privacy Policy</h2><p>Last updated November 2026</p></header>
            <h3>What stays on your PC</h3>
            <p>Your settings, focus history, to-dos, notes and AI usage are stored on your computer. Overlay has no account and does not upload them.</p>
            <h3>What leaves your PC</h3>
            <p>Overlay checks GitHub for updates. Lyrics are looked up on LRCLIB using the song title and artist, and weather on Open-Meteo using the city you choose. Nothing else is sent.</p>
            <h3>Clipboard</h3>
            <p>Clipboard history is kept in memory only, is never written to disk, and is cleared when Overlay quits.</p>
            <h3>Contact</h3>
            <p>Questions about privacy can be sent through the project's GitHub page.</p>
          </section>
        )}

        {view === 'terms' && (
          <section className="page narrow legal">
            <header className="page-head"><h2>Terms of Service</h2><p>Last updated November 2026</p></header>
            <h3>The beta</h3>
            <p>Overlay for Windows is in beta. It is provided as is, and features may change between builds.</p>
            <h3>Using Overlay</h3>
            <p>Use Overlay on computers you own or are allowed to use. Do not use it to interfere with anyone else's computer or data.</p>
            <h3>Paid plans</h3>
            <p>Pro and Lifetime unlock features on the devices you use.</p>
          </section>
        )}
      </main>

      <footer>
        <p>© {new Date().getFullYear()} Overlay · Built by <a href="https://souradeep.me" target="_blank" rel="noreferrer">Souradeep</a></p>
        <div className="legal-links">
          <button type="button" className={view === 'privacy' ? 'on' : ''} onClick={() => go('privacy')}>Privacy Policy</button>
          <button type="button" className={view === 'terms' ? 'on' : ''} onClick={() => go('terms')}>Terms of Service</button>
        </div>
      </footer>
    </div>
  );
}
