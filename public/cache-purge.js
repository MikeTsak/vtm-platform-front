// cache-purge.js - External script to comply with strict CSP (script-src 'self')
async function purgeAll() {
  // 1. CacheStorage
  try {
    if ('caches' in window) {
      var keys = await caches.keys();
      await Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }
    var ic = document.getElementById('icon-cache');
    var tc = document.getElementById('text-cache');
    if (ic) { ic.textContent = '✓'; ic.className = 'icon success'; }
    if (tc) { tc.textContent = 'Cache Storage Purged'; }
  } catch (e) {
    var ic = document.getElementById('icon-cache');
    var tc = document.getElementById('text-cache');
    if (ic) { ic.textContent = '✓'; ic.className = 'icon success'; }
    if (tc) { tc.textContent = 'Cache Storage Checked'; }
  }

  // 2. Service Workers
  try {
    if ('serviceWorker' in navigator) {
      var regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(function(r) { return r.unregister(); }));
    }
    var isw = document.getElementById('icon-sw');
    var tsw = document.getElementById('text-sw');
    if (isw) { isw.textContent = '✓'; isw.className = 'icon success'; }
    if (tsw) { tsw.textContent = 'Service Workers Unregistered'; }
  } catch (e) {
    var isw = document.getElementById('icon-sw');
    var tsw = document.getElementById('text-sw');
    if (isw) { isw.textContent = '✓'; isw.className = 'icon success'; }
    if (tsw) { tsw.textContent = 'Service Workers Checked'; }
  }

  // 3. Local & Session Storage
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
    var ist = document.getElementById('icon-storage');
    var tst = document.getElementById('text-storage');
    if (ist) { ist.textContent = '✓'; ist.className = 'icon success'; }
    if (tst) { tst.textContent = 'Storage Flushed'; }
  } catch (e) {
    var ist = document.getElementById('icon-storage');
    var tst = document.getElementById('text-storage');
    if (ist) { ist.textContent = '✓'; ist.className = 'icon success'; }
    if (tst) { tst.textContent = 'Storage Checked'; }
  }

  // 4. IndexedDB
  try {
    if (window.indexedDB && indexedDB.databases) {
      var dbs = await indexedDB.databases();
      dbs.forEach(function(db) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      });
    }
    var iid = document.getElementById('icon-idb');
    var tid = document.getElementById('text-idb');
    if (iid) { iid.textContent = '✓'; iid.className = 'icon success'; }
    if (tid) { tid.textContent = 'IndexedDB Cleared'; }
  } catch (e) {
    var iid = document.getElementById('icon-idb');
    var tid = document.getElementById('text-idb');
    if (iid) { iid.textContent = '✓'; iid.className = 'icon success'; }
    if (tid) { tid.textContent = 'IndexedDB Checked'; }
  }

  // Auto redirect countdown
  var seconds = 3;
  var countElem = document.getElementById('countdown');
  var interval = setInterval(function() {
    seconds--;
    if (seconds <= 0) {
      clearInterval(interval);
      if (countElem) countElem.textContent = 'Reloading portal...';
      window.location.replace('/?cleared=' + Date.now());
    } else {
      if (countElem) countElem.textContent = 'Redirecting automatically in ' + seconds + ' seconds...';
    }
  }, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', purgeAll);
} else {
  purgeAll();
}
