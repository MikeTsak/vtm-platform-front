import React, { useState, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import styles from '../../styles/Login.module.css';

export default function ResetPassword() {
  const [sp] = useSearchParams();
  // Extract token from URL: ?token=tokenId.secret
  const token = useMemo(() => sp.get('token') || '', [sp]);
  
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const nav = useNavigate();

  // 1. Immediate improvement: Check if token exists on mount
  if (!token) {
    return (
      <div className={`${styles['login-page']} ${styles['vamp-bg']}`}>
        <div className={styles.vignette} aria-hidden />
        <main>
          <div className={styles['login-card']}>
            <h2 className={styles['card-title']}>Invalid Link</h2>
            <p className={styles.muted}>
              The ritual link is missing or broken. Please request a new one.
            </p>
            <Link to="/forgot-password" className={styles.cta} style={{ display: 'block', textAlign: 'center', marginTop: '1rem', textDecoration: 'none' }}>
              Back to Restoration
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    
    // 2. Client-side Validation
    if (p1 !== p2) return setErr('Passwords do not match.');
    if (p1.length < 8) return setErr('Use at least 8 characters.');

    setLoading(true);
    try {
      // Sends { token: "uuid.secret", password: "newpassword" }
      await api.post('/auth/reset', { token, password: p1 });
      setOk(true);
      
      // Brief delay so user can see the success message
      setTimeout(() => nav('/login'), 2000);
    } catch (e) {
      // Capture specific server errors (e.g., "Invalid or expired token")
      setErr(e?.response?.data?.error || 'Reset failed. The link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles['login-page']} ${styles['vamp-bg']}`}>
      <div className={styles.vignette} aria-hidden />
      <main>
        <form onSubmit={submit} className={styles['login-card']}>
          <h2 className={styles['card-title']}>Set a new password</h2>

          {ok ? (
            <div className={styles.success_state}>
              <p className={styles.muted}>
                Your essence has been restored. Redirecting to <Link to="/login" className={styles.link}>Sign In</Link>...
              </p>
            </div>
          ) : (
            <>
              <p className={styles.muted} style={{ marginBottom: '1.5rem' }}>
                Ensure your new password is at least 8 characters long.
              </p>

              {err && (
                <div className={styles.alert}>
                  <span className={styles['alert-dot']} />
                  {err}
                </div>
              )}

              <label className={styles.field}>
                <span className={styles['field-label']}>New password</span>
                <input 
                  className={styles.input} 
                  type="password" 
                  value={p1} 
                  onChange={(e) => setP1(e.target.value)} 
                  minLength={8} 
                  required 
                  disabled={loading}
                  placeholder="••••••••"
                />
              </label>

              <label className={styles.field}>
                <span className={styles['field-label']}>Confirm new password</span>
                <input 
                  className={styles.input} 
                  type="password" 
                  value={p2} 
                  onChange={(e) => setP2(e.target.value)} 
                  minLength={8} 
                  required 
                  disabled={loading}
                  placeholder="••••••••"
                />
              </label>

              <button 
                className={styles.cta} 
                type="submit" 
                style={{ marginTop: '1rem' }}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </>
          )}
        </form>
      </main>
    </div>
  );
}