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
            <div className="features-view fade-in">
              <div className="features-header">
                <h1 className="bold-claim">Everything You Need. Nothing You Don't.</h1>
              </div>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-visual">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                  <h3>Media Controls</h3>
                  <p>Album art, track info, and playback controls surface automatically when music or video is playing.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-visual">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <h3>Calendar & Meetings</h3>
                  <p>Upcoming events and one-tap join links for Zoom, Meet, and Teams appear ahead of time.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-visual">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  </div>
                  <h3>Camera Preview</h3>
                  <p>Quick self-view check to confirm your lighting and framing before joining a call.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-visual">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect><line x1="22" y1="11" x2="22" y2="13"></line></svg>
                  </div>
                  <h3>Battery & Power</h3>
                  <p>Clear charge status and time-remaining estimate, with an early low-battery warning.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-visual">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                  </div>
                  <h3>Quick File Share</h3>
                  <p>Drag a file onto the pill to copy its path, share via nearby device, or attach instantly.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-visual">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  </div>
                  <h3>System HUD</h3>
                  <p>Cleaner, quieter custom volume and brightness sliders rendered inside the pill.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-visual">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
                  </div>
                  <h3>Adaptive Visuals</h3>
                  <p>Subtle color and blur responses tied to content, applied with restraint and care.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-visual">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  </div>
                  <h3>Lock In</h3>
                  <p>Start a Pomodoro session in one tap. Notifications quiet down automatically while you focus.</p>
                </div>
              </div>
            </div>
          )}

          {currentView === 'pricing' && (
            <div className="pricing-view fade-in">
              <h1 className="bold-claim">Simple, transparent pricing.</h1>
              <div className="pricing-cards">
                <div className="pricing-card">
                  <h2>Basic</h2>
                  <div className="price">Free</div>
                  <ul className="features-list">
                    <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Core HUD functionality</li>
                    <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Up to 2 connected devices</li>
                    <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Community support</li>
                  </ul>
                  <button className="nav-button" onClick={() => setCurrentView('access')} style={{ width: '100%', marginTop: '24px' }}>Get Started</button>
                </div>
                <div className="pricing-card pro">
                  <div className="pro-badge">Most Popular</div>
                  <h2>Pro</h2>
                  <div className="price">$49<span>/year</span></div>
                  <ul className="features-list">
                    <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Everything in Basic</li>
                    <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Unlimited connected devices</li>
                    <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Priority email support</li>
                    <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Custom visual themes</li>
                  </ul>
                  <button className="nav-button" onClick={() => setCurrentView('access')} style={{ width: '100%', marginTop: '24px', background: '#000', color: '#fff' }}>Get Pro</button>
                </div>
                <div className="pricing-card">
                  <h2>Lifetime</h2>
                  <div className="price">$149<span>/once</span></div>
                  <ul className="features-list">
                    <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Everything in Pro</li>
                    <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Lifetime software updates</li>
                    <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> No recurring subscriptions</li>
                    <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Priority feature requests</li>
                  </ul>
                  <button className="nav-button" onClick={() => setCurrentView('access')} style={{ width: '100%', marginTop: '24px' }}>Get Lifetime</button>
                </div>
              </div>
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
