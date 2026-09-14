// src/components/ClanSymbol.jsx
import React from 'react';
import { symlogoWhite, getClanThemeRules } from '../data/clans';

/**
 * ClanSymbol renders a clan icon dynamically tinted to the clan's official color.
 * Uses CSS mask on the native white symbol master for crisp recoloring.
 *
 * @param {string} clan Clan name (e.g. 'Ventrue', 'Brujah')
 * @param {number|string} size Width and height in px (default: 24)
 * @param {string} color Custom hex color override (optional)
 * @param {string} className CSS class name
 * @param {object} style Additional inline styles
 * @param {string} alt Alt text description
 */
export default function ClanSymbol({
  clan,
  size = 24,
  color,
  className = '',
  style = {},
  alt
}) {
  if (!clan) return null;

  const src = symlogoWhite(clan);
  if (!src) return null;

  const rules = getClanThemeRules(clan);
  const resolvedColor = color || rules?.symbolColor || 'var(--clan-symbol-color, var(--tint, #8a0f1a))';
  const dimension = typeof size === 'number' ? `${size}px` : size;
  const label = alt || `${clan} Symbol`;

  return (
    <span
      role="img"
      aria-label={label}
      className={`clan-symbol-mask ${className}`}
      style={{
        display: 'inline-block',
        width: dimension,
        height: dimension,
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
