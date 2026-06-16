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
import Boons from './pages/Boons';
import Court from './pages/Court';
import MediaViewer from './pages/MediaViewer';
import Premonitions from './pages/Premonitions';
import News from './pages/News';
import GlobalBanner from './components/GlobalBanner';
import Nav from './components/Nav';
import NotFound from './pages/404';
import Hierarchy from './components/HierarchyView.jsx';
import Announcements from './components/AnnouncementsView.jsx';
import Coteries from './components/CoterieManager.jsx';
import LiveSession from './pages/LiveSession';
import LiveSessionDashboard from './pages/admin/LiveSessionDashboard';
import SchreckNet from './pages/SchreckNet';
import SurfaceWeb from './pages/SurfaceWeb';
// Missing imports that were causing errors
import Admin from './pages/Admin';
import NPCs from './pages/NPCs';
import AdminNPCView from './components/AdminNPCView.jsx';
import ForgotPassword from './pages/user/ForgotPassword';
import ResetPassword from './pages/user/ResetPassword';
import Terms from './pages/Terms';
import Legal from './pages/Legal';
import Privacy from './pages/Privacy';
import DiceRoller from './components/DiceRoller';
import Footer from './components/Footer';

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
    // Read the pathname inside the effect body if you ever need to use it
    // otherwise, it no longer needs to be in the dependency array.
    const currentPath = location.pathname;

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
  }, [user]); // 👈 REMOVED location.pathname FROM HERE

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
              <Route path="/boons" element={<Private><Boons/></Private>} />
              <Route path="/schrecknet" element={<Private><SchreckNet/></Private>} />
              <Route path="/surfaceweb" element={<Private><SurfaceWeb/></Private>} />
              <Route path="/live-session" element={<Private><LiveSession/></Private>} />
              <Route path="/court" element={<Private><Court/></Private>} />
              <Route path="/court/hierarchy" element={<Private><Hierarchy /></Private>} />
              <Route path="/court/announcements" element={<Private><Announcements /></Private>} />
              <Route path="/court/coteries" element={<Private><Coteries /></Private>} />

              <Route path="/news" element={<Private><News/></Private>} />

              <Route path="/admin" element={<AdminOnly><Admin/></AdminOnly>} />
              <Route path="/admin/live-session" element={<AdminOnly><LiveSessionDashboard/></AdminOnly>} />
              <Route path="/admin/npcs" element={<AdminOnly><NPCs/></AdminOnly>} />
              <Route path="/admin/npcs/:id" element={<AdminOnly><AdminNPCView /></AdminOnly>} />

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
                element={<MalkavianOrAdminOnly><Premonitions /></MalkavianOrAdminOnly>}
              />

              {/* ✅ ADDED CATCH-ALL ROUTE HERE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <DiceRoller />
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}