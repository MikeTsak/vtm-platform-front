import React from 'react';
import { symlogo as localSymlogo, CLAN_HEX as CLAN_COLORS } from '../data/clans';

const EXTRA_CREST_NAMES = ['Anarch', 'Camarilla', 'Sabbat', 'Giovanni'];
export const ALL_CREST_NAMES = [...Object.keys(CLAN_COLORS), ...EXTRA_CREST_NAMES];

export const clanKeyFor = (name) => {
  if (!name) return null;
  const want = String(name).trim().replace(/\s+/g, '_').toLowerCase();
  return ALL_CREST_NAMES.find(c => c.replace(/\s+/g, '_').toLowerCase() === want) || null;
};

export const clanToken = (name) => {
  const clan = clanKeyFor(name);
  return clan ? `:${clan.replace(/\s+/g, '_')}:` : null;
};

export const ReactionGlyph = ({ value, size = 14 }) => {
  const match = /^:([A-Za-z0-9_]+):$/.exec(value || '');
  const clan = match ? clanKeyFor(match[1]) : null;
  if (!clan) return <span>{value}</span>;
  return (
    <img
      src={localSymlogo(clan)}
      alt={clan}
      title={clan}
      className="inline-block align-text-bottom crestImg"
      style={{ width: size, height: size, filter: 'brightness(0) invert(1)' }}
    />
  );
};

export default ReactionGlyph;
