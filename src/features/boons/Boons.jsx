// src/pages/Boons.jsx
import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import api from '../../core/api';
import { AuthCtx } from '../../core/AuthContext';
import { Skeleton } from 'boneyard-js/react';
import MiniSearch from 'minisearch';
import Avatar from '../../components/Avatar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const BOON_LEVELS  = ['trivial', 'minor', 'major', 'life'];
const BOON_STATUSES = ['owed', 'paid', 'excused'];

const LEVEL_LABELS = { trivial: 'Trivial', minor: 'Minor', major: 'Major', life: 'Life' };
const STATUS_LABELS = { owed: 'Active', paid: 'Paid', excused: 'Excused' };

/* ── Relative date ──────────────────────────── */
function relDate(ts) {
  if (!ts) return '';
  const d    = new Date(ts);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 30)  return `${diff}d ago`;
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}



export default function Boons() {
  const { user } = useContext(AuthCtx);
  const queryClient = useQueryClient();
  
  const [showForm, setShowForm]       = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  
  // Filters & Search
  const [sortMode, setSortMode]             = useState('date');
  const [filterActive, setFilterActive]     = useState(false);
  const [showPaid, setShowPaid]             = useState(true);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [searchQuery, setSearchQuery]       = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Person Stats Search with MiniSearch
  const [personSearchQuery, setPersonSearchQuery] = useState('');
  const [showPersonSuggestions, setShowPersonSuggestions] = useState(false);
  const [inspectedPerson, setInspectedPerson] = useState(null);
  const personSearchRef = useRef(null);
  
  const searchRef = useRef(null);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  const isAdmin  = user?.role === 'admin' || user?.permission_level === 'admin';
  const isCourt  = user?.role === 'courtuser';
  const canManage = isAdmin || isCourt;

  // React Query Fetching
  const { data: boonsData, isLoading: boonsLoading, error: boonsErrorObj } = useQuery({
    queryKey: ['boons'],
    queryFn: async () => {
      const res = await api.get('/boons');
      return res.data;
    }
  });

  const { data: entitiesData, isLoading: entitiesLoading } = useQuery({
    queryKey: ['boons', 'entities'],
    queryFn: async () => {
      const res = await api.get('/boons/entities');
      return res.data;
    }
  });

  const { data: myCharData, isLoading: myCharLoading } = useQuery({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    }
  });

  const loading = boonsLoading || entitiesLoading || myCharLoading;
  const boons = boonsData?.boons || [];
  const entities = entitiesData?.entities || [];
  const myCharacter = myCharData?.character || null;
  const error = boonsErrorObj?.response?.data?.error || boonsErrorObj?.message || '';

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/boons/${id}`);
    },
    onSuccess: () => {
      toast.success('Boon deleted');
      queryClient.invalidateQueries({ queryKey: ['boons'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  });

  // Click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (personSearchRef.current && !personSearchRef.current.contains(event.target)) {
        setShowPersonSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getAvatarProps = (id, name) => {
    if (!id && !name) return null;
    let type = null;
    let targetId = id;

    if (!targetId) {
      const base = (name || '').split(' (')[0].trim();
      const byName = entities.find(e => (e.name || '').split(' (')[0].trim() === base);
      if (byName) {
        type = byName.type;
        targetId = byName.id;
      }
    } else {
      const byIdUser = entities.find(e => (e.type === 'user' || e.type === 'player') && String(e.id) === String(id));
      if (byIdUser) type = 'user';
      else {
        const byIdNpc = entities.find(e => e.type === 'npc' && String(e.id) === String(id));
        if (byIdNpc) type = 'npc';
      }
      
      if (!type) {
         const base = (name || '').split(' (')[0].trim();
         const byName = entities.find(e => (e.name || '').split(' (')[0].trim() === base);
         if (byName) type = byName.type;
      }
    }

    if (type === 'user' || type === 'player') return { userId: targetId };
    if (type === 'npc') return { npcId: targetId };
    return null;
  };

  // Scroll handler for mobile toolbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50 && toolbarVisible) {
        setToolbarVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [toolbarVisible]);

  // Extract unique names for Autocomplete
  const uniqueNames = useMemo(() => {
    const names = new Set();
    boons.forEach(b => {
      if (b.from_name) names.add(b.from_name.trim());
      if (b.to_name) names.add(b.to_name.trim());
    });
    return Array.from(names).sort();
  }, [boons]);

  const filteredNames = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.trim();
    const mapped = uniqueNames.map((name, i) => ({ id: i, name }));
    const ms = new MiniSearch({ fields: ['name'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
    ms.addAll(mapped);
    const results = ms.search(q);
    return results.map(r => mapped[r.id].name).slice(0, 8);
  }, [searchQuery, uniqueNames]);

  // Helper for normalizing Kindred / NPC names
  const cleanPersonName = (raw) => (raw || '').split(' (')[0].trim();

  // Full Ledger Entity List with calculated statistics per person
  const allPersonStats = useMemo(() => {
    const map = new Map();

    // 1. Seed with known entities (Players and NPCs)
    entities.forEach((ent, idx) => {
      const clean = cleanPersonName(ent.name);
      if (!clean) return;
      const clanMatch = ent.name.match(/\(([^)]+)\)/);
      const clanOrRole = clanMatch ? clanMatch[1] : (ent.type === 'npc' ? 'NPC' : 'Kindred');
      
      map.set(clean.toLowerCase(), {
        id: `ent_${ent.id || idx}_${ent.type}`,
        key: clean.toLowerCase(),
        name: ent.name,
        cleanName: clean,
        type: ent.type === 'npc' ? 'NPC' : 'Player',
        clan: clanOrRole,
        entityId: ent.id,
        debtsOwed: 0,
        debtsBreakdown: { life: 0, major: 0, minor: 0, trivial: 0 },
        creditsHeld: 0,
        creditsBreakdown: { life: 0, major: 0, minor: 0, trivial: 0 },
        settledCount: 0,
        weightedDebt: 0,
        weightedCredit: 0
      });
    });

    // 2. Add any names from boons not already seeded
    uniqueNames.forEach((rawName, idx) => {
      const clean = cleanPersonName(rawName);
      if (!clean) return;
      const key = clean.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: `raw_${idx}`,
          key,
          name: rawName,
          cleanName: clean,
          type: 'Kindred',
          clan: 'Kindred',
          entityId: null,
          debtsOwed: 0,
          debtsBreakdown: { life: 0, major: 0, minor: 0, trivial: 0 },
          creditsHeld: 0,
          creditsBreakdown: { life: 0, major: 0, minor: 0, trivial: 0 },
          settledCount: 0,
          weightedDebt: 0,
          weightedCredit: 0
        });
      }
    });

    // 3. Aggregate boons debts and credits
    const levelWeight = { life: 4, major: 3, minor: 2, trivial: 1 };
    boons.forEach(b => {
      const fromClean = cleanPersonName(b.from_name);
      const toClean   = cleanPersonName(b.to_name);
      const lvl = String(b.level || 'trivial').toLowerCase();
      const statusStr = String(b.status || 'owed').toLowerCase();
      const isSettled = statusStr === 'paid' || statusStr === 'excused';
      const weight = levelWeight[lvl] || 1;

      // Debtor
      if (fromClean) {
        const key = fromClean.toLowerCase();
        let p = map.get(key);
        if (!p) {
          p = {
            id: `from_${key}`,
            key,
            name: b.from_name,
            cleanName: fromClean,
            type: 'Kindred',
            clan: 'Kindred',
            entityId: b.from_id || null,
            debtsOwed: 0,
            debtsBreakdown: { life: 0, major: 0, minor: 0, trivial: 0 },
            creditsHeld: 0,
            creditsBreakdown: { life: 0, major: 0, minor: 0, trivial: 0 },
            settledCount: 0,
            weightedDebt: 0,
            weightedCredit: 0
          };
          map.set(key, p);
        }
        if (isSettled) {
          p.settledCount += 1;
        } else {
          p.debtsOwed += 1;
          p.weightedDebt += weight;
          if (p.debtsBreakdown[lvl] !== undefined) p.debtsBreakdown[lvl] += 1;
        }
      }

      // Creditor
      if (toClean) {
        const key = toClean.toLowerCase();
        let p = map.get(key);
        if (!p) {
          p = {
            id: `to_${key}`,
            key,
            name: b.to_name,
            cleanName: toClean,
            type: 'Kindred',
            clan: 'Kindred',
            entityId: b.to_id || null,
            debtsOwed: 0,
            debtsBreakdown: { life: 0, major: 0, minor: 0, trivial: 0 },
            creditsHeld: 0,
            creditsBreakdown: { life: 0, major: 0, minor: 0, trivial: 0 },
            settledCount: 0,
            weightedDebt: 0,
            weightedCredit: 0
          };
          map.set(key, p);
        }
        if (isSettled) {
          p.settledCount += 1;
        } else {
          p.creditsHeld += 1;
          p.weightedCredit += weight;
          if (p.creditsBreakdown[lvl] !== undefined) p.creditsBreakdown[lvl] += 1;
        }
      }
    });

    return Array.from(map.values()).map(p => ({
      ...p,
      netBalance: p.creditsHeld - p.debtsOwed,
      totalActivity: p.debtsOwed + p.creditsHeld + p.settledCount
    }));
  }, [entities, uniqueNames, boons]);

  // MiniSearch instance for Person Stats Search
  const personMiniSearch = useMemo(() => {
    const ms = new MiniSearch({
      fields: ['cleanName', 'name', 'clan', 'type'],
      storeFields: ['id', 'key', 'cleanName', 'name', 'clan', 'type'],
      searchOptions: {
        fuzzy: 0.2,
        prefix: true,
        combineWith: 'AND'
      }
    });
    ms.addAll(allPersonStats);
    return ms;
  }, [allPersonStats]);

  // Suggestions for Person Stats search
  const filteredPersonStats = useMemo(() => {
    if (!personSearchQuery) return [];
    const q = personSearchQuery.trim();
    const results = personMiniSearch.search(q);
    const idSet = new Set(results.map(r => r.id));
    return allPersonStats.filter(p => idSet.has(p.id)).slice(0, 8);
  }, [personSearchQuery, personMiniSearch, allPersonStats]);

  // Format level breakdown helper
  const formatBreakdown = (breakdown) => {
    const parts = [];
    if (breakdown.life > 0) parts.push(`${breakdown.life} Life`);
    if (breakdown.major > 0) parts.push(`${breakdown.major} Major`);
    if (breakdown.minor > 0) parts.push(`${breakdown.minor} Minor`);
    if (breakdown.trivial > 0) parts.push(`${breakdown.trivial} Trivial`);
    return parts.length > 0 ? parts.join(', ') : 'None';
  };

  // Top Debt Mini Statuses calculations
  const topDebtor = useMemo(() => {
    const activeDebtors = allPersonStats.filter(p => p.debtsOwed > 0);
    if (!activeDebtors.length) return null;
    activeDebtors.sort((a, b) => b.weightedDebt - a.weightedDebt || b.debtsOwed - a.debtsOwed);
    return activeDebtors[0];
  }, [allPersonStats]);

  const topCreditor = useMemo(() => {
    const activeCreditors = allPersonStats.filter(p => p.creditsHeld > 0);
    if (!activeCreditors.length) return null;
    activeCreditors.sort((a, b) => b.weightedCredit - a.weightedCredit || b.creditsHeld - a.creditsHeld);
    return activeCreditors[0];
  }, [allPersonStats]);

  const myDebtStats = useMemo(() => {
    const myNames = [];
    if (user?.display_name) myNames.push(cleanPersonName(user.display_name).toLowerCase());
    if (myCharacter?.name) myNames.push(cleanPersonName(myCharacter.name).toLowerCase());
    
    const matched = allPersonStats.find(p => myNames.includes(p.cleanName.toLowerCase()));
    if (!matched) {
      return { debtsOwed: 0, creditsHeld: 0, breakdown: 'Debt Free' };
    }
    return {
      debtsOwed: matched.debtsOwed,
      creditsHeld: matched.creditsHeld,
      breakdown: formatBreakdown(matched.debtsBreakdown)
    };
  }, [user, myCharacter, allPersonStats]);

  // Entity list for dropdown selector
  const entitySelectGroups = useMemo(() => {
    const players = [];
    const npcs = [];
    const others = [];

    allPersonStats.forEach(p => {
      if (p.type === 'Player') players.push(p);
      else if (p.type === 'NPC') npcs.push(p);
      else others.push(p);
    });

    players.sort((a, b) => a.cleanName.localeCompare(b.cleanName));
    npcs.sort((a, b) => a.cleanName.localeCompare(b.cleanName));
    others.sort((a, b) => a.cleanName.localeCompare(b.cleanName));

    return { players, npcs, others };
  }, [allPersonStats]);

  // Processed Boons with all filters applied
  const processedBoons = useMemo(() => {
    let result = [...boons];
    
    // 1. Paid Boons Toggle (defaults to true)
    if (!showPaid) {
      result = result.filter(b => {
        const s = String(b.status || '').toLowerCase();
        return s !== 'paid' && s !== 'excused';
      });
    }

    // 2. Specific Player or NPC Selection Filter
    if (selectedEntity) {
      const targetLower = cleanPersonName(selectedEntity).toLowerCase();
      result = result.filter(b => {
        const fromClean = cleanPersonName(b.from_name).toLowerCase();
        const toClean   = cleanPersonName(b.to_name).toLowerCase();
        return fromClean === targetLower || toClean === targetLower;
      });
    }

    // 3. Ownership Filter (All vs My Boons / NPC records)
    if (filterActive && user && !selectedEntity) {
      if (isAdmin) {
        const npcNames = entities.filter(e => e.type === 'npc')
          .map(e => e.name.toLowerCase().replace(' (npc)', '').trim());
        result = result.filter(b => {
          const from = (b.from_name || '').toLowerCase();
          const to   = (b.to_name   || '').toLowerCase();
          return npcNames.some(n => from.includes(n) || to.includes(n));
        });
      } else {
        const myNames = [];
        if (user.display_name)  myNames.push(cleanPersonName(user.display_name).toLowerCase());
        if (myCharacter?.name)  myNames.push(cleanPersonName(myCharacter.name).toLowerCase());
        result = result.filter(b => {
          const from = cleanPersonName(b.from_name).toLowerCase();
          const to   = cleanPersonName(b.to_name).toLowerCase();
          return myNames.some(n => from === n || to === n);
        });
      }
    }

    // 4. Text Search Query Filter
    if (searchQuery) {
      const sq = searchQuery.trim();
      const ms = new MiniSearch({ fields: ['from_name', 'to_name', 'description'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
      ms.addAll(result);
      const results = ms.search(sq);
      const idSet = new Set(results.map(r => r.id));
      result = result.filter(b => idSet.has(b.id));
    }

    // 5. Sorting
    const levelRank  = { life: 4, major: 3, minor: 2, trivial: 1 };
    const statusRank = { owed: 1, paid: 2, excused: 3 };
    switch (sortMode) {
      case 'level':
        result.sort((a, b) => (levelRank[String(b.level).toLowerCase()] || 0) - (levelRank[String(a.level).toLowerCase()] || 0) || new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'status':
        result.sort((a, b) => (statusRank[String(a.status).toLowerCase()] || 0) - (statusRank[String(b.status).toLowerCase()] || 0) || new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'from':
        result.sort((a, b) => (a.from_name || '').localeCompare(b.from_name || ''));
        break;
      case 'to':
        result.sort((a, b) => (a.to_name || '').localeCompare(b.to_name || ''));
        break;
      default:
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return result;
  }, [boons, sortMode, showPaid, selectedEntity, filterActive, user, myCharacter, isAdmin, entities, searchQuery]);

  const stats = useMemo(() => ({
    total:   processedBoons.length,
    active:  processedBoons.filter(b => String(b.status).toLowerCase() === 'owed').length,
    life:    processedBoons.filter(b => String(b.level).toLowerCase()  === 'life'  && String(b.status).toLowerCase() === 'owed').length,
    major:   processedBoons.filter(b => String(b.level).toLowerCase()  === 'major' && String(b.status).toLowerCase() === 'owed').length,
  }), [processedBoons]);

  const handleSave   = () => { setShowForm(false); setEditTarget(null); };
  const handleDelete = (id) => {
    if (!window.confirm('Delete this record?')) return;
    deleteMutation.mutate(id);
  };
  const openEdit   = (b) => { setEditTarget(b); setShowForm(true); };
  const openCreate = ()  => { setEditTarget(null); setShowForm(true); };
  const closeForm  = ()  => { setShowForm(false); setEditTarget(null); };

  const filterLabel = isAdmin
    ? (filterActive ? 'All boons' : 'NPC records')
    : (filterActive ? 'All boons' : 'My boons');

  // Select a person to inspect and highlight
  const inspectPerson = (cleanName) => {
    const target = allPersonStats.find(p => p.cleanName.toLowerCase() === cleanName.toLowerCase());
    if (target) {
      setInspectedPerson(target);
      setSelectedEntity(target.cleanName);
    }
  };

  const handleCloseDossier = () => {
    setInspectedPerson(null);
    setSelectedEntity('');
    setPersonSearchQuery('');
  };

  // Helper for card styling
  const getBoonColorClasses = (level) => {
    switch (level) {
      case 'life': return { bgSolid: 'bg-primary-container', bgLight: 'bg-primary-container/20', text: 'text-primary-container', borderLight: 'border-primary-container/30' };
      case 'major': return { bgSolid: 'bg-tertiary', bgLight: 'bg-tertiary/20', text: 'text-tertiary', borderLight: 'border-tertiary/30' };
      case 'minor': return { bgSolid: 'bg-blue-500', bgLight: 'bg-blue-500/20', text: 'text-blue-400', borderLight: 'border-blue-500/30' };
      default: return { bgSolid: 'bg-on-surface-variant', bgLight: 'bg-on-surface-variant/20', text: 'text-on-surface-variant', borderLight: 'border-on-surface-variant/30' };
    }
  };

  return (
    <div className="bg-background text-on-surface min-h-screen selection:bg-primary-container selection:text-on-primary-container boons-page">
      <style>{`
        .boons-page {
          font-family: 'Inter', sans-serif;
        }
        .boons-page h1, .boons-page h2, .boons-page h3, .boons-page h4, .boons-page h5, .boons-page h6, .font-headline-md, .font-headline-lg, .font-display-lg {
          font-family: 'Playfair Display', serif;
        }
        .gothic-etched-border { border: 1px solid rgba(224, 224, 224, 0.1); }
        .paid-stamp {
            text-transform: uppercase;
            font-family: 'Playfair Display', serif;
            letter-spacing: 0.2em;
            transform: rotate(-15deg);
            opacity: 0.15;
            user-select: none;
            pointer-events: none;
        }
      `}</style>
      
      {/* ── Slide-in form sheet ── */}
      {showForm && canManage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeForm}>
          <div className="bg-surface-container-high gothic-etched-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <BoonForm entities={entities} boon={editTarget} onSave={handleSave} onCancel={closeForm} />
          </div>
        </div>
      )}

      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-40 bg-surface-container-highest border-b border-outline-variant/10 h-16 flex items-center justify-between px-4 lg:px-8 lg:hidden">
        <h1 className="font-headline-md text-[20px] font-bold text-primary">Blood Registry</h1>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant active:opacity-80 transition-colors flex" onClick={() => setToolbarVisible(v => !v)}>
            <span className="material-symbols-outlined">search</span>
          </button>
          <span className="material-symbols-outlined text-on-surface-variant">history_edu</span>
        </div>
      </header>

      {/* Expandable Search Toolbar (Mobile) */}
      <div 
        className={`fixed top-16 w-full bg-surface-container-high border-b border-outline-variant/10 z-30 transition-all duration-300 transform lg:hidden ${toolbarVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`} 
      >
        <div className="p-4 space-y-4">
          <div className="flex bg-surface-container-lowest rounded-lg gothic-etched-border p-2 relative" ref={searchRef}>
            <span className="material-symbols-outlined text-on-surface-variant mr-2">search</span>
            <input 
              className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none" 
              placeholder="Search lineages..." 
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && filteredNames.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-surface-container-high gothic-etched-border rounded shadow-xl mt-1 max-h-48 overflow-y-auto z-50">
                {filteredNames.map(name => (
                  <div key={name} className="px-4 py-2 hover:bg-surface-variant cursor-pointer text-sm" onClick={() => { setSearchQuery(name); setShowSuggestions(false); setToolbarVisible(false); }}>
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Specific Player or NPC Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">Kindred or NPC Filter</label>
            <select
              className="w-full bg-surface-container-lowest gothic-etched-border rounded px-3 py-2 text-xs text-on-surface outline-none"
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
            >
              <option value="">All Kindred and NPCs</option>
              {entitySelectGroups.players.length > 0 && (
                <optgroup label="Kindred Players">
                  {entitySelectGroups.players.map(p => (
                    <option key={p.id} value={p.cleanName}>{p.cleanName} ({p.clan})</option>
                  ))}
                </optgroup>
              )}
              {entitySelectGroups.npcs.length > 0 && (
                <optgroup label="NPCs">
                  {entitySelectGroups.npcs.map(p => (
                    <option key={p.id} value={p.cleanName}>{p.cleanName} (NPC)</option>
                  ))}
                </optgroup>
              )}
              {entitySelectGroups.others.length > 0 && (
                <optgroup label="Other Registered">
                  {entitySelectGroups.others.map(p => (
                    <option key={p.id} value={p.cleanName}>{p.cleanName}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
            {/* Mobile Paid Boons Toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-on-surface">
              <input
                type="checkbox"
                checked={showPaid}
                onChange={e => setShowPaid(e.target.checked)}
                className="w-4 h-4 rounded border-outline-variant bg-surface-container-lowest text-primary focus:ring-0 cursor-pointer"
              />
              <span>Paid Boons</span>
            </label>

            <button
              className={`px-3 py-1 rounded-full text-[12px] font-bold whitespace-nowrap gothic-etched-border ${filterActive ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-lowest text-on-surface-variant'}`}
              onClick={() => setFilterActive(f => !f)}
            >
              {filterLabel}
            </button>
            <select className="bg-surface-container-lowest gothic-etched-border rounded px-2 py-1 text-[12px] text-on-surface-variant focus:outline-none" value={sortMode} onChange={e => setSortMode(e.target.value)}>
              <option value="date">Newest</option>
              <option value="level">Highest Value</option>
              <option value="status">Active First</option>
              <option value="from">Debtor A to Z</option>
              <option value="to">Creditor A to Z</option>
            </select>
          </div>
        </div>
      </div>

      <Skeleton loading={loading} name="boons-page">
        <main className="pt-20 lg:pt-0 pb-32 max-w-7xl mx-auto px-4 lg:px-12 lg:py-12">
          
          {error && <div className="bg-error-container text-on-error px-4 py-3 rounded mb-6 text-sm">{error}</div>}

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="space-y-2">
              <h2 className="font-headline-lg text-[32px] font-bold text-primary tracking-tight">Blood Registry</h2>
              <p className="text-on-surface-variant text-sm md:text-base italic border-l border-primary/30 pl-4">Debts of honour recorded before the gathered Kindred.</p>
            </div>
            {canManage && (
              <button onClick={openCreate} className="flex items-center justify-center gap-2 bg-primary-container text-on-primary-container px-6 py-3 rounded-sm font-bold tracking-widest uppercase hover:brightness-110 transition-colors active:scale-95 text-xs">
                <span className="material-symbols-outlined">add_circle</span>
                Record Boon
              </button>
            )}
          </div>

          {/* Top Mini Statuses: Most in Debt, Your Debt, Most Owed */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Card 1: Most in Debt */}
              <div 
                className="bg-surface-container p-5 rounded-xl gothic-etched-border relative overflow-hidden cursor-pointer hover:border-primary/50 transition-all group"
                onClick={() => {
                  if (topDebtor) {
                    inspectPerson(topDebtor.cleanName);
                    setSelectedEntity(topDebtor.cleanName);
                  }
                }}
                title="Click to view all records and stats for the greatest debtor"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">trending_down</span>
                    Most in Debt
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">arrow_forward</span>
                </div>
                <h4 className="text-headline-md text-[20px] font-bold text-on-surface truncate">
                  {topDebtor ? topDebtor.cleanName : 'No Active Debts'}
                </h4>
                <p className="text-[12px] text-on-surface-variant mt-1">
                  {topDebtor ? `${topDebtor.debtsOwed} active debts: ${formatBreakdown(topDebtor.debtsBreakdown)}` : 'The ledger is clear'}
                </p>
              </div>

              {/* Card 2: Your Debt */}
              <div 
                className="bg-surface-container p-5 rounded-xl gothic-etched-border relative overflow-hidden cursor-pointer hover:border-primary/50 transition-all group"
                onClick={() => {
                  if (myCharacter?.name || user?.display_name) {
                    const myName = cleanPersonName(myCharacter?.name || user?.display_name);
                    inspectPerson(myName);
                    setSelectedEntity(myName);
                  }
                }}
                title="Click to view your personal debts and records"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                    Your Debt Standing
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-secondary transition-colors">arrow_forward</span>
                </div>
                <h4 className="text-headline-md text-[20px] font-bold text-on-surface truncate">
                  {myDebtStats.debtsOwed > 0 ? `${myDebtStats.debtsOwed} Active Debts` : 'Debt Free'}
                </h4>
                <p className="text-[12px] text-on-surface-variant mt-1">
                  {myDebtStats.debtsOwed > 0 ? myDebtStats.breakdown : `Held credits: ${myDebtStats.creditsHeld} boons`}
                </p>
              </div>

              {/* Card 3: Most Owed */}
              <div 
                className="bg-surface-container p-5 rounded-xl gothic-etched-border relative overflow-hidden cursor-pointer hover:border-primary/50 transition-all group"
                onClick={() => {
                  if (topCreditor) {
                    inspectPerson(topCreditor.cleanName);
                    setSelectedEntity(topCreditor.cleanName);
                  }
                }}
                title="Click to view all records and stats for the greatest creditor"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-tertiary uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">military_tech</span>
                    Most Owed
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-tertiary transition-colors">arrow_forward</span>
                </div>
                <h4 className="text-headline-md text-[20px] font-bold text-on-surface truncate">
                  {topCreditor ? topCreditor.cleanName : 'No Active Credits'}
                </h4>
                <p className="text-[12px] text-on-surface-variant mt-1">
                  {topCreditor ? `${topCreditor.creditsHeld} boons held: ${formatBreakdown(topCreditor.creditsBreakdown)}` : 'No boons owed'}
                </p>
              </div>
            </div>
          )}

          {/* Mini Search: Inspect Specific Person Stats */}
          {!loading && (
            <div className="bg-surface-container-high/60 gothic-etched-border rounded-xl p-4 mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">manage_search</span>
                    Kindred Prestation Dossier
                  </h3>
                  <p className="text-xs text-on-surface-variant">Inspect detailed debt balance and credit stats with MiniSearch</p>
                </div>
                {inspectedPerson && (
                  <button 
                    onClick={handleCloseDossier}
                    className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 bg-surface-container px-3 py-1.5 rounded gothic-etched-border"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                    Close Dossier
                  </button>
                )}
              </div>

              {/* Person MiniSearch Input */}
              <div className="relative mb-3" ref={personSearchRef}>
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">person_search</span>
                <input
                  className="w-full bg-surface-container-lowest gothic-etched-border focus:border-primary pl-10 pr-4 py-2.5 text-xs outline-none text-on-surface transition-colors rounded"
                  placeholder="Search player or NPC name to inspect prestation standing..."
                  type="text"
                  value={personSearchQuery}
                  onChange={e => { setPersonSearchQuery(e.target.value); setShowPersonSuggestions(true); }}
                  onFocus={() => setShowPersonSuggestions(true)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && filteredPersonStats.length > 0) {
                      const person = filteredPersonStats[0];
                      setInspectedPerson(person);
                      setSelectedEntity(person.cleanName);
                      setPersonSearchQuery('');
                      setShowPersonSuggestions(false);
                    }
                  }}
                />
                {showPersonSuggestions && filteredPersonStats.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-surface-container-high gothic-etched-border rounded shadow-xl mt-1 max-h-56 overflow-y-auto z-50">
                    {filteredPersonStats.map(person => (
                      <div 
                        key={person.id}
                        className="px-4 py-2.5 hover:bg-surface-variant cursor-pointer text-xs flex items-center justify-between border-b border-outline-variant/10 last:border-b-0"
                        onClick={() => {
                          setInspectedPerson(person);
                          setSelectedEntity(person.cleanName);
                          setPersonSearchQuery('');
                          setShowPersonSuggestions(false);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface">{person.cleanName}</span>
                          <span className="text-[10px] text-on-surface-variant">({person.clan || person.type})</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-primary font-bold">Owes: {person.debtsOwed}</span>
                          <span className="text-tertiary font-bold">Held: {person.creditsHeld}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inspected Person Dossier Card */}
              {inspectedPerson && (
                <div className="bg-surface-container-lowest gothic-etched-border rounded-lg p-4 mt-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/10 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant text-xs font-bold shrink-0 bg-surface-container-highest overflow-hidden">
                        {getAvatarProps(inspectedPerson.entityId, inspectedPerson.name) ? (
                          <Avatar {...getAvatarProps(inspectedPerson.entityId, inspectedPerson.name)} size="100%" style={{ width: '100%', height: '100%' }} />
                        ) : getInitials(inspectedPerson.cleanName)}
                      </div>
                      <div>
                        <h4 className="text-[16px] font-bold text-on-surface flex items-center gap-2">
                          {inspectedPerson.cleanName}
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-normal">
                            {inspectedPerson.type}: {inspectedPerson.clan}
                          </span>
                        </h4>
                        <p className="text-[11px] text-on-surface-variant">
                          Net Standing: {inspectedPerson.netBalance > 0 ? `Net Creditor (+${inspectedPerson.netBalance})` : inspectedPerson.netBalance < 0 ? `Net Debtor (${inspectedPerson.netBalance})` : 'Balanced Position'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-surface-container p-3 rounded gothic-etched-border">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Debts Owed (Debtor)</span>
                      <p className="text-[18px] font-bold text-on-surface">{inspectedPerson.debtsOwed} Active</p>
                      <p className="text-[11px] text-on-surface-variant mt-1">{formatBreakdown(inspectedPerson.debtsBreakdown)}</p>
                    </div>

                    <div className="bg-surface-container p-3 rounded gothic-etched-border">
                      <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest block mb-1">Boons Held (Creditor)</span>
                      <p className="text-[18px] font-bold text-on-surface">{inspectedPerson.creditsHeld} Active</p>
                      <p className="text-[11px] text-on-surface-variant mt-1">{formatBreakdown(inspectedPerson.creditsBreakdown)}</p>
                    </div>

                    <div className="bg-surface-container p-3 rounded gothic-etched-border sm:col-span-2 md:col-span-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Historic Settled</span>
                      <p className="text-[18px] font-bold text-on-surface">{inspectedPerson.settledCount} Settled</p>
                      <p className="text-[11px] text-on-surface-variant mt-1">Paid or excused before Elysium</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* General Stats Bar */}
          {!loading && (
            <div className="flex gap-4 overflow-x-auto custom-scrollbar py-4 -mx-4 px-4 lg:-mx-12 lg:px-12 mb-6">
              <div className="flex-shrink-0 min-w-[120px] bg-surface-container p-4 rounded-xl gothic-etched-border">
                <p className="text-[12px] font-bold text-on-surface-variant uppercase">Total Listed</p>
                <h3 className="text-headline-md text-[24px] font-bold text-primary">{stats.total}</h3>
              </div>
              <div className="flex-shrink-0 min-w-[120px] bg-surface-container p-4 rounded-xl gothic-etched-border">
                <p className="text-[12px] font-bold text-on-surface-variant uppercase">Active</p>
                <h3 className="text-headline-md text-[24px] font-bold text-tertiary">{stats.active}</h3>
              </div>
              <div className="flex-shrink-0 min-w-[120px] bg-surface-container p-4 rounded-xl gothic-etched-border">
                <p className="text-[12px] font-bold text-on-surface-variant uppercase">Major Owed</p>
                <h3 className="text-headline-md text-[24px] font-bold text-secondary">{stats.major}</h3>
              </div>
              <div className="flex-shrink-0 min-w-[120px] bg-surface-container p-4 rounded-xl gothic-etched-border">
                <p className="text-[12px] font-bold text-on-surface-variant uppercase">Life Boons</p>
                <h3 className="text-headline-md text-[24px] font-bold text-primary-container">{stats.life}</h3>
              </div>
            </div>
          )}

          {/* Main Registry Filters Bar */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Lineage & Circumstances Search */}
              <div className="relative flex-grow" ref={searchRef}>
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                <input 
                  className="w-full bg-surface-container-lowest gothic-etched-border focus:border-primary pl-12 pr-4 py-3 text-sm outline-none text-on-surface transition-colors rounded"
                  placeholder="Search Kindred names or circumstances..." 
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                />
                {showSuggestions && filteredNames.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-surface-container-high gothic-etched-border rounded shadow-xl mt-1 max-h-64 overflow-y-auto z-50">
                    {filteredNames.map(name => (
                      <div key={name} className="px-4 py-3 hover:bg-surface-variant cursor-pointer text-sm" onClick={() => { setSearchQuery(name); setShowSuggestions(false); }}>
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Filters & Toggles Row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Specific Player or NPC Selector */}
                <select
                  className="bg-surface-container-lowest gothic-etched-border text-on-surface text-xs font-bold uppercase tracking-wider px-3 py-3 outline-none cursor-pointer rounded"
                  value={selectedEntity}
                  onChange={e => setSelectedEntity(e.target.value)}
                >
                  <option value="">All Kindred and NPCs</option>
                  {entitySelectGroups.players.length > 0 && (
                    <optgroup label="Kindred Players">
                      {entitySelectGroups.players.map(p => (
                        <option key={p.id} value={p.cleanName}>{p.cleanName} ({p.clan})</option>
                      ))}
                    </optgroup>
                  )}
                  {entitySelectGroups.npcs.length > 0 && (
                    <optgroup label="NPCs">
                      {entitySelectGroups.npcs.map(p => (
                        <option key={p.id} value={p.cleanName}>{p.cleanName} (NPC)</option>
                      ))}
                    </optgroup>
                  )}
                  {entitySelectGroups.others.length > 0 && (
                    <optgroup label="Other Registered">
                      {entitySelectGroups.others.map(p => (
                        <option key={p.id} value={p.cleanName}>{p.cleanName}</option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {/* Paid Boons Toggle (checked by default) */}
                <label className="flex items-center gap-2 bg-surface-container-lowest gothic-etched-border px-4 py-3 cursor-pointer select-none text-xs font-bold uppercase tracking-wider text-on-surface hover:border-primary transition-colors rounded">
                  <input
                    type="checkbox"
                    checked={showPaid}
                    onChange={e => setShowPaid(e.target.checked)}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-0 cursor-pointer"
                  />
                  <span>Paid Boons</span>
                </label>

                {/* Ownership Filter Button */}
                <button
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors gothic-etched-border rounded ${filterActive ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'}`}
                  onClick={() => setFilterActive(f => !f)}
                >
                  {filterLabel}
                </button>

                {/* Sort Mode */}
                <select 
                  className="bg-surface-container-lowest gothic-etched-border text-on-surface-variant text-xs font-bold uppercase tracking-widest px-4 py-3 outline-none cursor-pointer rounded" 
                  value={sortMode} 
                  onChange={e => setSortMode(e.target.value)}
                >
                  <option value="date">Newest</option>
                  <option value="level">Highest Value</option>
                  <option value="status">Active First</option>
                  <option value="from">Debtor A to Z</option>
                  <option value="to">Creditor A to Z</option>
                </select>
              </div>
            </div>

            {/* Active Entity Filter Badge */}
            {selectedEntity && (
              <div className="flex items-center justify-between bg-primary-container/20 border border-primary-container/30 px-4 py-2.5 rounded-lg text-xs">
                <span className="font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">filter_alt</span>
                  Filtered to all records involving: <span className="text-white underline font-bold">{selectedEntity}</span>
                </span>
                <button
                  onClick={handleCloseDossier}
                  className="font-bold uppercase tracking-wider text-primary hover:text-white transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  Clear Filter
                </button>
              </div>
            )}
          </div>

          {/* Section Header */}
          {!loading && processedBoons.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-md text-[24px] font-bold text-on-surface">Active Debts</h2>
              <span className="text-[12px] font-bold text-on-surface-variant">Showing {processedBoons.length} entries</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && processedBoons.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-[80px] text-on-surface-variant/20 mb-6">balance</span>
              <h3 className="font-headline-md text-[24px] text-on-surface-variant mb-2">The registry is silent</h3>
              <p className="text-on-surface-variant/60 text-sm md:text-base">
                {searchQuery 
                  ? 'No boons match your search criteria.'
                  : filterActive
                    ? (isAdmin ? 'No NPC records found.' : 'No personal boons on record.')
                    : 'No debts of blood currently remain unrecorded.'}
              </p>
            </div>
          )}

          {/* Boon List */}
          <div className="space-y-3 mb-12">
            {processedBoons.map(boon => {
              const statusStr = String(boon.status).toLowerCase();
              const settled = statusStr === 'paid' || statusStr === 'excused';
              const levelStyle = getBoonColorClasses(String(boon.level).toLowerCase());
              
              const borderClass = `border-l-4 ${levelStyle.bgSolid.replace('bg-', 'border-')}`;
              const glowClass = (String(boon.level).toLowerCase() === 'life' && !settled) ? 'shadow-[0_4px_12px_rgba(74,4,4,0.4)]' : '';
              
              return (
                <motion.div 
                  key={boon.id} 
                  className={`bg-surface-container p-4 rounded-xl gothic-etched-border ${borderClass} ${glowClass} relative overflow-hidden ${settled ? 'opacity-60' : ''}`}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  viewport={{ once: false, amount: 0.1 }}
                >
                  
                  {settled && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <span className="paid-stamp text-5xl font-black">{boon.status}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className={`${levelStyle.bgLight} ${levelStyle.text} text-[10px] font-bold px-2 py-0.5 rounded tracking-widest uppercase`}>
                      {LEVEL_LABELS[String(boon.level).toLowerCase()]} Boon
                    </span>
                    <div className="flex items-center gap-2">
                      {canManage && (
                        <div className="flex gap-2 mr-2 border-r border-outline-variant/20 pr-2">
                          <button onClick={() => openEdit(boon)} className="material-symbols-outlined text-[16px] text-on-surface-variant hover:text-primary transition-colors">edit</button>
                          <button onClick={() => handleDelete(boon.id)} className="material-symbols-outlined text-[16px] text-on-surface-variant hover:text-error transition-colors" disabled={deleteMutation.isPending}>delete</button>
                        </div>
                      )}
                      <span className="text-on-surface-variant text-[12px] font-bold">#{boon.id}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant text-sm font-bold shrink-0 bg-surface-container-highest overflow-hidden`}>
                      {getAvatarProps(boon.from_id, boon.from_name) ? (
                        <Avatar {...getAvatarProps(boon.from_id, boon.from_name)} size="100%" style={{ width: '100%', height: '100%' }} />
                      ) : getInitials(boon.from_name)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-bold text-on-surface-variant">Debtor</p>
                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant">arrow_forward</span>
                      </div>
                      <p 
                        className="text-[16px] font-bold text-on-surface cursor-pointer hover:text-primary transition-colors inline-block"
                        onClick={() => {
                          const clean = cleanPersonName(boon.from_name);
                          inspectPerson(clean);
                          setSelectedEntity(clean);
                        }}
                        title={`Filter all boons for ${cleanPersonName(boon.from_name)}`}
                      >
                        {boon.from_name}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-[12px] font-bold text-on-surface-variant">Creditor</p>
                      <p 
                        className={`text-[16px] font-bold ${levelStyle.text} cursor-pointer hover:brightness-125 transition-colors inline-block`}
                        onClick={() => {
                          const clean = cleanPersonName(boon.to_name);
                          inspectPerson(clean);
                          setSelectedEntity(clean);
                        }}
                        title={`Filter all boons for ${cleanPersonName(boon.to_name)}`}
                      >
                        {boon.to_name}
                      </p>
                    </div>
                    
                    <div className={`w-10 h-10 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant text-sm font-bold shrink-0 bg-surface-container-highest overflow-hidden`}>
                      {getAvatarProps(boon.to_id, boon.to_name) ? (
                        <Avatar {...getAvatarProps(boon.to_id, boon.to_name)} size="100%" style={{ width: '100%', height: '100%' }} />
                      ) : getInitials(boon.to_name)}
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-outline-variant/10 flex justify-between items-start md:items-center flex-col md:flex-row gap-2 relative z-10">
                    <div className="flex items-center gap-2">
                      {!settled ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                          <span className="text-[12px] font-bold text-on-surface uppercase">Active</span>
                        </>
                      ) : (
                        <span className="bg-surface-variant px-2 py-0.5 text-[10px] text-on-surface uppercase rounded font-bold">
                          {boon.status}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="text-[12px] font-bold text-on-surface-variant text-right">
                        <span className="hidden md:inline">Desc: </span>
                        {boon.description || 'No details provided'}
                      </p>
                      <p className="text-[10px] text-on-surface-variant/70 mt-1 text-right">
                        Rec: {relDate(boon.created_at)} {settled && boon.updated_at ? ` | Set: ${relDate(boon.updated_at)}` : ''}
                      </p>
                    </div>
                  </div>
                  
                </motion.div>
              );
            })}
          </div>

          {/* Legend Section (Collapsible) */}
          <div className="mt-12 mb-8">
            <button 
              className="w-full bg-surface-container-high p-4 rounded-xl flex items-center justify-between border border-outline-variant/10" 
              onClick={() => setLegendOpen(!legendOpen)}
            >
              <span className="font-headline-md text-[24px] font-bold text-on-surface">Registry Legend</span>
              <span className={`material-symbols-outlined transition-transform duration-300 ${legendOpen ? 'rotate-180' : 'rotate-0'}`}>expand_more</span>
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 bg-surface-container-low border-x border-b border-outline-variant/10 rounded-b-xl space-y-4 ${legendOpen ? 'max-h-[1000px] p-4 border-t-0' : 'max-h-0 p-0 border-transparent opacity-0'}`}>
              <div className="flex gap-4">
                <div className="w-1 h-12 bg-primary-container rounded"></div>
                <div>
                  <p className="text-[16px] font-bold text-primary-container">Life Boon</p>
                  <p className="text-[14px] text-on-surface-variant">The debtor owes their very existence to the creditor. Cannot be transferred.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1 h-12 bg-tertiary rounded"></div>
                <div>
                  <p className="text-[16px] font-bold text-tertiary">Major Boon</p>
                  <p className="text-[14px] text-on-surface-variant">Involves territory, significant status, or survival of progeny.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1 h-12 bg-blue-500 rounded"></div>
                <div>
                  <p className="text-[16px] font-bold text-blue-400">Minor Boon</p>
                  <p className="text-[14px] text-on-surface-variant">Significant effort required. Access to territory, physical protection, or political influence.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1 h-12 bg-on-surface-variant rounded"></div>
                <div>
                  <p className="text-[16px] font-bold text-on-surface-variant">Trivial Boon</p>
                  <p className="text-[14px] text-on-surface-variant">Minor favors, small pieces of information, or temporary shelter. Rarely lasts beyond a month.</p>
                </div>
              </div>
              <div className="pt-4 border-t border-outline-variant/10">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-primary rounded-full animate-pulse"></span>
                  <p className="text-[12px] text-on-surface uppercase font-bold">Active</p>
                </div>
                <p className="text-[14px] text-on-surface-variant mt-1">Boon is actively owed and has not been settled or excused.</p>
              </div>
            </div>
          </div>

        </main>
      </Skeleton>
    </div>
  );
}

/* ══════════════════════════════════════════════
   BOON FORM
══════════════════════════════════════════════ */
function BoonForm({ entities, boon, onSave, onCancel }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    from_key: 'npc', from_id: '', from_name: '',
    to_key:   'npc', to_id:   '', to_name: '',
    level: 'trivial', status: 'owed', description: '',
  });
  
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (boon) {
        await api.patch(`/boons/${boon.id}`, payload);
      } else {
        await api.post('/boons', payload);
      }
    },
    onSuccess: () => {
      toast.success(boon ? 'Boon updated' : 'Boon created');
      queryClient.invalidateQueries({ queryKey: ['boons'] });
      onSave();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save boon');
    }
  });

  const entityOptions = useMemo(() => [
    { id: 'npc', name: 'NPC or Manual Entry' },
    ...entities.map(e => ({ id: `${e.type}-${e.id}`, name: e.name })),
  ], [entities]);

  useEffect(() => {
    const deriveKey = (id, name) => {
      if (!id) return 'npc';
      const byId = entities.find(e => String(e.id) === String(id));
      if (byId) return `${byId.type}-${byId.id}`;
      const base  = (name || '').split(' (')[0].trim();
      const byName = entities.find(e => (e.name || '').split(' (')[0].trim() === base);
      return byName ? `${byName.type}-${byName.id}` : 'npc';
    };

    if (boon) {
      setFormData({
        from_key: deriveKey(boon.from_id, boon.from_name), from_id: boon.from_id || '', from_name: boon.from_name || '',
        to_key:   deriveKey(boon.to_id,   boon.to_name),   to_id:   boon.to_id   || '', to_name:   boon.to_name   || '',
        level: String(boon.level || 'trivial').toLowerCase(), status: String(boon.status || 'owed').toLowerCase(), description: boon.description || '',
      });
    } else {
      setFormData({ from_key: 'npc', from_id: '', from_name: '', to_key: 'npc', to_id: '', to_name: '', level: 'trivial', status: 'owed', description: '' });
    }
  }, [boon, entities]);

  const handleEntityChange = (e, prefix) => {
    const val = e.target.value;
    const opt = entityOptions.find(o => o.id === val);
    if (!opt) return;
    if (opt.id === 'npc') {
      setFormData(p => ({ ...p, [`${prefix}_key`]: 'npc', [`${prefix}_id`]: '' }));
      return;
    }
    const id = opt.id.split('-')[1];
    setFormData(p => ({ ...p, [`${prefix}_key`]: opt.id, [`${prefix}_id`]: id, [`${prefix}_name`]: opt.name.split(' (')[0] }));
  };

  const handleNameChange = (e, prefix) =>
    setFormData(p => ({ ...p, [`${prefix}_name`]: e.target.value, [`${prefix}_id`]: '', [`${prefix}_key`]: 'npc' }));

  const handleChange = e =>
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.from_name || !formData.to_name) { 
      toast.error('"From" and "To" names are required.'); 
      return; 
    }
    const payload = {
      from_id: formData.from_id || null, from_name: formData.from_name,
      to_id:   formData.to_id   || null, to_name:   formData.to_name,
      level: formData.level, status: formData.status, description: formData.description,
    };
    saveMutation.mutate(payload);
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-outline-variant/10">
        <h3 className="font-headline-md text-[24px] font-bold text-on-surface">{boon ? 'Edit record' : 'Record new boon'}</h3>
        <button className="text-on-surface-variant hover:text-on-surface transition-colors p-1" onClick={onCancel}><span className="material-symbols-outlined">close</span></button>
      </div>

      <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1">
        <form id="boonForm" onSubmit={handleSubmit} className="space-y-5">
          
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">Debtor <span className="lowercase font-normal opacity-70">(owes the boon)</span></label>
            <select className="w-full bg-surface-container-lowest gothic-etched-border rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface" value={formData.from_key} onChange={e => handleEntityChange(e, 'from')} disabled={saveMutation.isPending}>
              {entityOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {formData.from_key === 'npc' && (
              <input className="w-full bg-surface-container-lowest gothic-etched-border rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface mt-2" type="text" placeholder="Enter custom name…" value={formData.from_name} onChange={e => handleNameChange(e, 'from')} disabled={saveMutation.isPending}/>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">Creditor <span className="lowercase font-normal opacity-70">(holds the boon)</span></label>
            <select className="w-full bg-surface-container-lowest gothic-etched-border rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface" value={formData.to_key} onChange={e => handleEntityChange(e, 'to')} disabled={saveMutation.isPending}>
              {entityOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {formData.to_key === 'npc' && (
              <input className="w-full bg-surface-container-lowest gothic-etched-border rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface mt-2" type="text" placeholder="Enter custom name…" value={formData.to_name} onChange={e => handleNameChange(e, 'to')} disabled={saveMutation.isPending}/>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="level">Level</label>
              <select className="w-full bg-surface-container-lowest gothic-etched-border rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface" id="level" name="level" value={formData.level} onChange={handleChange} disabled={saveMutation.isPending}>
                {BOON_LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="status">Status</label>
              <select className="w-full bg-surface-container-lowest gothic-etched-border rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface" id="status" name="status" value={formData.status} onChange={handleChange} disabled={saveMutation.isPending}>
                {BOON_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="description">Description</label>
            <textarea className="w-full bg-surface-container-lowest gothic-etched-border rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface resize-y" id="description" name="description" value={formData.description} onChange={handleChange} rows={4} placeholder="Detailed circumstances..." disabled={saveMutation.isPending} />
          </div>

        </form>
      </div>

      <div className="p-4 md:p-6 border-t border-outline-variant/10 bg-surface-container flex justify-end gap-3 shrink-0">
        <button type="button" className="px-4 py-2 font-bold text-sm tracking-widest uppercase text-on-surface-variant hover:text-on-surface transition-colors" onClick={onCancel} disabled={saveMutation.isPending}>Cancel</button>
        <button type="submit" form="boonForm" className="bg-primary-container text-on-primary-container font-bold text-sm tracking-widest uppercase px-6 py-2 rounded shadow-lg hover:brightness-110 active:scale-95 transition-all" disabled={saveMutation.isPending} style={{opacity: saveMutation.isPending ? 0.7 : 1}}>
          {saveMutation.isPending ? 'Saving...' : 'Save Record'}
        </button>
      </div>
    </>
  );
}