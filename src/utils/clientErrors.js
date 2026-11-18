// src/utils/clientErrors.js
// Throttled client-side error reporter for React ErrorBoundary and media failures.
import api from '../core/api';

let reportedCount = 0;
const MAX_REPORTS_PER_SESSION = 5;

export function reportClientError(context, message, meta = null) {
  if (reportedCount >= MAX_REPORTS_PER_SESSION) return;
  reportedCount += 1;
  try {
    api.post('/client-errors', {
      context: String(context || 'ui').slice(0, 80),
      message: String(message || 'Unknown error').slice(0, 500),
      url: typeof window !== 'undefined' ? window.location.pathname.slice(0, 300) : '',
      meta: meta && typeof meta === 'object' ? meta : undefined,
    }).catch(() => {});
  } catch {
    // Never throw from telemetry
  }
}
