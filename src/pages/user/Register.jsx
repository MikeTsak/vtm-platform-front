// src/pages/auth/Register.jsx
import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api';
import styles from '../../styles/Login.module.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [display_name, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState([]);
  const [showPwd, setShowPwd] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const nav = useNavigate();
  const pwdRef = useRef(null);

  // --- helpers ---
  const validate = () => {
    const msgs = [];
    const em = email.trim();
    const dn = display_name.trim();
    const pw = password;

    if (!em) msgs.push('Email is required.');
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) msgs.push('Email format looks invalid.');

    if (!dn) msgs.push('Display name is required.');
    else if (dn.length < 2) msgs.push('Display name must be at least 2 characters.');

    if (!pw) msgs.push('Password is required.');
    else if (pw.length < 8) msgs.push('Password must be at least 8 characters.');
    else {
      if (!/[A-Za-z]/.test(pw)) msgs.push('Password must include a letter.');
      if (!/[0-9]/.test(pw)) msgs.push('Password must include a number.');
    }

    if (!agreedToTerms) msgs.push('You must agree to the Terms & Conditions and Privacy Policy.');

    return msgs;
  };

  const normalizeServerErrors = (err) => {
    const list = [];
    const status = err?.response?.status;
    const data = err?.response?.data;

    if (typeof data === 'string') list.push(data);
    const msg = data?.error || data?.message || err?.message;
    if (msg) list.push(msg);

    if (data?.errors && typeof data.errors === 'object') {
      Object.entries(data.errors).forEach(([field, val]) => {
        if (!val) return;
        if (Array.isArray(val)) val.forEach(v => list.push(`${field}: ${v}`));
        else list.push(`${field}: ${val}`);
      });
    }
    if (Array.isArray(data?.errors)) {
      data.errors.forEach(e => {
        if (e?.field && e?.msg) list.push(`${e.field}: ${e.msg}`);
        else if (e?.msg) list.push(e.msg);
      });
    }

    if (status === 409) list.push('This email may already be registered.');
    if (status === 400) list.push('The server rejected some inputs. Please review and try again.');

    return Array.from(new Set(list.filter(Boolean)));
  };

  const toggleShowPwd = () => {
    const el = pwdRef.current;
    const sel = el ? { s: el.selectionStart, e: el.selectionEnd } : null;
    setShowPwd(v => !v);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus({ preventScroll: true });
      try { if (sel) el.setSelectionRange(sel.s, sel.e); } catch {}
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors([]);

    const clientIssues = validate();
    if (clientIssues.length) {
      setErrors(clientIssues);
      return;
    }

    setSubmitting(true);
    try {
      // backend route is /api/auth/register; our axios base is /api
      const payload = {
        email: email.trim().toLowerCase(),
        display_name: display_name.trim(),
        password,
      };
      const { data } = await api.post('/auth/register', payload);

      const token = data?.token;
      if (!token) {
        setErrors(['Register failed: no token returned.']);
        setSubmitting(false);
        return;
      }

      // store & set default header
      localStorage.setItem('token', token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      nav('/'); // success
    } catch (e) {
      const msgs = normalizeServerErrors(e);
      setErrors(msgs.length ? msgs : ['Register failed. Please try again.']);
    } finally {
      setSubmitting(false);
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

      <main className={styles['login-main']}>
        <form onSubmit={submit} className={styles['login-card']}>
          <h2 className={styles.title}>Register</h2>

          {!!errors.length && (
            <div className={styles.error} role="alert" aria-live="assertive">
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {errors.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="email" className={styles['field-label']}>Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="vampire@domain.com"
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="display_name" className={styles['field-label']}>Display Name</label>
            <input
              type="text"
              id="display_name"
              value={display_name}
              onChange={(e) => setDisplayName(e.target.value)}
              className={styles.input}
              placeholder="Your Real Name"
              autoComplete="nickname"
              required
              minLength={2}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles['field-label']}>Password</label>
            <div className={styles['input-group']}>
              <input
                ref={pwdRef}
                type={showPwd ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${styles.input} ${styles['input-has-button']}`}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <button
                type="button"
                className={`${styles['ghost-btn']} ${styles['eye-btn']}`}
                onMouseDown={(e) => e.preventDefault()} // prevent input blur
                onClick={toggleShowPwd}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                aria-pressed={showPwd}
                aria-controls="password"
                title={showPwd ? 'Hide password' : 'Show password'}
              >
                {/* Note: Removed unused <span className="sr-only"> */}
                {showPwd ? (
                  /* Eye-off icon (standard path) */
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.12 13.12 0 0 0 2 12s3 7 10 7a9.75 9.75 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>
                  </svg>
                ) : (
                  /* Eye icon (standard path) */
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            <p className={styles.muted} style={{ marginTop: 6 }}>
              Use at least 8 characters, with a letter and a number.
            </p>
          </div>

          <div className={styles['captcha-and-terms']}>
            <label className={styles['terms-checkbox']}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                required
              />
              <span className={styles.consentText}>
                I agree to the{' '}
                <Link to="/terms" className={styles.link}>
                  Terms &amp; Conditions
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className={styles.link}>
                  Privacy Policy
                </Link>.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className={styles.cta}
            disabled={submitting}
          >
            {submitting ? 'Registering…' : 'Register'}
          </button>

          <div className={styles.muted}>
            Already have an account? <Link to="/login" className={styles.link}>Log in here.</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
