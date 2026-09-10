import React, { useEffect, useMemo, useState, useContext } from 'react';
import api from '../../core/api';
import { AuthCtx } from '../../core/AuthContext';
import Avatar from '../../components/Avatar';
import { DISCIPLINES, iconPath, ALL_DISCIPLINE_NAMES } from '../../data/disciplines';
import { symlogo } from '../../data/clans';
import { clanRef } from '../../data/clanReference';
import { powerMechanics, resolveMechAmount } from '../../data/disciplineMechanics';
import {
  COMMON_ROLLS,
  computeOutcome,
  disciplineRequiresRouse,
  getPoolFromCharacter,
  rerollNormalDice,
  rollPool,
  runRouseCheck,
  summarizeTrackers,
  getBloodPotencyStats
} from '../../utils/liveSessionMechanics';
import { getLiveSession, joinLiveSession, logLiveSessionRoll, getLiveSessionBroadcasts, getLiveSessionRolls, socket, sendLiveSessionSignal } from '../../api/liveSession';
import LiveSessionPlayerList from './LiveSessionPlayerList';
import LiveSessionRollHistory from './LiveSessionRollHistory';
import LiveSessionAdminDashboard from '../admin/LiveSessionDashboard';
import styles from '../../styles/LiveSession.module.css';

