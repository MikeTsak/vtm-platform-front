// analytics-init.js
//
// Consent Mode + GA4 + Microsoft Clarity bootstrap, extracted from index.html.
//
// WHY THIS FILE EXISTS: the SPA is served as a static build (see .htaccess),
// so it ships a strict Content-Security-Policy with NO 'unsafe-inline' in
// script-src (nonces/hashes aren't viable on a static host — see .htaccess
// comments). That means index.html cannot contain inline <script> blocks;
// everything has to live in an external, same-origin file like this one.
//
// Load order matters: index.html loads this file as a normal blocking
// <script> BEFORE the async gtag.js / adsbygoogle.js tags, so Consent Mode
// defaults are registered before those libraries do anything.

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
gtag('js', new Date());
gtag('config', 'G-Z7VCE9MCPT');

// Microsoft Clarity.
(function (c, l, a, r, i) {
  c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
  var t = l.createElement(r);
  t.async = 1;
  t.src = 'https://www.clarity.ms/tag/' + i;
  var y = l.getElementsByTagName(r)[0];
  y.parentNode.insertBefore(t, y);
})(window, document, 'clarity', 'script', 'xk8cqym8o2');
