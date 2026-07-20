import React, { useContext, useEffect, useRef, useState } from 'react';
import { AuthCtx } from '../../core/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import styles from '../../styles/auth/Login.module.css';
import { trackEvent } from '../../utils/analytics';

// Zod Schema for validation
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  remember: z.boolean().optional(),
});

export default function Login() {
  const { login } = useContext(AuthCtx);
  const nav = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const pwdRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  // Prefill from localStorage
  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem('rememberMe') === '1';
      const savedEmail = localStorage.getItem('rememberEmail') || '';
      if (savedRemember) {
        setValue('remember', true);
        if (savedEmail) setValue('email', savedEmail);
      }
    } catch (_) { }
  }, [setValue]);

  // React Query Mutation
  const loginMutation = useMutation({
    mutationFn: async (data) => {
      await login(data.email, data.password);
      return data;
    },
    onSuccess: (data) => {
      try {
        if (data.remember) {
          localStorage.setItem('rememberMe', '1');
          localStorage.setItem('rememberEmail', data.email);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('rememberEmail');
        }
      } catch { }

      toast.success('Welcome back!');
      nav('/');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Login failed. Please check your credentials.');
    },
  });

  const onSubmit = (data) => {
    loginMutation.mutate(data);
  };

  const toggleShowPwd = () => {
    setShowPwd((prev) => !prev);
  };

  const { ref: pwdRegisterRef, ...pwdRest } = register('password');

  return (
    <div className={`${styles['login-page']} ${styles['vamp-bg']}`}>
      <div className={styles.vignette} aria-hidden="true" />
      <header className={styles['login-header']} aria-label="App header">
        <img src="/img/ATT-logo(1).png" alt="ATT LARP Logo" className={styles['login-logo']} draggable="false" />
        <h1 className={styles.brand}>Erebus Portal</h1>
      </header>

      <main>
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onSubmit={handleSubmit(onSubmit)}
          className={styles['login-card']}
          aria-labelledby="loginTitle"
        >
          <h2 id="loginTitle" className={styles['card-title']}>Sign In</h2>

          <label className={styles.field}>
            <span className={styles['field-label']}>Email</span>
            <input
              className={styles.input}
              placeholder="you@gmail.com"
              type="email"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{errors.email.message}</span>}
          </label>

          <label className={styles.field}>
            <span className={styles['field-label']}>Password</span>
            <div className={styles['input-group']}>
              <input
                id="password"
                className={`${styles.input} ${styles['input-has-button']}`}
                placeholder="••••••••"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                {...pwdRest}
                ref={(e) => {
                  pwdRegisterRef(e);
                  pwdRef.current = e;
                }}
              />
              <button
                type="button"
                className={`${styles['ghost-btn']} ${styles['eye-btn']}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggleShowPwd}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                data-cuelume-press="pop"
                data-cuelume-hover
              >
                {showPwd ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.12 13.12 0 0 0 2 12s3 7 10 7a9.75 9.75 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{errors.password.message}</span>}
          </label>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.25rem' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" {...register('remember')} />
              <span className={styles.muted}>Remember me</span>
            </label>
            <Link to="/forgot" className={styles.link} data-cuelume-press data-cuelume-hover>Forgot your password?</Link>
          </div>

          <button className={styles.cta} type="submit" disabled={loginMutation.isPending} style={{ marginTop: '0.75rem', opacity: loginMutation.isPending ? 0.7 : 1 }} data-cuelume-press data-cuelume-release="success" data-cuelume-hover>
            {loginMutation.isPending ? 'Authenticating...' : 'Enter the Court'}
          </button>

          <p className={styles.muted}>
            No account? <Link to="/register" className={styles.link} data-cuelume-press data-cuelume-hover>Request Embrace</Link>
          </p>
        </motion.form>
      </main>
    </div>
  );
}