// src/data/books.js
//
// V5 sourcebook registry. The PDFs are hosted at res.attlarp.gr/Books/ (capital B,
// case-sensitive).
// Used (admin-only) by the Live Session dashboard to turn the `source:` strings
// on disciplines / rituals / ceremonies into links, and to render a full
// reference library.
//
// `label` must match how the book is written in the data files' source strings;
// `aliases` cover the spelling / punctuation variants seen across those files.
// Set `file: null` for a book we reference but haven't uploaded yet.
//
// `offset` = (PDF page) - (printed book page). #page= links add it so the
// citation lands on the printed page. Verified 2026-09-10 by scanning each PDF's
// page footers (text) or reading the folios off rendered margins (image scans).
//
// All filenames below were verified against the server on 2026-09-10. If one
// 404s later, only this file needs editing.

export const BOOK_BASE = 'https://res.attlarp.gr/Books/';

export const BOOKS = [
  { label: 'Corebook',                 file: 'Vampire-the-Masquerade-1.pdf', offset: 2,
    aliases: ['Core Rulebook', 'V5 Corebook', 'Vampire: The Masquerade Corebook'] },
  { label: "Players Guide",            file: 'Vampire-The-Masquerade-V5-Players-Guide.pdf', offset: 2,
    aliases: ["Player's Guide", 'Vampire: The Masquerade Players Guide'] },
  { label: 'Companion',                file: 'Vampire-The-Masquerade-Companion.pdf', offset: 0,
    aliases: ['Vampire: The Masquerade Companion'] },
  { label: 'Anarch',                   file: 'Anarch-Vampire-the-Masquerade-5th-Edition.pdf', offset: 1 },
  { label: 'Camarilla',                file: 'Vampire-the-Masquerade-V5-Camarilla-2018.pdf', offset: 1 },
  { label: 'Sabbat',                   file: 'Vampire-The-Masquerade-V5-Sabbat-The-Black-Hand-Definitive-Edition.pdf', offset: 1,
    aliases: ['Sabbat: The Black Hand', 'Sabbat The Black Hand'] },
  { label: 'Cults of the Blood Gods',  file: 'Cults-of-the-Blood-Gods-Vampire-the-Masquerade-5th-Edition.pdf', offset: 1 },
  { label: 'Forbidden Religions',      file: 'Forbidden-Religions.pdf', offset: 1 },
  { label: 'Children of the Blood',    file: 'Children-of-the-Blood-VTM.pdf', offset: 1 },
  { label: 'Blood Sigils',             file: 'Blood-Sigils.pdf', offset: 2 },
  { label: 'Blood Stained Love',       file: 'V5-Blood-Stained-Love.pdf', offset: 2 },
  { label: 'Gehenna War',              file: 'V5-Gehenna-War.pdf', offset: 2 },
  { label: 'Chicago Folios',           file: 'The-Chicago-Folios.pdf', offset: 1,
    aliases: ['The Chicago Folios'] },
  { label: 'Chicago by Night',         file: 'VtM5-Chicago-by-Night.pdf', offset: 1 },
  { label: 'Let the Streets Run Red',  file: 'Let-The-Streets-Run-Red.pdf', offset: 1 },
  { label: 'Fall of London',           file: 'fall-of-london.pdf', offset: 2,
    aliases: ['The Fall of London'] },
  { label: 'Second Inquisition',       file: 'VTM-V5-Second-Inquisition.pdf', offset: 1,
    aliases: ['The Second Inquisition'] },
  { label: 'Trails of Ash and Bone',   file: 'V5-Trails-of-Ash-and-Bone_compressed-1.pdf', offset: 1 },
  { label: 'Tattered Façade',          file: 'Vampire-the-Masquerade-V5-Tattered-Facade.pdf', offset: 2,
    aliases: ['Tattered Facade'] },
  { label: 'Courts of the Damned',     file: 'VtM-V5-Courts-of-the-Damned-1.pdf', offset: 2 },
  { label: 'Book of Nod Apocrypha',    file: 'V5-Book-of-Nod-Apocrypha.pdf', offset: 2 },
  // Comic issue, no printed folios — offset is the front-matter count (story p.1 = PDF p.4).
  { label: "Winter's Teeth",           file: 'VTMB-Winter-s-Teeth-3.pdf', offset: 3,
    aliases: ["Winter's Teeth #3", 'Winters Teeth'] },
  { label: 'Quick Reference',          file: 'Quick-Reference-V5.pdf', offset: 2,
    aliases: ['Quick Reference V5'] },
  { label: 'Blood Potency Correction', file: 'V5-Blood-Potency-Correction.pdf', offset: 0 },
  // Scan combines spreads toward the back, so the +2 is exact only for the
  // front third (where all but one of our citations land).
  { label: 'In Memoriam',              file: 'Vampire-The-Masquerade-In-memoriam.pdf', offset: 2 },
];

// Longest name first so "Chicago Folios" wins over "Chicago by Night", etc.
const NAME_INDEX = BOOKS
  .flatMap(b => [b.label, ...(b.aliases || [])].map(name => ({
    key: name.toLowerCase().replace(/[’‘]/g, "'").trim(),
    book: b,
  })))
  .sort((a, b) => b.key.length - a.key.length);

export function bookByName(name) {
  if (!name) return null;
  const n = String(name).toLowerCase().replace(/[’‘]/g, "'").trim();
  const hit = NAME_INDEX.find(x => n === x.key || n.startsWith(x.key + ' ') || n.startsWith(x.key));
  return hit ? hit.book : null;
}

export function bookUrl(book, page) {
  if (!book || !book.file) return null;
  const url = BOOK_BASE + book.file;
  if (!page) return url;
  const pdfPage = Math.max(1, Number(page) + (book.offset || 0));
  return `${url}#page=${pdfPage}`;
}

// "Chicago by Night p.295; Players Guide p.90"        -> two segments
// "Cults of the Blood Gods, page 208 Players Guide, page 92" -> two segments
// Returns [{ raw, label, page, book, url }] — url is null when we have no PDF.
export function parseSourceString(src) {
  if (!src) return [];
  return String(src)
    .replace(/[’‘]/g, "'")
    .split(/\s*;\s*|\s+and\s+/i)
    .flatMap(s => s.split(/(?<=\d)\s+(?=[A-Z][a-z])/)) // book B glued after book A's page
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !/^\(?errata\)?$/i.test(s))
    .map(seg => {
      const pageMatch = seg.match(/(?:pp?\.?|pages?|pg\.?)\s*([0-9]+)/i);
      const page = pageMatch ? pageMatch[1] : null;
      const label = seg
        .replace(/\(?\s*errata\s*\)?/ig, ' ')
        .replace(/[,\s]*(?:pp?\.?|pages?|pg\.?)\s*[0-9].*$/i, '')
        .replace(/#.*$/, '')
        .replace(/[,;:\s]+$/, '')
        .trim();
      const book = bookByName(label);
      return { raw: seg, label, page, book, url: bookUrl(book, page) };
    });
}
