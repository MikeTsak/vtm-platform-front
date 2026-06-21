// src/pages/Home.jsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
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
  { to: '/character', icon: '🩸', title: 'Character',    sub: 'Sheet & XP'        },
  { to: '/downtimes', icon: '🌑', title: 'Downtimes',   sub: 'Monthly Actions'    },
  { to: '/schrecknet', icon: '📜', title: 'SchreckNet',   sub: 'Everything here is safe.'},
  { to: '/surfaceweb', icon: '🌐', title: 'Surface Web',  sub: 'Be careful, you are not safe.'},
  { to: '/domains',   icon: '🏛️', title: 'Domains',      sub: 'Territory Map'     },
  { to: '/boons',     icon: '⚖️', title: 'Boons',        sub: 'Blood Registry'    },
  { to: '/court/coteries', icon: '🥀', title: 'Coteries', sub: 'Manage Group'     },
  { to: '/court/hierarchy', icon: '👑', title: 'Court',  sub: 'Hierarchy'         },
  { to: '/news',      icon: '🌍', title: 'News',          sub: 'Archive'           },
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
      <div style={{ display: 'flex', gap: '2px' }}>
        {Array.from({ length: safeMax }).map((_, i) => {
          const isAgg = i < aggCount;
          const isSup = !isAgg && i < aggCount + supCount;
          return (
            <div key={i} style={{
              flex: 1, height: '10px', borderRadius: '2px',
              background: isAgg ? 'var(--tint)' : isSup ? 'var(--text-muted)' : 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)'
            }} />
          );
        })}
      </div>
    </div>
  );
}

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

  // Construct Themes Array dynamically to insert Character's Clan
  const availableThemes = [
    { id: 'clan', label: clan ? `${clan}` : 'Default', sub: 'Bloodline', hex: dynamicClanTint },
    { id: 'camarilla', label: 'Camarilla', sub: 'Crimson', hex: '#8a0f1a' },
    { id: 'schrecknet',  label: 'SchreckNet', sub: 'Blue', hex: '#0ea5e9' },
    { id: 'anarch',      label: 'Anarch', sub: 'Gold', hex: '#ea580c' },
    { id: 'Giannakis',      label: 'Giannakis', sub: 'Teal', hex: '#0d9488' },
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

      {/* ════════════════════════════════════════════
          1. IDENTITY HEADER
      ════════════════════════════════════════════ */}
      <header className={styles.identityHeader} style={{ '--dynamic-tint': dynamicClanTint }}>
        <span className={`${styles.corner} ${styles.cornerTL}`} />
        <span className={`${styles.corner} ${styles.cornerTR}`} />
        <span className={`${styles.corner} ${styles.cornerBL}`} />
        <span className={`${styles.corner} ${styles.cornerBR}`} />

        <div className={styles.headerInner}>
          <div className={styles.clanRing}>
            <img
              src={symlogo(ch.clan)}
              alt={ch.clan}
              className={styles.clanSymbol}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>

          <div className={styles.headerMeta}>
            <h1 className={styles.charName}>{ch.name}</h1>
            <p className={styles.charSub}>
              <span className={styles.clanLabel}>{ch.clan || 'Caitiff'}</span>
              <span className={styles.separator}>·</span>
              <span className={styles.xpChip}>{ch.xp ?? 0} XP</span>
            </p>
          </div>

          <div className={styles.clanWatermark} aria-hidden>
            <img
              src={textlogo(ch.clan)}
              alt=""
              className={styles.clanLogo}
              onError={e => { e.target.parentElement.style.display = 'none'; }}
            />
          </div>
        </div>

        <div className={styles.quotaBar}>
          <span className={styles.quotaLabel}>Actions this period</span>
          <div className={styles.quotaTrack}>
            <div className={styles.quotaFill} style={{ width: `${quotaPct}%` }} />
            {Array.from({ length: quota.limit }).map((_, i) => (
              <div
                key={i}
                className={`${styles.quotaPip} ${i < quota.used ? styles.quotaPipUsed : ''}`}
              />
            ))}
          </div>
          <span className={styles.quotaCount}>{quota.used}/{quota.limit}</span>
        </div>
      </header>

      {fetchError && <div className={styles.errorBanner}>{fetchError}</div>}

      {/* ════════════════════════════════════════════
          CHRONICLE EVENT COUNTDOWN & TRACKERS
      ══════════════════�═════════════════════════ */}
      <div className={`${styles.pageSection} ${styles.dashboardGrid}`} style={{ gridTemplateColumns: '1fr 1fr' }}>
        <section className={styles.feedCard} style={{ textAlign: 'center', justifyContent: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Next Modern Event</h3>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-title)', color: 'var(--tint)', marginTop: '4px' }}>
            {niceDate(openingDate)}
          </div>
          {!eventCd.isPast ? (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px', fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700 }}>
              <div>{eventCd.days} <span style={{fontSize:'0.7rem', display:'block', color:'var(--text-muted)'}}>Days</span></div>
              <div>{String(eventCd.hours).padStart(2,'0')} <span style={{fontSize:'0.7rem', display:'block', color:'var(--text-muted)'}}>Hours</span></div>
              <div>{String(eventCd.mins).padStart(2,'0')} <span style={{fontSize:'0.7rem', display:'block', color:'var(--text-muted)'}}>Mins</span></div>
            </div>
          ) : (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '12px' }}>Event is underway or concluded.</div>
          )}
        </section>

        <section className={styles.feedCard} style={{ justifyContent: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', textAlign: 'center' }}>Status Summaries</h3>
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
        </section>
      </div>

      {/* ════════════════════════════════════════════
          THEME CUSTOMIZATION INTERFACE
      ════════════════════════════════════════════ */}
      <section className={`${styles.pageSection} ${styles.feedCard}`} style={{ height: 'fit-content' }}>
        <h2 className={styles.feedHeading} style={{ fontSize: '1.15rem' }}>Interface Protocol</h2>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Synchronize your terminal aesthetic to your preferred lineage or faction.</p>

        <div className={styles.themeGrid}>
          {availableThemes.map(t => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`${styles.themeBtn} ${activeTheme === t.id ? styles.themeBtnActive : ''}`}
              style={{ '--theme-color': t.hex }}
            >
              <span className={styles.themeDot} />
              <div className={styles.themeInfo}>
                <span className={styles.themeName}>{t.label}</span>
                <span className={styles.themeSub}>{t.sub}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          2. FEEDS (Chronicle, Comms, Action Log)
      ═══════════════════════════════════════════ */}
      <div className={styles.dashboardGrid}>

        {/* ── THE CHRONICLE (News) ── */}
        <section className={styles.compactFeedCard}>
          <h2 className={styles.feedHeading}>The Erebus Chronicle</h2>
          {recentNews.length === 0 ? (
            <p className={styles.emptyFeedText}>No headlines tonight.</p>
          ) : (
            <div className={styles.feedListScroll}>
              <ul className={styles.newsList}>
                {recentNews.slice(0, 3).map(item => {
                  const tag = item.type === 'announcement' ? 'DECREE' : (item.theme || 'NEWS').toUpperCase();
                  const tagKey = (item.theme || item.type || '').toUpperCase();
                  return (
                    <li key={item.id} className={styles.newsItem}>
                      <Link to="/news" className={styles.newsLink}>
                        <span className={`${styles.newsTag} ${styles[`tag${tagKey}`] || ''}`}>{tag}</span>
                        <div className={styles.newsContent}>
                          <h3 className={styles.newsTitle}>{item.title}</h3>
                          <time className={styles.newsDate}>{formatTimestamp(item.created_at)}</time>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <Link to="/news" className={styles.feedLinkBtn}>Full Edition ›</Link>
        </section>

        {/* ── WHISPERS (Comms / Recent Chats) ── */}
        <section className={styles.compactFeedCard}>
          <h2 className={styles.feedHeading}>Recent Whispers</h2>
          {recentChats.length === 0 ? (
            <p className={styles.emptyFeedText}>No recent correspondence.</p>
          ) : (
            <div className={styles.feedListScroll}>
              <ul className={styles.chatList}>
                {recentChats.slice(0, 4).map(chat => (
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
                ))}
              </ul>
            </div>
          )}
          <Link to="/comms" className={styles.feedLinkBtn}>Open Comms ›</Link>
        </section>

        {/* ── ACTION LOG (Downtimes) ── */}
        <section className={styles.compactFeedCard}>
          <h2 className={styles.feedHeading}>Action Log</h2>
          {recentDowntimes.length === 0 ? (
            <p className={styles.emptyFeedText}>No recent actions recorded.</p>
          ) : (
            <div className={styles.feedListScroll}>
              <ul className={styles.dtList}>
                {recentDowntimes.map(dt => {
                  const status = (dt.status || 'submitted').toLowerCase();
                  let badgeClass = styles.badgePending;
                  if (status === 'approved') badgeClass = styles.badgeApproved;
                  if (status === 'needs a scene') badgeClass = styles.badgeNeedsScene;
                  if (status === 'rejected') badgeClass = styles.badgeRejected;
                  if (status === 'resolved' || status === 'resolved in scene') badgeClass = styles.badgeReview;

                  return (
                    <li key={dt.id} className={styles.dtItem}>
                      <Link to="/downtimes" className={styles.dtLink}>
                        <div className={styles.dtHead}>
                          <span className={`${styles.statusBadge} ${badgeClass}`}>
                            {dt.status}
                          </span>
                          <time className={styles.dtTime}>{formatTimestamp(dt.created_at)}</time>
                        </div>
                        <p className={styles.dtTitle}>{dt.title}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <Link to="/downtimes" className={styles.feedLinkBtn}>Review Downtimes ›</Link>
        </section>

      </div>

      {/* ════════════════════════════════════════════
          3. NAVIGATION GRID
      ════════════════════════════════════════════ */}
      <section className={styles.navSection} aria-label="Quick navigation">
        <div className={styles.dividerLine}>
          <span className={styles.dividerIcon}>✦</span>
        </div>

        <div className={styles.navGrid}>
          {NAV_CARDS.map(({ to, icon, title, sub }) => (
            <Link key={to} to={to} className={styles.navCard}>
              <span className={styles.navCardIcon}>{icon}</span>
              <span className={styles.navCardTitle}>{title}</span>
              <span className={styles.navCardSub}>{sub}</span>
            </Link>
          ))}

          {/* Malkavian / Admin: The Cobweb */}
          {showCobweb && (
            <a
              href="/premonitions"
              onClick={handlePremonitionClick}
              className={`${styles.navCard} ${styles.malkCard}`}
              title="Enter the Cobweb"
            >
              <span className={`${styles.navCardIcon} ${styles.malkIcon}`}>👁️</span>
              <span className={`${styles.navCardTitle} ${styles.malkTitle}`}>The Cobweb</span>
              <span className={`${styles.navCardSub} ${styles.malkSub}`}>Visions & Whispers</span>
            </a>
          )}
        </div>
      </section>
    </main>
    </Skeleton>
  );
}