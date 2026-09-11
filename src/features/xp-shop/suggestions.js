// src/features/xp-shop/suggestions.js
//
// Works out what a given character should spend experience on next.
//
// The whole thing is a pure function: it takes the sheet, the XP balance and
// the cost table, and returns a ranked list of concrete purchases with a
// human-readable reason attached to each one. Nothing here touches the API or
// React, so it can be reasoned about (and tested) on its own.
//
// Ranking model
// -------------
//   need       0..100  how badly this character wants the dot
//   efficiency 0..25   a mild nudge towards cheap buys, so a 3 XP specialty
//                      is not permanently buried under a 25 XP attribute
//   score      need + efficiency
//
// Suggestions the character cannot afford yet are not thrown away — they come
// back separately as "worth saving for", with the shortfall spelled out.

import { PREDATOR_TYPES } from '../../data/predator_types.js';
import { ALL_DISCIPLINE_NAMES } from '../../data/disciplines.js';

const ATTR_GROUPS = {
  Physical: ['Strength', 'Dexterity', 'Stamina'],
  Social: ['Charisma', 'Manipulation', 'Composure'],
  Mental: ['Intelligence', 'Wits', 'Resolve'],
};

const SKILL_GROUPS = {
  Physical: ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival'],
  Social: ['Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge'],
  Mental: ['Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'],
};

const ALL_ATTRS = Object.values(ATTR_GROUPS).flat();
const ALL_SKILLS = Object.values(SKILL_GROUPS).flat();

// Skills that come up in nearly every scene. Sitting on zero dots in one of
// these is a hole worth filling before deepening something already good.
const CORNERSTONE_SKILLS = new Set([
  'Awareness', 'Athletics', 'Brawl', 'Insight', 'Intimidation',
  'Larceny', 'Occult', 'Persuasion', 'Stealth', 'Streetwise', 'Subterfuge',
]);

const MAX_TRAIT = 5;
const MAX_BLOOD_POTENCY = 10;

/* ---------- small readers ---------- */

