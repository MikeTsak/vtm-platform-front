// src/features/live-session/LiveSessionCodexSidebar.jsx
// Universal Multi Sourcebook Codex & Rule Master AI Sidebar for Live Session ST Controls
import React, { useState, useMemo, useEffect, useRef } from 'react';
import MiniSearch from 'minisearch';
import ReactMarkdown from 'react-markdown';
import api from '../../core/api';
import { compileAllReferences } from '../../data/allReferences';
import { BOOKS, BOOK_BASE, parseSourceString, bookByName, bookUrl } from '../../data/books';
import { copyToClipboard } from '../../utils/clipboard';
import styles from '../../styles/LiveSessionCodexSidebar.module.css';

// Precompiled list of all sourcebook aliases sorted by longest length first
const CITATION_SOURCEBOOKS = BOOKS.flatMap(b => {
  const aliases = [b.label, ...(b.aliases || [])];
  if (b.label === 'Corebook') {
    aliases.push(
      'Vampire: The Masquerade 5th Edition Corebook',
      'Vampire the Masquerade 5th Edition Corebook',
      'V5 Corebook',
      'V5 Core Rulebook',
      'Core Rulebook'
    );
  }
  return aliases.map(name => ({ name, book: b }));
}).sort((a, b) => b.name.length - a.name.length);

