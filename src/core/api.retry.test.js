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

// Fake transport answering each call with the next scripted outcome, recording the key sent.
const scripted = (...outcomes) => {
  const keys = [];
  api.defaults.adapter = async (config) => {
    keys.push(config.headers.get('Idempotency-Key'));
    const o = outcomes.shift();
    if (o === 'timeout') throw Object.assign(new Error('timeout'), { code: 'ECONNABORTED', config });
    const response = { data: {}, status: o.status, statusText: '', headers: o.headers || {}, config };
    if (o.status >= 400) throw Object.assign(new Error(`HTTP ${o.status}`), { response, config });
    return response;
  };
  return keys;
};
const send = (body) => api.post('/downtimes', body).catch(() => {});

describe('one Idempotency-Key per submission attempt', () => {
  it('a click after a timeout reuses the key: the server runs it once', async () => {
    const keys = scripted('timeout', { status: 200 });
    await send({ title: 'a' });
    await send({ title: 'a' });
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });
  it('a definite answer (2xx or 4xx) retires it: sending again is a new submission', async () => {
    const keys = scripted({ status: 200 }, { status: 400 }, { status: 200 });
    await send({ title: 'b' });
    await send({ title: 'b' });
    await send({ title: 'b' });
    expect(new Set(keys).size).toBe(3);
  });
  it('keeps the key while the server says the first copy is still running', async () => {
    const keys = scripted({ status: 409, headers: { 'x-idempotent-pending': 'true' } }, { status: 200 });
    await send({ title: 'c' });
    await send({ title: 'c' });
    expect(keys[1]).toBe(keys[0]);
  });
  it('different content gets a different key; a caller-set key is left alone', async () => {
    const keys = scripted('timeout', { status: 200 }, { status: 200 });
    await send({ title: 'd' });
    await send({ title: 'd, edited' });
    await api.post('/chat/messages', {}, { headers: { 'Idempotency-Key': 'chat-own' } });
    expect(keys[1]).not.toBe(keys[0]);
    expect(keys[2]).toBe('chat-own');
  });
});
