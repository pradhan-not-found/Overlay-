import { useState } from 'react';
import './index.css';
import appleLogo from './assets/logo/apple.png';
import windowsLogo from './assets/logo/windows.png';
import phLogo from './assets/logo/producthunt.png';

export type ViewState = 'home' | 'features' | 'pricing' | 'access' | 'privacy' | 'terms' | 'contact' | 'now';

function App() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessError, setAccessError] = useState('');

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

  if (currentView === 'access' && isUnlocked) {
    return (
      <div className="download-mode fade-in" style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, zIndex: 100 }}>
        <header style={{ position: 'absolute', top: '32px', left: '32px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 110 }}>
          <img src="/logo.png" alt="Overlay Logo" style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '18px' }}>Overlay</span>
            <span className="beta-tag" style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#fff' }}>beta</span>
          </div>
        </header>

        {/* Centered Download Content */}
        <div style={{ maxWidth: '800px', width: '100%', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <h2 style={{ fontSize: '48px', fontWeight: 800, marginBottom: '16px', color: '#fff', letterSpacing: '-0.03em' }}>Welcome to Overlay <span className="beta-tag" style={{ display: 'inline-flex', verticalAlign: 'middle', background: 'rgba(255,255,255,0.2)', color: '#fff', marginLeft: '12px', fontSize: '26px', padding: '2px 14px', borderRadius: '14px', position: 'relative', top: '-4px' }}>beta</span></h2>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', marginBottom: '32px', lineHeight: '1.6', maxWidth: '600px' }}>
            Overlay is your native focus timer and workflow companion. 
            By participating in the closed beta, you're helping us shape the future of deep work. 
            Choose your platform below to download the app and get started.
          </p>
          <div className="download-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', width: '100%' }}>
            <a href="#" className="dl-btn">
              <img src={phLogo} alt="Product Hunt" style={{ width: '20px', height: '20px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
              Product Hunt
            </a>
            <a href="#" className="dl-btn">
              <img src={appleLogo} alt="Mac" style={{ width: '20px', height: '20px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
              Download for Mac
            </a>
            <a href="#" className="dl-btn">
              <img src={windowsLogo} alt="Windows" style={{ width: '20px', height: '20px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
              Download for Windows
            </a>
          </div>
          <p className="download-footer-text" style={{ marginTop: '40px', fontSize: '15px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
            Overlay is now on Product Hunt and is available on Mac and Windows. Linux support coming soon.
          </p>
        </div>
      </div>
    );
  }

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
        {!(currentView === 'access' && isUnlocked) && (
          <div className="header-right">
            <a href="#" className="nav-link hidden-mobile" onClick={(e) => { e.preventDefault(); setCurrentView('features'); }}>Features</a>
            <a href="#" className="nav-link hidden-mobile" onClick={(e) => { e.preventDefault(); setCurrentView('pricing'); }}>Pricing</a>
            <a href="#" className="nav-link hidden-mobile" onClick={(e) => { e.preventDefault(); setCurrentView('now'); }}>Now</a>
            <a href="#" className="nav-button" onClick={(e) => { e.preventDefault(); setCurrentView('access'); }}>Get Access</a>
          </div>
        )}
      </header>

      {/* Middle Content */}
      <main className="main-content">
        <div className={currentView === 'home' || currentView === 'now' ? 'text-section' : 'full-section'}>
          {currentView === 'home' && (
            <>
              <a href="#" className="badge">
                <span className="badge-pill">New</span>
                <span className="badge-label">Introducing Overlay: Join the closed beta waitlist</span>
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
                <div className="success-message fade-in" style={{ 
                  border: '1px solid #166534', background: '#f0fdf4', color: '#166534', 
                  padding: '16px 20px', borderRadius: '12px', display: 'flex', 
                  alignItems: 'center', gap: '12px', marginTop: '24px', fontWeight: 600 
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
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
            <div className="policy-content fade-in" style={{maxWidth: '650px'}}>
              <h1 className="bold-claim" style={{fontSize: '32px'}}>Features</h1>
              <p className="sub-claim" style={{marginBottom: '32px'}}>Everything you need. Nothing you don't.</p>
              
              <ul className="clean-list">
                <li><svg width="20" height="20" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z"/></svg> Instant Media Controls</li>
                <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> One-Tap Meeting Links</li>
                <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Camera Preview Check</li>
                <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect><line x1="22" y1="11" x2="22" y2="13"></line></svg> Real-Time Battery Status</li>
                <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg> Drag & Drop File Share</li>
                <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> Custom System HUD</li>
                <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg> Adaptive UI Visuals</li>
                <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Pomodoro Focus Timer</li>
              </ul>
            </div>
          )}

          {currentView === 'pricing' && (
            <div className="policy-content fade-in" style={{maxWidth: '650px'}}>
              <h1 className="bold-claim" style={{fontSize: '32px'}}>Pricing</h1>
              <p className="sub-claim" style={{marginBottom: '32px'}}>Simple, transparent pricing.</p>
              
              <div className="clean-pricing">
                <div className="pricing-row">
                  <h3>Basic <span className="price-tag">Free</span></h3>
                  <p>Core HUD functionality • Up to 2 connected devices</p>
                </div>

                <div className="pricing-row">
                  <h3>Pro <span className="price-tag">$49/yr</span></h3>
                  <p>Everything in Basic • Unlimited devices • Custom themes</p>
                </div>

                <div className="pricing-row">
                  <h3>Lifetime <span className="price-tag">$149</span></h3>
                  <p>Everything in Pro • Lifetime updates • Priority support</p>
                </div>
              </div>
              <button className="nav-button" onClick={() => setCurrentView('access')} style={{ marginTop: '40px' }}>Get Access</button>
            </div>
          )}

          {currentView === 'access' && (
            <div className="access-view fade-in" style={{ width: '100%', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '24px',
                padding: '48px',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 24px 48px -12px rgba(0,0,0,0.08), 0 4px 16px -4px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/logo.png" alt="Overlay Logo" className="logo" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px', color: '#000', letterSpacing: '-0.03em' }}>Private Beta Access</h1>
                <p style={{ fontSize: '15px', color: '#666', marginBottom: '32px', lineHeight: '1.6' }}>
                  Overlay is currently in a closed beta. Please enter your invitation code to unlock the download.
                </p>
                <form style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }} onSubmit={(e) => {
                  e.preventDefault();
                  if (password.toUpperCase() === 'OVERLAY404') {
                    setIsUnlocked(true);
                    setAccessError('');
                  } else {
                    setAccessError('Incorrect access code. Please try again.');
                  }
                }}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter access code..."
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      background: 'rgba(0,0,0,0.02)',
                      fontSize: '16px',
                      textAlign: 'center',
                      letterSpacing: '0.1em',
                      outline: 'none',
                      transition: 'border-color 0.2s, background 0.2s'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#000'; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; e.target.style.background = 'rgba(0,0,0,0.02)'; }}
                    required
                  />
                  <button type="submit" style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#000',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                    Unlock Access
                  </button>
                  {accessError && (
                    <div className="fade-in" style={{ width: '100%', color: '#ef4444', marginTop: '4px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                      {accessError}
                    </div>
                  )}
                </form>
              </div>
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

          {currentView === 'now' && (
            <div className="policy-content fade-in">
              <h1 className="bold-claim" style={{fontSize: '32px'}}>Now</h1>
              <p className="sub-claim" style={{marginBottom: '32px'}}>What we're focused on right now.</p>
              
              <ul className="clean-list">
                <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Raising our seed round to scale the team.</li>
                <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Preparing the Windows and Mac betas for a wider release.</li>
                <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> Gathering user feedback from our early access cohort.</li>
              </ul>
              
              <p style={{marginTop: '40px', fontSize: '13px', color: '#888'}}>Last updated: August 2026</p>
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
