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

// emoji-picker-react config shared by every picker outside the chat.
export const customClanEmojis = ALL_CREST_NAMES.map(clan => ({
  id: clan.toLowerCase().replace(/[^a-z0-9]/g, '_'),
  names: [clan],
  imgUrl: localSymlogo(clan)
}));

export const EMOJI_PICKER_CATEGORIES = [
  { category: 'suggested', name: 'Recently Used' },
  { category: 'custom', name: 'Clans' },
  { category: 'smileys_people', name: 'Smileys and People' },
  { category: 'animals_nature', name: 'Animals and Nature' },
  { category: 'food_drink', name: 'Food and Drink' },
  { category: 'travel_places', name: 'Travel and Places' },
  { category: 'activities', name: 'Activities' },
  { category: 'objects', name: 'Objects' },
  { category: 'symbols', name: 'Symbols' },
  { category: 'flags', name: 'Flags' }
];

// A picked emoji as text: native emoji as-is, a crest as its ':Clan_Name:' token.
export const emojiObjectToToken = (o) =>
  o.isCustom && o.names?.[0] ? `:${o.names[0].replace(/\s+/g, '_')}:` : o.emoji;

// Swaps ':Clan_Name:' tokens in ALREADY-SANITISED html for crest images.
// Only text between tags is touched, and only known crests match, so nothing
// user-supplied reaches the markup we add. white=false for print (dark crest).
export const crestifyHtml = (html, { white = true } = {}) =>
  String(html).split(/(<[^>]*>)/).map(part => part.startsWith('<') ? part : part.replace(/:([A-Za-z0-9_]+):/g, (m, id) => {
    const clan = clanKeyFor(id);
    if (!clan) return m;
    const filter = white ? 'brightness(0) invert(1)' : 'brightness(0)';
    return `<img src="${localSymlogo(clan)}" alt="${clan}" title="${clan}" style="width:1.2em;height:1.2em;vertical-align:text-bottom;display:inline-block;filter:${filter}">`;
  })).join('');

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
