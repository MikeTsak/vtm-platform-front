// src/utils/sanitizeHtml.js
//
// Single choke-point for rendering server-supplied HTML (news, rumors,
// announcements, banners, NPC emails, ...). ALWAYS run untrusted HTML through
// this before passing it to `dangerouslySetInnerHTML`.
//
// Rationale: `body` fields on news/rumors/announcements are stored as raw HTML
// and rumors can be created by any player with an active character. Rendering
// them unsanitised is a stored-XSS -> account-takeover vector (the auth token
// lives in localStorage).

import DOMPurify from 'dompurify';

// Harden links that survive sanitisation and belt-and-braces strip any
// javascript:/vbscript: URIs that somehow slip through.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
  for (const attr of ['href', 'src', 'xlink:href']) {
    const val = node.getAttribute && node.getAttribute(attr);
    if (val && /^\s*(javascript|data|vbscript):/i.test(val) && !/^\s*data:image\//i.test(val)) {
      node.removeAttribute(attr);
    }
  }
});

// Tight allow-list. The rich-text editor only emits b/i/u + pasted formatting,
// so we allow common formatting/structure tags but no styling hooks
// (style/class/id), no embedded objects, no forms.
const CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'hr', 'div', 'span', 'blockquote', 'pre', 'code',
    'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'ins', 'sub', 'sup', 'mark', 'small',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'figure', 'figcaption',
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'target', 'rel',
    'src', 'alt', 'width', 'height',
    'colspan', 'rowspan',
  ],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  FORBID_TAGS: ['style', 'svg', 'math', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'link', 'meta', 'base'],
  FORBID_ATTR: ['style', 'class', 'id', 'srcset'],
};

/**
 * Sanitise an untrusted HTML string for safe rendering.
 * @param {unknown} dirty raw HTML (or plain text) from the API
 * @returns {string} XSS-safe HTML
 */
export function sanitizeHtml(dirty) {
  if (dirty === null || dirty === undefined) return '';
  return DOMPurify.sanitize(String(dirty), CONFIG);
}

/**
 * Convenience helper for `dangerouslySetInnerHTML`:
 *   <div {...dangerousHtml(item.body)} />
 */
export function dangerousHtml(dirty) {
  return { dangerouslySetInnerHTML: { __html: sanitizeHtml(dirty) } };
}

export default sanitizeHtml;
