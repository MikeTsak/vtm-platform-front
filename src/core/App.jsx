// src/App.jsx
import React, { useContext, useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import AuthProvider, { AuthCtx } from './AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import NotificationBanner from '../features/notification/NotificationBanner';
import api from './api';
import { Skeleton } from 'boneyard-js/react';
import { trackPageView, setUserId, setUserProperties } from '../utils/analytics';

// Pages & Components (Critical Path)
import Login from '../features/auth/Login';
import Register from '../features/auth/Register';
import Home from '../pages/Home';
import GlobalBanner from '../components/GlobalBanner';
import CookieConsent from '../components/CookieConsent';
import Nav from '../ui/Nav';
import Footer from '../ui/Footer';
import DiceRoller from '../features/dice/DiceRoller';

// Lazy Loaded Routes
const CharacterView = React.lazy(() => import('../features/character/CharacterView'));
const CharacterSetup = React.lazy(() => import('../features/character/CharacterSetup'));
const Domains = React.lazy(() => import('../features/domains/Domains'));
const DownTimes = React.lazy(() => import('../features/downtimes/DownTimes'));
const Boons = React.lazy(() => import('../features/boons/Boons'));
const MediaViewer = React.lazy(() => import('../pages/MediaViewer'));
const Premonitions = React.lazy(() => import('../features/premonitions/Premonitions'));
const News = React.lazy(() => import('../features/news/News'));
const PublicArticleView = React.lazy(() => import('../features/news/PublicArticleView'));
const NotFound = React.lazy(() => import('../pages/404'));
const Hierarchy = React.lazy(() => import('../features/court/HierarchyView'));
const Announcements = React.lazy(() => import('../features/announcements/AnnouncementsView'));
const Coteries = React.lazy(() => import('../features/coterie/CoterieManager'));
const LiveSession = React.lazy(() => import('../features/live-session/LiveSession'));
const LiveSessionDashboard = React.lazy(() => import('../features/admin/LiveSessionDashboard'));
const SchreckNet = React.lazy(() => import('../features/comms/schrecknet/SchreckNet'));
const SurfaceWeb = React.lazy(() => import('../features/comms/surfaceweb/SurfaceWeb'));
const Admin = React.lazy(() => import('../features/admin/Admin'));
const NPCs = React.lazy(() => import('../features/npcs/NPCs'));
const AdminNPCView = React.lazy(() => import('../features/admin/AdminNPCView'));
const RetainersView = React.lazy(() => import('../features/character/RetainersView'));
const ForgotPassword = React.lazy(() => import('../features/auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('../features/auth/ResetPassword'));
const Terms = React.lazy(() => import('../pages/Terms'));
const Legal = React.lazy(() => import('../pages/Legal'));
const Privacy = React.lazy(() => import('../pages/Privacy'));

function Private({ children }) {
  const { user, loading } = useContext(AuthCtx);
  if (loading) return <Skeleton name="app-loading" loading={true} />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { user, loading } = useContext(AuthCtx);
  if (loading) return <Skeleton name="app-loading" loading={true} />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

// Wrapper for Admins or Court users (Storytellers running Live Sessions, Boons, etc.)
function CourtOnly({ children }) {
  const { user, loading } = useContext(AuthCtx);
  if (loading) return <Skeleton name="app-loading" loading={true} />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin' && user.role !== 'courtuser') return <Navigate to="/" replace />;
  return children;
}

// Wrapper for Malkavians or Admins
function MalkavianOrAdminOnly({ children }) {
  const { user, loading: authLoading } = useContext(AuthCtx);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setIsAllowed(false);
      return;
    }
    api.get('/characters/me')
      .then(({ data }) => {
        const isMalkavian = data.character?.clan?.toLowerCase() === 'malkavian';
        setIsAllowed(!!user && (user.role === 'admin' || isMalkavian));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setIsAllowed(false);
      });
  }, [user, authLoading]);

  if (loading) {
    return <Skeleton name="malkavian-admin-only-loading" loading={true} />;
  }

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return children;
}

const IMMERSIVE_ROUTES = ['/schrecknet', '/surfaceweb'];

function AppLayout() {
  const location = useLocation();
  const isImmersive = IMMERSIVE_ROUTES.includes(location.pathname);
  const { user } = useContext(AuthCtx);

  useEffect(() => {
    import('cuelume').then(({ bind }) => bind());
  }, []);

  useEffect(() => {
    if (user !== null) {
      import('cuelume').then(({ setEnabled }) => {
        // user.ui_sounds_enabled defaults to true if not specified
        setEnabled(user.ui_sounds_enabled !== false);
      });
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      document.body.classList.add('admin-theme');
    } else {
      document.body.classList.remove('admin-theme');
    }

    // Google Analytics: Track User Identity
    if (user) {
      setUserId(user.id);
      
      // Fetch character to get Clan and Sect for tracking demographics
      api.get('/characters/me').then(({ data }) => {
        if (data.character) {
          setUserProperties({
            clan: data.character.clan || 'Unknown',
            sect: data.character.sect || 'Unknown'
          });
        }
      }).catch(() => { /* skip if err */ });
    }
  }, [user]);

  // Google Analytics: Track Page Views
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);

  return (
    <div
      style={
        isImmersive
          ? { display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }
          : { display: 'flex', flexDirection: 'column', minHeight: '100dvh' }
      }
    >
      <Helmet>
        <link rel="canonical" href={`https://portal.attlarp.gr${location.pathname}`} />
      </Helmet>
      <GlobalBanner />
      <Nav />
      <div
        style={
          isImmersive
            ? { flex: '1 1 auto', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
            : { flexGrow: 1 }
        }
      >
        <Suspense fallback={<Skeleton name="page-loading" loading={true} />}>
          <Routes>
            <Route path="/" element={<Private><Home /></Private>} />
            <Route path="/character" element={<Private><CharacterView /></Private>} />
            <Route path="/retainers" element={<Private><RetainersView /></Private>} />
            <Route path="/make" element={<Private><CharacterSetup /></Private>} />
            <Route path="/domains" element={<Private><Domains /></Private>} />
            <Route path="/downtimes" element={<Private><DownTimes /></Private>} />
            <Route path="/boons" element={<Private><Boons /></Private>} />
            <Route path="/schrecknet" element={<Private><SchreckNet /></Private>} />
            <Route path="/surfaceweb" element={<Private><SurfaceWeb /></Private>} />
            <Route path="/live-session" element={<Private><LiveSession /></Private>} />
            <Route path="/court" element={<Navigate to="/court/hierarchy" replace />} />
            <Route path="/court/hierarchy" element={<Private><Hierarchy /></Private>} />
            <Route path="/court/announcements" element={<Private><Announcements /></Private>} />
            <Route path="/court/announcements/:id" element={<PublicArticleView />} />
            <Route path="/court/coteries" element={<Private><Coteries /></Private>} />

            <Route path="/news" element={<News />} />
            <Route path="/news/:id" element={<PublicArticleView />} />
            <Route path="/rumors" element={<News />} />
            <Route path="/rumors/:id" element={<PublicArticleView />} />

            <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
            <Route path="/admin/live-session" element={<CourtOnly><LiveSessionDashboard /></CourtOnly>} />
            <Route path="/admin/npcs" element={<AdminOnly><NPCs /></AdminOnly>} />
            <Route path="/admin/npcs/:id" element={<AdminOnly><AdminNPCView /></AdminOnly>} />

            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/reset" element={<ResetPassword />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/media/:id" element={<MediaViewer />} />

            <Route
              path="/premonitions"
              element={<MalkavianOrAdminOnly><Premonitions /></MalkavianOrAdminOnly>}
            />

            {/* ✅ Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      <NotificationBanner />
      <DiceRoller />
      <CookieConsent />
      {!isImmersive && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}