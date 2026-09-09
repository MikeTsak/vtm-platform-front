// src/features/character/CategoryIcon.jsx
//
// Renders one nav/tab icon. Most glyph names are plain Material Symbols
// ligatures (the font already loaded for the rest of the app) and go
// straight through to a <span>. A handful of names have no Material Symbols
// equivalent and are hand-inlined SVGs instead — same technique already used
// for the Chasse merit glyphs on the Domains map (see
// features/domains/data/chasseMerits.js): copy just the one path we need
// rather than pulling in an icon-font dependency for three icons.
//
// - "garlic"   — Delapouite, game-icons.net, CC BY 3.0 (https://game-icons.net/1x1/delapouite/garlic.html)
// - "hanukiah" — Font Awesome 6 Free (Solid), CC BY 4.0 (https://fontawesome.com/icons/hanukiah)
// "droplet_plus" isn't a real single glyph in either free set (Font Awesome's
// own "droplet-plus" is Pro-only) — it's built here from the free Font
// Awesome droplet path plus a small Material Symbols "add" badge tucked into
// the empty space beside the droplet's tip.

import React from 'react';

const GARLIC_PATH = 'M217.5 30.8c.4 3.92.9 8.68 1.3 14.06 15.8.8 34-.77 48-3.02-1.3-4.46-2.4-8.28-3.1-11.04zm54.7 28.42c-17.5 2.35-36.7 4.33-52.3 3.89.8 20.64.4 43.99-6.3 61.29-17.6 45.2-66.9 73.1-107.9 101.2-20.52 14-39.08 28.1-51.04 42.9-11.95 14.8-17.56 29.6-14.09 48.4 6.06 32.9 30.45 59.1 63.93 78.3-21.28-56 45.5-122.1 89-156-34.1 49.8-75.2 96.4-71.2 153.8 2.5 29.1 23.2 45.8 37.4 52.2 27.8 4.1 52.9-4.8 76.3-13.1-26.7-29.4-28.5-87.4-11.5-113.4-5.5 30.4-1.9 65.7 15.4 90 16.2 22.5 44.3 39.5 66.6 43.6 9.4 1.7 28.1-4.1 42.6-13.4-17.5-11.7-28-24.5-32.6-43.4l17.5-4.3c7.3 28.3 28.5 37.4 53.6 40.5 25.6 3.2 51.9-4 60.8-17.7 12.5-19.1 15.1-41.1 4.8-65.6-4.3-10.3-11.9-20.3-20.3-31.8-16.6-22.6-35.5-45.2-54.2-64.7 24.9 10.8 69.6 50.8 84.5 76.1 2.3-6.1 4-12.5 4.9-19.1 2.4-17.9-2.9-32.2-13.7-46.3-37.3-43.6-95.3-67.6-132.5-104.8 8.9 22.2 18.4 42.6 30.1 62.1-53.3-40.4-61.9-98.9-79.8-160.68zM253.7 447.6c-1.1 19-2.2 28.7-1 46l18-1.3c-1.6-11.3-.1-23.7.8-33.5-6.1-3.2-12.1-6.9-17.8-11.2zm-15.8 3c-6.1 2.2-12.7 4.4-18.3 6.1.2 11.9-1.2 22-3.6 33.4l17.6 3.7c4.2-14.4 3.3-29.9 4.3-43.2zM208 460c-7.2 1.6-13.8 3.4-20.3 4.1-2.7 7-6.2 11.5-10.5 17.7L192 492c7.3-9.7 13.3-21.5 16-32zm75 4c2.1 11 3.9 19.2 5.8 29.9l17.7-3.1c-1.1-7-2.6-14.7-4.1-21-6.4-1.2-12.9-3.2-19.4-5.8zm47.2 3.9c-6.3 1.9-12.7 2.9-18.8 2.8 3.7 7.2 6 12.9 9.1 20.4l16.7-6.9c-2.2-5.4-4.7-11.3-7-16.3z';

