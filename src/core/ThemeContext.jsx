// src/core/ThemeContext.jsx
//
// App-wide theme engine. Previously this lived entirely inside the Home page
// component, which meant:
//   - themes only applied once you visited "/" (every other route, and every
//     cold reload, rendered the bare :root fallback — Camarilla crimson);
//   - the "clan" theme wrote --tint as an inline style on <html> and only ever
//     removed it if you picked another theme *while on the Home page*, so a
//     bloodline tint (e.g. the Ministry's gold #865f12) leaked into every
//     var(--tint) across the whole app and never got cleaned up;
//   - a one-shot `theme_synced` localStorage latch meant the server value was
//     read exactly once, ever.
//
// Now it's mounted once in App.jsx, applies to every route, and treats the
// server as the source of truth on load while pushing local picks back to it.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthCtx } from './AuthContext';
import api from './api';
import { clanTint } from '../data/clans';
import { trackEvent } from '../utils/analytics';

// Keep in sync with public/theme-init.js and back/routes/auth.js.
export const THEMES = [
  { id: 'clan',       label: 'Bloodline' },
  { id: 'camarilla',  label: 'Camarilla' },
  { id: 'schrecknet', label: 'SchreckNet' },
  { id: 'anarch',     label: 'Anarch' },
  { id: 'Giannakis',  label: 'Giannakis' },
];
export const THEME_IDS = THEMES.map((t) => t.id);

const DEFAULT_THEME = 'clan';
const STORAGE_KEY = 'vtm_theme';
const TINT_CACHE_KEY = 'vtm_clan_tint';

const ThemeCtx = createContext(null);

export const useTheme = () =>
  useContext(ThemeCtx) || { theme: DEFAULT_THEME, setTheme: () => {}, clan: null, tint: null, themes: THEMES };

function readStoredTheme() {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return THEME_IDS.includes(t) ? t : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

// Paint <html>. `tintHex` is only honoured for the clan theme; every other
// theme takes its --tint straight from the stylesheet, so we must clear any
// inline override we previously set.
function paintTheme(theme, tintHex) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  if (theme === 'clan' && tintHex) {
    root.style.setProperty('--tint', tintHex);
  } else {
    root.style.removeProperty('--tint');
  }
}

export default function ThemeProvider({ children }) {
  const { user } = useContext(AuthCtx);
  const [theme, setThemeState] = useState(readStoredTheme);
  const [clan, setClan] = useState(null);
  const serverAdopted = useRef(false);
  const pendingSync = useRef(null);

  // Adopt the server's saved theme once per session. After that, local picks
  // win (and are pushed back to the server by setTheme).
  useEffect(() => {
    if (!user) {
      serverAdopted.current = false;
      return;
    }
    if (serverAdopted.current) return;
    serverAdopted.current = true;
    if (user.theme && THEME_IDS.includes(user.theme)) {
      setThemeState(user.theme);
    }
  }, [user]);

  // The player's clan drives the bloodline tint. No character yet → clan theme
  // just falls back to crimson (handled in the stylesheet).
  useEffect(() => {
    if (!user) {
      setClan(null);
      return;
    }
    let live = true;
    api
      .get('/characters/me')
      .then(({ data }) => {
        if (live) setClan(data?.character?.clan || null);
      })
      .catch(() => {
        /* no character / request failed — leave clan null */
      });
    return () => {
      live = false;
    };
  }, [user]);

  const tint = clan ? clanTint(clan) : null;

  // Apply on every change, and cache for the next cold load's pre-paint script.
  useEffect(() => {
    paintTheme(theme, tint);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
      if (tint) localStorage.setItem(TINT_CACHE_KEY, tint);
    } catch {
      /* storage disabled */
    }
  }, [theme, tint]);

  const setTheme = useCallback((next) => {
    if (!THEME_IDS.includes(next)) return;
    setThemeState((prev) => {
      if (prev !== next) pendingSync.current = next;
      return next;
    });
  }, []);

  // Persist a user-initiated pick to the server (kept out of the state updater
  // so React StrictMode's double-invoked reducer can't fire the request twice).
  useEffect(() => {
    const next = pendingSync.current;
    if (!next || next !== theme) return;
    pendingSync.current = null;
    trackEvent('theme_change', { theme: next });
    api.put('/auth/theme', { theme: next }).catch((e) => {
      console.error('Failed to sync theme with server', e);
    });
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, clan, tint, themes: THEMES }}>
      {children}
    </ThemeCtx.Provider>
  );
}
