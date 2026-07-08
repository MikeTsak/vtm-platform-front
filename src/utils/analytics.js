/**
 * Utility for deep Google Analytics 4 integration.
 * Assumes the global window.gtag function is available from index.html.
 */

// Helper to safely call gtag
const callGtag = (...args) => {
  if (typeof window.gtag === 'function') {
    window.gtag(...args);
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn('GA4 Event Tracked (Local):', args);
  }
};

/**
 * Track a generic event
 * @param {string} eventName - e.g., 'login', 'theme_change'
 * @param {object} params - Key/value pairs of event properties
 */
export const trackEvent = (eventName, params = {}) => {
  callGtag('event', eventName, params);
};

/**
 * Track page views (for React Router)
 * @param {string} path - e.g., '/character', '/schrecknet'
 */
export const trackPageView = (path) => {
  callGtag('event', 'page_view', {
    page_path: path
  });
};

/**
 * Set the cross-device User ID
 * @param {string|number} userId - A pseudonymized ID for the player
 */
export const setUserId = (userId) => {
  if (!userId) return;
  callGtag('config', 'G-Z7VCE9MCPT', {
    user_id: userId
  });
};

/**
 * Set persistent user properties (like Clan and Sect)
 * @param {object} properties - e.g., { clan: 'Tremere', sect: 'Camarilla' }
 */
export const setUserProperties = (properties) => {
  callGtag('set', 'user_properties', properties);
};

/**
 * Clear user data on logout
 */
export const clearUserTracking = () => {
  callGtag('set', 'user_properties', {
    clan: null,
    sect: null
  });
  callGtag('config', 'G-Z7VCE9MCPT', {
    user_id: null
  });
};
