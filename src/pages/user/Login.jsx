import React, { useContext, useEffect, useState } from 'react';
import { AuthCtx } from '../../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import styles from '../../styles/Login.module.css';

export default function Login() {
  const { login } = useContext(AuthCtx);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const nav = useNavigate();

  // Prefill from localStorage if user chose "Remember me"
  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem('rememberMe') === '1';
      const savedEmail = localStorage.getItem('rememberEmail') || '';
      if (savedRemember) {
        setRemember(true);
        if (savedEmail) setEmail(savedEmail);
      }
    } catch (_) {
      /* ignore storage errors */
    }
  }, []);

const submit = async (e) => {
  e.preventDefault();
  setErr('');
  try {
    // login should return the logged-in user object (with role)
    const u = await login(email, password, { remember });

    // Persist the preference + email for next time
    try {
      if (remember) {
        localStorage.setItem('rememberMe', '1');
        localStorage.setItem('rememberEmail', email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberEmail');
      }
    } catch {
      /* ignore storage errors */
    }

    // Redirect based on role
    if (u?.role === 'admin') {
      nav('/admin');
    } else {
      nav('/');
    }
  } catch (e) {
    setErr(e?.response?.data?.error || 'Login failed');
  }
};


  return (
    <div className={`${styles['login-page']} ${styles['vamp-bg']}`}>
      <div className={styles.vignette} aria-hidden="true" />
      <header className={styles['login-header']} aria-label="App header">
        <img
          src="/img/ATT-logo(1).png"
          alt="ATT LARP Logo"
          className={styles['login-logo']}
          draggable="false"
        />
        <h1 className={styles.brand}>Erebus Portal</h1>
      </header>

      <main>
        <form onSubmit={submit} className={styles['login-card']} aria-labelledby="loginTitle">
          <h2 id="loginTitle" className={styles['card-title']}>Sign In</h2>

          {err && (
            <div className={styles.alert} role="alert">
              <span className={styles['alert-dot']} aria-hidden="true" /> {err}
            </div>
          )}

          <label className={styles.field}>
            <span className={styles['field-label']}>Email</span>
            <input
              className={styles.input}
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles['field-label']}>Password</span>
            <div className={styles['input-group']}>
              <input
                className={`${styles.input} ${styles['input-has-button']}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                required
                minLength={4}
              />
              <button
                type="button"
                className={`${styles['ghost-btn']} ${styles['eye-btn']}`}
                onClick={() => setShowPwd(s => !s)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 5C7 5 2.73 8.11 1 12c.73 1.68 1.88 3.15 3.29 4.32L2 19.59 3.41 21l18-18L20.59 2 16.85 5.74C15.28 5.27 13.67 5 12 5zm0 2c1.29 0 2.53.22 3.69.62l-1.66 1.66A4.985 4.985 0 0 0 12 8c-2.76 0-5 2.24-5 5 0 .85.21 1.64.58 2.34l-1.5 1.5C4.72 15.42 3.88 14.26 3.34 13c1.46-3.27 4.92-6 8.66-6zm0 4c.46 0 .9.1 1.29.29L10.29 14.3A2.992 2.992 0 0 1 9 13c0-1.65 1.35-3 3-3zm0 8c-1.29 0-2.53-.22-3.69-.62l1.66-1.66c.55.22 1.15.34 1.78.34 2.76 0 5-2.24 5-5 0-.63-.12-1.23-.34-1.78l1.5-1.5C19.28 8.58 20.12 9.74 20.66 11c-1.46 3.27-4.92 6-8.66 6z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 
                    5-5 5 2.24 5 5-2.24 5-5 5zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9z"/>
                  </svg>
                )}
              </button>
            </div>
          </label>

          {/* Remember me row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.25rem' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span className={styles.muted}>Remember me</span>
            </label>

            {/* Optional forgot password route, if you add it later */}
            {/* <Link to="/forgot" className={styles.link}>Forgot password?</Link> */}
          </div>

          <button className={styles.cta} type="submit" style={{ marginTop: '0.75rem' }}>
            Enter the Court
          </button>

          <p className={styles.muted}>
            No account? <Link to="/register" className={styles.link}>Request Embrace</Link>
          </p>
        </form>
      </main>
    </div>
  );
}
