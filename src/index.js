// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 🔧 Hard-kill any service workers and clear their caches BEFORE rendering
async function purgeSWAndCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (reg) => {
          try { await reg.unregister(); } catch {}
          // Try to stop any active worker immediately
          if (reg.active) { try { await reg.active.postMessage({ type: 'SKIP_WAITING' }); } catch {} }
        })
      );
    }
    if (window.caches?.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    // Extra safety: clear HTTP cache if supported (Chrome)
    if ('storage' in navigator && navigator.storage?.estimate) {
      // no-op here; just capability check. Real HTTP cache clear isn't exposed.
    }
    // Small delay gives the browser a moment to drop old workers/caches
    await new Promise((r) => setTimeout(r, 50));
  } catch (e) {
    // Don't block the app if something goes wrong
    // console.warn('SW/cache purge skipped:', e);
  }
}

(async () => {
  await purgeSWAndCaches();

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  reportWebVitals();
})();
