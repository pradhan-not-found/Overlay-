import React from 'react';
import './index.css';

function App() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Subscribed! Welcome to the waitlist.');
  };

  return (
    <>
      <main className="container">
        
        {/* Floating Decorative Elements to replace the empty space */}
        <div className="decor decor-1"></div>
        <div className="decor decor-2"></div>
        <div className="decor decor-3"></div>

        {/* The Notch Mockup */}
        <div className="notch">
          <div className="notch-logo">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z" />
            </svg>
          </div>
          <div className="notch-links">
            <span>About</span>
            <span>Twitter</span>
          </div>
        </div>

        {/* Hero Content */}
        <section className="hero">
          <h1 className="headline">
            Design details that<br />
            <span className="italic-text">feel like magic.</span>
          </h1>
          <p className="subheadline">
            Magic in your mailbox, every alternate Saturday.
          </p>

          <form className="inline-form" onSubmit={handleSubmit}>
            <input type="email" placeholder="Email" required className="email-input" />
            <button type="submit" className="submit-btn">Subscribe &rarr;</button>
          </form>
          
          <a href="#" className="twitter-link">Browse all spells on <span className="underline">Twitter</span></a>
        </section>

        {/* Bottom Grid Fade to mimic screenshot cutoff */}
        <div className="bottom-grid">
          <div className="grid-item item-1"></div>
          <div className="grid-item item-2"></div>
          <div className="grid-item item-3"></div>
          <div className="grid-item item-4"></div>
        </div>

      </main>
    </>
  );
}

export default App;
