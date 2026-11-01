// Installs the new version as soon as it's fetched (rather than waiting for
// every open tab to close first) and takes control of already-open pages
// right away, so a deployed update — like this one — actually reaches
// people without them having to fully quit the browser first.
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop caches from older versions of this worker (bump the -vN below to reset).
    const keep = [STATIC_CACHE, SHEET_CACHE];
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('erebus-') && !keep.includes(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

// ---------------------------------------------------------------------------
// Offline character sheet
// ---------------------------------------------------------------------------
// Venues have bad signal. So that a player can still open their sheet:
//  - page navigations: network first, falling back to the last index.html
//    (network first, so a deploy still reaches everyone immediately)
//  - built assets (/assets/*, hashed and immutable) and /img/*: cache first,
//    filled as the player browses (no precache list: the sheet works offline
//    once it has been opened online at least once)
//  - the player's OWN sheet data (SHEET_API below): network first, the saved
//    copy only when the network fails outright. An HTTP error (401 after a
//    logout elsewhere, 403...) is passed through, never masked by the cache.
// The sheet cache holds personal data: the app deletes it on logout and on
// login (src/core/AuthContext.jsx), and the cache-clearing pages wipe everything.
// Pages are told when they are seeing saved data (OfflineBanner listens).
const STATIC_CACHE = 'erebus-static-v1';
const SHEET_CACHE = 'erebus-sheet-v1';
const STATIC_MAX = 400; // ponytail: FIFO cap, old deploys' chunks age out; LRU if it ever matters

const SHEET_API = [
  /^\/api\/auth\/me$/,
  /^\/api\/characters\/(me|mine)$/,
  /^\/api\/characters\/me\/wishlist$/,
  /^\/api\/characters\/discipline-(access|requests)$/,
  /^\/api\/characters\/\d+\/(inventory|retainers|coterie-retainers)$/,
  /^\/api\/downtimes\/quota$/,
];

async function tell(clientId, type) {
  const client = clientId && await self.clients.get(clientId);
  if (client) client.postMessage({ type });
}

async function putCapped(cacheName, request, response, max) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  if (max) {
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
  }
}

async function networkFirstSheet(event) {
  try {
    const res = await fetch(event.request);
    if (res.ok) {
      event.waitUntil(putCapped(SHEET_CACHE, event.request, res.clone()));
      event.waitUntil(tell(event.clientId, 'sheet-live'));
    }
    return res;
  } catch (err) {
    const cached = await caches.match(event.request, { cacheName: SHEET_CACHE });
    if (!cached) throw err;
    event.waitUntil(tell(event.clientId, 'sheet-offline'));
    return cached;
  }
}

async function cacheFirstStatic(event) {
  const cached = await caches.match(event.request, { cacheName: STATIC_CACHE });
  if (cached) return cached;
  const res = await fetch(event.request);
  if (res.ok) event.waitUntil(putCapped(STATIC_CACHE, event.request, res.clone(), STATIC_MAX));
  return res;
}

async function networkFirstPage(event) {
  try {
    const res = await fetch(event.request);
    if (res.ok) event.waitUntil(putCapped(STATIC_CACHE, '/index.html', res.clone()));
    return res;
  } catch (err) {
    const shell = await caches.match('/index.html', { cacheName: STATIC_CACHE });
    if (!shell) throw err;
    return shell;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (req.mode === 'navigate' && sameOrigin) {
    // Static pages served as files (cache purge, ad frame) are not the app shell.
    if (/\.html$/.test(url.pathname) && url.pathname !== '/index.html') return;
    event.respondWith(networkFirstPage(event));
  } else if (sameOrigin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/img/'))) {
    event.respondWith(cacheFirstStatic(event));
  } else if (SHEET_API.some((re) => re.test(url.pathname))) {
    event.respondWith(networkFirstSheet(event));
  }
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

