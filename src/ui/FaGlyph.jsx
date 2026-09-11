// src/ui/FaGlyph.jsx
//
// Shared inline Font Awesome 6 Free Solid glyph renderer — same { viewBox,
// path } shape used by src/features/domains/data/chasseMerits.js, pulled out
// here so any feature can render an FA icon without a full icon-font/library
// dependency. Icons: CC BY 4.0 — fontawesome.com/license.
import React from 'react';

export default function FaGlyph({ icon, size = 16, className, style }) {
  if (!icon) return null;
  return (
    <svg
      className={className}
      style={style}
      viewBox={icon.viewBox}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" d={icon.path} />
    </svg>
  );
}
