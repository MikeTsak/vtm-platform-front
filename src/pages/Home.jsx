// src/pages/Home.jsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
import { Link, useNavigate } from 'react-router-dom';
import styles from '../styles/Home.module.css';
import shatterStyles from '../styles/ShatterEffect.module.css';

/* Helper to map clan names to image files */
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');
const textlogo = (c) => (c ? `/img/clans/text/300px-${fileify(c)}_Logo.png` : '');

// --- Helper: Relative Time ---
const formatTimestamp = (ts) => {
  if (!ts) return '';
  const date = new Date(ts);
  const now = new Date();
  if (isNaN(date.getTime())) return 'Invalid';
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (diffSeconds < 60) return `Just now`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- SHATTER LOGIC HELPERS ---
const GRID_COLS = 12;
const GRID_ROWS = 16;
const TOTAL_MS = 1500;
const random = (min, max) => min + Math.random() * (max - min);

function makeShardPolygon(cellRect) {
  const { left, top, width, height } = cellRect;
  const cx = left + width / 2;
  const cy = top + height / 2;
  const points = [];
  const n = Math.floor(random(5, 9));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + random(-0.25, 0.25);
    const r = random(0.35, 0.55) * Math.min(width, height);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    points.push([x, y]);
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return points.map(([x, y]) => `${(x / vw) * 100}vw ${(y / vh) * 100}vh`).join(', ');
}

export default function Home() {
  const [me, setMe] = useState(null);
  const [ch, setCh] = useState(null);
  const [quota, setQuota] = useState({ used: 0, limit: 3 });
  const [loading, setLoading] = useState(true);
  
  // Feeds
  const [recentDowntimes, setRecentDowntimes] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [recentNews, setRecentNews] = useState([]);

  const [fetchError, setFetchError] = useState(null);
  const nav = useNavigate();

  // Shatter State
  const [isShattering, setIsShattering] = useState(false);
  const [clickPoint, setClickPoint] = useState(null);
  const [shards, setShards] = useState([]);
  const overlayRef = useRef(null);

  // --- SHATTER HANDLER ---
  const handlePremonitionClick = (e) => {
    e.preventDefault();
    if (isShattering) return;
    
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      nav('/premonitions');
      return;
    }

    setClickPoint({ x: e.clientX, y: e.clientY });
    setIsShattering(true);

    setTimeout(() => {
      nav('/premonitions');
    }, TOTAL_MS);
  };

  useEffect(() => {
    if (!isShattering || !clickPoint || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const cellW = rect.width / GRID_COLS;
    const cellH = rect.height / GRID_ROWS;
    const furthest = Math.max(
      Math.hypot(clickPoint.x - rect.left, clickPoint.y - rect.top),
      Math.hypot(clickPoint.x - rect.right, clickPoint.y - rect.bottom)
    );

    const list = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const cellRect = { left: rect.left + c * cellW, top: rect.top + r * cellH, width: cellW, height: cellH };
        const cx = cellRect.left + cellRect.width / 2;
        const cy = cellRect.top + cellRect.height / 2;
        const dx = cx - clickPoint.x;
        const dy = cy - clickPoint.y;
        const d = Math.hypot(dx, dy);
        const delay = (d / furthest) * 0.35;
        const force = (furthest - d) / furthest;
        const destX = dx * (force * 2.7 + 0.8) + random(-14, 14);
        const destY = dy * (force * 2.7 + 0.8) + random(-14, 14);
        
        list.push({
          poly: makeShardPolygon(cellRect),
          style: {
            '--delay': `${delay}s`,
            '--x': `${destX}px`,
            '--y': `${destY}px`,
            '--rotate': `${(Math.random() - 0.5) * 560}deg`,
            '--scale': 0.8 + Math.random() * 0.35,
            '--tint': Math.random() < 0.45 ? 'rgba(170,255,240,0.06)' : 'rgba(255,255,255,0.04)',
            '--edge': Math.random() < 0.6 ? 'rgba(140, 255, 230, 0.55)' : 'rgba(220, 240, 255, 0.42)',
          },
        });
      }
    }
    setShards(list);
  }, [isShattering, clickPoint]);


  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    let isMounted = true;

    const fetchData = async () => {
      try {
        const { data: meData } = await api.get('/auth/me');
        if (!isMounted) return;
        setMe(meData.user);

        if (meData.user?.role === 'admin') {
          nav('/admin');
          return;
        }

        const { data: chData } = await api.get('/characters/me');
        if (!isMounted) return;
        setCh(chData.character);

        if (chData.character) {
          const [quotaRes, downtimesRes, chatsRes, newsRes] = await Promise.allSettled([
            api.get('/downtimes/quota'),
            api.get('/downtimes/mine'),
            api.get('/chat/my-recent'),
            api.get('/news/recent'),
          ]);

          if (!isMounted) return;

          if (quotaRes.status === 'fulfilled') setQuota(quotaRes.value.data);
          if (downtimesRes.status === 'fulfilled') {
            const dts = (downtimesRes.value.data?.downtimes || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setRecentDowntimes(dts.slice(0, 5));
          }
          if (chatsRes.status === 'fulfilled') setRecentChats(chatsRes.value.data?.conversations || []);
          if (newsRes.status === 'fulfilled') setRecentNews(newsRes.value.data?.news || []);
        }
      } catch (error) {
        console.error('Home load error:', error);
        if (isMounted) setFetchError('Failed to load portal data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [nav]);

  if (loading) return <div className={styles.loadingScreen}>Unlocking the Gate...</div>;
  if (fetchError && !me) return <div className={styles.loadingScreen}>{fetchError}</div>;
  if (!me) return <div className={styles.loadingScreen}>Please log in.</div>;

  if (!ch) {
    return (
      <div className={styles.homePage} style={{display:'grid', placeItems:'center'}}>
        <div className={styles.errorCard} style={{background:'#111', padding:'40px'}}>
          <h2>Welcome, {me.display_name}</h2>
          <p>You must present yourself to the Court.</p>
          <button style={{marginTop:'20px', background:'#b01423', color:'#fff', border:'none', padding:'10px 20px'}} onClick={()=>nav('/make')}>Create Character</button>
        </div>
      </div>
    );
  }

  // ✅ ROBUST LOGIC FOR BUTTON VISIBILITY
  const clan = (ch.clan || '').trim().toLowerCase();
  const isMalkavian = clan === 'malkavian';
  const isAdmin = me.role === 'admin';
  const showCobweb = isMalkavian || isAdmin;

  return (
    <main className={styles.homePage}>
      
      {/* SHATTER OVERLAY */}
      {isShattering && (
        <div
          className={shatterStyles.overlay}
          ref={overlayRef}
          style={{
            '--click-x': `${clickPoint?.x}px`,
            '--click-y': `${clickPoint?.y}px`,
          }}
        >
          <div className={shatterStyles.impact} />
          {shards.map((s, i) => (
            <div key={i} className={shatterStyles.shard} style={s.style}>
              <div className={shatterStyles.shape} style={{ clipPath: `polygon(${s.poly})` }} />
            </div>
          ))}
        </div>
      )}

      {/* 1. IDENTITY HEADER */}
      <header className={styles.identityHeader}>
        <div className={styles.idLeft}>
          <div className={styles.clanIconContainer}>
            <img src={symlogo(ch.clan)} alt="Clan" className={styles.clanSymbol} onError={e=>e.target.style.display='none'} />
          </div>
          <div className={styles.idInfo}>
            <h1>{ch.name}</h1>
            <p>{ch.clan || 'Caitiff'} <span className={styles.xpBadge}>{ch.xp ?? 0} XP</span></p>
          </div>
        </div>
        <div className={styles.idRight}>
          <img src={textlogo(ch.clan)} alt="Logo" className={styles.clanLogoText} onError={e=>e.target.style.display='none'}/>
        </div>
      </header>

      {fetchError && <div className={styles.errorCard}>{fetchError}</div>}
      

      {/* 2. TOP ROW: FEEDS */}
      <div className={styles.topFeeds}>
        
        {/* COL 1: NEWSPAPER */}
        <div className={styles.newspaper}>
          <header className={styles.paperHeader}>
            <h2 className={styles.paperName}>The Erebus Chronicle</h2>
            <span className={styles.paperDate}>{new Date().toLocaleDateString(undefined, {weekday:'long', day:'numeric', month:'long'})}</span>
          </header>
          {recentNews.length === 0 ? (
            <p style={{textAlign:'center', color:'#555', padding:'20px'}}>No headlines today.</p>
          ) : (
            <ul className={styles.headlineList}>
              {recentNews.map(item => (
                <li key={item.id} className={styles.headlineItem}>
                  <Link to="/news" className={styles.headlineLink}>
                    <span className={`${styles.outletBadge} ${styles['tag'+(item.theme || item.type).toUpperCase()]}`}>
                      {item.type === 'announcement' ? 'DECREE' : (item.theme || 'NEWS')}
                    </span>
                    <h3 className={styles.headlineTitle}>{item.title}</h3>
                    <span className={styles.headlineDate}>{formatTimestamp(item.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/news" className={styles.readMore}>Read Full Edition</Link>
        </div>

        {/* COL 2: CHAT LOG */}
        <div className={styles.logbook}>
          <div className={styles.logHeader}>
            <h3 className={styles.logTitle}><span className={styles.logIcon}>💬</span> Recent Whispers</h3>
            <Link to="/comms" style={{fontSize:'0.8rem', color:'#888', textDecoration:'none'}}>View All</Link>
          </div>
          <ul className={styles.logList}>
            {recentChats.length === 0 ? (
               <li style={{padding:'20px', color:'#666', textAlign:'center'}}>Silence...</li>
            ) : (
              recentChats.map(chat => (
                <li key={chat.id} className={styles.logItem}>
                  <Link to="/comms" className={styles.logLink}>
                    <div className={styles.logMeta}>
                      <span>
                        {chat.isNPC && <span style={{color:'#b8236b', marginRight:'5px'}}>[NPC]</span>}
                        <b>{chat.partnerName}</b>
                      </span>
                      <span>{formatTimestamp(chat.timestamp)}</span>
                    </div>
                    <span className={styles.logContent}>
                      "{(chat.lastMessage || '').substring(0, 50)}{(chat.lastMessage || '').length > 50 ? '...' : ''}"
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* COL 3: ACTION LOG */}
        <div className={styles.logbook}>
          <div className={styles.logHeader}>
            <h3 className={styles.logTitle}><span className={styles.logIcon}>📝</span> Action Log</h3>
            <Link to="/downtimes" style={{fontSize:'0.8rem', color:'#888', textDecoration:'none'}}>View All</Link>
          </div>
          <ul className={styles.logList}>
            {recentDowntimes.length === 0 ? (
               <li style={{padding:'20px', color:'#666', textAlign:'center'}}>No recent actions.</li>
            ) : (
              recentDowntimes.map(dt => (
                <li key={dt.id} className={styles.logItem}>
                  <Link to="/downtimes" className={styles.logLink}>
                    <div className={styles.logMeta}>
                      <span className={`${styles.statusBadge} ${styles['status'+dt.status]}`}>{dt.status}</span>
                      <span>{formatTimestamp(dt.created_at)}</span>
                    </div>
                    <span className={styles.logContent}>
                      {dt.title}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* 3. BOTTOM: NAV GRID */}
      <section className={styles.navSection}>
        <div className={styles.navGrid}>
          
          <Link to="/character" className={styles.navCard}>
            <div className={styles.navIcon}>👤</div>
            <div><div className={styles.navTitle}>Character</div><div className={styles.navSub}>Sheet & XP</div></div>
          </Link>

          <Link to="/downtimes" className={styles.navCard}>
            <div className={styles.navIcon}>🌑</div>
            <div><div className={styles.navTitle}>Downtimes</div><div className={styles.navSub}>{quota.used}/{quota.limit} Used</div></div>
          </Link>

          <Link to="/comms" className={styles.navCard}>
            <div className={styles.navIcon}>📨</div>
            <div><div className={styles.navTitle}>Comms</div><div className={styles.navSub}>Letters & Chat</div></div>
          </Link>

          
          {/* 👁️ PREMONITIONS (Malkavians/Admins Only) */}
          {showCobweb && (
            <a 
              href="/premonitions" 
              onClick={handlePremonitionClick} 
              className={styles.malkNavCard} 
              title="Enter the Cobweb"
            >
              <div className={styles.malkIcon}>👁️</div>
              <div>
                <div className={styles.malkTitle}>The Cobweb</div>
                <div className={styles.malkSub}>Visions & Whispers</div>
              </div>
            </a>
          )}

          <Link to="/domains" className={styles.navCard}>
            <div className={styles.navIcon}>🏰</div>
            <div><div className={styles.navTitle}>Domains</div><div className={styles.navSub}>Territory Map</div></div>
          </Link>

          

          <Link to="/boons" className={styles.navCard}>
            <div className={styles.navIcon}>⚖️</div>
            <div><div className={styles.navTitle}>Boons</div><div className={styles.navSub}>Registry</div></div>
          </Link>
          
          <Link to="/coteries" className={styles.navCard}>
            <div className={styles.navIcon}>🩸</div>
            <div><div className={styles.navTitle}>Coteries</div><div className={styles.navSub}>Manage Group</div></div>
          </Link>

          <Link to="/news" className={styles.navCard}>
            <div className={styles.navIcon}>🌍</div>
            <div><div className={styles.navTitle}>News</div><div className={styles.navSub}>Archive</div></div>
          </Link>


        </div>
      </section>

    </main>
  );
}