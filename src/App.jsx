import React, { useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, NavLink, useLocation } from 'react-router-dom';
import AuthProvider, { AuthCtx } from './AuthContext';
import Login from './pages/user/Login';
import Register from './pages/user/Register';
import Home from './pages/Home';
import CharacterView from './pages/CharacterView';
import CharacterSetup from './pages/CharacterSetup';
import Domains from './pages/Domains';
import DownTimes from './pages/DownTimes';
import Comms from './pages/Comms';
import Admin from './pages/Admin';
import Footer from './components/Footer';
import styles from './styles/Nav.module.css';
import DiceRoller from './components/DiceRoller';
import Terms from './pages/Terms';
import Legal from './pages/Legal';
import Privacy from './pages/Privacy';
import NPCs from './pages/NPCs';
import AdminNPCView from './pages/AdminNPCView';
import AdminNPC from './pages/AdminNPCView';


function Private({ children }) {
  const { user } = useContext(AuthCtx);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { user } = useContext(AuthCtx);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function Nav() {
  const { user, logout } = useContext(AuthCtx);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsMenuOpen(v => !v);
  const closeMenu = () => setIsMenuOpen(false);

  // Close the menu on route change
  useEffect(() => { closeMenu(); }, [location.pathname]);

  // Optional: prevent body scroll when mobile menu open
  useEffect(() => {
    if (isMenuOpen) document.documentElement.style.overflow = 'hidden';
    else document.documentElement.style.overflow = '';
    return () => { document.documentElement.style.overflow = ''; };
  }, [isMenuOpen]);

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
            <NavLink to="/comms" className={getNavLinkClass}>Comms</NavLink>
          </>
        )}
        {user?.role === 'admin' && (
          <>
          <NavLink to="/admin" className={getNavLinkClass}>Admin</NavLink>
          {/* <NavLink to="/admin/npcs" caseSensitive>NPCs</NavLink> */}
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
          <Nav />
          <div style={{ flexGrow: 1 }}>
            <Routes>
              <Route path="/" element={<Private><Home/></Private>} />
              <Route path="/character" element={<Private><CharacterView/></Private>} />
              <Route path="/make" element={<Private><CharacterSetup/></Private>} />
              <Route path="/domains" element={<Private><Domains/></Private>} />
              <Route path="/downtimes" element={<Private><DownTimes/></Private>} />
              <Route path="/comms" element={<Private><Comms/></Private>} />
              <Route path="/admin" element={<AdminOnly><Admin/></AdminOnly>} />
              <Route path="/admin/npcs" element={<AdminOnly><NPCs/></AdminOnly>} />
              <Route path="/admin/npcs/:id" element={<AdminNPC />} />
              <Route path="/login" element={<Login/>} />
              <Route path="/register" element={<Register/>} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/privacy" element={<Privacy />} />
            </Routes>
          </div>
          <DiceRoller />
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}