function attrValue(sheet, name) {
  const n = Number(sheet?.attributes?.[name]);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function readSkill(sheet, name) {
  const raw = sheet?.skills?.[name];
  if (raw && typeof raw === 'object') {
    return {
      dots: Number(raw.dots || 0),
      specialties: Array.isArray(raw.specialties) ? raw.specialties.filter(Boolean) : [],
    };
  }
  return { dots: Number(raw || 0), specialties: [] };
}

// "an Alleycat", "a Sandman" — predator type names are user-facing prose.
export function article(word) {
  return /^[aeiou]/i.test(String(word || '')) ? 'an' : 'a';
}

// Reasons are pushed in descending order of importance, so the two strongest
// are all a card needs — any more and the "why" line stops being skimmable.
function joinReasons(list) {
  const parts = list.filter(Boolean).slice(0, 2);
  if (!parts.length) return '';
  const text = parts.join('; ');
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

/* ---------- predator type profile ---------- */

// The predator type says how a character actually survives night to night.
// Its dice pools and suggested picks are the single best signal we have about
// what this character is *for*, so they carry the most weight below.
export function predatorProfile(sheet, clan) {
  const name = sheet?.predator_type || sheet?.predatorType || '';
  const profile = {
    name,
    attrs: new Set(),
    skills: new Set(),
    huntingAttrs: new Set(),
    huntingSkills: new Set(),
    specialtySkills: new Set(),
    disciplines: new Set(),
    pools: [],
  };
  const type = PREDATOR_TYPES?.[name];
  if (!type) return profile;

  if (Array.isArray(type.huntingPools) && type.huntingPools.length > 0) {
    type.huntingPools.forEach(hp => {
      if (hp.pool) profile.pools.push(hp.pool);
      (hp.attributes || []).forEach(a => {
        if (ALL_ATTRS.includes(a)) {
          profile.huntingAttrs.add(a);
          profile.attrs.add(a);
        }
      });
      (hp.skills || []).forEach(s => {
        if (ALL_SKILLS.includes(s)) {
          profile.huntingSkills.add(s);
          profile.skills.add(s);
        }
      });
    });
  } else if (Array.isArray(type.huntingAttributes) || Array.isArray(type.huntingSkills)) {
    (type.huntingAttributes || []).forEach(a => {
      if (ALL_ATTRS.includes(a)) {
        profile.huntingAttrs.add(a);
        profile.attrs.add(a);
      }
    });
    (type.huntingSkills || []).forEach(s => {
      if (ALL_SKILLS.includes(s)) {
        profile.huntingSkills.add(s);
        profile.skills.add(s);
      }
    });
    if (type.rolls && type.rolls !== '—') profile.pools.push(type.rolls);
  } else {
    String(type.rolls || '').split('•').forEach(pool => {
      const parts = pool.split('+').map(s => s.trim()).filter(Boolean);
      const attrs = parts.filter(p => ALL_ATTRS.includes(p));
      const skills = parts.filter(p => ALL_SKILLS.includes(p));
      if (!attrs.length && !skills.length) return;
      profile.pools.push([...attrs, ...skills].join(' + '));
      attrs.forEach(a => {
        profile.huntingAttrs.add(a);
        profile.attrs.add(a);
      });
      skills.forEach(s => {
        profile.huntingSkills.add(s);
        profile.skills.add(s);
      });
    });
  }

  (type.picks?.specialty || []).forEach(entry => {
    const base = String(entry).split('(')[0].trim();
    if (ALL_SKILLS.includes(base)) {
      profile.specialtySkills.add(base);
    }
  });

  try {
    const picks = type.picks?.discipline;
    const list = typeof picks === 'function' ? picks(clan) : (picks || []);
    (list || []).forEach(d => profile.disciplines.add(d));
  } catch {
    // picks.discipline is allowed to be absent or to throw on odd clans.
  }

  return profile;
}

/* ---------- the algorithm ---------- */

/**
 * @param {object}   args
 * @param {object}   args.ch              character record (needs `clan`)
 * @param {object}   args.sheet           the structured sheet
 * @param {number}   args.xp              current XP balance
 * @param {object}   args.costs           the XP_RULES cost table
 * @param {function} args.disciplineKind  name => 'clan' | 'other' | 'caitiff'
 * @param {number}   [args.limit]         how many affordable picks to return
 */
export function buildSuggestions({ ch, sheet, xp = 0, costs, disciplineKind, limit = 6 }) {
  const empty = { affordable: [], aspirational: [], profile: null };
  if (!ch || !sheet || !costs) return empty;

  const profile = predatorProfile(sheet, ch.clan);
  const out = [];
  const add = (s) => {
    if (!s || !Number.isFinite(s.cost) || s.cost <= 0) return;
    out.push({ ...s, score: s.need + Math.max(0, 25 - s.cost), affordable: xp >= s.cost });
  };

  const willpower = attrValue(sheet, 'Composure') + attrValue(sheet, 'Resolve');

  /* --- Attributes --- */
  for (const [group, names] of Object.entries(ATTR_GROUPS)) {
    const groupTop = Math.max(...names.map(n => attrValue(sheet, n)));
    for (const attr of names) {
      const current = attrValue(sheet, attr);
      if (current >= MAX_TRAIT) continue;
      const next = current + 1;
      const why = [];
      let need = 18;

      if (profile.huntingAttrs.has(attr) && current < 4) {
        need += 30;
        why.push(`it drives your ${profile.name} feeding pool${profile.pools[0] ? ` (${profile.pools[0]})` : ''}`);
      }
      if (attr === 'Stamina' && current < 3) {
        need += 26;
        why.push('every dot of Stamina is another box on your Health track');
      }
      if ((attr === 'Composure' || attr === 'Resolve') && willpower < 5) {
        need += 22;
        why.push(`your Willpower pool is only ${willpower}`);
      }
      if (current === 1) {
        need += 24;
        why.push('at one dot you are rolling nearly blind whenever it comes up');
      }
      if (current === 4 && current === groupTop) {
        need += 12;
        why.push(`it caps off your strongest ${group} attribute`);
      }

      add({
        kind: 'attribute',
        id: `attribute:${attr}`,
        target: attr,
        title: `${attr} (${current})`,
        subtitle: `Raise to ${next}`,
        current,
        next,
        cost: costs.attribute(next),
        need: Math.min(need, 100),
        reason: joinReasons(why) || `A solid, general-purpose ${group.toLowerCase()} improvement.`,
      });
    }
  }

  /* --- Skills --- */
  for (const [group, names] of Object.entries(SKILL_GROUPS)) {
    const attrTop = Math.max(...ATTR_GROUPS[group].map(n => attrValue(sheet, n)));
    for (const skill of names) {
      const { dots, specialties } = readSkill(sheet, skill);
      if (dots >= MAX_TRAIT) continue;
      const next = dots + 1;
      const why = [];
      let need = 12;

      if (profile.huntingSkills.has(skill)) {
        need += 30;
        why.push(`${article(profile.name)} ${profile.name} leans on ${skill} to feed`);
      } else if (profile.specialtySkills.has(skill)) {
        need += 14;
        why.push(`it aligns with your ${profile.name} predator archetype`);
      }
      if (dots === 0 && CORNERSTONE_SKILLS.has(skill)) {
        need += 22;
        why.push('you have no dots in it at all, and it comes up constantly');
      }
      if (dots >= 3 && specialties.length) {
        need += 16;
        why.push(`you already specialise in ${specialties[0]}`);
      }
      if (attrTop >= 4) {
        need += 10;
        why.push(`it is backed by your strong ${group} attributes`);
      }
      if (dots === 4) need += 6;

      add({
        kind: 'skill',
        id: `skill:${skill}`,
        target: skill,
        title: `${skill} (${dots})`,
        subtitle: `Raise to ${next}`,
        current: dots,
        next,
        cost: costs.skill(next),
        need: Math.min(need, 100),
        reason: joinReasons(why) || 'Cheap, broadly useful, and it widens the pools you already roll.',
      });
    }
  }

  /* --- Specialties (flat 3 XP, a permanent extra die) --- */
  for (const skill of ALL_SKILLS) {
    const { dots, specialties } = readSkill(sheet, skill);
    if (dots < 2 || specialties.length) continue;
    const why = [];
    let need = 20;
    if (profile.huntingSkills.has(skill)) {
      need += 22;
      why.push(`${skill} is central to how you hunt and has nothing sharpening it`);
    } else if (profile.specialtySkills.has(skill)) {
      need += 14;
      why.push(`it fits your ${profile.name} predator style`);
    }
    if (dots >= 4) {
      need += 14;
      why.push(`${skill} ${dots} is one of your best skills and has no specialty yet`);
    }
    why.push('three experience buys a permanent extra die on the slice of it you use most');
    add({
      kind: 'specialty',
      id: `specialty:${skill}`,
      target: skill,
      title: `${skill} Specialty`,
      subtitle: 'Add a specialty',
      current: dots,
      next: dots,
      cost: costs.specialty(),
      need: Math.min(need, 100),
      reason: joinReasons(why),
    });
  }

  /* --- Disciplines ---
     Out-of-clan disciplines need a Storyteller to hand them over in this
     chronicle, so they are never suggested as something to go and buy. */
  const knownDiscDots = ALL_DISCIPLINE_NAMES
    .map(n => Number(sheet?.disciplines?.[n] || 0))
    .filter(n => n > 0);
  const topDisc = knownDiscDots.length ? Math.max(...knownDiscDots) : 0;

  for (const name of ALL_DISCIPLINE_NAMES) {
    const kind = typeof disciplineKind === 'function' ? disciplineKind(name) : 'other';
    if (kind === 'other') continue;
    const current = Number(sheet?.disciplines?.[name] || 0);
    if (current >= MAX_TRAIT) continue;
    const next = current + 1;
    const cost = kind === 'caitiff' ? costs.disciplineCaitiff(next) : costs.disciplineClan(next);
    const why = [];
    let need = 26;

    if (current > 0 && current === topDisc) {
      need += 22;
      why.push('it is already your deepest discipline and depth beats breadth in play');
    }
    if (current === 0) {
      need += 18;
      why.push(kind === 'caitiff'
        ? 'you have never touched it and Caitiff can learn any discipline'
        : 'it is in-clan and you have never touched it');
    }
    if (profile.disciplines.has(name)) {
      need += 14;
      why.push(`your ${profile.name} predator type points straight at it`);
    }
    if ((name === 'Blood Sorcery' || name === 'Oblivion') && current >= 1) {
      need += 10;
      why.push(`it unlocks level ${next} ${name === 'Oblivion' ? 'ceremonies' : 'rituals'}`);
    }
    if (name === 'Fortitude' && attrValue(sheet, 'Stamina') <= 2) {
      need += 8;
      why.push('your Health track is fragile');
    }

    add({
      kind: 'discipline',
      id: `discipline:${name}`,
      target: name,
      disciplineKind: kind,
      title: current > 0 ? `${name} (${current})` : name,
      subtitle: current > 0 ? `Raise to ${next} • ${kind}` : `Buy • ${kind}`,
      current,
      next,
      cost,
      need: Math.min(need, 100),
      reason: joinReasons(why),
    });
  }

  /* --- Blood Potency --- */
  const bp = Number(sheet?.blood_potency ?? 1);
  if (bp < MAX_BLOOD_POTENCY) {
    const next = bp + 1;
    const cost = costs.bloodPotency(next);
    const why = [];
    let need = 8;
    if (xp >= cost * 2) {
      need += 20;
      why.push('you have experience to spare, and this lifts your Blood Surge, mending and every discipline at once');
    }
    if (bp <= 1) {
      need += 8;
      why.push('at this Potency your Blood barely does anything for you');
    }
    add({
      kind: 'blood_potency',
      id: 'blood_potency',
      target: 'Blood Potency',
      title: `Blood Potency (${bp})`,
      subtitle: `Raise to ${next}`,
      current: bp,
      next,
      cost,
      need: Math.min(need, 100),
      reason: joinReasons(why) || 'A long-term investment — expensive now, but it improves everything your Blood does.',
    });
  }

  /* --- Backgrounds pointer ---
     Backgrounds are bought through the Merits & Flaws tab, so this one is a
     signpost rather than a one-click purchase. */
  const backgrounds = Array.isArray(sheet?.backgrounds) ? sheet.backgrounds : [];
  if (backgrounds.length < 2) {
    add({
      kind: 'merits',
      id: 'merits:backgrounds',
      target: 'Backgrounds',
      title: 'Backgrounds & Merits',
      subtitle: backgrounds.length ? 'Round out your footing' : 'You have almost none',
      current: backgrounds.length,
      next: backgrounds.length + 1,
      cost: costs.advantageDot(1),
      need: 34,
      reason: joinReasons([
        'backgrounds are the cheapest way to turn experience into story leverage',
        'Resources / Contacts / Allies / Herd open doors that no amount of dots on the sheet will',
      ]),
    });
  }

  /* --- rank, then pick with a little variety --- */
  out.sort((a, b) => b.score - a.score || a.cost - b.cost);

  const pick = (pool, count, perKind) => {
    const chosen = [];
    const seen = {};
    for (const s of pool) {
      if (chosen.length >= count) break;
      const used = seen[s.kind] || 0;
      if (used >= perKind) continue;
      seen[s.kind] = used + 1;
      chosen.push(s);
    }
    // If the per-kind cap left us short, top up from whatever is left, then
    // put the whole thing back in score order so the ranking reads straight.
    if (chosen.length < count) {
      const taken = new Set(chosen);
      for (const s of pool) {
        if (chosen.length >= count) break;
        if (!taken.has(s)) { taken.add(s); chosen.push(s); }
      }
    }
    chosen.sort((a, b) => b.score - a.score || a.cost - b.cost);
    return chosen;
  };

  const affordable = pick(out.filter(s => s.affordable), limit, 2)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  const aspirational = pick(
    out.filter(s => !s.affordable).sort((a, b) => b.need - a.need || a.cost - b.cost),
    3,
    2,
  ).map(s => ({ ...s, shortfall: s.cost - xp }));

  return { affordable, aspirational, profile };
}

export default buildSuggestions;
