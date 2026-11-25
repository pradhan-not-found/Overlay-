import { useEffect, useState } from 'react';
import './index.css';
import './notch.css';
import NotchDemo from './NotchDemo';

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

function WindowsMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M0 3.449 9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  );
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [risen, setRisen] = useState(false);
  const [dl, setDl] = useState<'idle' | 'starting' | 'started'>('idle');

  // The link itself starts the download; the button just says what is happening.
  const startDownload = () => {
    if (dl !== 'idle') return;
    setDl('starting');
    window.setTimeout(() => setDl('started'), 1400);
    window.setTimeout(() => setDl('idle'), 9000);
  };
  // #zoom opens straight into the notch, so the close-up can be linked.
  const [zoomed, setZoomed] = useState(() => window.location.hash === '#zoom');

  useEffect(() => {
    const id = requestAnimationFrame(() => setRisen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoomed(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="sheet">
      <header className="top">
        <a className="mark" href="#top" onClick={() => setView('home')}>
          <img src="/mark.png" alt="" width="22" height="20" />
          <span>Overlay</span>
        </a>
        <nav>
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? 'on' : ''}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button type="button" className={view === 'home' ? 'on' : ''} onClick={() => setView('home')}>
            Get Access
          </button>
        </nav>
      </header>

      <main id="top">
        {view === 'home' && (
          <div className="hero">
            <aside className="side side-left">
              <h1>The notch, for Windows.</h1>
            </aside>
            <div className="center">
            <div className="stage" onClick={() => setZoomed((open) => !open)} title={zoomed ? 'Click to zoom out' : 'Click to zoom into the notch'}>
              <div className={`device${risen ? ' risen' : ''}${zoomed ? ' zoomed' : ''}`}>
                <div className="lid">
                  <span className="cam" aria-hidden="true" />
                  <div className="display">
                    <div className="wall" aria-hidden="true" />
                    <div className="glare" aria-hidden="true" />
                    <NotchDemo open={zoomed} onClose={() => setZoomed(false)} />
                  </div>
                </div>
                <div className="hinge" />
                <div className="deck"><span className="groove" /></div>
                <div className="floor" />
              </div>
            </div>
            <div className="actions">
              <button type="button" className={zoomed ? 'zoom on' : 'zoom'} onClick={() => setZoomed((open) => !open)} aria-pressed={zoomed}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d={zoomed ? 'm20 20-4.4-4.4M8.5 11h5' : 'm20 20-4.4-4.4M8.5 11h5M11 8.5v5'} />
                </svg>
                {zoomed ? 'Zoom out' : 'Zoom into the notch'}
              </button>
              <a
                className={`download ${dl}`}
                href={WINDOWS}
                download="Overlay-Setup.exe"
                rel="noopener"
                onClick={startDownload}
                aria-live="polite"
              >
                {dl === 'starting' ? <span className="spinner" aria-hidden="true" /> : dl === 'started' ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : <WindowsMark />}
                {dl === 'starting' ? 'Starting download…' : dl === 'started' ? 'Download started' : 'Download for Windows'}
              </a>
            </div>
            <p className={`download-note${dl === 'started' ? ' show' : ''}`}>
              Didn’t start? <a href={WINDOWS} rel="noopener">Try again</a> · Windows 10 and 11
            </p>
            </div>
            <aside className="side side-right">
              <ul className="tagline">
                <li>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5V6.2a1 1 0 0 1 .78-.98l9-2a1 1 0 0 1 1.22.98V15.5" /><circle cx="6.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="15.5" r="2.5" /></svg>
                  Music
                </li>
                <li>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 13.9 10l6.6 2-6.6 2L12 20.5 10.1 14 3.5 12l6.6-2Z" /></svg>
                  AI limits
                </li>
                <li>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.5v4l2.5 1.5M9.5 2.75h5" /></svg>
                  Focus
                </li>
              </ul>
            </aside>
          </div>
        )}

        {view === 'features' && (
          <section className="panel">
            <h2>Features</h2>
            <ul>
              <li>Focus, music, and the clock in the notch</li>
              <li>GitHub, Discord, and a real terminal</li>
              <li>Launcher, capture, and a camera check</li>
              <li>Notes, calendar, and the rest of the desk</li>
            </ul>
          </section>
        )}

        {view === 'pricing' && (
          <section className="panel">
            <h2>Pricing</h2>
            <ul className="prices">
              <li><b>Basic</b><span>Free</span></li>
              <li><b>Pro</b><span>$49 / year</span></li>
              <li><b>Lifetime</b><span>$149</span></li>
            </ul>
          </section>
        )}

        {view === 'now' && (
          <section className="panel">
            <h2>Now</h2>
            <ul>
              <li>Windows beta is the build you can download</li>
              <li>Mac is next</li>
              <li>The notch is the product, not a second window</li>
            </ul>
          </section>
        )}

        {view === 'privacy' && (
          <section className="panel legal-copy">
            <h2>Privacy Policy</h2>
            <p>Settings stay on this PC. Overlay does not sell them.</p>
            <p>The Windows download is served from the public GitHub release.</p>
          </section>
        )}

        {view === 'terms' && (
          <section className="panel legal-copy">
            <h2>Terms of Service</h2>
            <p>Overlay is a beta. Use the build as provided, on machines you own.</p>
            <p>Don’t use it to interfere with anyone else’s computer.</p>
          </section>
        )}
      </main>

      <footer>
        <p>
          © {new Date().getFullYear()} Overlay · Built by <a href="https://souradeep.me" target="_blank" rel="noreferrer">Souradeep Pradhan</a>
        </p>
        <div className="legal">
          <button type="button" className={view === 'privacy' ? 'on' : ''} onClick={() => setView('privacy')}>Privacy Policy</button>
          <button type="button" className={view === 'terms' ? 'on' : ''} onClick={() => setView('terms')}>Terms of Service</button>
        </div>
      </footer>
    </div>
  );
}
