// src/ui/dice3d/diceUi.js
//
// The dice helpers that do NOT need three.js: face images and titles, the
// battery-saver preference, and the WebGL capability check. Split out of
// sharedDiceEngine.js so pages that show dice (Feeding, Live Session, Dice
// Roller) can render the 2D faces without downloading three.js up front; the
// 3D canvas loads on demand (see D10Die.jsx).

export const D10_ASSETS = {
  regular: {
    failure: '/img/dice/d10/Dice_Regular_Failure.webp',
    success: '/img/dice/d10/Dice_Regular_Success.webp',
    critical: '/img/dice/d10/Dice_Regular_Critical.webp',
  },
  hunger: {
    bestial: '/img/dice/d10/Dice_Hunger_BestialFailure.webp',
    failure: '/img/dice/d10/Dice_Hunger_Failure.webp',
    success: '/img/dice/d10/Dice_Hunger_Success.webp',
    messy: '/img/dice/d10/Dice_Hunger_MessyCritical.webp',
  },
};

export function getD10Image(value, isHunger = false) {
  const v = Number(value) || 1;
  if (isHunger) {
    if (v === 10) return D10_ASSETS.hunger.messy;
    if (v === 1) return D10_ASSETS.hunger.bestial;
    if (v >= 6) return D10_ASSETS.hunger.success;
    return D10_ASSETS.hunger.failure;
  }
  if (v === 10) return D10_ASSETS.regular.critical;
  if (v >= 6) return D10_ASSETS.regular.success;
  return D10_ASSETS.regular.failure;
}

export function getD10Title(value, isHunger = false) {
  const v = Number(value) || 1;
  if (isHunger) {
    if (v === 10) return `Hunger 10: Messy Critical`;
    if (v === 1) return `Hunger 1: Bestial Failure`;
    if (v >= 6) return `Hunger ${v}: Success`;
    return `Hunger ${v}: Failure`;
  }
  if (v === 10) return `Normal 10: Critical Success`;
  if (v >= 6) return `Normal ${v}: Success`;
  return `Normal ${v}: Failure`;
}

// Mobile and Battery Optimization Controls
export function getBatterySaverMode() {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem('v5_dice_battery_saver');
    if (val !== null) return val === 'true';
  } catch (e) {}

  // Automatically default to battery saver on low tier hardware (<= 4 cores)
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
    return true;
  }
  return false;
}

export function setBatterySaverMode(enabled) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('v5_dice_battery_saver', enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('v5_dice_battery_saver_change', { detail: { enabled } }));
  } catch (e) {}
}

export function is2DPreferred(poolCount = 1) {
  if (typeof window === 'undefined') return false;

  // 1. User manual preference / low tier hardware
  if (getBatterySaverMode()) return true;

  // 2. Hardware concurrency check
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
    return true;
  }

  // 3. Mobile touch screen pool ceiling: rolling > 8 dice switches to 2D
  if (poolCount > 8 && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    return true;
  }

  return false;
}

let webgl = null;
export function webglSupported() {
  if (webgl !== null) return webgl;
  if (typeof window === 'undefined' || typeof document === 'undefined') return (webgl = false);
  try {
    const testCanvas = document.createElement('canvas');
    webgl = !!(testCanvas.getContext('webgl2') || testCanvas.getContext('webgl'));
  } catch (e) {
    webgl = false;
  }
  return webgl;
}
