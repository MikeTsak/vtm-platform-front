import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 30000, // 30 second timeout to prevent hanging requests
});

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.config?.url);
      error.message = 'Request timed out. Please check your connection and try again.';
    }
    
    // Handle network errors
    if (!error.response && error.message === 'Network Error') {
      console.error('Network error:', error.config?.url);
      error.message = 'Network error. Please check your connection.';
    }
    
    // Handle abort/cancel errors silently
    if (error.name === 'CanceledError' || error.name === 'AbortError') {
      return Promise.reject(error);
    }
    
    // Log other errors for debugging
    if (error.response) {
      console.error('API Error:', {
        url: error.config?.url,
        status: error.response.status,
        data: error.response.data
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;
