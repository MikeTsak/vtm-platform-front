// src/data/factions.js
// Single source of truth for Vampire: The Masquerade sect and faction iconography

export const FACTION_NAMES = ['Camarilla', 'Anarch', 'Sabbat'];

export const FACTION_COLORS = {
  Camarilla: '#8a0f1a',
  Anarch: '#ea580c',
  Sabbat: '#2b2b2b'
};

export const FACTION_BLURBS = {
  Camarilla: 'The ivory tower of vampire society, enforcing the Masquerade through ancient law and feudal structure.',
  Anarch: 'Rebels, idealists, and revolutionaries fighting for kindred freedom from elder oppression.',
  Sabbat: 'Fanatical death cult rejecting humanity in reverence of the dark beast and ancient prophecy.'
};

export const factionLogo = (faction, variant = 'white') => {
  if (!faction) return '';
  const f = String(faction).trim().toLowerCase();
  if (f === 'camarilla') {
    return variant === 'black' 
      ? '/img/factions/camarilla_ankh_black.webp' 
      : '/img/factions/camarilla_ankh_white.webp';
  }
  if (f === 'anarch') {
    return variant === 'black' 
      ? '/img/factions/anarch_ankh_black.webp' 
      : '/img/factions/anarch_ankh_white.webp';
  }
  if (f === 'sabbat') {
    return '/img/factions/sabbat_symbol.webp';
  }
  return '';
};

export const factionType = (faction, variant = 'white') => {
  if (!faction) return '';
  const f = String(faction).trim().toLowerCase();
  if (f === 'camarilla') {
    return variant === 'black' 
      ? '/img/factions/camarilla_type_black.webp' 
      : '/img/factions/camarilla_type_white.webp';
  }
  if (f === 'anarch') {
    return variant === 'black' 
      ? '/img/factions/anarch_type_black.webp' 
      : '/img/factions/anarch_type_white.webp';
  }
  if (f === 'sabbat') {
    return '/img/factions/sabbat_type.webp';
  }
  return '';
};
