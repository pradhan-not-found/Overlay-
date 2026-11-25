import { useEffect, useState } from 'react';
import './index.css';
import './notch.css';
import './pages.css';
import NotchDemo from './NotchDemo';
import { CLAUDE, DISCORD, GCAL, GITHUB, OPENAI, SPOTIFY } from './brand/marks';

// The source repo is private, so installers live in the public overlay-releases
// repo. GitHub's latest/download URL always points at the newest release and
// answers with an attachment, so the click starts the download straight away.
const WINDOWS = import.meta.env.VITE_DOWNLOAD_URL
  || 'https://github.com/pradhan-not-found/overlay-releases/releases/latest/download/Overlay-Setup.exe';

type View = 'home' | 'features' | 'pricing' | 'now' | 'privacy' | 'terms';

const NAV: { id: View; label: string }[] = [
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'now', label: 'Now' },
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

function Download({ wide = false }: { wide?: boolean }) {
  const [dl, setDl] = useState<'idle' | 'starting' | 'started'>('idle');
  // The link itself starts the download; the button just says what is happening.
  const start = () => {
    if (dl !== 'idle') return;
    setDl('starting');
    window.setTimeout(() => setDl('started'), 1400);
    window.setTimeout(() => setDl('idle'), 9000);
  };
  return (
    <a className={`download ${dl}${wide ? ' wide' : ''}`} href={WINDOWS} download="Overlay-Setup.exe" rel="noopener" onClick={start} aria-live="polite">
      {dl === 'starting' ? <span className="spinner" aria-hidden="true" /> : dl === 'started' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ) : <WindowsMark />}
      {dl === 'starting' ? 'Starting download…' : dl === 'started' ? 'Download started' : 'Download for Windows'}
    </a>
  );
}

const FEATURES = [
  { icon: ICON.music, tint: '#ff5f8f', title: 'Now Playing', body: 'The song, its cover and the line being sung, from Spotify or any player. Play, skip and set the volume without leaving your work.' },
  { icon: ICON.spark, tint: '#5b6cff', title: 'AI Usage', body: 'Session and weekly limits for Claude Code, Codex and Cursor, read on your PC. When one runs low, carry on in another with your context.' },
  { icon: ICON.timer, tint: '#ff9f43', title: 'Focus', body: 'A Lock In timer with breaks, streaks and a week of history, right in the notch.' },
  { icon: ICON.calendar, tint: '#22b07d', title: 'Today', body: 'Your next event, the date and your shortcuts, one glance away.' },
  { icon: ICON.check, tint: '#10b981', title: 'To-Dos and Note', body: 'A short list and a scratch note that stay in sync with the Dashboard.' },
  { icon: ICON.clipboard, tint: '#14b8a6', title: 'Clipboard', body: 'The last things you copied, kept in memory only and never written to disk.' },
  { icon: ICON.chip, tint: '#3b82f6', title: 'Hardware', body: 'CPU, memory, GPU, disk and network, live while the notch is open.' },
  { icon: ICON.shield, tint: '#64748b', title: 'Private by default', body: 'No account. Your data stays on your PC; nothing is sent anywhere you did not ask for.' },
];

const PLANS = [
  { name: 'Basic', price: 'Free', note: 'For everyone', items: ['The notch and Now Playing', 'Focus timer and Today', 'To-Dos, Note and Clipboard', 'Hardware'], cta: 'Download' },
  { name: 'Pro', price: '$49', per: '/ year', note: 'For people who live in AI tools', items: ['Everything in Basic', 'AI Usage for every tool', 'One-click handoff between tools', 'Synced lyrics', 'Priority updates'], cta: 'Download', featured: true },
  { name: 'Lifetime', price: '$149', per: 'once', note: 'Pay once, keep it', items: ['Everything in Pro', 'Every future update', 'Early builds'], cta: 'Download' },
];

const NOW = [
  { when: 'November 2026', title: 'The Overlay notch', body: 'The new notch with a tool dock, Now Playing with lyrics, AI Usage and a single Dashboard that keeps everything in sync.' },
  { when: 'Next', title: 'Mac build', body: 'The same notch on macOS, built for the camera housing.' },
  { when: 'Later', title: 'Your own tools', body: 'Pin the tools you use and hide the rest, and add widgets of your own.' },
];

export default function App() {
  // Each page has a link: #features, #pricing, #now, #privacy, #terms.
  const [view, setView] = useState<View>(() => {
    const h = window.location.hash.slice(1) as View;
    return (['features', 'pricing', 'now', 'privacy', 'terms'] as View[]).includes(h) ? h : 'home';
  });
  const [risen, setRisen] = useState(false);
  // #zoom opens straight into the notch, so the close-up can be linked.
  const [zoomed, setZoomed] = useState(() => window.location.hash === '#zoom');
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
    window.history.replaceState(null, '', v === 'home' ? window.location.pathname : `#${v}`);
  };

  return (
    <div className="sheet">
      <header className="top">
        <a className="mark" href="#top" onClick={() => go('home')}>
          <img src="/mark.png" alt="" width="30" height="27" />
          <span>Overlay</span>
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
              <div className="stage" onClick={() => setZoomed(false)} title={zoomed ? 'Click outside the notch to zoom out' : ''}>
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
                  <div className="deck"><span className="groove" /></div>
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
              <span className="kicker">Features</span>
              <h2>Everything you reach for, at the top of the screen.</h2>
              <p>Overlay turns the space above your windows into a notch that opens on a click. These are the tools inside it today.</p>
            </header>
            <div className="feature-grid">
              {FEATURES.map((f) => (
                <article className="feature" key={f.title}>
                  <i style={{ color: f.tint }}><Stroke d={f.icon} /></i>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {view === 'pricing' && (
          <section className="page">
            <header className="page-head center-text">
              <span className="kicker">Pricing</span>
              <h2>Free to start. Pay when it earns its place.</h2>
            </header>
            <div className="plans">
              {PLANS.map((p) => (
                <article className={`plan${p.featured ? ' featured' : ''}`} key={p.name}>
                  {p.featured && <span className="badge">Most popular</span>}
                  <h3>{p.name}</h3>
                  <p className="plan-note">{p.note}</p>
                  <p className="price"><b>{p.price}</b>{p.per && <span>{p.per}</span>}</p>
                  <ul>{p.items.map((it) => <li key={it}><Stroke d="m5 12.5 4.5 4.5L19 7.5" />{it}</li>)}</ul>
                  <a className={`plan-cta${p.featured ? ' solid' : ''}`} href={WINDOWS} rel="noopener">{p.cta}</a>
                </article>
              ))}
            </div>
            <p className="fine">Prices in USD. The Windows beta is free while it lasts.</p>
          </section>
        )}

        {view === 'now' && (
          <section className="page narrow">
            <header className="page-head">
              <span className="kicker">Now</span>
              <h2>What we are building.</h2>
            </header>
            <ol className="timeline">
              {NOW.map((n) => (
                <li key={n.title}><span className="when">{n.when}</span><div><h3>{n.title}</h3><p>{n.body}</p></div></li>
              ))}
            </ol>
            <div className="page-cta"><Download /></div>
          </section>
        )}

        {view === 'privacy' && (
          <section className="page narrow legal">
            <header className="page-head"><span className="kicker">Legal</span><h2>Privacy Policy</h2><p>Last updated November 2026</p></header>
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
            <header className="page-head"><span className="kicker">Legal</span><h2>Terms of Service</h2><p>Last updated November 2026</p></header>
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
