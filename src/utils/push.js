import api from '../core/api';

/**
 * Utility for Web Push API integration
 */

// Utility to convert Base64 URL to Uint8Array for VAPID keys
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Explains why push isn't available on this device, or null if it is.
// iOS Safari only exposes the Push/Notification APIs to a site once it's
// been added to the Home Screen — a regular Safari tab has neither, which
// is why enabling push there does nothing instead of erroring.
export function getPushUnsupportedReason() {
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isIOS && !isStandalone) {
    return 'On iPhone/iPad, notifications only work after adding this site to your Home Screen: tap the Share icon in Safari, choose "Add to Home Screen", then open the app from there.';
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'This browser does not support push notifications. Try a recent version of Chrome, Firefox, Edge, or Safari 16+.';
  }
  return null;
}

export async function subscribeToWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push messaging is not supported in this browser.');
  }

  // Ask for permission
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await new Promise((resolve) => {
      const result = Notification.requestPermission(resolve);
      if (result) {
        result.then(resolve);
      }
    });
  }

  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted. Please check your browser site settings and allow notifications.');
  }

  // Register the service worker
  const registration = await navigator.serviceWorker.register('/service-worker.js', {
    scope: '/'
  });

  // Wait for the service worker to be ready
  await navigator.serviceWorker.ready;

  // Get the VAPID Public Key from the server
  const vapidRes = await api.get('/push/vapidPublicKey');
  const applicationServerKey = urlBase64ToUint8Array(vapidRes.data.publicKey);

  // Subscribe to push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey
  });

  // Send the subscription to our server
  await api.post('/push/web-subscribe', { subscription });
  
  return subscription;
}

export async function getPushSettings() {
  const { data } = await api.get('/push/settings');
  return data;
}

export async function updatePushSettings(settings) {
  await api.put('/push/settings', { settings });
}
