import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import { AuthCtx } from '../../core/AuthContext';
import api from '../../core/api';
import { socket } from '../../api/liveSession';
import Avatar from '../../components/Avatar';
import { ReactionGlyph, clanToken, ALL_CREST_NAMES } from '../../components/ReactionGlyph';
import { symlogo as localSymlogo } from '../../data/clans';

const EmojiPicker = React.lazy(() => import('emoji-picker-react'));

const ANKH = '☥';

const customClanEmojis = ALL_CREST_NAMES.map(clan => ({
  id: clan.toLowerCase().replace(/[^a-z0-9]/g, '_'),
  names: [clan],
  imgUrl: localSymlogo(clan)
}));

const EMOJI_PICKER_CATEGORIES = [
  { category: 'suggested', name: 'Recently Used' },
  { category: 'custom', name: 'Clans' },
  { category: 'smileys_people', name: 'Smileys and People' },
  { category: 'animals_nature', name: 'Animals and Nature' },
  { category: 'food_drink', name: 'Food and Drink' },
  { category: 'travel_places', name: 'Travel and Places' },
  { category: 'activities', name: 'Activities' },
  { category: 'objects', name: 'Objects' },
  { category: 'symbols', name: 'Symbols' },
  { category: 'flags', name: 'Flags' }
];

