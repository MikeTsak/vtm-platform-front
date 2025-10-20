// src/pages/CharacterView.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import api from '../api';
import { DISCIPLINES, ALL_DISCIPLINE_NAMES, iconPath } from '../data/disciplines';
import { RITUALS } from '../data/rituals';
import styles from '../styles/CharacterView.module.css';
import CharacterSetup from './CharacterSetup';
import { MERITS_AND_FLAWS } from '../data/merits_flaws';

/* ---------- Clan tint colors ---------- */
const CLAN_COLORS = {
  Brujah: '#b40f1f',
  Gangrel: '#2f7a3a',
  Malkavian: '#713c8b',
  Nosferatu: '#6a4b2b',
  Toreador: '#b8236b',
  Tremere: '#7b1113',
  Ventrue: '#1b4c8c',
  'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b',
  Lasombra: '#191a5a',
  'The Ministry': '#865f12',
  Caitiff: '#636363',
  'Thin-blood': '#6e6e2b',
};

const ATTRS = [
  ['Strength','Dexterity','Stamina'],
  ['Charisma','Manipulation','Composure'],
  ['Intelligence','Wits','Resolve'],
];

const SKILLS = {
  Physical: ['Athletics','Brawl','Craft','Drive','Firearms','Larceny','Melee','Stealth','Survival'],
  Social: ['Animal Ken','Etiquette','Insight','Intimidation','Leadership','Performance','Persuasion','Streetwise','Subterfuge'],
  Mental: ['Academics','Awareness','Finance','Investigation','Medicine','Occult','Politics','Science','Technology'],
};

/* ======================================================
   MERITS HELPERS (module-scope so MeritAdder can use them)
   ====================================================== */
