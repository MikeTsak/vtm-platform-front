// src/utils/coalesce.js
//
// Merge a burst of calls into one run: the first call runs `fn` after `delay`
// ms, calls made meanwhile join it, and runs are at least `gap` ms apart (a
// call during the gap is held and runs once at its end, so the last state is
// never missed). Used where server pushes and reconnects can fire many times a
// second: every one of them used to refetch on every open page (2026-11-04).

/**
 * @param {() => void} fn
 * @param {{ delay?: number, gap?: number }} [opts]
 * @returns {(() => void) & { cancel: () => void }}
 */
export function coalesce(fn, { delay = 300, gap = 2000 } = {}) {
  let timer = null;
  let last = -Infinity;
  const call = () => {
    if (timer) return;
    const wait = Math.max(delay, last + gap - Date.now());
    timer = setTimeout(() => {
      timer = null;
      last = Date.now();
      fn();
    }, wait);
  };
  call.cancel = () => { clearTimeout(timer); timer = null; };
  return call;
}
