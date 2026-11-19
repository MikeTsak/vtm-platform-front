import React, { useState } from 'react';
import api, { formatApiError } from '../../core/api';
import styles from '../../styles/auth/Login.module.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);

    try {
      // The server handles checking if the user exists and sending via EmailJS.
      await api.post('/auth/forgot', { email: email.trim() });
      setDone(true); 
    } catch (error) {
      // Keep 400/404 opaque so attackers cannot enumerate registered emails.
      const status = error.response?.status;
      if (status === 400 || status === 404) {
        setDone(true);
      } else {
        setErr(formatApiError(error, 'Failed to send password reset email. Please try again in a few moments.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles['login-page']} ${styles['vamp-bg']}`}>
      <div className={styles.vignette} aria-hidden />
      <main>
        <form onSubmit={submit} className={styles['login-card']}>
          <h2 className={styles['card-title']}>Restoration</h2>
          
          {done ? (
            <div className={styles.success_state}>
              <p className={styles.muted}>
                If an account is bound to <strong>{email}</strong>, a ritual link has been dispatched. 
                Check your inbox and your spam folder.
              </p>
              <button 
                type="button" 
                className={styles.cta} 
                onClick={() => window.location.href = '/login'}
              >
                Return to Login
              </button>
            </div>
          ) : (
            <>
              <p className={styles.muted} style={{ marginBottom: '1.5rem' }}>
                Enter your email address to receive a password reset link.
              </p>
              
              {err && (
                <div className={styles.alert} role="alert">
                  <span className={styles['alert-dot']} />
                  <span>{err}</span>
                </div>
              )}

              <label className={styles.field}>
                <span className={styles['field-label']}>Email Address</span>
                <input
                  className={styles.input}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kindred@erebus.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </label>

              <button 
                className={styles.cta} 
                type="submit" 
                style={{ marginTop: '1rem' }}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </>
          )}
        </form>
      </main>
    </div>
  );
}