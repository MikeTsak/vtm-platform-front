import React, { useEffect, useMemo, useState, useContext } from 'react';
import api from '../../core/api';
import { AuthCtx } from '../../core/AuthContext';
import Avatar from '../../components/Avatar';
import { DISCIPLINES, iconPath, ALL_DISCIPLINE_NAMES } from '../../data/disciplines';
import { symlogo, symlogoWhite } from '../../data/clans';
import { clanRef } from '../../data/clanReference';
import { powerMechanics, resolveMechAmount } from '../../data/disciplineMechanics';
import {
  COMMON_ROLLS,
  computeOutcome,
  disciplineRequiresRouse,
  getPoolFromCharacter,
  summarizeTrackers,
  getBloodPotencyStats
} from '../../utils/liveSessionMechanics';
import { getLiveSession, joinLiveSession, logLiveSessionRoll, getLiveSessionBroadcasts, getLiveSessionRolls, socket, sendLiveSessionSignal } from '../../api/liveSession';
import generateVTMCharacterSheetPDF from '../../utils/pdfGenerator';
import LiveSessionPlayerList from './LiveSessionPlayerList';
import LiveSessionRollHistory from './LiveSessionRollHistory';
import LiveSessionAdminDashboard from '../admin/LiveSessionDashboard';
import D10Die from '../../ui/D10Die';
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
  10: { label: 'Humanity 10', desc: ['Humans with this score are rare, making vampires with this score even rarer.', 'Blush of Life is not needed to blend into mortal society: they appear as a pale and healthy mortal.', 'They heal Superficial Damage as a mortal in addition to standard healing.', 'Food is able to be tasted, eaten, and digested as a human.', 'Able to stay awake during the day as if human, though they still must sleep at some point.', 'Sunlight damage is halved.'] },
  9: { label: 'Humanity 9', desc: ['Kindred with this rating tend to be more humane than most humans.', 'Without Blush of Life they appear ill.', 'They heal Superficial Damage as a mortal in addition to standard healing.', 'Taste, eat and digest rare or raw meat and many liquids.', 'Rise from day-sleep up to an hour before sunset and stay awake an hour after dawn.', 'Torpor length: Three days.'] },
  8: { label: 'Humanity 8', desc: ['They are still able to comprehend and feel the pain from the anguish they cause.', 'Two dice are used for the Blush of Life checks, taking the highest result.', 'With Blush of Life, they can digest and taste wine.', 'Rise from day-sleep an hour before sunset.', 'Torpor length: One week.'] },
  7: { label: 'Humanity 7', desc: ['Kindred can pass for mortal, still subscribing to the strongest social norms.', 'Blush of Life requires a Rouse Check.', 'Can fake sexual intercourse by winning a Dexterity + Charisma test versus the partner\'s Composure or Wits.', 'Without Blush of Life, food and drink cause vomiting.', 'Torpor length: Two weeks.'] },
  6: { label: 'Humanity 6', desc: ['Not horrific monsters, but will do what they need to survive regardless of cost.', 'Take a one die penalty to the pool for faking sexual intercourse.', 'Even with Blush of Life, must make a Composure + Stamina test against Difficulty 3 to keep food and drink down.', 'Torpor length: One month.'] },
  5: { label: 'Humanity 5', desc: ['At this level most Kindred only care for their Touchstones, and may manifest minor physical eeriness.', 'Take a one die penalty in rolls to interact with mortals. Does not apply to intimidation, hunting, or supernatural Subterfuge.', 'Take a two dice penalty to the pool for faking sexual intercourse.', 'Torpor length: One year.'] },
  4: { label: 'Humanity 4', desc: ['Kindred may have accepted the inevitable downwards spiral. Physically they appear more corpse-like.', 'Take a two dice penalty to interact with mortals.', 'Even with Blush of Life, can no longer keep food and drink down.', 'Torpor length: One decade.'] },
  3: { label: 'Humanity 3', desc: ['Scrapping near the bottom: pragmatic route, whatever it takes.', 'Take a four dice penalty to interact with mortals.', 'Can no longer fake sexual intercourse.', 'Torpor length: Five decades.'] },
  2: { label: 'Humanity 2', desc: ['With twisted hobbies that please only them, Kindred have no care for others.', 'Take a six dice penalty to interact with mortals (four with Blush of Life).', 'Torpor length: One century.'] },
  1: { label: 'Humanity 1', desc: ['Teetering on the edge: only caring for survival.', 'Take an eight dice penalty to interact with mortals (five with Blush of Life).', 'Torpor length: Five centuries.'] },
  0: { label: 'Humanity 0: Wassail', desc: ['The Beast has taken control; leaving the character in a final Rötschreck Frenzy called Wassail.', 'Physical Attributes all buffed to 5.', 'If they survive this final scene, they become a wight and are taken control of by the Storyteller as an SPC.'] },
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
// "Wits/Resolve + Auspex", "None (…)", or "As power". Return [attr, trait] when it
// is a real pool we can roll, else null.
function parseDicePool(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (!s || s === '—' || s.startsWith('—') || s === 'None' || s.startsWith('None') || /^as power/i.test(s)) return null;
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
// `preview` ({ sessionId, character }) is the Storyteller's read-only look at one
// player's screen (LiveSessionDashboard): it supplies the character instead of
// /characters/me and never joins the session, so it can't act as anyone.
export default function LiveSession({ preview = null }) {
  const { user } = useContext(AuthCtx);
  const [character, setCharacter] = useState(null);
  const [characterChecked, setCharacterChecked] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [trackers, setTrackers] = useState(null);
  const [sessionId, setSessionId] = useState(() => {
    if (preview) return String(preview.sessionId || '');
    try {
      const sp = new URLSearchParams(window.location.search);
      const fromUrl = sp.get('session') || sp.get('id');
      if (fromUrl) {
        localStorage.setItem('liveSessionId', fromUrl);
        return fromUrl;
      }
    } catch (e) {}
    return localStorage.getItem('liveSessionId') || '';
  });
  // What's typed in the Session ID box; it only becomes the session once Connect is pressed.
  const [codeInput, setCodeInput] = useState(sessionId);
  const [openSessions, setOpenSessions] = useState([]); // running sessions the player can tap to join
  const [session, setSession] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);

  const isAdmin = !preview && (session?.isAdmin || user?.role === 'admin' || character?.isST);
  const [mobileTab, setMobileTab] = useState('action');
  useEffect(() => { if (!preview) window.scrollTo(0, 0); }, [mobileTab]);
  const [showBlushModal, setShowBlushModal] = useState(false);

  const [specialtyActive, setSpecialtyActive] = useState(false);
  const [selectedTraits, setSelectedTraits] = useState(['Wits', 'Awareness']);
  const [lastRoll, setLastRoll] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [wpSelections, setWpSelections] = useState([]);
  const [wpRerollMode, setWpRerollMode] = useState(false);
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

  const bpStats = useMemo(() => getBloodPotencyStats(trackers?.bloodPotency ?? 1), [trackers?.bloodPotency]);

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
    let pool = getPoolFromCharacter(sheet, ...selectedTraits);

    // Add Discipline Power Bonus if rolling a Discipline
    const hasDiscipline = selectedTraits.some(t => sheet?.disciplines?.[t] !== undefined || isDisciplineTrait(t));
    if (hasDiscipline) pool += bpStats.disciplineBonus;

    if (bloodSurgeActive) pool += bpStats.surgeBonus;
    if (specialtyActive) pool += 1;
    pool += Number(situationalMod) || 0;
    for (const e of myEffects) if (activeEffectIds.includes(e.id)) pool += Number(e.mod) || 0;
    for (const pm of powerMods) if (activeEffectIds.includes(pm.id)) pool += Number(pm.mod) || 0;

    // V5 Impairment: −2 to Physical (Health) / Social & Mental (Willpower) pools.
    // The Beast ignores pain during frenzy; a spent Willpower can also negate it.
    if (trackers && !sheet?.frenzyState && !wpIgnoreImpair) {
      if (trackers.healthImpaired && selectedTraits.some(t => PHYS_TRAITS.has(t))) pool -= 2;
      if (trackers.willpowerImpaired && selectedTraits.some(t => MENTAL_SOCIAL_TRAITS.has(t))) pool -= 2;
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

  // Non-physical Discipline selected while frenzied: the roll is still allowed
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
      if (prev.length >= 3) return [prev[1], prev[2], trait];
      return [...prev, trait];
    });
  };

  const loadCharacter = async () => {
    if (preview) return;
    const { data } = await api.get('/characters/me');
    const char = data.character ?? null;
    if (!char) { setCharacterChecked(true); return; }
    const parsedSheet = typeof char.sheet === 'string' ? JSON.parse(char.sheet) : char.sheet;
    setCharacter(char);
    setSheet(parsedSheet);
    setTrackers(summarizeTrackers(parsedSheet));
    setCharacterChecked(true);
  };

  // Preview: the dashboard hands us the player's current character (and re-hands it as it changes).
  useEffect(() => {
    if (!preview?.character) return;
    const parsed = typeof preview.character.sheet === 'string' ? JSON.parse(preview.character.sheet) : preview.character.sheet;
    setCharacter(preview.character);
    setSheet(parsed);
    setTrackers(summarizeTrackers(parsed));
    setCharacterChecked(true);
  }, [preview]);

  // The session effect waits for this attempt to finish (even a failed one) so a
  // slow character fetch can't make us look like a non-participant.
  const [charAttempted, setCharAttempted] = useState(false);
  useEffect(() => { loadCharacter().catch(() => {}).finally(() => setCharAttempted(true)); }, []);

  // Back to "Not Connected": the session ended (ST or auto-close) or the ST removed us.
  const leaveSession = (message) => {
    if (!preview) { try { localStorage.removeItem('liveSessionId'); } catch (e) {} }
    setSessionId('');
    setCodeInput('');
    setSession(null);
    setBroadcasts([]);
    setConnStatus(message);
    setTimeout(() => setConnStatus(''), 8000);
  };

  const loadSession = async (targetId = sessionId) => {
    if (!targetId) return;
    try {
      const [sData, bData, rData, pData] = await Promise.all([
        // 403 = we are not (or no longer) a participant.
        getLiveSession(targetId).catch(e => (e?.response?.status === 403 ? { forbidden: true } : {})),
        getLiveSessionBroadcasts(targetId).catch(() => ({ broadcasts: [] })),
        getLiveSessionRolls(targetId).catch(() => ({ rolls: [] })),
        api.get(`/live-session/${targetId}/players`).then(res => res.data).catch(() => ({ players: [] }))
      ]);

      if (sData.forbidden) return leaveSession('You are no longer part of that session.');

      const sessionObj = sData.session || sData || {};

      // The ST ended it (or it was left over from a past night): drop out so
      // the player can't keep acting in, or auto-rejoin, a closed session.
      if (sessionObj.status === 'ended') return leaveSession('That session has ended.');

      sessionObj.players = pData.players || [];
      setSession(sessionObj);

      let bList = bData.broadcasts || bData.messages || [];
      let rList = rData.rolls || rData || [];
      if (preview) {
        const mine = String(preview.character?.id);
        bList = bList.filter(b => !b.target_character_id || String(b.target_character_id) === mine);
        rList = rList.filter(r => !r.is_hidden || String(r.character_id) === mine);
      }

      const combined = [...bList, ...rList].sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
      setBroadcasts(combined);
    } catch (e) { }
  };

  const handleConnect = async (targetId) => {
    const sid = String(targetId || codeInput || '').trim();
    if (!sid) return;
    try {
      await joinLiveSession(sid, { characterId: character?.id });
      try { localStorage.setItem('liveSessionId', sid); } catch (e) {}
      setCodeInput(sid);
      setSessionId(sid);
      socket.emit('join_session', sid);
      await loadSession(sid);
      setConnStatus('Connected successfully');
      setTimeout(() => setConnStatus(''), 3000);
    } catch (e) {
      setConnStatus(e?.response?.data?.error || 'Failed to connect');
      setTimeout(() => setConnStatus(''), 4000);
    }
  };

  // Not in a session: list the running one(s) so a player can tap to join
  // instead of typing the code. Re-checked every 15s in case the ST starts it
  // while this screen is open.
  useEffect(() => {
    if (sessionId) { setOpenSessions([]); return undefined; }
    let alive = true;
    const find = () => api.get('/live-session/active')
      .then(res => { if (alive) setOpenSessions(res.data?.sessions || []); })
      .catch(() => {});
    find();
    const id = setInterval(find, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [sessionId]);

  useEffect(() => {
    // Wait for the character check: joining (or being judged "not a participant")
    // before it lands would drop a player who simply hasn't loaded yet.
    if (!sessionId || !charAttempted) return undefined;

    // ST tracker adjustments (hunger, health, frenzy, etc.) land on our own character row too:
    // refresh it alongside the session so changes made by the Storyteller actually show up here.
    // Bursts of events (everyone rolling at once) collapse into one reload.
    let timer = null;
    const onRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { loadSession(); loadCharacter(); }, 300); // loadCharacter is a no-op in preview
    };
    // Someone joined or dropped: only the roster changes.
    const onPresence = () => {
      api.get(`/live-session/${sessionId}/players`)
        .then(res => setSession(s => (s ? { ...s, players: res.data?.players || [] } : s)))
        .catch(() => {});
    };
    const rejoin = () => socket.emit('join_session', sessionId);

    const initSession = async () => {
      if (!preview) {
        await joinLiveSession(sessionId, { characterId: character?.id }).catch(() => {});
        rejoin();
      }
      // Session data is participants-only, so load it after the join lands.
      loadSession();
    };
    initSession();

    if (!preview) socket.on('connect', rejoin);
    socket.on('refresh_session', onRefresh);
    socket.on('session_presence', onPresence);

    // Sockets deliver updates; polling is the safety net. Every 5s while the
    // socket is down, otherwise only a slow 30s resync.
    let tick = 0;
    const pollId = setInterval(() => {
      tick += 1;
      if (!socket.connected || tick % 6 === 0) loadSession();
    }, 5000);

    return () => {
      clearTimeout(timer);
      socket.off('refresh_session', onRefresh);
      socket.off('session_presence', onPresence);
      socket.off('connect', rejoin);
      clearInterval(pollId);
    };
  }, [sessionId, character?.id, charAttempted]);

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

  // Messy Critical / Bestial Failure: the Beast acts out. Prompt the player to
  // pick a Compulsion (V5 core: general four + clan-specific).
  const maybeCompulsion = (outcome) => {
    if (outcome?.hasMessyCritical) setCompulsionPrompt({ kind: 'messy' });
    else if (outcome?.hasBestialFailure) setCompulsionPrompt({ kind: 'bestial' });
  };

  // Every roll is thrown by the server (POST /dice/roll), which builds the pool
  // from the stored sheet and logs it in the one dice table / session feed.
  // The pool shown on screen is only a preview. This turns the server's
  // answer into what the dice tray shows.
  const showServerRoll = (row) => {
    const normal = row?.results?.normal || [];
    const hunger = row?.results?.hunger || [];
    const roll = {
      id: row.id,
      type: row.roll_type || row.rollType,
      note: row.note,
      pool: row.pool,
      hunger: row.hunger,
      difficulty: row.difficulty || 0,
      normalDice: normal,
      hungerDice: hunger,
      outcome: computeOutcome(normal, hunger, row.difficulty || 0),
      rerolled: Boolean(row.rerolled),
    };
    setLastRoll(roll);
    setWpSelections([]);
    setWpRerollMode(false);
    return roll;
  };

  const serverRoll = async (body) => {
    setMobileTab('action');
    setIsRolling(true);
    try {
      const { data } = await api.post('/dice/roll', { sessionId, isHidden: hiddenRollsActive, ...body });
      if (data.sheet) { setSheet(data.sheet); setTrackers(summarizeTrackers(data.sheet)); }
      const roll = showServerRoll(data.roll);
      maybeCompulsion(roll.outcome);
      return data;
    } catch (e) {
      setLastRoll({
        normalDice: [], hungerDice: [],
        outcome: { successes: 0, hasCritical: false, hasMessyCritical: false, hasBestialFailure: false, label: 'Error' },
        type: body.mode, note: e?.response?.data?.error || 'Failed to communicate with server.',
      });
      return null;
    } finally {
      setTimeout(() => setIsRolling(false), 1500);
    }
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

  // Mending is rolled and applied by the server (POST /characters/:id/mend):
  // players can't write Health or Hunger themselves.
  const mendOnServer = async (type) => {
    try {
      const { data } = await api.post(`/characters/${character.id}/mend`, { type, sessionId, isHidden: hiddenRollsActive });
      setSheet(data.sheet);
      setTrackers(summarizeTrackers(data.sheet));
      const dice = data.rolls.flatMap(r => r.dice);
      const fails = data.rolls.filter(r => !r.success).length;
      const note = `Mend ${type}: healed ${data.healed}${fails ? `, Hunger +${fails}` : ''}`;
      setLastRoll({
        normalDice: [],
        hungerDice: dice,
        outcome: { successes: data.rolls.length - fails, hasCritical: false, hasMessyCritical: false, hasBestialFailure: false },
        type: 'mend_rouse',
        note,
      });
    } catch (e) {
      setLastRoll({
        normalDice: [], hungerDice: [],
        outcome: { successes: 0, hasCritical: false, hasMessyCritical: false, hasBestialFailure: false, label: 'Error' },
        type: 'mend_rouse', note: e?.response?.data?.error || 'Failed to communicate with server.',
      });
    }
  };

  // Heal Superficial: one Rouse Check, then remove Mend Amount levels (V5).
  const mendSuperficialSelf = async () => {
    if (!trackers || trackers.health.superficial <= 0) return;
    setMobileTab('action');
    setIsRolling(true);
    await mendOnServer('superficial');
    setTimeout(() => setIsRolling(false), 1500);
  };

  // Heal 1 Aggravated: three Rouse Checks at the start of the night (V5).
  const mendAggravatedSelf = async () => {
    if (!trackers || trackers.health.aggravated <= 0) return;
    setMobileTab('action');
    setIsRolling(true);
    await mendOnServer('aggravated');
    setTimeout(() => setIsRolling(false), 1500);
  };

  // Spend 1 Superficial Willpower for a rules-defined effect.
  const spendWillpower = async (why) => {
    if (trackers.willpower.superficial + trackers.willpower.aggravated >= trackers.willpower.max) return;
    if (why === 'ignore_impairment') {
      // Charged by the server together with the next roll, and only if that roll is impaired.
      setWpIgnoreImpair(true);
      setSignalNote('Impairment ignored for your next roll: 1 Willpower is spent with it.');
      setTimeout(() => setSignalNote(''), 3000);
      return;
    }
    try {
      const { data } = await api.post(`/characters/${character.id}/spend-wp`);
      setSheet(data.sheet);
      setTrackers(summarizeTrackers(data.sheet));
    } catch (e) { /* best effort */ }
    if (why === 'ignore_impairment') {
      setWpIgnoreImpair(true);
      setSignalNote('Willpower spent: impairment ignored for this roll.');
    } else if (why === 'frenzy_control') {
      setSignalNote('Willpower spent: you act freely this turn.');
    }
    setTimeout(() => setSignalNote(''), 3000);
  };

  const executeRoll = async () => {
    const effectIds = activeEffectIds.filter(id => myEffects.some(e => e.id === id));
    const powerIds = powerMods.filter(pm => activeEffectIds.includes(pm.id)).map(pm => pm.id.replace(/^pw-/, ''));
    await serverRoll({
      mode: 'traits',
      traits: selectedTraits,
      specialty: specialtyActive,
      bloodSurge: bloodSurgeActive,
      effectIds,
      powerIds,
      situational: Number(situationalMod) ? { mod: Number(situationalMod), reason: modReason } : null,
      ignoreImpairment: wpIgnoreImpair,
    });
    setSituationalMod(0);
    setModReason('');
    setActiveEffectIds([]);
    setWpIgnoreImpair(false);
    setBloodSurgeActive(false);
    setSpecialtyActive(false);
  };

  // The ST asked for a specific pool. The player can't retune the traits or add
  // their own specialty: the ST already decided both. Impairment, Hunger, the
  // Blood Potency Discipline bonus and any ST-granted specialty still apply.
  const resolveRollRequest = async (req) => {
    await serverRoll({ mode: 'request', requestId: req.id });
    setWpIgnoreImpair(false);
  };

  // V5: Willpower can't be spent to reroll frenzy, Remorse, Rouse or Humanity tests.
  // Only regular dice can be rerolled (up to 3), once per roll.
  const rerollAllowed = Boolean(
    lastRoll
    && !lastRoll.rerolled
    && lastRoll.type !== 'willpower_reroll'
    && !['frenzy_resistance', 'remorse', 'rouse_check', 'discipline_rouse_check', 'blush_of_life', 'blood_surge', 'mend_rouse'].includes(lastRoll.type)
    && (lastRoll.normalDice?.length > 0)
    && trackers?.willpower
    && ((Number(trackers.willpower.superficial) || 0) + (Number(trackers.willpower.aggravated) || 0) < (Number(trackers.willpower.max) || 1))
  );

  // Opens the reroll picker. Nothing is pre-selected: the player chooses up to
  // three regular dice (hunger dice can't be rerolled).
  const startWillpowerReroll = (targetRoll = lastRoll) => {
    const roll = targetRoll || lastRoll;
    if (!roll || !rerollAllowed || !(roll.normalDice || []).length) return;
    setWpSelections([]);
    setWpRerollMode(true);
  };

  const cancelWillpowerReroll = () => {
    setWpRerollMode(false);
    setWpSelections([]);
  };

  const toggleDieSelection = (index) => {
    if (isRolling) return;
    if (!wpRerollMode) {
      if (rerollAllowed) {
        setWpRerollMode(true);
        setWpSelections([index]);
      }
      return;
    }
    setWpSelections(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      if (prev.length < 3) return [...prev, index];
      return prev;
    });
  };

  const handleWillpowerReroll = async () => {
    if (!lastRoll?.id || !wpSelections.length || !rerollAllowed) return;

    setMobileTab('action');
    setIsRolling(true);
    try {
      const { data } = await api.post(`/dice/rolls/${lastRoll.id}/reroll`, { indices: wpSelections });
      if (data.sheet) {
        setSheet(data.sheet);
        setCharacter(prev => prev ? { ...prev, sheet: data.sheet } : prev);
        setTrackers(summarizeTrackers(data.sheet));
      }
      setWpRerollMode(false);
      setWpSelections([]);
      showServerRoll(data.roll);
      setSignalNote('1 Willpower spent: dice rerolled.');
      setTimeout(() => setSignalNote(''), 3000);
    } catch (e) {
      setSignalNote(e?.response?.data?.error || 'Reroll failed.');
      setTimeout(() => setSignalNote(''), 3000);
    } finally {
      setTimeout(() => setIsRolling(false), 1200);
    }
  };

  const openRerollFromFeed = (row) => {
    const roll = showServerRoll(row);
    setMobileTab('action');
    const isAllowed = !row.rerolled
      && !['frenzy_resistance', 'remorse', 'rouse_check', 'discipline_rouse_check', 'blush_of_life', 'blood_surge', 'mend_rouse', 'willpower_reroll'].includes(row.roll_type)
      && (roll.normalDice?.length > 0)
      && trackers?.willpower
      && ((Number(trackers.willpower.superficial) || 0) + (Number(trackers.willpower.aggravated) || 0) < (Number(trackers.willpower.max) || 1));

    if (isAllowed) {
      startWillpowerReroll(roll);
    }
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

    try {
      // The server grants the Blood Potency reroll die itself, for an owned
      // power at or below the reroll level, and sets hunger frenzy at Hunger 5.
      const usedPower = autoActivate?.power?.id ? { discipline: autoActivate.discName, powerId: autoActivate.power.id } : {};
      const { data } = await api.post(`/characters/${character.id}/rouse`, { ...usedPower, source, sessionId, isHidden: hiddenRollsActive });

      const { success, die1, die2, advantage, nextHunger, sheet: nextSheet } = data;
      setSheet(nextSheet);
      setTrackers(summarizeTrackers(nextSheet));

      const rollNote = success
        ? (advantage ? 'Pass : No Hunger Gained (BP Reroll Advantage)' : 'Pass : No Hunger Gained')
        : (advantage ? 'Fail : Hunger +1 (BP Reroll Advantage)' : 'Fail : Hunger +1');

      setLastRoll({
        normalDice: [],
        hungerDice: advantage ? [die1, die2].filter(Boolean) : [die1],
        outcome: { successes: success ? 1 : 0, hasCritical: false, hasMessyCritical: false, hasBestialFailure: false },
        type: source,
        note: rollNote,
      });
      setWpSelections([]);

      if (autoActivate && autoActivate.logActivation !== false) {
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

  // Roll a discipline power's activation pool (server-built from the power's own dice pool).
  const rollDisciplinePower = async (power, discName) => {
    await serverRoll({ mode: 'power', discipline: discName, powerId: power.id });
    setWpIgnoreImpair(false);
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

    // Pay the Rouse cost (some powers need two). All Rouse checks receive BP reroll
    // advantage if power level is <= rouseRerollLevel; only the first logs activation.
    const rouseCount = disciplineRouseCost(power);
    for (let i = 0; i < rouseCount; i++) {
      await handleRouse('discipline_rouse_check', { power, discName, logActivation: i === 0 }, true);
    }

    // Roll the activation pool if the power has one; otherwise just log it.
    const traits = parseDicePool(power.dice_pool);
    if (traits) {
      await rollDisciplinePower(power, discName);
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

  // Resist frenzy: unspent Willpower + Humanity/3, rolled by the server, which clears the frenzy on a success.
  const handleResistFrenzy = async () => {
    if (!sheet?.frenzyState) return;
    await serverRoll({ mode: 'frenzy' });
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
    return <div className={`${styles.container} ${styles.theme}`}><div style={{ margin: 'auto', textAlign: 'center' }}>You need an approved character before you can join a Live Session.</div></div>;
  }

  if (!trackers) return <div className={`${styles.container} ${styles.theme}`}><div style={{ margin: 'auto' }}>Loading LARP Interface...</div></div>;

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

  const runCommonRoll = (r) => {
    setSelectedTraits([r.attribute, r.skill]);
    setMobileTab('action');
  };

  return (
    <div className={`${styles.container} ${styles.theme}`}>
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
              Resist (unspent Willpower + Humanity/3)
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
              {compulsionPrompt.kind === 'messy' ? 'Messy Critical' : 'Bestial Failure'}: the Beast stirs
            </div>
            <div className={styles.modalBody} style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              <p style={{ marginBottom: '0.75rem' }}>Pick the Compulsion that takes hold (Storyteller may override):</p>
              {cref && cref.compulsion && cref.compulsion !== 'None.' && (
                <button className={styles.compulsionChoice} onClick={() => setCompulsion(`${clan}: ${cref.compulsion}`)}>
                  <strong>{clan} Compulsion</strong><br />{cref.compulsion}
                </button>
              )}
              {GENERAL_COMPULSIONS.map(c => (
                <button key={c.name} className={styles.compulsionChoice} onClick={() => setCompulsion(`${c.name}: ${c.text}`)}>
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
            ? <span>You have entered <strong>torpor</strong>: the Storyteller controls your fate.</span>
            : <span>
                {healthImpaired && <strong>Impaired</strong>}
                {healthImpaired && ': 2 dice penalty to Physical pools. '}
                {willImpaired && <strong>Willpower spent</strong>}
                {willImpaired && ': 2 dice penalty to Social &amp; Mental pools.'}
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
          <section style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Avatar userId={character?.user_id || character?.id} clan={clan} size={64} style={{ borderRadius: 8, border: '1px solid var(--outline-variant)' }} fallback={symlogoWhite(clan)} />
              <div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--primary)' }}>{charName}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                  {clan !== 'Unknown Clan' && <img src={symlogoWhite(clan)} alt={clan} style={{ width: 14, height: 14, objectFit: 'contain', opacity: 0.85 }} onError={(e) => { e.target.style.display = 'none'; }} />}
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{clan} • BP {bp}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Active discipline powers: always visible while running */}
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
              <button
                className={styles.btnPrimary}
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', marginTop: '1rem' }}
                disabled={isRolling}
                onClick={() => handleRouse('rouse_check')}
              >
                Perform Rouse Check
              </button>
              {bpStats.rouseRerollLevel > 0 && (
                <button
                  className={styles.btnOutline}
                  style={{ width: '100%', padding: '0.35rem', fontSize: '0.72rem', marginTop: '0.4rem' }}
                  disabled={isRolling}
                  onClick={() => handleRouse('discipline_rouse_check', { power: { level: bpStats.rouseRerollLevel, name: 'Discipline Rouse' }, discName: 'Discipline' })}
                  title={`Rouse check with Blood Potency reroll advantage for powers at or below level ${bpStats.rouseRerollLevel}`}
                >
                  Discipline Rouse (BP Reroll &le; {bpStats.rouseRerollLevel})
                </button>
              )}
            </div>
            {/* Health */}
            <div>
              <TrackerBlock label="Health" val="" max={trackers.health.max} agg={trackers.health.aggravated} sup={trackers.health.superficial} />
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  className={styles.btnOutline}
                  style={{ flex: '1 1 120px', padding: '0.35rem', fontSize: '0.7rem' }}
                  disabled={trackers.health.superficial <= 0 || isRolling}
                  onClick={mendSuperficialSelf}
                  title={`Rouse Check, then heal ${bpStats.mendAmount} Superficial`}
                >
                  Mend Sup ({bpStats.mendAmount})
                </button>
                <button
                  className={styles.btnOutline}
                  style={{ flex: '1 1 120px', padding: '0.35rem', fontSize: '0.7rem' }}
                  disabled={trackers.health.aggravated <= 0 || isRolling}
                  onClick={mendAggravatedSelf}
                  title="Three Rouse Checks at the start of the night, then heal 1 Aggravated"
                >
                  Mend Agg (3 Rouse)
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

            {/* Blood Potency */}
            <div className={styles.trackerBox} style={{ padding: '1rem 1.25rem', marginBottom: '0.5rem', background: 'var(--surface-container-high)' }}>
              <div className={styles.trackerHeader} style={{ marginBottom: '0.6rem' }}>
                <span className={styles.labelMd}>Blood Potency</span>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                  BP {bp}
                </span>
              </div>
              <div className={styles.dotRow} style={{ gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {Array.from({ length: 10 }).map((_, i) => {
                  const filled = i < bp;
                  return <div key={i} className={filled ? styles.dotFilled : styles.dotEmpty} />;
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.72rem', marginBottom: '0.5rem' }}>
                <div style={{ background: 'var(--surface-container-highest)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Blood Surge: </span>
                  <strong style={{ color: 'var(--primary)' }}>+{bpStats.surgeBonus} dice</strong>
                </div>
                <div style={{ background: 'var(--surface-container-highest)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mend: </span>
                  <strong style={{ color: 'var(--on-surface)' }}>{bpStats.mendAmount} Sup</strong>
                </div>
                <div style={{ background: 'var(--surface-container-highest)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Disc Bonus: </span>
                  <strong style={{ color: 'var(--on-surface)' }}>+{bpStats.disciplineBonus} dice</strong>
                </div>
                <div style={{ background: 'var(--surface-container-highest)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Rouse Reroll: </span>
                  <strong style={{ color: 'var(--on-surface)' }}>{bpStats.rouseRerollLevel > 0 ? `Lvl \u2264 ${bpStats.rouseRerollLevel}` : 'None'}</strong>
                </div>
                <div style={{ background: 'var(--surface-container-highest)', padding: '0.3rem 0.5rem', borderRadius: '4px', gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bane Severity: </span>
                  <strong style={{ color: 'var(--error)' }}>{bpStats.baneSeverity}</strong>
                </div>
              </div>
              {bpStats.feedingPenalty && !['No effect', 'No penalty', 'None'].includes(bpStats.feedingPenalty) && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--error)', lineHeight: '1.35' }}>
                    <strong>Feeding: </strong>{bpStats.feedingPenalty}
                  </p>
                </div>
              )}
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
                  Degeneration: Stains exceed empty boxes, 2 dice penalty to all pools, take Aggravated Willpower damage.
                </p>
              )}
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{humanityEffects}</p>
            </div>

            {/* Clan Bane & Compulsion */}
            {cref && (
              <div className={styles.trackerBox} style={{ padding: '1rem 1.25rem', marginBottom: '1rem', background: 'var(--surface-container-high)' }}>
                <div className={styles.trackerHeader} style={{ marginBottom: '0.6rem' }}>
                  <span className={styles.labelMd}>{clan}: Curse</span>
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
                              {p.dice_pool && p.dice_pool !== '—' && p.dice_pool !== 'None' && <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Pool: {p.dice_pool}</span>}
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
                              {p.dice_pool && p.dice_pool !== '—' && p.dice_pool !== 'None' && <p style={{ margin: '0 0 0.25rem 0' }}><strong style={{ color: 'var(--primary)' }}>Dice Pool:</strong> {p.dice_pool}</p>}
                              {p.opposing_pool && p.opposing_pool !== '—' && p.opposing_pool !== 'None' && <p style={{ margin: '0 0 0.25rem 0' }}><strong style={{ color: 'var(--primary)' }}>Opposing Pool:</strong> {p.opposing_pool}</p>}
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
                      <strong>{session.players?.length ?? 0}</strong> Players
                    </span>
                  </>
                )}
              </div>

              <div className={styles.sessionBarConnect}>
                <input
                  className={styles.sessionBarInput}
                  placeholder="Session ID"
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleConnect(); }}
                />
                <button className={styles.btnPrimary} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => handleConnect()}>
                  Connect
                </button>
                {connStatus && (
                  <span className={styles.sessionBarStatus} data-ok={connStatus.includes('success')}>{connStatus}</span>
                )}
              </div>
            </div>

            {/* Running session(s): one tap to join instead of typing a code */}
            {!session && openSessions.length > 0 && (
              <div className={styles.openSessions}>
                {openSessions.map(s => (
                  <button key={s.session_code} className={styles.openSession} onClick={() => handleConnect(s.session_code)}>
                    <span className="material-symbols-outlined">play_circle</span>
                    <span className={styles.openSessionText}>
                      <strong>{s.name || 'Live Session'}</strong>
                      <small>Storyteller {s.admin_name || 'Admin'} · tap to join</small>
                    </span>
                  </button>
                ))}
              </div>
            )}

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
                      Initiative{session.metadata.round ? `: Round ${session.metadata.round}` : ''}
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
              <div className={styles.rollActions}>
                <button className={styles.btnOutline} onClick={() => setSelectedTraits([])}>CLEAR</button>
                <button className={styles.btnPrimary} disabled={selectedTraits.length === 0} onClick={() => executeRoll()}>ROLL {currentPool} DICE</button>
              </div>
            </div>

            {/* Common rolls: quick trait presets */}
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
                <span>While frenzied the Beast only permits physical Disciplines: <strong>{frenzyBlockedTrait}</strong> is off-limits. Your Storyteller has the final say.</span>
              </div>
            )}

            {/* Surge & Settings */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {bpStats.surgeBonus > 0 && (
                <div
                  className={styles.toggleContainer}
                  onClick={() => {
                    if (trackers?.hunger >= 5) return;
                    setBloodSurgeActive(!bloodSurgeActive);
                  }}
                  title={trackers?.hunger >= 5 ? 'Cannot Blood Surge at Hunger 5: slake your hunger first' : `Blood Surge (+${bpStats.surgeBonus})`}
                  style={trackers?.hunger >= 5 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                >
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
                  title="Storyteller effect: tap to add to this roll"
                >
                  {e.label} {Number(e.mod) > 0 ? '+' : ''}{e.mod}
                </button>
              ))}
              {powerMods.map(pm => (
                <button
                  key={pm.id}
                  className={`${styles.commonRollBtn} ${activeEffectIds.includes(pm.id) ? styles.commonRollOn : ''}`}
                  onClick={() => setActiveEffectIds(prev => prev.includes(pm.id) ? prev.filter(x => x !== pm.id) : [...prev, pm.id])}
                  title={`${pm.label}: ${pm.target}. Tap to add to this roll if it applies.`}
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
            <div className={styles.rollOverlay} onClick={(e) => { if (e.target === e.currentTarget && !isRolling) { setLastRoll(null); setWpRerollMode(false); setWpSelections([]); } }}>
              <div className={styles.rollResultCard} style={{ background: 'var(--surface-container)', borderRadius: '1rem', border: '1px solid var(--outline-variant)', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.8)', maxWidth: '90%', maxHeight: '90%', overflowY: 'auto' }}>
                <h2 className={styles.displayLg} style={{ color: isRolling ? 'var(--on-surface)' : (lastRoll.outcome.hasBestialFailure || lastRoll.outcome.hasMessyCritical ? 'var(--error)' : 'var(--primary)'), marginBottom: '0.5rem' }}>
                  {isRolling ? 'Rolling...' : lastRoll.outcome.label}
                </h2>
                <p className={styles.textMuted} style={{ marginBottom: wpRerollMode ? '1rem' : '2rem' }}>{lastRoll.note}</p>

                {wpRerollMode && (
                  <div style={{
                    background: 'rgba(198, 40, 40, 0.12)',
                    border: '1px solid var(--primary)',
                    borderRadius: '8px',
                    padding: '0.6rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    color: 'var(--on-surface)',
                    fontSize: '0.85rem',
                  }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>info</span>
                    <span>Select up to 3 regular dice to reroll : <strong style={{ color: 'var(--primary)' }}>{wpSelections.length} / 3 selected</strong></span>
                  </div>
                )}

                <div className={styles.diceContainer} style={{ gap: '1.25rem', alignItems: 'center', justifyContent: 'center' }}>
                  {lastRoll.normalDice.map((die, i) => {
                    const isSelected = wpSelections.includes(i);
                    const totalCount = (lastRoll.normalDice?.length || 0) + (lastRoll.hungerDice?.length || 0);
                    return (
                      <div key={`n_${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <D10Die
                          index={i}
                          value={die}
                          isHunger={false}
                          isRolling={isRolling}
                          selectable={!isRolling && rerollAllowed}
                          selected={isSelected}
                          onClick={() => toggleDieSelection(i)}
                          size="lg"
                          poolCount={totalCount}
                          showNumber={true}
                        />
                        {isSelected && !isRolling && (
                          <span style={{ color: 'var(--primary)', fontSize: '0.75rem', marginTop: 4, fontWeight: 'bold' }}>
                            Reroll
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {lastRoll.hungerDice.map((die, i) => {
                    const totalCount = (lastRoll.normalDice?.length || 0) + (lastRoll.hungerDice?.length || 0);
                    return (
                      <div key={`h_${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: wpRerollMode ? 0.45 : 1, transition: 'opacity 0.2s' }}>
                        <D10Die
                          index={i}
                          value={die}
                          isHunger={true}
                          isRolling={isRolling}
                          size="lg"
                          poolCount={totalCount}
                          showNumber={true}
                        />
                        {wpRerollMode && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginTop: 4 }}>
                            Hunger
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {wpRerollMode && lastRoll.hungerDice.length > 0 && (
                  <p style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Hunger dice cannot be rerolled with Willpower
                  </p>
                )}

                {!isRolling && (
                  <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                    {wpRerollMode ? (
                      <>
                        <button className={styles.btnOutline} onClick={cancelWillpowerReroll}>
                          Cancel
                        </button>
                        <button
                          className={styles.btnPrimary}
                          disabled={wpSelections.length === 0}
                          onClick={handleWillpowerReroll}
                          title={wpSelections.length === 0 ? 'Select at least 1 die to reroll' : 'Spend 1 Willpower to reroll selected dice'}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', marginRight: '0.4rem', verticalAlign: 'middle' }}>refresh</span>
                          Reroll {wpSelections.length} {wpSelections.length === 1 ? 'Die' : 'Dice'} (Cost: 1 WP)
                        </button>
                      </>
                    ) : (
                      <>
                        <button className={styles.btnOutline} onClick={() => { setLastRoll(null); setWpRerollMode(false); setWpSelections([]); }}>
                          Dismiss
                        </button>
                        {rerollAllowed && (
                          <button className={styles.btnPrimary} onClick={() => startWillpowerReroll()}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', marginRight: '0.4rem', verticalAlign: 'middle' }}>refresh</span>
                            Willpower Reroll
                          </button>
                        )}
                        {!rerollAllowed && lastRoll.rerolled && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Roll already rerolled
                          </span>
                        )}
                        {!rerollAllowed && !lastRoll.rerolled && (Number(trackers?.willpower?.superficial || 0) + Number(trackers?.willpower?.aggravated || 0) >= Number(trackers?.willpower?.max || 1)) && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            No Willpower remaining
                          </span>
                        )}
                        {!rerollAllowed && !lastRoll.rerolled && !(Number(trackers?.willpower?.superficial || 0) + Number(trackers?.willpower?.aggravated || 0) >= Number(trackers?.willpower?.max || 1)) && lastRoll.normalDice?.length === 0 && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            No regular dice to reroll
                          </span>
                        )}
                        {!rerollAllowed && !lastRoll.rerolled && ['frenzy_resistance', 'remorse', 'rouse_check', 'discipline_rouse_check', 'blush_of_life', 'blood_surge', 'mend_rouse'].includes(lastRoll.type) && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Willpower cannot be spent on this test
                          </span>
                        )}
                      </>
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
          {showAdminTab === 'feed' && <LiveSessionRollHistory rolls={broadcasts} currentCharacterId={character?.id} isAdmin={isAdmin} onReroll={openRerollFromFeed} />}
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