export default function RumorReactions({ rumorId, initialReactions = null }) {
  const { user: currentUser } = useContext(AuthCtx);
  const isAdmin = currentUser?.role === 'admin';

  const [reactions, setReactions] = useState(initialReactions || []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const [viewingModal, setViewingModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [myChar, setMyChar] = useState(null);

  const pillHoldTimerRef = useRef(null);
  const pillHoldFiredRef = useRef(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (isAdmin || !currentUser) return;
    api.get('/characters/me').then(r => setMyChar(r.data.character)).catch(() => {});
  }, [isAdmin, currentUser]);

  const mySigil = useMemo(() => {
    if (isAdmin) return ANKH;
    const clan = myChar?.clan || myChar?.sheet?.clan;
    return clanToken(clan) || ANKH;
  }, [isAdmin, myChar]);

  const QUICK_REACTIONS = useMemo(() => [
    '🩸', '👑', '👍', '👏', '🙏', '🦇', mySigil
  ], [mySigil]);

  const fetchReactions = useCallback(async () => {
    if (!rumorId) return;
    try {
      const { data } = await api.get(`/rumors/${rumorId}/reactions`);
      setReactions(data.reactions || []);
    } catch (e) {
      // silent fail
    }
  }, [rumorId]);

  useEffect(() => {
    if (initialReactions) {
      setReactions(initialReactions);
    } else {
      fetchReactions();
    }
  }, [rumorId, initialReactions, fetchReactions]);

  useEffect(() => {
    const handleReaction = (payload) => {
      const targetId = payload?.rumorId || payload?.messageId || payload?.id;
      if (Number(targetId) === Number(rumorId)) {
        fetchReactions();
      }
    };
    socket.on('rumors:reactions', handleReaction);
    return () => {
      socket.off('rumors:reactions', handleReaction);
    };
  }, [rumorId, fetchReactions]);

  // Click outside to close picker
  useEffect(() => {
    if (!pickerOpen && !showFullEmojiPicker) return;
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
        setShowFullEmojiPicker(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [pickerOpen, showFullEmojiPicker]);

  const toggleReaction = async (emoji, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!currentUser || !rumorId) return;
    try {
      const { data } = await api.post(`/rumors/${rumorId}/reactions`, { emoji });
      setReactions(data.reactions || []);
    } catch (err) {
      // silent
    }
    setPickerOpen(false);
    setShowFullEmojiPicker(false);
  };

  const handlePillPointerDown = (emoji, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    pillHoldFiredRef.current = false;
    pillHoldTimerRef.current = setTimeout(() => {
      pillHoldFiredRef.current = true;
      setSelectedTab(emoji);
      setViewingModal(true);
    }, 450);
  };

  const handlePillPointerUp = (emoji, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    clearTimeout(pillHoldTimerRef.current);
    if (pillHoldFiredRef.current) {
      pillHoldFiredRef.current = false;
      return;
    }
    toggleReaction(emoji, e);
  };

  const handlePillPointerCancel = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    clearTimeout(pillHoldTimerRef.current);
    pillHoldFiredRef.current = false;
  };

  const onCustomEmojiClick = (emojiObject) => {
    const clanTag = emojiObject.isCustom && emojiObject.names && emojiObject.names[0]
      ? emojiObject.names[0].replace(/\s+/g, '_')
      : (emojiObject.unified || 'unknown');
    const token = emojiObject.isCustom ? `:${clanTag}:` : emojiObject.emoji;
    toggleReaction(token);
  };

  const totalCount = useMemo(() => {
    return (reactions || []).reduce((acc, r) => acc + (r.count || 0), 0);
  }, [reactions]);

  const filteredReactors = useMemo(() => {
    if (selectedTab === 'all') {
      return (reactions || []).flatMap(r => (r.reactors || []).map(u => ({ ...u, emoji: r.emoji })));
    }
    return ((reactions || []).find(r => r.emoji === selectedTab)?.reactors || []).map(u => ({ ...u, emoji: selectedTab }));
  }, [reactions, selectedTab]);

  return (
    <div
      className="relative flex flex-col gap-1.5 my-2 select-none no-print"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Reaction pills */}
        {reactions.map(r => {
          const isReactedByMe = (r.users || []).includes(currentUser?.id);
          const reactorNames = (r.reactors || []).map(u => u.name).filter(Boolean);
          const tooltip = reactorNames.length > 0
            ? `${reactorNames.join(', ')}: ${r.emoji}`
            : (isReactedByMe ? 'Remove reaction' : 'React');

          return (
            <button
              key={r.emoji}
              type="button"
              onPointerDown={(e) => handlePillPointerDown(r.emoji, e)}
              onPointerUp={(e) => handlePillPointerUp(r.emoji, e)}
              onPointerLeave={handlePillPointerCancel}
              onPointerCancel={handlePillPointerCancel}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedTab(r.emoji);
                setViewingModal(true);
              }}
              title={tooltip}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                isReactedByMe
                  ? 'bg-red-950/20 border-red-800 text-red-900 font-bold shadow-[0_0_6px_rgba(185,28,28,0.25)]'
                  : 'bg-stone-900/10 border-stone-800/30 text-stone-800 hover:border-stone-800/60 hover:bg-stone-900/20'
              }`}
            >
              <ReactionGlyph value={r.emoji} size={15} />
              <span className="font-system-code font-bold">{r.count}</span>
            </button>
          );
        })}

        {/* Add reaction trigger button */}
        {currentUser && (
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPickerOpen(prev => !prev);
                setShowFullEmojiPicker(false);
              }}
              className={`h-[26px] ${reactions.length === 0 ? 'px-2.5' : 'w-[38px]'} rounded-full border border-stone-800/30 bg-stone-900/10 text-stone-700 hover:text-stone-900 hover:border-stone-800/60 transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm`}
              title="Add reaction"
            >
              <span className="material-symbols-outlined text-[16px]">add_reaction</span>
              {reactions.length === 0 && (
                <span className="font-system-code text-[11px] font-bold">React</span>
              )}
            </button>

            {/* Quick reactions bar */}
            {pickerOpen && (
              <div
                className="absolute left-0 bottom-full mb-2 z-50 flex items-center gap-1 p-1.5 bg-surface-container-highest border border-outline-variant/60 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {QUICK_REACTIONS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={(ev) => toggleReaction(e, ev)}
                    className="p-1 hover:scale-125 transition-transform flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"
                  >
                    <ReactionGlyph value={e} size={18} />
                  </button>
                ))}
                <div className="w-px h-4 bg-outline-variant/40 mx-0.5" />
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setShowFullEmojiPicker(prev => !prev);
                  }}
                  className="p-1 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"
                  title="More reactions"
                >
                  <span className="material-symbols-outlined text-[18px]">mood</span>
                </button>
              </div>
            )}

            {/* Full Emoji Picker Popover */}
            {showFullEmojiPicker && (
              <div
                className="absolute left-0 bottom-full mb-2 z-50 shadow-[0_0_30px_rgba(0,0,0,0.9)] rounded-lg overflow-hidden border border-outline-variant"
                onClick={(e) => e.stopPropagation()}
              >
                <React.Suspense fallback={<div className="p-4 text-center text-xs text-on-surface-variant bg-surface-container">Loading reactions...</div>}>
                  <EmojiPicker
                    theme="dark"
                    onEmojiClick={onCustomEmojiClick}
                    customEmojis={customClanEmojis}
                    categories={EMOJI_PICKER_CATEGORIES}
                    width={320}
                    height={380}
                  />
                </React.Suspense>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View who reacted button underneath */}
      {totalCount > 0 && (
        <div className="flex items-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTab('all');
              setViewingModal(true);
            }}
            className="text-[11px] text-stone-700/80 hover:text-stone-950 transition-colors cursor-pointer font-system-code font-bold"
            title="Reactions"
          >
            Reactions
          </button>
        </div>
      )}

      {/* Rumor Reactions Modal */}
      {viewingModal && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none no-print"
          onClick={(e) => {
            e.stopPropagation();
            setViewingModal(false);
            setShowFullEmojiPicker(false);
          }}
        >
          <div
            className="bg-surface-container border border-outline-variant rounded-lg w-full max-w-md max-h-[85vh] flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.85)] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-outline-variant/40 shrink-0 bg-surface-container-high/60">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">add_reaction</span>
                <span>Rumor Reactions</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setViewingModal(false);
                  setShowFullEmojiPicker(false);
                }}
                className="text-on-surface-variant hover:text-white p-1 rounded transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Quick React Section */}
            {currentUser && (
              <div className="p-3 border-b border-outline-variant/30 bg-surface-container-highest/30 shrink-0 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-system-code uppercase tracking-wider text-on-surface-variant">
                    React to Rumor
                  </span>
                  <span className="text-[10px] text-on-surface-variant/70 font-system-code">
                    Click to toggle
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {QUICK_REACTIONS.map(emoji => {
                    const r = reactions.find(item => item.emoji === emoji);
                    const reactedByMe = (r?.users || []).includes(currentUser?.id);

                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(ev) => toggleReaction(emoji, ev)}
                        className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                          reactedByMe
                            ? 'bg-primary/25 border-primary shadow-[0_0_10px_rgba(255,179,174,0.3)] scale-105'
                            : 'bg-surface-container border-outline-variant/40 hover:border-primary/50 hover:bg-surface-container-high'
                        }`}
                        title={reactedByMe ? 'Remove reaction' : 'React with this glyph'}
                      >
                        <ReactionGlyph value={emoji} size={20} />
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setShowFullEmojiPicker(prev => !prev)}
                    className={`p-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                      showFullEmojiPicker
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container border-outline-variant/40 text-on-surface-variant hover:text-white hover:border-primary/50 hover:bg-surface-container-high'
                    }`}
                    title="More reactions"
                  >
                    <span className="material-symbols-outlined text-[20px]">mood</span>
                  </button>
                </div>

                {showFullEmojiPicker && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-outline-variant shadow-lg flex justify-center">
                    <React.Suspense fallback={<div className="p-4 text-center text-xs text-on-surface-variant">Loading picker...</div>}>
                      <EmojiPicker
                        theme="dark"
                        onEmojiClick={onCustomEmojiClick}
                        customEmojis={customClanEmojis}
                        categories={EMOJI_PICKER_CATEGORIES}
                        width="100%"
                        height={300}
                      />
                    </React.Suspense>
                  </div>
                )}
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-2.5 border-b border-outline-variant/30 overflow-x-auto custom-scrollbar shrink-0 bg-surface-container-high/40">
              <button
                type="button"
                onClick={() => setSelectedTab('all')}
                className={`px-2.5 py-1 rounded-full text-xs font-system-code transition-colors flex items-center gap-1.5 cursor-pointer ${
                  selectedTab === 'all'
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'bg-surface-container-highest text-on-surface-variant hover:text-white'
                }`}
              >
                <span>All</span>
                <span className="opacity-80">({totalCount})</span>
              </button>

              {reactions.map(r => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => setSelectedTab(r.emoji)}
                  className={`px-2.5 py-1 rounded-full text-xs font-system-code transition-colors flex items-center gap-1.5 cursor-pointer ${
                    selectedTab === r.emoji
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'bg-surface-container-highest text-on-surface-variant hover:text-white'
                  }`}
                >
                  <ReactionGlyph value={r.emoji} size={14} />
                  <span>{r.count}</span>
                </button>
              ))}
            </div>

            {/* Reactor list */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar min-h-[140px]">
              {filteredReactors.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant/60 text-xs font-system-code">
                  No reactions recorded yet
                </div>
              ) : (
                filteredReactors.map((u, idx) => (
                  <div
                    key={`${u.id}:${u.emoji}:${idx}`}
                    className="flex items-center justify-between p-2 rounded bg-surface-container-highest/40 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center overflow-hidden border border-outline-variant/30 shrink-0">
                        <Avatar userId={u.id} size="100%" style={{ width: '100%', height: '100%' }} fallback="/img/ATT-logo(1).webp" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">{u.name}</span>
                        {u.clan && (
                          <span className="text-[10px] text-primary/80 uppercase font-system-code truncate">{u.clan}</span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 pl-2">
                      <ReactionGlyph value={u.emoji} size={20} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
