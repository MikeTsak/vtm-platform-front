// src/utils/lazyWithRetry.js
//
// A route's lazy-loaded JS chunk (and, once per-route CSS code-splitting is
// enabled, its CSS chunk too) is fetched by filename hash. The moment a new
// build is deployed, the old build's chunk files are gone — anyone who still
// has the previous index.html open in a tab, and then navigates to a route
// they haven't visited yet this session, gets a 404 on that dynamic import.
// Vite's import() rejects, nothing catches it, and the user sees a blank
// screen with no way forward except knowing to hit refresh themselves.
//
// This wraps React.lazy() so that failure triggers exactly one automatic
// reload instead: the fresh index.html it fetches points at the new build's
// chunks, so the retried navigation succeeds. A short cooldown (rather than
// a single per-session flag) means a genuinely broken chunk doesn't cause a
// disruptive reload loop, while still allowing a fresh retry for a *later*,
// unrelated deploy later in the same session.
import React from 'react';

const RELOAD_COOLDOWN_MS = 10_000;
const STORAGE_KEY = 'chunk-load-reload-at';

/**
 * Decides whether a chunk-load failure should trigger a reload right now,
 * and records that a reload is about to happen. Pure decision logic kept
 * separate from React.lazy/window so it's testable without a DOM.
 * @param {Storage} storage sessionStorage (or a stand-in for tests)
 * @param {number} now Date.now()
 * @returns {boolean} true if the caller should reload now
 */
export function shouldReloadForChunkFailure(storage, now = Date.now()) {
  let lastReload = 0;
  try {
    lastReload = Number(storage.getItem(STORAGE_KEY)) || 0;
  } catch {
    // Storage unavailable (private mode, etc.) — treat as "no recent reload".
  }

  if (now - lastReload <= RELOAD_COOLDOWN_MS) return false;

  try {
    storage.setItem(STORAGE_KEY, String(now));
  } catch {
    /* non-fatal */
  }
  return true;
}

export function lazyWithRetry(importer) {
  return React.lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      if (shouldReloadForChunkFailure(window.sessionStorage)) {
        window.location.reload();
        // Never resolve — the page is navigating away, nothing should render.
        return new Promise(() => {});
      }
      // Already reloaded once recently and it's still failing — a real
      // error (bad network, genuinely missing file), not a stale deploy.
      // Let it surface normally instead of reloading forever.
      throw error;
    }
  });
}

export default lazyWithRetry;
