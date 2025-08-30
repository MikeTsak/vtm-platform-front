import React, { useContext, useState } from 'react';
import { AuthCtx } from '../../AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import '../../styles/Login.css'; // reuse the same stylesheet

export default function Register() {
  const { register } = useContext(AuthCtx);
  const [email, setEmail] = useState('');
  const [display_name, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await register(email, display_name, password);
      nav('/');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Register failed');
    }
  };

  return (
    <div className="login-page">
      <div className="vignette" aria-hidden="true" />
      <header className="login-header" aria-label="App header">
        <img
          src="/img/ATT-logo(1).png"
          alt="ATT LARP Logo"
          className="login-logo"
          draggable="false"
        />
        <h1 className="brand">Erebus Portal</h1>
      </header>

      <main>
        <form onSubmit={submit} className="login-card" aria-labelledby="registerTitle">
          <h2 id="registerTitle" className="card-title">Register</h2>

          {err && (
            <div className="alert" role="alert">
              <span className="alert-dot" aria-hidden="true" /> {err}
            </div>
          )}

          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="input"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Display Name</span>
            <input
              className="input"
              placeholder="Prince Telemachos"
              value={display_name}
              onChange={(e) => setDisplayName(e.target.value)}
              type="text"
              autoComplete="nickname"
              required
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <div className="input-group">
              <input
                className="input input-has-button"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={6}
              />
              <button
                type="button"
                className="ghost-btn eye-btn"
                onClick={() => setShowPwd(s => !s)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? (
                  // Eye Slash SVG
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 5C7 5 2.73 8.11 1 12c.73 1.68 1.88 3.15 3.29 4.32L2 19.59 3.41 21l18-18L20.59 2 16.85 5.74C15.28 5.27 13.67 5 12 5zm0 2c1.29 0 2.53.22 3.69.62l-1.66 1.66A4.985 4.985 0 0 0 12 8c-2.76 0-5 2.24-5 5 0 .85.21 1.64.58 2.34l-1.5 1.5C4.72 15.42 3.88 14.26 3.34 13c1.46-3.27 4.92-6 8.66-6zm0 4c.46 0 .9.1 1.29.29L10.29 14.3A2.992 2.992 0 0 1 9 13c0-1.65 1.35-3 3-3zm0 8c-1.29 0-2.53-.22-3.69-.62l1.66-1.66c.55.22 1.15.34 1.78.34 2.76 0 5-2.24 5-5 0-.63-.12-1.23-.34-1.78l1.5-1.5C19.28 8.58 20.12 9.74 20.66 11c-1.46 3.27-4.92 6-8.66 6z"/>
                  </svg>
                ) : (
                  // Eye SVG
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 
                    5-5 5 2.24 5 5-2.24 5-5 5zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9z"/>
                  </svg>
                )}
              </button>

            </div>
          </label>

          <button className="cta" type="submit">Join the Court</button>

          <p className="muted">
            Have an account? <Link to="/login" className="link">Return to the Gates</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
