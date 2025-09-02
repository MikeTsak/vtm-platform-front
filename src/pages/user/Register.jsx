import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from '../../styles/Login.module.css';

// We'll mock the AuthContext and register function as they were not provided.
const AuthCtx = React.createContext({
  register: (email, display_name, password) => {
    return new Promise((resolve) => {
      console.log(`Registering user: ${display_name}, with email: ${email}`);
      resolve();
    });
  }
});

export default function Register() {
  const { register } = useContext(AuthCtx);
  const [email, setEmail] = useState('');
  const [display_name, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const nav = useNavigate();
  
  // Dynamically load the Google reCAPTCHA script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://www.google.com/recaptcha/api.js";
    script.async = true;
    document.body.appendChild(script);
    
    // Cleanup function
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    
    // Get the reCAPTCHA response token from the hidden input field
    const recaptchaToken = window.grecaptcha?.getResponse();

    if (!recaptchaToken) {
      setErr('Please complete the reCAPTCHA to prove you are not a robot.');
      return;
    }
    
    if (!agreedToTerms) {
      setErr('You must agree to the terms and conditions to register.');
      return;
    }

    try {
      await register(email, display_name, password);
      nav('/');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Register failed');
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
          {err && <div className={styles.error}>{err}</div>}
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
              placeholder="Kindred Name"
              autoComplete="nickname"
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password" className={styles['field-label']}>Password</label>
            <div className={styles['input-group']}>
              <input
                type={showPwd ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${styles.input} ${styles['input-has-button']}`}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className={styles['eye-btn']}
                onClick={() => setShowPwd(!showPwd)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 5C7 5 2.73 8.11 1 12c.73 1.68 1.88 3.15 3.29 4.32L2 19.59 3.41 21l18-18L20.59 2 16.85 5.74C15.28 5.27 13.67 5 12 5zm0 2c1.29 0 2.53.22 3.69.62l-1.66 1.66A4.985 4.985 0 0 0 12 8c-2.76 0-5 2.24-5 5 0 .85.21 1.64.58 2.34l-1.5 1.5C4.72 15.42 3.88 14.26 3.34 13c1.46-3.27 4.92-6 8.66-6zm0 4c.46 0 .9.1 1.29.29L10.29 14.3A2.985 2.985 0 0 0 12 11c2.21 0 4 1.79 4 4 0 .46-.1.9-.29 1.29L17.71 19.71A7.052 7.052 0 0 0 12 17c-3.89 0-7.14-3.09-8.46-7.14L.5 6.5C1.86 4.3 6.67 2 12 2c2.81 0 5.48.74 7.74 2.05L17.58 6.5C15.82 5.56 14 5 12 5z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          <div className={styles['captcha-and-terms']}>
            <div className="g-recaptcha" data-sitekey="6LfBhGwUAAAAAE0AHoSQn3Mdg6LlZjfi4JeYbUJH"></div>
            
            <label className={styles['terms-checkbox']}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                required
              />
              <span className={styles.consentText}>
                I agree to the{" "}
                <Link to="/terms" className={styles.link}>
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className={styles.link}>
                  Privacy Policy
                </Link>.
              </span>
            </label>
          </div>

          <button type="submit" className={styles.cta}>Register</button>
          <div className={styles.muted}>
            Already have an account? <Link to="/login" className={styles.link}>Log in here.</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
