// src/pages/Home.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import { Link, useNavigate } from 'react-router-dom';
import styles from '../styles/Home.module.css';

/* Clan Lookups */
const CLAN_COLORS = {
  Brujah: '#b40f1f', Gangrel: '#2f7a3a', Malkavian: '#713c8b', Nosferatu: '#6a4b2b',
  Toreador: '#b8236b', Tremere: '#7b1113', Ventrue: '#1b4c8c', 'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b', Lasombra: '#191a5a', 'The Ministry': '#865f12',
  Caitiff: '#636363', 'Thin-blood': '#6e6e2b',
};
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const fileify = (c) => (NAME_OVERRIDES[c] || c).replace(/\s+/g, '_');
const symlogo = (c) => (c ? `/img/clans/330px-${fileify(c)}_symbol.png` : '');
const textlogo = (c) => (c ? `/img/clans/text/300px-${fileify(c)}_Logo.png` : '');

// --- Helper: Format Timestamp (Relative Time) ---
const formatTimestamp = (ts) => {
  if (!ts) return '';
  const date = new Date(ts);
  const now = new Date();
  if (isNaN(date.getTime())) return 'Invalid date';

  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return `Yesterday`;
  if (diffDays < 7) return `${diffDays}d ago`;
  try {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return date.toLocaleDateString();
  }
};

