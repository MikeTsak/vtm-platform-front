// Run: ../back/node_modules/.bin/vitest run --root . src/utils/coalesce.test.js  (front has no test runner of its own)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { coalesce } from './coalesce';

describe('coalesce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a burst of calls runs once, after the delay', () => {
    const fn = vi.fn();
    const c = coalesce(fn, { delay: 300, gap: 2000 });
    for (let i = 0; i < 20; i++) c(); // e.g. a reconnect storm
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs stay a gap apart, and a call during the gap still runs once at its end', () => {
    const fn = vi.fn();
    const c = coalesce(fn, { delay: 300, gap: 2000 });
    c(); vi.advanceTimersByTime(300); // run 1 at t=300
    c(); c(); c();                    // during the gap
    vi.advanceTimersByTime(1999);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);        // t=2300: run 2
    expect(fn).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(10000);
    expect(fn).toHaveBeenCalledTimes(2); // nothing pending, nothing extra
  });

  it('a quiet stretch keeps the short delay', () => {
    const fn = vi.fn();
    const c = coalesce(fn, { delay: 300, gap: 2000 });
    c(); vi.advanceTimersByTime(300);
    vi.advanceTimersByTime(5000);
    c(); vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('cancel drops a pending run', () => {
    const fn = vi.fn();
    const c = coalesce(fn);
    c(); c.cancel();
    vi.advanceTimersByTime(10000);
    expect(fn).not.toHaveBeenCalled();
  });
});