function bulletCount(s = '') {
  const m = String(s).match(/•/g);
  return m ? m.length : 0;
}
/** Parse dot specs like "•", "•••", "• - •••", "•• or ••••", "• +" */
function parseDotSpec(spec = '') {
  const src = String(spec).trim();
  if (!src) return [];
  if (/\bor\b/i.test(src)) {
    const opts = src.split(/\bor\b/i).map(s => bulletCount(s)).filter(n => n > 0);
    return Array.from(new Set(opts)).sort((a, b) => a - b);
  }
  if (src.includes('-')) {
    const [lo, hi] = src.split('-').map(s => bulletCount(s));
    if (lo > 0 && hi >= lo) { const out = []; for (let i = lo; i <= hi; i++) out.push(i); return out; }
  }
  if (src.includes('+')) {
    const min = bulletCount(src);
    return min > 0 ? [min] : [];
  }
  const n = bulletCount(src);
  return n > 0 ? [n] : [];
}
function glyph(n) {
  return '•'.repeat(Math.max(0, Number(n) || 0));
}
/** Flatten merits only (exclude Caitiff/Thin-blood/Ghouls/Cults families) */
function allSelectableMerits() {
  const out = [];
  for (const [cat, payload] of Object.entries(MERITS_AND_FLAWS)) {
    if (['Caitiff', 'Thin-blood', 'Ghouls', 'Cults'].includes(cat)) continue;
    const pushIt = (item, category) => {
      const allowed = parseDotSpec(item.dots);
      if (!allowed.length) return; // not buyable here
      out.push({ id: item.id, name: item.name, dotsSpec: item.dots, description: item.description, category, allowed });
    };
    (payload.merits || []).forEach(m => pushIt(m, cat));
    if (payload.groups) {
      for (const [sub, grp] of Object.entries(payload.groups)) {
        (grp.merits || []).forEach(m => pushIt(m, `${cat} / ${sub}`));
      }
    }
  }
  const seen = new Set();
  return out.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

/* ===========================
   Sheet normalization helpers
   =========================== */
function looksLikeFlatSheet(s) {
  if (!s || typeof s !== 'object') return false;
  if (s.skills && typeof s.skills === 'object') {
    const vals = Object.values(s.skills);
    if (vals.length && vals.some(v => typeof v === 'number')) return true;
  }
  if ('bloodPotency' in s) return true;
  if ('predatorType' in s) return true;
  return false;
}

function isStructuredSheet(s) {
  if (!s || typeof s !== 'object') return false;
  if (!s.skills || typeof s.skills !== 'object') return false;
  const vals = Object.values(s.skills);
  if (!vals.length) return false;
  if (vals.some(v => typeof v === 'number')) return false;
  return vals.some(v => v && typeof v === 'object' && 'dots' in v);
}

function normalizeFromFlatAny(source) {
  const flat = source?.sheet && looksLikeFlatSheet(source.sheet) ? source.sheet : source;
  const sheet = {};

  sheet.attributes = { ...(flat.attributes || {}) };

  const skills = {};
  Object.entries(flat.skills || {}).forEach(([name, dots]) => {
    skills[name] = { dots: Number(dots || 0), specialties: [] };
  });
  (flat.specialties || []).forEach(s => {
    const [rawSkill, ...rest] = String(s).split(':');
    const skill = (rawSkill || '').trim();
    const spec = rest.join(':').trim();
    if (!skill) return;
    if (!skills[skill]) skills[skill] = { dots: 0, specialties: [] };
    if (spec) skills[skill].specialties.push(spec);
  });
  sheet.skills = skills;

  sheet.disciplines = { ...(flat.disciplines || {}) };
  sheet.disciplinePowers = { ...(flat.disciplinePowers || {}) };

  sheet.predator_type = flat.predatorType || flat.predator?.type || '';
  sheet.sire = flat.sire || '';
  sheet.ambition = flat.ambition || '';
  sheet.desire = flat.desire || '';

  sheet.advantages = {
    merits: Array.isArray(flat.advantages?.merits) ? flat.advantages.merits : [],
    flaws: Array.isArray(flat.advantages?.flaws) ? flat.advantages.flaws : [],
  };

  sheet.morality = flat.morality || {};
  sheet.humanity = flat.morality?.humanity ?? undefined;

  // normalized BP key
  sheet.blood_potency = Number(flat.bloodPotency ?? flat.blood_potency ?? 1);

  sheet.health_current = flat.health_current;
  sheet.health_max = flat.health_max;
  sheet.willpower_current = flat.willpower_current;
  sheet.willpower_max = flat.willpower_max;
  sheet.resonances = flat.resonances || [];

  sheet.rituals = {
    blood_sorcery: Array.isArray(flat.rituals?.blood_sorcery) ? flat.rituals.blood_sorcery : [],
    oblivion: Array.isArray(flat.rituals?.oblivion) ? flat.rituals.oblivion : [],
  };

  return sheet;
}

function attachStructured(raw) {
  if (!raw) return raw;
  if (isStructuredSheet(raw.sheet)) {
    const sheet = { ...raw.sheet };
    sheet.rituals = sheet.rituals || { blood_sorcery: [], oblivion: [] };
    sheet.rituals.blood_sorcery = sheet.rituals.blood_sorcery || [];
    sheet.rituals.oblivion = sheet.rituals.oblivion || [];
    // default BP
    if (sheet.blood_potency == null) sheet.blood_potency = 1;
    return { ...raw, sheet };
  }
  if (looksLikeFlatSheet(raw.sheet)) return { ...raw, sheet: normalizeFromFlatAny(raw) };
  return { ...raw, sheet: normalizeFromFlatAny(raw) };
}

/* ===========================
   XP rules (keep in sync with backend)
   =========================== */
const XP_RULES = {
  attribute: newLevel => newLevel * 5,
  skill: newLevel => newLevel * 3,
  specialty: () => 3,
  advantageDot: dots => dots * 3,
  disciplineClan: newLevel => newLevel * 5,
  disciplineOther: newLevel => newLevel * 7,
  disciplineCaitiff: newLevel => newLevel * 6,
  ritual: lvl => lvl * 3,
  ceremony: lvl => lvl * 3,
  bloodPotency: newLevel => newLevel * 10, // BP costs 10 × new level
};

function disciplineKindFor(ch, name) {
  if (ch?.clan === 'Caitiff') return 'caitiff';
  const aff = DISCIPLINES?.[name]?.clan_affinity || [];
  return aff.includes(ch?.clan) ? 'clan' : 'other';
}

function estimateDisciplineCost(ch, name, current, next) {
  const kind = disciplineKindFor(ch, name);
  if (kind === 'clan') return XP_RULES.disciplineClan(next);
  if (kind === 'other') return XP_RULES.disciplineOther(next);
  return XP_RULES.disciplineCaitiff(next);
}

/* ===========================
   Drawers
   =========================== */
function Drawer({ title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={styles.drawer}>
      <button
        className={styles.drawerHeader}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span>
          <b>{title}</b>{subtitle ? <small className={styles.muted}> — {subtitle}</small> : null}
        </span>
        <span className={styles.chev} data-open={open ? '1' : '0'}>▾</span>
      </button>
      <div className={styles.drawerBody} style={{ display: open ? 'block' : 'none' }}>
        {children}
      </div>
    </div>
  );
}

/* ===========================
   Component
   =========================== */
export default function CharacterView({
  adminNPCId = null,
  loadPath,
  xpSpendPath,
}) {
  const paths = useMemo(() => {
    if (adminNPCId) {
      return {
        load: `/admin/npcs/${adminNPCId}`,
        spend: `/admin/npcs/${adminNPCId}/xp/spend`,
        totals: null,
        pickFrom: 'npc',
      };
    }
    if (loadPath) {
      return {
        load: loadPath,
        spend: xpSpendPath,
        totals: null,
        pickFrom: 'npc',
      };
    }
    return {
      load: `/characters/me`,
      spend: `/characters/xp/spend`,
      totals: `/characters/xp/total`,
      pickFrom: 'character',
    };
  }, [adminNPCId, loadPath, xpSpendPath]);

  const [showSetup, setShowSetup] = useState(false);
  const [ch, setCh] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCfg, setModalCfg] = useState(null);
  const [pendingFixes, setPendingFixes] = useState([]);
  const [xpTotals, setXpTotals] = useState(null);
  const shopRef = useRef(null);

  // Load character/NPC
  useEffect(() => {
    let mounted = true;
    api.get(paths.load)
      .then(r => {
        let obj = null;
        if (adminNPCId || loadPath) obj = r.data.npc || r.data.character || r.data[paths.pickFrom] || null;
        else obj = r.data.character || r.data[paths.pickFrom] || r.data.npc || null;
        if (!mounted) return;
        setCh(attachStructured(obj));
      })
      .catch(e => {
        if (!mounted) return;
        setErr(e?.response?.data?.error || 'Failed to load character');
      });
    return () => { mounted = false; };
  }, [paths, adminNPCId, loadPath]);

  // Optional: fetch XP totals (players only)
  useEffect(() => {
    if (!paths.totals || !ch) return;
    api.get(paths.totals)
      .then(r => setXpTotals(r.data))
      .catch(() => {});
  }, [paths.totals, ch]);

  async function spendXP(payload) {
    setErr(''); setMsg('');
    try {
      const { data } = await api.post(paths.spend, payload);
      const obj = data.character || data.npc || null;
      setCh(attachStructured(obj));
      setMsg(`Spent ${data.spent} XP.`);
      if (paths.totals) {
        try { const t = await api.get(paths.totals); setXpTotals(t.data); } catch {}
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to spend XP');
      throw e;
    }
  }

  const tint = useMemo(() => (ch ? CLAN_COLORS[ch.clan] || '#8a0f1a' : '#8a0f1a'), [ch]);
  const sheet = ch?.sheet || {};
  const xp = ch?.xp ?? 0;

  const disciplinesMap = useMemo(
    () => (sheet?.disciplines && typeof sheet.disciplines === 'object' ? sheet.disciplines : {}),
    [sheet]
  );

  // Compute missing power selections (for current dots)
  const computeMissingPicks = useCallback(() => {
    const dots = sheet.disciplines || {};
    const picks = sheet.disciplinePowers || {};
    const q = [];
    Object.entries(dots).forEach(([name, lvl]) => {
      const L = Number(lvl || 0);
      if (!L) return;
      const chosen = new Set((Array.isArray(picks?.[name]) ? picks[name] : []).map(p => Number(p.level)));
      for (let i = 1; i <= L; i++) if (!chosen.has(i)) q.push({ name, level: i });
    });
    q.sort((a, b) => (a.name === b.name ? a.level - b.level : a.name.localeCompare(b.name)));
    return q;
  }, [sheet]);

  // When character loads/updates, prompt for any missing power selections
  useEffect(() => {
    if (!ch) return;
    const q = computeMissingPicks();
    setPendingFixes(q);
    if (q.length && !modalOpen) {
      const first = q[0];
      setModalCfg({
        name: first.name,
        current: first.level - 1,
        next: first.level,
        kind: 'select',
        assignOnly: true
      });
      setModalOpen(true);
    }
  }, [ch, computeMissingPicks, modalOpen]);

  // Discipline power confirm flow
  async function confirmDisciplinePurchase({ name, selectedPowerId, selectedPowerName, current, next, kind, assignOnly }) {
    const nextSheet = JSON.parse(JSON.stringify(sheet));
    nextSheet.disciplines = nextSheet.disciplines || {};
    nextSheet.disciplinePowers = nextSheet.disciplinePowers || {};

    if (!assignOnly) nextSheet.disciplines[name] = next;

    const list = Array.isArray(nextSheet.disciplinePowers[name]) ? nextSheet.disciplinePowers[name] : [];
    const filtered = list.filter(p => Number(p.level) !== Number(next));
    filtered.push({ level: next, id: selectedPowerId, name: selectedPowerName });
    nextSheet.disciplinePowers[name] = filtered.sort((a, b) => a.level - b.level);

    try {
      if (assignOnly) {
        await api.post(paths.spend, {
          type: 'discipline',
          disciplineKind: 'select',
          target: name,
          currentLevel: Number(nextSheet.disciplines[name] || 0),
          newLevel: Number(nextSheet.disciplines[name] || 0),
          patchSheet: nextSheet
        });
      } else {
        await spendXP({
          type: 'discipline',
          disciplineKind: kind, // 'clan' | 'other' | 'caitiff'
          target: name,
          currentLevel: current,
          newLevel: next,
          patchSheet: nextSheet
        });
      }

      // Refresh character after change
      const r = await api.get(paths.load);
      const obj = r.data[paths.pickFrom] || r.data.character || r.data.npc || null;
      setCh(attachStructured(obj));

      setModalOpen(false);
      setModalCfg(null);

      // Continue auto-assign queue if we were fixing missing powers
      if (assignOnly) {
        const rest = computeMissingPicks();
        setPendingFixes(rest);
        if (rest.length) {
          const first = rest[0];
          setModalCfg({
            name: first.name,
            current: first.level - 1,
            next: first.level,
            kind: 'select',
            assignOnly: true
          });
          setModalOpen(true);
        } else {
          setMsg('All discipline powers are now specified.');
        }
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save selection');
    }
  }

  // Ritual helpers
  const knownRitualIds = new Set([
    ...(sheet.rituals?.blood_sorcery || []).map(r => r.id),
    ...(sheet.rituals?.oblivion || []).map(r => r.id),
  ]);

  const knownRitualNames = useMemo(() => {
    const bs = Object.values(RITUALS.blood_sorcery.levels || {}).flat();
    const ob = Object.values(RITUALS.oblivion?.levels || {}).flat();
    const byId = new Map([...bs, ...ob].map(r => [r.id, r.name]));
    return Array.from(knownRitualIds).map(id => byId.get(id)).filter(Boolean);
  }, [knownRitualIds]);

  function canLearnRitual(level) {
    const bsLevel = Number(sheet.disciplines?.['Blood Sorcery'] || 0);
    return level <= bsLevel;
  }
  function canLearnCeremony(level) {
    const oblLevel = Number(sheet.disciplines?.['Oblivion'] || 0);
    return level <= oblLevel;
  }

  async function buyRitual(rit, level, cost) {
    const nextSheet = JSON.parse(JSON.stringify(sheet));
    nextSheet.rituals = nextSheet.rituals || { blood_sorcery: [], oblivion: [] };
    nextSheet.rituals.blood_sorcery = nextSheet.rituals.blood_sorcery || [];
    if (knownRitualIds.has(rit.id)) return;
    nextSheet.rituals.blood_sorcery.push({ id: rit.id, name: rit.name, level });
    await spendXP({ type: 'ritual', target: rit.id, ritualLevel: level, patchSheet: nextSheet });
  }
  async function buyCeremony(cer, level, cost) {
    const nextSheet = JSON.parse(JSON.stringify(sheet));
    nextSheet.rituals = nextSheet.rituals || { blood_sorcery: [], oblivion: [] };
    nextSheet.rituals.oblivion = nextSheet.rituals.oblivion || [];
    if (knownRitualIds.has(cer.id)) return;
    nextSheet.rituals.oblivion.push({ id: cer.id, name: cer.name, level });
    await spendXP({ type: 'ceremony', target: cer.id, ritualLevel: level, patchSheet: nextSheet });
  }

  // ===== Empty / loading & builder overlay (players only) =====
  if (!ch) {
    return (
      <div className={styles.emptyWrap} style={{ '--tint': tint }}>
        {(err || msg) && (
          <div className={err ? styles.alertError : styles.alertOk}>
            {err || msg}
          </div>
        )}

        <div className={styles.loadingSwap}>
          {/* Phase 1 */}
          <div className={styles.loadingPhase}>
            <div className={styles.spinner} aria-label="Loading" />
            <div className={styles.loadingText}>Loading character…</div>
          </div>

          {/* Phase 2: only for players */}
          {!adminNPCId && !loadPath && (
            <div className={styles.emptyPhase}>
              <h2 className={styles.cardHead}>No character found</h2>
              <p className={styles.muted}>Create your character to continue.</p>
              <button className={styles.cta} onClick={() => setShowSetup(true)}>
                Create Character
              </button>
            </div>
          )}
        </div>

        {/* Setup overlay */}
        {!adminNPCId && !loadPath && showSetup && (
          <div className={styles.setupOverlay} role="dialog" aria-modal="true">
            <button
              className={styles.setupClose}
              aria-label="Close"
              onClick={() => setShowSetup(false)}
            >
              ×
            </button>
            <div className={styles.setupOverlayInner}>
              <CharacterSetup onDone={() => window.location.reload()} />
            </div>
          </div>
        )}
      </div>
    );
  }

  const inClanDisciplines = ALL_DISCIPLINE_NAMES.filter(n => disciplineKindFor(ch, n) === 'clan');
  const outOfClanDisciplines = ALL_DISCIPLINE_NAMES.filter(n => disciplineKindFor(ch, n) !== 'clan');

  return (
    <div className={styles.root} style={{ '--tint': tint }}>
      <div className={styles.wrap}>
        <header className={styles.head}>
          <div className={styles.headerTop}>
            <h2 className={styles.title}>
              {ch.name} <span className={styles.clanTag}>({ch.clan})</span>
            </h2>
            <div className={styles.xpBadge}>
              XP: <b>{xp}</b>
            </div>
          </div>

          {paths.totals && xpTotals && (
            <div className={styles.xpTotals}>
              <span>Granted: <b>{xpTotals.granted}</b></span>
              <span>Spent: <b>{xpTotals.spent}</b></span>
              <span>Remaining: <b>{xpTotals.remaining}</b></span>
            </div>
          )}

          <div className={styles.metaRow}>
            <span>Predator: <b>{sheet?.predator_type || '—'}</b></span>
            <span>Sire: <b>{sheet?.sire || '—'}</b></span>
            <span>Ambition: <b>{sheet?.ambition || '—'}</b></span>
            <span>Desire: <b>{sheet?.desire || '—'}</b></span>
          </div>

          {err && <div className={styles.alertError}>{err}</div>}
          {msg && <div className={styles.alertOk}>{msg}</div>}
        </header>

        {/* ===== Overview ===== */}
        <section className={styles.section}>
          <div className={styles.sectionTitleWrap}>
            <h3 className={styles.sectionTitle}>Character Overview</h3>
            <button className={styles.cta} onClick={() => shopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              Go to XP Shop
            </button>
          </div>

          <div className={styles.card} style={{ display: 'grid', gap: 12 }}>
            <div className={styles.rowForm} style={{ gap: 12, flexWrap: 'wrap' }}>
              <Pill label="Blood Potency" value={sheet?.blood_potency ?? 1} />
              <Pill label="Humanity" value={sheet?.humanity ?? '—'} />
              <Pill label="Health" value={`${sheet?.health_current ?? '—'} / ${sheet?.health_max ?? '—'}`} />
              <Pill label="Willpower" value={`${sheet?.willpower_current ?? '—'} / ${sheet?.willpower_max ?? '—'}`} />
            </div>
          </div>

          <Card>
            <div className={styles.cardHead}><b>Attributes</b></div>
            <div className={styles.grid3Col}>
              {ATTRS.map((col, i) => (
                <div key={i} className={styles.grid}>
                  {col.map(name => (
                    <DotRow key={name} label={name} value={Number(sheet?.attributes?.[name] ?? 1)} max={5} />
                  ))}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className={styles.cardHead}><b>Skills</b></div>
            <div className={styles.grid3Col}>
              {Object.entries(SKILLS).map(([group, list]) => (
                <div key={group} className={styles.grid}>
                  <div className={styles.subhead}>{group}</div>
                  {list.map(name => {
                    const raw = sheet?.skills?.[name];
                    const node = (raw && typeof raw === 'object' && 'dots' in raw)
                      ? raw
                      : { dots: Number(raw || 0), specialties: [] };
                    return (
                      <DotRow
                        key={name}
                        label={name}
                        value={Number(node.dots || 0)}
                        max={5}
                        rightExtra={renderSpecs(node.specialties)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className={styles.cardHead}><b>Disciplines</b></div>
            <div className={styles.grid}>
              {Object.keys(disciplinesMap).sort().map(name => (
                <DisciplineRow
                  key={name}
                  name={name}
                  level={Number(disciplinesMap[name] || 0)}
                  powers={sheet.disciplinePowers?.[name] || []}
                />
              ))}
            </div>
          </Card>
        </section>

        {/* ===== XP SHOP ===== */}
        <section ref={shopRef} className={styles.section}>
          <div className={styles.sectionTitleWrap}>
            <h3 className={styles.sectionTitle}>XP Shop</h3>
            <span className={styles.muted}>You have <b>{xp}</b> XP</span>
          </div>

          {/* Blood Potency */}
          <Card>
            <div className={styles.cardHead}><b>Blood Potency</b></div>
            <div className={styles.grid}>
              {(() => {
                const current = Number(sheet.blood_potency ?? 1);
                const max = 10; // hard cap
                const next = Math.min(current + 1, max);
                const canRaise = current < max;
                const cost = XP_RULES.bloodPotency(next);
                const afford = xp >= cost;
                return (
                  <ShopRow
                    title={`Blood Potency (${current})`}
                    subtitle={canRaise ? `Raise to ${next}` : 'Max reached'}
                    cost={cost}
                    disabled={!canRaise || !afford}
                    hint={!canRaise ? `Max ${max}` : (!afford ? 'Not enough XP' : '')}
                    onBuy={async () => {
                      const nextSheet = JSON.parse(JSON.stringify(sheet));
                      nextSheet.blood_potency = next;
                      await spendXP({
                        type: 'blood_potency',
                        target: 'Blood Potency',
                        currentLevel: current,
                        newLevel: next,
                        patchSheet: nextSheet,
                      });
                    }}
                  />
                );
              })()}
            </div>
          </Card>

          {/* Attributes */}
          <Card>
            <div className={styles.cardHead}><b>Attributes</b></div>
            <div className={styles.grid3Col}>
              {ATTRS.flat().map(attr => {
                const current = Number(sheet.attributes?.[attr] ?? 1);
                const next = Math.min(current + 1, 5);
                const canRaise = current < 5;
                const cost = XP_RULES.attribute(next);
                const afford = xp >= cost;
                return (
                  <ShopRow
                    key={attr}
                    title={attr}
                    subtitle={`Raise to ${next}`}
                    cost={cost}
                    disabled={!canRaise || !afford}
                    hint={!canRaise ? 'Max 5' : (!afford ? 'Not enough XP' : '')}
                    onBuy={async () => {
                      const nextSheet = JSON.parse(JSON.stringify(sheet));
                      nextSheet.attributes = { ...(nextSheet.attributes || {}), [attr]: next };
                      await spendXP({
                        type: 'attribute',
                        target: attr,
                        currentLevel: current,
                        newLevel: next,
                        patchSheet: nextSheet,
                      });
                    }}
                  />
                );
              })}
            </div>
          </Card>

          {/* Skills */}
          <Card>
            <div className={styles.cardHead}><b>Skills</b></div>
            <div className={styles.grid3Col}>
              {Object.values(SKILLS).flat().map(skill => {
                const raw = sheet.skills?.[skill];
                const current = typeof raw === 'object' ? Number(raw.dots || 0) : Number(raw || 0);
                const next = Math.min(current + 1, 5);
                const canRaise = current < 5;
                const cost = XP_RULES.skill(next);
                const afford = xp >= cost;
                return (
                  <ShopRow
                    key={skill}
                    title={skill}
                    subtitle={`Raise to ${next}`}
                    cost={cost}
                    disabled={!canRaise || !afford}
                    hint={!canRaise ? 'Max 5' : (!afford ? 'Not enough XP' : '')}
                    onBuy={async () => {
                      const nextSheet = JSON.parse(JSON.stringify(sheet));
                      nextSheet.skills = nextSheet.skills || {};
                      const node = (nextSheet.skills[skill] && typeof nextSheet.skills[skill] === 'object')
                        ? { ...nextSheet.skills[skill] }
                        : { dots: Number(nextSheet.skills[skill] || 0), specialties: [] };
                      node.dots = next;
                      nextSheet.skills[skill] = node;
                      await spendXP({
                        type: 'skill',
                        target: skill,
                        currentLevel: current,
                        newLevel: next,
                        patchSheet: nextSheet,
                      });
                    }}
                  />
                );
              })}
            </div>
          </Card>

          {/* Specialties */}
          <Card>
            <div className={styles.cardHead}><b>Skill Specialties</b></div>
            <SpecialtyAdder
              xp={xp}
              onAdd={async (skillName, specName) => {
                const cost = XP_RULES.specialty();
                if (xp < cost) return;
                const nextSheet = JSON.parse(JSON.stringify(sheet));
                nextSheet.skills = nextSheet.skills || {};
                const node = (nextSheet.skills[skillName] && typeof nextSheet.skills[skillName] === 'object')
                  ? { ...nextSheet.skills[skillName] }
                  : { dots: Number(nextSheet.skills[skillName] || 0), specialties: [] };
                node.specialties = Array.from(new Set([...(node.specialties || []), specName].filter(Boolean)));
                nextSheet.skills[skillName] = node;
                await spendXP({
                  type: 'specialty',
                  target: skillName,
                  dots: 1,
                  patchSheet: nextSheet,
                });
              }}
            />
          </Card>

          {/* Disciplines */}
          <Card>
            <div className={styles.cardHead}><b>Disciplines</b></div>

            {/* In-clan */}
            <div className={styles.subhead}>In-Clan</div>
            <div className={styles.grid}>
              {inClanDisciplines.length === 0 && (
                <div className={styles.muted}>No in-clan disciplines for {ch.clan}.</div>
              )}
              {inClanDisciplines.map(name => {
                const current = Number(sheet.disciplines?.[name] || 0);
                const next = Math.min(current + 1, 5);
                const canRaise = next > 0 && next <= 5;
                const cost = XP_RULES.disciplineClan(next);
                const afford = xp >= cost;
                const isKnown = current > 0;
                const title = isKnown ? `${name} (${current})` : name;
                return (
                  <ShopRow
                    key={name}
                    title={title}
                    subtitle={isKnown ? `Raise to ${next} • clan` : `Buy • clan`}
                    cost={cost}
                    leftIcon={iconPath(name)}
                    disabled={!canRaise || !afford}
                    hint={!canRaise ? 'Max 5' : (!afford ? 'Not enough XP' : '')}
                    onBuy={async () => {
                      const nextSheet = JSON.parse(JSON.stringify(sheet));
                      nextSheet.disciplines = { ...(nextSheet.disciplines || {}), [name]: next };
                      await spendXP({
                        type: 'discipline',
                        disciplineKind: 'clan',
                        target: name,
                        currentLevel: current,
                        newLevel: next,
                        patchSheet: nextSheet,
                      });
                    }}
                  />
                );
              })}
            </div>

            {/* Out-of-clan */}
            <Drawer title="Out-of-Clan" subtitle="check with your ST before spending XP" defaultOpen={false}>
              <div className={styles.grid}>
                {outOfClanDisciplines.map(name => {
                  const current = Number(sheet.disciplines?.[name] || 0);
                  const next = Math.min(current + 1, 5);
                  const canRaise = next > 0 && next <= 5;
                  const kind = disciplineKindFor(ch, name); // 'other' or 'caitiff'
                  const cost = estimateDisciplineCost(ch, name, current, next);
                  const afford = xp >= cost;
                  const isKnown = current > 0;
                  const title = isKnown ? `${name} (${current})` : name;
                  return (
                    <ShopRow
                      key={name}
                      title={title}
                      subtitle={isKnown ? `Raise to ${next} • ${kind}` : `Buy • ${kind}`}
                      cost={cost}
                      leftIcon={iconPath(name)}
                      disabled={!canRaise || !afford}
                      hint={!canRaise ? 'Max 5' : (!afford ? 'Not enough XP' : '')}
                      onBuy={async () => {
                        const nextSheet = JSON.parse(JSON.stringify(sheet));
                        nextSheet.disciplines = { ...(nextSheet.disciplines || {}), [name]: next };
                        await spendXP({
                          type: 'discipline',
                          disciplineKind: kind === 'other' ? 'other' : 'caitiff',
                          target: name,
                          currentLevel: current,
                          newLevel: next,
                          patchSheet: nextSheet,
                        });
                      }}
                    />
                  );
                })}
              </div>
            </Drawer>
          </Card>

          {/* Merits (Advantages) */}
          <Card>
            <div className={styles.cardHead}><b>Merits</b></div>
            <MeritAdder
              xp={xp}
              existing={Array.isArray(sheet?.advantages?.merits) ? sheet.advantages.merits : []}
              onAdd={async (merit, dots) => {
                const cost = XP_RULES.advantageDot(dots);
                if (xp < cost) return;

                const nextSheet = JSON.parse(JSON.stringify(sheet));
                nextSheet.advantages = nextSheet.advantages || { merits: [], flaws: [] };
                nextSheet.advantages.merits = Array.isArray(nextSheet.advantages.merits) ? nextSheet.advantages.merits : [];

                // prevent exact duplicate (same id and dots)
                const key = `${merit.id}:${dots}`;
                const present = new Set(nextSheet.advantages.merits.map(m => `${m.id}:${m.dots}`));
                if (!present.has(key)) {
                  nextSheet.advantages.merits.push({
                    id: merit.id,
                    name: merit.name,
                    dots,
                    from: 'xp_shop',
                  });
                }

                await spendXP({
                  type: 'advantage',
                  target: merit.id,
                  dots,
                  patchSheet: nextSheet,
                });
              }}
            />
            {Array.isArray(sheet?.advantages?.merits) && sheet.advantages.merits.length > 0 && (
              <div className={styles.grid} style={{ marginTop: 10 }}>
                <div className={styles.subhead}>Owned Merits</div>
                <ul className={styles.powerList}>
                  {sheet.advantages.merits.map((m, i) => (
                    <li key={`${m.id || m.name}-${i}`} className={styles.powerPill}>
                      <span className={styles.levelBadge}>{glyph(m.dots || 0)}</span>
                      <span className={styles.powerName}>{m.name || m.id}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Rituals & Ceremonies */}
          <Card>
            <Drawer title="Blood Sorcery Rituals & Oblivion Ceremonies" defaultOpen={false}>
              <div className={styles.grid} style={{ gap: 12 }}>
                {/* Blood Sorcery */}
                <Drawer title="Blood Sorcery Rituals" defaultOpen={false}>
                  <div className={styles.grid} style={{ gap: 12 }}>
                    {Object.entries(RITUALS.blood_sorcery.levels).map(([lvlStr, list]) => {
                      const level = Number(lvlStr);
                      return list.map(rit => {
                        const owned = knownRitualIds.has(rit.id);
                        const allowed = canLearnRitual(level);
                        const cost = XP_RULES.ritual(level);
                        const afford = xp >= cost;
                        const { unmet } = ritualPrereqStatus(rit, knownRitualIds, knownRitualNames);
                        return (
                          <RitualRow
                            key={rit.id}
                            item={rit}
                            level={level}
                            cost={cost}
                            owned={owned}
                            allowed={allowed}
                            afford={afford}
                            prereqUnmet={unmet}
                            onBuy={() => buyRitual(rit, level, cost)}
                          />
                        );
                      });
                    })}
                  </div>
                </Drawer>

                {/* Oblivion */}
                <Drawer title="Oblivion Ceremonies" defaultOpen={false}>
                  <div className={styles.grid} style={{ gap: 12 }}>
                    {Object.entries((RITUALS.oblivion?.levels || {})).map(([lvlStr, list]) => {
                      const level = Number(lvlStr);
                      return list.map(cer => {
                        const owned = knownRitualIds.has(cer.id);
                        const allowed = canLearnCeremony(level);
                        const cost = XP_RULES.ceremony(level);
                        const afford = xp >= cost;
                        const { unmet } = ritualPrereqStatus(cer, knownRitualIds, knownRitualNames);
                        return (
                          <RitualRow
                            key={cer.id}
                            item={cer}
                            level={level}
                            cost={cost}
                            owned={owned}
                            allowed={allowed}
                            afford={afford}
                            prereqUnmet={unmet}
                            onBuy={() => buyCeremony(cer, level, cost)}
                          />
                        );
                      });
                    })}
                  </div>
                </Drawer>
              </div>
            </Drawer>
          </Card>

        </section>
      </div>

      {/* ----- Discipline Power Modal ----- */}
      {modalOpen && modalCfg && (
        <DisciplinePowerModal
          cfg={modalCfg}
          onClose={() => { setModalOpen(false); setModalCfg(null); }}
          onConfirm={(sel) => confirmDisciplinePurchase({ ...modalCfg, ...sel })}
        />
      )}
    </div>
  );
}

/* ===========================
   Small presentational pieces
   =========================== */
function Card({ children }) {
  return <div className={styles.card}>{children}</div>;
}

function Pill({ label, value }) {
  return (
    <span className={styles.pill}>
      <span className={styles.dim}>{label}:</span> <b>{value}</b>
    </span>
  );
}

function DotRow({ label, value = 0, max = 5, rightExtra = null }) {
  return (
    <div className={styles.dotRow}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{label}</span>
        {rightExtra}
      </div>
      <div className={styles.dots}>
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={`${styles.dot} ${i < value ? styles.dotOn : ''}`} />
        ))}
      </div>
    </div>
  );
}

function renderSpecs(specs = []) {
  if (!specs.length) return null;
  return <span className={styles.specsText}>({specs.join(', ')})</span>;
}

function DisciplineRow({ name, level = 0, powers = [] }) {
  const icon = iconPath(name);
  const byLevel = new Map((powers || []).map(p => [Number(p.level), { id: p.id, name: p.name }]));
  const maxPicked = Math.max(0, ...Array.from(byLevel.keys()));
  const displayMax = Math.min(5, Math.max(level || 0, maxPicked || 0) || 0) || level || 0 || 0;

  return (
    <div className={styles.disciplineRow}>
      <div className={styles.disciplineHead}>
        <img
          src={icon}
          alt=""
          width={28}
          height={28}
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/img/disciplines/Oblivion-rombo.png'; }}
          className={styles.disciplineIcon}
        />
        <div className={styles.disciplineTitleBlock}>
          <b>{name}</b>
          <div className={styles.dots}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`${styles.dot} ${i < level ? styles.dotOn : ''}`} />
            ))}
          </div>
        </div>
      </div>

      <ul className={styles.powerList}>
        {Array.from({ length: Math.max(displayMax, level || 0) || 0 }).map((_, i) => {
          const L = i + 1;
          const picked = byLevel.get(L);
          const unlocked = L <= level;

          let cls = styles.powerPill;
          let label = picked ? picked.name : (unlocked ? 'Pick a power' : 'Locked');
          if (!unlocked) cls += ` ${styles.powerPillLocked}`;
          else if (!picked) cls += ` ${styles.powerPillMissing}`;

          return (
            <li key={L} className={cls} title={picked ? `Level ${L}` : undefined}>
              <span className={styles.levelBadge}>L{L}</span>
              <span className={styles.powerName}>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ConfirmModal({ title = 'Confirm Purchase', children, onConfirm, onCancel, busy = false }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
      <div className={styles.card} style={{ maxWidth: 520, width: 'min(92vw,520px)' }}>
        <div className={styles.cardHead}><b>{title}</b></div>
        <div className={styles.grid} style={{ gap: 12 }}>{children}</div>
        <div className={styles.rowForm} style={{ justifyContent: 'flex-end' }}>
          <button className={styles.ghostBtn} onClick={onCancel} disabled={busy}>No</button>
          <button className={styles.cta} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : 'Yes'}</button>
        </div>
      </div>
    </div>
  );
}

function ShopRow({ title, subtitle, cost, disabled, hint = '', onBuy, leftIcon }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);

  async function handleConfirm() {
    setWorking(true);
    try {
      await onBuy?.();
      setConfirmOpen(false);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className={styles.rowForm} style={{ justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
        {leftIcon && <img src={leftIcon} alt="" width={26} height={26} style={{ borderRadius: 6, opacity: .9 }} />}
        <div style={{ display: 'grid', minWidth: 0 }}>
          <div style={{ fontWeight: 600, opacity: (disabled && !confirmOpen) ? 0.6 : 1 }}>{title}</div>
          <div className={styles.muted} style={{ fontSize: 13 }}>
            {subtitle}{hint ? ` • ${hint}` : ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className={styles.costText}>Cost: <b>{cost}</b></span>
        <button
          className={styles.cta}
          disabled={disabled || working}
          onClick={() => setConfirmOpen(true)}
          aria-haspopup="dialog"
        >
          Buy
        </button>
      </div>

      {confirmOpen && (
        <ConfirmModal
          title="Confirm Purchase"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
          busy={working}
        >
          <p>
            Are you sure you want to buy <b>{title}</b>
            {subtitle ? <> — {subtitle}</> : null} for <b>{cost}</b> XP?
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}

/* ---------- Ritual/Ceremony row with prereq/recall info ---------- */
function RitualRow({ item, level, cost, owned, allowed, afford, prereqUnmet = [], onBuy }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const disabled = owned || !allowed || !afford || prereqUnmet.length > 0;

  async function handleConfirm() {
    setWorking(true);
    try {
      await onBuy?.();
      setConfirmOpen(false);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className={styles.paneCard} style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontWeight: 700 }}>{item.name}</div>
          <div className={styles.muted} style={{ fontSize: 13 }}>
            Level {level}{item.source ? ` • Source: ${item.source}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {owned && <span className={`${styles.powerBadgeMuted} badge-owned`}>Known</span>}
          {!allowed && <span className={`${styles.powerBadgeMuted} badge-warn`}>Requires Discipline {level}</span>}
          {prereqUnmet.length > 0 && (
            <span className={`${styles.powerBadgeMuted} badge-warn`}>Conditions not met: {prereqUnmet.join(', ')}</span>
          )}
          {!afford && <span className={`${styles.powerBadgeMuted} badge-warn`}>Not enough XP</span>}
        </div>
      </div>

      <div className={styles.detailTags} style={{ marginTop: 8 }}>
        <span className={styles.powerTag}><b>Level:</b> {level}</span>
        <span className={styles.powerTag}><b>Cost:</b> {item.cost || '—'}</span>
        {item.dice_pool && <span className={styles.powerTag}><b>Dice Pool:</b> {item.dice_pool}</span>}
        {item.difficulty && <span className={styles.powerTag}><b>Difficulty:</b> {item.difficulty}</span>}
        {item.prereq && <span className={styles.powerTag}><b>Prereq:</b> {item.prereq}</span>}
      </div>

      {item.effect && (
        <div className={styles.powerNotes} style={{ marginTop: 8 }}>
          <b>Effect:</b> {item.effect}
        </div>
      )}
      {item.notes && (
        <div className={styles.powerNotes} style={{ marginTop: 8 }}>
          {item.notes}
        </div>
      )}

      <div className={styles.modalFooter} style={{ borderTop: 'none', padding: 0, marginTop: 10 }}>
        <div className={styles.muted} style={{ marginRight: 'auto' }}>
          XP Cost: <b>{cost}</b>
        </div>
        <button
          className={styles.cta}
          disabled={disabled || working}
          onClick={() => setConfirmOpen(true)}
        >
          Buy
        </button>
      </div>

      {confirmOpen && (
        <ConfirmModal
          title="Confirm Purchase"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
          busy={working}
        >
          <p>Buy <b>{item.name}</b> (Level {level}) for <b>{cost}</b> XP?</p>
          {prereqUnmet.length > 0 && (
            <p className={styles.muted} style={{ marginTop: 6 }}>
              Conditions not met: {prereqUnmet.join(', ')}
            </p>
          )}
        </ConfirmModal>
      )}
    </div>
  );
}

/* ---------- Ritual/Ceremony prereq helper ---------- */
const _norm = (v) => String(v ?? '').trim().toLowerCase();

function ritualPrereqStatus(rit, knownRitualIds, knownRitualNames) {
  const unmet = [];
  const prereq = rit?.prereq;
  if (!prereq) return { unmet };

  const parts = String(prereq)
    .split(/(?:,|&|\+|and)/i)
    .map(s => s.trim())
    .filter(Boolean);

  if (!parts.length) return { unmet };

  const knownIdSet = new Set(Array.from(knownRitualIds || []));
  const knownNameSet = new Set((knownRitualNames || []).map(_norm));

  for (const p of parts) {
    const hasById = knownIdSet.has(p);
    const hasByName = knownNameSet.has(_norm(p));
    if (!hasById && !hasByName) unmet.push(p);
  }
  return { unmet };
}

/* ===== Discipline power picker modal ===== */
function DisciplinePowerModal({ cfg, onClose, onConfirm }) {
  const { name, next, assignOnly, ownedPowerIds = [], ownedPowerNames = [], ownedPowers = [], disciplineDots = {} } = cfg;

  // Build pool up to 'next' & sort
  const fullPool = useMemo(() => {
    const out = [];
    const levels = DISCIPLINES?.[name]?.levels || {};
    const cap = Number(next || 0);
    for (let lvl = 1; lvl <= cap; lvl++) {
      for (const p of (levels[lvl] || [])) out.push({ ...p, __level: lvl });
    }
    out.sort((a, b) => (a.__level - b.__level) || String(a.name).localeCompare(String(b.name)));
    return out;
  }, [name, next]);

  const norm = (v) => String(v ?? '').trim().toLowerCase();
  const normDisc = (s) => norm(s).replace(/\s+/g, ' ');

  const ownedCanon = useMemo(() => {
    const ids = ownedPowerIds.map(norm);
    const names = ownedPowerNames.map(norm);
    const objs = ownedPowers.flatMap(p => [norm(p?.id), norm(p?.name), norm(p?.slug), norm(p?.key), norm(p?.code), norm(p?.power_id)]);
    return new Set([...ids, ...names, ...objs].filter(Boolean));
  }, [ownedPowerIds, ownedPowerNames, ownedPowers]);

  const dotsByDisc = useMemo(() => {
    const m = new Map();
    Object.entries(disciplineDots || {}).forEach(([k, v]) => m.set(normDisc(k), Number(v) || 0));
    return m;
  }, [disciplineDots]);

  const countDots = (s = '') => {
    const bullets = (s.match(/[•●○]/g) || []).length;
    const digits = parseInt((s.match(/\b(\d+)\b/) || [,'0'])[1], 10) || 0;
    return Math.max(bullets, digits || 1);
  };
  const parseAmalgam = (s = '') =>
    s.split(/(?:,|&|\+|and)/i)
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const nameMatch = part.match(/^[^\d•●○]+/);
        const discName = (nameMatch ? nameMatch[0] : part).trim().replace(/[:.-]+$/, '');
        return { disc: discName, dots: countDots(part) };
      });

  const annotated = useMemo(() => {
    return fullPool.map(p => {
      const candidates = [
        norm(p?.id), norm(p?.name), norm(p?.slug), norm(p?.key), norm(p?.code), norm(p?.power_id)
      ].filter(Boolean);
      const owned = candidates.some(c => ownedCanon.has(c));

      const unmet = [];
      if (p.amalgam) {
        const reqs = parseAmalgam(String(p.amalgam));
        for (const req of reqs) {
          const have = dotsByDisc.get(normDisc(req.disc)) || 0;
          if (have < (req.dots || 1)) {
            unmet.push(`${req.disc} ${'•'.repeat(req.dots || 1)}`);
          }
        }
      }

      return {
        ...p,
        __flags: { owned, unmet },
        __available: !owned && unmet.length === 0,
      };
    });
  }, [fullPool, ownedCanon, dotsByDisc]);

  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return annotated;
    return annotated.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q) ||
      p.source?.toLowerCase().includes(q) ||
      String(p.__level).includes(q)
    );
  }, [annotated, query]);

  const firstAvailable = useMemo(() => filtered.find(p => p.__available)?.id || '', [filtered]);
  const [selectedId, setSelectedId] = useState(firstAvailable);
  useEffect(() => {
    if (!filtered.length) return setSelectedId('');
    if (!filtered.some(p => p.id === selectedId)) {
      setSelectedId(filtered.find(p => p.__available)?.id || filtered[0].id);
    }
  }, [filtered, selectedId]);

  const sel = useMemo(
    () => filtered.find(p => p.id === selectedId) || annotated.find(p => p.id === selectedId),
    [filtered, annotated, selectedId]
  );

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const confirm = async () => {
    if (!sel || !sel.__available) return;
    setSaving(true);
    setSaveErr('');
    try {
      const maybe = onConfirm?.({
        selectedPowerId: sel.id,
        selectedPowerName: sel.name,
        selectedPowerLevel: sel.__level
      });
      if (maybe && typeof maybe.then === 'function') await maybe;
      onClose?.();
    } catch (e) {
      setSaveErr(e?.response?.data?.error || e?.message || 'Failed to assign power.');
    } finally {
      setSaving(false);
    }
  };

  const rows = [];
  let lastLevel = null;
  for (const p of filtered) {
    if (p.__level !== lastLevel) {
      rows.push({ __type: 'hdr', level: p.__level, key: `hdr-${p.__level}` });
      lastLevel = p.__level;
    }
    rows.push({ __type: 'item', power: p, key: p.id });
  }

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="powerModalTitle"
      onClick={(e) => { if (!saving && e.target === e.currentTarget) onClose?.(); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !saving) onClose?.();
        if (e.key === 'Enter' && !saving && sel?.__available) confirm();
      }}
    >
      <div className={`${styles.card} ${styles.modalCard}`} style={{ width:'min(92vw, 800px)' }}>
        <div className={styles.modalHeader}>
          <div>
            <h3 id="powerModalTitle" className={styles.modalTitle}>
              {assignOnly ? 'Select Missing Power' : 'Choose New Power'}
            </h3>
            <div className={styles.muted}>
              Discipline: <b>{name}</b> • Level <b>{next}</b>
            </div>
          </div>
        </div>

        <div className={styles.muted} role="note" style={{ padding: '8px 16px 0' }}>
          Each dot in a discipline grants <b>one power</b> of its level or below. Choose any <b>level ≤ {next}</b> you don’t already have.
        </div>

        {!annotated.length ? (
          <div className={styles.alertWarning} style={{ margin: '10px 16px 0' }}>
            No power data found up to level <b>{next}</b> for <b>{name}</b>. You can still buy the dot; pick later.
          </div>
        ) : (
          <div className={styles.modalGrid}>
            {/* LEFT PANE */}
            <div className={styles.paneCard}>
              <aside className={styles.powerListPane}>
                <input
                  className={styles.input}
                  placeholder="Search powers… (name, notes, source, level)"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  disabled={saving}
                />
                <div className={styles.powerList} role="listbox" aria-label="Available powers">
                  {rows.map(row => {
                    if (row.__type === 'hdr') {
                      return <div key={row.key} className={styles.levelHeader}>Level {row.level}</div>;
                    }
                    const p = row.power;
                    const active = p.id === selectedId;
                    const disabled = !p.__available;
                    const reason = p.__flags.owned
                      ? 'Owned'
                      : (p.__flags.unmet.length ? `Conditions not met: ${p.__flags.unmet.join(', ')}` : '');

                    return (
                      <button
                        key={row.key}
                        className={
                          `${styles.powerItem} ` +
                          `${active ? styles.powerItemActive : ''} ` +
                          `${disabled ? styles.powerItemDisabled : ''}`
                        }
                        onClick={() => setSelectedId(p.id)}
                        onDoubleClick={() => !saving && p.__available && confirm()}
                        role="option"
                        aria-selected={active}
                        title={p.name}
                        aria-disabled={disabled || undefined}
                        disabled={saving}
                      >
                        <div className={styles.powerItemTitle}>
                          {p.name}
                          {!p.__available && (
                            <span className={`${styles.powerBadgeMuted} ${p.__flags.owned ? 'badge-owned' : 'badge-warn'}`}>
                              {reason}
                            </span>
                          )}
                        </div>
                        <div className={styles.powerItemMeta}>
                          <span className={styles.powerTag}><b>Level:</b> {p.__level}</span>
                          {p.cost && <span className={styles.powerTag}><b>Cost:</b> {p.cost}</span>}
                          {p.duration && <span className={styles.powerTag}><b>Duration:</b> {p.duration}</span>}
                          {p.dice_pool && <span className={styles.powerTag}><b>Dice:</b> {p.dice_pool}</span>}
                        </div>
                      </button>
                    );
                  })}
                  {!rows.length && <div className={styles.emptyNote}>No powers match “{query}”.</div>}
                </div>
              </aside>
            </div>

            {/* RIGHT PANE */}
            <div className={styles.paneCard}>
              <section className={styles.powerDetailPane}>
                {/* details could go here if needed */}
              </section>
            </div>
          </div>
        )}

        <div className={styles.modalFooter}>
          {saveErr && <div className={styles.alert} style={{ marginRight: 'auto' }}>{saveErr}</div>}
          <button
            className={styles.cta}
            onClick={confirm}
            disabled={saving || !sel || !sel.__available}
          >
            {saving ? 'Saving…' : 'Select Power'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Misc helpers ---------- */
function labelize(k) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ---------- Specialty adder ---------- */
function SpecialtyAdder({ xp, onAdd }) {
  const [skill, setSkill] = useState('Academics');
  const [spec, setSpec] = useState('');
  const cost = 3;
  const afford = xp >= cost;

  return (
    <div className={styles.rowForm}>
      <select
        className={styles.input}
        value={skill}
        onChange={e => setSkill(e.target.value)}
      >
        {Object.values(SKILLS).flat().map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      <input
        className={styles.input}
        placeholder="e.g., Technology (Firmware)"
        value={spec}
        onChange={e => setSpec(e.target.value)}
      />

      <span className={styles.costText}>Cost: <b>{cost}</b></span>

      <button
        className={styles.cta}
        disabled={!afford || !spec.trim()}
        onClick={() => onAdd(skill, spec.trim())}
      >
        Add Specialty
      </button>
    </div>
  );
}

/* ---------- Merit adder (XP Shop) ---------- */
function MeritAdder({ xp, existing = [], onAdd }) {
  const all = useMemo(() => allSelectableMerits(), []);
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState(all[0]?.id || '');
  const sel = useMemo(() => all.find(m => m.id === selId) || null, [all, selId]);

  const ownedKeys = useMemo(() => new Set((existing || []).map(m => `${m.id}:${m.dots}`)), [existing]);
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return all;
    return all.filter(m =>
      m.name.toLowerCase().includes(qq) ||
      (m.category || '').toLowerCase().includes(qq)
    );
  }, [q, all]);

  const dotsOptions = sel?.allowed || [];
  const [dots, setDots] = useState(dotsOptions[0] || 1);
  useEffect(() => {
    setDots(sel?.allowed?.[0] || 1);
  }, [selId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cost = dots * 3;
  const afford = xp >= cost;

  const wouldDuplicate = sel ? ownedKeys.has(`${sel.id}:${dots}`) : false;

  return (
    <div className={styles.grid} style={{ gap: 12 }}>
      <div className={styles.rowForm}>
        <input
          className={styles.input}
          placeholder="Search merits… (name or category)"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1 }}
        />
        <span className={styles.muted}>Cost: <b>{cost}</b> XP</span>
      </div>

      <div className={styles.rowForm}>
        <select
          className={styles.input}
          value={selId}
          onChange={e => setSelId(e.target.value)}
          style={{ flex: 2, minWidth: 220 }}
        >
          {filtered.map(m => (
            <option key={m.id} value={m.id}>
              {m.name} {m.category ? `— ${m.category}` : ''} ({m.dotsSpec})
            </option>
          ))}
        </select>

        <select
          className={styles.input}
          value={dots}
          onChange={e => setDots(Number(e.target.value))}
          style={{ width: 120 }}
        >
          {dotsOptions.map(n => <option key={n} value={n}>{glyph(n)} ({n})</option>)}
        </select>

        <button
          className={styles.cta}
          disabled={!sel || !afford || wouldDuplicate}
          onClick={() => onAdd(sel, dots)}
          title={wouldDuplicate ? 'You already own this merit at that rating' : ''}
        >
          Add Merit
        </button>
      </div>

      {sel && (
        <div className={styles.muted} style={{ lineHeight: 1.4 }}>
          <b>{sel.name}</b>{sel.category ? ` — ${sel.category}` : ''}<br/>
          {sel.description || 'No description available.'}
        </div>
      )}
    </div>
  );
}