export default function Home() {
  const [me, setMe] = useState(null);
  const [ch, setCh] = useState(null);
  const [quota, setQuota] = useState({ used: 0, limit: 3 });
  const [loading, setLoading] = useState(true);
  const [recentDowntimes, setRecentDowntimes] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    let isMounted = true;

    const fetchData = async () => {
      try {
        // 1) Who am I?
        const { data: meData } = await api.get('/auth/me');
        if (!isMounted) return;
        setMe(meData.user);

        // If admin, bounce to /admin immediately
        if (meData.user?.role === 'admin') {
          nav('/admin');
          return;
        }

        // 2) My character
        const { data: chData } = await api.get('/characters/me');
        if (!isMounted) return;
        setCh(chData.character);

        // 3) Related data only if a character exists
        if (chData.character) {
          const [quotaRes, downtimesRes, chatsRes] = await Promise.allSettled([
            api.get('/downtimes/quota'),
            api.get('/downtimes/mine'),
            api.get('/chat/my-recent', { params: { limit: 3 } }),
          ]);

          if (!isMounted) return;

          if (quotaRes.status === 'fulfilled') {
            setQuota(quotaRes.value.data);
          } else {
            console.error('Failed to fetch quota:', quotaRes.reason);
          }

          if (downtimesRes.status === 'fulfilled') {
            const dts = (downtimesRes.value.data?.downtimes || [])
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setRecentDowntimes(dts.slice(0, 5));
          } else {
            console.error('Failed to fetch downtimes:', downtimesRes.reason);
            setFetchError('Could not load recent activity.');
          }

          if (chatsRes.status === 'fulfilled') {
            setRecentChats(chatsRes.value.data?.conversations || []);
          } else {
            console.error('Failed to fetch recent chats:', chatsRes.reason);
            // Non-fatal: just leave chats empty
          }
        }
      } catch (error) {
        console.error('Failed to load home data:', error);
        if (isMounted) {
          setFetchError(
            error.response?.status === 401
              ? 'Authentication error. Please log in again.'
              : 'Failed to load portal data.'
          );
          if (error.response?.status === 401) {
            setMe(null);
            setCh(null);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [nav]);

  // Loading
  if (loading) return <div className={styles.loadingScreen}>Loading Portal...</div>;

  // Fatal error on initial load
  if (fetchError && !me) {
    return <div className={styles.loadingScreen}>{fetchError}</div>;
  }

  // Not logged in
  if (!me) {
    return <div className={styles.loadingScreen}>Please log in to access the portal.</div>;
  }

  // No character yet
  if (!ch) {
    return (
      <div className={styles.homePage}>
        <div className={styles.card}>
          <img src="/img/ATT-logo(1).png" alt="ATT LARP" className={styles.logo} />
          <div>
            <h2 className={styles.title}>Welcome, {me.display_name}</h2>
            <p className={styles.sub}>You need to create a character to enter the Court.</p>
          </div>
          <button className={styles.cta} onClick={() => nav('/make')}>
            Begin Character Setup
          </button>
        </div>
      </div>
    );
  }

  // Character exists
  return (
    <main className={styles.homePage}>
      <header className={`${styles.card} ${styles.animatedItem}`} style={{ animationDelay: '0.1s' }}>
        <img src="/img/ATT-logo(1).png" alt="ATT LARP" className={styles.logo} />
        <div className={styles.identity}>
          <div className={styles.clanBadge}>
            <img
              src={symlogo(ch.clan)}
              alt={`${ch.clan || 'Clan'} symbol`}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div className={styles.idText}>
            <h2 className={styles.title}>Welcome, {me.display_name}</h2>
            <p className={styles.sub}>
              Active Character: <b>{ch.name}</b> ({ch.clan || 'Unknown'}) — XP: <b>{ch.xp ?? 0}</b>
            </p>
            <div className={styles.textLogo}>
              <img
                src={textlogo(ch.clan)}
                alt={`${ch.clan || ''} logo`}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>
      </header>

      {fetchError && <div className={`${styles.card} ${styles.errorCard}`}>{fetchError}</div>}

      <div className={styles.grid}>
        <Link className={`${styles.cardLink} ${styles.animatedItem}`} style={{ animationDelay: '0.2s' }} to="/character">
          <div className={styles.cardTitle}>Character</div>
          <div className={styles.cardSub}>View & spend XP</div>
        </Link>
        <Link className={`${styles.cardLink} ${styles.animatedItem}`} style={{ animationDelay: '0.25s' }} to="/domains">
          <div className={styles.cardTitle}>Domains</div>
          <div className={styles.cardSub}>Territory & influence</div>
        </Link>
        <Link className={`${styles.cardLink} ${styles.animatedItem}`} style={{ animationDelay: '0.3s' }} to="/downtimes">
          <div className={styles.cardTitle}>Downtimes</div>
          <div className={styles.cardSub}>
            {quota.used}/{quota.limit} this month
          </div>
        </Link>
        <Link className={`${styles.cardLink} ${styles.animatedItem}`} style={{ animationDelay: '0.35s' }} to="/boons">
          <div className={styles.cardTitle}>Boons</div>
          <div className={styles.cardSub}>View boon registry</div>
        </Link>
        <Link className={`${styles.cardLink} ${styles.animatedItem}`} style={{ animationDelay: '0.4s' }} to="/coteries">
          <div className={styles.cardTitle}>Coteries</div>
          <div className={styles.cardSub}>View coterie registry</div>
        </Link>
        <Link className={`${styles.cardLink} ${styles.animatedItem}`} style={{ animationDelay: '0.45s' }} to="/comms">
          <div className={styles.cardTitle}>Communications</div>
          <div className={styles.cardSub}>Letters, rumors & court</div>
        </Link>
      </div>

      <div className={styles.feedGrid}>
        {/* Recent Activity */}
        <section className={`${styles.activityCard} ${styles.animatedItem}`} style={{ animationDelay: '0.5s' }}>
          <h3 className={styles.feedTitle}>Recent Activity</h3>
          {recentDowntimes.length === 0 && !fetchError && (
            <p className={styles.muted}>No recent downtime activity.</p>
          )}
          {recentDowntimes.length === 0 && fetchError && (
            <p className={styles.muted}>{fetchError}</p>
          )}
          {recentDowntimes.length > 0 && (
            <ul className={styles.feedList}>
              {recentDowntimes.map((dt, index) => (
                <li key={dt.id} className={styles.feedItem} style={{ animationDelay: `${0.55 + index * 0.05}s` }}>
                  <Link to="/downtimes" className={styles.feedLink}>
                    <span className={styles.feedText}>
                      Downtime: "{dt.title}" <span className={`${styles.statusBadge} ${styles['status' + dt.status]}`}>({dt.status})</span>
                    </span>
                    <span className={styles.feedTime}>{formatTimestamp(dt.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Chats */}
        <section className={`${styles.chatsCard} ${styles.animatedItem}`} style={{ animationDelay: '0.55s' }}>
          <h3 className={styles.feedTitle}>Recent Chats</h3>
          {recentChats.length === 0 ? (
            <p className={styles.muted}>No recent chats.</p>
          ) : (
            <ul className={styles.feedList}>
              {recentChats.map((chat, index) => (
                <li key={chat.id} className={styles.feedItem} style={{ animationDelay: `${0.6 + index * 0.05}s` }}>
                  <Link to="/comms" className={styles.feedLink}>
                    <span className={styles.feedText}>
                      {chat.isNPC ? '[NPC] ' : ''}
                      Chat with <b>{chat.partnerName}</b>: <i>"{(chat.lastMessage || '').length > 50 ? chat.lastMessage.substring(0, 47) + '…' : (chat.lastMessage || '')}"</i>
                    </span>
                    <span className={styles.feedTime}>{formatTimestamp(chat.timestamp)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
