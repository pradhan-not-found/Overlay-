import React from 'react';
import './index.css';

function App() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Subscribed! Welcome to the waitlist.');
  };

  return (
    <>
      {/* Background effects matching Trace */}
      <div className="bg-glow"></div>

      <main className="container">
        {/* Mockup of the Overlay Widget floating at the top of the webpage */}
        <div className="overlay-mockup">
          <span className="mockup-time">10:42</span>
          <div className="mockup-divider"></div>
          <div className="mockup-icons">
            <div className="mockup-icon yt">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
              </svg>
            </div>
            <div className="mockup-icon gh">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z" />
              </svg>
            </div>
          </div>
        </div>

        <section className="hero">
          <div className="badge">Overlay for Windows</div>
          <h1 className="headline">
            Stop switching context.<br />
            <span className="highlight">Start flowing.</span>
          </h1>
          <p className="subheadline">
            A highly-tuned dynamic island for your desktop. Control Spotify, join meetings, 
            and manage your focus—all from a sleek surface that never gets in your way.
          </p>

          {/* Waitlist Form (Glassmorphism Card) */}
          <div className="waitlist-card">
            <h2 className="card-title">Get Early Access</h2>
            <p className="card-desc">Drop your email address below to join the waitlist. No spam, just a download link.</p>
            <form className="waitlist-form" onSubmit={handleSubmit}>
              <input type="email" placeholder="you@company.com" required className="email-input" />
              <button type="submit" className="submit-btn">Join Waitlist</button>
            </form>
          </div>
        </section>
        
        <footer className="footer">
          <p>&copy; 2026 Overlay. All rights reserved.</p>
        </footer>
      </main>
    </>
  );
}

export default App;
