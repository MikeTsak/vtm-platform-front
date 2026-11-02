import React, { createContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from './api';
import { trackEvent, clearUserTracking } from '../utils/analytics';

export const AuthCtx = createContext(null);

// The service worker keeps a copy of the signed-in player's own sheet for
// offline use (public/service-worker.js, SHEET_CACHE). It is personal data:
// dropped whenever the account on this device changes or signs out.
const clearOfflineSheet = () => {
  if (typeof caches !== 'undefined') caches.delete('erebus-sheet-v1').catch(() => {});
};

export default function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Returns true if we now know the session state for certain (logged in
  // *or* confirmed logged out), false if we still don't know (the request
  // itself failed: network blip, cold DB connection, a flaky mobile
  // connection, etc). Callers that need to know whether login actually
  // succeeded (see login()/register() below) check this return value instead
  // of assuming success just because loadMe() didn't throw.
  const loadMe = async (retriesLeft = 1) => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setLoading(false);
      return data.user;
    } catch (e) {
      // A genuine "you're not logged in" response: no point retrying that.
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        // Only a confirmed 401/403 should clear an existing session.
        // Treating every failure here as a logout (the previous behavior)
        // meant any transient hiccup bounced a perfectly valid session to
        // /login, which is what made refreshing the page intermittently
        // "log out".
        setUser(null);
        clearOfflineSheet();
        setLoading(false);
        return false;
      }
      // Transient failure: worth one quick retry before giving up, since
      // these are usually momentary (and this is exactly the class of
      // failure that used to make login silently look like it worked when
      // it hadn't: see login() below).
      if (retriesLeft > 0) {
        await new Promise((r) => setTimeout(r, 500));
        return loadMe(retriesLeft - 1);
      }
      setLoading(false);
      return false;
    }
  };

  useEffect(() => {
    // The session cookie is httpOnly: there's nothing for JS to check
    // before asking the server whether we're logged in, so always ask.
    loadMe();
  }, []);

  // The server reads the role live, so a promotion/demotion or a revoked session
  // shows up here as soon as the tab is looked at again. Quiet: keeps the same
  // user object when nothing changed so effects keyed on `user` do not re-run.
  const lastCheck = useRef(0);
  useEffect(() => {
    if (!user) return undefined;
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastCheck.current < 30000) return;
      lastCheck.current = Date.now();
      try {
        const { data } = await api.get('/auth/me');
        setUser(prev => (JSON.stringify(prev) === JSON.stringify(data.user) ? prev : data.user));
      } catch (e) {
        const status = e?.response?.status;
        if (status === 401 || status === 403) { setUser(null); clearOfflineSheet(); } // session revoked
      }
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [!!user]);

  // A session that dies mid-use (expired after 7 days, revoked by a password
  // reset or "log out everywhere") used to surface as a scatter of per-page
  // errors. Any 401 while signed in now triggers one /auth/me check, and if
  // that confirms it, the app drops to logged-out (routes send you to /login).
  // The check guards against a stray 401 that isn't about the session.
  const verifying = useRef(false);
  useEffect(() => {
    if (!user) return undefined;
    const id = api.interceptors.response.use(undefined, async (error) => {
      const url = error?.config?.url || '';
      if (error?.response?.status === 401 && !url.startsWith('/auth/') && !verifying.current) {
        verifying.current = true;
        try {
          await api.get('/auth/me');
        } catch (e) {
          if (e?.response?.status === 401) {
            setUser(null);
            queryClient.clear();
            clearOfflineSheet();
          }
        } finally {
          verifying.current = false;
        }
      }
      return Promise.reject(error);
    });
    return () => api.interceptors.response.eject(id);
  }, [!!user]);

  const login = async (email, password) => {
    // retrySafe: ride out a server restart (see core/api.js); a duplicate login is harmless.
    await api.post('/auth/login', { email, password }, { retrySafe: true }); // server sets the httpOnly cookie
    // wipe any cached queries from a previous account before loading this one
    queryClient.clear();
    clearOfflineSheet();
    trackEvent('login', { method: 'email' });
    const confirmed = await loadMe();
    if (!confirmed) {
      // The login request itself succeeded, but we couldn't confirm the
      // session afterward, do NOT let the caller treat this as a
      // successful login (that was the bug: it used to show "Welcome
      // back!" and navigate to a page that immediately bounced back to
      // /login, with no explanation).
      throw new Error('Signed in, but could not confirm your session. Please try again.');
    }
    return confirmed;
  };
  const register = async (email, display_name, password) => {
    await api.post('/auth/register', { email, display_name, password });
    queryClient.clear();
    clearOfflineSheet();
    trackEvent('sign_up', { method: 'email' });
    const confirmed = await loadMe();
    if (!confirmed) {
      throw new Error('Account created, but could not confirm your session. Please try again.');
    }
  };
  // Admin debug login (back/routes/debugLogin.js): a one-time code opens a
  // short-lived session as that player; /auth/me then carries `imp`.
  const debugLogin = async (email, code) => {
    await api.post('/auth/debug-login', { email, code });
    queryClient.clear();
    clearOfflineSheet();
    const confirmed = await loadMe();
    if (!confirmed) throw new Error('Code accepted, but could not confirm the session. Please try again.');
    return confirmed;
  };
  const logout = async () => {
    try {
      // Clears the httpOnly cookie server-side: JS can't clear it itself.
      await api.post('/auth/logout');
    } catch (e) {
      // Even if the request fails, drop the client-side session state below.
    }
    setUser(null);
    queryClient.clear();
    clearOfflineSheet();
    clearUserTracking();
    trackEvent('logout');
  };

  return <AuthCtx.Provider value={{ user, loading, login, register, debugLogin, logout }}>{children}</AuthCtx.Provider>;
}
