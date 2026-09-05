// src/features/coterie/CoterieManager.jsx
//
// Container for the coterie screens: loads data, owns the tab/selection
// state, and hands the rest to CoterieSheet / CoterieBuilder / the catalogs.
//
// Presentation moved out to those components and to Coteries.module.css. The
// previous single-file version mixed data loading, rules arithmetic, four
// screens' worth of markup and ~120 inline style objects, which is why the
// page did not survive a phone viewport.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../core/api';
import { publish } from '../../utils/notification';
import styles from '../../styles/Coteries.module.css';
import { Card, Empty, Muted, Spinner, Stat, Tabs } from './ui';
import CoterieBuilder from './CoterieBuilder';
import CoterieSheet from './CoterieSheet';
import { RulesOverview, TypesBrowser } from './CoterieCatalog';
import { getCoterie } from '../../data/cotteries';
import {
  DOMAIN_TRAIT_INFO,
  huntingDifficulty,
  lienBonusDice,
  portillonPenaltyDice,
  seedFromType,
} from '../../data/coterieRules';

/* ---- Domains, read the same way Domains.jsx reads them ---- */
import domainsRaw from '../../data/Domains.json';

const DIVISION_NAMES = {
  1: 'Pagkrati', 2: 'Zografou/Kaisarianh', 3: 'Exarxia', 4: 'Boula', 5: 'Ampelokhpoi',
  6: 'Kalithea', 7: 'Petralona', 8: 'Plaka', 9: 'Keramikos', 10: 'Tauros, Agios Ioannis Rentis',
  11: 'Thiseio', 12: 'Mosxato', 13: 'Palaio Faliro', 14: 'Nea Smyrnh', 15: 'Agios Dhmhtrios',
  16: 'Neos Kosmos', 17: 'Nea Penteli, Melissia', 18: 'Kolonaki, Lykabhtos', 19: 'Peristeri',
  20: 'Aigaleo', 21: 'Petroupolh, Ilion, Agioi Anargyroi, Kamatero', 22: 'Ellhniko, Argyroupolh',
  23: 'Psyxiko, Neo Psyxiko', 24: 'Attikh', 25: 'Kypselh', 26: 'Galatsi', 27: 'Khfisia, Nea Erythraia',
  28: 'Alimos', 29: 'Marousi, Peykh', 30: 'Hrakleio, Metamorfosi, Lykobrysh', 31: 'Xalandri, Brilissia',
  32: 'Perama, Keratsini', 33: 'Pathsia', 34: 'Kolonos, Sepolia', 35: 'Xolargos, Agia Paraskeyh',
  36: 'Katexakh', 37: 'Nea Philadepfia', 38: 'Hlioupolh, Byronas', 39: 'Athina', 40: 'Psyrh',
  41: 'Ymuttos', 42: 'Parnitha', 43: 'Peiraias, Neo Faliro', 44: 'Xaidari',
  45: 'Korydallos, Nikaia, Agia Barbara', 46: 'Glyfada', 47: 'Gkyzh', 48: 'Eleysina', 49: 'Aspropirgos',
};

function computeDomainOptions() {
  if (!domainsRaw || !Array.isArray(domainsRaw.features)) return [];
  const seen = new Map();
  domainsRaw.features.forEach((f, i) => {
    const n = f?.properties?.division != null ? Number(f.properties.division) : i + 1;
    if (!seen.has(n)) seen.set(n, { value: n, label: DIVISION_NAMES[n] || `Division ${n}` });
  });
  return [...seen.values()].sort((a, b) => a.value - b.value);
}

const errText = (e, fallback) =>
  (e && e.response && e.response.data && e.response.data.error) || fallback;

/* ------------------------------------------------------------------ *
 * Registry card (the "All Coteries" tab)
 * ------------------------------------------------------------------ */

