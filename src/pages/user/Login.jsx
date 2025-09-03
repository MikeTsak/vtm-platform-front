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
    // preserve caret/selection and focus while toggling
    const el = pwdRef.current;
    const sel = el
      ? { start: el.selectionStart, end: el.selectionEnd }
      : null;

    setShowPwd((prev) => !prev);

    // restore focus + selection on next frame
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus({ preventScroll: true });
      try {
        if (sel && sel.start != null && sel.end != null) {
          el.setSelectionRange(sel.start, sel.end);
        }
      } catch { /* some browsers may block setSelectionRange on type=password */ }
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
                onMouseDown={(e) => e.preventDefault()}  // keep focus in input
                onClick={toggleShowPwd}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                aria-pressed={showPwd}
                aria-controls="password"
              >
                {showPwd ? (
                  /* Eye-off icon */
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                    <path d="M2.1 3.51 3.5 2.1l18.4 18.39-1.41 1.42-2.77-2.78A12.35 12.35 0 0 1 12 20C5.5 20 1 12 1 12a21.55 21.55 0 0 1 5.36-6.93L2.1 3.5zM12 7a5 5 0 0 1 5 5c0 .63-.12 1.23-.34 1.78l-6.44-6.44C10.77 7.12 11.37 7 12 7zM7 12a5 5 0 0 1 5-5c.16 0 .33 0 .49.02l-2.2-2.2C9.8 4.6 8.92 4.5 8 4.5 1.5 4.5-3 12-3 12s4.5 7.5 11 7.5c1 0 1.96-.12 2.88-.33l-2.4-2.4A5.01 5.01 0 0 1 7 12z"/>
                  </svg>
                ) : (
                  /* Eye icon */
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                    <path d="M12 4.5C5.5 4.5 1 12 1 12s4.5 7.5 11 7.5S23 12 23 12 18.5 4.5 12 4.5zm0 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/>
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
