import { useState, useRef } from 'react';
import './index.css';

function App() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [currentView, setCurrentView] = useState<'home' | 'terms' | 'privacy'>('home');
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
        <div className="brand" onClick={() => setCurrentView('home')} style={{ cursor: 'pointer' }}>
          <img src="/logo.png" alt="Overlay Logo" className="logo" />
          <span className="brand-name">Overlay</span>
        </div>
        {currentView === 'home' && (
          <button className="nav-join-btn" onClick={focusEmail}>
            Join the waitlist
          </button>
        )}
      </nav>

      {/* Main Content Router */}
      {currentView === 'home' && (
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
      </main>
      )}

      {/* Terms Page */}
      {currentView === 'terms' && (
        <main className="policy-content">
          <h1>Terms of Service</h1>
          <p>Welcome to Overlay. By using our application, you agree to these terms.</p>
          <h2>1. Usage</h2>
          <p>You agree to use Overlay responsibly and not for any malicious activities.</p>
          <h2>2. Intellectual Property</h2>
          <p>All content and software are the property of Overlay and its creators.</p>
          <h2>3. Modifications</h2>
          <p>We reserve the right to modify these terms at any time.</p>
        </main>
      )}

      {/* Privacy Policy Page */}
      {currentView === 'privacy' && (
        <main className="policy-content">
          <h1>Privacy Policy</h1>
          <p>Your privacy is important to us. This policy explains how we collect and use your data.</p>
          <h2>1. Data Collection</h2>
          <p>We collect minimal data required for the waitlist, specifically your email address.</p>
          <h2>2. Data Usage</h2>
          <p>Your email will only be used to contact you regarding early access and updates.</p>
          <h2>3. Third Parties</h2>
          <p>We do not sell or share your data with third parties.</p>
        </main>
      )}

      {/* Bottom Footer */}
      <footer className="simple-footer">
        <div className="founder-credit">
          &copy; {new Date().getFullYear()} Overlay &bull; Built by <a href="https://souradeep.me" target="_blank" rel="noreferrer">Souradeep Pradhan</a>
        </div>
        <div className="footer-links">
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('terms'); }}>Terms</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('privacy'); }}>Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
