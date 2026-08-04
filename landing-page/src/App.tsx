import { useState } from 'react';
import './App.css';

function App() {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setJoined(true);
      setEmail('');
    }
  };

  return (
    <div className="glass-container">
      <img src="/logo.png" alt="Overlay Logo" className="logo" />
      <h1 className="heading">Join the waitlist</h1>
      
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
            Join
          </button>
        </form>
      ) : (
        <div className="success-message">
          Thanks for joining! We'll be in touch soon.
        </div>
      )}
    </div>
  );
}

export default App;
