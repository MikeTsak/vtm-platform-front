import React, { useState, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import styles from '../../styles/Login.module.css';


export default function ResetPassword() {
  const [sp] = useSearchParams();
  const token = useMemo(() => sp.get('token') || '', [sp]);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (p1 !== p2) return setErr('Passwords do not match.');
    if (p1.length < 8) return setErr('Use at least 8 characters.');
    try {
      await api.post('/auth/reset', { token, password: p1 });
      setOk(true);
      setTimeout(() => nav('/login'), 1500);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Reset failed. The link may be invalid or expired.');
    }
  };

  return (
    <div className={`${styles['login-page']} ${styles['vamp-bg']}`}>
      <div className={styles.vignette} aria-hidden />
      <main>
        <form onSubmit={submit} className={styles['login-card']}>
          <h2 className={styles['card-title']}>Set a new password</h2>

          {ok ? (
            <p className={styles.muted}>Password updated. Redirecting to <Link to="/login" className={styles.link}>Sign In</Link>…</p>
          ) : (
            <>
              {err && <div className={styles.alert}><span className={styles['alert-dot']} />{err}</div>}
              <label className={styles.field}>
                <span className={styles['field-label']}>New password</span>
                <input className={styles.input} type="password" value={p1} onChange={(e) => setP1(e.target.value)} minLength={8} required />
              </label>
              <label className={styles.field}>
                <span className={styles['field-label']}>Confirm new password</span>
                <input className={styles.input} type="password" value={p2} onChange={(e) => setP2(e.target.value)} minLength={8} required />
              </label>
              <button className={styles.cta} type="submit" style={{ marginTop: '0.75rem' }}>
                Update password
              </button>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