const BOOK_PATTERN_STRING = CITATION_SOURCEBOOKS
  .map(item => item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

const CITATION_REGEX = new RegExp(
  `(\\[[^\\]]+\\]\\([^)]+\\))|((?:\\b(?:${BOOK_PATTERN_STRING})\\b)[^\\n\\r.,;()\\[\\]]*?(?:,|\\s)+(?:pp?\\.?|pages?|pg\\.)\\s*([0-9]+))`,
  'gi'
);

function linkifySourcebookCitations(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(CITATION_REGEX, (match, existingLink, citationStr, pageStr) => {
    if (existingLink) return existingLink;
    if (!citationStr || !pageStr) return match;

    const cleanBookName = citationStr
      .replace(/[,\s]*(?:pp?\.?|pages?|pg\.?)\s*[0-9]+.*$/i, '')
      .replace(/^vampire:\s*the\s*masquerade\s*(?:5th\s*edition\s*)?/i, '')
      .trim();

    const book = bookByName(cleanBookName) || bookByName(citationStr);
    if (!book) return match;

    const pageNum = parseInt(pageStr, 10);
    const url = bookUrl(book, pageNum);
    if (!url) return match;

    return `[${citationStr.trim()}](${url})`;
  });
}

const CATEGORIES = [
  { key: 'ALL', label: 'All' },
  { key: 'rules', label: 'Rules' },
  { key: 'powers', label: 'Powers' },
  { key: 'rituals', label: 'Rituals' },
  { key: 'merits', label: 'Merits, Flaws' },
  { key: 'sourcebooks', label: 'Sourcebooks' },
  { key: 'clans', label: 'Clans' }
];

const PRESET_QUERIES = [
  'Blood Surge',
  'Messy Critical',
  'Frenzy',
  'Humanity',
  'Remorse',
  'Rouse Check',
  'Torpor',
  'Diablerie'
];

export default function LiveSessionCodexSidebar() {
  const [activeMode, setActiveMode] = useState('index'); // 'index' or 'ai'
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [wikiArticles, setWikiArticles] = useState([]);

  // Rule Master AI state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [isDeepSearch, setIsDeepSearch] = useState(false);
  const [thinkingStage, setThinkingStage] = useState(0);
  const [copiedRuling, setCopiedRuling] = useState(false);
  const abortControllerRef = useRef(null);

  const STANDARD_STAGES = [
    'Awakening Rule Master arbiter...',
    'Consulting V5 sourcebooks, powers, and clan indexes...',
    'Synthesizing authoritative mechanics and exact citations...'
  ];

  const DEEP_SEARCH_STAGES = [
    'Phase 1 of 3: Analyzing ruling hypothesis and identifying target books...',
    'Phase 2 of 3: Scanning specific pages and extracting verbatim rule text...',
    'Phase 3 of 3: Verifying mechanics, resolving edge cases, and citing folios...'
  ];

  const currentStages = isDeepSearch ? DEEP_SEARCH_STAGES : STANDARD_STAGES;

  // Fetch optional LARP wiki articles
  useEffect(() => {
    let isMounted = true;
    api.get('/wiki/articles')
      .then((res) => {
        if (isMounted && res.data?.articles) {
          setWikiArticles(res.data.articles);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Thinking stage interval ticker
  useEffect(() => {
    if (!aiLoading) return;
    const interval = setInterval(() => {
      setThinkingStage((prev) => Math.min(prev + 1, currentStages.length - 1));
    }, isDeepSearch ? 2200 : 1600);
    return () => clearInterval(interval);
  }, [aiLoading, isDeepSearch, currentStages.length]);

  // Master V5 catalog compiler
  const allReferenceEntries = useMemo(() => {
    return compileAllReferences(wikiArticles);
  }, [wikiArticles]);

  // MiniSearch index
  const searchEngine = useMemo(() => {
    const ms = new MiniSearch({
      fields: ['title', 'content', 'category'],
      storeFields: [
        'id', 'title', 'content', 'category', 'cost', 'pool', 'source',
        'book', 'pdfPage', 'page', 'wikiSlug', 'wikiUrl', 'discipline',
        'clan', 'isSourcebookIndex'
      ],
      searchOptions: { fuzzy: 0.35, prefix: true }
    });
    ms.addAll(allReferenceEntries.map((item, idx) => ({ id: item.id || `ref_${idx}`, ...item })));
    return ms;
  }, [allReferenceEntries]);

  // Filtered search results
  const searchResults = useMemo(() => {
    const q = query.trim();
    let matches = [];

    if (q) {
      matches = searchEngine.search(q);
    } else {
      matches = allReferenceEntries.slice(0, 30);
    }

    if (categoryFilter === 'ALL') {
      return matches;
    }

    return matches.filter((item) => {
      const cat = (item.category || '').toLowerCase();
      if (categoryFilter === 'rules') return cat === 'rules';
      if (categoryFilter === 'powers') return cat === 'disciplines';
      if (categoryFilter === 'rituals') return cat === 'rituals' || cat === 'ceremonies';
      if (categoryFilter === 'merits') return cat === 'merits' || cat === 'flaws' || cat === 'ingrained flaws';
      if (categoryFilter === 'sourcebooks') return item.isSourcebookIndex || cat.endsWith('index');
      if (categoryFilter === 'clans') return cat === 'clans';
      return true;
    });
  }, [query, categoryFilter, searchEngine, allReferenceEntries]);

  const handleAskRuleMaster = async (questionToAsk) => {
    const q = (typeof questionToAsk === 'string' ? questionToAsk : aiQuestion).trim();
    if (!q || aiLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setAiLoading(true);
    setAiError(null);
    setCopiedRuling(false);
    setThinkingStage(0);

    try {
      const res = await api.post(
        '/wiki/rule-master/ask',
        {
          question: q,
          deepSearch: isDeepSearch,
          history: []
        },
        {
          signal: controller.signal
        }
      );

      if (res.data?.success) {
        setAiResponse(res.data);
      } else {
        setAiError(res.data?.error || 'Failed to get ruling from Rule Master');
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        setAiError('Research stopped by Storyteller');
      } else {
        setAiError(err.response?.data?.error || err.message || 'Error communicating with Rule Master AI');
      }
    } finally {
      setAiLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopRuleMaster = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAiLoading(false);
    setAiError('Research stopped by Storyteller');
  };

  const handleCopyRuling = (text) => {
    copyToClipboard(text);
    setCopiedRuling(true);
    setTimeout(() => setCopiedRuling(false), 2200);
  };

  const renderSourceLinks = (item) => {
    if (item.book && (item.pdfPage || item.page)) {
      const bookObj = bookByName(item.book);
      const url = bookObj ? bookUrl(bookObj, item.page) : `${BOOK_BASE}Vampire-the-Masquerade-1.pdf#page=${item.pdfPage || item.page}`;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.pdfSourceBtn}
          title={`Open ${item.book} PDF page ${item.page || item.pdfPage}`}
        >
          <span className="material-symbols-outlined text-[12px]">auto_stories</span>
          <span>{item.book} p. {item.page || item.pdfPage}</span>
        </a>
      );
    }

    if (item.source) {
      const segs = parseSourceString(item.source);
      if (segs.length > 0) {
        return (
          <div className={styles.sourceLinkGroup}>
            {segs.map((s, idx) => (
              s.url ? (
                <a
                  key={idx}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.pdfSourceBtn}
                  title={`Jump to ${s.raw}`}
                >
                  <span className="material-symbols-outlined text-[12px]">auto_stories</span>
                  <span>{s.raw}</span>
                </a>
              ) : (
                <span key={idx} className={styles.pdfSourceBtn} style={{ opacity: 0.7 }}>
                  <span>{s.raw}</span>
                </span>
              )
            ))}
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div className={styles.sidebarContainer}>
      {/* Top Header & Tab Switcher */}
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <span className="material-symbols-outlined text-[16px]">menu_book</span>
          <span>Codex</span>
        </div>

        <div className={styles.tabSwitcher} role="tablist" aria-label="Knowledge Mode">
          <button
            type="button"
            className={`${styles.tabBtn} ${activeMode === 'index' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveMode('index')}
            title="Browse multi sourcebook index and rules"
          >
            <span className="material-symbols-outlined text-[13px]">search</span>
            <span>Index</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeMode === 'ai' ? styles.tabBtnActiveAi : ''}`}
            onClick={() => setActiveMode('ai')}
            title="Consult Rule Master AI arbiter"
          >
            <span className="material-symbols-outlined text-[13px]">psychology</span>
            <span>Rule Master AI</span>
          </button>
        </div>
      </div>

      {/* MODE 1: INDEX SEARCH */}
      {activeMode === 'index' && (
        <>
          <div className={styles.searchControls}>
            <div className={styles.searchInputRow}>
              <span className="material-symbols-outlined text-[16px] text-primary">search</span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search rules, powers, merits, sourcebooks..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => setQuery('')}
                  title="Clear search"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className={styles.categoriesBar}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  className={`${styles.categoryChip} ${categoryFilter === cat.key ? styles.categoryChipActive : ''}`}
                  onClick={() => setCategoryFilter(cat.key)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className={styles.metaInfoRow}>
              <span>{categoryFilter === 'ALL' ? 'All categories' : categoryFilter}</span>
              <span className={styles.resultCount}>{searchResults.length} Matches</span>
            </div>
          </div>

          <div className={styles.resultsList}>
            {searchResults.length === 0 ? (
              <div className={styles.emptyState}>
                <span className="material-symbols-outlined text-[28px] opacity-40">find_in_page</span>
                <div>No matches found in V5 codex.</div>
                <div className="text-[11px] text-muted">Try looking up popular mechanics:</div>
                <div className={styles.emptyStateChips}>
                  {PRESET_QUERIES.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={styles.presetQueryChip}
                      onClick={() => setQuery(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              searchResults.map((item, idx) => (
                <div key={item.id || idx} className={styles.resultCard}>
                  <div className={styles.cardHeader}>
                    <h4 className={styles.cardTitle}>{item.title}</h4>
                    <div className={styles.badgeGroup}>
                      {item.cost && (
                        <span className={styles.costPill} title={`Cost or dots: ${item.cost}`}>
                          {item.cost}
                        </span>
                      )}
                      <span className={styles.categoryBadge}>{item.category}</span>
                    </div>
                  </div>

                  <p className={styles.cardContent}>{item.content}</p>

                  <div className={styles.cardFooter}>
                    {renderSourceLinks(item)}

                    {item.wikiUrl && (
                      <a
                        href={item.wikiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.wikiLinkBtn}
                        title="Open reference on Paradox Wiki"
                      >
                        <span className="material-symbols-outlined text-[14px]">public</span>
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* MODE 2: RULE MASTER AI (COMPACT LIVE SESSION ARBITER) */}
      {activeMode === 'ai' && (
        <div className={styles.aiSection}>
          <div className={styles.aiHeaderControls}>
            <div className={styles.aiModeGroup} role="group" aria-label="Arbiter Mode">
              <button
                type="button"
                className={`${styles.aiModeBtn} ${!isDeepSearch ? styles.aiModeActive : ''}`}
                onClick={() => setIsDeepSearch(false)}
                title="Fast response"
              >
                <span className="material-symbols-outlined text-[13px]">bolt</span>
                <span>Fast</span>
              </button>
              <button
                type="button"
                className={`${styles.aiModeBtn} ${isDeepSearch ? styles.aiModeDeepActive : ''}`}
                onClick={() => setIsDeepSearch(true)}
                title="Deep multi sourcebook verification"
              >
                <span className="material-symbols-outlined text-[13px]">travel_explore</span>
                <span>Deep Search</span>
              </button>
            </div>

            {aiResponse && !aiLoading && (
              <button
                type="button"
                className={styles.aiResetBtn}
                onClick={() => {
                  setAiResponse(null);
                  setAiQuestion('');
                  setAiError(null);
                }}
                title="Clear ruling"
              >
                <span className="material-symbols-outlined text-[13px]">restart_alt</span>
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className={styles.aiBody}>
            {aiLoading && (
              <div className={styles.aiThinkingBox}>
                <span className={`material-symbols-outlined ${styles.aiThinkingSpin}`}>sync</span>
                <div>
                  <div className="font-bold text-[11px]">Consulting Codex Archives</div>
                  <div className="opacity-80 text-[10px]">{currentStages[thinkingStage]}</div>
                </div>
              </div>
            )}

            {aiError && (
              <div className="p-2 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">error</span>
                <span>{aiError}</span>
              </div>
            )}

            {aiResponse && (
              <div className={styles.aiRulingCard}>
                <div className={styles.aiRulingHeader}>
                  <div className={styles.aiRulingTitle}>
                    <span className="material-symbols-outlined text-[14px]">gavel</span>
                    <span>Arbitration Ruling</span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.aiCopyBtn} ${copiedRuling ? styles.aiCopyBtnCopied : ''}`}
                    onClick={() => handleCopyRuling(aiResponse.answer)}
                    title="Copy ruling text"
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      {copiedRuling ? 'done' : 'content_copy'}
                    </span>
                    <span>{copiedRuling ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className={styles.aiRulingText}>
                  <ReactMarkdown
                    components={{
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      )
                    }}
                  >
                    {linkifySourcebookCitations(aiResponse.answer)}
                  </ReactMarkdown>
                </div>

                {aiResponse.citations && aiResponse.citations.length > 0 && (
                  <div className={styles.aiRulingCitations}>
                    <div className={styles.aiCitationLabel}>
                      <span className="material-symbols-outlined text-[13px]">menu_book</span>
                      <span>Citations:</span>
                    </div>
                    <div className={styles.aiCitationList}>
                      {aiResponse.citations.map((c, cIdx) => {
                        const bookObj = bookByName(c.book);
                        const pdfUrl = bookObj
                          ? bookUrl(bookObj, c.page)
                          : `${BOOK_BASE}${c.file || 'Vampire-the-Masquerade-1.pdf'}#page=${c.pdfPage || c.page}`;
                        return (
                          <a
                            key={cIdx}
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.aiCitationChip}
                            title={`Jump to ${c.book} page ${c.page}`}
                          >
                            <span className="material-symbols-outlined text-[11px]">auto_stories</span>
                            <span>{c.book || 'Corebook'} p. {c.page}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!aiLoading && !aiResponse && (
              <div className={styles.emptyState}>
                <span className="material-symbols-outlined text-[28px] opacity-40 text-primary">psychology</span>
                <div>Ask Rule Master AI any question about V5 rules, disciplines, or mechanics during live play.</div>
                <div className={styles.emptyStateChips}>
                  {[
                    'Can Auspex detect Obfuscate?',
                    'Difficulty to resist Frenzy',
                    'Remorse test mechanics',
                    'Blood Surge Rouse cost'
                  ].map((sample, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      className={styles.presetQueryChip}
                      onClick={() => {
                        setAiQuestion(sample);
                        handleAskRuleMaster(sample);
                      }}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.aiInputFooter}>
            <form
              className={styles.aiInputForm}
              onSubmit={(e) => {
                e.preventDefault();
                handleAskRuleMaster();
              }}
            >
              <input
                type="text"
                className={styles.aiTextInput}
                placeholder="Ask Rule Master arbiter..."
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                disabled={aiLoading}
              />
              {aiLoading ? (
                <button
                  type="button"
                  className={styles.aiStopBtn}
                  onClick={handleStopRuleMaster}
                  title="Stop generating"
                >
                  <span className="material-symbols-outlined text-[14px]">stop_circle</span>
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.aiSendBtn}
                  disabled={!aiQuestion.trim()}
                  title="Ask Rule Master"
                >
                  <span className="material-symbols-outlined text-[14px]">send</span>
                  <span>Ask</span>
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
