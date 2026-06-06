// src/pages/Home.jsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
import { Link, useNavigate } from 'react-router-dom';
import styles from '../styles/Home.module.css';
import Loading from '../components/Loading';

/* ── Clan image helpers ─────────────────────────────────────────── */
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
  return date.toLocaleDateString('el-GR', { month: 'short', day: 'numeric' });
};

/* ── Shatter constants ──────────────────────────────────────────── */
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
  { to: '/downtimes', icon: '🌑', title: 'Downtimes',   sub: null /* quota */     },
  { to: '/comms',     icon: '📜', title: 'Comms',        sub: 'Letters & Whispers'},
  { to: '/domains',   icon: '🏛️', title: 'Domains',      sub: 'Territory Map'     },
  { to: '/boons',     icon: '⚖️', title: 'Boons',        sub: 'Blood Registry'    },
  { to: '/court/coteries', icon: '🥀', title: 'Coteries', sub: 'Manage Group'     },
  { to: '/court/hierarchy', icon: '👑', title: 'Court',  sub: 'Hierarchy'         },
  { to: '/news',      icon: '🌍', title: 'News',          sub: 'Archive'           },
];

/* ─────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────── */
export default function Home() {
  const [me,             setMe]             = useState(null);
  const [ch,             setCh]             = useState(null);
  const [quota,          setQuota]          = useState({ used: 0, limit: 3 });
  const [loading,        setLoading]        = useState(true);
  const [recentDowntimes,setRecentDowntimes]= useState([]);
  const [recentChats,    setRecentChats]    = useState([]);
  const [recentNews,     setRecentNews]     = useState([]);
  const [fetchError,     setFetchError]     = useState(null);
  const [isShattering,   setIsShattering]   = useState(false);
  const [clickPoint,     setClickPoint]     = useState(null);
  const [shards,         setShards]         = useState([]);
  const overlayRef = useRef(null);
  const nav = useNavigate();

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
          const [qR, dtR, chatR, newsR] = await Promise.allSettled([
            api.get('/downtimes/quota'),
            api.get('/downtimes/mine'),
            api.get('/chat/my-recent'),
            api.get('/news/recent'),
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
        }
      } catch (err) {
        console.error(err);
        if (live) setFetchError('Failed to load portal data.');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [nav]);

  /* ── Guards ── */
  if (loading) return <Loading />;
  if (!me)     return <div className={styles.loadingScreen}>Please log in.</div>;

  if (!ch) return (
    <div className={styles.noCharPage}>
      <div className={styles.noCharCard}>
        <div className={styles.noCharRose}>🥀</div>
        <h2 className={styles.noCharTitle}>Welcome, {me.display_name}</h2>
        <p  className={styles.noCharSub}>
          You must present yourself before the gathered Kindred of Athens.<br/>
          Forge your identity. Claim your lineage.
        </p>
        <button className={styles.noCharBtn} onClick={() => nav('/make')}>
          Create Character
        </button>
      </div>
    </div>
  );

  const clan        = (ch.clan || '').trim().toLowerCase();
  const isMalkavian = clan === 'malkavian';
  const showCobweb  = isMalkavian || me.role === 'admin';
  const quotaPct    = Math.min((quota.used / quota.limit) * 100, 100);

  return (
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

      {/* ══════════════════════════════════════════
          1.  IDENTITY HEADER
      ══════════════════════════════════════════ */}
      <header className={styles.identityHeader}>
        {/* Decorative corner marks */}
        <span className={`${styles.corner} ${styles.cornerTL}`} />
        <span className={`${styles.corner} ${styles.cornerTR}`} />
        <span className={`${styles.corner} ${styles.cornerBL}`} />
        <span className={`${styles.corner} ${styles.cornerBR}`} />

        <div className={styles.headerInner}>
          {/* Clan symbol */}
          <div className={styles.clanRing}>
            <img
              src={symlogo(ch.clan)}
              alt={ch.clan}
              className={styles.clanSymbol}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Name + meta */}
          <div className={styles.headerMeta}>
            <h1 className={styles.charName}>{ch.name}</h1>
            <p  className={styles.charSub}>
              <span className={styles.clanLabel}>{ch.clan || 'Caitiff'}</span>
              <span className={styles.separator}>·</span>
              <span className={styles.xpChip}>{ch.xp ?? 0} XP</span>
            </p>
          </div>

          {/* Clan logo watermark */}
          <div className={styles.clanWatermark} aria-hidden>
            <img
              src={textlogo(ch.clan)}
              alt=""
              className={styles.clanLogo}
              onError={e => { e.target.parentElement.style.display = 'none'; }}
            />
          </div>
        </div>

        {/* Downtime quota bar */}
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

      {/* ══════════════════════════════════════════
          2.  FEEDS  (newspaper · whispers · actions)
      ══════════════════════════════════════════ */}
      <section className={styles.feeds} aria-label="Activity feeds">

        {/* ── 2a. THE CHRONICLE ── */}
        <div className={styles.chronicle}>
          <div className={styles.chronicleHeader}>
            <span className={styles.chronicleRule} />
            <h2 className={styles.chronicleName}>The Erebus Chronicle</h2>
            <span className={styles.chronicleRule} />
            <span className={styles.chronicleDate}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {recentNews.length === 0
            ? <p className={styles.emptyState}>No headlines tonight.</p>
            : (
              <ul className={styles.headlineList}>
                {recentNews.map(item => {
                  const tag = item.type === 'announcement' ? 'DECREE' : (item.theme || 'NEWS').toUpperCase();
                  const tagKey = (item.theme || item.type || '').toUpperCase();
                  return (
                    <li key={item.id} className={styles.headlineItem}>
                      <Link to="/news" className={styles.headlineLink}>
                        <span className={`${styles.outletBadge} ${styles[`tag${tagKey}`] || ''}`}>{tag}</span>
                        <h3 className={styles.headlineTitle}>{item.title}</h3>
                        <time className={styles.headlineDate}>{formatTimestamp(item.created_at)}</time>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )
          }
          <Link to="/news" className={styles.chronicleReadMore}>Full Edition ›</Link>
        </div>

        {/* ── 2b. WHISPERS (recent chats) ── */}
        <div className={styles.logbook}>
          <div className={styles.logHeader}>
            <h3 className={styles.logTitle}>
              <span className={styles.logDot} />
              Recent Whispers
            </h3>
            <Link to="/comms" className={styles.logViewAll}>View all</Link>
          </div>
          <ul className={styles.logList}>
            {recentChats.length === 0
              ? <li className={styles.emptyState}>No recent correspondence.</li>
              : recentChats.map(chat => (
                  <li key={chat.id} className={styles.logItem}>
                    <Link to="/comms" className={styles.logLink}>
                      <div className={styles.logRow}>
                        <span className={styles.logFrom}>
                          {chat.isNPC && <span className={styles.npcTag}>NPC</span>}
                          {chat.partnerName}
                        </span>
                        <time className={styles.logTime}>{formatTimestamp(chat.timestamp)}</time>
                      </div>
                      <span className={styles.logPreview}>
                        {(chat.lastMessage || '').substring(0, 60)}
                        {(chat.lastMessage || '').length > 60 ? '…' : ''}
                      </span>
                    </Link>
                  </li>
                ))
            }
          </ul>
        </div>

        {/* ── 2c. ACTION LOG (recent downtimes) ── */}
        <div className={styles.logbook}>
          <div className={styles.logHeader}>
            <h3 className={styles.logTitle}>
              <span className={styles.logDot} style={{ background: 'var(--gold)' }} />
              Action Log
            </h3>
            <Link to="/downtimes" className={styles.logViewAll}>View all</Link>
          </div>
          <ul className={styles.logList}>
            {recentDowntimes.length === 0
              ? <li className={styles.emptyState}>No recent actions.</li>
              : recentDowntimes.map(dt => (
                  <li key={dt.id} className={styles.logItem}>
                    <Link to="/downtimes" className={styles.logLink}>
                      <div className={styles.logRow}>
                        <span className={`${styles.statusBadge} ${styles[`status_${dt.status}`]}`}>
                          {dt.status}
                        </span>
                        <time className={styles.logTime}>{formatTimestamp(dt.created_at)}</time>
                      </div>
                      <span className={styles.logPreview}>{dt.title}</span>
                    </Link>
                  </li>
                ))
            }
          </ul>
        </div>

      </section>

      {/* ══════════════════════════════════════════
          3.  NAVIGATION GRID
      ══════════════════════════════════════════ */}
      <section className={styles.navSection} aria-label="Quick navigation">
        <div className={styles.dividerLine}>
          <span className={styles.dividerIcon}>✦</span>
        </div>

        <div className={styles.navGrid}>
          {NAV_CARDS.map(({ to, icon, title, sub }) => (
            <Link key={to} to={to} className={styles.navCard}>
              <span className={styles.navCardIcon}>{icon}</span>
              <span className={styles.navCardTitle}>{title}</span>
              <span className={styles.navCardSub}>
                {to === '/downtimes' ? `${quota.used}/${quota.limit} used` : sub}
              </span>
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
  );
}