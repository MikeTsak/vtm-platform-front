// src/pages/Home.jsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../core/api';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from 'boneyard-js/react';
import styles from '../styles/Home.module.css';

/* ── Clan tint colors ───────────────────────────────────────────── */
const CLAN_COLORS = {
  Brujah: '#b40f1f',
  Gangrel: '#2f7a3a',
  Malkavian: '#713c8b',
  Nosferatu: '#6a4b2b',
  Toreador: '#b8236b',
  Tremere: '#7b1113',
  Ventrue: '#1b4c8c',
  'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b',
  Lasombra: '#191a5a',
  'The Ministry': '#865f12',
  Caitiff: '#636363',
  'Thin-blood': '#6e6e2b',
};

const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo  = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png`      : '');
const textlogo = (c) => (c ? `/img/clans/text/300px-${fileify(c)}_Logo.png`   : '');

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
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  try { return dt.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return dt.toDateString(); }
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

/* ── Blood Splatter Avatar ──────────────────────────────────────── */
const BloodSplatterAvatar = () => {
  const drops = [
    { a: 0.2, d: 45, s: 15 }, { a: 0.6, d: 52, s: 10 }, { a: 1.1, d: 40, s: 20 },
    { a: 1.8, d: 48, s: 12 }, { a: 2.5, d: 55, s: 8 }, { a: 3.1, d: 42, s: 18 },
    { a: 3.8, d: 50, s: 14 }, { a: 4.4, d: 38, s: 22 }, { a: 5.1, d: 47, s: 11 },
    { a: 5.8, d: 54, s: 9 }
  ];
  
  return (
    <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg style={{ width: 0, height: 0, position: 'absolute' }}>
        <filter id="bloodGoo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </svg>
      
      {/* Blood Splatter Background */}
      <div style={{ position: 'absolute', inset: -20, filter: 'url(#bloodGoo)', pointerEvents: 'none' }}>
        {/* Central blood blob */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '85px', height: '85px', background: 'var(--tint, #8a0f1a)', borderRadius: '50%' }} />
        {/* Droplets */}
        {drops.map((d, i) => {
           const left = `calc(50% + ${Math.cos(d.a) * d.d}px)`;
           const top = `calc(50% + ${Math.sin(d.a) * d.d}px)`;
           return <div key={i} style={{ position: 'absolute', left, top, width: `${d.s}px`, height: `${d.s}px`, transform: 'translate(-50%, -50%)', background: 'var(--tint, #8a0f1a)', borderRadius: '50%' }} />
        })}
      </div>
      
      {/* The Avatar Circle */}
      <div style={{ position: 'relative', width: '80px', height: '80px', background: '#1c1c1c', borderRadius: '50%', zIndex: 2, overflow: 'hidden' }}>
        <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)', color: 'var(--tint, #fca5a5)', fontSize: '5.5rem', fontVariationSettings: "'FILL' 1", opacity: 0.8, display: 'block', textAlign: 'center' }}>person</span>
      </div>
    </div>
  );
};

export default function Home() {
  const [me, setMe] = useState(null);
  const [ch, setCh] = useState(null);
  const [quota, setQuota] = useState({ used: 0, limit: 3 });
  const [openingDate, setOpeningDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentDowntimes, setRecentDowntimes] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [recentNews, setRecentNews] = useState([]);
  const [fetchError, setFetchError] = useState(null);

  // ✅ DEFAULT SET TO CLAN-THEME WITH DARK ENGINE
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('vtm_theme') || 'clan');
  const [isShattering, setIsShattering] = useState(false);
  const [clickPoint, setClickPoint] = useState(null);
  const [shards, setShards] = useState([]);
  const [activeFeedTab, setActiveFeedTab] = useState('chronicle');
  const [showRsvp, setShowRsvp] = useState(false);
  const overlayRef = useRef(null);
  const nav = useNavigate();

  const eventCd = useCountdown(openingDate);

  /* ── Theme syncing & Saving to Backend ── */
  useEffect(() => {
    // Sync backend theme if user loaded
    if (me?.theme && me.theme !== activeTheme && !localStorage.getItem('theme_synced')) {
      setActiveTheme(me.theme);
      localStorage.setItem('theme_synced', 'true'); // Prevent infinite loop override
    }
  }, [me, activeTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('vtm_theme', activeTheme);

    if (activeTheme === 'clan') {
      const clanColor = (ch && CLAN_COLORS[ch.clan]) ? CLAN_COLORS[ch.clan] : '#8a0f1a';
      document.documentElement.style.setProperty('--tint', clanColor);
    } else {
      document.documentElement.style.removeProperty('--tint');
    }
  }, [activeTheme, ch]); // Fixed: added activeTheme to dependencies

  // Handler for Theme Clicks
  const handleThemeChange = async (themeId) => {
    setActiveTheme(themeId);
    try {
      await api.put('/auth/theme', { theme: themeId });
    } catch (error) {
      console.error('Failed to sync theme with server', error);
    }
  };

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

  /* ── Data fetch ── */
  useEffect(() => {
    setLoading(true);
    let live = true;
    (async () => {
      try {
        const { data: meData } = await api.get('/auth/me');
        if (!live) return;
        setMe(meData.user);
        if (meData.user?.role === 'admin') { nav('/admin'); return; }

        const { data: chData } = await api.get('/characters/me');
        if (!live) return;
        setCh(chData.character);

        if (chData.character) {
          const [qR, dtR, chatR, newsR, cfgR] = await Promise.allSettled([
            api.get('/downtimes/quota'),
            api.get('/downtimes/mine'),
            api.get('/chat/my-recent'),
            api.get('/news/recent'),
            api.get('/downtimes/config')
          ]);
          if (!live) return;
          if (qR.status    === 'fulfilled') setQuota(qR.value.data);
          if (dtR.status   === 'fulfilled') setRecentDowntimes(
            (dtR.value.data?.downtimes || [])
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .slice(0, 5)
          );
          if (chatR.status === 'fulfilled') setRecentChats(chatR.value.data?.conversations || []);
          if (newsR.status === 'fulfilled') setRecentNews(newsR.value.data?.news || []);
          if (cfgR.status  === 'fulfilled') setOpeningDate(cfgR.value.data?.downtime_opening || null);
        }
      } catch (error) {
        if (live) setFetchError('Failed to load portal data.');
      } finally {
        if (live) setLoading(false);
      }
    })();
  }, [nav]);

  if (!me) return <div className={styles.loadingScreen}>Please log in.</div>;

  if (!ch) return (
    <div className={styles.noCharPage}>
      <div className={styles.noCharCard}>
        <div className={styles.noCharRose}>🥀</div>
        <h2 className={styles.noCharTitle}>Welcome, {me.display_name}</h2>
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

  const clan        = (ch.clan || '').trim();
  const isMalkavian = clan.toLowerCase() === 'malkavian';
  const showCobweb  = isMalkavian || me.role === 'admin';
  const quotaPct    = Math.min((quota.used / quota.limit) * 100, 100);

  const dynamicClanTint = CLAN_COLORS[clan] || '#8a0f1a';

  let sheetObj = {};
  try {
    sheetObj = typeof ch.sheet === 'string' ? JSON.parse(ch.sheet) : (ch.sheet || {});
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

  // Construct Themes Array dynamically to insert Character's Clan
  const availableThemes = [
    { id: 'clan', label: clan ? `${clan}` : 'Default', sub: 'Bloodline', hex: dynamicClanTint, img: 'theme_clan' },
    { id: 'camarilla', label: 'Camarilla', sub: 'Crimson', hex: '#8a0f1a', img: 'theme_camarilla' },
    { id: 'schrecknet',  label: 'SchreckNet', sub: 'Blue', hex: '#0ea5e9', img: 'theme_schrecknet' },
    { id: 'anarch',      label: 'Anarch', sub: 'Gold', hex: '#ea580c', img: 'theme_anarch' },
    { id: 'Giannakis',      label: 'Giannakis', sub: 'Teal', hex: '#0d9488', img: 'theme_giannakis' },
  ];

  return (
    <Skeleton name="home-page" loading={loading}>
      <main className={styles.homePage}>

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

      <div className={styles.dashboardLayout}>
        
        {/* ── LEFT MAIN COLUMN ── */}
        <div className={styles.mainColumn}>
          
          {/* 1. IDENTITY HEADER */}
          <header className={styles.identityHeader} style={{ '--dynamic-tint': dynamicClanTint }}>
            <span className={`${styles.corner} ${styles.cornerTL}`} />
            <span className={`${styles.corner} ${styles.cornerTR}`} />
            <span className={`${styles.corner} ${styles.cornerBL}`} />
            <span className={`${styles.corner} ${styles.cornerBR}`} />
            
            <div className={styles.headerInner}>
              <BloodSplatterAvatar />

              <div className={styles.headerMeta}>
                <span className={styles.neonateLabel}>NEONATE</span>
                <h1 className={styles.charName}>{ch.name}</h1>
                <p className={styles.charSub}>
                  <span className={styles.clanLabel}>
                    <img src={symlogo(ch.clan)} alt={ch.clan || 'Clan Logo'} style={{ width: '16px', height: '16px', objectFit: 'contain', marginRight: '4px', verticalAlign: 'middle', filter: 'brightness(0) invert(1) drop-shadow(0 0 2px rgba(0,0,0,0.5))' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    Clan {ch.clan || 'Caitiff'}
                  </span>
                </p>
              </div>

              <div className={styles.headerStats}>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>AVAILABLE XP</span>
                  <span className={styles.statValue}>{ch.xp ?? 0}</span>
                </div>
              </div>
            </div>

            <div className={styles.clanWatermark} aria-hidden>
              <img
                src={textlogo(ch.clan)}
                alt=""
                className={styles.clanLogo}
                onError={e => { e.target.parentElement.style.display = 'none'; }}
              />
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
          </header>

          {fetchError && <div className={styles.errorBanner}>{fetchError}</div>}

          {/* 2. NEXT MODERN EVENT */}
          <section className={styles.eventCard}>
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
            <button className={styles.rsvpBtn} onClick={() => setShowRsvp(true)}>RSVP</button>
          </section>

          {showRsvp && (
            <div 
              className={styles.rsvpModalOverlay} 
              onClick={() => setShowRsvp(false)} 
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div 
                className={styles.rsvpModal} 
                onClick={e => e.stopPropagation()} 
                style={{ background: 'var(--surface-color)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--tint)', maxWidth: '400px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
              >
                <h3 style={{ marginTop: 0, fontFamily: 'Playfair Display, serif', color: 'var(--tint)' }}>RSVP Confirmed</h3>
                <p style={{ color: 'var(--text-muted)' }}>The Harpy has noted your intent to attend the upcoming gathering. Do not be late.</p>
                <button 
                  onClick={() => setShowRsvp(false)} 
                  style={{ marginTop: '1.5rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '0.5rem 1.5rem', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* 3. NAV GRID */}
          <section className={styles.navGrid}>
            {NAV_CARDS.map(({ to, icon, title, sub, img }) => (
              <Link key={to} to={to} className={styles.navCard} style={{ '--card-bg': `url('/img/ui/${img}.png')` }}>
                <div className={styles.navCardIcon}>
                  <span className="material-symbols-outlined" style={{ position: 'relative', zIndex: 2 }}>{icon}</span>
                </div>
                <span className={styles.navCardTitle} style={{ position: 'relative', zIndex: 2 }}>{title}</span>
              </Link>
            ))}

            {/* The Cobweb */}
            {showCobweb && (
              <a
                href="/premonitions"
                onClick={handlePremonitionClick}
                className={`${styles.navCard} ${styles.malkCard}`}
                title="Enter the Cobweb"
                style={{ '--card-bg': `url('/img/ui/cobweb_static.png')` }}
              >
                <div className={styles.glitchBg}></div>
                <div className={styles.navCardIcon} style={{ position: 'relative', zIndex: 2 }}>
                  <span className="material-symbols-outlined" style={{ color: '#fca5a5' }}>visibility</span>
                </div>
                <span className={styles.navCardTitle} style={{ position: 'relative', zIndex: 2 }}>THE COBWEB</span>
              </a>
            )}
          </section>

          {/* 4. BOTTOM ROW (Chronicle Entry & Restricted Access) */}
          <div className={styles.bottomRowGrid}>
            <div className={styles.chronicleEntryCard}>
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
            <div className={styles.restrictedCard} style={{ backgroundImage: `url('/img/ui/restricted_glass.png')` }}>
               <div className={styles.matrixCode}>
                 ERR:: UNAUTHORIZED ACCESS ATTEMPT<br/>
                 SYS_OVERRIDE_FAIL: CODE 99x8F<br/>
                 TRACE_ROUTE: ... ENCRYPTED
               </div>
               <span className={styles.restrictedText}>RESTRICTED ACCESS</span>
            </div>
          </div>

          {/* 5. THEMES PROTOCOL */}
          <section className={styles.themeSection}>
            <h2 className={styles.feedHeading} style={{ fontSize: '1.15rem' }}>Interface Protocol</h2>
            <div className={styles.themeGrid}>
              {availableThemes.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className={`${styles.themeBtn} ${activeTheme === t.id ? styles.themeBtnActive : ''}`}
                  style={{ '--theme-color': t.hex, '--theme-bg': `url('/img/ui/${t.img}.png')` }}
                >
                  <span className={styles.themeDot} style={{ position: 'relative', zIndex: 2 }} />
                  <div className={styles.themeInfo} style={{ position: 'relative', zIndex: 2 }}>
                    <span className={styles.themeName}>{t.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className={styles.sidebarColumn}>
          
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
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-color)', lineHeight: 1.3 }}>{sheetObj?.ambition || '—'}</span>
                </div>
                <div className={styles.qsItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <span className={styles.qsName} style={{ opacity: 0.6, fontSize: '0.7rem' }}>DESIRE</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-color)', lineHeight: 1.3 }}>{sheetObj?.desire || '—'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* CHRONICLE / WHISPERS / LOG */}
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
                WHISPERS
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
                <ul className={styles.newsList}>
                  {recentNews.length === 0 ? (
                    <p className={styles.emptyFeedText}>No headlines tonight.</p>
                  ) : (
                    recentNews.slice(0, 3).map(item => {
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
              )}

              {activeFeedTab === 'whispers' && (
                <ul className={styles.chatList}>
                  {recentChats.length === 0 ? (
                    <p className={styles.emptyFeedText}>No recent correspondence.</p>
                  ) : (
                    recentChats.slice(0, 4).map(chat => (
                      <li key={chat.id} className={styles.chatItem}>
                        <Link to="/comms" className={styles.chatLink}>
                          <div className={styles.chatHead}>
                            <span className={styles.chatPartner}>
                              {chat.isNPC && <span className={styles.npcTag}>NPC</span>}
                              {chat.partnerName}
                            </span>
                            <time className={styles.chatTime}>{formatTimestamp(chat.timestamp)}</time>
                          </div>
                          <p className={styles.chatSnippet}>
                            {(chat.lastMessage || '').substring(0, 50)}
                            {(chat.lastMessage || '').length > 50 ? '…' : ''}
                          </p>
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              )}

              {activeFeedTab === 'log' && (
                <ul className={styles.dtList}>
                  {recentDowntimes.length === 0 ? (
                    <p className={styles.emptyFeedText}>No recent actions recorded.</p>
                  ) : (
                    recentDowntimes.map(dt => (
                      <li key={dt.id} className={styles.dtItem}>
                        <Link to="/downtimes" className={styles.dtLink}>
                          <div className={styles.dtHead}>
                            <span className={styles.dtTitle}>{dt.title}</span>
                          </div>
                          <div className={styles.dtFooter}>
                            <span className={styles.dtStatus}>Status: {dt.status}</span>
                            <time className={styles.dtTime}>{formatTimestamp(dt.created_at)}</time>
                          </div>
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </section>

        </aside>
      </div>

      </main>
    </Skeleton>
  );
}
