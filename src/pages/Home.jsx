import React, { useEffect, useState, useMemo } from 'react';
import api from '../api';
import { Link, useNavigate } from 'react-router-dom';
import styles from '../styles/Home.module.css'; // ⬅️ use the module

/* Optional tinting by clan (reuse palettes from builder, lighter variant) */
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

// Asset helpers (works with your existing file scheme)
const NAME_OVERRIDES = { 'The Ministry': 'Ministry', 'Banu Haqim': 'Banu_Haqim' };
const symlogo = (c) => (c ? `/img/clans/330px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g, '_')}_symbol.png` : '');
const textlogo = (c) => (c ? `/img/clans/text/300px-${(NAME_OVERRIDES[c] || c).replace(/\s+/g, '_')}_Logo.png` : '');

export default function Home() {
  const [me, setMe] = useState(null);
  const [ch, setCh] = useState(null);
  const [quota, setQuota] = useState({ used: 0, limit: 3 });
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: meData } = await api.get('/auth/me');
      setMe(meData.user);
      const { data: chData } = await api.get('/characters/me');
      setCh(chData.character);
      if (chData.character) {
        const { data: q } = await api.get('/downtimes/quota');
        setQuota(q);
      }
    })()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tint = useMemo(() => (ch ? CLAN_COLORS[ch.clan] || '#8a0f1a' : '#8a0f1a'), [ch]);

  if (loading || !me) return null;

  // --- No character state (call to action) ---
  if (!ch) {
    return (
      <div className={styles.homePage}>
        <div className={styles.skyline} style={{ '--tint': tint }} />
        <div className={styles.card}>
          <div className={styles.heroHead}>
            <img src="/img/ATT-logo(1).png" alt="ATT LARP" className={styles.logo} />
            <h2 className={styles.title}>Welcome, {me.display_name}</h2>
          </div>
          <p className={styles.sub}>You need to create a character to enter the Court.</p>
          <button className={styles.cta} onClick={() => nav('/make')}>Begin Character Setup</button>
        </div>
      </div>
    );
  }

  // --- Has character state (dashboard) ---
  return (
    <div className={styles.homePage}>
      <div className={styles.skyline} style={{ '--tint': tint }} />
      <header className={styles.card}>
        <div className={styles.identity}>
          <div className={styles.clanBadge}>
            <img src={symlogo(ch.clan)} alt={`${ch.clan} symbol`} />
          </div>
          <div className={styles.idText}>
            <h2 className={styles.title}>Hello, {me.display_name}</h2>
            <p className={styles.sub}>
              Active Character: <b>{ch.name}</b> ({ch.clan}) — XP: <b>{ch.xp ?? 0}</b>
            </p>
            <div className={styles.textLogo}>
              <img src={textlogo(ch.clan)} alt={`${ch.clan} logo`} />
            </div>
          </div>
        </div>
      </header>

      <main className={styles.grid}>
        <Link className={styles.cardLink} to="/character">
          <div className={styles.cardTitle}>Character</div>
          <div className={styles.cardSub}>View & spend XP</div>
        </Link>

        <Link className={styles.cardLink} to="/domains">
          <div className={styles.cardTitle}>Domains</div>
          <div className={styles.cardSub}>Territory & influence</div>
        </Link>

        <Link className={styles.cardLink} to="/downtimes">
          <div className={styles.cardTitle}>Downtimes</div>
          <div className={styles.cardSub}>
            {quota.used}/{quota.limit} this month
          </div>
        </Link>

        <Link className={styles.cardLink} to="/comms">
          <div className={styles.cardTitle}>Communications</div>
          <div className={styles.cardSub}>Letters, rumors & court</div>
        </Link>
      </main>
    </div>
  );
}
