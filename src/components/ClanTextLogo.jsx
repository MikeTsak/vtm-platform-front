// src/components/ClanTextLogo.jsx
import React from 'react';
import { textlogoWhite, getClanThemeRules } from '../data/clans';

/**
 * ClanTextLogo renders the clan typographic name logo dynamically tinted to the clan's official color.
 * Uses CSS mask on the native white text logo master for clean typography recoloring.
 *
 * @param {string} clan Clan name (e.g. 'Ventrue', 'Brujah')
 * @param {number|string} width Width in px or CSS string (default: 160)
 * @param {number|string} height Height in px or CSS string (default: 48)
 * @param {string} color Custom hex color override (optional)
 * @param {string} className CSS class name
 * @param {object} style Additional inline styles
 * @param {string} alt Alt text description
 */
export default function ClanTextLogo({
  clan,
  width = 160,
  height = 48,
  color,
  className = '',
  style = {},
  alt
}) {
  if (!clan) return null;

  const src = textlogoWhite(clan);
  if (!src) return null;

  const rules = getClanThemeRules(clan);
  const resolvedColor = color || rules?.textLogoColor || rules?.textColor || 'var(--clan-text-logo-color, var(--text-color, #e8e8ed))';
  const widthDim = typeof width === 'number' ? `${width}px` : width;
  const heightDim = typeof height === 'number' ? `${height}px` : height;
  const label = alt || `${clan} Typography Logo`;

  return (
    <span
      role="img"
      aria-label={label}
      className={`clan-text-logo-mask ${className}`}
      style={{
        display: 'inline-block',
        width: widthDim,
        height: heightDim,
        backgroundColor: resolvedColor,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        verticalAlign: 'middle',
        flexShrink: 0,
        transition: 'background-color 0.2s ease',
        ...style,
      }}
    />
  );
}