function RegistryCard({ c, domainLabel }) {
  const difficulty = huntingDifficulty(c.chasse);
  const lien = lienBonusDice(c.lien);
  const portillon = portillonPenaltyDice(c.portillon);

  return (
    <Card title={c.name} subtitle={c.type || 'Custom coterie'}>
      {c.concept && <p className={styles.concept}>{c.concept}</p>}
      <div className={styles.registryMeta}>
        <span><b>Domain:</b> {c.domain_id ? `#${c.domain_id} — ${domainLabel || 'Unknown'}` : 'None'}</span>
        <span><b>Members:</b> {c.member_count}</span>
      </div>
      {c.domain_id != null && (
        <div className={styles.miniStats}>
          <span title="Hunting Difficulty inside their domain">
            {DOMAIN_TRAIT_INFO.chasse.name} {c.chasse} → Diff {difficulty == null ? '—' : difficulty}
          </span>
          <span title="Bonus dice interacting and investigating locally">
            {DOMAIN_TRAIT_INFO.lien.name} {c.lien} → +{lien}
          </span>
          <span title="Dice subtracted from an intruder">
            {DOMAIN_TRAIT_INFO.portillon.name} {c.portillon} → −{portillon}
          </span>
        </div>
      )}
      {Array.isArray(c.members) && c.members.length > 0 && (
        <div className={styles.rosterInline}>
          {c.members.map((m, i) => (
            <span key={i} className={styles.chip}>
              {m.name}{m.clan ? ` · ${m.clan}` : ''}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Manager
 * ------------------------------------------------------------------ */

export default function CoterieManager() {
  const [tab, setTab] = useState('mine');
  const [currentUser, setCurrentUser] = useState(null);
  const [personalXp, setPersonalXp] = useState(0);

  const [mine, setMine] = useState([]);
  const [registry, setRegistry] = useState([]);
  const [roster, setRoster] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null); // { coterie, members, xp_log }

  const [editing, setEditing] = useState(null); // builder seed, or null
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.permission_level === 'admin';
  const domainOptions = useMemo(computeDomainOptions, []);
  const domainLabelFor = useCallback(
    (id) => (domainOptions.find((o) => o.value === Number(id)) || {}).label || null,
    [domainOptions]
  );

  /* ---- initial load ---- */
  useEffect(() => {
    let alive = true;
    (async () => {
      const [me, coteries, users] = await Promise.allSettled([
        api.get('/auth/me'),
        api.get('/coteries'),
        api.get('/chat/users?include_self=1'),
      ]);
      if (!alive) return;
      if (me.status === 'fulfilled') setCurrentUser(me.value.data.user);
      if (coteries.status === 'fulfilled') setMine(coteries.value.data.coteries || []);
      if (users.status === 'fulfilled') setRoster(users.value.data?.users || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // The purchase dialog needs to know how much the player can personally
  // contribute; the sheet endpoint is the cheapest place to get it.
  useEffect(() => {
    let alive = true;
    if (!currentUser) return undefined;
    api.get('/characters/me')
      .then(({ data }) => { if (alive) setPersonalXp(Number(data?.character?.xp) || 0); })
      .catch(() => { if (alive) setPersonalXp(0); });
    return () => { alive = false; };
  }, [currentUser]);

  const loadMine = useCallback(async () => {
    try {
      const { data } = await api.get('/coteries');
      setMine(data.coteries || []);
    } catch (e) {
      publish({ message: errText(e, 'Could not load your coteries.'), type: 'error' });
    }
  }, []);

  const loadRegistry = useCallback(async () => {
    try {
      const { data } = await api.get('/coteries/all');
      setRegistry(data.coteries || []);
    } catch (e) {
      publish({ message: errText(e, 'Could not load the coterie registry.'), type: 'error' });
    }
  }, []);

  // Loaded up front, not just when the Registry tab opens: the builder uses it
  // to warn that another coterie already claims a Domain division.
  useEffect(() => { loadRegistry(); }, [loadRegistry]);
  useEffect(() => { if (tab === 'all') loadRegistry(); }, [tab, loadRegistry]);

  const loadDetail = useCallback(async (id) => {
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/coteries/${id}`);
      setDetail(data);
      setSelectedId(id);
    } catch (e) {
      publish({ message: errText(e, 'Could not open that coterie.'), type: 'error' });
      setSelectedId(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  /* ---- builder ---- */

  const startNew = () => {
    setEditingId(null);
    setEditing({});
    setTab('builder');
  };

  const startEdit = (coterie, members) => {
    setEditingId(coterie.id);
    setEditing({
      name: coterie.name || '',
      concept: coterie.concept || '',
      type: coterie.type || '',
      domainId: coterie.domain_id != null ? String(coterie.domain_id) : '',
      traits: { ...coterie.traits },
      backgrounds: coterie.backgrounds || [],
      merits: coterie.merits || [],
      flaws: coterie.flaws || [],
      required: coterie.required || null,
      extras: coterie.extras || [],
      pointsPerMember: coterie.points_per_member || 1,
      bonusPoints: coterie.bonus_points || 0,
      rulesOverride: !!coterie.rules_override,
      members: (members || []).map((m) => ({
        id: m.user_id,
        name: m.character_name || m.display_name,
        clan: m.clan || null,
      })),
    });
    setTab('builder');
  };

  const save = async (payload) => {
    setBusy(true);
    try {
      let id = editingId;
      if (editingId) {
        const { data } = await api.put(`/coteries/${editingId}`, payload);
        await api.post(`/coteries/${editingId}/members/set`, { members: payload.members });
        (data.warnings || []).forEach((w) => publish({ message: w, type: 'info' }));
        publish({ message: 'Coterie updated.', type: 'success' });
      } else {
        const { data } = await api.post('/coteries', payload);
        id = data.coterie.id;
        (data.warnings || []).forEach((w) => publish({ message: w, type: 'info' }));
        publish({ message: `“${data.coterie.name}” founded.`, type: 'success' });
      }
      setEditing(null);
      setEditingId(null);
      await loadMine();
      await loadDetail(id);
      setTab('mine');
    } catch (e) {
      publish({ message: errText(e, 'Could not save the coterie.'), type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  /* ---- XP ---- */

  const award = async (delta) => {
    if (!detail) return;
    setBusy(true);
    try {
      await api.post(`/coteries/${detail.coterie.id}/xp`, { delta });
      publish({
        message: delta >= 0 ? `Awarded ${delta} XP.` : `Deducted ${Math.abs(delta)} XP.`,
        type: 'success',
      });
      await loadDetail(detail.coterie.id);
      await loadMine();
    } catch (e) {
      publish({ message: errText(e, 'Could not adjust XP.'), type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const purchase = async (payload) => {
    if (!detail) return false;
    setBusy(true);
    try {
      const { data } = await api.post(`/coteries/${detail.coterie.id}/purchase`, payload);
      publish({
        message: `Bought for ${data.spent.cost} XP`
          + (data.spent.from_personal ? ` (${data.spent.from_personal} from your sheet).` : '.'),
        type: 'success',
      });
      if (data.spent.from_personal) {
        setPersonalXp((v) => Math.max(0, v - data.spent.from_personal));
      }
      await loadDetail(detail.coterie.id);
      await loadMine();
      return true;
    } catch (e) {
      publish({ message: errText(e, 'Could not complete the purchase.'), type: 'error' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Permanently delete this coterie? Its XP ledger goes with it.')) return;
    setBusy(true);
    try {
      await api.delete(`/coteries/${id}`);
      publish({ message: 'Coterie deleted.', type: 'success' });
      setDetail(null);
      setSelectedId(null);
      await loadMine();
    } catch (e) {
      publish({ message: errText(e, 'Could not delete the coterie.'), type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  /* ---- render ---- */

  const tabs = [
    { value: 'mine', label: 'My Coteries', badge: mine.length || undefined },
    { value: 'all', label: 'Registry' },
    ...(editing ? [{ value: 'builder', label: editingId ? 'Editing' : 'New Coterie' }] : []),
    { value: 'types', label: 'Types' },
    { value: 'rules', label: 'Rules' },
  ];

  if (loading) {
    return (
      <div className={styles.wrap}>
        <header className={styles.header}><h2 className={styles.title}>Coteries</h2></header>
        <Card><Spinner label="Loading coteries…" /></Card>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h2 className={styles.title}>Coteries</h2>
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </header>

      {tab === 'mine' && (
        <div className={styles.stack}>
          <div className={styles.toolbar}>
            <Muted className={styles.tightNote}>
              {mine.length === 0
                ? 'You are not in a registered coterie yet.'
                : `${mine.length} coterie${mine.length === 1 ? '' : 's'}.`}
            </Muted>
            {currentUser && (
              <button type="button" className={styles.buttonPrimary} onClick={startNew}>
                + Found a coterie
              </button>
            )}
          </div>

          {mine.length === 0 ? (
            <Card>
              <Empty>
                Gather at least three Kindred with character sheets, agree on a Domain, and found one.
              </Empty>
            </Card>
          ) : selectedId && detail ? (
            <>
              <button
                type="button"
                className={styles.backLink}
                onClick={() => { setSelectedId(null); setDetail(null); }}
              >
                ← All my coteries
              </button>
              {loadingDetail ? (
                <Card><Spinner /></Card>
              ) : (
                <CoterieSheet
                  coterie={detail.coterie}
                  members={detail.members}
                  xpLog={detail.xp_log || []}
                  domainLabel={detail.coterie.domain_id
                    ? `#${detail.coterie.domain_id} — ${domainLabelFor(detail.coterie.domain_id) || 'Unknown'}`
                    : null}
                  isAdmin={isAdmin}
                  canEdit
                  personalXp={personalXp}
                  busy={busy}
                  onEdit={() => startEdit(detail.coterie, detail.members)}
                  onDelete={() => remove(detail.coterie.id)}
                  onAward={award}
                  onPurchase={purchase}
                />
              )}
            </>
          ) : (
            <div className={styles.cardGrid}>
              {mine.map((c) => {
                const diff = huntingDifficulty(c.traits?.chasse);
                return (
                  <Card
                    key={c.id}
                    title={c.name}
                    subtitle={[c.type || 'Custom', c.domain_id ? domainLabelFor(c.domain_id) : 'No Domain']
                      .filter(Boolean).join(' · ')}
                    actions={<span className={styles.bankPill}>{c.coterie_xp} XP</span>}
                  >
                    {c.concept && <p className={styles.concept}>{c.concept}</p>}
                    <div className={styles.statRow}>
                      <Stat label="Hunting Diff." value={diff == null ? '—' : diff} />
                      <Stat label="Lien" value={`+${lienBonusDice(c.traits?.lien)}`} />
                      <Stat label="Portillon" value={`−${portillonPenaltyDice(c.traits?.portillon)}`} />
                      <Stat label="Members" value={(c.members || []).length} />
                    </div>
                    <div className={styles.cardActionRow}>
                      <button
                        type="button"
                        className={styles.buttonPrimary}
                        onClick={() => loadDetail(c.id)}
                      >
                        Open sheet
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'all' && (
        <div className={styles.stack}>
          {registry.length === 0 ? (
            <Card><Empty>No coteries are registered in the domain yet.</Empty></Card>
          ) : (
            <div className={styles.cardGrid}>
              {registry.map((c) => (
                <RegistryCard key={c.id} c={c} domainLabel={domainLabelFor(c.domain_id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'builder' && editing && (
        <CoterieBuilder
          initial={editing}
          editingId={editingId}
          domainOptions={domainOptions}
          roster={roster}
          currentUser={currentUser}
          isAdmin={isAdmin}
          claimedDomains={registry.length ? registry : mine}
          saving={busy}
          onSave={save}
          onCancel={() => { setEditing(null); setEditingId(null); setTab('mine'); }}
        />
      )}

      {tab === 'types' && (
        <TypesBrowser
          onPick={(name) => {
            // Seed the builder with the type's listed costs already applied,
            // rather than handing it a bare name it would have to re-derive.
            const data = getCoterie(name);
            const seed = data ? seedFromType(data) : null;
            setEditingId(null);
            setEditing(seed
              ? {
                  type: name,
                  traits: seed.traits,
                  backgrounds: seed.backgrounds,
                  flaws: seed.flaws,
                  required: seed.required,
                  extras: Array.isArray(data.extras) ? data.extras : [],
                }
              : { type: name });
            setTab('builder');
          }}
        />
      )}

      {tab === 'rules' && <RulesOverview />}
    </div>
  );
}
