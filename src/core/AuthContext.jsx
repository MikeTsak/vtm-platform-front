import React, { createContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from './api';
import { trackEvent, clearUserTracking } from '../utils/analytics';

export const AuthCtx = createContext(null);

export default function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Returns true if we now know the session state for certain (logged in
  // *or* confirmed logged out), false if we still don't know (the request
  // itself failed — network blip, cold DB connection, a flaky mobile
  // connection, etc). Callers that need to know whether login actually
  // succeeded (see login()/register() below) check this return value instead
  // of assuming success just because loadMe() didn't throw.
  const loadMe = async (retriesLeft = 1) => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setLoading(false);
      return true;
    } catch (e) {
      // A genuine "you're not logged in" response — no point retrying that.
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        // Only a confirmed 401/403 should clear an existing session.
        // Treating every failure here as a logout (the previous behavior)
        // meant any transient hiccup bounced a perfectly valid session to
        // /login, which is what made refreshing the page intermittently
        // "log out".
        setUser(null);
        setLoading(false);
        return false;
      }
      // Transient failure — worth one quick retry before giving up, since
      // these are usually momentary (and this is exactly the class of
      // failure that used to make login silently look like it worked when
      // it hadn't — see login() below).
      if (retriesLeft > 0) {
        await new Promise((r) => setTimeout(r, 500));
        return loadMe(retriesLeft - 1);
      }
      setLoading(false);
      return false;
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
    const confirmed = await loadMe();
    if (!confirmed) {
      // The login request itself succeeded, but we couldn't confirm the
      // session afterward — do NOT let the caller treat this as a
      // successful login (that was the bug: it used to show "Welcome
      // back!" and navigate to a page that immediately bounced back to
      // /login, with no explanation).
      throw new Error('Signed in, but could not confirm your session. Please try again.');
    }
  };
  const register = async (email, display_name, password) => {
    await api.post('/auth/register', { email, display_name, password });
    queryClient.clear();
    trackEvent('sign_up', { method: 'email' });
    const confirmed = await loadMe();
    if (!confirmed) {
      throw new Error('Account created, but could not confirm your session. Please try again.');
    }
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
