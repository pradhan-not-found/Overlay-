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

      {/* Middle Content: Side-aligned Text & Form */}
      <main className="main-content">
        <div className="text-section">
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

              <div style={{ marginTop: '32px' }}>
                <a href="#" className="nav-button" style={{ padding: '12px 24px', fontSize: '16px' }} onClick={(e) => { e.preventDefault(); setCurrentView('access'); }}>Join the Waitlist &rarr;</a>
              </div>
            </>
          )}

          {currentView === 'features' && (
            <div className="features-view fade-in">
              <h1 className="bold-claim" style={{ fontSize: '36px', marginBottom: '32px' }}>Everything You Need. <br/><span style={{color: '#888'}}>Nothing You Don't.</span></h1>
              <div className="features-grid">
                <div className="feature-card">
                  <h3>Media Controls</h3>
                  <p>Album art, track info, and playback controls surface automatically when music or video is playing.</p>
                </div>
                <div className="feature-card">
                  <h3>Calendar & Meetings</h3>
                  <p>Upcoming events and one-tap join links for Zoom, Meet, and Teams appear ahead of time.</p>
                </div>
                <div className="feature-card">
                  <h3>Camera Preview</h3>
                  <p>Quick self-view check to confirm your lighting and framing before joining a call.</p>
                </div>
                <div className="feature-card">
                  <h3>Battery & Power</h3>
                  <p>Clear charge status and time-remaining estimate, with an early low-battery warning.</p>
                </div>
                <div className="feature-card">
                  <h3>Quick File Share</h3>
                  <p>Drag a file onto the pill to copy its path, share via nearby device, or attach instantly.</p>
                </div>
                <div className="feature-card">
                  <h3>System HUD</h3>
                  <p>Cleaner, quieter custom volume and brightness sliders rendered inside the pill.</p>
                </div>
                <div className="feature-card">
                  <h3>Adaptive Visuals</h3>
                  <p>Subtle color and blur responses tied to content, applied with restraint and care.</p>
                </div>
                <div className="feature-card">
                  <h3>Lock In</h3>
                  <p>Start a Pomodoro session in one tap. Notifications quiet down automatically while you focus.</p>
                </div>
              </div>
            </div>
          )}

          {currentView === 'pricing' && (
            <div className="pricing-view fade-in">
              <h1 className="bold-claim" style={{ fontSize: '36px', marginBottom: '32px' }}>Simple, transparent pricing.</h1>
              <div className="pricing-cards">
                <div className="pricing-card">
                  <h2>Basic</h2>
                  <div className="price">Free</div>
                  <ul className="pricing-features">
                    <li>Essential media controls</li>
                    <li>Battery & Power status</li>
                    <li>System HUD replacement</li>
                  </ul>
                  <button className="nav-button pricing-btn outline" onClick={(e) => { e.preventDefault(); setCurrentView('access'); }}>Get Started</button>
                </div>
                <div className="pricing-card premium">
                  <h2>Pro</h2>
                  <div className="price">$29 <span className="price-term">lifetime</span></div>
                  <ul className="pricing-features">
                    <li>Everything in Basic</li>
                    <li>Calendar & 1-tap Meetings</li>
                    <li>Camera Preview check</li>
                    <li>Lock In (Focus Timer)</li>
                    <li>Quick File Share</li>
                  </ul>
                  <button className="nav-button pricing-btn solid" onClick={(e) => { e.preventDefault(); setCurrentView('access'); }}>Get Pro Access</button>
                </div>
              </div>
            </div>
          )}

          {currentView === 'access' && (
            <div className="access-view fade-in">
              <h1 className="bold-claim" style={{ fontSize: '36px', marginBottom: '16px' }}>Early Access Gateway.</h1>
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
