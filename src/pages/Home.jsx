// src/pages/Home.jsx
import React, { useEffect, useState, useRef, useContext } from 'react';
import api from '../core/api';
import { getPushSettings, updatePushSettings, subscribeToWebPush } from '../utils/push';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Skeleton } from 'boneyard-js/react';
import { motion } from 'framer-motion';
import styles from '../styles/Home.module.css';
import Avatar from '../components/Avatar';
import GoogleAd from '../components/GoogleAd';
import ClanSymbol from '../components/ClanSymbol';
import ClanTextLogo from '../components/ClanTextLogo';
import { symlogo, textlogo, symlogoWhite, textlogoWhite, clanTint, clanBackground, CLAN_NAMES } from '../data/clans';
import { factionLogo } from '../data/factions';
import { AuthCtx } from '../core/AuthContext';
import { useTheme } from '../core/ThemeContext';
import Loading from '../ui/Loading';
import FaGlyph from '../ui/FaGlyph';

/* ── Relative time ──────────────────────────────────────────────── */
const formatTimestamp = (ts) => {
  if (!ts) return '';
  const date = new Date(ts);
  if (isNaN(date.getTime())) return '';
  const diff = Math.round((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.round(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
};

function niceDate(d) {
  if (!d) return 'None';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return 'None';
  try { return dt.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return dt.toDateString(); }
}

function getDtBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('approved') || s.includes('resolved')) return styles.badgeApproved;
  if (s.includes('reject')) return styles.badgeRejected;
  if (s.includes('scene')) return styles.badgeNeedsScene;
  if (s.includes('review')) return styles.badgeReview;
  return styles.badgePending;
}


/* ── Countdown Hook ─────────────────────────────────────────────── */
function useCountdown(targetDate) {
  const [now, setNow] = useState(() => new Date().getTime());
  useEffect(() => {
    const int = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(int);
  }, []);

  if (!targetDate) return { isPast: true, days: 0, hours: 0, mins: 0 };
  const diff = new Date(targetDate).getTime() - now;
  if (diff <= 0) return { isPast: true, days: 0, hours: 0, mins: 0 };

  return {
    isPast: false,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    mins: Math.floor((diff / (1000 * 60)) % 60)
  };
}

/* ── Shatter constants (Premonitions) ───────────────────────────── */
const GRID_COLS = 12, GRID_ROWS = 16, TOTAL_MS = 1500;
const rnd = (a, b) => a + Math.random() * (b - a);

function makeShardPoly(cell) {
  const { left, top, width, height } = cell;
  const cx = left + width / 2, cy = top + height / 2;
  const n = Math.floor(rnd(5, 9)), pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(-0.25, 0.25);
    const r = rnd(0.35, 0.55) * Math.min(width, height);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  const vw = window.innerWidth, vh = window.innerHeight;
  return pts.map(([x, y]) => `${(x / vw) * 100}vw ${(y / vh) * 100}vh`).join(', ');
}

/* ── Nav card data ──────────────────────────────────────────────── */
const NAV_CARDS = [
  { to: '/character', icon: 'bloodtype', title: 'Character',    sub: 'Sheet & XP', img: 'marble_char'        },
  { to: '/downtimes', icon: 'schedule', title: 'Downtimes',   sub: 'Monthly Actions', img: 'marble_down'    },
  { to: '/schrecknet', icon: 'terminal', title: 'SchreckNet',   sub: 'Everything here is safe.', img: 'marble_schreck'},
  { to: '/surfaceweb', icon: 'language', title: 'Surface Web',  sub: 'Be careful, you are not safe.', img: 'marble_surface'},
  { to: '/domains',   icon: 'account_balance', title: 'Domains',      sub: 'Territory Map', img: 'marble_domains'     },
  { to: '/boons',     icon: 'handshake', title: 'Boons',        sub: 'Blood Registry', img: 'marble_boons'    },
  { to: '/court/coteries', icon: 'groups', title: 'Coteries', sub: 'Manage Group', img: 'marble_coteries'     },
  { to: '/court/hierarchy', icon: 'gavel', title: 'Court',  sub: 'Hierarchy', img: 'marble_court'         },
  { to: '/news',      icon: 'article', title: 'News',          sub: 'Archive', img: 'marble_news'           },
  { to: '/retainers', icon: 'person_add', title: 'Retainers',  sub: 'Manage Servants', img: 'marble_retainers' },
];

/* ── Mini Split Damage Bar ──────────────────────────────────────── */
function MiniVtmBar({ label, sup, agg, max }) {
  const safeMax = Math.max(1, Number(max) || 5);
  const aggCount = Math.min(Number(agg) || 0, safeMax);
  const supCount = Math.min(Number(sup) || 0, safeMax - aggCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-color)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
        <span>{label}</span>
        <span>{safeMax - (aggCount + supCount)} / {safeMax}</span>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {Array.from({ length: safeMax }).map((_, i) => {
          const isAgg = i < aggCount;
          const isSup = !isAgg && i < aggCount + supCount;
          return (
            <div key={i} style={{
              flex: 1, height: '24px', borderRadius: '3px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              color: isAgg ? 'var(--tint)' : isSup ? '#ccc' : 'transparent',
              fontWeight: 800,
              fontFamily: 'monospace',
              fontSize: '16px',
              lineHeight: 1
            }}>
              {isAgg ? 'X' : isSup ? '/' : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}


export default function Home() {
  const { user: authUser } = useContext(AuthCtx);
  const [me, setMe] = useState(() => authUser);
  const [ch, setCh] = useState(null);
  const [quota, setQuota] = useState({ used: 0, limit: 3 });
  const [openingDate, setOpeningDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentDowntimes, setRecentDowntimes] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [recentNews, setRecentNews] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [threatLevel, setThreatLevel] = useState(1);
  
  // Push Notifications State
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(true);
  const notifSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  // Theme is owned app-wide by ThemeProvider (src/core/ThemeContext.jsx), it
  // applies data-theme / --tint on every route and syncs with the server. Here
  // we only read the current value and drive the picker below.
  const { theme: activeTheme, setTheme: handleThemeChange, clan: currentClan, clanOverride, setClanOverride } = useTheme();
  const [isShattering, setIsShattering] = useState(false);
  const [clickPoint, setClickPoint] = useState(null);
  const [shards, setShards] = useState([]);
  const [activeFeedTab, setActiveFeedTab] = useState('whispers');
  const [showRsvp, setShowRsvp] = useState(false);
  const overlayRef = useRef(null);
  const nav = useNavigate();

  const eventCd = useCountdown(openingDate);

  /* ── Shatter trigger ── */
  const handlePremonitionClick = (e) => {
    e.preventDefault();
    if (isShattering) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) { nav('/premonitions'); return; }
    setClickPoint({ x: e.clientX, y: e.clientY });
    setIsShattering(true);
    setTimeout(() => nav('/premonitions'), TOTAL_MS);
  };

  useEffect(() => {
    if (!isShattering || !clickPoint || !overlayRef.current) return;
    const rect  = overlayRef.current.getBoundingClientRect();
    const cellW = rect.width / GRID_COLS, cellH = rect.height / GRID_ROWS;
    const far   = Math.max(
      Math.hypot(clickPoint.x - rect.left,  clickPoint.y - rect.top),
      Math.hypot(clickPoint.x - rect.right, clickPoint.y - rect.bottom)
    );
    const list = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const cell = { left: rect.left + c * cellW, top: rect.top + r * cellH, width: cellW, height: cellH };
        const dx = (cell.left + cellW / 2) - clickPoint.x;
        const dy = (cell.top + cellH / 2) - clickPoint.y;
        const d  = Math.hypot(dx, dy);
        const delay = (d / far) * 0.35;
        const force = (far - d) / far;
        list.push({
          poly: makeShardPoly(cell),
          style: {
            '--delay':  `${delay}s`,
            '--x':      `${dx * (force * 2.7 + 0.8) + rnd(-14, 14)}px`,
            '--y':      `${dy * (force * 2.7 + 0.8) + rnd(-14, 14)}px`,
            '--rotate': `${(Math.random() - 0.5) * 560}deg`,
            '--scale':  0.8 + Math.random() * 0.35,
            '--tint':   Math.random() < 0.45 ? 'rgba(170,255,240,0.06)' : 'rgba(255,255,255,0.04)',
            '--edge':   Math.random() < 0.6  ? 'rgba(140,255,230,0.55)' : 'rgba(220,240,255,0.42)',
          },
        });
      }
    }
    setShards(list);
  }, [isShattering, clickPoint]);

  useEffect(() => {
    if (authUser && !me) {
      setMe(authUser);
    }
  }, [authUser, me]);

  const isAdmin = authUser?.role === 'admin' || me?.role === 'admin';
  const isPreviewApproved = typeof window !== 'undefined' && (
    sessionStorage.getItem('vtm_admin_preview') === 'true' ||
    new URLSearchParams(window.location.search).get('preview') === 'true'
  );

  // If preview was launched via query param, persist approval for this session
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === 'true') {
      sessionStorage.setItem('vtm_admin_preview', 'true');
    }
  }, []);

  // Admins can only access the ordinary home from Master Control (preview mode)
  useEffect(() => {
    if (!loading && isAdmin && !isPreviewApproved) {
      nav('/admin', { replace: true });
    }
  }, [loading, isAdmin, isPreviewApproved, nav]);

  // Strip admin-theme when the player Home is rendered so the purple admin
  // glass never leaks into the player experience.
  useEffect(() => {
    document.documentElement.classList.remove('admin-theme');
  }, []);

  // Clean exit from Home Preview: strip clan overrides, restore admin theme, navigate to /admin
  const handleExitPreview = () => {
    sessionStorage.removeItem('vtm_admin_preview');
    setClanOverride(null);
    try {
      localStorage.removeItem('vtm_clan_override');
      localStorage.removeItem('vtm_clan_name');
      localStorage.removeItem('vtm_clan_bg');
    } catch {}

    const root = document.documentElement;
    root.removeAttribute('data-clan');
    root.setAttribute('data-theme', 'camarilla');
    root.classList.add('admin-theme');

    for (let i = 1; i <= 5; i++) {
      root.style.removeProperty(`--clan-color-${i}`);
    }
    root.style.removeProperty('--clan-primary');
    root.style.removeProperty('--clan-secondary');
    root.style.removeProperty('--clan-border');
    root.style.removeProperty('--clan-text');
    root.style.removeProperty('--clan-surface');
    root.style.removeProperty('--clan-bg');
    root.style.removeProperty('--clan-bg-image');
    root.style.removeProperty('--clan-bg-opacity');
    root.style.removeProperty('--clan-symbol-color');
    root.style.removeProperty('--clan-text-logo-color');
    root.style.removeProperty('--tint');
    root.style.removeProperty('--dynamic-tint');
    root.style.removeProperty('--theme-primary');
    root.style.removeProperty('--border-color');
    root.style.removeProperty('--text-color');
    root.style.removeProperty('--surface-color');
    root.style.removeProperty('--bg-color');

    handleThemeChange('camarilla');
    nav('/admin');
  };

  const [adminChars, setAdminChars] = useState([]);
  const [selectedCharIndex, setSelectedCharIndex] = useState(0);

  // Fetch all characters for admin clan preview
  useEffect(() => {
    if (!isAdmin) return;
    let live = true;
    api.get('/admin/characters')
      .then((res) => {
        if (live && res.data?.characters) {
          setAdminChars(res.data.characters);
        }
      })
      .catch((e) => {
        console.warn('Failed to load admin characters for preview', e);
      });
    return () => {
      live = false;
    };
  }, [isAdmin]);

  /* ── Data fetch ── */
  useEffect(() => {
    setLoading(true);
    let live = true;
    (async () => {
      try {
        const res = await api.get('/home/bootstrap');
        if (!live) return;

        const data = res.data;
        if (data.user) {
          setMe(data.user);
        }

        const character = data.character || null;
        setCh(character);

        if (data.dashboard) {
          const d = data.dashboard;
          setQuota(d.quota || { used: 0, limit: 3 });
          setRecentDowntimes(d.downtimes || []);
          setRecentChats(d.chats || []);
          setRecentNews(d.news || []);
          setOpeningDate(d.config?.downtime_opening || null);
          if (d.banner?.masquerade_threat_level) {
            setThreatLevel(d.banner.masquerade_threat_level);
          }
        }
        
        // Fetch push settings
        if (notifSupported) {
          try {
            const pushData = await getPushSettings();
            if (live) setPushEnabled(!!pushData?.chat);
          } catch (e) {
            console.warn('Failed to load push settings', e);
          } finally {
            if (live) setPushLoading(false);
          }
        } else {
          if (live) setPushLoading(false);
        }
      } catch (error) {
        if (live) setFetchError('Failed to load portal data.');
      } finally {
        if (live) setLoading(false);
      }
    })();
  }, [nav]);

  const activeClanName = (clanOverride || currentClan || ch?.clan || 'Ventrue').trim();

  // Find characters belonging to the active clan
  const matchingClanChars = React.useMemo(() => {
    if (!isAdmin || !adminChars.length) return [];
    return adminChars.filter((c) => (c.clan || '').trim().toLowerCase() === activeClanName.toLowerCase());
  }, [isAdmin, adminChars, activeClanName]);

  const activeClanChar = React.useMemo(() => {
    if (!isAdmin || !matchingClanChars.length) return null;
    return matchingClanChars[selectedCharIndex % matchingClanChars.length];
  }, [isAdmin, matchingClanChars, selectedCharIndex]);

  const currentMe = me || authUser;
  const safeMe = currentMe || { display_name: '', id: '0', role: 'user', ui_sounds_enabled: true };

  // Resolve active character: when admin, use the matched clan player, or an empty clan card
  let resolvedCh = ch;
  if (isAdmin) {
    if (activeClanChar) {
      resolvedCh = activeClanChar;
    } else {
      resolvedCh = {
        name: 'Unclaimed Bloodline',
        clan: activeClanName,
        xp: 0,
        sheet: { clan: activeClanName, hunger: 0, health: { max: 5, superficial: 0, aggravated: 0 }, willpower: { superficial: 0, aggravated: 0 } }
      };
    }
  }

  const safeCh = resolvedCh || { name: '', clan: activeClanName, xp: 0, sheet: {} };

  if (!loading) {
    if (!currentMe) return <div className={styles.loadingScreen}>Please log in.</div>;
    if (!ch && !isAdmin) return (
      <div className={styles.noCharPage}>
        <div className={styles.noCharCard}>
          <div className={styles.noCharRose}>🥀</div>
          <h2 className={styles.noCharTitle}>Welcome, {currentMe.display_name}</h2>
          <p className={styles.noCharSub}>
            You must present yourself before the gathered Kindred of Athens.<br/>
            Forge your identity. Claim your lineage.
          </p>
          <button className={styles.noCharBtn} onClick={() => nav('/make')}>
            Create Character
          </button>
        </div>
      </div>
    );
  }

  const clan        = (safeCh.clan || '').trim();
  const isMalkavian = clan.toLowerCase() === 'malkavian';
  const showCobweb  = isMalkavian;
  const quotaPct    = Math.min((quota.used / quota.limit) * 100, 100);

  const dynamicClanTint = clanTint(clan);

  let sheetObj = {};
  try {
    sheetObj = typeof safeCh.sheet === 'string' ? JSON.parse(safeCh.sheet) : (safeCh.sheet || {});
  } catch (_) {
    // ignore parse error
  }

  const renderDots = (value, max = 5) => {
    const v = Number(value) || 0;
    let dots = '';
    for (let i = 0; i < max; i++) dots += i < v ? '●' : '○';
    return dots;
  };

  const getHighestAttr = (sheet, list) => {
    if (!sheet?.attributes) return { name: list[0], value: 0 };
    let maxName = list[0];
    let maxVal = 0;
    for (const attr of list) {
      const v = Number(sheet.attributes[attr]) || 0;
      if (v >= maxVal) { maxVal = v; maxName = attr; }
    }
    return { name: maxName, value: maxVal };
  };

  const topPhys = getHighestAttr(sheetObj, ['Strength', 'Dexterity', 'Stamina']);
  const topSoc = getHighestAttr(sheetObj, ['Charisma', 'Manipulation', 'Composure']);
  const topMent = getHighestAttr(sheetObj, ['Intelligence', 'Wits', 'Resolve']);

  const latestChronicle = recentNews.find(n => n.theme === 'chronicle') || recentNews[0] || null;

  const clanBg = clanBackground(clan);

  // Construct Themes Array dynamically to insert Character's Clan
  const availableThemes = [
    { id: 'clan', label: clan ? `${clan}` : 'Default', sub: 'Bloodline', hex: dynamicClanTint, img: 'theme_clan', bgUrl: clanBg, icon: symlogoWhite(clan) },
    { id: 'camarilla', label: 'Camarilla', sub: 'Crimson', hex: '#8a0f1a', img: 'theme_camarilla', icon: factionLogo('Camarilla') },
    { id: 'schrecknet',  label: 'SchreckNet', sub: 'Blue', hex: '#0ea5e9', img: 'theme_schrecknet', icon: null },
    { id: 'anarch',      label: 'Anarch', sub: 'Gold', hex: '#ea580c', img: 'theme_anarch', icon: factionLogo('Anarch') },
    { id: 'Giannakis',      label: 'Giannakis', sub: 'Teal', hex: '#0d9488', img: 'theme_giannakis', icon: null },
  ];

  return (
    <Skeleton name="home-page" loading={loading}>
      <motion.main 
        className={styles.homePage}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
      >

      {/* ── SHATTER OVERLAY ── */}
      {isShattering && (
        <div
          className={styles.shatterOverlay}
          ref={overlayRef}
          style={{ '--click-x': `${clickPoint?.x}px`, '--click-y': `${clickPoint?.y}px` }}
        >
          <div className={styles.shatterImpact} />
          {shards.map((s, i) => (
            <div key={i} className={styles.shatterShard} style={s.style}>
              <div className={styles.shatterShape} style={{ clipPath: `polygon(${s.poly})` }} />
            </div>
          ))}
        </div>
      )}

      {/* ── STICKY ADMIN CLAN PREVIEW BAR ── */}
      {isAdmin && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 120,
            marginBottom: '1rem',
            padding: '10px 16px',
            background: 'rgba(9, 11, 20, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderTop: 'none',
            borderRadius: '0 0 14px 14px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)'
          }}
        >
          {/* Top Row : Status & Player Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '5px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid var(--tint)' }}>
                <FaGlyph name="fa-crown" style={{ color: 'var(--tint)', fontSize: '0.8rem' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-color)', textTransform: 'uppercase' }}>
                  Admin Preview
                </span>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-color)' }}>
                <ClanSymbol clan={activeClanName} size={18} />
                <span style={{ fontWeight: 700 }}>Clan {activeClanName}</span>
              </div>

              {activeClanChar ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.75)' }}>
                  <span>Player: <strong style={{ color: 'var(--text-color)' }}>{activeClanChar.name}</strong></span>
                  {matchingClanChars.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCharIndex(i => i + 1)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'var(--text-color)',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                      title="Cycle to next player of this clan"
                    >
                      <FaGlyph name="fa-shuffle" style={{ fontSize: '0.7rem' }} />
                      <span>Next Player ({selectedCharIndex % matchingClanChars.length + 1}/{matchingClanChars.length})</span>
                    </button>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No player registered for Clan {activeClanName}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Link
                to="/admin"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  minHeight: '44px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                  fontWeight: 600,
                  touchAction: 'manipulation'
                }}
              >
                <FaGlyph name="fa-gear" style={{ fontSize: '0.75rem' }} />
                <span>Master Control</span>
              </Link>
              <button
                type="button"
                onClick={handleExitPreview}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  minHeight: '44px',
                  borderRadius: '6px',
                  background: 'rgba(157, 124, 255, 0.15)',
                  border: '1px solid rgba(157, 124, 255, 0.5)',
                  color: '#c4b0ff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation'
                }}
                title="Exit preview and return to Admin"
              >
                <FaGlyph name="fa-arrow-right-from-bracket" size={12} />
                <span>Exit Preview</span>
              </button>
            </div>
          </div>

          {/* Bottom Row : Clan Chips */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'thin' }}>
            {CLAN_NAMES.map(c => {
              const isSelected = activeClanName.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    handleThemeChange('clan');
                    setClanOverride(c);
                    setSelectedCharIndex(0);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 12px',
                    minHeight: '44px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    border: isSelected ? '1px solid var(--tint)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.35)',
                    color: isSelected ? 'var(--text-color)' : 'rgba(255, 255, 255, 0.65)',
                    fontWeight: isSelected ? 700 : 500,
                    boxShadow: isSelected ? '0 0 8px rgba(0,0,0,0.5)' : 'none',
                    transition: 'all 0.2s ease',
                    touchAction: 'manipulation'
                  }}
                >
                  <ClanSymbol clan={c} size={14} />
                  <span>{c}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.dashboardLayout}>
        
        {/* ── LEFT MAIN COLUMN ── */}
        <div className={styles.mainColumn}>
          
          {/* 1. IDENTITY HEADER */}
          <motion.header 
            className={`${styles.identityHeader} ${clanBg ? 'clan-aesthetic-bg' : ''}`} 
            style={{ 
              '--dynamic-tint': dynamicClanTint,
              ...(clanBg ? { backgroundImage: `linear-gradient(135deg, color-mix(in srgb, var(--surface-color) 78%, rgba(10, 10, 15, 0.85)), color-mix(in srgb, var(--surface-color) 60%, rgba(10, 10, 15, 0.75))), url('${clanBg}')` } : {})
            }}
            variants={{
              hidden: { opacity: 0, y: 30, scale: 0.95 },
              visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
            }}
          >
            {/* 5 Color Aesthetic Swatch Bar */}
            <div className="clan-palette-bar" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4, height: '5px' }}>
              <span title="Color 1: Primary Accent"></span>
              <span title="Color 2: Secondary Accent"></span>
              <span title="Color 3: Structural Outline"></span>
              <span title="Color 4: Wordmark and Highlight"></span>
              <span title="Color 5: Surface and Void"></span>
            </div>

            <span className={`${styles.corner} ${styles.cornerTL}`} />
            <span className={`${styles.corner} ${styles.cornerTR}`} />
            <span className={`${styles.corner} ${styles.cornerBL}`} />
            <span className={`${styles.corner} ${styles.cornerBR}`} />
            
            <div className={styles.headerInner}>
              {isAdmin ? (
                <Avatar 
                  userId={activeClanChar?.user_id} 
                  avatarUrl={activeClanChar?.image_url || activeClanChar?.avatar} 
                  clan={safeCh.clan} 
                  size={110} 
                  editable={false} 
                />
              ) : (
                <Avatar userId={safeMe.id} size={110} editable={true} />
              )}

              <div className={styles.clanRing} title={`Clan ${safeCh.clan || 'Caitiff'}`}>
                <ClanSymbol clan={safeCh.clan} size={50} />
              </div>

              <div className={styles.charHeaderLeft}>
                <h1 className={styles.charName}>{safeCh.name}</h1>
                <div className={styles.charMeta}>
                  <div className={styles.metaBadge}>
                    <ClanSymbol clan={safeCh.clan} size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Clan {safeCh.clan || 'Caitiff'}
                  </div>
                  <div className={styles.metaBadge}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: '4px', textTransform: 'none' }}>star</span>
                    XP
                  </div>
                  <span className={styles.statValue}>{safeCh.xp ?? 0}</span>
                </div>
              </div>

              <div className={styles.settingsIconsContainer} style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                <button 
                  title={`UI Sounds ${safeMe.ui_sounds_enabled !== false ? 'ON' : 'OFF'}`}
                  onClick={async () => {
                    const newVal = safeMe.ui_sounds_enabled === false ? true : false;
                    setMe(prev => ({ ...prev, ui_sounds_enabled: newVal }));
                    import('cuelume').then(({ setEnabled, play }) => {
                      setEnabled(newVal);
                      if (newVal) play('click');
                    });
                    try {
                      await api.patch('/users/me/ui_sounds', { ui_sounds_enabled: newVal });
                    } catch (e) {
                      console.error('Failed to update UI sounds setting', e);
                    }
                  }}
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: `1px solid ${safeMe.ui_sounds_enabled !== false ? 'var(--tint)' : 'var(--border-color)'}`,
                    color: safeMe.ui_sounds_enabled !== false ? 'var(--tint)' : 'var(--text-muted)',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: safeMe.ui_sounds_enabled !== false ? '0 0 10px var(--tint)' : 'none'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>
                    {safeMe.ui_sounds_enabled !== false ? 'volume_up' : 'volume_off'}
                  </span>
                </button>

                <button 
                  title={`Push Notifications ${pushEnabled ? 'ON' : 'OFF'}`}
                  onClick={async () => {
                    if (!notifSupported || pushLoading) return;
                    
                    if (!pushEnabled) {
                      setPushLoading(true);
                      try {
                        await subscribeToWebPush();
                        await updatePushSettings({ chat: true });
                        setPushEnabled(true);
                      } catch (err) {
                        console.error('Failed to enable push:', err);
                        alert('Could not enable notifications: ' + err.message);
                      } finally {
                        setPushLoading(false);
                      }
                    } else {
                      setPushLoading(true);
                      try {
                        await updatePushSettings({ chat: false });
                        setPushEnabled(false);
                      } catch (err) {
                        console.error('Failed to disable push:', err);
                      } finally {
                        setPushLoading(false);
                      }
                    }
                  }}
                  disabled={pushLoading}
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: `1px solid ${pushEnabled ? 'var(--tint)' : 'var(--border-color)'}`,
                    color: pushEnabled ? 'var(--tint)' : 'var(--text-muted)',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: pushLoading ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: pushLoading ? 0.5 : 1,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  data-cuelume-hover
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', animation: pushLoading ? 'spin 1s linear infinite' : 'none' }}>
                    {pushLoading ? 'sync' : (pushEnabled ? 'notifications_active' : 'notifications_off')}
                  </span>
                </button>
              </div>
            </div>

            <div className={styles.clanWatermark} aria-hidden>
              <ClanTextLogo clan={safeCh.clan} height={64} width={240} />
            </div>
            
            <div className={styles.quotaBar}>
              <span className={styles.quotaLabel}>ACTIONS THIS PERIOD</span>
              <div className={styles.quotaTrackWrapper}>
                <div className={styles.quotaTrack}>
                  <div className={styles.quotaFill} style={{ width: `${quotaPct}%` }} />
                </div>
                <span className={styles.quotaCount}>{quota.used} / {quota.limit} USED</span>
              </div>
            </div>
          </motion.header>

          {fetchError && <div className={styles.errorBanner}>{fetchError}</div>}
          
          {threatLevel >= 4 && (
            <div style={{ background: '#ff5252', color: '#fff', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(255,82,82,0.4)', animation: 'pulse 2s infinite' }}>
              <span className="material-symbols-outlined">warning</span>
              <div>
                <div style={{ fontSize: '1.1rem' }}>MASQUERADE THREAT: {threatLevel === 5 ? 'CRITICAL (PURGE)' : 'HIGH ALERT'}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Second Inquisition activity is extremely high. Proceed with caution.</div>
              </div>
            </div>
          )}

          {/* 2. NEXT MODERN EVENT */}
          <motion.section 
            className={styles.eventCard} 
            style={{ backgroundImage: "url('/img/ui/newspaper_bg.webp')" }}
            variants={{
              hidden: { opacity: 0, x: -30 },
              visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }
            }}
          >
            <div className={styles.eventInfo}>
              <h3 className={styles.eventHeader}>NEXT MODERN EVENT</h3>
              <h2 className={styles.eventTitle}>{openingDate ? 'Elysium Gathering' : 'No Current Event'}</h2>
              {openingDate && !eventCd.isPast ? (
                <p className={styles.eventLocation} style={{ color: 'var(--tint)' }}>
                  Starts in: {eventCd.days}d {eventCd.hours}h {eventCd.mins}m
                </p>
              ) : (
                <p className={styles.eventLocation}>Location: Elysium Hall</p>
              )}
            </div>
            <button className={styles.rsvpBtn} onClick={() => setShowRsvp(true)} style={{ minHeight: '48px', minWidth: '120px' }}>RSVP</button>
          </motion.section>

          {showRsvp && (
            <div 
              className={styles.rsvpModalOverlay} 
              onClick={() => setShowRsvp(false)} 
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            >
              <div 
                className={styles.rsvpModal} 
                onClick={e => e.stopPropagation()} 
                style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--tint)', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
              >
                <h3 style={{ marginTop: 0, fontFamily: 'Playfair Display, serif', color: 'var(--tint)' }}>RSVP Confirmed</h3>
                <p style={{ color: 'var(--text-muted)' }}>The Harpy has noted your intent to attend the upcoming gathering. Do not be late.</p>
                <button 
                  onClick={() => setShowRsvp(false)} 
                  style={{ marginTop: '1.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '0.5rem 1.5rem', minHeight: '48px', width: '100%', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* 3. NAV GRID */}
          <motion.section 
            className={styles.navGrid}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
            }}
          >
            {NAV_CARDS.map(({ to, icon, title, sub, img }) => (
              <motion.div 
                key={to}
                variants={{
                  hidden: { opacity: 0, scale: 0.8, y: 20 },
                  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }
                }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                style={{ display: 'flex' }}
              >
                <Link to={to} className={styles.navCard} style={{ '--card-bg': `url('/img/ui/${img}.webp')`, width: '100%' }}>
                  <div className={styles.navCardIcon}>
                    <span className="material-symbols-outlined" style={{ position: 'relative', zIndex: 2 }}>{icon}</span>
                  </div>
                  <span className={styles.navCardTitle} style={{ position: 'relative', zIndex: 2 }}>{title}</span>
                </Link>
              </motion.div>
            ))}
            {((safeCh && safeCh.sheet?.is_active === true) || safeMe?.role === 'courtuser') && (
              <div className={styles.sectionHeader}>
                <span className="material-symbols-outlined">gavel</span>
                <h3>Court Actions</h3>
              </div>
            )}
            {((safeCh && safeCh.sheet?.is_active === true) || safeMe?.role === 'courtuser') && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, scale: 0.8, y: 20 },
                  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }
                }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                style={{ display: 'flex' }}
              >
                <Link key="/rumors" to="/rumors" className={styles.navCard} style={{ '--card-bg': `url('/img/ui/marble_surface.webp')`, width: '100%' }}>
                  <div className={styles.navCardIcon}>
                    <span className="material-symbols-outlined" style={{ position: 'relative', zIndex: 2 }}>campaign</span>
                  </div>
                  <span className={styles.navCardTitle} style={{ position: 'relative', zIndex: 2 }}>Rumors</span>
                </Link>
              </motion.div>
            )}

            {/* The Cobweb */}
            {showCobweb && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, scale: 0.8, y: 20 },
                  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }
                }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                style={{ display: 'flex' }}
              >
                <a
                  href="/premonitions"
                  onClick={handlePremonitionClick}
                  className={`${styles.navCard} ${styles.malkCard}`}
                  title="Enter the Cobweb"
                  style={{ '--card-bg': `url('/img/ui/cobweb_static.webp')`, width: '100%' }}
                >
                  <div className={styles.glitchBg}></div>
                  <div className={styles.navCardIcon} style={{ position: 'relative', zIndex: 2 }}>
                    <span className="material-symbols-outlined" style={{ color: '#fca5a5' }}>visibility</span>
                  </div>
                  <span className={styles.navCardTitle} style={{ position: 'relative', zIndex: 2 }}>THE COBWEB</span>
                </a>
              </motion.div>
            )}
          </motion.section>

          {/* AD : between marble buttons and chronicle row */}
          <section style={{ margin: '20px 0', textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <GoogleAd format="auto" />
          </section>

          {/* 4. BOTTOM ROW (Chronicle Entry & Restricted Access) */}
          <motion.div 
            className={styles.bottomRowGrid}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }
            }}
          >
            <div className={styles.chronicleEntryCard} style={{ backgroundImage: "url('/img/ui/newspaper_bg.webp')" }}>
              <h4 className={styles.chronicleEntryLabel}>LATEST CHRONICLE ENTRY</h4>
              {latestChronicle ? (
                <>
                  <p className={styles.chronicleEntryText}>
                    {latestChronicle.title}
                  </p>
                  <Link to="/news" className={styles.readMore} style={{ textDecoration: 'none' }}>READ MORE</Link>
                </>
              ) : (
                <p className={styles.chronicleEntryText}>
                  No recent entries found in the chronicle.
                </p>
              )}
            </div>
            <div className={styles.restrictedCard} style={{ backgroundImage: `url('/img/ui/restricted_glass.webp')` }}>
               <div className={styles.matrixCode}>
                 ERR:: UNAUTHORIZED ACCESS ATTEMPT<br/>
                 SYS_OVERRIDE_FAIL: CODE 99x8F<br/>
                 TRACE_ROUTE: ... ENCRYPTED
               </div>
               <span className={styles.restrictedText}>RESTRICTED ACCESS</span>
            </div>
          </motion.div>

          {/* 5. INTERFACE PROTOCOL */}
          <motion.section 
            className={styles.themeSection}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }
            }}
          >
            <h2 className={styles.feedHeading} style={{ fontSize: '1.15rem' }}>Interface Protocol</h2>
            
            <div className={styles.themeGrid}>
              {availableThemes.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className={`${styles.themeBtn} ${activeTheme === t.id ? styles.themeBtnActive : ''}`}
                  style={{ '--theme-color': t.hex, '--theme-bg': t.bgUrl ? `url('${t.bgUrl}')` : `url('/img/ui/${t.img}.webp')` }}
                  data-cuelume-toggle
                  data-cuelume-hover
                >
                  {t.icon ? (
                    <img 
                      src={t.icon} 
                      alt="" 
                      aria-hidden="true" 
                      style={{ width: '18px', height: '18px', objectFit: 'contain', position: 'relative', zIndex: 2, marginRight: '6px', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }} 
                    />
                  ) : (
                    <span className={styles.themeDot} style={{ position: 'relative', zIndex: 2 }} />
                  )}
                  <div className={styles.themeInfo} style={{ position: 'relative', zIndex: 2 }}>
                    <span className={styles.themeName}>{t.label}</span>
                    {t.id === 'clan' && (
                      <div className="clan-palette-bar" style={{ height: '3px', width: '40px', marginTop: '4px', borderRadius: '1px' }}>
                        <span></span><span></span><span></span><span></span><span></span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {(authUser?.role === 'admin' || clanOverride) && (
              <div 
                style={{ 
                  marginTop: '16px', 
                  padding: '12px 14px', 
                  borderRadius: '10px', 
                  background: 'rgba(10, 12, 20, 0.75)', 
                  border: '1px solid rgba(255, 255, 255, 0.12)', 
                  backdropFilter: 'blur(16px)' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaGlyph name="fa-eye" style={{ color: 'var(--tint)', fontSize: '0.85rem' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-color)' }}>
                      Admin Bloodline Preview
                    </span>
                    {clanOverride && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        color: 'var(--tint)',
                        border: '1px solid var(--tint)'
                      }}>
                        Active: {clanOverride}
                      </span>
                    )}
                  </div>
                  {clanOverride && (
                    <button
                      type="button"
                      onClick={() => setClanOverride(null)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-color)',
                        fontSize: '0.72rem',
                        padding: '3px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Reset to My Character
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {CLAN_NAMES.map(c => {
                    const isSelected = (clanOverride || currentClan) === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          handleThemeChange('clan');
                          setClanOverride(c);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          border: isSelected ? '1px solid var(--tint)' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.3)',
                          color: isSelected ? 'var(--text-color)' : 'rgba(255, 255, 255, 0.65)',
                          boxShadow: isSelected ? '0 0 10px rgba(0, 0, 0, 0.4)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <ClanSymbol clan={c} size={14} />
                        <span>{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.section>

        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <motion.aside 
          className={styles.sidebarColumn}
          variants={{
            hidden: { opacity: 0, x: 50 },
            visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }
          }}
        >
          
          {/* STATUS PROTOCOL */}
          <section className={styles.statusProtocolCard}>
            <h3 className={styles.sidebarHeader}>STATUS PROTOCOL</h3>
            <div className={styles.statusBars}>
              <MiniVtmBar
                label="Health"
                max={sheetObj.health?.max || 5}
                sup={sheetObj.health?.superficial || 0}
                agg={sheetObj.health?.aggravated || 0}
              />
              <MiniVtmBar
                label="Willpower"
                max={Number(sheetObj.attributes?.Composure) + Number(sheetObj.attributes?.Resolve) || 5}
                sup={sheetObj.willpower?.superficial || 0}
                agg={sheetObj.willpower?.aggravated || 0}
              />
            </div>

            <div className={styles.hungerSection}>
              <span className={styles.hungerLabel}>HUNGER</span>
              <div className={styles.hungerDrops} style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((drop) => {
                  const isHungry = drop <= (sheetObj?.hunger || 0);
                  return (
                    <span 
                      key={drop} 
                      className="material-symbols-outlined" 
                      style={{ 
                        color: isHungry ? '#fca5a5' : 'rgba(255,255,255,0.2)', 
                        fontSize: '1.8rem',
                        fontVariationSettings: isHungry ? "'FILL' 1" : "'FILL' 0",
                        transition: 'all 0.3s ease'
                      }}
                    >
                      water_drop
                    </span>
                  );
                })}
              </div>
            </div>

            <div className={styles.quickStatsSection}>
              <span className={styles.quickStatsLabel}>AMBITION & DESIRE</span>
              <div className={styles.quickStatsGrid} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className={styles.qsItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <span className={styles.qsName} style={{ opacity: 0.6, fontSize: '0.7rem' }}>AMBITION</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-color)', lineHeight: 1.3 }}>{sheetObj?.ambition || 'None'}</span>
                </div>
                <div className={styles.qsItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <span className={styles.qsName} style={{ opacity: 0.6, fontSize: '0.7rem' }}>DESIRE</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-color)', lineHeight: 1.3 }}>{sheetObj?.desire || 'None'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* CHRONICLE / CONVERSATIONS / LOG */}
          <section className={styles.sidebarFeedCard}>
            <div className={styles.feedTabs}>
              <button
                className={`${styles.feedTab} ${activeFeedTab === 'chronicle' ? styles.feedTabActive : ''}`}
                onClick={() => setActiveFeedTab('chronicle')}
              >
                CHRONICLE
              </button>
              <button
                className={`${styles.feedTab} ${activeFeedTab === 'whispers' ? styles.feedTabActive : ''}`}
                onClick={() => setActiveFeedTab('whispers')}
              >
                CONVERSATIONS
              </button>
              <button
                className={`${styles.feedTab} ${activeFeedTab === 'log' ? styles.feedTabActive : ''}`}
                onClick={() => setActiveFeedTab('log')}
              >
                LOG
              </button>
            </div>

            <div className={styles.feedContent}>
              {activeFeedTab === 'chronicle' && (
                <>
                  <ul className={styles.newsList}>
                    {recentNews.length === 0 ? (
                      <p className={styles.emptyFeedText}>No headlines tonight.</p>
                    ) : (
                      recentNews.slice(0, 4).map(item => {
                        const tag = item.type === 'announcement' ? 'DECREE' : (item.theme || 'NEWS').toUpperCase();
                        const tagKey = (item.theme || item.type || '').toUpperCase();
                        return (
                          <li key={item.id} className={styles.newsItem}>
                            <Link to="/news" className={styles.newsLink}>
                              <div className={styles.newsHeader}>
                                 <span className={`${styles.newsTag} ${styles[`tag${tagKey}`] || ''}`}>{tag}</span>
                                 <time className={styles.newsDate}>{formatTimestamp(item.created_at)}</time>
                              </div>
                              <h3 className={styles.newsTitle}>{item.title}</h3>
                            </Link>
                          </li>
                        );
                      })
                    )}
                  </ul>
                  {recentNews.length > 0 && (
                    <Link to="/news" className={styles.feedLinkBtn} style={{ marginTop: '0.75rem' }}>
                      Chronicle Archive →
                    </Link>
                  )}
                </>
              )}

              {activeFeedTab === 'whispers' && (
                <>
                  <ul className={styles.chatList}>
                    {recentChats.length === 0 ? (
                      <p className={styles.emptyFeedText}>No recent correspondence.</p>
                    ) : (
                      recentChats.slice(0, 4).map(chat => (
                        <li key={chat.id} className={styles.chatItem}>
                          <Link to={chat.isEmail ? '/surfaceweb' : '/schrecknet'} className={styles.chatLink}>
                            <div className={styles.chatHead}>
                              <span className={styles.chatPartner}>
                                {chat.isNPC ? (
                                  <span className={styles.npcTag}>NPC</span>
                                ) : chat.isGroup ? (
                                  <span className={styles.npcTag} style={{ background: '#1c3d5a', color: '#90cdf4', borderColor: '#2b6cb0' }}>GRP</span>
                                ) : chat.isEmail ? (
                                  <span className={styles.npcTag} style={{ background: '#2d3a1c', color: '#c6e59a', borderColor: '#5f7a2b' }}>MAIL</span>
                                ) : null}
                                {chat.partnerName || 'Unknown'}
                              </span>
                              <time className={styles.chatTime}>{formatTimestamp(chat.timestamp)}</time>
                            </div>
                            <p className={styles.chatSnippet}>
                              {chat.isEmail && chat.subject ? <strong>{chat.subject}: </strong> : null}
                              {(chat.lastMessage || 'Sent an attachment').substring(0, 50)}
                              {(chat.lastMessage || '').length > 50 ? '…' : ''}
                            </p>
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <Link to="/schrecknet" className={styles.feedLinkBtn} style={{ flex: 1 }}>SchreckNet →</Link>
                    <Link to="/surfaceweb" className={styles.feedLinkBtn} style={{ flex: 1 }}>Surface Web →</Link>
                  </div>
                </>
              )}

              {activeFeedTab === 'log' && (
                <>
                  <ul className={styles.dtList}>
                    {recentDowntimes.length === 0 ? (
                      <p className={styles.emptyFeedText}>No recent actions recorded.</p>
                    ) : (
                      recentDowntimes.slice(0, 4).map(dt => (
                        <li key={dt.id} className={styles.dtItem}>
                          <Link to="/downtimes" className={styles.dtLink}>
                            <div className={styles.dtHead}>
                              <span className={styles.dtTitle}>{dt.title}</span>
                            </div>
                            <div className={styles.dtFooter}>
                              <span className={getDtBadgeClass(dt.status)}>
                                {dt.status}
                              </span>
                              <time className={styles.dtTime}>{formatTimestamp(dt.created_at)}</time>
                            </div>
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                  <Link to="/downtimes" className={styles.feedLinkBtn} style={{ marginTop: '0.75rem' }}>
                    View Downtimes →
                  </Link>
                </>
              )}

            </div>
          </section>

        </motion.aside>
      </div>

      </motion.main>
    </Skeleton>
  );
}
