// src/pages/Boons.jsx
import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import api from '../core/api';
import { AuthCtx } from '../core/AuthContext';
import { Skeleton } from 'boneyard-js/react';
import MiniSearch from 'minisearch';

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

/* ── Legend data ────────────────────────────── */
const LEGEND = [
  {
    level: 'trivial', title: 'Trivial Boon', colorClass: 'bg-on-surface-variant',
    body: 'Minor favors, small pieces of information, or temporary shelter. Rarely lasts beyond a month.',
  },
  {
    level: 'minor', title: 'Minor Boon', colorClass: 'bg-blue-500',
    body: 'Significant effort required. Access to territory, physical protection, or political influence.',
  },
  {
    level: 'major', title: 'Major Boon', colorClass: 'bg-tertiary',
    body: 'Life-altering favors. Protecting one from destruction, or gifting permanent domain/resources.',
  },
  {
    level: 'life', title: 'Life Boon', colorClass: 'bg-primary-container',
    body: 'The ultimate debt. Owed when a Kindred spares another\'s life or prevents Final Death.',
  },
];

export default function Boons() {
  const { user } = useContext(AuthCtx);
  const [boons, setBoons]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [myCharacter, setMyCharacter] = useState(null);
  const [entities, setEntities]       = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  
  // Filters & Search
  const [sortMode, setSortMode]       = useState('date');
  const [filterActive, setFilterActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [legendOpen, setLegendOpen]   = useState(false);
  const searchRef = useRef(null);
  const toolbarRef = useRef(null);
  const [toolbarVisible, setToolbarVisible] = useState(false);

  const isAdmin  = user?.role === 'admin' || user?.permission_level === 'admin';
  const isCourt  = user?.role === 'courtuser';
  const canManage = isAdmin || isCourt;

  async function loadBoons() {
    try {
      setLoading(true); setError('');
      const { data } = await api.get('/boons');
      setBoons(data.boons || []);
    } catch (e) { setError(e.response?.data?.error || 'Failed to fetch boons'); }
    finally { setLoading(false); }
  }

  async function loadEntities() {
    if (!canManage) return;
    try { const { data } = await api.get('/boons/entities'); setEntities(data.entities || []); }
    catch (e) { console.error('Failed to load entities', e); }
  }

  async function loadMyCharacter() {
    try { const { data } = await api.get('/characters/me'); setMyCharacter(data.character || null); }
    catch (e) { console.warn('No character found'); }
  }

  useEffect(() => {
    loadBoons(); loadMyCharacter(); loadEntities();
  }, [canManage]);

  // Click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const processedBoons = useMemo(() => {
    let result = [...boons];
    
    // Ownership Filter
    if (filterActive && user) {
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
        if (user.display_name)  myNames.push(user.display_name.toLowerCase());
        if (myCharacter?.name)  myNames.push(myCharacter.name.toLowerCase());
        result = result.filter(b => {
          const from = (b.from_name || '').toLowerCase();
          const to   = (b.to_name   || '').toLowerCase();
          return myNames.some(n => from.includes(n) || to.includes(n));
        });
      }
    }

    // Search Query Filter
    if (searchQuery) {
      const sq = searchQuery.trim();
      const ms = new MiniSearch({ fields: ['from_name', 'to_name', 'description'], searchOptions: { fuzzy: 0.2, prefix: true, combineWith: 'AND' } });
      ms.addAll(result);
      const results = ms.search(sq);
      const idSet = new Set(results.map(r => r.id));
      result = result.filter(b => idSet.has(b.id));
    }

    // Sorting
    const levelRank  = { life: 4, major: 3, minor: 2, trivial: 1 };
    const statusRank = { owed: 1, paid: 2, excused: 3 };
    switch (sortMode) {
      case 'level':
        result.sort((a, b) => (levelRank[b.level] || 0) - (levelRank[a.level] || 0) || new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'status':
        result.sort((a, b) => (statusRank[a.status] || 0) - (statusRank[b.status] || 0) || new Date(b.created_at) - new Date(a.created_at));
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
  }, [boons, sortMode, filterActive, user, myCharacter, isAdmin, entities, searchQuery]);

  const stats = useMemo(() => ({
    total:   processedBoons.length,
    active:  processedBoons.filter(b => String(b.status).toLowerCase() === 'owed').length,
    life:    processedBoons.filter(b => String(b.level).toLowerCase()  === 'life'  && String(b.status).toLowerCase() === 'owed').length,
    major:   processedBoons.filter(b => String(b.level).toLowerCase()  === 'major' && String(b.status).toLowerCase() === 'owed').length,
  }), [processedBoons]);

  const handleSave   = async () => { await loadBoons(); setShowForm(false); setEditTarget(null); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try { await api.delete(`/boons/${id}`); await loadBoons(); }
    catch (e) { setError(e.response?.data?.error || 'Failed to delete'); }
  };
  const openEdit   = (b) => { setEditTarget(b); setShowForm(true); };
  const openCreate = ()  => { setEditTarget(null); setShowForm(true); };
  const closeForm  = ()  => { setShowForm(false); setEditTarget(null); };

  const filterLabel = isAdmin
    ? (filterActive ? 'All boons' : 'NPC records')
    : (filterActive ? 'All boons' : 'My boons');

  // Helper for card styling
  const getBoonColorClasses = (level) => {
    switch (level) {
      case 'life': return { border: 'border-primary', text: 'text-primary', bg: 'bg-primary/20', glow: 'shadow-[0_4px_12px_rgba(74,4,4,0.4)]' };
      case 'major': return { border: 'border-tertiary', text: 'text-tertiary', bg: 'bg-tertiary/20', glow: '' };
      case 'minor': return { border: 'border-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/20', glow: '' };
      default: return { border: 'border-on-surface-variant', text: 'text-on-surface-variant', bg: 'bg-surface-variant', glow: '' };
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen selection:bg-primary/30 font-body-md">
      
      {/* ── Slide-in form sheet ── */}
      {showForm && canManage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeForm}>
          <div className="bg-surface-container-high border border-outline-variant/20 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <BoonForm entities={entities} boon={editTarget} onSave={handleSave} onCancel={closeForm} />
          </div>
        </div>
      )}

      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-40 bg-surface-container-highest border-b border-outline-variant/10 h-16 flex items-center justify-between px-4 lg:px-8">
        <h1 className="font-headline-md text-[20px] lg:text-[24px] font-bold text-primary">Blood Registry</h1>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant active:opacity-80 transition-colors flex lg:hidden" onClick={() => setToolbarVisible(v => !v)}>
            <span className="material-symbols-outlined">search</span>
          </button>
          {canManage && (
            <button onClick={openCreate} className="bg-primary-container text-on-primary-container font-label-md px-3 py-1.5 rounded shadow-lg hover:brightness-110 active:scale-95 transition-transform flex items-center gap-2 tracking-widest uppercase">
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="hidden sm:inline">Record Boon</span>
              <span className="sm:hidden">Record</span>
            </button>
          )}
        </div>
      </header>

      {/* Expandable Search Toolbar (Mobile) */}
      <div 
        className={`fixed top-16 w-full bg-surface-container-high border-b border-outline-variant/10 z-30 transition-all duration-300 transform lg:hidden ${toolbarVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`} 
      >
        <div className="p-4 space-y-4">
          <div className="flex bg-surface-container-lowest rounded-lg border border-outline-variant/20 p-2 relative" ref={searchRef}>
            <span className="material-symbols-outlined text-on-surface-variant mr-2">search</span>
            <input 
              className="bg-transparent border-none focus:ring-0 text-body-md w-full outline-none" 
              placeholder="Search lineages..." 
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && filteredNames.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-surface-container-high border border-outline-variant/20 rounded shadow-xl mt-1 max-h-48 overflow-y-auto z-50">
                {filteredNames.map(name => (
                  <div key={name} className="px-4 py-2 hover:bg-surface-variant cursor-pointer text-sm" onClick={() => { setSearchQuery(name); setShowSuggestions(false); setToolbarVisible(false); }}>
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-between items-center gap-2">
             <button
                className={`px-3 py-1 rounded-full text-[12px] font-bold whitespace-nowrap border ${filterActive ? 'bg-primary-container text-on-primary-container border-primary-container' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30'}`}
                onClick={() => setFilterActive(f => !f)}
              >
                {filterLabel}
              </button>
              <select className="bg-surface-container-lowest border border-outline-variant/30 rounded px-2 py-1 text-[12px] text-on-surface-variant focus:outline-none" value={sortMode} onChange={e => setSortMode(e.target.value)}>
                <option value="date">Newest</option>
                <option value="level">Highest Value</option>
                <option value="status">Active First</option>
                <option value="from">Debtor A-Z</option>
                <option value="to">Creditor A-Z</option>
              </select>
          </div>
        </div>
      </div>

      <Skeleton loading={loading} name="boons-page">
        <main className="pt-20 pb-32 px-4 lg:px-8 max-w-[1200px] mx-auto">
          
          {error && <div className="bg-error-container text-on-error px-4 py-3 rounded mb-6 text-sm">{error}</div>}

          {/* Stats Bar */}
          {!loading && (
            <div className="flex gap-4 overflow-x-auto custom-scrollbar py-4 -mx-4 px-4 lg:mx-0 lg:px-0 mb-2">
              <div className="flex-shrink-0 min-w-[140px] bg-surface-container p-4 rounded-xl border border-outline-variant/10 shadow-md">
                <p className="text-[11px] text-on-surface-variant uppercase tracking-widest mb-1">Total Owed</p>
                <h3 className="text-[28px] font-bold text-on-surface">{stats.total}</h3>
              </div>
              <div className="flex-shrink-0 min-w-[140px] bg-surface-container p-4 rounded-xl border border-outline-variant/10 shadow-md">
                <p className="text-[11px] text-on-surface-variant uppercase tracking-widest mb-1">Active</p>
                <h3 className="text-[28px] font-bold text-primary">{stats.active}</h3>
              </div>
              <div className="flex-shrink-0 min-w-[140px] bg-surface-container p-4 rounded-xl border border-outline-variant/10 shadow-md">
                <p className="text-[11px] text-on-surface-variant uppercase tracking-widest mb-1">Major Owed</p>
                <h3 className="text-[28px] font-bold text-tertiary">{stats.major}</h3>
              </div>
              <div className="flex-shrink-0 min-w-[140px] bg-surface-container p-4 rounded-xl border border-outline-variant/10 shadow-md">
                <p className="text-[11px] text-on-surface-variant uppercase tracking-widest mb-1">Life Owed</p>
                <h3 className="text-[28px] font-bold text-primary-container">{stats.life}</h3>
              </div>
            </div>
          )}

          {/* Desktop Search & Filter */}
          <div className="hidden lg:flex items-center justify-between gap-4 mb-8 bg-surface-container p-4 rounded-xl border border-outline-variant/10">
            <div className="relative flex-1 max-w-md" ref={searchRef}>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input 
                type="text" 
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded focus:border-primary px-10 py-2 text-sm outline-none text-on-surface"
                placeholder="Search kindred or circumstances..." 
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && filteredNames.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-surface-container-high border border-outline-variant/20 rounded shadow-xl mt-1 max-h-64 overflow-y-auto z-50">
                  {filteredNames.map(name => (
                    <div key={name} className="px-4 py-2 hover:bg-surface-variant cursor-pointer text-sm" onClick={() => { setSearchQuery(name); setShowSuggestions(false); }}>
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                className={`px-4 py-2 rounded text-[12px] font-bold uppercase tracking-widest border transition-colors ${filterActive ? 'bg-primary-container text-on-primary-container border-primary-container' : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30 hover:text-on-surface'}`}
                onClick={() => setFilterActive(f => !f)}
              >
                {filterLabel}
              </button>
              <select className="bg-surface-container-lowest border border-outline-variant/30 rounded text-[12px] font-bold uppercase tracking-widest px-4 py-2 outline-none text-on-surface-variant cursor-pointer hover:border-outline-variant/60" value={sortMode} onChange={e => setSortMode(e.target.value)}>
                <option value="date">Newest</option>
                <option value="level">Highest Value</option>
                <option value="status">Active First</option>
                <option value="from">Debtor A-Z</option>
                <option value="to">Creditor A-Z</option>
              </select>
            </div>
          </div>

          {/* Section Header */}
          <div className="flex items-center justify-between mb-4 mt-6 lg:mt-0">
            <h2 className="font-headline-md text-[20px] text-on-surface">Registry Entries</h2>
            <span className="text-[12px] text-on-surface-variant">Showing {processedBoons.length} entries</span>
          </div>

          {/* Empty State */}
          {!loading && processedBoons.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-outline-variant/30 rounded-xl bg-surface-container-lowest/50">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-4">balance</span>
              <h3 className="font-headline-md text-[20px] text-on-surface-variant mb-2">The registry is silent</h3>
              <p className="text-on-surface-variant/60 text-sm">
                {searchQuery 
                  ? 'No boons match your search criteria.'
                  : filterActive
                    ? (isAdmin ? 'No NPC records found.' : 'No personal boons on record.')
                    : 'No debts recorded in the registry.'}
              </p>
            </div>
          )}

          {/* Boon List */}
          <div className="space-y-4">
            {processedBoons.map(boon => {
              const settled = boon.status === 'paid' || boon.status === 'excused';
              const levelStyle = getBoonColorClasses(String(boon.level).toLowerCase());
              
              return (
                <div key={boon.id} className={`bg-surface-container p-4 md:p-5 rounded-xl border border-outline-variant/10 border-l-4 ${levelStyle.border} ${levelStyle.glow} relative overflow-hidden transition-colors hover:bg-surface-variant/20 ${settled ? 'opacity-60' : ''}`}>
                  
                  {settled && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                      <span className="text-5xl md:text-7xl font-black uppercase font-headline-md tracking-[0.2em] -rotate-12 opacity-[0.03] text-on-surface select-none">
                        {boon.status}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <span className={`${levelStyle.bg} ${levelStyle.text} text-[10px] font-bold px-2.5 py-1 rounded tracking-[0.1em] uppercase border border-current/20`}>
                      {LEVEL_LABELS[String(boon.level).toLowerCase()] || boon.level} Boon
                    </span>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-on-surface-variant font-label-md">#{boon.id}</span>
                      {canManage && (
                        <div className="flex gap-1 ml-2">
                          <button className="text-on-surface-variant hover:text-primary transition-colors p-1" onClick={() => openEdit(boon)} title="Edit"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                          <button className="text-on-surface-variant hover:text-error transition-colors p-1" onClick={() => handleDelete(boon.id)} title="Delete"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-4 relative z-10">
                    
                    {/* Parties */}
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 flex-1">
                      
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-outline-variant/30 bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-bold text-sm shrink-0">
                          {getInitials(boon.from_name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Debtor</p>
                          </div>
                          <p className="font-bold text-on-surface text-sm md:text-base leading-tight">{boon.from_name}</p>
                        </div>
                      </div>
                      
                      <span className="material-symbols-outlined text-[20px] text-on-surface-variant/40 hidden md:block">arrow_forward</span>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-outline-variant/30 bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-bold text-sm shrink-0">
                          {getInitials(boon.to_name)}
                        </div>
                        <div>
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-0.5 text-right md:text-left">Creditor</p>
                          <p className={`font-bold text-sm md:text-base leading-tight ${levelStyle.text}`}>{boon.to_name}</p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Description & Status Footer */}
                  <div className="mt-4 pt-4 border-t border-outline-variant/10 flex flex-col md:flex-row md:justify-between md:items-start gap-3 relative z-10">
                    <div className="flex items-center gap-2 shrink-0">
                      {!settled && <span className="w-2 h-2 rounded-full bg-primary pulsing-eye"></span>}
                      <span className={`text-[11px] uppercase font-bold tracking-wider ${settled ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                        {STATUS_LABELS[String(boon.status).toLowerCase()] || boon.status}
                      </span>
                      <span className="text-on-surface-variant/40 mx-1">•</span>
                      <span className="text-[11px] text-on-surface-variant uppercase tracking-wider">{relDate(boon.created_at)}</span>
                    </div>
                    {boon.description && (
                      <p className="text-sm text-on-surface-variant italic md:text-right max-w-2xl leading-relaxed">
                        {boon.description}
                      </p>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

          {/* Legend Section */}
          <div className="mt-12 mb-8">
            <button 
              className="w-full bg-surface-container-high p-4 rounded-xl flex items-center justify-between border border-outline-variant/10 hover:bg-surface-variant/30 transition-colors"
              onClick={() => setLegendOpen(!legendOpen)}
            >
              <span className="font-headline-md text-[18px] text-on-surface flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">balance</span>
                Registry Legend
              </span>
              <span className={`material-symbols-outlined transition-transform duration-300 ${legendOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${legendOpen ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
              <div className="bg-surface-container-low border border-outline-variant/10 p-5 md:p-6 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {LEGEND.map(item => (
                  <div key={item.level} className="flex gap-4">
                    <div className={`w-1 shrink-0 bg-opacity-80 rounded-full ${item.colorClass}`}></div>
                    <div>
                      <p className={`font-bold text-sm mb-1 ${item.colorClass.replace('bg-', 'text-')}`}>{item.title}</p>
                      <p className="text-[13px] text-on-surface-variant leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                ))}
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
  const [prevBoon, setPrevBoon] = useState(boon);
  const [formData, setFormData] = useState({
    from_key: 'npc', from_id: '', from_name: '',
    to_key:   'npc', to_id:   '', to_name: '',
    level: 'trivial', status: 'owed', description: '',
  });
  const [error, setError] = useState('');

  const entityOptions = useMemo(() => [
    { id: 'npc', name: '— NPC / Manual entry —' },
    ...entities.map(e => ({ id: `${e.type}-${e.id}`, name: e.name })),
  ], [entities]);

  const deriveKey = (id, name) => {
    if (!id) return 'npc';
    const byId = entities.find(e => String(e.id) === String(id));
    if (byId) return `${byId.type}-${byId.id}`;
    const base  = (name || '').split(' (')[0].trim();
    const byName = entities.find(e => (e.name || '').split(' (')[0].trim() === base);
    return byName ? `${byName.type}-${byName.id}` : 'npc';
  };

  if (boon !== prevBoon) {
    setPrevBoon(boon);
    if (boon) {
      setFormData({
        from_key: deriveKey(boon.from_id, boon.from_name), from_id: boon.from_id || '', from_name: boon.from_name || '',
        to_key:   deriveKey(boon.to_id,   boon.to_name),   to_id:   boon.to_id   || '', to_name:   boon.to_name   || '',
        level: boon.level || 'trivial', status: boon.status || 'owed', description: boon.description || '',
      });
    } else {
      setFormData({ from_key: 'npc', from_id: '', from_name: '', to_key: 'npc', to_id: '', to_name: '', level: 'trivial', status: 'owed', description: '' });
    }
  }

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
    e.preventDefault(); setError('');
    if (!formData.from_name || !formData.to_name) { setError('"From" and "To" names are required.'); return; }
    const payload = {
      from_id: formData.from_id || null, from_name: formData.from_name,
      to_id:   formData.to_id   || null, to_name:   formData.to_name,
      level: formData.level, status: formData.status, description: formData.description,
    };
    try {
      if (boon) await api.patch(`/boons/${boon.id}`, payload);
      else      await api.post('/boons', payload);
      onSave();
    } catch (err) { setError(err.response?.data?.error || 'Failed to save boon'); }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-outline-variant/10">
        <h3 className="font-headline-md text-[20px] font-bold text-on-surface">{boon ? 'Edit record' : 'Record new boon'}</h3>
        <button className="text-on-surface-variant hover:text-on-surface transition-colors p-1" onClick={onCancel}><span className="material-symbols-outlined">close</span></button>
      </div>

      <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1">
        {error && <div className="bg-error-container text-on-error px-4 py-3 rounded mb-4 text-sm">{error}</div>}

        <form id="boonForm" onSubmit={handleSubmit} className="space-y-5">
          
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">Debtor <span className="lowercase font-normal opacity-70">(owes the boon)</span></label>
            <select className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface" value={formData.from_key} onChange={e => handleEntityChange(e, 'from')}>
              {entityOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {formData.from_key === 'npc' && (
              <input className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface mt-2" type="text" placeholder="Enter custom name…" value={formData.from_name} onChange={e => handleNameChange(e, 'from')} />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">Creditor <span className="lowercase font-normal opacity-70">(holds the boon)</span></label>
            <select className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface" value={formData.to_key} onChange={e => handleEntityChange(e, 'to')}>
              {entityOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {formData.to_key === 'npc' && (
              <input className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface mt-2" type="text" placeholder="Enter custom name…" value={formData.to_name} onChange={e => handleNameChange(e, 'to')} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="level">Level</label>
              <select className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface" id="level" name="level" value={formData.level} onChange={handleChange}>
                {BOON_LEVELS.map(l => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="status">Status</label>
              <select className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface" id="status" name="status" value={formData.status} onChange={handleChange}>
                {BOON_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="description">Description</label>
            <textarea className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface resize-y" id="description" name="description" value={formData.description} onChange={handleChange} rows={4} placeholder="Detailed circumstances..." />
          </div>

        </form>
      </div>

      <div className="p-4 md:p-6 border-t border-outline-variant/10 bg-surface-container flex justify-end gap-3 shrink-0">
        <button type="button" className="px-4 py-2 font-bold text-sm tracking-widest uppercase text-on-surface-variant hover:text-on-surface transition-colors" onClick={onCancel}>Cancel</button>
        <button type="submit" form="boonForm" className="bg-primary-container text-on-primary-container font-bold text-sm tracking-widest uppercase px-6 py-2 rounded shadow-lg hover:brightness-110 active:scale-95 transition-all">
          Save Record
        </button>
      </div>
    </>
  );
}