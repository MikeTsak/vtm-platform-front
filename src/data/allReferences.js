// src/data/allReferences.js
// Centralized V5 reference catalog compiler for Knowledge Base and Live Session
import { DISCIPLINES } from './disciplines';
import { RITUALS } from './rituals';
import { MERITS_AND_FLAWS } from './merits_flaws';
import { INGRAINED_DISCIPLINE_FLAWS } from './ingrainedFlaws';
import { CLAN_REFERENCE } from './clanReference';
import { powerMechanics } from './disciplineMechanics';
import {
  SOURCEBOOKS_SUBJECT_INDEX,
  DISCIPLINES_LEXICON,
  CLANS_LEXICON
} from './sourcebooksIndex';

export const CORE_RULES = [
  {
    category: 'rules',
    title: 'Difficulty and Success',
    content: '1 to 5: Failure. 6 to 9: Success. 10: Critical. Pair of 10s: 4 successes total.\nDifficulty 1: Routine\nDifficulty 3: Moderate (standard actions)\nDifficulty 5: Hard\nDifficulty 7+: Nearly impossible',
    source: 'Corebook, p. 119'
  },
  {
    category: 'rules',
    title: 'Hunger and Bestial Dice',
    content: 'Messy Critical: A 10 on a Hunger die within a critical win. The action succeeds but the Beast manifests.\nBestial Failure: A 1 on a Hunger die in an overall failed roll. The Beast lashes out causing compulsions or frenzy.',
    source: 'Corebook, p. 207'
  },
  {
    category: 'rules',
    title: 'Blood Surge',
    content: 'Adds bonus dice to a single pool based on Blood Potency rating. Requires an immediate Rouse Check.',
    source: 'Corebook, p. 216'
  },
  {
    category: 'rules',
    title: 'Humanity and Stains',
    content: 'Stains are accrued by violating Chronicle Tenets, Convictions, or Predator instincts.\nEnd of session Remorse test: Roll (10 minus Humanity minus Stains). At least 1 success clears stains peacefully. Failure reduces Humanity by 1 and clears stains.',
    source: 'Corebook, p. 238'
  },
  {
    category: 'rules',
    title: 'Frenzy and Resisting the Beast',
    content: 'Triggered by anger (Fury), hunger (Hunger), or terror (Terror).\nResist test: Roll unspent Willpower + (Humanity divided by 3, rounded down). Success suppresses the urge.\nFailure lets the Beast take control. While in Frenzy, immune to physical health penalties and restricted to physical disciplines.',
    source: 'Corebook, p. 219'
  },
  {
    category: 'rules',
    title: 'Blood Potency Milestones',
    content: 'Governs Blood Surge dice, Mend amounts, Discipline power bonus, Rouse reroll maximum level, Bane Severity, and Feeding penalties.',
    source: 'Corebook, p. 216'
  },
  {
    category: 'rules',
    title: 'Torpor and Awakening',
    content: 'A state of deathlike coma entered when taking full Aggravated Health damage or starved of blood.\nAwakening duration scales from nights to centuries depending on Humanity rating.',
    source: 'Corebook, p. 223'
  },
  {
    category: 'rules',
    title: 'Diablerie',
    content: 'The heinous act of consuming another vampire heartblood to steal their power and generation.\nRequires extended contested tests (Strength + Resolve vs victim Resolve + Humanity). Stains and soul corruption follow.',
    source: 'Corebook, p. 234'
  }
];

