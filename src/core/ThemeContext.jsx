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
import { clanTint, getClanPalette, getClanThemeRules, clanBackground } from '../data/clans';
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
const PALETTE_CACHE_KEY = 'vtm_clan_palette';
const RULES_CACHE_KEY = 'vtm_clan_rules';
const BG_CACHE_KEY = 'vtm_clan_bg';

const ThemeCtx = createContext(null);

export const useTheme = () =>
  useContext(ThemeCtx) || { theme: DEFAULT_THEME, setTheme: () => {}, clan: null, tint: null, palette: null, rules: null, themes: THEMES };

function readStoredTheme() {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return THEME_IDS.includes(t) ? t : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

// Paint <html>. When theme is 'clan' and clan is present, write the full 5-color
// token suite and iconography colors. For all other themes, strip clan overrides.
function paintTheme(theme, clan, tintHex) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);

  if (theme === 'clan' && clan) {
    const clanKey = clan.toLowerCase().replace(/\s+/g, '_');
    root.setAttribute('data-clan', clanKey);
    const palette = getClanPalette(clan);
    const rules = getClanThemeRules(clan);
    const bgUrl = clanBackground(clan);

    // 1. Set explicit raw 5-color tokens
    if (palette && Array.isArray(palette)) {
      palette.forEach((hex, idx) => {
        root.style.setProperty(`--clan-color-${idx + 1}`, hex);
      });
    }

    // 2. Set iconography tokens
    if (rules?.symbolColor) root.style.setProperty('--clan-symbol-color', rules.symbolColor);
    if (rules?.textColor) root.style.setProperty('--clan-text-logo-color', rules.textColor);

    // 3. Map all 5 colors directly to active UI theme variables
    const primary = rules?.primaryAccent || palette?.[0] || tintHex || '#8a0f1a';
    const secondary = rules?.secondaryAccent || palette?.[1] || '#c30011';
    const border = rules?.border || palette?.[2] || '#2f3138';
    const textColor = rules?.textColor || palette?.[3] || '#e8e8ed';
    const surface = rules?.surface || palette?.[4] || '#141417';
    const bgBase = rules?.bg || '#0a0a0f';

    root.style.setProperty('--tint', primary);
    root.style.setProperty('--dynamic-tint', primary);
    root.style.setProperty('--clan-primary', primary);
    root.style.setProperty('--theme-primary', primary);

    root.style.setProperty('--clan-secondary', secondary);
    root.style.setProperty('--theme-secondary', secondary);

    root.style.setProperty('--clan-border', border);
    root.style.setProperty('--border-color', border);
    root.style.setProperty('--theme-outline', border);

    root.style.setProperty('--clan-text', textColor);
    root.style.setProperty('--text-color', textColor);
    root.style.setProperty('--theme-on-surface', textColor);

    if (rules?.textMuted) {
      root.style.setProperty('--clan-text-muted', rules.textMuted);
      root.style.setProperty('--text-muted', rules.textMuted);
      root.style.setProperty('--theme-on-surface-variant', rules.textMuted);
    } else {
      root.style.removeProperty('--clan-text-muted');
      root.style.removeProperty('--text-muted');
      root.style.removeProperty('--theme-on-surface-variant');
    }

    root.style.setProperty('--clan-surface', surface);
    root.style.setProperty('--surface-color', surface);
    root.style.setProperty('--theme-surface-container', surface);

    root.style.setProperty('--clan-bg', bgBase);
    root.style.setProperty('--bg-color', bgBase);
    root.style.setProperty('--theme-background', bgBase);

    // 4. Custom atmospheric clan background
    if (bgUrl) {
      root.style.setProperty('--clan-bg-image', `url('${bgUrl}')`);
      root.style.setProperty('--clan-bg-opacity', '0.45');
    } else {
      root.style.removeProperty('--clan-bg-image');
      root.style.removeProperty('--clan-bg-opacity');
    }
  } else {
    // Clear clan overrides to let stylesheet defaults take over
    root.removeAttribute('data-clan');
    root.style.removeProperty('--tint');
    root.style.removeProperty('--dynamic-tint');
    root.style.removeProperty('--clan-primary');
    for (let i = 1; i <= 5; i++) {
      root.style.removeProperty(`--clan-color-${i}`);
    }
    root.style.removeProperty('--clan-symbol-color');
    root.style.removeProperty('--clan-text-logo-color');
    root.style.removeProperty('--clan-secondary');
    root.style.removeProperty('--theme-secondary');
    root.style.removeProperty('--clan-border');
    root.style.removeProperty('--border-color');
    root.style.removeProperty('--theme-outline');
    root.style.removeProperty('--clan-text');
    root.style.removeProperty('--text-color');
    root.style.removeProperty('--theme-on-surface');
    root.style.removeProperty('--clan-text-muted');
    root.style.removeProperty('--text-muted');
    root.style.removeProperty('--theme-on-surface-variant');
    root.style.removeProperty('--clan-surface');
    root.style.removeProperty('--surface-color');
    root.style.removeProperty('--theme-surface-container');
    root.style.removeProperty('--clan-bg');
    root.style.removeProperty('--bg-color');
    root.style.removeProperty('--theme-background');
    root.style.removeProperty('--clan-bg-image');
    root.style.removeProperty('--clan-bg-opacity');
  }
}

