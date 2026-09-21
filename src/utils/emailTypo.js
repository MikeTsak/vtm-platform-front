// src/utils/emailTypo.js
// Utility to detect common email domain typos and suggest corrections without blocking custom domains.

const POPULAR_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'yahoo.gr',
  'hotmail.com',
  'hotmail.gr',
  'outlook.com',
  'outlook.com.gr',
  'icloud.com',
  'live.com',
  'proton.me',
  'protonmail.com',
  'windowslive.com',
  'msn.com',
  'aol.com',
  'mail.com',
  'gmx.com',
  'zoho.com',
  'yandex.com'
];

// Explicit known typo mapping for immediate high-confidence corrections
const KNOWN_DOMAIN_TYPOS = {
  // Gmail typos
  'gmai.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gamail.com': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'gmaol.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaul.com': 'gmail.com',
  'gmai.co': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cpm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.gr': 'gmail.com',
  'gmail.com.gr': 'gmail.com',
  'g-mail.com': 'gmail.com',
  'g.mail.com': 'gmail.com',

  // Hotmail typos
  'hotmai.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmaik.com': 'hotmail.com',
  'hotamail.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.cpm': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'hotmai.gr': 'hotmail.gr',

  // Yahoo typos
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yaho.gr': 'yahoo.gr',
  'yahooo.gr': 'yahoo.gr',
  'yhoo.com': 'yahoo.com',
  'yaho.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.cpm': 'yahoo.com',

  // Outlook typos
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outlook.cpm': 'outlook.com',
  'outlook.co': 'outlook.com',

  // iCloud typos
  'iclud.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'icloid.com': 'icloud.com',
  'icloud.con': 'icloud.com'
};

/**
 * Standard Levenshtein distance calculation
 */
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Checks an email string for likely typos in the domain part.
 * Returns null if no typo detected or if domain matches known list.
 * Otherwise returns:
 * {
 *   originalDomain: string,
 *   suggestedDomain: string,
 *   suggestedEmail: string
 * }
 */
export function checkEmailTypo(email) {
  if (!email || typeof email !== 'string') return null;

  const parts = email.trim().split('@');
  if (parts.length !== 2) return null;

  const [localPart, domainPart] = parts;
  if (!localPart || !domainPart) return null;

  const domain = domainPart.toLowerCase().trim();

  // If already exactly matching a popular domain, no typo
  if (POPULAR_DOMAINS.includes(domain)) {
    return null;
  }

  // 1. Direct typo dictionary check
  if (KNOWN_DOMAIN_TYPOS[domain]) {
    const suggestedDomain = KNOWN_DOMAIN_TYPOS[domain];
    return {
      originalDomain: domain,
      suggestedDomain,
      suggestedEmail: `${localPart}@${suggestedDomain}`
    };
  }

  // 2. Levenshtein distance check against popular domains
  // Allow distance 1 for shorter domains (<= 9 chars), distance <= 2 for longer domains
  let closestDomain = null;
  let minDistance = Infinity;

  for (const popular of POPULAR_DOMAINS) {
    const dist = levenshteinDistance(domain, popular);
    const maxAllowedDist = popular.length <= 9 ? 1 : 2;

    if (dist <= maxAllowedDist && dist < minDistance) {
      minDistance = dist;
      closestDomain = popular;
    }
  }

  if (closestDomain && minDistance > 0) {
    return {
      originalDomain: domain,
      suggestedDomain: closestDomain,
      suggestedEmail: `${localPart}@${closestDomain}`
    };
  }

  return null;
}