export function compileAllReferences(wikiArticles = []) {
  const list = [...CORE_RULES];

  // Multi:Sourcebook Subject Index Entries (Corebook, Players Guide, Cults, Camarilla, Anarch, Sabbat)
  SOURCEBOOKS_SUBJECT_INDEX.forEach((si, idx) => {
    list.push({
      id: `sb_idx_${idx}`,
      category: `${si.book.toLowerCase()} index`,
      title: `${si.topic} (${si.book} p. ${si.page})`,
      content: `Sourcebook: ${si.book}\n${si.section}\n${si.summary}`,
      source: `${si.book}, p. ${si.page}`,
      book: si.book,
      pdfPage: si.pdfPage,
      page: si.page,
      isSourcebookIndex: true
    });
  });

  // Disciplines
  Object.entries(DISCIPLINES).forEach(([disc, { levels = {} }]) => {
    const discMeta = DISCIPLINES_LEXICON.find((d) => d.name.toLowerCase() === disc.toLowerCase());
    Object.entries(levels).forEach(([lvl, powers]) => {
      powers.forEach((p) => {
        const mech = powerMechanics(p.id);
        list.push({
          id: `disc_${p.id || p.name}`,
          category: 'disciplines',
          discipline: disc,
          title: `${p.name} (${disc} Level ${lvl})`,
          cost: p.cost || null,
          pool: p.dice_pool || null,
          content: `Discipline: ${disc} Level ${lvl}\nCost: ${p.cost || 'None'}\nPool: ${p.dice_pool || 'None'}\n${p.notes || p.duration || ''}${mech ? `\nMechanic: ${mech.note}` : ''}`,
          source: p.source || (discMeta ? `${discMeta.book} p. ${discMeta.page}` : null),
          wikiUrl: discMeta?.url || `https://vtm.paradoxwikis.com/${disc.replace(/\s+/g, '_')}`
        });
      });
    });
  });

  // Rituals and Ceremonies
  Object.entries(RITUALS).forEach(([kind, { meta = {}, levels = {} }]) => {
    const isCeremony = kind === 'oblivion';
    const ritualWiki = isCeremony
      ? 'https://vtm.paradoxwikis.com/Oblivion'
      : 'https://vtm.paradoxwikis.com/Blood_Sorcery';
    Object.entries(levels).forEach(([lvl, rList = []]) => {
      rList.forEach((r) => {
        list.push({
          id: `rit_${r.name}`,
          category: isCeremony ? 'ceremonies' : 'rituals',
          title: `${r.name} (${isCeremony ? 'Oblivion Ceremony' : 'Blood Sorcery Ritual'} Level ${lvl})`,
          cost: r.cost || meta?.defaults?.cost || null,
          pool: r.dice_pool || null,
          content: `Type: ${isCeremony ? 'Oblivion Ceremony' : 'Blood Sorcery Ritual'} Level ${lvl}\nCost: ${r.cost || meta?.defaults?.cost || 'Standard'}\n${r.effect || ''}\n${r.notes || ''}`,
          source: r.source || null,
          wikiUrl: ritualWiki
        });
      });
    });
  });

  // Merits and Flaws
  Object.entries(MERITS_AND_FLAWS).forEach(([catName, catData]) => {
    (catData.merits || []).forEach((m) => {
      list.push({
        id: `merit_${m.id || m.name}`,
        category: 'merits',
        title: `${m.name} (${catName} Merit)`,
        cost: m.dots || null,
        content: `Category: ${catName}\nRating: ${m.dots}\n${m.description}\n${catData.blurb || ''}`,
        source: m.source || catData.blurb || null
      });
    });
    (catData.flaws || []).forEach((f) => {
      list.push({
        id: `flaw_${f.id || f.name}`,
        category: 'flaws',
        title: `${f.name} (${catName} Flaw)`,
        cost: f.dots || null,
        content: `Category: ${catName}\nRating: ${f.dots}\n${f.description}\n${catData.blurb || ''}`,
        source: f.source || catData.blurb || null
      });
    });
  });

  // Ingrained Flaws
  Object.entries(INGRAINED_DISCIPLINE_FLAWS).forEach(([disc, info]) => {
    const discMeta = DISCIPLINES_LEXICON.find((d) => d.name.toLowerCase() === disc.toLowerCase());
    list.push({
      id: `ingrained_${disc}`,
      category: 'ingrained flaws',
      discipline: disc,
      title: `${info.name} (${disc} Ingrained Flaw)`,
      content: `Discipline: ${disc}\n${info.description}`,
      source: info.source || 'Tattered Façade, p. 108',
      wikiUrl: discMeta?.url || `https://vtm.paradoxwikis.com/${disc.replace(/\s+/g, '_')}`
    });
  });

  // Clan References
  Object.entries(CLAN_REFERENCE).forEach(([clan, data]) => {
    const clanMeta = CLANS_LEXICON.find((c) => c.name.toLowerCase() === clan.toLowerCase());
    list.push({
      id: `clan_${clan}`,
      category: 'clans',
      clan: clan,
      title: `${clan} Clan Bane and Compulsion`,
      content: `Bane: ${data.bane}\nCompulsion: ${data.compulsion}`,
      source: `${clanMeta?.book || data.book || 'Corebook'} p. ${clanMeta?.page || ''}`,
      book: clanMeta?.book || data.book || 'Corebook',
      page: clanMeta?.page || null,
      pdfPage: clanMeta?.pdfPage || null,
      wikiUrl: clanMeta?.url || `https://vtm.paradoxwikis.com/${clan.replace(/\s+/g, '_')}`
    });
  });

  // Published LARP Wiki Articles
  if (Array.isArray(wikiArticles)) {
    wikiArticles.forEach((art) => {
      list.push({
        id: `wiki_${art.slug || art.id}`,
        category: 'wiki',
        title: `${art.title} (LARP Wiki)`,
        content: `Athens Through Time LARP Wiki article by ${art.author_name || 'Kindred'}. Published lore and chronicle records.`,
        source: `LARP Wiki: ${art.title}`,
        wikiSlug: art.slug,
        wikiUrl: `https://wiki.attlarp.gr/article/${art.slug}`
      });
    });
  }

  return list;
}
