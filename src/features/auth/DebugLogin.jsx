// Admin debug login: not linked from anywhere. Takes a player's email and the
// one-time code an admin generated in Admin > Users (back/routes/debugLogin.js).
import React, { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthCtx } from '../../core/AuthContext';
import { formatApiError } from '../../core/api';
import styles from '../../styles/auth/Login.module.css';

export default function DebugLogin() {
  const { debugLogin } = useContext(AuthCtx);
  const nav = useNavigate();
  // Admin > Users links here with #email=...&code=...; read it once, then drop it from the URL/history.
  const [prefill] = useState(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    return { email: h.get('email') || '', code: h.get('code') || '' };
  });
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const [email, setEmail] = useState(prefill.email);
  const [code, setCode] = useState(prefill.code);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await debugLogin(email.trim(), code.trim());
      nav('/', { replace: true });
    } catch (err) {
      toast.error(formatApiError(err, 'Invalid or expired code'));
      setBusy(false);
    }
  };

  return (
    <div className={`${styles['login-page']} ${styles['vamp-bg']}`}>
      <Helmet>
        <title>Erebus Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className={styles.vignette} aria-hidden="true" />
      <main>
        <form onSubmit={submit} className={styles['login-card']} aria-labelledby="debugTitle">
          <h2 id="debugTitle" className={styles['card-title']}>Debug Login</h2>
          <label className={styles.field}>
            <span className={styles['field-label']}>Player email</span>
            <input className={styles.input} type="email" autoComplete="off" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles['field-label']}>One-time code</span>
            <input className={styles.input} autoComplete="one-time-code" required placeholder="XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }} />
          </label>
          <button className={styles.cta} type="submit" disabled={busy} style={{ marginTop: '0.75rem', opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Verifying...' : 'Enter as player'}
          </button>
        </form>
      </main>
    </div>
  );
}
