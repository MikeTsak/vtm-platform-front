import React, { useState } from 'react';
import api from '../../api';
import styles from '../../styles/Login.module.css';


export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await api.post('/auth/forgot', { email });
      setDone(true); // always success UI (no account enumeration)
    } catch (e) {
      // Still show "done" for enumeration safety; optionally show generic error
      setDone(true);
    }
  };

  return (
    <div className={`${styles['login-page']} ${styles['vamp-bg']}`}>
      <div className={styles.vignette} aria-hidden />
      <main>
        <form onSubmit={submit} className={styles['login-card']}>
          <h2 className={styles['card-title']}>Forgot your password?</h2>
          {done ? (
            <p className={styles.muted}>
              If an account exists for that email, we’ve sent a reset link. Please check your inbox.
            </p>
          ) : (
            <>
              {err && <div className={styles.alert}><span className={styles['alert-dot']} />{err}</div>}
              <label className={styles.field}>
                <span className={styles['field-label']}>Email</span>
                <input
                  className={styles.input}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  autoComplete="email"
                />
              </label>
              <button className={styles.cta} type="submit" style={{ marginTop: '0.75rem' }}>
                Send reset link
              </button>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
