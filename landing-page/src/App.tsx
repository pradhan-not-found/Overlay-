import { useState } from 'react';
import './index.css';

function App() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // NOTE: Replace this with your Google Apps Script Web App URL!
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyyGDqogobKuF3lENOAlAVhy1hCsa19kODf5_0IKPRKiO7NXn8HLiiYVoiPZBzUhU6Tyw/exec';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && GOOGLE_SCRIPT_URL !== 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
      setStatus('loading');
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: email.trim() }),
        });
        
        // Because of no-cors, fetch resolves opaque responses even on success
        setStatus('success');
        setEmail('');
      } catch (err) {
        setStatus('error');
      }
    }
  };

  return (
    <div className="page-wrapper">
      {/* Top Header: Logo + Name */}
      <header className="header">
        <img src="/logo.png" alt="Overlay Logo" className="logo" />
        <span className="brand-name">Overlay</span>
      </header>

      {/* Middle Content: Side-aligned Text & Form */}
      <main className="main-content">
        <div className="text-section">
          <h1 className="bold-claim">The Dynamic Command Center for Your Desktop.</h1>
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
        </div>

        {/* Right side could contain an image or graphic later, left empty for minimalism for now */}
        <div className="right-section"></div>
      </main>

      {/* Bottom Footer */}
      <footer className="simple-footer">
        <div className="founder-credit">
          Built by Pradhan
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
