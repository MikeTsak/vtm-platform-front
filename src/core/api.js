import axios from 'axios';
import { publish } from '../utils/notification';

// Give up after 30 s so a stuck server shows an error instead of spinning
// forever (the login button sat on "Authenticating..."). A call that is
// legitimately slow passes { timeout: 0 }.
const DEFAULT_TIMEOUT = 30000;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: DEFAULT_TIMEOUT,
  // The session lives in an httpOnly cookie (see back/utils/authCookie.js):
  // this makes the browser attach it automatically. There is no token in JS
  // to read or set; that's the point (an XSS payload can't steal a cookie it
  // can't read either).
  withCredentials: true,
});

// One Idempotency-Key per submission attempt, on every POST (the server
// honours it on every POST route: back/utils/idempotency.js). Under lag a POST
// times out here, the player clicks again, and the server later runs both: a
// downtime got filed 3 times. Now the SAME request (same url and body) reuses
// its key until a definite answer comes back, so the server runs it once and
// replays that answer to the copies. A definite answer retires the key:
// sending the same thing again afterwards is a new submission. Call sites that
// set their own key (chat sends, XP spends) keep it. Uploads (FormData) are
// left out.
const attempts = new Map(); // request signature -> key
const signature = (c) => `${c.url} ${typeof c.data === 'string' ? c.data : JSON.stringify(c.data ?? null)}`;
const retireAttempt = (config) => { if (config?._attempt) attempts.delete(config._attempt); };

api.interceptors.request.use((config) => {
  // Caching is governed by each response's own Cache-Control header (see
  // back/server.fastify.js), forcing no-store on every request here used to
  // override that unconditionally, which is why re-enabling caching
  // server-side alone wouldn't have done anything. The backend defaults to
  // no-store for anything that hasn't explicitly opted into caching, so this
  // is safe to leave to the server now.

  if ((config.method || 'get').toLowerCase() === 'post' && !(config.data instanceof FormData)
      && !config.headers.has('Idempotency-Key')) {
    const sig = signature(config);
    if (!attempts.has(sig)) {
      if (attempts.size >= 50) attempts.delete(attempts.keys().next().value); // oldest abandoned attempt
      attempts.set(sig, crypto.randomUUID());
    }
    config.headers.set('Idempotency-Key', attempts.get(sig));
    config._attempt = sig;
  }

  // Uploads keep no limit (see timeout above): a big image on a slow phone can
  // legitimately take longer than 30 s.
  if (config.data instanceof FormData && config.timeout === DEFAULT_TIMEOUT) config.timeout = 0;

  return config;
});

// Riding out a server restart. Every deploy, and every cold start after the
// host idles the app, leaves api.attlarp.gr unanswered for ~30 s: Passenger
// replies 503 (without CORS headers, so the browser reports a network/CORS
// error with no response) or holds the request until it times out. Requests
// that are safe to repeat wait and retry instead of failing. Writes are never
// replayed: a POST that timed out may already have been applied. Login opts
// in with { retrySafe: true } (logging in twice is harmless).
const RETRY_DELAYS = [2000, 4000, 8000, 8000, 8000]; // ~30 s of retrying
const isSafe = (c) => c.retrySafe || ['get', 'head', 'options'].includes((c.method || 'get').toLowerCase());
const isRestartError = (e) => {
  const s = e.response?.status;
  return s === 502 || s === 503 || s === 504
    || (!e.response && (e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT'));
};
let lastRestartNotice = 0;

api.interceptors.response.use(
  (response) => { retireAttempt(response.config); return response; },
  async (error) => {
    const config = error.config;
    // A 4xx is a definite answer too, except the server's "the first copy is
    // still running" (keep the key, so the next try waits for that copy). No
    // answer or a 5xx: the request may still run, so a retry must share the key.
    const s = error.response?.status;
    if (s && s < 500 && !error.response.headers?.['x-idempotent-pending']) retireAttempt(config);
    if (config && !axios.isCancel(error) && isSafe(config) && isRestartError(error)
        && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      const attempt = config._retry || 0;
      const started = config._retryStart || Date.now();
      // Cap the total wait: each try can itself sit out the 30 s timeout.
      if (attempt < RETRY_DELAYS.length && Date.now() - started < 75000) {
        if (Date.now() - lastRestartNotice > 60000) {
          lastRestartNotice = Date.now();
          publish({ message: 'The server is restarting. Reconnecting...', type: 'info' });
        }
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        return api({ ...config, _retry: attempt + 1, _retryStart: started });
      }
    }

    // Handle rate limit (429) responses
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      let message = 'Too many requests. Please try again later.';
      if (retryAfter) {
        message = `Too many requests. Please wait ${retryAfter} seconds before trying again.`;
      }
      // Publish notification for UI to display
      publish({
        message,
        type: 'error',
      });
    }
// Optionally handle other error statuses here if needed
    return Promise.reject(error);
  }
);

/**
 * Extracts a descriptive error string from Axios errors or standard JS exceptions.
 * Includes HTTP method, endpoint, status code, and backend response payload.
 */
export function formatApiError(e, fallback = 'Operation failed') {
  if (!e) return fallback;
  if (typeof e === 'string') return e;
  if (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT') {
    return 'The server did not answer in time. It may be busy or restarting: try again in a minute.';
  }

  const status = e.response?.status;
  const url = e.config?.url;
  const method = e.config?.method ? e.config.method.toUpperCase() : '';
  const data = e.response?.data;

  let serverMsg = null;
  if (data && typeof data === 'object') {
    serverMsg = data.error || data.message || data.details || JSON.stringify(data);
  } else if (typeof data === 'string' && data.trim()) {
    serverMsg = data.trim();
  }

  const coreMsg = serverMsg || e.message || fallback;
  const parts = [];
  if (method && url) parts.push(`${method} ${url}`);
  else if (url) parts.push(url);
  if (status) parts.push(`HTTP ${status}`);
  parts.push(coreMsg);

  return parts.join(': ');
}

export default api;