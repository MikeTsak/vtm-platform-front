// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global/index.css';
import './bones/registry';
import App from './core/App';
import reportWebVitals from './reportWebVitals';
import { shouldReloadForChunkFailure } from './utils/lazyWithRetry';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

const queryClient = new QueryClient();

// lazyWithRetry (see that file) already reloads once when a top-level
// route's own dynamic import() rejects after a new deploy. But a route can
// also depend on a CHUNK SHARED with another route (e.g. Admin -> AdminNewsTab
// -> CreateNewsModal all pull in the same constants module that News.jsx
// also imports, so Vite splits it into its own hashed chunk). A stale tab
// still holding the previous build's JS in memory references that chunk's
// old hash, which the new deploy no longer serves (404) — and Vite reports
// THAT failure via this global 'vite:preloadError' event rather than
// rejecting the route's own import() promise, so lazyWithRetry's try/catch
// never sees it. Without this listener it surfaces as a bare uncaught error
// and the app renders blank. Reuses the same cooldown so a genuinely broken
// chunk doesn't reload forever.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  if (shouldReloadForChunkFailure(window.sessionStorage)) {
    window.location.reload();
  }
});

// 🔧 Register Service Worker for PWA
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/service-worker.js');
    } catch (e) {
      console.warn('Service worker registration failed:', e);
    }
  }
}

(async () => {
  await registerServiceWorker();

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </React.StrictMode>
  );

  reportWebVitals();
})();
