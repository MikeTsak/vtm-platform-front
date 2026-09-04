// analytics-init.js
//
// Consent Mode + GA4 bootstrap, extracted from index.html.
//
// WHY THIS FILE EXISTS: the SPA is served as a static build (see .htaccess),
// so it ships a strict Content-Security-Policy with NO 'unsafe-inline' in
// script-src (nonces/hashes aren't viable on a static host — see .htaccess
// comments). That means index.html cannot contain inline <script> blocks;
// everything has to live in an external, same-origin file like this one.
//
// Load order matters: index.html loads this file as a normal blocking
// <script> BEFORE the async gtag.js tag, so Consent Mode defaults are
// registered before that library does anything.
//
// GDPR: Microsoft Clarity has no Consent Mode equivalent (no default-denied
// state — loading it starts session recording immediately), so it is NOT
// started here. window.__loadClarity below is exposed for
// src/utils/consentGatedScripts.js to call, but ONLY after
// CookieConsent.jsx confirms the visitor actually granted consent.

window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
window.gtag = gtag;

// Google Consent Mode v2 — deny by default until the cookie banner grants consent.
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
});

// Google Analytics 4 (the gtag.js library itself is loaded async from index.html).
// Safe to run unconditionally: Consent Mode means no cookies are set and no
// personal data is processed until consent is granted (see index.html).
gtag('js', new Date());
gtag('config', 'G-Z7VCE9MCPT');

// Microsoft Clarity — idempotent, NOT auto-invoked. Only called from
// src/utils/consentGatedScripts.js once the visitor has granted consent.
window.__loadClarity = function () {
  if (window.clarity) return; // already loaded
  (function (c, l, a, r, i) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    var t = l.createElement(r);
    t.async = 1;
    t.src = 'https://www.clarity.ms/tag/' + i;
    var y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', 'xk8cqym8o2');
};

// Vite CSS-preload safety net — Vite's __vitePreload sets crossOrigin=""
// on dynamically injected <link rel="stylesheet"> elements. If the server
// doesn't return the right CORS headers (or an extension intercepts the
// request), the browser fires onerror and Vite dispatches this cancelable
// event. If no listener calls preventDefault(), Vite re-throws the error
// as an uncaught exception — killing the entire React tree and producing a
// blank screen. Calling preventDefault() lets the page continue; the CSS
// chunk usually still loads via the normal non-CORS path, so styles render
// fine. As a recovery measure, we also reload once (same cooldown logic as
// lazyWithRetry) in case a genuinely missing file causes a stale-deploy.
window.addEventListener('vite:preloadError', function (e) {
  e.preventDefault();                  // stop Vite from throwing

  var key = 'css-preload-reload-at';
  var now = Date.now();
  var last = 0;
  try { last = Number(sessionStorage.getItem(key)) || 0; } catch (_) {}
  if (now - last > 10000) {
    try { sessionStorage.setItem(key, String(now)); } catch (_) {}
    window.location.reload();
  }
  // else: already reloaded recently — swallow silently, the page continues.
});
