// src/components/Nav.jsx
import React, { useContext, useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AuthCtx } from '../AuthContext';
import api from '../api';
import styles from '../styles/Nav.module.css';

function NavDropdown({ title, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className={`${styles.dropdown} ${isOpen ? styles.dropdownOpen : ''}`}
      onMouseEnter={() => window.innerWidth > 768 && setIsOpen(true)}
      onMouseLeave={() => window.innerWidth > 768 && setIsOpen(false)}
    >
      <div 
        className={styles.dropdownToggle} 
        onClick={() => setIsOpen(!isOpen)}
      >
        {title} <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>▼</span>
      </div>
      <div className={`${styles.dropdownContent} ${isOpen ? styles.dropdownContentOpen : ''}`}>
        {children}
      </div>
    </div>
  );
}

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

  useEffect(() => {
    let live = true;
    setCanSeePremonitions(false);

    if (!user) return;
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
      .catch(() => {});

    return () => { live = false; };
  }, [user]);

  const getDropdownClass = ({ isActive }) =>
    `${styles.dropdownItem} ${isActive ? styles.dropdownItemActive : ''}`;

  return (
    <>
      <div 
        className={`${styles.mobileOverlay} ${isMenuOpen ? styles.overlayOpen : ''}`} 
        onClick={closeMenu} 
      />

      <nav className={`${styles.navBar} ${isMenuOpen ? styles.navBarOpen : ''}`}>
        <div className={styles.left}>
          <Link to="/" className={styles.brand} aria-label="Erebus Portal — Home" onClick={closeMenu}>
            <img src="/img/ATT-logo(1).png" alt="" className={styles.navLogo} />
            <span className={styles.brandText}>Erebus Portal</span>
          </Link>
        </div>

        <button
          className={`${styles.mobileMenuToggle} ${isMenuOpen ? styles.toggleOpen : ''}`}
          onClick={toggleMenu}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          aria-controls="primary-nav"
        >
          <span className={styles.bar} />
        </button>

        <div id="primary-nav" className={styles.navLinks} role="navigation">
          {user && (
            <>
              <NavDropdown title="Personal">
                <NavLink to="/character" className={getDropdownClass}>Character Sheet</NavLink>
                <NavLink to="/downtimes" className={getDropdownClass}>Actions & Projects</NavLink>
                {canSeePremonitions && (
                  <NavLink to="/premonitions" className={getDropdownClass}>Premonitions</NavLink>
                )}
              </NavDropdown>

              <NavDropdown title="Athens">
                <NavLink to="/court/hierarchy" className={getDropdownClass}>Court Hierarchy</NavLink>
                <NavLink to="/court/announcements" className={getDropdownClass}>Announcements</NavLink>
                <NavLink to="/court/coteries" className={getDropdownClass}>Coteries</NavLink>
                <NavLink to="/boons" className={getDropdownClass}>Boons Ledger</NavLink>
                <NavLink to="/domains" className={getDropdownClass}>City Domains</NavLink>
                <NavLink to="/news" className={getDropdownClass}>News & Rumors</NavLink>
              </NavDropdown>

              <NavDropdown title="Network">
                <NavLink to="/comms" className={getDropdownClass}>SchreckNet Comms</NavLink>
                <NavLink to="/live-session" className={getDropdownClass}>Live Session</NavLink>
              </NavDropdown>
            </>
          )}
          
          {user?.role === 'admin' && (
            <NavDropdown title="Admin">
              <NavLink to="/admin" className={getDropdownClass}>Admin Panel</NavLink>
              <NavLink to="/admin/live-session" className={getDropdownClass}>Live Session Dashboard</NavLink>
            </NavDropdown>
          )}
          
          <div className={styles.mobileUserInfo}>
            {user ? (
              <>
                <span className={styles.greeting}>Logged in as: <b>{user.display_name}</b></span>
                <button type="button" className={styles.logoutBtn} onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <NavLink to="/login" className={styles.navLink}>Login</NavLink>
            )}
          </div>
        </div>

        <div className={styles.desktopUserInfo}>
          {user ? (
            <>
              <span className={styles.greeting}>Hi, {user.display_name}</span>
              <button type="button" className={styles.logoutBtn} onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/login" className={styles.navLink}>Login</NavLink>
          )}
        </div>
      </nav>
    </>
  );
}