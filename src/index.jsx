// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global/index.css';
import './bones/registry';
import App from './core/App';
import reportWebVitals from './reportWebVitals';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

const queryClient = new QueryClient();

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
