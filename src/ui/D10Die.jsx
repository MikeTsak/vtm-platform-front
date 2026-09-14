// src/ui/D10Die.jsx
import React, { useState, useEffect } from 'react';
import FaGlyph from './FaGlyph';
import D10Canvas3D from './dice3d/D10Canvas3D';
import {
  getD10Image,
  getD10Title,
  sharedDiceEngine,
  getBatterySaverMode,
  is2DPreferred,
} from './dice3d/sharedDiceEngine';
import styles from './D10Die.module.css';

export { getD10Image, getD10Title };

export default function D10Die({
  value = 1,
  isHunger = false,
  isRolling = false,
  selectable = false,
  selected = false,
  onClick,
  size = 'md',
  showNumber = false,
  className = '',
  style,
  index = 0,
  force2D = false,
  poolCount = 1,
}) {
  const [has3DFallback, setHas3DFallback] = useState(false);
  const [batterySaver, setBatterySaver] = useState(() => getBatterySaverMode());

  useEffect(() => {
    const handleSaverChange = (e) => {
      setBatterySaver(!!e.detail?.enabled);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('v5_dice_battery_saver_change', handleSaverChange);
      return () => window.removeEventListener('v5_dice_battery_saver_change', handleSaverChange);
    }
  }, []);

  const currentImg = getD10Image(value, isHunger);
  const title = getD10Title(value, isHunger);

  const numVal = Number(value) || 1;
  const isCrit = !isRolling && (numVal === 10);
  const isBestial = !isRolling && isHunger && (numVal === 1);
  const isMessy = !isRolling && isHunger && (numVal === 10);

  const sizeClass = size === 'sm' ? styles.sizeSm : size === 'lg' ? styles.sizeLg : styles.sizeMd;
  const prefer2D = force2D || batterySaver || is2DPreferred(poolCount);
  const is3DAvailable = !has3DFallback && !prefer2D && sharedDiceEngine.isSupported();
  const render3D = isRolling && size !== 'sm' && is3DAvailable;

  const tossClass = index % 2 === 0 ? styles.tossA : styles.tossB;
  const animClass = isRolling ? (render3D ? '' : tossClass) : styles.settled;
  const staggerDelay = isRolling ? `${(index % 6) * 50}ms` : undefined;

  let specialClass = '';
  if (isBestial) specialClass = styles.bestialGlow;
  else if (isMessy) specialClass = styles.messyGlow;
  else if (isCrit) specialClass = styles.critGlow;

  return (
    <div
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-label={title}
      title={title}
      onClick={selectable && onClick ? onClick : undefined}
      onKeyDown={selectable && onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`${styles.kineticContainer} ${sizeClass} ${className}`}
      style={style}
    >
      <div
        className={`${styles.floorShadow} ${isRolling ? styles.shadowRolling : ''}`}
        style={{ animationDelay: staggerDelay }}
      />

      <div
        className={`
          ${styles.dieWrap}
          ${sizeClass}
          ${isHunger ? styles.hungerDie : styles.regularDie}
          ${animClass}
          ${selectable ? styles.selectable : ''}
          ${selected ? styles.selected : ''}
          ${specialClass}
        `}
        style={{ animationDelay: staggerDelay }}
      >
        <div className={styles.dieFaceInner}>
          {render3D ? (
            <D10Canvas3D
              value={value}
              isHunger={isHunger}
              isRolling={isRolling}
              size={size}
              index={index}
              onFallback={() => setHas3DFallback(true)}
            />
          ) : (
            <img
              src={currentImg}
              alt=""
              className={styles.dieTexture}
              draggable="false"
            />
          )}

          {showNumber && !isRolling && (
            <span className={styles.numberBadge}>
              {value}
            </span>
          )}
        </div>

        {selectable && (
          <div className={styles.selectionIndicator}>
            {selected && (
              <span className={styles.checkIcon}>
                <FaGlyph icon="check" size={10} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
