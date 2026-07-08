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
