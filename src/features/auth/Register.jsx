import React, { useContext, useRef, useState } from 'react';
import { AuthCtx } from '../../core/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import styles from '../../styles/auth/Login.module.css';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  display_name: z.string().min(2, 'Display name must be at least 2 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must include a letter')
    .regex(/[0-9]/, 'Password must include a number'),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the Terms & Conditions and Privacy Policy' })
  }),
});

export default function Register() {
  const { register: registerAction } = useContext(AuthCtx);
  const nav = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const pwdRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      display_name: '',
      password: '',
      agreedToTerms: false,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data) => {
      // Passes the form data to AuthContext's register function
      await registerAction(data.email, data.display_name, data.password);
      return data;
    },
    onSuccess: () => {
      toast.success('Registration successful! Welcome to the Court.');
      nav('/');
    },
    onError: (error) => {
      const status = error?.response?.status;
      const data = error?.response?.data;
      let errMsg = 'Registration failed. Please try again.';
      
      if (status === 409) errMsg = 'This email may already be registered.';
      else if (data?.error) errMsg = data.error;
      else if (data?.message) errMsg = data.message;
      
      toast.error(errMsg);
    },
  });

  const onSubmit = (data) => {
    registerMutation.mutate(data);
  };

  const toggleShowPwd = () => {
    setShowPwd((prev) => !prev);
  };

  const { ref: pwdRegisterRef, ...pwdRest } = register('password');

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
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onSubmit={handleSubmit(onSubmit)} 
          className={styles['login-card']}
        >
          <h2 className={styles.title}>Register</h2>

          <div className={styles.field}>
            <label htmlFor="email" className={styles['field-label']}>Email</label>
            <input
              type="email"
              id="email"
              className={styles.input}
              placeholder="vampire@domain.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{errors.email.message}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="display_name" className={styles['field-label']}>Display Name</label>
            <input
              type="text"
              id="display_name"
              className={styles.input}
              placeholder="Your Real Name"
              autoComplete="nickname"
              {...register('display_name')}
            />
            {errors.display_name && <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{errors.display_name.message}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles['field-label']}>Password</label>
            <div className={styles['input-group']}>
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                className={`${styles.input} ${styles['input-has-button']}`}
                placeholder="••••••••"
                autoComplete="new-password"
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
                title={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.12 13.12 0 0 0 2 12s3 7 10 7a9.75 9.75 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{errors.password.message}</span>}
          </div>

          <div className={styles['captcha-and-terms']}>
            <label className={styles['terms-checkbox']}>
              <input
                type="checkbox"
                {...register('agreedToTerms')}
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
            {errors.agreedToTerms && <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>{errors.agreedToTerms.message}</span>}
          </div>

          <button
            type="submit"
            className={styles.cta}
            disabled={registerMutation.isPending}
            style={{ opacity: registerMutation.isPending ? 0.7 : 1 }}
          >
            {registerMutation.isPending ? 'Registering…' : 'Register'}
          </button>

          <div className={styles.muted}>
            Already have an account? <Link to="/login" className={styles.link}>Log in here.</Link>
          </div>
        </motion.form>
      </main>
    </div>
  );
}
