import React, { createContext, useEffect, useState } from 'react';
import api from './api';
import { trackEvent, clearUserTracking } from '../utils/analytics';

export const AuthCtx = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadMe = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (e) {
      setUser(null);
    }
  };

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) loadMe();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token); 
    trackEvent('login', { method: 'email' });
    await loadMe();
  };
  const register = async (email, display_name, password) => {
    const { data } = await api.post('/auth/register', { email, display_name, password });
    localStorage.setItem('token', data.token); 
    trackEvent('sign_up', { method: 'email' });
    await loadMe();
  };
  const logout = () => { 
    localStorage.removeItem('token'); 
    setUser(null); 
    clearUserTracking();
    trackEvent('logout');
  };

  return <AuthCtx.Provider value={{ user, login, register, logout }}>{children}</AuthCtx.Provider>;
}
