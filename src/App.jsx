// src/App.jsx
import React, { useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, NavLink, useLocation } from 'react-router-dom';
import AuthProvider, { AuthCtx } from './AuthContext';
import api from './api'; // Import api
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
import AdminNPCView from './components/AdminNPCView.jsx'; 
import ForgotPassword from './pages/user/ForgotPassword';
import ResetPassword from './pages/user/ResetPassword';
import Boons from './pages/Boons';
import Coteries from './pages/Coteries';
import Premonitions from './pages/Premonitions'; // Import the new page

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

// --- NEW: Wrapper for Malkavians or Admins ---
function MalkavianOrAdminOnly({ children }) {
  const { user } = useContext(AuthCtx);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Reset authorization state on user or location change
    setIsLoading(true);
    setIsAuthorized(false);

    if (!user) {
      setIsLoading(false);
      return; // Not logged in, will be caught by redirect
    }

    // 1. Admins are always authorized
    if (user.role === 'admin') {
      setIsAuthorized(true);
      setIsLoading(false);
      return;
    }

    // 2. Check character clan for non-admins
    let isMounted = true;
    api.get('/characters/me')
      .then(({ data }) => {
        if (!isMounted) return;
        if (data.character && data.character.clan === 'Malkavian') {
          setIsAuthorized(true);
        }
      })
      .catch((err) => {
        console.error("Failed to check character clan", err);
        // Silently fail to false
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    
    return () => { isMounted = false; };

  }, [user, location.pathname]); // Re-check if user changes or if we navigate here

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Checking access...</div>;
  }

  if (!isAuthorized) {
    // Not an admin, not a Malkavian, or check failed
    return <Navigate to="/" replace />;
  }
  
  // Authorized!
  return children;
}


function Nav() {
  const { user, logout } = useContext(AuthCtx);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsMenuOpen(v => !v);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => { closeMenu(); }, [location.pathname]);

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
            <NavLink to="/boons" className={getNavLinkClass}>Boons</NavLink>
            <NavLink to="/coteries" className={getNavLinkClass}>Coteries</NavLink>
            <NavLink to="/comms" className={getNavLinkClass}>Comms</NavLink>
            {/* Note: We don't add Premonitions here because this Nav component
              doesn't know the character's clan, only the user's role.
              The link is correctly placed on the Home page.
            */}
          </>
        )}
        {user?.role === 'admin' && (
          <>
            <NavLink to="/admin" className={getNavLinkClass}>Admin</NavLink>
            {/* <NavLink to="/admin/npcs" className={getNavLinkClass} caseSensitive>NPCs</NavLink> */}
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
              <Route path="/boons" element={<Private><Boons /></Private>} />
              <Route path="/comms" element={<Private><Comms/></Private>} />
              <Route path="/admin" element={<AdminOnly><Admin/></AdminOnly>} />
              <Route path="/admin/npcs" element={<AdminOnly><NPCs/></AdminOnly>} />
              <Route path="/forgot" element={<ForgotPassword />} />
              <Route path="/reset" element={<ResetPassword />} /> 
              <Route path="/admin/npcs/:id" element={<AdminOnly><AdminNPCView/></AdminOnly>} />
              <Route path="/login" element={<Login/>} />
              <Route path="/register" element={<Register/>} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/coteries" element={<Private><Coteries/></Private>} />

              {/* --- NEW PREMONITIONS ROUTE --- */}
              <Route 
                path="/premonitions" 
                element={<MalkavianOrAdminOnly><Premonitions/></MalkavianOrAdminOnly>} 
              />
            </Routes>
          </div>
          <DiceRoller />
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

