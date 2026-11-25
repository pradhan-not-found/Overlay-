import { useState } from 'react';
import './index.css';

const WINDOWS = 'https://github.com/pradhan-not-found/Overlay-/releases/download/v1.0.2/Overlay-Setup-1.0.2.exe';

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
            <h1>the whole desk, in one notch.</h1>
            <a className="download" href={WINDOWS}>
              <WindowsMark />
              Download for Windows
            </a>
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
