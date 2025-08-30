import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import AuthProvider, { AuthCtx } from './AuthContext';
import Login from './pages/user/Login';
import Register from './pages/user/Register';
import Home from './pages/Home';
import CharacterView from './pages/CharacterView';
import CharacterSetup from './pages/CharacterSetup';
import Domains from './pages/Domains';
import Dashboard from './pages/Dashboard'; // used for Downtimes
import Comms from './pages/Comms';
import Admin from './pages/Admin';
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

function Nav() {
  const { user, logout } = useContext(AuthCtx);
  return (
    <nav style={{ display: 'flex', gap: 12, padding: 8 }}>
      <Link to="/">Home</Link>
      {user && (
        <>
          <Link to="/character">Character</Link>
          <Link to="/domains">Domains</Link>
          <Link to="/downtimes">Downtimes</Link>
          <Link to="/comms">Comms</Link>
        </>
      )}
      {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
      <span style={{ marginLeft: 'auto' }}>
        {user ? (
          <>
            Hi, {user.display_name}{' '}
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </span>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<Private><Home/></Private>} />
          <Route path="/character" element={<Private><CharacterView/></Private>} />
          <Route path="/make" element={<Private><CharacterSetup/></Private>} />
          <Route path="/domains" element={<Private><Domains/></Private>} />
          <Route path="/downtimes" element={<Private><Dashboard/></Private>} />
          <Route path="/comms" element={<Private><Comms/></Private>} />
          <Route path="/admin" element={<AdminOnly><Admin/></AdminOnly>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
