import { useState } from 'react';
import './index.css';

function App() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [currentView, setCurrentView] = useState<'home' | 'privacy' | 'terms' | 'contact' | 'features' | 'pricing' | 'access'>('home');
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  // NOTE: Replace this with your Google Apps Script Web App URL!
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxi9gFwCeJt85jedXkVeGmrBgW_MRZtCU3wMlAC9mEF586H86WaV1K9w-1N5KjzfuVDew/exec';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setStatus('loading');
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ email: email.trim() }),
        });
        
        // Because of no-cors, fetch resolves opaque responses even on success
        setStatus('success');
        setEmail('');
      } catch {
        setStatus('error');
      }
    }
  };

  return (
    <div className="page-wrapper">
      {/* Top Header: Logo + Name */}
      <header className="header">
        <div className="header-left" onClick={() => setCurrentView('home')} style={{ cursor: 'pointer' }}>
          <img src="/logo.png" alt="Overlay Logo" className="logo" />
          <div className="brand-group">
            <span className="brand-name">Overlay</span>
            <span className="beta-tag">beta</span>
          </div>
        </div>
        <div className="header-right">
          <a href="#" className="nav-link hidden-mobile" onClick={(e) => { e.preventDefault(); setCurrentView('features'); }}>Features</a>
          <a href="#" className="nav-link hidden-mobile" onClick={(e) => { e.preventDefault(); setCurrentView('pricing'); }}>Pricing</a>
          <a href="#" className="nav-button" onClick={(e) => { e.preventDefault(); setCurrentView('access'); }}>Get Access</a>
        </div>
      </header>

      {/* Middle Content */}
      <main className="main-content">
        <div className={currentView === 'home' ? 'text-section' : 'full-section'}>
          {currentView === 'home' && (
            <>
              <a href="#" className="badge">
                <span className="badge-pill">New</span>
                <span className="badge-label">Meet Lock In: Your native focus timer &rarr;</span>
              </a>
              <h1 className="bold-claim">
                The Dynamic Command Center<br />
                <span style={{ whiteSpace: 'nowrap' }}>
                  for Your{' '}
                  <span className="rotating-text-wrapper">
                    <div className="rotating-text-inner">
                      <span>Desktop.</span>
                      <span>Workflow.</span>
                      <span>Meetings.</span>
                      <span>Music.</span>
                      <span>Focus.</span>
                      <span>Ideas.</span>
                      <span aria-hidden="true">Desktop.</span>
                    </div>
                  </span>
                </span>
              </h1>
              <p className="sub-claim">
                Experience frictionless productivity. Overlay is a keyboard-driven workspace that puts all your essential tools just a keystroke away. Register now for early access.
              </p>

              {status === 'success' ? (
                <div className="success-message">
                  Thank you for registering! We'll be in touch soon.
                </div>
              ) : (
                <form className="waitlist-form" onSubmit={handleSubmit}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email..."
                    className="glass-input"
                    required
                    disabled={status === 'loading'}
                  />
                  <button type="submit" className="glass-button" disabled={status === 'loading'}>
                    {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
                  </button>
                </form>
              )}
            </>
          )}

          {currentView === 'features' && (
            <div className="policy-content fade-in">
              <h1 className="bold-claim" style={{fontSize: '32px'}}>Features</h1>
              <div className="sleek-lines">
                <div className="sleek-line"><svg width="20" height="20" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z"/></svg> Instant Media Controls</div>
                <div className="sleek-line"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> One-Tap Meeting Links</div>
                <div className="sleek-line"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Camera Preview Check</div>
                <div className="sleek-line"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect><line x1="22" y1="11" x2="22" y2="13"></line></svg> Real-Time Battery Status</div>
                <div className="sleek-line"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg> Drag & Drop File Share</div>
                <div className="sleek-line"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> Custom System HUD</div>
                <div className="sleek-line"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg> Adaptive UI Visuals</div>
                <div className="sleek-line"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Pomodoro Focus Timer</div>
              </div>
            </div>
          )}

          {currentView === 'pricing' && (
            <div className="policy-content fade-in">
              <h1 className="bold-claim" style={{fontSize: '32px'}}>Pricing</h1>
              
              <div className="sleek-lines">
                <div className="sleek-pricing-tier">
                  <div className="tier-header">
                    <h2>Basic</h2>
                    <span className="tier-price">Free</span>
                  </div>
                  <ul className="tier-bullets">
                    <li>Core HUD functionality</li>
                    <li>Up to 2 connected devices</li>
                  </ul>
                </div>

                <div className="sleek-pricing-tier">
                  <div className="tier-header">
                    <h2>Pro</h2>
                    <span className="tier-price">$49/yr</span>
                  </div>
                  <ul className="tier-bullets">
                    <li>Everything in Basic</li>
                    <li>Unlimited devices</li>
                    <li>Custom themes</li>
                  </ul>
                </div>

                <div className="sleek-pricing-tier">
                  <div className="tier-header">
                    <h2>Lifetime</h2>
                    <span className="tier-price">$149</span>
                  </div>
                  <ul className="tier-bullets">
                    <li>Everything in Pro</li>
                    <li>Lifetime updates</li>
                    <li>Priority support</li>
                  </ul>
                </div>
              </div>
              <button className="nav-button" onClick={() => setCurrentView('access')} style={{ marginTop: '32px' }}>Get Access</button>
            </div>
          )}

          {currentView === 'access' && (
            <div className="access-view fade-in">
              <h1 className="bold-claim">Early Access Gateway.</h1>
              <p className="sub-claim">Overlay is currently in a closed beta. Enter your access code to join the waitlist.</p>
              
              {!isUnlocked ? (
                <form className="waitlist-form" onSubmit={(e) => {
                  e.preventDefault();
                  if (password.toLowerCase() === 'overlay') setIsUnlocked(true);
                  else alert('Incorrect access code (Hint: overlay)');
                }}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter access code..."
                    className="glass-input"
                    required
                  />
                  <button type="submit" className="glass-button">
                    Unlock
                  </button>
                </form>
              ) : (
                <div className="unlocked-section fade-in">
                  <div className="success-message" style={{marginBottom: '24px'}}>Access granted. You may now join the waitlist.</div>
                  {status === 'success' ? (
                    <div className="success-message">
                      Thank you for registering! We'll be in touch soon.
                    </div>
                  ) : (
                    <form className="waitlist-form" onSubmit={handleSubmit}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email..."
                        className="glass-input"
                        required
                        disabled={status === 'loading'}
                      />
                      <button type="submit" className="glass-button" disabled={status === 'loading'}>
                        {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {currentView === 'privacy' && (
            <div className="policy-content">
              <h1 className="bold-claim" style={{fontSize: '32px'}}>Privacy Policy</h1>
              <p className="sub-claim">We collect minimal data necessary to run the waitlist. Your email is securely stored and never sold.</p>
            </div>
          )}

          {currentView === 'terms' && (
            <div className="policy-content">
              <h1 className="bold-claim" style={{fontSize: '32px'}}>Terms of Service</h1>
              <p className="sub-claim">By using Overlay, you agree to our standard terms. Do not use the app for malicious purposes.</p>
            </div>
          )}

          {currentView === 'contact' && (
            <div className="policy-content">
              <h1 className="bold-claim" style={{fontSize: '32px'}}>Contact Us</h1>
              <p className="sub-claim">For any inquiries, please email us at support@overlay.app.</p>
            </div>
          )}
        </div>

        {/* Right side could contain an image or graphic later, left empty for minimalism for now */}
        <div className="right-section"></div>
      </main>

      {/* Bottom Footer */}
      <footer className="simple-footer">
        <div className="founder-credit">
          &copy; {new Date().getFullYear()} Overlay • Built by <a href="https://souradeep.me" target="_blank" rel="noreferrer">Souradeep Pradhan</a>
        </div>
        <div className="footer-links">
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('privacy'); }}>Privacy Policy</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('terms'); }}>Terms of Service</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('contact'); }}>Contact</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
