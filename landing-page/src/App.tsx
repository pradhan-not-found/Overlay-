import { useState } from 'react';
import './index.css';

function App() {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      // NOTE: Replace this URL with your Formspree endpoint (e.g., https://formspree.io/f/YOUR_ENDPOINT_ID)
      // For now, we mock the success state.
      setJoined(true);
      setEmail('');
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

          {!joined ? (
            <form className="waitlist-form" onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email..."
                className="glass-input"
                required
              />
              <button type="submit" className="glass-button">
                Join Waitlist
              </button>
            </form>
          ) : (
            <div className="success-message">
              Thank you for registering! We'll be in touch soon.
            </div>
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
