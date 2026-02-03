import React, { createContext, useEffect, useState } from 'react';
import api from './api';

export const AuthCtx = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  async function loadMe(signal) {
    try {
      const { data } = await api.get('/auth/me', { signal });
      setUser(data.user);
    } catch (e) { 
      if (e.name === 'CanceledError' || e.name === 'AbortError') return;
      setUser(null); 
    }
  }

  useEffect(() => { 
    const abortController = new AbortController();
    if (localStorage.getItem('token')) loadMe(abortController.signal);
    return () => abortController.abort();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token); await loadMe();
  };
  const register = async (email, display_name, password) => {
    const { data } = await api.post('/auth/register', { email, display_name, password });
    localStorage.setItem('token', data.token); await loadMe();
  };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  return <AuthCtx.Provider value={{ user, login, register, logout }}>{children}</AuthCtx.Provider>;
}
