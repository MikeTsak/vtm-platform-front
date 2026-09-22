// Installs the new version as soon as it's fetched (rather than waiting for
// every open tab to close first) and takes control of already-open pages
// right away, so a deployed update — like this one — actually reaches
// people without them having to fully quit the browser first.
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      // data.icon is the sender's avatar/crest URL, set server-side in
      // services/push.js. Falls back to the generic app icon when a
      // notification has no specific sender (system-level pushes, etc).
      icon: data.icon || '/img/icon-192.png',
      badge: '/img/favicon-32.png',
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      let matchingClient = null;

      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i];
        if (windowClient.url.includes(urlToOpen)) {
          matchingClient = windowClient;
          break;
        }
      }

      if (matchingClient) {
        return matchingClient.focus();
      } else {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

