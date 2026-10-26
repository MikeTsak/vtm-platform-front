// Shared constants for News module
export const NEWS_OUTLETS = {
  'ERT': { name: 'ERT News', logo: '/img/ert-news-logo.svg', color: '#e5002b', url: 'www.ertnews.gr' },
  'SKAI': { name: 'SKAI.gr', logo: '/img/skai-logo.png', color: '#005bfe', url: 'www.skai.gr' },
  'ALPHA': { name: 'Alpha News', logo: '/img/alpha-logo.png', color: '#ee3d42', url: 'www.alphatv.gr' },
  'MEGA': { name: 'Mega Gegonota', logo: '/img/mega-logo.png', color: '#e51b24', url: 'www.megatv.com' },
  'KATHIMERINI': { name: 'Kathimerini', logo: '/img/kathimerini-logo.png', color: '#111111', url: 'www.kathimerini.gr' },
  'GOSSIP': { name: 'Gossip TV', logo: 'https://cdn.gosmd.gr/img/1200/630/90/2016/05/19/1952016-14126.jpg?t=xRh4M6KRWfNTqee7gQzcuw', color: '#e6007e', url: 'www.gossip-tv.gr' },
  'OPENTV': { name: 'Open TV', logo: '/img/open-beyond-white.png', color: '#fa8301', url: 'www.tvopen.gr' },
  'ALTER': { name: 'Alter Channel', logo: '/img/alter-logo.png', color: '#d4af37', url: 'www.alter.gr' },
  'RUMOR': { name: 'Rumor / Gossip', color: '#fbbf24', url: null }
};

export const GREEK_REPORTERS = [
  "Giorgos Papadopoulos", "Maria Nikolaou", "Dimitris Georgiou",
  "Eleni Vasileiou", "Kostas Oikonomou", "Katerina Dimitriou",
  "Nikos Karagiannis", "Anna Makri", "Giannis Petrou", "Sofia Antoniou",
  "Thanasis Konstantinou", "Vasilis Alexiou", "Maria Christodoulou",
  "Andreas Makris", "Ioanna Louka", "Stavros Lymperis", "Christina Panagiotou"
];

export const DISCORD_PREFIX_OPTIONS = {
  news: [
    { value: '🔥 **Hot news from the mortal world!** 🔥', label: '🔥 **Hot news from the mortal world!** 🔥' },
    { value: '💅 **Gossip from the mortal world!** 💅', label: '💅 **Gossip from the mortal world!** 💅' },
    { value: '🚨 **Breaking news from the mortal world!** 🚨', label: '🚨 **Breaking news from the mortal world!** 🚨' },
    { value: '📢 **Special report from the mortal press!** 📢', label: '📢 **Special report from the mortal press!** 📢' },
    { value: '🗞️ **Headlines from the mortal world!** 🗞️', label: '🗞️ **Headlines from the mortal world!** 🗞️' }
  ],
  announcement: [
    { value: '📜 **New Court Announcement!** 📜', label: '📜 **New Court Announcement!** 📜' },
    { value: '🎙️ **ANNOUNCEMENT FROM THE COURT** 🎙️', label: '🎙️ **ANNOUNCEMENT FROM THE COURT** 🎙️' },
    { value: '👑 **ROYAL DECREE** 👑', label: '👑 **ROYAL DECREE** 👑' },
    { value: '🩸 **KINDRED BULLETIN** 🩸', label: '🩸 **KINDRED BULLETIN** 🩸' },
    { value: '⚖️ **Decree of the Primogen Council** ⚖️', label: '⚖️ **Decree of the Primogen Council** ⚖️' }
  ],
  rumor: [
    { value: '🤫 A new whisper echoes in the night...', label: '🤫 A new whisper echoes...' },
    { value: '🕷️ The Cobweb twitches with new gossip...', label: '🕷️ The Cobweb twitches...' },
    { value: '📜 An unsigned note was found...', label: '📜 An unsigned note was found...' },
    { value: '🍷 Overheard at the Elysium salon...', label: '🍷 Overheard at the Elysium salon...' },
    { value: '👀 Murmurs in the dark corners...', label: '👀 Murmurs in the dark corners...' }
  ]
};

export const getDefaultDiscordPrefix = (mode) => {
  if (mode === 'rumor') return '🤫 A new whisper echoes in the night...';
  if (mode === 'announcement') return '📜 **New Court Announcement!** 📜';
  return '🔥 **Hot news from the mortal world!** 🔥';
};