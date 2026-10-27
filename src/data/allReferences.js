// src/data/allReferences.js
// Centralized V5 reference catalog compiler for Knowledge Base and Live Session
import { DISCIPLINES } from './disciplines';
import { RITUALS } from './rituals';
import { MERITS_AND_FLAWS } from './merits_flaws';
import { INGRAINED_DISCIPLINE_FLAWS } from './ingrainedFlaws';
import { CLAN_REFERENCE, ALTERNATIVE_CLAN_BANES } from './clanReference';
import { PREDATOR_TYPES } from './predator_types';
import { COTERIES } from './cotteries';
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
    source: 'Corebook, p. 119',
    book: 'Corebook',
    page: 119,
    pdfPage: 121
  },
  {
    category: 'rules',
    title: 'Hunger and Bestial Dice',
    content: 'Messy Critical: A 10 on a Hunger die within a critical win. The action succeeds but the Beast manifests.\nBestial Failure: A 1 on a Hunger die in an overall failed roll. The Beast lashes out causing compulsions or frenzy.',
    source: 'Corebook, p. 207',
    book: 'Corebook',
    page: 207,
    pdfPage: 209
  },
  {
    category: 'rules',
    title: 'Blood Surge',
    content: 'Adds bonus dice to a single pool based on Blood Potency rating. Requires an immediate Rouse Check. Free action during any physical, social, or mental test.',
    source: 'Corebook, p. 216',
    book: 'Corebook',
    page: 216,
    pdfPage: 218
  },
  {
    category: 'rules',
    title: 'Rouse Checks and Re rolls',
    content: 'Roll 1 die. On 6 to 10 the Blood stays steady. On 1 to 5 Hunger increases by 1. Blood Potency grants re rolls on Rouse Checks for Discipline powers up to a maximum level rating.',
    source: 'Corebook, p. 211',
    book: 'Corebook',
    page: 211,
    pdfPage: 213
  },
  {
    category: 'rules',
    title: 'Humanity, Stains, and Remorse',
    content: 'Stains are accrued by violating Chronicle Tenets, Touchstones, Convictions, or Predator instincts.\nEnd of session Remorse test: Roll (10 minus Humanity minus Stains), minimum 1 die. At least 1 success clears stains peacefully and preserves Humanity. Failure reduces Humanity by 1 dot and clears all stains.\nReaching Humanity 0 turns the vampire into an irredeemable Wight controlled by the Storyteller.',
    source: 'Corebook, p. 238',
    book: 'Corebook',
    page: 238,
    pdfPage: 240
  },
  {
    category: 'rules',
    title: 'Frenzy and Resisting the Beast',
    content: 'Triggered by provocation and anger (Fury), sight or scent of blood at Hunger 4 or 5 (Hunger), or fire and sunlight (Terror/Rötschreck).\nResist test: Roll unspent Willpower + (Humanity divided by 3, rounded down) vs Difficulty 2 to 5.\nSuccess suppresses the urge for the scene.\nFailure lets the Beast take full control. While in Frenzy, immune to physical health penalties, cannot use Mental or Social disciplines, and focused purely on violent survival or feeding.\nRiding the Wave: Voluntarily surrender to Frenzy to steer the Beast toward preferred targets and avoid stains for failing.',
    source: 'Corebook, p. 219',
    book: 'Corebook',
    page: 219,
    pdfPage: 221
  },
  {
    category: 'rules',
    title: 'Terror Frenzy and Rötschreck',
    content: 'The ancient panic when exposed to open flame, sunlight, or extreme heat.\nResist test: Willpower + (Humanity / 3) vs Difficulty set by fire size (bonfire Difficulty 3, burning room Difficulty 4, sunlight Difficulty 5).\nOn failure, the character flees wildly from the source at maximum speed, destroying anything blocking their escape.',
    source: 'Corebook, p. 220',
    book: 'Corebook',
    page: 220,
    pdfPage: 222
  },
  {
    category: 'rules',
    title: 'Blush of Life',
    content: 'Vampires can rouse the blood to mimic mortal vitality for one night or scene. Requires one Rouse Check.\nEffects: Heart beats, skin warms and takes on color, breath fogs in the cold, pupils dilate, can perform sexual intercourse, and can pass superficial medical examination without specialized blood tests.\nIngesting Food: Allows chewing and swallowing food or drink, but it provides zero nourishment and must be regurgitated within an hour unless the character possesses the Eat Food merit.',
    source: 'Corebook, p. 218',
    book: 'Corebook',
    page: 218,
    pdfPage: 220
  },
  {
    category: 'rules',
    title: 'Health and Taking Damage',
    content: 'Health tracker equals Stamina + 3 boxes.\nSuperficial Damage: From fists, blunt weapons, small caliber bullets, and standard impacts. Vampires halve all superficial damage before applying to the tracker (round up), except fire and sunlight.\nAggravated Damage: From fire, sunlight, supernatural claws/fangs, and aggravated weapon attacks. Applied directly with an X on the tracker without halving.\nImpairment: When the tracker is completely full of damage, the character suffers a two dice penalty to all Physical tests.\nOverflow: When full of superficial damage, each additional point converts an existing superficial slash into an aggravated cross. When completely full of aggravated damage, the vampire instantly enters Torpor.',
    source: 'Corebook, p. 125',
    book: 'Corebook',
    page: 125,
    pdfPage: 127
  },
  {
    category: 'rules',
    title: 'Mending Damage with Vitae',
    content: 'Mending Superficial: One Rouse Check heals superficial health damage equal to the Mend rating on the Blood Potency chart (1 to 3 boxes) in a single turn.\nMending Aggravated: Requires three Rouse Checks during daytime sleep and restores one box of aggravated damage on waking.',
    source: 'Corebook, p. 218',
    book: 'Corebook',
    page: 218,
    pdfPage: 220
  },
  {
    category: 'rules',
    title: 'Willpower Spending and Recovery',
    content: 'Willpower tracker equals Composure + Resolve.\nSpending Willpower: Reroll up to three regular (non Hunger) dice on any standard test, take control of one action while in frenzy, or resist a supernatural mental power for one turn.\nSuperficial Willpower Damage: Accrued from social debate, embarrassment, or mental strain.\nAggravated Willpower Damage: Accrued from breaking a Conviction or critical psychological trauma.\nImpairment: When tracker is completely filled, take a two dice penalty to all Social and Mental tests.\nRecovery: Recover superficial Willpower at the start of a session or through active roleplay. Recover one aggravated Willpower when acting to uphold a Conviction or resolving a chronicle arc.',
    source: 'Corebook, p. 126',
    book: 'Corebook',
    page: 126,
    pdfPage: 128
  },
  {
    category: 'rules',
    title: 'Feeding, Hunting, and Slaking Hunger',
    content: 'Slaking 1 Hunger: A sip slakes 1 Hunger while leaving the mortal vessel conscious and unharmed.\nSlaking 2 to 3 Hunger: Deep feeding, leaves the mortal weak, hospitalized, or requiring immediate medical attention.\nSlaking to 0 Hunger: Draining a human to death. Only killing a human vessel can reduce Hunger to zero. Murdering a human automatically incurs Stains.\nAnimal Blood: Can slake 1 Hunger, but cannot reduce Hunger below 1 (or below 2 or 3 at higher Blood Potency ratings).\nBagged and Cold Blood: Slakes half as much, requires Blood Potency 1 or 2, and requires a Rouse check to stomach at Blood Potency 2.',
    source: 'Corebook, p. 211',
    book: 'Corebook',
    page: 211,
    pdfPage: 213
  },
  {
    category: 'rules',
    title: 'Eating Food and Mortal Digestion',
    content: 'Without the Eat Food merit, vampires cannot process solid food or alcohol. The body instinctively recoils.\nWithout the merit, ingesting food requires a Stamina + Resolve test (Difficulty 3) to keep it down, and the vampire must vomit it up within an hour or suffer immediate nausea and retching.\nWith the Eat Food merit (Corebook p. 180), food can be eaten and kept down without rolling, although it provides zero blood nourishment.',
    source: 'Corebook, p. 180',
    book: 'Corebook',
    page: 180,
    pdfPage: 182
  },
  {
    category: 'rules',
    title: 'Compulsions and The Beast',
    content: 'Triggered on a Bestial Failure or Messy Critical. The Beast demands immediate satisfaction.\nGeneral Compulsions: Hunger, Dominance, Harm, Paranoia.\nClan Compulsions: Unique ancestral urges (e.g., Brujah Rebellion, Malkavian Delusion, Toreador Obsession, Ventrue Arrogance).\nPenalty: Two dice penalty to all tests that do not directly pursue or fulfill the compulsion until resolved or the scene ends.',
    source: 'Corebook, p. 208',
    book: 'Corebook',
    page: 208,
    pdfPage: 210
  },
  {
    category: 'rules',
    title: 'Blood Potency Milestones',
    content: 'Governs Blood Surge dice, Mend amounts, Discipline power bonus, Rouse reroll maximum level, Bane Severity, and Feeding penalties.',
    source: 'Corebook, p. 216',
    book: 'Corebook',
    page: 216,
    pdfPage: 218
  },
  {
    category: 'rules',
    title: 'Torpor and Awakening',
    content: 'A state of deathlike coma entered when taking full Aggravated Health damage or starved of blood.\nAwakening duration scales from nights to centuries depending on Humanity rating. Feeding vitae from a higher Blood Potency kindred can awaken the sleeper prematurely.',
    source: 'Corebook, p. 223',
    book: 'Corebook',
    page: 223,
    pdfPage: 225
  },
  {
    category: 'rules',
    title: 'Diablerie',
    content: 'The heinous act of consuming another vampire heartblood to steal their power and generation.\nRequires extended contested tests (Strength + Resolve vs victim Resolve + Humanity). Stains and soul corruption follow. Black veins appear in the aura for a year or more.',
    source: 'Corebook, p. 234',
    book: 'Corebook',
    page: 234,
    pdfPage: 236
  }
];