function TrackerBlock({ label, val, max, agg = 0, sup = 0, filled = 0, stains = 0 }) {
  if (label === 'Hunger') {
    const drops = [];
    for (let i = 0; i < max; i++) {
      const isFilled = i < filled;
      drops.push(
        <span key={i} className={`material-symbols-outlined ${styles.hungerDroplet} ${isFilled ? styles.active : ''}`}>
          water_drop
        </span>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
        <div className={styles.trackerLabel} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{label}</span>
          <span style={{ fontWeight: 'normal', color: 'var(--primary)' }}>{val} / {max}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>{drops}</div>
      </div>
    );
  }

  const boxes = [];
  for (let i = 0; i < max; i++) {
    let content = '';
    let isFilled = false;

    if (agg > 0 || sup > 0) {
      if (i < agg) content = 'X';
      else if (i < agg + sup) content = '/';
    } else {
      if (i < filled) isFilled = true;
      if (i >= max - stains) content = '/';
    }

    boxes.push(
      <div
        key={i}
        className={`${styles.trackerSquare} ${isFilled ? styles.filled : ''}`}
      >
        {content}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
      <div className={styles.trackerLabel} style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>{val}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{boxes}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STATIC DATA
───────────────────────────────────────────── */
const HUMANITY_DATA = {
  10: { label: 'Humanity 10', desc: ['Humans with this score are rare, making vampires with this score even rarer.', 'Blush of Life is not needed to blend into mortal society — they appear as a pale and healthy mortal.', 'They heal Superficial Damage as a mortal in addition to standard healing.', 'Food is able to be tasted, eaten, and digested as a human.', 'Able to stay awake during the day as if human, though they still must sleep at some point.', 'Sunlight damage is halved.'] },
  9: { label: 'Humanity 9', desc: ['Kindred with this rating tend to be more humane than most humans.', 'Without Blush of Life they appear ill.', 'They heal Superficial Damage as a mortal in addition to standard healing.', 'Taste, eat and digest rare or raw meat and many liquids.', 'Rise from day-sleep up to an hour before sunset and stay awake an hour after dawn.', 'Torpor length: Three days.'] },
  8: { label: 'Humanity 8', desc: ['They are still able to comprehend and feel the pain from the anguish they cause.', 'Two dice are used for the Blush of Life checks, taking the highest result.', 'With Blush of Life, they can digest and taste wine.', 'Rise from day-sleep an hour before sunset.', 'Torpor length: One week.'] },
  7: { label: 'Humanity 7', desc: ['Kindred can pass for mortal, still subscribing to the strongest social norms.', 'Blush of Life requires a Rouse Check.', 'Can fake sexual intercourse by winning a Dexterity + Charisma test versus the partner\'s Composure or Wits.', 'Without Blush of Life, food and drink cause vomiting.', 'Torpor length: Two weeks.'] },
  6: { label: 'Humanity 6', desc: ['Not horrific monsters, but will do what they need to survive regardless of cost.', 'Take a one die penalty to the pool for faking sexual intercourse.', 'Even with Blush of Life, must make a Composure + Stamina test against Difficulty 3 to keep food and drink down.', 'Torpor length: One month.'] },
  5: { label: 'Humanity 5', desc: ['At this level most Kindred only care for their Touchstones, and may manifest minor physical eeriness.', 'Take a one die penalty in rolls to interact with mortals. Does not apply to intimidation, hunting, or supernatural Subterfuge.', 'Take a two dice penalty to the pool for faking sexual intercourse.', 'Torpor length: One year.'] },
  4: { label: 'Humanity 4', desc: ['Kindred may have accepted the inevitable downwards spiral. Physically they appear more corpse-like.', 'Take a two dice penalty to interact with mortals.', 'Even with Blush of Life, can no longer keep food and drink down.', 'Torpor length: One decade.'] },
  3: { label: 'Humanity 3', desc: ['Scrapping near the bottom — pragmatic route, whatever it takes.', 'Take a four dice penalty to interact with mortals.', 'Can no longer fake sexual intercourse.', 'Torpor length: Five decades.'] },
  2: { label: 'Humanity 2', desc: ['With twisted hobbies that please only them, Kindred have no care for others.', 'Take a six dice penalty to interact with mortals (four with Blush of Life).', 'Torpor length: One century.'] },
  1: { label: 'Humanity 1', desc: ['Teetering on the edge — only caring for survival.', 'Take an eight dice penalty to interact with mortals (five with Blush of Life).', 'Torpor length: Five centuries.'] },
  0: { label: 'Humanity 0 — Wassail', desc: ['The Beast has taken control; leaving the character in a final Rötschreck Frenzy called Wassail.', 'Physical Attributes all buffed to 5.', 'If they survive this final scene, they become a wight and are taken control of by the Storyteller as an SPC.'] },
};

const FRENZY_TYPES = [
  { key: 'fury', label: 'Fury Frenzy', color: '#dc2626', icon: '🔥', desc: 'Caused by insults or aggressive risks.' },
  { key: 'hunger', label: 'Hunger Frenzy', color: '#f97316', icon: '🩸', desc: 'Triggered when failing a Rouse Check at Hunger 5.' },
  { key: 'terror', label: 'Terror Frenzy', color: '#7c3aed', icon: '💀', desc: 'Also known as Rötschreck. Appears in moments of true danger.' },
];

const ATTRIBUTE_GROUPS = {
  Physical: ['Strength', 'Dexterity', 'Stamina'],
  Social: ['Charisma', 'Manipulation', 'Composure'],
  Mental: ['Intelligence', 'Wits', 'Resolve'],
};

const SKILL_GROUPS = {
  Physical: ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival'],
  Social: ['Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge'],
  Mental: ['Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'],
};

const ATTR_SET  = new Set(Object.values(ATTRIBUTE_GROUPS).flat());
const SKILL_SET  = new Set(Object.values(SKILL_GROUPS).flat());
const PHYS_TRAITS = new Set([...ATTRIBUTE_GROUPS.Physical, ...SKILL_GROUPS.Physical]);
const MENTAL_SOCIAL_TRAITS = new Set([
  ...ATTRIBUTE_GROUPS.Social, ...ATTRIBUTE_GROUPS.Mental,
  ...SKILL_GROUPS.Social, ...SKILL_GROUPS.Mental,
]);
const isDisciplineTrait = (t) => ALL_DISCIPLINE_NAMES.includes(t) || /alchemy/i.test(t);

// Discipline powers store their activation roll as e.g. "Charisma + Presence",
// "Wits/Resolve + Auspex", "— (…)", or "As power". Return [attr, trait] when it
// is a real pool we can roll, else null.
function parseDicePool(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (!s || s === '—' || s.startsWith('—') || /^as power/i.test(s)) return null;
  const parts = s.split('+').map(x => x.trim());
  if (parts.length < 2) return null;
  const norm = (t) => t.split('/')[0].replace(/\(.*$/, '').trim();
  const t1 = norm(parts[0]);
  const t2 = norm(parts[1]);
  const ok1 = ATTR_SET.has(t1) || SKILL_SET.has(t1);
  const ok2 = ATTR_SET.has(t2) || SKILL_SET.has(t2) || isDisciplineTrait(t2);
  return (ok1 && ok2) ? [t1, t2] : null;
}

// How many Rouse Checks the power's cost line calls for (0, 1 or 2).
function disciplineRouseCost(power) {
  const c = String(power?.cost || '').toLowerCase();
  if (!/rouse/.test(c)) return 0;
  if (/\b(two|2)\b[^.]*rouse/.test(c) || /rouse[^.]*\b(x\s*2|twice)\b/.test(c)) return 2;
  return 1;
}

const FRENZY_ALERTS = {
  fury: { label: 'Fury Frenzy', color: '#dc2626', desc: 'Your character is consumed by blind rage. The Beast dictates your actions.' },
  hunger: { label: 'Hunger Frenzy', color: '#f97316', desc: 'The thirst overtakes you. You are driven to hunt and slake your hunger immediately.' },
  terror: { label: 'Terror Frenzy', color: '#7c3aed', desc: 'Overwhelming panic freezes or scatters you. The Rot takes hold.' }
};

const DISC_ICON_MAP = {
  Animalism: 'Animalism-rombo.png',
  Auspex: 'Auspex-rombo.png',
  'Blood Sorcery': 'Blood-Sorcery-rombo.png',
  Celerity: 'Celerity-rombo.png',
  Dominate: 'Dominate-rombo.png',
  Fortitude: 'Fortitude-rombo.png',
  Obfuscate: 'Obfuscate-rombo.png',
  Oblivion: 'Oblivion-rombo.png',
  Potence: 'Potence-rombo.png',
  Presence: 'Presence-rombo.png',
  Protean: 'Protean-rombo.png',
  Thaumaturgy: 'Thaumaturgy-rombo.png',
  'Thin-blood Alchemy': 'Thin-blood-Alchemy-rombo.png',
};

const discIcon = (name) => {
  const file = DISC_ICON_MAP[name] || (typeof iconPath === 'function' ? iconPath(name) : null);
  return file ? `/img/disciplines/${file}` : null;
};

// While frenzied the Beast only permits physical Disciplines (V5 core).
const FRENZY_PERMITTED_DISCIPLINES = ['Celerity', 'Potence', 'Fortitude', 'Protean'];

/* ─────────────────────────────────────────────
   HELPERS & MODALS
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function LiveSession() {
  const { user } = useContext(AuthCtx);
  const [character, setCharacter] = useState(null);
  const [characterChecked, setCharacterChecked] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [trackers, setTrackers] = useState(null);
  const [sessionId, setSessionId] = useState(localStorage.getItem('liveSessionId') || '');
  const [session, setSession] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);

  const isAdmin = session?.isAdmin || user?.role === 'admin' || character?.isST;
  const [mobileTab, setMobileTab] = useState('action');
  const [showBlushModal, setShowBlushModal] = useState(false);

  const [specialtyActive, setSpecialtyActive] = useState(false);
  const [selectedTraits, setSelectedTraits] = useState(['Wits', 'Awareness']);
  const [lastRoll, setLastRoll] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [wpSelections, setWpSelections] = useState([]);
  const [bloodSurgeActive, setBloodSurgeActive] = useState(false);
  const [situationalMod, setSituationalMod] = useState(0);
  const [modReason, setModReason] = useState('');
  const [activeEffectIds, setActiveEffectIds] = useState([]);
  const [wpIgnoreImpair, setWpIgnoreImpair] = useState(false);
  const [compulsionPrompt, setCompulsionPrompt] = useState(null);
  const [showAdminTab, setShowAdminTab] = useState('feed'); // 'feed' | 'players'
  const [connStatus, setConnStatus] = useState('');
  const [signalNote, setSignalNote] = useState('');
  const [handRaised, setHandRaised] = useState(false);

  // Discipline state
  const [activeDisc, setActiveDisc] = useState(null);
  const [hiddenRollsActive, setHiddenRollsActive] = useState(false);
  const [expandedPower, setExpandedPower] = useState(null);
  const [runningPowers, setRunningPowers] = useState([]);
  const [sessionRuntime, setSessionRuntime] = useState('00:00:00');

  const bpStats = useMemo(() => getBloodPotencyStats(trackers?.bloodPotency || 1), [trackers?.bloodPotency]);

  // Effects the Storyteller has attached to this character (Awe +3, Dread Gaze -2…).
  const myEffects = useMemo(
    () => (session?.metadata?.activeEffects?.[character?.id] || []).filter(e => Number(e.mod)),
    [session?.metadata?.activeEffects, character?.id]
  );

  // Dice modifiers granted by discipline powers the player currently has running.
  const powerMods = useMemo(() => runningPowers
    .map(rp => {
      const m = powerMechanics(rp.id)?.dicePoolMod;
      if (!m) return null;
      const amt = resolveMechAmount(m.amount, sheet);
      return amt ? { id: `pw-${rp.id}`, label: rp.name, mod: amt, target: m.target } : null;
    })
    .filter(Boolean), [runningPowers, sheet]);

  const currentPool = useMemo(() => {
    const trait1 = selectedTraits[0] || null;
    const trait2 = selectedTraits[1] || null;
    let pool = getPoolFromCharacter(sheet, trait1, trait2);

    // Add Discipline Power Bonus if rolling a Discipline
    const hasDiscipline = (trait1 && sheet?.disciplines?.[trait1] !== undefined) || (trait2 && sheet?.disciplines?.[trait2] !== undefined);
    if (hasDiscipline) pool += bpStats.disciplineBonus;

    if (bloodSurgeActive) pool += bpStats.surgeBonus;
    if (specialtyActive) pool += 1;
    pool += Number(situationalMod) || 0;
    for (const e of myEffects) if (activeEffectIds.includes(e.id)) pool += Number(e.mod) || 0;
    for (const pm of powerMods) if (activeEffectIds.includes(pm.id)) pool += Number(pm.mod) || 0;

    // V5 Impairment: −2 to Physical (Health) / Social & Mental (Willpower) pools.
    // The Beast ignores pain during frenzy; a spent Willpower can also negate it.
    if (trackers && !sheet?.frenzyState && !wpIgnoreImpair) {
      if (trackers.healthImpaired && (PHYS_TRAITS.has(trait1) || PHYS_TRAITS.has(trait2))) pool -= 2;
      if (trackers.willpowerImpaired && (MENTAL_SOCIAL_TRAITS.has(trait1) || MENTAL_SOCIAL_TRAITS.has(trait2))) pool -= 2;
    }
    // Degeneration: −2 to everything.
    if (trackers?.degeneration && !sheet?.frenzyState) pool -= 2;

    return Math.max(0, pool);
  }, [sheet, selectedTraits, bloodSurgeActive, bpStats.surgeBonus, bpStats.disciplineBonus, specialtyActive, situationalMod, myEffects, powerMods, activeEffectIds, wpIgnoreImpair, trackers]);

  const activePowers = useMemo(() => {
    if (!activeDisc || !DISCIPLINES[activeDisc]) return [];

    const owned = sheet?.disciplinePowers?.[activeDisc];
    if (!Array.isArray(owned) || owned.length === 0) return [];

    const ownedIds = owned.map(o => String(o.id || o.name).toLowerCase().replace(/[^a-z0-9]/g, ''));

    let powers = [];
    const levels = DISCIPLINES[activeDisc].levels || {};

    for (let i = 1; i <= 5; i++) {
      if (levels[i]) {
        const matches = levels[i].filter(p => ownedIds.includes(String(p.id || p.name).toLowerCase().replace(/[^a-z0-9]/g, '')));
        powers = powers.concat(matches.map(p => ({ ...p, level: i })));
      }
    }
    return powers;
  }, [activeDisc, sheet?.disciplinePowers]);

  // Non-physical Discipline selected while frenzied — the roll is still allowed
  // (the ST has the final say) but the player is warned it breaks V5 rules.
  const frenzyBlockedTrait = useMemo(() => {
    if (!sheet?.frenzyState) return null;
    return selectedTraits.find(t =>
      sheet?.disciplines?.[t] !== undefined && !FRENZY_PERMITTED_DISCIPLINES.includes(t)
    ) || null;
  }, [sheet?.frenzyState, sheet?.disciplines, selectedTraits]);

  const toggleTrait = (trait) => {
    setSelectedTraits(prev => {
      if (prev.includes(trait)) return prev.filter(t => t !== trait);
      if (prev.length >= 2) return [prev[1], trait];
      return [...prev, trait];
    });
  };

  const loadCharacter = async () => {
    const { data } = await api.get('/characters/me');
    const char = data.character ?? null;
    if (!char) { setCharacterChecked(true); return; }
    const parsedSheet = typeof char.sheet === 'string' ? JSON.parse(char.sheet) : char.sheet;
    setCharacter(char);
    setSheet(parsedSheet);
    setTrackers(summarizeTrackers(parsedSheet));
    setCharacterChecked(true);
  };

  useEffect(() => { loadCharacter(); }, []);

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const [sData, bData, rData, pData] = await Promise.all([
          getLiveSession(sessionId).catch(() => ({})),
          getLiveSessionBroadcasts(sessionId).catch(() => ({ broadcasts: [] })),
          getLiveSessionRolls(sessionId).catch(() => ({ rolls: [] })),
          api.get(`/live-session/${sessionId}/players`).then(res => res.data).catch(() => ({ players: [] }))
        ]);

        const sessionObj = sData.session || sData || {};
        sessionObj.players = pData.players || [];
        setSession(sessionObj);

        const bList = bData.broadcasts || bData.messages || [];
        const rList = rData.rolls || rData || [];

        const combined = [...bList, ...rList].sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
        setBroadcasts(combined);
      } catch (e) { }
    };
    load();
    // ST tracker adjustments (hunger, health, frenzy, etc.) land on our own character row too —
    // refresh it alongside the session so changes made by the Storyteller actually show up here.
    const onRefresh = () => { load(); loadCharacter(); };
    const rejoin = () => socket.emit('join_session', sessionId);
    rejoin();
    socket.on('connect', rejoin);
    socket.on('refresh_session', onRefresh);
    return () => {
      socket.off('refresh_session', onRefresh);
      socket.off('connect', rejoin);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!session?.created_at && !session?.createdAt) return;
    const startTimeStr = session.created_at || session.createdAt;
    const start = new Date(startTimeStr).getTime();

    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      if (diff < 0) return;
      const h = Math.floor(diff / 3600).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setSessionRuntime(`${h}:${m}:${s}`);
    };

    tick();
    const int = setInterval(tick, 1000);
    return () => clearInterval(int);
  }, [session?.created_at, session?.createdAt]);

  const applySheetUpdate = async (mutator) => {
    setSheet(prev => {
      const next = mutator(JSON.parse(JSON.stringify(prev || {})));
      setTrackers(summarizeTrackers(next));
      if (character) api.put('/characters/me', { ...character, sheet: next });
      return next;
    });
  };

  const pushRoll = async (type, payload) => {
    if (sessionId) {
      const enrichedPayload = {
        ...payload,
        character_name: payload.character_name || character?.name || sheet?.name || 'Unknown',
        is_hidden: hiddenRollsActive
      };
      await logLiveSessionRoll(sessionId, enrichedPayload).catch(() => { });
    }
  };

  // Messy Critical / Bestial Failure — the Beast acts out. Prompt the player to
  // pick a Compulsion (V5 core: general four + clan-specific).
  const maybeCompulsion = (outcome) => {
    if (outcome?.hasMessyCritical) setCompulsionPrompt({ kind: 'messy' });
    else if (outcome?.hasBestialFailure) setCompulsionPrompt({ kind: 'bestial' });
  };

  const GENERAL_COMPULSIONS = [
    { name: 'Hunger', text: 'You must feed. −2 to any action that does not bring you closer to slaking a full Rouse of Hunger.' },
    { name: 'Dominance', text: 'You must assert control. −2 to any action not spent bending someone to your will.' },
    { name: 'Harm', text: 'You must lash out. −2 to any action not spent inflicting physical or emotional pain.' },
    { name: 'Paranoia', text: 'You must reach safety. −2 to any action not spent reinforcing your security or fleeing.' },
  ];

  const setCompulsion = async (text) => {
    setCompulsionPrompt(null);
    await applySheetUpdate(next => { next.compulsion = text || null; return next; });
  };

  // Heal Superficial: one Rouse Check, then remove Mend Amount levels (V5).
  const mendSuperficialSelf = async () => {
    if (!trackers || trackers.health.superficial <= 0) return;
    setMobileTab('action');
    setIsRolling(true);
    await handleRouse('mend_rouse', null, true);
    await applySheetUpdate(next => {
      next.health = next.health || { superficial: 0, aggravated: 0 };
      next.health.superficial = Math.max(0, (Number(next.health.superficial) || 0) - bpStats.mendAmount);
      return next;
    });
    setTimeout(() => setIsRolling(false), 1500);
  };

  // Heal 1 Aggravated: three Rouse Checks at the start of the night (V5).
  const mendAggravatedSelf = async () => {
    if (!trackers || trackers.health.aggravated <= 0) return;
    setMobileTab('action');
    setIsRolling(true);
    for (let i = 0; i < 3; i += 1) await handleRouse('mend_rouse', null, true);
    await applySheetUpdate(next => {
      next.health = next.health || { superficial: 0, aggravated: 0 };
      next.health.aggravated = Math.max(0, (Number(next.health.aggravated) || 0) - 1);
      return next;
    });
    setTimeout(() => setIsRolling(false), 1500);
  };

  // Spend 1 Superficial Willpower for a rules-defined effect.
  const spendWillpower = async (why) => {
    if (trackers.willpower.superficial + trackers.willpower.aggravated >= trackers.willpower.max) return;
    try {
      const { data } = await api.post(`/characters/${character.id}/spend-wp`);
      setSheet(data.sheet);
      setTrackers(summarizeTrackers(data.sheet));
    } catch (e) { /* best effort */ }
    if (why === 'ignore_impairment') {
      setWpIgnoreImpair(true);
      setSignalNote('Willpower spent — impairment ignored for this roll.');
    } else if (why === 'frenzy_control') {
      setSignalNote('Willpower spent — you act freely this turn.');
    }
    setTimeout(() => setSignalNote(''), 3000);
  };

  const executeRoll = async (pool, type, note) => {
    setMobileTab('action');
    setIsRolling(true);
    let currentHunger = trackers?.hunger ?? 0;

    let finalNote = note;
    if (specialtyActive) finalNote += ' (Specialty)';
    const usedEffects = [...myEffects, ...powerMods].filter(e => activeEffectIds.includes(e.id));
    for (const e of usedEffects) finalNote += ` (${e.label} ${Number(e.mod) > 0 ? '+' : ''}${e.mod})`;
    if (Number(situationalMod)) finalNote += ` (${situationalMod > 0 ? '+' : ''}${situationalMod}${modReason ? ` ${modReason}` : ''})`;
    setSituationalMod(0);
    setModReason('');
    setActiveEffectIds([]);
    setWpIgnoreImpair(false);

    // Process Blood Surge immediately
    if (bloodSurgeActive) {
      const rouseResult = runRouseCheck(currentHunger);
      currentHunger = rouseResult.nextHunger;
      await applySheetUpdate(next => { next.hunger = currentHunger; return next; });
      setBloodSurgeActive(false);
      setSpecialtyActive(false);

      await pushRoll('blood_surge', {
        characterId: character?.id, roll_type: 'blood_surge', pool: 1,
        hunger: currentHunger,
        results: { normal: [], rouse: [rouseResult.die] },
        successes: rouseResult.success ? 1 : 0,
        note: rouseResult.success ? 'Blood Surge: No hunger gained' : 'Blood Surge: Hunger +1',
      });
      finalNote += ' (Blood Surge)';
    } else {
      setSpecialtyActive(false);
    }

    const roll = rollPool(pool, currentHunger, 0);
    setLastRoll({ ...roll, type, note: finalNote });
    setWpSelections([]);
    maybeCompulsion(roll.outcome);

    await pushRoll(type, {
      characterId: character?.id, roll_type: type,
      pool: roll.pool, hunger: roll.hunger,
      results: { normal: roll.normalDice, hunger: roll.hungerDice },
      successes: roll.outcome.successes,
      has_critical: roll.outcome.hasCritical,
      has_messy_critical: roll.outcome.hasMessyCritical,
      has_bestial_failure: roll.outcome.hasBestialFailure,
      note: finalNote,
    });

    // Animate slot machine for 1.5s
    setTimeout(() => {
      setIsRolling(false);
    }, 1500);
  };

  // The ST asked for a specific pool. The player can't retune the traits or add
  // their own specialty — the ST already decided both. Impairment, Hunger, the
  // Blood Potency Discipline bonus and any ST-granted specialty still apply.
  const resolveRollRequest = async (req) => {
    setMobileTab('action');
    setIsRolling(true);

    const t1 = req.trait1, t2 = req.trait2;
    let pool = getPoolFromCharacter(sheet, t1, t2);
    const hasDiscipline = (sheet?.disciplines?.[t1] !== undefined) || (sheet?.disciplines?.[t2] !== undefined);
    if (hasDiscipline) pool += bpStats.disciplineBonus;
    if (req.specialty) pool += 1;

    if (trackers && !sheet?.frenzyState) {
      const phys = ['Strength', 'Dexterity', 'Stamina', 'Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival'];
      if (trackers.health.superficial + trackers.health.aggravated >= trackers.health.max
        && (phys.includes(t1) || phys.includes(t2))) pool -= 2;
      if (trackers.willpower.superficial + trackers.willpower.aggravated >= trackers.willpower.max
        && (!phys.includes(t1) || !phys.includes(t2))) pool -= 2;
    }
    pool = Math.max(0, pool);

    const hunger = trackers?.hunger ?? 0;
    const roll = rollPool(pool, hunger, req.difficulty || 0);
    const label = `${t1} + ${t2}${req.specialty ? ` + ${req.specialty}` : ''}`;
    setLastRoll({ ...roll, type: 'requested_roll', note: `Storyteller's request: ${label}` });
    setWpSelections([]);
    maybeCompulsion(roll.outcome);

    await pushRoll('requested_roll', {
      characterId: character?.id, roll_type: 'requested_roll',
      pool: roll.pool, hunger: roll.hunger, difficulty: req.difficulty || 0,
      results: { normal: roll.normalDice, hunger: roll.hungerDice },
      successes: roll.outcome.successes,
      has_critical: roll.outcome.hasCritical,
      has_messy_critical: roll.outcome.hasMessyCritical,
      has_bestial_failure: roll.outcome.hasBestialFailure,
      note: `[${req.id.slice(-6)}] ${label}${req.difficulty ? ` · Diff ${req.difficulty}` : ''}${req.specialty ? ' (Specialty)' : ''}${req.note ? ` — ${req.note}` : ''}`,
    });

    setTimeout(() => setIsRolling(false), 1500);
  };

  const handleWillpowerReroll = async () => {
    if (!lastRoll || !wpSelections.length ||
      trackers.willpower.superficial + trackers.willpower.aggravated >= trackers.willpower.max) return;

    setMobileTab('action');
    setIsRolling(true);

    try {
      const { data } = await api.post(`/characters/${character.id}/spend-wp`);
      setSheet(data.sheet);
      setTrackers(summarizeTrackers(data.sheet));

      const { rerolled } = rerollNormalDice(lastRoll.normalDice, wpSelections);
      const outcome = computeOutcome(rerolled, lastRoll.hungerDice, lastRoll.difficulty);
      const updated = { ...lastRoll, normalDice: rerolled, outcome, note: 'Willpower Reroll' };

      setLastRoll(updated);
      setWpSelections([]);

      await pushRoll('willpower_reroll', {
        characterId: character?.id, roll_type: 'willpower_reroll',
        pool: updated.pool, hunger: updated.hunger,
        results: { normal: updated.normalDice, hunger: updated.hungerDice },
        successes: updated.outcome.successes, note: 'Spent 1 WP',
      });
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      setIsRolling(false);
    }, 1500);
  };

  const handleRouse = async (source = 'rouse_check', autoActivate = null, chain = false) => {
    setMobileTab('action');
    setIsRolling(true);

    // Set a dummy roll immediately so the animation overlay renders while API fetches
    setLastRoll({
      normalDice: [],
      hungerDice: [0],
      outcome: { successes: 0, hasCritical: false, hasMessyCritical: false, hasBestialFailure: false, label: 'Rolling...' },
      type: source,
      note: 'Calculating...',
    });

    let advantage = false;
    if (autoActivate && autoActivate.power?.level <= bpStats.rouseRerollLevel) {
      advantage = true;
    }

    try {
      const prevHunger = trackers?.hunger || 0;
      const { data } = await api.post(`/characters/${character.id}/rouse`, { advantage });

      const { success, die1, die2, nextHunger, sheet: nextSheet } = data;
      setSheet(nextSheet);
      setTrackers(summarizeTrackers(nextSheet));

      if (!success && prevHunger === 5) {
        await applySheetUpdate(next => { next.frenzyState = 'hunger'; return next; });
      }

      setLastRoll({
        normalDice: [],
        hungerDice: advantage ? [die1, die2].filter(Boolean) : [die1],
        outcome: { successes: success ? 1 : 0, hasCritical: false, hasMessyCritical: false, hasBestialFailure: false },
        type: source,
        note: success ? 'Pass (No Hunger Gained)' : 'Fail (Hunger +1)',
      });
      setWpSelections([]);

      await pushRoll(source, {
        characterId: character?.id, roll_type: source, pool: advantage ? 2 : 1,
        hunger: nextHunger,
        results: { normal: [], rouse: advantage ? [die1, die2].filter(Boolean) : [die1] },
        successes: success ? 1 : 0,
        note: success ? 'No hunger gained' : 'Hunger +1',
      });

      if (autoActivate) {
        await pushRoll('discipline_activation', {
          characterId: character?.id, roll_type: 'discipline_activation',
          note: `${autoActivate.discName} • ${autoActivate.power.name}`,
          character_name: character?.name || sheet?.name || 'Unknown',
          disc: autoActivate.discName,
          power_name: autoActivate.power.name,
        });
      }
    } catch (e) {
      console.error(e);
      setLastRoll({
        normalDice: [],
        hungerDice: [],
        outcome: { successes: 0, hasCritical: false, hasMessyCritical: false, hasBestialFailure: false, label: 'Error' },
        type: source,
        note: 'Failed to communicate with server.',
      });
    }

    if (!chain) setTimeout(() => setIsRolling(false), 1500);
  };

  // Roll a discipline power's activation pool (attribute + discipline/skill),
  // with the Blood Potency Discipline bonus and impairment applied.
  const rollDisciplinePower = async (power, discName, traits) => {
    const [t1, t2] = traits;
    let pool = getPoolFromCharacter(sheet, t1, t2);
    if (isDisciplineTrait(t2)) pool += bpStats.disciplineBonus;
    if (trackers && !sheet?.frenzyState) {
      const phys = ['Strength', 'Dexterity', 'Stamina', ...SKILL_GROUPS.Physical];
      if (trackers.health.superficial + trackers.health.aggravated >= trackers.health.max
        && (phys.includes(t1) || phys.includes(t2))) pool -= 2;
      if (trackers.willpower.superficial + trackers.willpower.aggravated >= trackers.willpower.max
        && !(phys.includes(t1) && phys.includes(t2))) pool -= 2;
    }
    pool = Math.max(0, pool);

    const roll = rollPool(pool, trackers?.hunger ?? 0, 0);
    setLastRoll({ ...roll, type: 'discipline_roll', note: `${discName} • ${power.name} (${t1} + ${t2})` });
    setWpSelections([]);
    maybeCompulsion(roll.outcome);
    await pushRoll('discipline_roll', {
      characterId: character?.id, roll_type: 'discipline_roll',
      pool: roll.pool, hunger: roll.hunger,
      results: { normal: roll.normalDice, hunger: roll.hungerDice },
      successes: roll.outcome.successes,
      has_critical: roll.outcome.hasCritical,
      has_messy_critical: roll.outcome.hasMessyCritical,
      has_bestial_failure: roll.outcome.hasBestialFailure,
      note: `${discName} • ${power.name} — ${t1} + ${t2}`,
      disc: discName, power_name: power.name,
    });
  };

  const handleDisciplineActivate = async (power, discName) => {
    const isActive = runningPowers.some(rp => rp.id === power.id);

    if (isActive) {
      setRunningPowers(prev => prev.filter(rp => rp.id !== power.id));
      await pushRoll('discipline_deactivation', {
        characterId: character?.id, roll_type: 'discipline_deactivation',
        note: `Deactivated: ${discName} • ${power.name}`,
        character_name: character?.name || sheet?.name || 'Unknown',
        disc: discName,
        power_name: power.name,
      });
      return;
    }

    setRunningPowers(prev => [...prev, { id: power.id, level: power.level, disc: discName, name: power.name }]);
    setExpandedPower(null);
    setMobileTab('action');
    setIsRolling(true);

    // Pay the Rouse cost (some powers need two). Only the first Rouse carries the
    // autoActivate payload so the activation is logged once.
    const rouseCount = disciplineRouseCost(power);
    for (let i = 0; i < rouseCount; i++) {
      await handleRouse('discipline_rouse_check', i === 0 ? { power, discName } : null, true);
    }

    // Roll the activation pool if the power has one; otherwise just log it.
    const traits = parseDicePool(power.dice_pool);
    if (traits) {
      await rollDisciplinePower(power, discName, traits);
    } else {
      if (rouseCount === 0) {
        setLastRoll(null);
        await pushRoll('discipline_activation', {
          characterId: character?.id, roll_type: 'discipline_activation',
          note: `Activated: ${discName} • ${power.name}`,
          character_name: character?.name || sheet?.name || 'Unknown',
          disc: discName, power_name: power.name,
        });
      }
    }

    setTimeout(() => setIsRolling(false), 1500);
  };

  const handleResistFrenzy = async () => {
    const currentFrenzy = sheet?.frenzyState;
    if (!currentFrenzy) return;

    setMobileTab('action');
    setIsRolling(true);

    const humanityVal = Number(sheet?.humanity ?? sheet?.morality?.humanity ?? 7);
    const bonus = Math.floor(humanityVal / 3);
    const willpowerRating = trackers?.willpower?.max || 0;
    // Brujah Bane: lose Bane Severity dice when resisting a fury frenzy.
    const brujahPenalty = (clan === 'Brujah' && currentFrenzy === 'fury') ? bpStats.baneSeverity : 0;
    const pool = Math.max(0, willpowerRating + bonus - brujahPenalty);
    const frenzyLabel = FRENZY_ALERTS[currentFrenzy]?.label || 'Frenzy';

    const roll = rollPool(pool, 0, 0);
    const resisted = roll.outcome.successes > 0;

    setLastRoll({
      ...roll,
      type: 'frenzy_resistance',
      note: `Resisting ${frenzyLabel} (Willpower ${willpowerRating} + Humanity/3 ${bonus}${brujahPenalty ? ` − Bane ${brujahPenalty}` : ''})`,
    });
    setWpSelections([]);

    await pushRoll('frenzy_resistance', {
      characterId: character?.id, roll_type: 'frenzy_resistance',
      pool: roll.pool, hunger: 0,
      results: { normal: roll.normalDice, hunger: [] },
      successes: roll.outcome.successes,
      note: resisted ? `Resisted ${frenzyLabel}` : `Failed to resist ${frenzyLabel} — the Beast holds control`,
    });

    if (resisted) {
      await applySheetUpdate(next => { next.frenzyState = null; return next; });
    }

    setTimeout(() => setIsRolling(false), 1500);
  };

  if (isAdmin) {
    return (
      <LiveSessionAdminDashboard
        initialSessionId={sessionId}
        character={character}
      />
    );
  }

  if (characterChecked && !character) {
    return <div className={styles.container}><div style={{ margin: 'auto', textAlign: 'center' }}>You need an approved character before you can join a Live Session.</div></div>;
  }

  if (!trackers) return <div className={styles.container}><div style={{ margin: 'auto' }}>Loading LARP Interface...</div></div>;

  const humanity = sheet?.humanity ?? sheet?.morality?.humanity ?? 7;

  const getBlushOfLifeInfo = (hum) => {
    if (hum >= 10) return { cost: 0, text: 'You appear completely human. Blush of Life is innately active.' };
    if (hum === 9) return { cost: 1, text: 'You appear mostly human. Blush allows food digestion & sex.' };
    if (hum === 8) return { cost: 1, text: 'You appear pale. Blush makes you look human & allows digestion.' };
    if (hum >= 4) return { cost: 1, text: 'You look like a corpse. Blush makes you look human & allows digestion.' };
    return { cost: 2, text: 'You look like a hideous corpse. Blush requires 2 Rouse Checks.' };
  };
  const blushInfo = getBlushOfLifeInfo(humanity);

  const getHumanityEffects = (hum) => {
    if (hum >= 10) return "Can pass for mortal. Appear entirely human. Can eat food without Blush of Life. Fake sexual intercourse without a roll. Blush of Life is always active. Waking early has no penalty.";
    if (hum === 9) return "Can pass for mortal. Appear human. Can fake sexual intercourse without a roll, but must Rouse to eat food. Blush of Life costs 1 Rouse Check.";
    if (hum === 8) return "Can pass for mortal. Still subscribe to most social norms. Must use Blush of Life to have sexual intercourse and eat food (costs 1 Rouse Check).";
    if (hum === 7) return "Can pass for mortal, subscribing to strong social norms like viewing murder as wrong. Blush of Life costs 1 Rouse Check. Fake sex requires Dex+Cha vs Composure/Wits. Without Blush, eating causes vomiting (Composure+Stamina vs Diff 3).";
    if (hum >= 5) return "Noticeably pale and sickly. Blush of Life costs 1 Rouse Check. Fake sex requires Dex+Cha vs Composure/Wits. Without Blush, eating causes vomiting (Composure+Stamina vs Diff 3).";
    if (hum === 4) return "Corpse-like and disturbing. -1 to Social dice pools vs mortals. Blush of Life costs 1 Rouse Check.";
    if (hum >= 1) return "Hideous corpse, clearly unnatural. -2 to Social dice pools vs mortals. Blush of Life costs 2 Rouse Checks.";
    return "Wight. You are entirely lost to the Beast.";
  };
  const humanityEffects = getHumanityEffects(humanity);

  // Player -> Storyteller signal. Non-admin players can't hit /broadcast, so
  // hand-raises, rules questions, AFK and Blush status all go through /signal.
  const sendSignal = async (type, feedback) => {
    if (!sessionId) return;
    try {
      await sendLiveSessionSignal(sessionId, {
        type,
        characterName: character?.name || sheet?.name || 'Vampire',
      });
      if (feedback) {
        setSignalNote(feedback);
        setTimeout(() => setSignalNote(''), 3000);
      }
    } catch (e) {
      setSignalNote('Signal failed to send.');
      setTimeout(() => setSignalNote(''), 3000);
    }
  };

  const toggleHand = async () => {
    const next = !handRaised;
    setHandRaised(next);
    await sendSignal(next ? 'hand' : 'back', next ? 'Storyteller notified.' : 'Hand lowered.');
  };

  const handleBlushOfLifeToggle = async () => {
    if (blushInfo.cost === 0) return; // Free at humanity 10
    const isActivating = !sheet?.blushOfLife;

    if (isActivating && blushInfo.cost > 0) {
      setShowBlushModal(true);
      return;
    }

    // Toggling off is instant and free
    await applySheetUpdate(next => {
      next.blushOfLife = false;
      return next;
    });

    await sendSignal('blush_off');
  };

  const confirmBlushOfLife = async () => {
    setShowBlushModal(false);

    await handleRouse('blush_of_life');
    if (blushInfo.cost > 1) {
      await handleRouse('blush_of_life');
    }

    await applySheetUpdate(next => {
      next.blushOfLife = true;
      return next;
    });

    await sendSignal('blush_on');
  };

  const bp = trackers.bloodPotency;
  const charName = character?.name || sheet?.name || 'Vampire';
  const clan = character?.clan || sheet?.clan || 'Unknown Clan';
  const activeFrenzy = sheet?.frenzyState || null;
  const cref = clanRef(clan);
  const healthImpaired = trackers.health.superficial + trackers.health.aggravated >= trackers.health.max;
  const inTorpor = trackers.health.aggravated >= trackers.health.max;
  const willImpaired = trackers.willpower.superficial + trackers.willpower.aggravated >= trackers.willpower.max;

  const myRollRequests = (session?.metadata?.rollRequests || [])
    .filter(r => String(r.targetId) === String(character?.id))
    .filter(r => !broadcasts.some(b => b.roll_type === 'requested_roll'
      && String(b.character_id ?? b.characterId) === String(character?.id)
      && (b.note || '').includes(r.id.slice(-6))));

  // V5: Willpower can't be spent to reroll frenzy, Remorse, Rouse or Humanity tests.
  const rerollAllowed = lastRoll
    && !['frenzy_resistance', 'remorse', 'rouse_check', 'discipline_rouse_check', 'blush_of_life', 'blood_surge'].includes(lastRoll.type)
    && !(trackers.willpower.superficial + trackers.willpower.aggravated >= trackers.willpower.max);

  const runCommonRoll = (r) => {
    setSelectedTraits([r.attribute, r.skill]);
    setMobileTab('action');
  };

  return (
    <div className={styles.container}>
      {/* Blush of Life Modal */}
      {showBlushModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <span className="material-symbols-outlined">favorite</span>
              Blush of Life
            </div>
            <div className={styles.modalBody}>
              <p>Activate Blush of Life? This will cost <strong>{blushInfo.cost} Rouse Check{blushInfo.cost > 1 ? 's' : ''}</strong>.</p>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Simulates a heartbeat, warmth, and breath, helping you blend in with mortals.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setShowBlushModal(false)}>Cancel</button>
              <button className={styles.btnPrimary} onClick={confirmBlushOfLife}>Activate & Rouse</button>
            </div>
          </div>
        </div>
      )}

      {/* FRENZY BANNER */}
      {activeFrenzy && (
        <div className={styles.frenzyBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined">warning</span>
            <span style={{ textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{FRENZY_ALERTS[activeFrenzy]?.label || 'Frenzy State Active'}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button style={{ color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }} disabled={isRolling} onClick={handleResistFrenzy}>
              Resist (Willpower + Humanity/3)
            </button>
            <button
              style={{ color: 'var(--on-surface)', background: 'transparent', border: '1px solid var(--outline)', borderRadius: 4, padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}
              disabled={trackers.willpower.superficial + trackers.willpower.aggravated >= trackers.willpower.max}
              onClick={() => spendWillpower('frenzy_control')}
              title="Spend 1 Superficial Willpower to act freely for one turn"
            >
              Spend WP: act 1 turn
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE COMPULSION */}
      {sheet?.compulsion && (
        <div className={styles.compulsionBanner}>
          <span className="material-symbols-outlined">psychology_alt</span>
          <span style={{ flex: 1 }}><strong>Compulsion:</strong> {sheet.compulsion}</span>
          <button className={styles.btnPrimary} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setCompulsion(null)}>
            Resolved
          </button>
        </div>
      )}

      {/* COMPULSION PICKER */}
      {compulsionPrompt && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: 460 }}>
            <div className={styles.modalHeader}>
              <span className="material-symbols-outlined">warning</span>
              {compulsionPrompt.kind === 'messy' ? 'Messy Critical' : 'Bestial Failure'} — the Beast stirs
            </div>
            <div className={styles.modalBody} style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              <p style={{ marginBottom: '0.75rem' }}>Pick the Compulsion that takes hold (Storyteller may override):</p>
              {cref && cref.compulsion && cref.compulsion !== 'None.' && (
                <button className={styles.compulsionChoice} onClick={() => setCompulsion(`${clan} — ${cref.compulsion}`)}>
                  <strong>{clan} Compulsion</strong><br />{cref.compulsion}
                </button>
              )}
              {GENERAL_COMPULSIONS.map(c => (
                <button key={c.name} className={styles.compulsionChoice} onClick={() => setCompulsion(`${c.name} — ${c.text}`)}>
                  <strong>{c.name}</strong><br />{c.text}
                </button>
              ))}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setCompulsionPrompt(null)}>Skip / ST decides</button>
            </div>
          </div>
        </div>
      )}

      {/* STORYTELLER ROLL REQUESTS */}
      {myRollRequests.map(req => (
        <div key={req.id} className={styles.requestBanner}>
          <div className={styles.requestInfo}>
            <span className="material-symbols-outlined">campaign</span>
            <div>
              <div className={styles.requestTitle}>
                The Storyteller asks for {req.trait1} + {req.trait2}
                {req.specialty && <span className={styles.requestSpec}> + {req.specialty} (Specialty)</span>}
                {req.difficulty > 0 && <span className={styles.requestDiff}> · Difficulty {req.difficulty}</span>}
              </div>
              {req.note && <div className={styles.requestNote}>{req.note}</div>}
            </div>
          </div>
          <button className={styles.btnPrimary} disabled={isRolling} onClick={() => resolveRollRequest(req)}>
            Roll
          </button>
        </div>
      ))}

      {/* IMPAIRMENT BANNER */}
      {(inTorpor || healthImpaired || willImpaired) && (
        <div className={styles.impairBanner}>
          <span className="material-symbols-outlined">personal_injury</span>
          {inTorpor
            ? <span>You have entered <strong>torpor</strong> — the Storyteller controls your fate.</span>
            : <span>
                {healthImpaired && <strong>Impaired</strong>}
                {healthImpaired && ' — −2 dice to Physical pools. '}
                {willImpaired && <strong>Willpower spent</strong>}
                {willImpaired && ' — −2 dice to Social &amp; Mental pools.'}
              </span>}
        </div>
      )}

      {/* PLAYER -> STORYTELLER SIGNALS */}
      {sessionId && (
        <div className={styles.signalBar}>
          <button
            className={`${styles.signalBtn} ${handRaised ? styles.signalBtnActive : ''}`}
            onClick={toggleHand}
            title="Raise your hand for the Storyteller"
          >
            <span className="material-symbols-outlined">pan_tool</span>
            {handRaised ? 'Hand Raised' : 'Request ST'}
          </button>
          <button className={styles.signalBtn} onClick={() => sendSignal('rules', 'Rules question sent to ST.')} title="Ask a rules question">
            <span className="material-symbols-outlined">help</span>
            Rules
          </button>
          <button className={styles.signalBtn} onClick={() => sendSignal('afk', 'Marked away.')} title="Step away from the table">
            <span className="material-symbols-outlined">bedtime</span>
            AFK
          </button>
          {signalNote && <span className={styles.signalToast}>{signalNote}</span>}
        </div>
      )}

      {/* MODALS */}
      {/* MAIN CONTENT 3-COLUMN */}
      <main className={styles.mainContent} style={{
        boxShadow: session?.metadata?.ambient === 'frenzy' ? 'inset 0 0 100px rgba(239,68,68,0.1)' : session?.metadata?.ambient === 'supernatural' ? 'inset 0 0 100px rgba(168,85,247,0.1)' : 'none'
      }}>

        {/* LEFT COLUMN: IDENTITY & TRACKERS */}
        <aside className={`${styles.leftColumn} ${mobileTab !== 'character' ? styles.mobileHidden : ''}`}>
          {/* Identity */}
          <section style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Avatar userId={character?.user_id || character?.id} clan={clan} size={64} style={{ borderRadius: 8, border: '1px solid var(--outline-variant)' }} fallback={symlogo(clan)} />
            <div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--primary)' }}>{charName}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                {clan !== 'Unknown Clan' && <img src={symlogo(clan)} alt={clan} style={{ width: 14, height: 14, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.7 }} onError={(e) => { e.target.style.display = 'none'; }} />}
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{clan} • BP {bp}</p>
              </div>
            </div>
          </section>

          {/* Active discipline powers — always visible while running */}
          {runningPowers.length > 0 && (
            <section className={styles.activePowersStrip}>
              <span className={styles.labelMd} style={{ color: 'var(--text-muted)' }}>Active Powers</span>
              <div className={styles.activePowersList}>
                {runningPowers.map(rp => (
                  <button
                    key={rp.id}
                    className={styles.activePowerBadge}
                    title={`Deactivate ${rp.disc} • ${rp.name}`}
                    onClick={() => handleDisciplineActivate({ id: rp.id, name: rp.name, level: rp.level }, rp.disc)}
                  >
                    <span className="material-symbols-outlined">bolt</span>
                    <span>{rp.name}</span>
                    <span className={styles.activePowerClose}>
                      <span className="material-symbols-outlined">close</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Trackers */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Hunger */}
            <div>
              <TrackerBlock label="Hunger" val={trackers.hunger} max={5} filled={trackers.hunger} />
              <button className={styles.btnPrimary} style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', marginTop: '1rem' }} onClick={() => handleRouse()}>Perform Rouse Check</button>
            </div>
            {/* Health */}
            <div>
              <TrackerBlock label="Health" val="" max={trackers.health.max} agg={trackers.health.aggravated} sup={trackers.health.superficial} />
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
                <button
                  className={styles.btnOutline}
                  style={{ flex: 1, padding: '0.35rem', fontSize: '0.7rem' }}
                  disabled={trackers.health.superficial <= 0 || isRolling}
                  onClick={mendSuperficialSelf}
                  title={`Rouse Check, then heal ${bpStats.mendAmount} Superficial`}
                >
                  Mend Superficial ({bpStats.mendAmount})
                </button>
                <button
                  className={styles.btnOutline}
                  style={{ flex: 1, padding: '0.35rem', fontSize: '0.7rem' }}
                  disabled={trackers.health.aggravated <= 0 || isRolling}
                  onClick={mendAggravatedSelf}
                  title="Three Rouse Checks at the start of the night, then heal 1 Aggravated"
                >
                  Mend Aggravated (3 Rouse)
                </button>
              </div>
            </div>
            {/* Willpower */}
            <div>
              <TrackerBlock label="Willpower" val="" max={trackers.willpower.max} agg={trackers.willpower.aggravated} sup={trackers.willpower.superficial} />
            </div>

            {/* Blush of Life */}
            <div className={styles.trackerBox} style={{ padding: '1rem', background: sheet?.blushOfLife ? 'rgba(225,29,72,0.1)' : 'var(--surface-container-high)', border: sheet?.blushOfLife ? '1px solid var(--primary)' : '1px solid transparent', cursor: blushInfo.cost > 0 ? 'pointer' : 'default' }} onClick={() => blushInfo.cost > 0 && handleBlushOfLifeToggle()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: sheet?.blushOfLife ? 'var(--primary)' : 'var(--text-muted)' }}>favorite</span>
                  <span className={styles.labelMd} style={{ color: sheet?.blushOfLife ? 'var(--primary)' : 'var(--on-surface)' }}>Blush of Life</span>
                </div>
                {sheet?.blushOfLife ? <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>ACTIVE</span> : (blushInfo.cost > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OFF</span>)}
              </div>
              <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: '1.4' }}>Simulates a heartbeat, warmth, breath, and avoids social penalties with mortals.</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--on-surface)' }}><strong>Humanity {humanity}:</strong> {blushInfo.text}</p>
            </div>

            {/* Humanity */}
            <div className={styles.trackerBox} style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem', background: 'var(--surface-container-high)' }}>
              <div className={styles.trackerHeader} style={{ marginBottom: '1rem' }}>
                <span className={styles.labelMd}>Humanity</span>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                  {humanity}{trackers.stains > 0 && <span style={{ color: 'var(--error)', fontWeight: 'normal' }}> · {trackers.stains} stain{trackers.stains === 1 ? '' : 's'}</span>}
                </span>
              </div>
              <div className={styles.dotRow} style={{ gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {Array.from({ length: 10 }).map((_, i) => {
                  const filled = i < humanity;
                  const stained = !filled && i >= 10 - trackers.stains;
                  return <div key={i} className={filled ? styles.dotFilled : stained ? styles.dotStained : styles.dotEmpty} />;
                })}
              </div>
              {trackers.degeneration && (
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--error)', fontWeight: 'bold' }}>
                  Degeneration — Stains exceed empty boxes: −2 to all pools, take Aggravated Willpower damage.
                </p>
              )}
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{humanityEffects}</p>
            </div>

            {/* Clan Bane & Compulsion */}
            {cref && (
              <div className={styles.trackerBox} style={{ padding: '1rem 1.25rem', marginBottom: '1rem', background: 'var(--surface-container-high)' }}>
                <div className={styles.trackerHeader} style={{ marginBottom: '0.6rem' }}>
                  <span className={styles.labelMd}>{clan} — Curse</span>
                </div>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.72rem', color: 'var(--on-surface)', lineHeight: '1.45' }}>
                  <strong style={{ color: 'var(--primary)' }}>Bane:</strong> {cref.bane}
                </p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                  <strong style={{ color: 'var(--primary)' }}>Compulsion:</strong> {cref.compulsion}
                </p>
              </div>
            )}
          </section>

          {/* Disciplines */}
          <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 className={styles.labelMd} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Disciplines</h3>
            <div className={styles.disciplineGrid} style={{ marginBottom: '1rem' }}>
              {Object.entries(sheet?.disciplines || {}).filter(([, dots]) => Number(dots) > 0).map(([discName]) => (
                <div
                  key={discName}
                  className={styles.disciplineBtn}
                  style={{ borderColor: activeDisc === discName ? 'var(--primary)' : 'rgba(224,224,224,0.1)', background: activeDisc === discName ? 'rgba(225,29,72,0.1)' : undefined }}
                  onClick={() => setActiveDisc(activeDisc === discName ? null : discName)}
                >
                  {discIcon(discName) ? <img src={discIcon(discName)} alt={discName} /> : <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{discName.slice(0, 3).toUpperCase()}</span>}
                  <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', textAlign: 'center' }}>{discName}</span>
                </div>
              ))}
            </div>

            {/* Active Discipline Powers */}
            {activeDisc && (
              <div className={styles.trackerBox} style={{ background: 'var(--surface-container-highest)', border: '1px solid var(--primary-container)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--on-surface)', fontSize: '0.9rem' }}>{activeDisc} Powers</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activePowers.map(p => {
                    const needsRouse = disciplineRequiresRouse(p);
                    const isRunning = runningPowers.some(rp => rp.id === p.id);
                    return (
                      <div key={p.id} style={{ display: 'flex', flexDirection: 'column', background: expandedPower === p.id ? 'var(--surface-container-high)' : 'transparent', borderRadius: '0.25rem', overflow: 'hidden' }}>
                        <div className={styles.selectableItem} style={{ padding: '0.5rem', alignItems: 'center' }} onClick={() => setExpandedPower(expandedPower === p.id ? null : p.id)}>
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <span style={{ fontSize: '0.85rem', color: isRunning ? 'var(--success)' : 'var(--on-surface)', fontWeight: isRunning ? 'bold' : 'normal' }}>
                              {isRunning && '● '} {p.name} <span style={{ color: isRunning ? 'var(--success)' : 'var(--text-muted)', fontSize: '0.75rem', opacity: 0.8 }}>(Lvl {p.level})</span>
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                              {needsRouse && <span style={{ color: 'var(--primary)', fontSize: '0.65rem' }}>Rouse Required</span>}
                              {p.dice_pool && p.dice_pool !== '—' && <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Pool: {p.dice_pool}</span>}
                            </div>
                          </div>
                          <button className={styles.btnOutline} style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', border: 'none' }}>
                            {expandedPower === p.id ? '▼' : '▶'}
                          </button>
                        </div>

                        {expandedPower === p.id && (
                          <div style={{ padding: '0.5rem 0.75rem 0.75rem 0.75rem', borderTop: '1px solid var(--outline-variant)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                              {p.cost && <p style={{ margin: '0 0 0.25rem 0' }}><strong style={{ color: 'var(--primary)' }}>Cost:</strong> {p.cost}</p>}
                              {p.dice_pool && p.dice_pool !== '—' && <p style={{ margin: '0 0 0.25rem 0' }}><strong style={{ color: 'var(--primary)' }}>Dice Pool:</strong> {p.dice_pool}</p>}
                              {p.opposing_pool && p.opposing_pool !== '—' && <p style={{ margin: '0 0 0.25rem 0' }}><strong style={{ color: 'var(--primary)' }}>Opposing Pool:</strong> {p.opposing_pool}</p>}
                              {p.duration && <p style={{ margin: '0 0 0.25rem 0' }}><strong style={{ color: 'var(--primary)' }}>Duration:</strong> {p.duration}</p>}
                              <p style={{ margin: '0.5rem 0 0 0' }}>{p.notes || p.description}</p>
                            </div>

                            {powerMechanics(p.id)?.note && (
                              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.72rem', color: 'var(--on-surface)', background: 'var(--surface-container-high)', borderLeft: '2px solid var(--primary)', padding: '0.4rem 0.6rem', borderRadius: '3px' }}>
                                <strong style={{ color: 'var(--primary)' }}>Mechanic:</strong> {powerMechanics(p.id).note}
                              </p>
                            )}

                            {needsRouse && (
                              <div style={{ background: 'rgba(225,29,72,0.1)', border: '1px solid var(--primary)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
                                <p style={{ color: 'var(--primary)', margin: 0, fontSize: '0.75rem', fontWeight: 'bold' }}>Rouse Check Required</p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>Current Hunger: <b>{trackers?.hunger || 0} / 5</b></p>
                                {p.level <= bpStats.rouseRerollLevel && <p style={{ fontSize: '0.65rem', color: 'var(--primary)', margin: '0.2rem 0 0 0' }}>BP Reroll Advantage Applied</p>}
                              </div>
                            )}

                            <button
                              className={styles.btnPrimary}
                              style={{
                                width: '100%',
                                padding: '0.4rem',
                                fontSize: '0.75rem',
                                background: isRunning ? 'transparent' : undefined,
                                color: isRunning ? 'var(--error)' : undefined,
                                border: isRunning ? '1px solid var(--error)' : undefined
                              }}
                              onClick={(e) => { e.stopPropagation(); handleDisciplineActivate(p, activeDisc); }}
                            >
                              {isRunning
                                ? 'Deactivate Power'
                                : `${needsRouse ? 'Rouse & Activate' : 'Activate'}${parseDicePool(p.dice_pool) ? ' & Roll' : ''}`}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {activePowers.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No powers selected for this discipline.</span>}
                </div>
              </div>
            )}
          </section>
        </aside>

        {/* CENTER COLUMN: ROLL ENGINE */}
        <section className={`${styles.centerColumn} ${mobileTab !== 'action' ? styles.mobileHidden : ''}`}>
          <div className={styles.rollEngineInner}>

            {/* Connection / Session Info Bar */}
            <div className={styles.sessionBar}>
              <div className={styles.sessionBarInfo}>
                <span className={styles.sessionBarId}>
                  {session ? `Session ${session.id || sessionId}` : 'Not Connected'}
                </span>

                {session && (
                  <>
                    <span className={styles.sessionBarMeta}>
                      <span className="material-symbols-outlined">shield_person</span>
                      Storyteller: <strong>{session.admin_name || 'Admin'}</strong>
                    </span>
                    <span className={styles.sessionBarMeta}>
                      <span className="material-symbols-outlined">group</span>
                      <strong>{session.players?.length || 1}</strong> Players
                    </span>
                    <span className={styles.sessionBarMeta}>
                      <span className="material-symbols-outlined">timer</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{sessionRuntime}</span>
                    </span>
                  </>
                )}
              </div>

              <div className={styles.sessionBarConnect}>
                <input
                  className={styles.sessionBarInput}
                  placeholder="Session ID"
                  value={sessionId}
                  onChange={e => { setSessionId(e.target.value); localStorage.setItem('liveSessionId', e.target.value); }}
                />
                <button className={styles.btnPrimary} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={async () => {
                  try {
                    await joinLiveSession(sessionId, { characterId: character?.id });
                    socket.emit('join_session', sessionId);
                    setConnStatus('Connected successfully!');
                    setTimeout(() => setConnStatus(''), 3000);
                  } catch (e) {
                    setConnStatus('Failed to connect.');
                    setTimeout(() => setConnStatus(''), 3000);
                  }
                }}>Connect</button>
                {connStatus && (
                  <span className={styles.sessionBarStatus} data-ok={connStatus.includes('success')}>{connStatus}</span>
                )}
              </div>
            </div>

            {/* Scene & Clocks Banner */}
            {(session?.metadata?.scene || session?.metadata?.clocks?.length > 0 || session?.metadata?.initiative?.length > 0) && (
              <div style={{
                background: session?.metadata?.ambient === 'frenzy' ? 'rgba(239,68,68,0.1)' : session?.metadata?.ambient === 'supernatural' ? 'rgba(168,85,247,0.1)' : 'var(--surface-container-highest)',
                border: session?.metadata?.ambient === 'frenzy' ? '1px solid rgba(239,68,68,0.3)' : session?.metadata?.ambient === 'supernatural' ? '1px solid rgba(168,85,247,0.3)' : '1px solid var(--outline-variant)',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {session?.metadata?.scene && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>theater_comedy</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--on-surface)' }}>{session.metadata.scene}</span>
                  </div>
                )}
                {session?.metadata?.clocks && session?.metadata?.clocks.length > 0 && (
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {session.metadata.clocks.map((c, i) => (
                      <div key={c.id || i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: c.value === 0 ? 'var(--error)' : 'var(--text-muted)' }}>schedule</span>
                        <span style={{ fontSize: '0.85rem' }}>{c.name}: <strong style={{ color: c.value === 0 ? 'var(--error)' : 'var(--primary)' }}>{c.value}</strong></span>
                      </div>
                    ))}
                  </div>
                )}
                {session?.metadata?.initiative?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span className={styles.labelMd} style={{ color: 'var(--text-muted)' }}>
                      Initiative{session.metadata.round ? ` — Round ${session.metadata.round}` : ''}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {session.metadata.initiative.map((actor, i) => {
                        const isCurrent = String(actor.id) === String(session.metadata.turnActorId);
                        return (
                          <span key={actor.id || i} className={`${styles.initChip} ${isCurrent ? styles.initChipActive : ''}`}>
                            {isCurrent && <span className="material-symbols-outlined">play_arrow</span>}
                            {actor.name} <b>{actor.value}</b>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 className={styles.displayLg}>Pool Assembly</h1>
                <p className={styles.textMuted}>Combine your eternal potential into action.</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className={styles.btnOutline} onClick={() => setSelectedTraits([])}>CLEAR</button>
                <button className={styles.btnPrimary} disabled={selectedTraits.length === 0} onClick={() => executeRoll(currentPool, 'pool_roll', selectedTraits.join(' + '))}>ROLL {currentPool} DICE</button>
              </div>
            </div>

            {/* Common rolls — quick trait presets */}
            <div className={styles.commonRolls}>
              {COMMON_ROLLS.map(r => {
                const on = selectedTraits.includes(r.attribute) && selectedTraits.includes(r.skill);
                return (
                  <button
                    key={r.key}
                    className={`${styles.commonRollBtn} ${on ? styles.commonRollOn : ''}`}
                    title={`${r.attribute} + ${r.skill}`}
                    onClick={() => runCommonRoll(r)}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {frenzyBlockedTrait && (
              <div className={styles.frenzyWarn}>
                <span className="material-symbols-outlined">block</span>
                <span>While frenzied the Beast only permits physical Disciplines — <strong>{frenzyBlockedTrait}</strong> is off-limits. Your Storyteller has the final say.</span>
              </div>
            )}

            {/* Surge & Settings */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {bpStats.surgeBonus > 0 && (
                <div className={styles.toggleContainer} onClick={() => setBloodSurgeActive(!bloodSurgeActive)}>
                  <div className={`${styles.toggleTrack} ${bloodSurgeActive ? styles.active : ''}`}>
                    <div className={styles.toggleThumb} />
                  </div>
                  <span style={{ fontWeight: 'bold', color: bloodSurgeActive ? 'var(--primary)' : 'var(--text-muted)' }}>Blood Surge (+{bpStats.surgeBonus})</span>
                </div>
              )}
              <div className={styles.toggleContainer} onClick={() => setSpecialtyActive(!specialtyActive)}>
                <div className={`${styles.toggleTrack} ${specialtyActive ? styles.active : ''}`}>
                  <div className={styles.toggleThumb} />
                </div>
                <span style={{ fontWeight: 'bold', color: specialtyActive ? 'var(--primary)' : 'var(--text-muted)' }}>Specialty (+1)</span>
              </div>
              <div className={styles.toggleContainer} onClick={() => setHiddenRollsActive(!hiddenRollsActive)}>
                <div className={`${styles.toggleTrack} ${hiddenRollsActive ? styles.active : ''}`}>
                  <div className={styles.toggleThumb} />
                </div>
                <span style={{ fontWeight: 'bold', color: hiddenRollsActive ? 'var(--primary)' : 'var(--text-muted)' }}>Hide Actions</span>
              </div>
            </div>

            {/* Situational modifiers */}
            <div className={styles.modRow}>
              <span className={styles.labelMd} style={{ color: 'var(--text-muted)' }}>Modifier</span>
              <div className={styles.modStepper}>
                <button onClick={() => setSituationalMod(m => m - 1)}>−</button>
                <span>{situationalMod > 0 ? `+${situationalMod}` : situationalMod}</span>
                <button onClick={() => setSituationalMod(m => m + 1)}>+</button>
              </div>
              <input
                className={styles.modReason}
                placeholder="reason (cover, called shot, power…)"
                value={modReason}
                onChange={e => setModReason(e.target.value)}
              />
              {(trackers.healthImpaired || trackers.willpowerImpaired) && !activeFrenzy && (
                <button
                  className={`${styles.commonRollBtn} ${wpIgnoreImpair ? styles.commonRollOn : ''}`}
                  disabled={trackers.willpower.superficial + trackers.willpower.aggravated >= trackers.willpower.max}
                  onClick={() => (wpIgnoreImpair ? setWpIgnoreImpair(false) : spendWillpower('ignore_impairment'))}
                  title="Spend 1 Superficial Willpower to ignore the −2 impairment penalty this roll"
                >
                  {wpIgnoreImpair ? 'Impairment ignored' : 'Spend WP: ignore −2'}
                </button>
              )}
              {myEffects.map(e => (
                <button
                  key={e.id}
                  className={`${styles.commonRollBtn} ${activeEffectIds.includes(e.id) ? styles.commonRollOn : ''}`}
                  onClick={() => setActiveEffectIds(prev => prev.includes(e.id) ? prev.filter(x => x !== e.id) : [...prev, e.id])}
                  title="Storyteller effect — tap to add to this roll"
                >
                  {e.label} {Number(e.mod) > 0 ? '+' : ''}{e.mod}
                </button>
              ))}
              {powerMods.map(pm => (
                <button
                  key={pm.id}
                  className={`${styles.commonRollBtn} ${activeEffectIds.includes(pm.id) ? styles.commonRollOn : ''}`}
                  onClick={() => setActiveEffectIds(prev => prev.includes(pm.id) ? prev.filter(x => x !== pm.id) : [...prev, pm.id])}
                  title={`${pm.label} — ${pm.target}. Tap to add to this roll if it applies.`}
                >
                  {pm.label} +{pm.mod}
                </button>
              ))}
            </div>

            {/* Bento Grid */}
            <div className={styles.bentoGrid}>
              {/* Attributes */}
              <div className={styles.trackerBox}>
                <h4 className={styles.labelMd} style={{ marginBottom: '1.5rem' }}>Attributes</h4>
                <div className={styles.traitGrid}>
                  {Object.entries(ATTRIBUTE_GROUPS).map(([category, attrs]) => (
                    <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{category}</span>
                      {attrs.map(attr => {
                        const isActive = selectedTraits.includes(attr);
                        const dots = Number(sheet?.attributes?.[attr] || 0);
                        return (
                          <div key={attr} className={`${styles.selectableItem} ${isActive ? styles.active : ''}`} onClick={() => toggleTrait(attr)}>
                            <span style={{ fontSize: '0.85rem' }}>{attr}</span>
                            <div className={styles.dotRow}>
                              {Array.from({ length: 5 }).map((_, i) => <div key={i} className={i < dots ? styles.dotFilled : styles.dotEmpty} />)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className={styles.trackerBox}>
                <h4 className={styles.labelMd} style={{ marginBottom: '1.5rem' }}>Skills</h4>
                <div className={styles.traitGrid}>
                  {Object.entries(SKILL_GROUPS).map(([category, skills]) => (
                    <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{category}</span>
                      {skills.map(skill => {
                        const isActive = selectedTraits.includes(skill);
                        const dots = Number(sheet?.skills?.[skill]?.dots ?? sheet?.skills?.[skill] ?? 0);
                        const specialties = sheet?.skills?.[skill]?.specialties || [];
                        return (
                          <div key={skill} className={`${styles.selectableItem} ${isActive ? styles.active : ''}`} onClick={() => toggleTrait(skill)}>
                            <span style={{ fontSize: '0.85rem' }}>{skill}</span>
                            <div className={styles.dotRow}>
                              {Array.from({ length: 5 }).map((_, i) => <div key={i} className={i < dots ? styles.dotFilled : styles.dotEmpty} />)}
                            </div>
                            {specialties.length > 0 && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{specialties.map(s => s.name || s).join(', ')}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Disciplines */}
              {Object.keys(sheet?.disciplines || {}).filter(d => Number(sheet.disciplines[d]) > 0).length > 0 && (
                <div className={styles.trackerBox}>
                  <h4 className={styles.labelMd} style={{ marginBottom: '1.5rem' }}>Disciplines</h4>
                  <div className={styles.traitGrid}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Powers</span>
                      {Object.entries(sheet.disciplines).filter(([, dots]) => Number(dots) > 0).map(([discName, dots]) => {
                        const isActive = selectedTraits.includes(discName);
                        return (
                          <div key={discName} className={`${styles.selectableItem} ${isActive ? styles.active : ''}`} onClick={() => toggleTrait(discName)}>
                            <span style={{ fontSize: '0.85rem' }}>{discName}</span>
                            <div className={styles.dotRow}>
                              {Array.from({ length: 5 }).map((_, i) => <div key={i} className={i < dots ? styles.dotFilled : styles.dotEmpty} />)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Roll Overlay */}
          {lastRoll && (
            <div className={styles.rollOverlay} onClick={(e) => { if (e.target === e.currentTarget && !isRolling) setLastRoll(null); }}>
              <div className={styles.rollResultCard} style={{ background: 'var(--surface-container)', borderRadius: '1rem', border: '1px solid var(--outline-variant)', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.8)', maxWidth: '90%', maxHeight: '90%', overflowY: 'auto' }}>
                <h2 className={styles.displayLg} style={{ color: isRolling ? 'var(--on-surface)' : (lastRoll.outcome.hasBestialFailure || lastRoll.outcome.hasMessyCritical ? 'var(--error)' : 'var(--primary)'), marginBottom: '0.5rem' }}>
                  {isRolling ? 'Rolling...' : lastRoll.outcome.label}
                </h2>
                <p className={styles.textMuted} style={{ marginBottom: '2rem' }}>{lastRoll.note}</p>

                <div className={styles.diceContainer}>
                  {lastRoll.normalDice.map((die, i) => {
                    const isSelected = wpSelections.includes(i);
                    const isSuccess = die >= 6;
                    const imgSrc = die === 10 ? '/img/dice/Crit.webp' : isSuccess ? '/img/dice/Success.webp' : null;
                    return (
                      <div key={`n-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className={`${styles.diceSlotContainer} ${styles.diceSlotNormal}`} style={{ border: isSelected && !isRolling ? '2px solid var(--primary)' : '1px solid var(--outline-variant)' }} onClick={() => { if (!isRolling && rerollAllowed) setWpSelections(prev => prev.includes(i) ? prev.filter(v => v !== i) : prev.length < 3 ? [...prev, i] : prev); }}>
                          {isRolling ? (
                            <div className={styles.diceRolling}>
                              <img src="/img/dice/Success.webp" alt="spin" />
                              <img src="/img/dice/Crit.webp" alt="spin" />
                              <img src="/img/dice/MessyCrit.webp" alt="spin" />
                            </div>
                          ) : (
                            imgSrc ? <img src={imgSrc} alt={`${die}`} className={styles.dieImage} /> : <span style={{ fontSize: '2rem', color: 'var(--text-muted)' }}>{die}</span>
                          )}
                        </div>
                        {isSelected && !isRolling && <span style={{ color: 'var(--primary)', fontSize: '0.75rem', marginTop: 4, fontWeight: 'bold' }}>Reroll</span>}
                      </div>
                    );
                  })}
                  {lastRoll.hungerDice.map((die, i) => {
                    const imgSrc = die === 10 ? '/img/dice/MessyCrit.webp' : die === 1 ? '/img/dice/BestialFail.webp' : die >= 6 ? '/img/dice/Success.webp' : null;
                    return (
                      <div key={`h-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className={`${styles.diceSlotContainer} ${styles.diceSlotHunger}`} style={{ border: '2px solid var(--primary-container)' }}>
                          {isRolling ? (
                            <div className={styles.diceRolling}>
                              <img src="/img/dice/Success.webp" alt="spin" />
                              <img src="/img/dice/MessyCrit.webp" alt="spin" />
                              <img src="/img/dice/BestialFail.webp" alt="spin" />
                            </div>
                          ) : (
                            imgSrc ? <img src={imgSrc} alt={`${die}`} className={styles.dieImage} /> : <span style={{ fontSize: '2rem', color: 'var(--error)' }}>{die}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isRolling && (
                  <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className={styles.btnOutline} onClick={() => setLastRoll(null)}>Dismiss</button>
                    {rerollAllowed && wpSelections.length > 0 && (
                      <button className={styles.btnPrimary} onClick={handleWillpowerReroll}>Spend 1 WP to Reroll {wpSelections.length} Dice</button>
                    )}
                    {!rerollAllowed && lastRoll.normalDice.length > 0 && (
                      <span style={{ alignSelf: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Willpower cannot be spent on this test.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: ADMIN / HISTORY */}
        <aside className={`${styles.rightColumn} ${mobileTab !== 'feed' ? styles.mobileHidden : ''}`}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--outline-variant)' }}>
            <button
              style={{ flex: 1, padding: '1rem', background: showAdminTab === 'feed' ? 'var(--surface-container-high)' : 'transparent', color: showAdminTab === 'feed' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', borderBottom: showAdminTab === 'feed' ? '2px solid var(--primary)' : 'none', fontWeight: 'bold', cursor: 'pointer' }}
              onClick={() => setShowAdminTab('feed')}
            >
              Activity Feed
            </button>
            <button
              style={{ flex: 1, padding: '1rem', background: showAdminTab === 'players' ? 'var(--surface-container-high)' : 'transparent', color: showAdminTab === 'players' ? 'var(--primary)' : 'var(--text-muted)', border: 'none', borderBottom: showAdminTab === 'players' ? '2px solid var(--primary)' : 'none', fontWeight: 'bold', cursor: 'pointer' }}
              onClick={() => setShowAdminTab('players')}
            >
              Session Players
            </button>
          </div>
          {showAdminTab === 'feed' && <LiveSessionRollHistory rolls={broadcasts} currentCharacterId={character?.id} isAdmin={isAdmin} />}
          {showAdminTab === 'players' && <LiveSessionPlayerList players={session?.players || []} adminName={session?.admin_name} />}
        </aside>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className={styles.mobileNav}>
        <div className={`${styles.mobileNavItem} ${mobileTab === 'character' ? styles.mobileNavItemActive : ''}`} onClick={() => setMobileTab('character')}>
          <span className="material-symbols-outlined">person</span>
          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Character</span>
        </div>
        <div className={`${styles.mobileNavItem} ${mobileTab === 'action' ? styles.mobileNavItemActive : ''}`} onClick={() => setMobileTab('action')}>
          <span className="material-symbols-outlined">casino</span>
          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Action</span>
        </div>
        <div className={`${styles.mobileNavItem} ${mobileTab === 'feed' ? styles.mobileNavItemActive : ''}`} onClick={() => setMobileTab('feed')}>
          <span className="material-symbols-outlined">forum</span>
          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>Feed</span>
        </div>
      </nav>
    </div>
  );
}