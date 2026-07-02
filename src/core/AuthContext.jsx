import React, { createContext, useEffect, useState } from 'react';
import api from './api';

export const AuthCtx = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState({ id: 3, role: 'admin', email: 'admin@test.com' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    /* MOCKED FOR BONEYARD */
  }, []);

  const loadMe = async () => {
    // MOCKED FOR BONEYARD
    setUser({ id: 3, role: 'admin', email: 'admin@test.com' });
  };

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
