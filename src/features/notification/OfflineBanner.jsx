// Tells the player when they are looking at the copy of their sheet saved on
// this device. The service worker (public/service-worker.js) posts
// 'sheet-offline' when it had to answer from its cache and 'sheet-live' once
// the network answers again; the browser's own offline/online events cover the
// rest. Venue wifi that is "connected" but has no internet only shows up through
// the worker's messages, which is why both are used.
import React, { useEffect, useState } from 'react';
import styles from '../../styles/OfflineBanner.module.css';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && navigator.onLine === false);
  const [savedCopy, setSavedCopy] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => { setOffline(false); setSavedCopy(false); };
    const onMessage = (e) => {
      if (e.data?.type === 'sheet-offline') { setSavedCopy(true); setOffline(true); }
      if (e.data?.type === 'sheet-live') { setSavedCopy(false); setOffline(false); }
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className={styles.banner} role="status">
      <span className="material-symbols-outlined" aria-hidden="true">cloud_off</span>
      <span>
        {savedCopy
          ? 'No connection. You are seeing the copy of your sheet saved on this device; changes will not save until you are back online.'
          : 'No connection. Pages you opened before are still available; nothing will save until you are back online.'}
      </span>
    </div>
  );
}
