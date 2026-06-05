// src/components/Nav.jsx
import React, { useContext, useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AuthCtx } from '../AuthContext';
import api from '../api';
import styles from '../styles/Nav.module.css';

export default function Nav() {
  const { user, logout } = useContext(AuthCtx);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [canSeePremonitions, setCanSeePremonitions] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsMenuOpen(v => !v);
  const closeMenu = () => setIsMenuOpen(false);
  
  useEffect(() => { 
    closeMenu(); 
  }, [location.pathname]);

  useEffect(() => {
    if (isMenuOpen) document.documentElement.style.overflow = 'hidden';
    else document.documentElement.style.overflow = '';
    return () => { document.documentElement.style.overflow = ''; };
  }, [isMenuOpen]);

  // ✅ Detect if user is admin OR has a Malkavian character, to show the Premonitions link
  useEffect(() => {
    let live = true;
    setCanSeePremonitions(false);

    if (!user) {
      return;
    }
    if (user.role === 'admin') {
      setCanSeePremonitions(true);
      return;
    }

    api.get('/characters/me')
      .then(({ data }) => {
        if (!live) return;
        const clan = data?.character?.clan;
        setCanSeePremonitions(clan === 'Malkavian');
      })
      .catch(() => { /* ignore; default false */ });

    return () => { live = false; };
  }, [user]);

  const getNavLinkClass = ({ isActive }) =>
    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;

  return (
    <nav className={`${styles.navBar} ${isMenuOpen ? styles.open : ''}`}>
      <div className={styles.left}>
        <Link to="/" className={styles.brand} aria-label="Erebus Portal — Home" onClick={closeMenu}>
          <img src="/img/ATT-logo(1).png" alt="" className={styles.navLogo} />
          <span className={styles.brandText}>Erebus Portal</span>
        </Link>
      </div>

      {/* Hamburger (mobile) */}
      <button
        className={`${styles.mobileMenuToggle} ${isMenuOpen ? styles.open : ''}`}
        onClick={toggleMenu}
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMenuOpen}
        aria-controls="primary-nav"
      >
        <span className={styles.bar}></span>
      </button>

      {/* Main navigation links */}
      <div id="primary-nav" className={styles.navLinks} role="navigation" aria-label="Primary">
        {user && (
          <>
            <NavLink to="/character" className={getNavLinkClass}>Character</NavLink>
            <NavLink to="/domains" className={getNavLinkClass}>Domains</NavLink>
            <NavLink to="/downtimes" className={getNavLinkClass}>Downtimes</NavLink>
            <NavLink to="/boons" className={getNavLinkClass}>Boons</NavLink>
            <NavLink to="/court" className={getNavLinkClass}>Court</NavLink>
            <NavLink to="/news" className={getNavLinkClass}>News</NavLink>
            <NavLink to="/comms" className={getNavLinkClass}>Comms</NavLink>

            {/* 🔮 Premonitions link: only for Admins or Malkavian players */}
            {canSeePremonitions && (
              <NavLink to="/premonitions" className={getNavLinkClass} title="Premonitions">
                Premonitions
              </NavLink>
            )}
          </>
        )}
        {user?.role === 'admin' && (
          <>
            <NavLink to="/admin" className={getNavLinkClass}>Admin</NavLink>
          </>
        )}
      </div>

      <div className={styles.userInfo}>
        {user ? (
          <>
            <span className={styles.greeting}>Hi, {user.display_name}</span>
            <button type="button" className={styles.logoutBtn} onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <NavLink to="/login" className={getNavLinkClass}>Login</NavLink>
        )}
      </div>
    </nav>
  );
}