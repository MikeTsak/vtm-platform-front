import React, { createContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from './api';
import { trackEvent, clearUserTracking } from '../utils/analytics';

export const AuthCtx = createContext(null);

export default function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (e) {
      // Only a genuine "you're not logged in" response should clear the
      // session. Treating every failure here as a logout (the previous
      // behavior) meant any transient hiccup — a cold DB connection, a
      // dropped request — bounced a perfectly valid session to /login,
      // which is what made refreshing the page intermittently "log out".
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // The session cookie is httpOnly — there's nothing for JS to check
    // before asking the server whether we're logged in, so always ask.
    loadMe();
  }, []);

  const login = async (email, password) => {
    await api.post('/auth/login', { email, password }); // server sets the httpOnly cookie
    // wipe any cached queries from a previous account before loading this one
    queryClient.clear();
    trackEvent('login', { method: 'email' });
    await loadMe();
  };
  const register = async (email, display_name, password) => {
    await api.post('/auth/register', { email, display_name, password });
    queryClient.clear();
    trackEvent('sign_up', { method: 'email' });
    await loadMe();
  };
  const logout = async () => {
    try {
      // Clears the httpOnly cookie server-side — JS can't clear it itself.
      await api.post('/auth/logout');
    } catch (e) {
      // Even if the request fails, drop the client-side session state below.
    }
    setUser(null);
    queryClient.clear();
    clearUserTracking();
    trackEvent('logout');
  };

  return <AuthCtx.Provider value={{ user, loading, login, register, logout }}>{children}</AuthCtx.Provider>;
}
