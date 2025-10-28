"use strict";

// /public/sw.js
self.addEventListener('install', function (e) {
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  self.clients.claim();
});
self.addEventListener('push', function (event) {
  var data = {};

  try {
    data = event.data.json();
  } catch (_unused) {}

  var title = data.title || 'New message';
  var body = data.body || '';
  var tag = data.data && data.data.tag || 'comms';
  var url = data.data && data.data.url || '/';
  event.waitUntil(self.registration.showNotification(title, {
    body: body,
    tag: tag
  }));
  self.addEventListener('notificationclick', function (e) {
    e.notification.close();
    e.waitUntil(clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function (list) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = list[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var c = _step.value;

          if ('focus' in c) {
            c.navigate(url);
            return c.focus();
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return clients.openWindow(url);
    }));
  });
});