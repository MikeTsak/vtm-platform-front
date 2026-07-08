import * as CookieConsent from 'vanilla-cookieconsent';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import './styles/global/cookieconsent-theme.css';

export function initCookieConsent() {
  CookieConsent.run({
    categories: {
      necessary: {
        enabled: true,
        readOnly: true
      },
      analytics: {
        autoClear: {
          cookies: [
            {
              name: /^(_ga|_gid)/
            }
          ]
        }
      }
    },
    onConsent: () => {
      if (CookieConsent.acceptedCategory('analytics')) {
        if (typeof window.gtag === 'function') {
          window.gtag('consent', 'update', {
            'analytics_storage': 'granted'
          });
        }
      }
    },
    onChange: ({ changedCategories }) => {
      if (changedCategories.includes('analytics')) {
        if (CookieConsent.acceptedCategory('analytics')) {
          if (typeof window.gtag === 'function') {
            window.gtag('consent', 'update', {
              'analytics_storage': 'granted'
            });
          }
        } else {
          if (typeof window.gtag === 'function') {
            window.gtag('consent', 'update', {
              'analytics_storage': 'denied'
            });
          }
        }
      }
    },
    language: {
      default: 'en',
      translations: {
        en: {
          consentModal: {
            title: 'Blood & Cookies',
            description: 'Even Kindred leave a digital trail. We use essential cookies to maintain the Masquerade, and tracking cookies to analyze the domain.',
            acceptAllBtn: 'Accept All',
            acceptNecessaryBtn: 'Reject All',
            showPreferencesBtn: 'Manage Preferences'
          },
          preferencesModal: {
            title: 'Data Preferences',
            acceptAllBtn: 'Accept All',
            acceptNecessaryBtn: 'Reject All',
            savePreferencesBtn: 'Save Preferences',
            closeIconLabel: 'Close',
            sections: [
              {
                title: 'Cookie Usage',
                description: 'Adjust your privacy settings. Certain cookies are required to access the SchreckNet.'
              },
              {
                title: 'Strictly Necessary',
                description: 'Essential for maintaining your session and preventing breaches of the Masquerade.',
                linkedCategory: 'necessary'
              },
              {
                title: 'Analytics',
                description: 'Allows the Harpy to monitor traffic and gather intelligence on the domain.',
                linkedCategory: 'analytics'
              }
            ]
          }
        }
      }
    }
  });
}