export function compileAllReferences(wikiArticles = []) {
  const list = [...CORE_RULES.map((r, idx) => ({
    id: `core_rule_${idx}`,
    ...r,
    book: r.book || 'Corebook',
    pdfPage: r.pdfPage || (r.page ? r.page + 2 : null)
  }))];

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

  // Merits, Flaws, and Backgrounds
  Object.entries(MERITS_AND_FLAWS).forEach(([catName, catData]) => {
    (catData.merits || []).forEach((m) => {
      list.push({
        id: `merit_${m.id || m.name}`,
        category: 'merits',
        title: `${m.name} (${catName} Merit)`,
        cost: m.dots || null,
        content: `Category: ${catName}\nRating: ${m.dots}\n${m.description}\n${catData.blurb || ''}`,
        source: m.source || catData.blurb || null,
        book: m.book || null,
        page: m.page || null,
        pdfPage: m.pdfPage || null
      });
    });
    (catData.flaws || []).forEach((f) => {
      list.push({
        id: `flaw_${f.id || f.name}`,
        category: 'flaws',
        title: `${f.name} (${catName} Flaw)`,
        cost: f.dots || null,
        content: `Category: ${catName}\nRating: ${f.dots}\n${f.description}\n${catData.blurb || ''}`,
        source: f.source || catData.blurb || null,
        book: f.book || null,
        page: f.page || null,
        pdfPage: f.pdfPage || null
      });
    });

    if (catData.groups) {
      Object.entries(catData.groups).forEach(([groupName, groupData]) => {
        const isBackground = catName.toLowerCase().includes('background');
        (groupData.merits || []).forEach((m) => {
          list.push({
            id: `merit_${m.id || `${groupName}_${m.name}`}`,
            category: isBackground ? 'merits backgrounds' : 'merits',
            title: isBackground && m.name.toLowerCase() === groupName.toLowerCase()
              ? `${m.name} (Background)`
              : `${m.name} (${groupName} Merit)`,
            cost: m.dots || null,
            content: `Category: ${catName} : ${groupName}\nRating: ${m.dots}\n${m.description}\n${catData.blurb || ''}`,
            source: m.source || (m.book && m.page ? `${m.book}, p. ${m.page}` : catData.blurb || null),
            book: m.book || (isBackground ? 'Corebook' : null),
            page: m.page || null,
            pdfPage: m.pdfPage || null
          });
        });
        (groupData.flaws || []).forEach((f) => {
          list.push({
            id: `flaw_${f.id || `${groupName}_${f.name}`}`,
            category: isBackground ? 'flaws backgrounds' : 'flaws',
            title: `${f.name} (${groupName} Flaw)`,
            cost: f.dots || null,
            content: `Category: ${catName} : ${groupName}\nRating: ${f.dots}\n${f.description}\n${catData.blurb || ''}`,
            source: f.source || (f.book && f.page ? `${f.book}, p. ${f.page}` : catData.blurb || null),
            book: f.book || (isBackground ? 'Corebook' : null),
            page: f.page || null,
            pdfPage: f.pdfPage || null
          });
        });
      });
    }
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

  // Alternative Clan Banes & Compulsions (Players Guide)
  Object.entries(ALTERNATIVE_CLAN_BANES).forEach(([clan, data]) => {
    list.push({
      id: `alt_bane_${clan.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      category: 'clans alternative banes',
      clan,
      title: `${clan} Alternative Bane: ${data.baneName}`,
      content: `Clan: ${clan}\nAlternative Bane (${data.baneName}): ${data.bane}\nAlternative Compulsion (${data.compulsionName}): ${data.compulsion}`,
      source: `${data.book}, p. ${data.page}`,
      book: data.book,
      page: data.page,
      pdfPage: data.pdfPage
    });
  });

  // Predator Types
  Object.entries(PREDATOR_TYPES).forEach(([ptKey, pt]) => {
    const isPlayersGuide = ['Grim Reaper', 'Montero', 'Pursuer', 'Trapdoor'].includes(pt.name);
    const isCults = ['Extortionist', 'Graverobber'].includes(pt.name);
    const isAnarch = pt.name === 'Roadside Killer';
    const isMemoriam = pt.name === 'Tithe Collector';
    const book = isPlayersGuide ? 'Players Guide' : isCults ? 'Cults of the Blood Gods' : isAnarch ? 'Anarch' : isMemoriam ? 'In Memoriam' : 'Corebook';
    const page = isPlayersGuide ? (pt.name === 'Grim Reaper' ? 138 : pt.name === 'Montero' ? 140 : pt.name === 'Pursuer' ? 142 : 144)
      : isCults ? (pt.name === 'Extortionist' ? 98 : 99)
      : isAnarch ? 182
      : isMemoriam ? 42
      : (pt.name === 'Alleycat' ? 175 : pt.name === 'Bagger' ? 175 : pt.name === 'Blood Leech' ? 176 : pt.name === 'Cleaver' ? 176 : pt.name === 'Consensualist' ? 177 : pt.name === 'Farmer' ? 177 : pt.name === 'Osiris' ? 177 : pt.name === 'Sandman' ? 177 : pt.name === 'Scene Queen' ? 178 : 178);
    const pdfPage = page + (book === 'Corebook' || book === 'Players Guide' ? 2 : 1);

    list.push({
      id: `pt_${ptKey.toLowerCase().replace(/\s+/g, '_')}`,
      category: 'predator types',
      title: `${pt.name} (Predator Type)`,
      content: `Hunting Style: ${pt.name}\nHunting Pools: ${pt.rolls || 'None'}\n${pt.desc}\nSpecialties: ${pt.picks?.specialty?.join(', ') || 'None'}\nDisciplines: ${pt.picks?.discipline ? pt.picks.discipline().join(', ') : 'None'}`,
      source: `${book}, p. ${page}`,
      book,
      page,
      pdfPage
    });
  });

  // Coterie Types
  Object.entries(COTERIES).forEach(([coterieName, cData]) => {
    const domainStr = cData.domain
      ? Object.entries(cData.domain).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`).join(', ')
      : 'None (Mobile)';
    const reqStr = cData.required
      ? Object.entries(cData.required).map(([k, v]) => `${k} ${v}`).join(', ')
      : 'None';
    const flawsStr = cData.flaws
      ? Object.entries(cData.flaws).map(([k, v]) => `${k} ${v}`).join(', ')
      : 'None';

    list.push({
      id: `coterie_${coterieName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      category: 'coteries',
      title: `${coterieName} (Coterie Type)`,
      content: `Coterie Type: ${coterieName}\nDomain: ${domainStr}\nRequired Advantages: ${reqStr}\nRequired Flaws: ${flawsStr}\nNotes: ${cData.notes || ''}\nPossible Extras: ${cData.extras?.join(', ') || 'None'}`,
      source: 'Corebook, p. 197 / Players Guide, p. 182',
      book: 'Corebook',
      page: 197,
      pdfPage: 199
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
