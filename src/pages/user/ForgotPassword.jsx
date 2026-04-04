import React, { useState } from 'react';
import api from '../../api';
import styles from '../../styles/Login.module.css';

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
      // The server will handle the logic of checking if the user exists
      // and sending the EmailJS template.
      await api.post('/auth/forgot', { email: email.trim() });
      setDone(true); 
    } catch (error) {
      // Security: If the error is a 404 or 400, we still show "done"
      // to prevent attackers from guessing which emails are registered.
      if (error.response && error.response.status < 500) {
        setDone(true);
      } else {
        // Only show a real error if the server is down or crashed
        setErr("The shadows are restless. Please try again in a few moments.");
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
                <div className={styles.alert}>
                  <span className={styles['alert-dot']} />
                  {err}
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