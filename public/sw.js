// /public/sw.js
self.addEventListener('install', (e) => { 
  self.skipWaiting(); 
});

self.addEventListener('activate', (e) => { 
  e.waitUntil(self.clients.claim()); 
});

// 1. Handle the incoming Push Event
self.addEventListener('push', (event) => {
  let payload = {};
  try { 
    payload = event.data.json(); 
  } catch (err) {
    console.warn('Push payload was not JSON');
  }

  const title = payload.title || 'New message';
  const body  = payload.body || '';
  const tag   = (payload.data && payload.data.tag) || 'comms';
  const url   = (payload.data && payload.data.url) || '/';

  event.waitUntil(
    self.registration.showNotification(title, { 
      body, 
      tag,
      // IMPORTANT: Store the URL in the notification's data payload
      // so the click handler can access it later.
      data: { url } 
    })
  );
});

// 2. Handle the Notification Click Event (OUTSIDE the push event)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Retrieve the URL we saved during the push event
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if the app is already open in a tab
      for (const client of windowClients) {
        // If it is open, just focus that tab and optionally navigate it
        if ('focus' in client) {
          // If you want it to strictly navigate to the specific chat:
          client.navigate(urlToOpen); 
          return client.focus(); 
        }
      }
      // If the app is fully closed, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});