import { useState, useRef } from 'react';
import './index.css';

function App() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const emailInputRef = useRef<HTMLInputElement>(null);

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
        
        setStatus('success');
        setEmail('');
      } catch {
        setStatus('error');
      }
    }
  };

  const focusEmail = () => {
    emailInputRef.current?.focus();
  };

  return (
    <div className="page-wrapper">
      {/* Top Navigation */}
      <nav className="navbar">
        <div className="brand">
          <img src="/logo.png" alt="Overlay Logo" className="logo" />
          <span className="brand-name">Overlay</span>
        </div>
        <button className="nav-join-btn" onClick={focusEmail}>
          Join the waitlist
        </button>
      </nav>

      {/* Main Hero Content */}
      <main className="main-content">
        <h1 className="hero-heading">
          The <span className="highlight">Dynamic</span> command center<br />for your desktop
        </h1>

        {/* Waitlist Form Block */}
        <div className="form-container">
          {status === 'success' ? (
            <div className="success-message">
              Thank you for registering! We'll be in touch soon.
            </div>
          ) : (
            <form className="inline-form" onSubmit={handleSubmit}>
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="inline-input"
                required
                disabled={status === 'loading'}
              />
              <button type="submit" className="inline-button" disabled={status === 'loading'}>
                {status === 'loading' ? 'Joining...' : 'Join the waitlist'}
              </button>
            </form>
          )}
          <p className="form-subtext">Secure early access and unlock unique productivity rewards.</p>
        </div>

        {/* Feature Highlights */}
        <div className="feature-highlights">
          <span>Keyboard Driven</span>
          <span className="separator">|</span>
          <span>Zero Friction</span>
          <span className="separator">|</span>
          <span>Cross-Platform</span>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="simple-footer">
        <div className="founder-credit">
          &copy; {new Date().getFullYear()} Overlay &bull; Built by <a href="https://souradeep.me" target="_blank" rel="noreferrer">Souradeep Pradhan</a>
        </div>
        <div className="footer-links">
          <a href="#">Terms</a>
          <a href="#">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
