// src/App.jsx
import React, { useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AuthProvider, { AuthCtx } from './AuthContext';
import api from './api';

// Pages & Components
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
import DiceRoller from './components/DiceRoller';
import Terms from './pages/Terms';
import Legal from './pages/Legal';
import Privacy from './pages/Privacy';
import NPCs from './pages/NPCs';
import AdminNPCView from './components/AdminNPCView.jsx';
import ForgotPassword from './pages/user/ForgotPassword';
import ResetPassword from './pages/user/ResetPassword';
import Boons from './pages/Boons';
import Court from './pages/Court';
import MediaViewer from './pages/MediaViewer';
import Premonitions from './pages/Premonitions';
import News from './pages/News'; 
import GlobalBanner from './components/GlobalBanner';
import Nav from './components/Nav'; // ✅ IMPORT THE NEW NAV COMPONENT

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

// Wrapper for Malkavians or Admins
function MalkavianOrAdminOnly({ children }) {
  const { user } = useContext(AuthCtx);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    setIsLoading(true);
    setIsAuthorized(false);
    if (!user) { setIsLoading(false); return; }

    if (user.role === 'admin') { // admins always allowed
      setIsAuthorized(true);
      setIsLoading(false);
      return;
    }

    let live = true;
    api.get('/characters/me')
      .then(({ data }) => {
        if (!live) return;
        const clan = data?.character?.clan;
        setIsAuthorized(clan === 'Malkavian');
      })
      .catch(() => { /* deny by default */ })
      .finally(() => live && setIsLoading(false));
    return () => { live = false; };
  }, [user, location.pathname]);

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Checking access...</div>;
  }
  if (!isAuthorized) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
          <GlobalBanner />
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
              <Route path="/court" element={<Private><Court/></Private>} />
              
              <Route path="/news" element={<Private><News/></Private>} />

              <Route path="/admin" element={<AdminOnly><Admin/></AdminOnly>} />
              <Route path="/admin/npcs" element={<AdminOnly><NPCs/></AdminOnly>} />
              <Route path="/admin/npcs/:id" element={<AdminOnly><AdminNPCView/></AdminOnly>} />
              
              <Route path="/forgot" element={<ForgotPassword />} />
              <Route path="/reset" element={<ResetPassword />} />
              <Route path="/login" element={<Login/>} />
              <Route path="/register" element={<Register/>} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/media/:id" element={<MediaViewer />} />
              
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