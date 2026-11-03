// Run: ../back/node_modules/.bin/vitest run --root . src/utils/lazyWithRetry.test.js  (front has no test runner of its own)
import { describe, it, expect, vi } from 'vitest';
import { onPreloadError } from './lazyWithRetry';

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};

// Vite 6's preload helper, as shipped in the vendor bundle: a failed chunk
// dispatches 'vite:preloadError' and is re-thrown UNLESS a listener prevented it,
// in which case the import resolves with undefined.
function vitePreload(target, importer) {
  const handle = (err) => {
    const e = new Event('vite:preloadError', { cancelable: true });
    e.payload = err;
    target.dispatchEvent(e);
    if (!e.defaultPrevented) throw err;
  };
  return Promise.resolve().then(() => importer().catch(handle));
}

const setup = () => {
  const target = new EventTarget();
  const storage = memoryStorage();
  const reload = vi.fn();
  target.addEventListener('vite:preloadError', (e) => onPreloadError(e, storage, reload));
  return { target, reload };
};
const failingChunk = () => Promise.reject(new Error('Failed to fetch dynamically imported module'));

describe('vite:preloadError', () => {
  it('reloads on the first failed chunk', async () => {
    const { target, reload } = setup();
    vitePreload(target, failingChunk);
    await new Promise((r) => setTimeout(r, 0));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('a second failure within the cooldown rejects, never resolves undefined (blank SchreckNet)', async () => {
    const { target, reload } = setup();
    vitePreload(target, failingChunk); // first: reloads
    await new Promise((r) => setTimeout(r, 0));
    await expect(vitePreload(target, failingChunk)).rejects.toThrow('dynamically imported');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('a stylesheet failure is swallowed: the module still loads', async () => {
    const { target, reload } = setup();
    const ev = new Event('vite:preloadError', { cancelable: true });
    ev.payload = new Error('Unable to preload CSS for /assets/x.css');
    target.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(reload).not.toHaveBeenCalled();
  });
});
