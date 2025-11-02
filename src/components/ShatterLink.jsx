// src/components/ShatterLink.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import homeStyles from '../styles/Home.module.css';
import shatterStyles from '../styles/ShatterEffect.module.css';

// Grid controls: denser grid ⇒ smaller shards
const GRID_COLS = 12;
const GRID_ROWS = 16;
const TOTAL_MS = 1500; // keep in sync with CSS (animation + delays)

function random(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Create a glassy-looking, irregular polygon INSIDE a cell.
 * - Points are roughly around the cell center with jitter.
 * - We bias shapes to be angular (5–8 points).
 */
function makeShardPolygon(cellRect) {
  const { left, top, width, height } = cellRect;
  const cx = left + width / 2;
  const cy = top + height / 2;

  const points = [];
  const n = Math.floor(random(5, 9)); // 5–8 sides
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + random(-0.25, 0.25);
    const r = random(0.35, 0.55) * Math.min(width, height);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    points.push([x, y]);
  }

  // Convert to % of viewport for clip-path (so it stays fixed on screen)
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return points.map(([x, y]) => `${(x / vw) * 100}vw ${(y / vh) * 100}vh`).join(', ');
}

export default function ShatterLink() {
  const [isShattering, setIsShattering] = useState(false);
  const [clickPoint, setClickPoint] = useState(null);
  const [shards, setShards] = useState([]); // [{ style, poly }]
  const overlayRef = useRef(null);
  const navigate = useNavigate();

  const handleClick = (e) => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReduced) {
      navigate('/premonitions');
      return;
    }

    e.preventDefault();
    if (isShattering) return;

    setClickPoint({ x: e.clientX, y: e.clientY });
    setIsShattering(true);

    // route after the transition ends
    window.setTimeout(() => {
      navigate('/premonitions');
    }, TOTAL_MS);
  };

  // blur/fade page while shattering
  useEffect(() => {
    if (!isShattering) return;
    document.documentElement.classList.add('page-is-shattering');
    return () => document.documentElement.classList.remove('page-is-shattering');
  }, [isShattering]);

  // Build shards once overlay is mounted
  useEffect(() => {
    if (!isShattering || !clickPoint || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const cellW = rect.width / GRID_COLS;
    const cellH = rect.height / GRID_ROWS;

    // furthest corner distance to normalize delays/forces
    const furthest = Math.max(
      Math.hypot(clickPoint.x - rect.left, clickPoint.y - rect.top),
      Math.hypot(clickPoint.x - rect.right, clickPoint.y - rect.top),
      Math.hypot(clickPoint.x - rect.left, clickPoint.y - rect.bottom),
      Math.hypot(clickPoint.x - rect.right, clickPoint.y - rect.bottom),
    );

    const list = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const cellRect = {
          left: rect.left + c * cellW,
          top: rect.top + r * cellH,
          width: cellW,
          height: cellH,
        };

        // center of the cell
        const cx = cellRect.left + cellRect.width / 2;
        const cy = cellRect.top + cellRect.height / 2;

        // vector from impact to cell center
        const dx = cx - clickPoint.x;
        const dy = cy - clickPoint.y;
        const d = Math.hypot(dx, dy);

        const delay = (d / furthest) * 0.35; // ripple outward
        const force = (furthest - d) / furthest; // 1 near → 0 far

        // fling destination (more near the impact)
        const destX = dx * (force * 2.7 + 0.8) + random(-14, 14);
        const destY = dy * (force * 2.7 + 0.8) + random(-14, 14);

        // slight random rotation and scale
        const rotate = (Math.random() - 0.5) * 560;
        const scale = 0.8 + Math.random() * 0.35;

        const poly = makeShardPolygon(cellRect);

        list.push({
          poly,
          style: {
            '--delay': `${delay}s`,
            '--x': `${destX}px`,
            '--y': `${destY}px`,
            '--rotate': `${rotate}deg`,
            '--scale': scale,
            '--tint': Math.random() < 0.45 ? 'rgba(170,255,240,0.06)' : 'rgba(255,255,255,0.04)',
            '--edge': Math.random() < 0.6 ? 'rgba(140, 255, 230, 0.55)' : 'rgba(220, 240, 255, 0.42)',
          },
        });
      }
    }
    setShards(list);
  }, [isShattering, clickPoint]);

  return (
    <>
      <div className={homeStyles.malkavianGrid}>
        <button
          className={homeStyles.giantButton}
          onClick={handleClick}
          disabled={isShattering}
          aria-label="Premonitions (shatter transition)"
        >
          <span>Premonitions</span>
          <small>View the Madness Network</small>
        </button>
      </div>

      {isShattering && (
        <div
          className={shatterStyles.overlay}
          ref={overlayRef}
          style={{
            '--click-x': `${clickPoint.x}px`,
            '--click-y': `${clickPoint.y}px`,
          }}
          aria-hidden="true"
        >
          {/* Impact cracks & flash */}
          <div className={shatterStyles.impact} />

          {/* Shards */}
          {shards.map((s, i) => (
            <div
              key={i}
              className={shatterStyles.shard}
              style={s.style}
            >
              <div
                className={shatterStyles.shape}
                style={{ clipPath: `polygon(${s.poly})` }}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