const HANUKIAH_PATH = 'M314.2 3.3C309.1 12.1 296 36.6 296 56c0 13.3 10.7 24 24 24s24-10.7 24-24c0-19.4-13.1-43.9-18.2-52.7C324.6 1.2 322.4 0 320 0s-4.6 1.2-5.8 3.3zm-288 48C21.1 60.1 8 84.6 8 104c0 13.3 10.7 24 24 24s24-10.7 24-24c0-19.4-13.1-43.9-18.2-52.7C36.6 49.2 34.4 48 32 48s-4.6 1.2-5.8 3.3zM88 104c0 13.3 10.7 24 24 24s24-10.7 24-24c0-19.4-13.1-43.9-18.2-52.7c-1.2-2.1-3.4-3.3-5.8-3.3s-4.6 1.2-5.8 3.3C101.1 60.1 88 84.6 88 104zm82.2-52.7C165.1 60.1 152 84.6 152 104c0 13.3 10.7 24 24 24s24-10.7 24-24c0-19.4-13.1-43.9-18.2-52.7c-1.2-2.1-3.4-3.3-5.8-3.3s-4.6 1.2-5.8 3.3zM216 104c0 13.3 10.7 24 24 24s24-10.7 24-24c0-19.4-13.1-43.9-18.2-52.7c-1.2-2.1-3.4-3.3-5.8-3.3s-4.6 1.2-5.8 3.3C229.1 60.1 216 84.6 216 104zM394.2 51.3C389.1 60.1 376 84.6 376 104c0 13.3 10.7 24 24 24s24-10.7 24-24c0-19.4-13.1-43.9-18.2-52.7c-1.2-2.1-3.4-3.3-5.8-3.3s-4.6 1.2-5.8 3.3zM440 104c0 13.3 10.7 24 24 24s24-10.7 24-24c0-19.4-13.1-43.9-18.2-52.7c-1.2-2.1-3.4-3.3-5.8-3.3s-4.6 1.2-5.8 3.3C453.1 60.1 440 84.6 440 104zm82.2-52.7C517.1 60.1 504 84.6 504 104c0 13.3 10.7 24 24 24s24-10.7 24-24c0-19.4-13.1-43.9-18.2-52.7c-1.2-2.1-3.4-3.3-5.8-3.3s-4.6 1.2-5.8 3.3zM584 104c0 13.3 10.7 24 24 24s24-10.7 24-24c0-19.4-13.1-43.9-18.2-52.7c-1.2-2.1-3.4-3.3-5.8-3.3s-4.6 1.2-5.8 3.3C597.1 60.1 584 84.6 584 104zM112 160c-8.8 0-16 7.2-16 16l0 96 0 16 32 0 0-16 0-96c0-8.8-7.2-16-16-16zm64 0c-8.8 0-16 7.2-16 16l0 96 0 16 32 0 0-16 0-96c0-8.8-7.2-16-16-16zm64 0c-8.8 0-16 7.2-16 16l0 96 0 16 32 0 0-16 0-96c0-8.8-7.2-16-16-16zm160 0c-8.8 0-16 7.2-16 16l0 96 0 16 32 0 0-16 0-96c0-8.8-7.2-16-16-16zm64 0c-8.8 0-16 7.2-16 16l0 96 0 16 32 0 0-16 0-96c0-8.8-7.2-16-16-16zm64 0c-8.8 0-16 7.2-16 16l0 96 0 16 32 0 0-16 0-96c0-8.8-7.2-16-16-16zM352 144c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 176L96 320c-17.7 0-32-14.3-32-32l0-96c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 53 43 96 96 96l192 0 0 64-128 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0 160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-128 0 0-64 192 0c53 0 96-43 96-96l0-96c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 17.7-14.3 32-32 32l-192 0 0-176z';

const DROPLET_PATH = 'M192 512C86 512 0 426 0 320C0 228.8 130.2 57.7 166.6 11.7C172.6 4.2 181.5 0 191.1 0l1.8 0c9.6 0 18.5 4.2 24.5 11.7C253.8 57.7 384 228.8 384 320c0 106-86 192-192 192zM96 336c0-8.8-7.2-16-16-16s-16 7.2-16 16c0 61.9 50.1 112 112 112c8.8 0 16-7.2 16-16s-7.2-16-16-16c-44.2 0-80-35.8-80-80z';

function Svg({ viewBox, path, size }) {
  return (
    <svg viewBox={viewBox} width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false">
      <path d={path} />
    </svg>
  );
}

/**
 * @param {string}  glyph  a Material Symbols ligature name, or one of the
 *                         special names handled above ('garlic', 'hanukiah',
 *                         'droplet_plus')
 * @param {number}  size   icon box in px — square, other icons letterbox
 *                         inside it to match
 * @param {boolean} active toggles the Material Symbols outline→filled
 *                         variation; the custom SVGs are solid already and
 *                         ignore this (their active state reads through the
 *                         parent's color, same as everything else here)
 */
export default function CategoryIcon({ glyph, size = 20, active = false }) {
  if (glyph === 'garlic') {
    return <Svg viewBox="0 0 512 512" path={GARLIC_PATH} size={size} />;
  }

  if (glyph === 'hanukiah') {
    return <Svg viewBox="0 0 640 512" path={HANUKIAH_PATH} size={size} />;
  }

  if (glyph === 'droplet_plus') {
    return (
      <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
        <Svg viewBox="0 0 384 512" path={DROPLET_PATH} size={size} />
        {/* The droplet narrows to a point at the top, leaving empty space in
            the top-right of its box — the badge sits there rather than
            overlapping the filled shape, so no backing circle is needed. */}
        <span
          className="material-symbols-outlined"
          style={{
            position: 'absolute',
            top: -size * 0.06,
            right: -size * 0.2,
            fontSize: size * 0.5,
            lineHeight: 1,
            fontVariationSettings: "'FILL' 1, 'wght' 700",
          }}
        >add</span>
      </span>
    );
  }

  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
    >{glyph}</span>
  );
}
