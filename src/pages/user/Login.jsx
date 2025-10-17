import React, { useContext, useEffect, useRef, useState } from 'react';
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

  const pwdRef = useRef(null);

  // Prefill from localStorage if user chose "Remember me"
  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem('rememberMe') === '1';
      const savedEmail = localStorage.getItem('rememberEmail') || '';
      if (savedRemember) {
        setRemember(true);
        if (savedEmail) setEmail(savedEmail);
      }
    } catch (_) { /* ignore storage errors */ }
  }, []);

  const toggleShowPwd = () => {
    // Save caret/selection and focus before toggling type
    const el = pwdRef.current;
    const sel = el
      ? { start: el.selectionStart, end: el.selectionEnd }
      : null;

    setShowPwd((prev) => !prev);

    // Restore focus + selection on next frame after React updates the DOM (and thus the input type)
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus({ preventScroll: true });
      try {
        if (sel && sel.start != null && sel.end != null) {
          // This ensures the cursor position is preserved after type change
          el.setSelectionRange(sel.start, sel.end);
        }
      } catch { /* some browsers may block setSelectionRange on type=password, which is fine */ }
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const u = await login(email, password, { remember });

      try {
        if (remember) {
          localStorage.setItem('rememberMe', '1');
          localStorage.setItem('rememberEmail', email);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('rememberEmail');
        }
      } catch {}

      if (u?.role === 'admin') nav('/admin');
      else nav('/');
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
                ref={pwdRef}
                id="password"
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
                onMouseDown={(e) => e.preventDefault()}  // prevent input blur
                onClick={toggleShowPwd}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                aria-pressed={showPwd}
                aria-controls="password"
              >
                {showPwd ? (
                  /* Eye-off icon (standard path) */
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.12 13.12 0 0 0 2 12s3 7 10 7a9.75 9.75 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>
                  </svg>
                ) : (
                  /* Eye icon (standard path) */
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </label>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.25rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className={styles.muted}>Remember me</span>
          </label>

          <Link to="/forgot" className={styles.link}>Forgot your password?</Link>
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
