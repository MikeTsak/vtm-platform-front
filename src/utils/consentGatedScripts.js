// src/utils/consentGatedScripts.js
//
// Loads third-party trackers that have no "consent mode" of their own —
// unlike GA4 (see public/analytics-init.js, which implements Google Consent
// Mode v2 and is safe to load unconditionally), AdSense and Microsoft
// Clarity start collecting the moment their script executes. So neither one
// is referenced in index.html at all; both are only loaded from here, and
// only once CookieConsent.jsx has confirmed the visitor actually granted
// consent (on this visit, or a stored 'granted' from a previous one).
//
// Both loaders are idempotent — safe to call every time consent is
// (re-)confirmed without double-injecting a script tag.

const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2086654176767394';

export function loadAdSense() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`script[src="${ADSENSE_SRC}"]`)) return; // already injected

  const script = document.createElement('script');
  script.async = true;
  script.src = ADSENSE_SRC;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

export function loadClarity() {
  if (typeof window === 'undefined') return;
  if (typeof window.__loadClarity === 'function') {
    window.__loadClarity();
  }
}

/** Call once consent has been confirmed granted — starts every consent-gated tracker. */
export function loadConsentGatedScripts() {
  loadAdSense();
  loadClarity();
}
