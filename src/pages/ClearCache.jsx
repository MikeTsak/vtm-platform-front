import React, { useEffect, useState } from 'react';

export default function ClearCache() {
  const [status, setStatus] = useState({
    cache: 'pending',
    sw: 'pending',
    storage: 'pending',
    idb: 'pending',
  });
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    async function purge() {
      // 1. CacheStorage
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        setStatus((s) => ({ ...s, cache: 'done' }));
      } catch (_) {
        setStatus((s) => ({ ...s, cache: 'done' }));
      }

      // 2. Service Workers
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        setStatus((s) => ({ ...s, sw: 'done' }));
      } catch (_) {
        setStatus((s) => ({ ...s, sw: 'done' }));
      }

      // 3. Storage
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
        setStatus((s) => ({ ...s, storage: 'done' }));
      } catch (_) {
        setStatus((s) => ({ ...s, storage: 'done' }));
      }

      // 4. IndexedDB
      try {
        if (window.indexedDB && indexedDB.databases) {
          const dbs = await indexedDB.databases();
          dbs.forEach((db) => {
            if (db.name) indexedDB.deleteDatabase(db.name);
          });
        }
        setStatus((s) => ({ ...s, idb: 'done' }));
      } catch (_) {
        setStatus((s) => ({ ...s, idb: 'done' }));
      }

      // Countdown redirect
      let count = 3;
      const timer = setInterval(() => {
        count -= 1;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(timer);
          window.location.replace('/?cleared=' + Date.now());
        }
      }, 1000);
    }

    purge();
  }, []);

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: '#191818',
          border: '1px solid #381a1e',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(138, 15, 26, 0.2)',
          borderRadius: '12px',
          maxWidth: '480px',
          width: '100%',
          padding: '36px 28px',
          textAlign: 'center',
          color: '#e5e2e1',
        }}
      >
        <img
          src="/img/ATT-logo(1).webp"
          alt="ATT Logo"
          style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 16px',
            display: 'block',
            filter: 'drop-shadow(0 0 12px rgba(180, 15, 31, 0.4))',
          }}
        />
        <h1
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: '1.6rem',
            color: '#ffb3ae',
            letterSpacing: '0.5px',
            marginBottom: '8px',
          }}
        >
          Purging Portal Cache
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#a39e9e', marginBottom: '24px', lineHeight: 1.5 }}>
          Clearing stored client assets, service workers, and local data...
        </p>

        <div
          style={{
            background: '#121212',
            border: '1px solid #282727',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left',
            fontSize: '0.88rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid #1c1c1c' }}>
            <span>{status.cache === 'done' ? '✓' : '⏳'}</span>
            <span>{status.cache === 'done' ? 'Cache Storage Purged' : 'Purging Cache Storage...'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid #1c1c1c' }}>
            <span>{status.sw === 'done' ? '✓' : '⏳'}</span>
            <span>{status.sw === 'done' ? 'Service Workers Unregistered' : 'Unregistering Service Workers...'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid #1c1c1c' }}>
            <span>{status.storage === 'done' ? '✓' : '⏳'}</span>
            <span>{status.storage === 'done' ? 'Storage Flushed' : 'Flushing Session & Local Storage...'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
            <span>{status.idb === 'done' ? '✓' : '⏳'}</span>
            <span>{status.idb === 'done' ? 'IndexedDB Cleared' : 'Clearing IndexedDB Databases...'}</span>
          </div>
        </div>

        <a
          href="/?cleared=now"
          style={{
            background: '#8a0f1a',
            color: '#fff',
            border: '1px solid #b40f1f',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-block',
            width: '100%',
            boxShadow: '0 4px 14px rgba(138, 15, 26, 0.4)',
          }}
        >
          Enter the Court Now
        </a>
        <div style={{ marginTop: '14px', fontSize: '0.82rem', color: '#7d7878' }}>
          {countdown > 0 ? `Redirecting automatically in ${countdown} seconds...` : 'Reloading portal...'}
        </div>
      </div>
    </div>
  );
}