export default function ThemeProvider({ children }) {
  const { user } = useContext(AuthCtx);
  const [theme, setThemeState] = useState(() => {
    try {
      const urlClan = new URLSearchParams(window.location.search).get('clan');
      if (urlClan) return 'clan';
    } catch {}
    return readStoredTheme();
  });
  const [clan, setClan] = useState(null);
  const [clanOverride, setClanOverrideState] = useState(() => {
    try {
      const urlClan = new URLSearchParams(window.location.search).get('clan') || new URLSearchParams(window.location.search).get('previewClan');
      if (urlClan) return urlClan;
      return localStorage.getItem('vtm_clan_override') || null;
    } catch {
      return null;
    }
  });
  const serverAdopted = useRef(false);
  const pendingSync = useRef(null);

  const setClanOverride = useCallback((nextClan) => {
    setClanOverrideState(nextClan);
    try {
      if (nextClan) {
        localStorage.setItem('vtm_clan_override', nextClan);
      } else {
        localStorage.removeItem('vtm_clan_override');
      }
    } catch {}
  }, []);

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

  // The player's clan drives the bloodline tint. No character yet: clan theme
  // falls back to crimson (handled in stylesheet).
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
        /* no character / request failed */
      });
    return () => {
      live = false;
    };
  }, [user]);

  const activeClan = clanOverride || clan;
  const tint = activeClan ? clanTint(activeClan) : null;
  const palette = activeClan ? getClanPalette(activeClan) : null;
  const rules = activeClan ? getClanThemeRules(activeClan) : null;
  const bgUrl = activeClan ? clanBackground(activeClan) : null;

  // Apply on every change, and cache for the next cold load's pre paint script.
  useEffect(() => {
    paintTheme(theme, activeClan, tint);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
      if (tint) localStorage.setItem(TINT_CACHE_KEY, tint);
      if (palette) localStorage.setItem(PALETTE_CACHE_KEY, JSON.stringify(palette));
      if (rules) localStorage.setItem(RULES_CACHE_KEY, JSON.stringify(rules));
      if (activeClan) {
        localStorage.setItem('vtm_clan_name', activeClan);
      } else {
        localStorage.removeItem('vtm_clan_name');
      }
      if (bgUrl) {
        localStorage.setItem(BG_CACHE_KEY, bgUrl);
      } else {
        localStorage.removeItem(BG_CACHE_KEY);
      }
    } catch {
      /* storage disabled */
    }
  }, [theme, activeClan, tint, palette, rules, bgUrl]);

  const setTheme = useCallback((next) => {
    if (!THEME_IDS.includes(next)) return;
    setThemeState((prev) => {
      if (prev !== next) pendingSync.current = next;
      return next;
    });
  }, []);

  // Developer and console preview bridge
  useEffect(() => {
    window.__vtmSetClan = (c) => {
      setClanOverride(c);
      if (c) setTheme('clan');
    };
    return () => {
      delete window.__vtmSetClan;
    };
  }, [setClanOverride, setTheme]);

  // Persist a user initiated pick to the server (kept out of state updater
  // so React StrictMode's double invoked reducer cannot fire the request twice).
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
    <ThemeCtx.Provider value={{
      theme,
      setTheme,
      clan: activeClan,
      nativeClan: clan,
      clanOverride,
      setClanOverride,
      tint,
      palette,
      rules,
      themes: THEMES
    }}>
      {children}
    </ThemeCtx.Provider>
  );
}
