import { useState } from 'react';
import './index.css';

function App() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [currentView, setCurrentView] = useState<'home' | 'privacy' | 'terms' | 'contact'>('home');

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
      <header className="header" onClick={() => setCurrentView('home')} style={{ cursor: 'pointer' }}>
        <img src="/logo.png" alt="Overlay Logo" className="logo" />
        <span className="brand-name">Overlay</span>
      </header>

      {/* Middle Content: Side-aligned Text & Form */}
      <main className="main-content">
        <div className="text-section">
          {currentView === 'home' && (
            <>
              <div className="badge">Early Access</div>
              <h1 className="bold-claim">The command center for your desktop.</h1>
              <p className="sub-claim">
                A persistent, elegant surface that sits above everything. Control media, join meetings, and start focus sessions—all inside one fluid pill. It feels native, fast, and quiet by default.
              </p>

              {status === 'success' ? (
                <div className="success-message">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  You're on the list. We'll be in touch soon.
                </div>
              ) : (
                <form className="waitlist-form" onSubmit={handleSubmit}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
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

          {currentView === 'privacy' && (
            <div className="policy-content">
              <h1 className="bold-claim">Privacy Policy</h1>
              <p className="sub-claim">We collect minimal data necessary to run the waitlist. Your email is securely stored and never sold.</p>
            </div>
          )}

          {currentView === 'terms' && (
            <div className="policy-content">
              <h1 className="bold-claim">Terms of Service</h1>
              <p className="sub-claim">By using Overlay, you agree to our standard terms. Do not use the app for malicious purposes.</p>
            </div>
          )}

          {currentView === 'contact' && (
            <div className="policy-content">
              <h1 className="bold-claim">Contact Us</h1>
              <p className="sub-claim">For any inquiries, please email us at support@overlay.app.</p>
            </div>
          )}
        </div>

        {/* Dynamic Graphic Container */}
        <div className="graphic-section">
          {currentView === 'home' && (
            <div className="dynamic-pill">
              <div className="pill-content">
                <div className="pill-icon"></div>
                <div className="pill-text">
                  <span className="pill-title">Now Playing</span>
                  <span className="pill-subtitle">The Midnight - Sunset</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="simple-footer">
        <div className="founder-credit">
          &copy; {new Date().getFullYear()} Overlay • Built by <a href="https://souradeep.me" target="_blank" rel="noreferrer">Souradeep Pradhan</a>
        </div>
        <div className="footer-links">
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('privacy'); }}>Privacy</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('terms'); }}>Terms</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('contact'); }}>Contact</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
