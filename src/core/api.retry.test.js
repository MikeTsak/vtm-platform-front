// Run: ../back/node_modules/.bin/vitest run --root . src/core/api.retry.test.js  (front has no test runner of its own)
import { describe, it, expect, vi } from 'vitest';
import api from './api';

// Fake transport: fail `fails` times with a CORS-hidden 503 (no response), then succeed.
const flaky = (fails) => {
  const calls = { n: 0 };
  api.defaults.adapter = async (config) => {
    calls.n++;
    if (calls.n <= fails) throw Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK', config });
    return { data: 'ok', status: 200, statusText: 'OK', headers: {}, config };
  };
  return calls;
};

describe('restart retry', () => {
  it('retries GETs through a restart', async () => {
    vi.useFakeTimers();
    const calls = flaky(2);
    const p = api.get('/x');
    await vi.runAllTimersAsync();
    expect((await p).data).toBe('ok');
    expect(calls.n).toBe(3);
    vi.useRealTimers();
  });
  it('never replays a normal POST', async () => {
    const calls = flaky(1);
    await expect(api.post('/xp/buy', {})).rejects.toThrow();
    expect(calls.n).toBe(1);
  });
  it('retries a retrySafe POST (login)', async () => {
    vi.useFakeTimers();
    const calls = flaky(1);
    const p = api.post('/auth/login', {}, { retrySafe: true });
    await vi.runAllTimersAsync();
    expect((await p).data).toBe('ok');
    expect(calls.n).toBe(2);
    vi.useRealTimers();
  });
});
