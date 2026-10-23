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

// Every push must show a notification, even a malformed one: Chrome otherwise
// shows its own "site updated in the background" notice, and Safari revokes
// the subscription after a few pushes that show nothing.
self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data.text() };
  }
  const options = {
    body: data.body || '',
    // data.icon is the sender's avatar/crest URL, set server-side in
    // services/push.js. Falls back to the generic app icon when a
    // notification has no specific sender (system-level pushes, etc).
    // Safari (macOS and iOS) ignores icon and always shows the app icon.
    icon: data.icon || '/img/icon-192.png',
    // Android's status-bar icon: drawn as a white silhouette of the alpha
    // channel, so it must be a transparent monochrome image.
    badge: '/img/badge-96.png',
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Erebus Portal', options)
  );
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
      }
      // The app is already open on another page (e.g. the installed PWA):
      // take that window there instead of opening a second one. navigate()
      // only works on windows this worker controls, hence the fallback.
      if (windowClients.length) {
        return windowClients[0].focus()
          .then(function(client) { return client.navigate(urlToOpen); })
          .catch(function() { return clients.openWindow(urlToOpen); });
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

