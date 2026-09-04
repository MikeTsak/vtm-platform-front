import axios from 'axios';
import { publish } from '../utils/notification';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // The session lives in an httpOnly cookie (see back/utils/authCookie.js) —
  // this makes the browser attach it automatically. There is no token in JS
  // to read or set; that's the point (an XSS payload can't steal a cookie it
  // can't read either).
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // Caching is governed by each response's own Cache-Control header (see
  // back/server.fastify.js) — forcing no-store on every request here used to
  // override that unconditionally, which is why re-enabling caching
  // server-side alone wouldn't have done anything. The backend defaults to
  // no-store for anything that hasn't explicitly opted into caching, so this
  // is safe to leave to the server now.

  // Idempotency-Key is NOT set globally anymore — a fresh random UUID on
  // every request meant retries never shared a key, so it protected nothing
  // while still writing a DB row per mutation. Real idempotency is now
  // opt-in, only for the handful of endpoints where a duplicate would cause
  // real harm (XP spend) — see utils/idempotencyKey.js, called explicitly at
  // those call sites instead of here.

  return config;
});

// Response interceptor for rate limiting and other errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
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

export default api;