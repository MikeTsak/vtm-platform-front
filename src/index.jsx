// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global/index.css';
import './bones/registry';
import App from './core/App';
import reportWebVitals from './reportWebVitals';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

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
        <GoogleReCaptchaProvider reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}>
          <App />
        </GoogleReCaptchaProvider>
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </React.StrictMode>
  );

  reportWebVitals();
})();
