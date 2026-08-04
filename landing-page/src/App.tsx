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
      <div className="left-panel">
        <div className="logo-container" onClick={() => setCurrentView('home')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon"></div>
          <span className="logo-text">Overlay</span>
        </div>

        {currentView === 'home' && (
          <div className="hero-content">
            <h1 className="hero-title">
              Frictionless command<br />center for your<br />desktop
            </h1>
            <p className="hero-subtitle">
              The ultimate keyboard-driven productivity tool. Currently in closed beta.
            </p>
          </div>
        )}

        {currentView === 'privacy' && (
          <div className="hero-content policy-content">
            <h1 className="hero-title" style={{fontSize: '32px'}}>Privacy Policy</h1>
            <p className="hero-subtitle">We collect minimal data necessary to run the waitlist. Your email is securely stored and never sold.</p>
          </div>
        )}

        {currentView === 'terms' && (
          <div className="hero-content policy-content">
            <h1 className="hero-title" style={{fontSize: '32px'}}>Terms of Service</h1>
            <p className="hero-subtitle">By using Overlay, you agree to our standard terms. Do not use the app for malicious purposes.</p>
          </div>
        )}

        {currentView === 'contact' && (
          <div className="hero-content policy-content">
            <h1 className="hero-title" style={{fontSize: '32px'}}>Contact Us</h1>
            <p className="hero-subtitle">For any inquiries, please email us at support@overlay.app.</p>
          </div>
        )}

        <footer className="footer">
          <div className="links">
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('privacy'); }}>Privacy Policy</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('terms'); }}>Terms of Service</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('contact'); }}>Contact</a>
          </div>
        </footer>
      </div>

      {currentView === 'home' && (
        <div className="right-panel">
          <div className="form-card">
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
                  className="waitlist-input"
                  required
                  disabled={status === 'loading'}
                />
                <button type="submit" className="waitlist-btn" disabled={status === 'loading'}>
                  {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
