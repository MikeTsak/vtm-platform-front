import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import api from '../api';
import { DISCIPLINES, ALL_DISCIPLINE_NAMES, iconPath } from '../data/disciplines';
import { RITUALS } from '../data/rituals';
import styles from '../styles/CharacterView.module.css';

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

/* ===========================
   Normalization helpers
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

  sheet.blood_potency = Number(flat.bloodPotency ?? 1);

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
export default function CharacterView() {
  const [ch, setCh] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCfg, setModalCfg] = useState(null);
  const [pendingFixes, setPendingFixes] = useState([]);
  const shopRef = useRef(null);
  const [xpTotals, setXpTotals] = useState(null);

  useEffect(() => {
    api.get('/characters/me').then(r => {
      const normalized = attachStructured(r.data.character);
      setCh(normalized);
    });
  }, []);

  useEffect(() => {
  if (ch) {
    api.get('/characters/xp/total').then(r => setXpTotals(r.data));
  }
}, [ch]);

  const tint = useMemo(() => (ch ? CLAN_COLORS[ch.clan] || '#8a0f1a' : '#8a0f1a'), [ch]);
  const sheet = ch?.sheet || {};
  const xp = ch?.xp ?? 0;

  const disciplinesMap = useMemo(
    () => (sheet?.disciplines && typeof sheet.disciplines === 'object' ? sheet.disciplines : {}),
    [sheet]
  );

  async function spendXP(payload) {
    setErr(''); setMsg('');
    try {
      const { data } = await api.post('/characters/xp/spend', payload);
      setCh(attachStructured(data.character));
      setMsg(`Spent ${data.spent} XP.`);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to spend XP');
      throw e;
    }
  }

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
        await api.post('/characters/xp/spend', {
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
          disciplineKind: kind,
          target: name,
          currentLevel: current,
          newLevel: next,
          patchSheet: nextSheet
        });
      }

      const r = await api.get('/characters/me');
      setCh(attachStructured(r.data.character));
      setModalOpen(false);
      setModalCfg(null);

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
        } else setMsg('All discipline powers are now specified.');
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

  if (!ch) return <div className={styles.loading}>Loading character…</div>;

  // ===== Discipline grouping for the XP Shop (in-clan first, out-of-clan in drawer)
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

        {xpTotals && (
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
                  ch={ch}
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

          {/* Attributes shop */}
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

          {/* Skills shop */}
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

          {/* Disciplines shop — split into in-clan and out-of-clan (drawer) */}
          <Card>
            <div className={styles.cardHead}><b>Disciplines</b></div>

            {/* In-clan (always visible) */}
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

            {/* Out-of-clan (drawer, closed by default) */}
            <Drawer
              title="Out-of-Clan"
              subtitle="check with your ST before spending XP"
              defaultOpen={false}
            >
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
          {/* Rituals & Ceremonies — drawer, closed by default */}
          <Card>
            <Drawer title="Blood Sorcery Rituals & Oblivion Ceremonies" defaultOpen={false}>
              {/* Nested drawers */}
              <div className={styles.grid} style={{ gap: 12 }}>
                {/* Blood Sorcery drawer */}
                <Drawer title="Blood Sorcery Rituals" defaultOpen={false}>
                  <div className={styles.grid}>
                    {Object.entries(RITUALS.blood_sorcery.levels).map(([lvlStr, list]) => {
                      const level = Number(lvlStr);
                      return list.map(rit => {
                        const owned = knownRitualIds.has(rit.id);
                        const allowed = canLearnRitual(level);
                        const cost = XP_RULES.ritual(level);
                        const afford = xp >= cost;
                        return (
                          <ShopRow
                            key={rit.id}
                            title={rit.name}
                            subtitle={`Level ${level}`}
                            cost={cost}
                            disabled={owned || !allowed || !afford}
                            hint={owned ? 'Known' : (!allowed ? 'Requires Blood Sorcery ' + level : (!afford ? 'Not enough XP' : ''))}
                            onBuy={() => buyRitual(rit, level, cost)}
                          />
                        );
                      });
                    })}
                  </div>
                </Drawer>

                {/* Oblivion drawer */}
                <Drawer title="Oblivion Ceremonies" defaultOpen={false}>
                  <div className={styles.grid}>
                    {Object.entries((RITUALS.oblivion?.levels || {})).map(([lvlStr, list]) => {
                      const level = Number(lvlStr);
                      return list.map(cer => {
                        const owned = knownRitualIds.has(cer.id);
                        const allowed = canLearnCeremony(level);
                        const cost = XP_RULES.ceremony(level);
                        const afford = xp >= cost;
                        return (
                          <ShopRow
                            key={cer.id}
                            title={cer.name}
                            subtitle={`Level ${level}`}
                            cost={cost}
                            disabled={owned || !allowed || !afford}
                            hint={owned ? 'Known' : (!allowed ? 'Requires Oblivion ' + level : (!afford ? 'Not enough XP' : ''))}
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
          ch={ch}
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

  // Map picked powers by their level for O(1) lookups
  const byLevel = new Map(
    (powers || []).map(p => [Number(p.level), { id: p.id, name: p.name }])
  );

  // Show up to the highest relevant level (current dots or chosen power max), capped at 5
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

      {/* Power list by level */}
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


function ShopRow({ title, subtitle, cost, disabled, hint = '', onBuy, leftIcon }) {
  return (
    <div className={styles.rowForm} style={{ justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
        {leftIcon && <img src={leftIcon} alt="" width={26} height={26} style={{ borderRadius: 6, opacity: .9 }} />}
        <div style={{ display: 'grid', minWidth: 0 }}>
          <div style={{ fontWeight: 600, opacity: disabled ? 0.6 : 1 }}>{title}</div>
          <div className={styles.muted} style={{ fontSize: 13 }}>
            {subtitle}{hint ? ` • ${hint}` : ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className={styles.costText}>Cost: <b>{cost}</b></span>
        <button className={styles.cta} disabled={disabled} onClick={onBuy}>Buy</button>
      </div>
    </div>
  );
}

function SpecialtyAdder({ xp, onAdd }) {
  const [skill, setSkill] = useState('Academics');
  const [spec, setSpec] = useState('');
  const cost = 3;
  const afford = xp >= cost;

  return (
    <div className={styles.rowForm}>
      <select className={styles.input} value={skill} onChange={e => setSkill(e.target.value)}>
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
      <button className={styles.cta} disabled={!afford || !spec.trim()} onClick={() => onAdd(skill, spec.trim())}>
        Add Specialty
      </button>
    </div>
  );
}

/* ===== Minimal “pick a power for level N” modal ===== */
function DisciplinePowerModal({ cfg, onClose, onConfirm }) {
  const { name, next, assignOnly } = cfg;
  const available = (DISCIPLINES?.[name]?.levels?.[next] || []);
  const [selected, setSelected] = useState(available[0]?.id || '');
  const selectedName = available.find(p => p.id === selected)?.name || '';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      display: 'grid', placeItems: 'center', zIndex: 40
    }}>
      <div className={styles.card} style={{ maxWidth: 560, width: 'min(92vw, 560px)', animation: 'modalEnter .15s ease' }}>
        <div className={styles.cardHead}>
          <b>{assignOnly ? 'Select Missing Power' : 'Choose New Power'}</b>
          <div className={styles.muted}>Discipline: <b>{name}</b> • Level <b>{next}</b></div>
        </div>

        {!available.length && (
          <div className={styles.alertWarning}>
            No power data found for {name} level {next}. You can still buy the dot; pick later.
          </div>
        )}

        {!!available.length && (
          <div className={styles.grid}>
            <select className={styles.input} value={selected} onChange={e => setSelected(e.target.value)}>
              {available.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <div className={styles.powerDetailGrid}>
              {['cost','duration','dice_pool','opposing_pool','notes','source','amalgam','prerequisite'].map(k => {
                const v = available.find(p => p.id === selected)?.[k];
                if (!v) return null;
                return <span key={k} className={styles.powerTag}><b>{labelize(k)}:</b> {v}</span>;
              })}
            </div>
          </div>
        )}

        <div className={styles.rowForm} style={{ justifyContent: 'flex-end' }}>
          <button className={styles.ghostBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.cta}
            onClick={() => onConfirm({ selectedPowerId: selected, selectedPowerName: selectedName })}
            disabled={!selected && !!available.length}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function labelize(k) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
