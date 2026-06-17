import axios from 'axios';
import { publish } from './utils/notification';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  config.headers['Pragma'] = 'no-cache';
  config.headers['Expires'] = '0';
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