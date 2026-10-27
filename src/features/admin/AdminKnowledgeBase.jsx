// src/features/admin/AdminKnowledgeBase.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import MiniSearch from 'minisearch';
import { Helmet } from 'react-helmet-async';
import api from '../../core/api';
import { BOOKS, BOOK_BASE, parseSourceString, bookByName, bookUrl } from '../../data/books';
import { DISCIPLINES } from '../../data/disciplines';
import { RITUALS } from '../../data/rituals';
import { MERITS_AND_FLAWS } from '../../data/merits_flaws';
import { INGRAINED_DISCIPLINE_FLAWS } from '../../data/ingrainedFlaws';
import { CLAN_REFERENCE } from '../../data/clanReference';
import { powerMechanics } from '../../data/disciplineMechanics';
import {
  SOURCEBOOK_KEYS,
  SOURCEBOOK_METADATA,
  SOURCEBOOKS_TOC,
  SOURCEBOOKS_SUBJECT_INDEX,
  DISCIPLINES_LEXICON,
  CLANS_LEXICON
} from '../../data/sourcebooksIndex';
import { copyToClipboard } from '../../utils/clipboard';
import ReactMarkdown from 'react-markdown';
import styles from '../../styles/AdminKnowledgeBase.module.css';

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

// Matches citations like: Corebook, p. 377 or (Cults of the Blood Gods, p. 208)
// while skipping existing markdown links [text](url)
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

const STORAGE_KEY = 'vtm_admin_kb_pins';

const ALPHABET = ['ALL', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

const INDEX_CATEGORIES = [
  'ALL',
  'Clans and Bloodlines',
  'Disciplines and Powers',
  'Rituals and Ceremonies',
  'Loresheets',
  'Rules and Systems',
  'Predator Types',
  'Merits and Flaws',
  'Setting and Lore'
];

const CORE_RULES = [
  {
    category: 'rules',
    title: 'Difficulty and Success',
    content: '1 to 5: Failure. 6 to 9: Success. 10: Critical. Pair of 10s: 4 successes total.\nDifficulty 1: Routine\nDifficulty 3: Moderate (standard actions)\nDifficulty 5: Hard\nDifficulty 7+: Nearly impossible',
    source: 'Corebook, p. 119'
  },
  {
    category: 'rules',
    title: 'Hunger and Bestial Dice',
    content: 'Messy Critical: A 10 on a Hunger die within a critical win. The action succeeds but the Beast manifests.\nBestial Failure: A 1 on a Hunger die in an overall failed roll. The Beast lashes out causing compulsions or frenzy.',
    source: 'Corebook, p. 207'
  },
  {
    category: 'rules',
    title: 'Blood Surge',
    content: 'Adds bonus dice to a single pool based on Blood Potency rating. Requires an immediate Rouse Check.',
    source: 'Corebook, p. 216'
  },
  {
    category: 'rules',
    title: 'Humanity and Stains',
    content: 'Stains are accrued by violating Chronicle Tenets, Convictions, or Predator instincts.\nEnd of session Remorse test: Roll (10 minus Humanity minus Stains). At least 1 success clears stains peacefully. Failure reduces Humanity by 1 and clears stains.',
    source: 'Corebook, p. 238'
  },
  {
    category: 'rules',
    title: 'Frenzy and Resisting the Beast',
    content: 'Triggered by anger (Fury), hunger (Hunger), or terror (Terror).\nResist test: Roll unspent Willpower + (Humanity divided by 3, rounded down). Success suppresses the urge.\nFailure lets the Beast take control. While in Frenzy, immune to physical health penalties and restricted to physical disciplines.',
    source: 'Corebook, p. 219'
  },
  {
    category: 'rules',
    title: 'Blood Potency Milestones',
    content: 'Governs Blood Surge dice, Mend amounts, Discipline power bonus, Rouse reroll maximum level, Bane Severity, and Feeding penalties.',
    source: 'Corebook, p. 216'
  },
  {
    category: 'rules',
    title: 'Torpor and Awakening',
    content: 'A state of deathlike coma entered when taking full Aggravated Health damage or starved of blood.\nAwakening duration scales from nights to centuries depending on Humanity rating.',
    source: 'Corebook, p. 223'
  },
  {
    category: 'rules',
    title: 'Diablerie',
    content: 'The heinous act of consuming another vampire heartblood to steal their power and generation.\nRequires extended contested tests (Strength + Resolve vs victim Resolve + Humanity). Stains and soul corruption follow.',
    source: 'Corebook, p. 234'
  }
];

// Predefined quick bookmarks for common sourcebooks
const BOOK_QUICK_PRESETS = {
  'Corebook': [
    { label: 'Character Creation', page: 136 },
    { label: 'Blood Potency', page: 216 },
    { label: 'Disciplines', page: 244 },
    { label: 'Combat Rules', page: 295 },
    { label: 'Loresheets', page: 382 }
  ],
  "Players Guide": [
    { label: 'Alternative Clans', page: 12 },
    { label: 'Disciplines and Powers', page: 90 },
    { label: 'Merits and Flaws', page: 114 },
    { label: 'Banes Compendium', page: 154 }
  ],
  'Camarilla': [
    { label: 'The Traditions', page: 28 },
    { label: 'Court Structure', page: 54 },
    { label: 'Second Inquisition', page: 112 }
  ],
  'Anarch': [
    { label: 'The Movement', page: 32 },
    { label: 'Free States', page: 70 },
    { label: 'Ministry Clan', page: 174 }
  ],
  'Cults of the Blood Gods': [
    { label: 'Hecata Clan', page: 68 },
    { label: 'Oblivion Ceremonies', page: 206 },
    { label: 'Blood Cults', page: 120 }
  ]
};

// Book styling metadata (colors and edition hints)
const BOOK_STYLES = {
  'Corebook': { color: '#8a0f1a', accent: '#e5a93b', edition: 'Core System' },
  "Players Guide": { color: '#1e3a5f', accent: '#5dade2', edition: 'Companion Guide' },
  'Companion': { color: '#2c3e50', accent: '#aeb6bf', edition: 'Official PDF' },
  'Anarch': { color: '#78281f', accent: '#e74c3c', edition: 'Faction Sourcebook' },
  'Camarilla': { color: '#4a235a', accent: '#af7ac5', edition: 'Faction Sourcebook' },
  'Sabbat': { color: '#17202a', accent: '#922b21', edition: 'Antagonist Guide' },
  'Cults of the Blood Gods': { color: '#641e16', accent: '#d98880', edition: 'Religion and Clan' },
  'Forbidden Religions': { color: '#512e5f', accent: '#bb8fce', edition: 'Faith Expansion' },
  'Children of the Blood': { color: '#7b241c', accent: '#f1948a', edition: 'Cults Expansion' },
  'Blood Sigils': { color: '#1b4f72', accent: '#85c1e9', edition: 'Sorcery and Alchemy' },
  'Blood Stained Love': { color: '#900c3f', accent: '#ff5733', edition: 'Romance and Horror' },
  'Gehenna War': { color: '#145a32', accent: '#52be80', edition: 'Warfare Guide' },
  'Chicago Folios': { color: '#1f618d', accent: '#7fb3d5', edition: 'City Records' },
  'Chicago by Night': { color: '#154360', accent: '#2980b9', edition: 'City Setting' },
  'Let the Streets Run Red': { color: '#78281f', accent: '#c0392b', edition: 'Chronicle Folio' },
  'Fall of London': { color: '#34495e', accent: '#bdc3c7', edition: 'Chronicle Book' },
  'Second Inquisition': { color: '#1b2631', accent: '#e74c3c', edition: 'Hunter Guide' },
  'Trails of Ash and Bone': { color: '#4d5656', accent: '#b2babb', edition: 'Chronicle Folio' },
  'Tattered Façade': { color: '#5b2c6f', accent: '#d2b4de', edition: 'Official Supplement' },
  'Courts of the Damned': { color: '#0e6251', accent: '#76d7c4', edition: 'Court Guide' },
  'Book of Nod Apocrypha': { color: '#111111', accent: '#b7950b', edition: 'Ancient Lore' },
  "Winter's Teeth": { color: '#212f3d', accent: '#85929e', edition: 'Graphic Lore' },
  'Quick Reference': { color: '#7d6608', accent: '#f4d03f', edition: 'Fast Rules' },
  'Blood Potency Correction': { color: '#922b21', accent: '#e6b0aa', edition: 'Official Errata' },
  'In Memoriam': { color: '#1c2833', accent: '#abb2b9', edition: 'Chronicle Guide' }
};

export default function AdminKnowledgeBase() {
  const [activeTab, setActiveTab] = useState('library'); // 'library', 'corebook_index', 'search', 'pins', 'clans'
  const [globalSearch, setGlobalSearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [searchCategory, setSearchCategory] = useState('all');
  const [pageInputs, setPageInputs] = useState({});
  const [pinnedItems, setPinnedItems] = useState([]);
  const [newPinBook, setNewPinBook] = useState('Corebook');
  const [newPinPage, setNewPinPage] = useState('');
  const [newPinTitle, setNewPinTitle] = useState('');
  const [newPinNote, setNewPinNote] = useState('');
  const [showAddPinModal, setShowAddPinModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Multi:Sourcebook Master Index and TOC state
  const [indexViewMode, setIndexViewMode] = useState('index'); // 'index' or 'toc'
  const [selectedSourcebook, setSelectedSourcebook] = useState('ALL');
  const [tocBook, setTocBook] = useState('Corebook');
  const [selectedLetter, setSelectedLetter] = useState('ALL');
  const [selectedIndexCategory, setSelectedIndexCategory] = useState('ALL');
  const [indexQuery, setIndexQuery] = useState('');

  // Wiki integration state
  const [wikiArticles, setWikiArticles] = useState([]);
  const [wikiSearchResults, setWikiSearchResults] = useState([]);

  // Rule Master AI state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [aiExpanded, setAiExpanded] = useState(true);
  const [copiedRuling, setCopiedRuling] = useState(false);
  const [thinkingStage, setThinkingStage] = useState(0);
  const [isDeepSearch, setIsDeepSearch] = useState(true);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const abortControllerRef = useRef(null);
  const chatEndRef = useRef(null);

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

  useEffect(() => {
    if (!aiLoading) return;
    const interval = setInterval(() => {
      setThinkingStage((prev) => Math.min(prev + 1, currentStages.length - 1));
    }, isDeepSearch ? 2200 : 1600);
    return () => clearInterval(interval);
  }, [aiLoading, isDeepSearch, currentStages.length]);

  useEffect(() => {
    if (conversationHistory.length > 1 && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationHistory, aiLoading]);

  const handleCopyRuling = (text) => {
    copyToClipboard(text);
    setCopiedRuling(true);
    notify('Copied Rule Master ruling');
    setTimeout(() => setCopiedRuling(false), 2200);
  };

  const handleCopyMessage = (text, msgId) => {
    copyToClipboard(text);
    setCopiedMsgId(msgId);
    notify('Copied ruling text');
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleStopRuleMaster = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAiLoading(false);
    setAiError('Research stopped by Storyteller');
    notify('Research stopped');
  };

  const handleAskRuleMaster = async (questionToAsk, overrideDeep) => {
    const q = (typeof questionToAsk === 'string' ? questionToAsk : aiQuestion).trim();
    if (!q) return;
    const useDeep = typeof overrideDeep === 'boolean' ? overrideDeep : isDeepSearch;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setAiLoading(true);
    setAiError(null);
    setCopiedRuling(false);
    setThinkingStage(0);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: 'msg_user_' + Date.now(),
      role: 'user',
      text: q,
      timestamp: timeStr
    };
    setConversationHistory([userMsg]);

    try {
      const res = await api.post(
        '/wiki/rule-master/ask',
        {
          question: q,
          deepSearch: useDeep,
          history: []
        },
        {
          signal: controller.signal
        }
      );
      if (res.data?.success) {
        setAiResponse(res.data);
        const assistantMsg = {
          id: 'msg_asst_' + Date.now(),
          role: 'assistant',
          text: res.data.answer,
          citations: res.data.citations,
          hypothesis: res.data.hypothesis,
          quotes: res.data.quotes,
          steps: res.data.steps,
          isDeepSearch: res.data.isDeepSearch,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setConversationHistory([userMsg, assistantMsg]);
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

  const handleSendFollowUp = async (e, textOverride) => {
    if (e) e.preventDefault();
    const q = (typeof textOverride === 'string' ? textOverride : followUpQuestion).trim();
    if (!q || aiLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: 'msg_user_' + Date.now(),
      role: 'user',
      text: q,
      timestamp: timeStr
    };

    const updatedHistory = [...conversationHistory, userMsg];
    setConversationHistory(updatedHistory);
    setFollowUpQuestion('');
    setAiLoading(true);
    setAiError(null);
    setThinkingStage(0);

    try {
      const historyPayload = conversationHistory.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await api.post(
        '/wiki/rule-master/ask',
        {
          question: q,
          deepSearch: isDeepSearch,
          history: historyPayload
        },
        {
          signal: controller.signal
        }
      );

      if (res.data?.success) {
        const assistantMsg = {
          id: 'msg_asst_' + Date.now(),
          role: 'assistant',
          text: res.data.answer,
          citations: res.data.citations,
          hypothesis: res.data.hypothesis,
          quotes: res.data.quotes,
          steps: res.data.steps,
          isDeepSearch: res.data.isDeepSearch,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setConversationHistory([...updatedHistory, assistantMsg]);
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

  const handleResetConversation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setConversationHistory([]);
    setAiResponse(null);
    setAiError(null);
    setAiQuestion('');
    setFollowUpQuestion('');
    setAiLoading(false);
    notify('Conversation reset');
  };

  const renderMarkdownRuling = (text) => (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h3 className={styles.markdownH3}>{children}</h3>,
        h2: ({ children }) => <h3 className={styles.markdownH3}>{children}</h3>,
        h3: ({ children }) => <h3 className={styles.markdownH3}>{children}</h3>,
        h4: ({ children }) => <h4 className={styles.markdownH4}>{children}</h4>,
        p: ({ children }) => <p className={styles.markdownP}>{children}</p>,
        blockquote: ({ children }) => (
          <blockquote className={styles.markdownBlockquote}>
            <span className="material-symbols-outlined text-[16px] text-primary select-none mr-2">format_quote</span>
            <div className={styles.markdownBlockquoteContent}>{children}</div>
          </blockquote>
        ),
        ul: ({ children }) => <ul className={styles.markdownUl}>{children}</ul>,
        ol: ({ children }) => <ol className={styles.markdownOl}>{children}</ol>,
        li: ({ children }) => (
          <li className={styles.markdownLi}>
            <span className="text-primary font-bold mr-1.5 select-none">•</span>
            <span>{children}</span>
          </li>
        ),
        a: ({ href, children, ...props }) => {
          const isPdfLink = href && href.includes('#page=');
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={isPdfLink ? styles.inlinePdfLink : styles.markdownLink}
              title={isPdfLink ? 'Jump to PDF page in new tab' : undefined}
              {...props}
            >
              {isPdfLink && (
                <span className="material-symbols-outlined text-[13px] mr-1 inline-block align-middle">
                  auto_stories
                </span>
              )}
              <span>{children}</span>
            </a>
          );
        },
        strong: ({ children }) => <strong className={styles.markdownStrong}>{children}</strong>,
        code: ({ children }) => <code className={styles.markdownCode}>{children}</code>
      }}
    >
      {linkifySourcebookCitations(text)}
    </ReactMarkdown>
  );

  // Fetch LARP wiki articles on mount
  useEffect(() => {
    let isMounted = true;
    api.get('/wiki/articles')
      .then((res) => {
        if (isMounted && res.data?.articles) {
          setWikiArticles(res.data.articles);
        }
      })
      .catch((err) => {
        console.warn('Could not load wiki articles for knowledge base', err);
      });
    return () => { isMounted = false; };
  }, []);

  // Query server wiki search when global search input changes
  useEffect(() => {
    const q = globalSearch.trim();
    if (!q || q.length < 2) {
      setWikiSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api.get('/wiki/search', { params: { q } })
        .then((res) => {
          if (res.data?.results) {
            setWikiSearchResults(res.data.results);
          }
        })
        .catch(() => {
          setWikiSearchResults([]);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  // Load pinned items from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPinnedItems(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load pinned items from storage', e);
    }
  }, []);

  const savePins = (pins) => {
    setPinnedItems(pins);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
    } catch (e) {
      console.warn('Failed to save pinned items', e);
    }
  };

  const notify = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // Compile full reference list for universal search
  const allReferenceEntries = useMemo(() => {
    const list = [...CORE_RULES];

    // Multi:Sourcebook Subject Index Entries (Corebook, Players Guide, Cults, Camarilla, Anarch, Sabbat)
    SOURCEBOOKS_SUBJECT_INDEX.forEach((si, idx) => {
      list.push({
        id: `sb_idx_${idx}`,
        category: `${si.book.toLowerCase()} index`,
        title: `${si.topic} (${si.book} p. ${si.page})`,
        content: `Sourcebook: ${si.book}\n${si.section}\n${si.summary}`,
        source: `${si.book}, p. ${si.page}`,
        book: si.book,
        pdfPage: si.pdfPage,
        page: si.page,
        isSourcebookIndex: true
      });
    });

    // Disciplines
    Object.entries(DISCIPLINES).forEach(([disc, { levels = {} }]) => {
      const discMeta = DISCIPLINES_LEXICON.find((d) => d.name.toLowerCase() === disc.toLowerCase());
      Object.entries(levels).forEach(([lvl, powers]) => {
        powers.forEach((p) => {
          const mech = powerMechanics(p.id);
          list.push({
            id: `disc_${p.id || p.name}`,
            category: 'disciplines',
            discipline: disc,
            title: `${p.name} (${disc} Level ${lvl})`,
            cost: p.cost || null,
            pool: p.dice_pool || null,
            content: `Discipline: ${disc} Level ${lvl}\nCost: ${p.cost || 'None'}\nPool: ${p.dice_pool || 'None'}\n${p.notes || p.duration || ''}${mech ? `\nMechanic: ${mech.note}` : ''}`,
            source: p.source || (discMeta ? `${discMeta.book} p. ${discMeta.page}` : null),
            wikiUrl: discMeta?.url || `https://vtm.paradoxwikis.com/${disc.replace(/\s+/g, '_')}`
          });
        });
      });
    });

    // Rituals and Ceremonies
    Object.entries(RITUALS).forEach(([kind, { meta = {}, levels = {} }]) => {
      const isCeremony = kind === 'oblivion';
      const ritualWiki = isCeremony
        ? 'https://vtm.paradoxwikis.com/Oblivion'
        : 'https://vtm.paradoxwikis.com/Blood_Sorcery';
      Object.entries(levels).forEach(([lvl, rList = []]) => {
        rList.forEach((r) => {
          list.push({
            id: `rit_${r.name}`,
            category: isCeremony ? 'ceremonies' : 'rituals',
            title: `${r.name} (${isCeremony ? 'Oblivion Ceremony' : 'Blood Sorcery Ritual'} Level ${lvl})`,
            cost: r.cost || meta?.defaults?.cost || null,
            pool: r.dice_pool || null,
            content: `Type: ${isCeremony ? 'Oblivion Ceremony' : 'Blood Sorcery Ritual'} Level ${lvl}\nCost: ${r.cost || meta?.defaults?.cost || 'Standard'}\n${r.effect || ''}\n${r.notes || ''}`,
            source: r.source || null,
            wikiUrl: ritualWiki
          });
        });
      });
    });

    // Merits and Flaws
    Object.entries(MERITS_AND_FLAWS).forEach(([catName, catData]) => {
      (catData.merits || []).forEach((m) => {
        list.push({
          id: `merit_${m.id || m.name}`,
          category: 'merits',
          title: `${m.name} (${catName} Merit)`,
          cost: m.dots || null,
          content: `Category: ${catName}\nRating: ${m.dots}\n${m.description}\n${catData.blurb || ''}`,
          source: m.source || catData.blurb || null
        });
      });
      (catData.flaws || []).forEach((f) => {
        list.push({
          id: `flaw_${f.id || f.name}`,
          category: 'flaws',
          title: `${f.name} (${catName} Flaw)`,
          cost: f.dots || null,
          content: `Category: ${catName}\nRating: ${f.dots}\n${f.description}\n${catData.blurb || ''}`,
          source: f.source || catData.blurb || null
        });
      });
    });

    // Ingrained Flaws
    Object.entries(INGRAINED_DISCIPLINE_FLAWS).forEach(([disc, info]) => {
      const discMeta = DISCIPLINES_LEXICON.find((d) => d.name.toLowerCase() === disc.toLowerCase());
      list.push({
        id: `ingrained_${disc}`,
        category: 'ingrained flaws',
        discipline: disc,
        title: `${info.name} (${disc} Ingrained Flaw)`,
        content: `Discipline: ${disc}\n${info.description}`,
        source: info.source || 'Tattered Façade, p. 108',
        wikiUrl: discMeta?.url || `https://vtm.paradoxwikis.com/${disc.replace(/\s+/g, '_')}`
      });
    });

    // Clan References
    Object.entries(CLAN_REFERENCE).forEach(([clan, data]) => {
      const clanMeta = CLANS_LEXICON.find((c) => c.name.toLowerCase() === clan.toLowerCase());
      list.push({
        id: `clan_${clan}`,
        category: 'clans',
        clan: clan,
        title: `${clan} Clan Bane and Compulsion`,
        content: `Bane: ${data.bane}\nCompulsion: ${data.compulsion}`,
        source: `${clanMeta?.book || data.book || 'Corebook'} p. ${clanMeta?.page || ''}`,
        book: clanMeta?.book || data.book || 'Corebook',
        page: clanMeta?.page || null,
        pdfPage: clanMeta?.pdfPage || null,
        wikiUrl: clanMeta?.url || `https://vtm.paradoxwikis.com/${clan.replace(/\s+/g, '_')}`
      });
    });

    // Published LARP Wiki Articles
    wikiArticles.forEach((art) => {
      list.push({
        id: `wiki_${art.slug || art.id}`,
        category: 'wiki',
        title: `${art.title} (LARP Wiki)`,
        content: `Athens Through Time LARP Wiki article by ${art.author_name || 'Kindred'}. Published lore and chronicle records.`,
        source: `LARP Wiki: ${art.title}`,
        wikiSlug: art.slug,
        wikiUrl: `https://wiki.attlarp.gr/article/${art.slug}`
      });
    });

    return list;
  }, [wikiArticles]);

  // MiniSearch index
  const searchEngine = useMemo(() => {
    const ms = new MiniSearch({
      fields: ['title', 'content', 'category'],
      storeFields: ['id', 'title', 'content', 'category', 'cost', 'pool', 'source', 'book', 'pdfPage', 'page', 'wikiSlug', 'wikiUrl', 'discipline', 'clan'],
      searchOptions: { fuzzy: 0.35, prefix: true }
    });
    ms.addAll(allReferenceEntries.map((item, idx) => ({ id: item.id || `ref_${idx}`, ...item })));
    return ms;
  }, [allReferenceEntries]);

  // Search Results
  const searchResults = useMemo(() => {
    const query = globalSearch.trim();
    let results = [];
    if (!query) {
      results = allReferenceEntries;
    } else {
      results = searchEngine.search(query);
    }

    // Merge live server:side wiki search results if query is active
    if (wikiSearchResults.length > 0 && (searchCategory === 'all' || searchCategory === 'wiki')) {
      const existingSlugs = new Set(results.map((r) => r.wikiSlug).filter(Boolean));
      wikiSearchResults.forEach((wr) => {
        if (!existingSlugs.has(wr.slug)) {
          results.push({
            id: `wiki_srv_${wr.id}`,
            category: 'wiki',
            title: `${wr.title} (LARP Wiki)`,
            content: wr.snippet || 'Athens Through Time LARP Wiki record.',
            source: `LARP Wiki: ${wr.title}`,
            wikiSlug: wr.slug,
            wikiUrl: `https://wiki.attlarp.gr/article/${wr.slug}`
          });
        }
      });
    }

    if (searchCategory !== 'all') {
      results = results.filter((r) => {
        const cat = (r.category || '').toLowerCase();
        if (searchCategory === 'rules') return cat.includes('rules');
        if (searchCategory === 'disciplines') return cat.includes('discipline');
        if (searchCategory === 'rituals') return cat.includes('ritual') || cat.includes('ceremon');
        if (searchCategory === 'merits') return cat.includes('merit');
        if (searchCategory === 'flaws') return cat.includes('flaw');
        if (searchCategory === 'clans') return cat.includes('clan');
        if (searchCategory === 'wiki') return cat.includes('wiki');
        if (searchCategory === 'sourcebooks') return cat.includes('index') || cat.includes('corebook') || cat.includes('guide') || cat.includes('cults') || cat.includes('camarilla') || cat.includes('anarch') || cat.includes('sabbat');
        return true;
      });
    }

    return results;
  }, [globalSearch, searchCategory, searchEngine, allReferenceEntries, wikiSearchResults]);

  // Filtered Subject Index for Multi:Sourcebook Tab
  const filteredSubjectIndex = useMemo(() => {
    let list = SOURCEBOOKS_SUBJECT_INDEX;
    if (selectedSourcebook !== 'ALL') {
      list = list.filter((item) => item.book === selectedSourcebook);
    }
    if (selectedLetter !== 'ALL') {
      list = list.filter((item) => item.topic.toUpperCase().startsWith(selectedLetter));
    }
    if (selectedIndexCategory !== 'ALL') {
      list = list.filter((item) => item.category === selectedIndexCategory);
    }
    if (indexQuery.trim()) {
      const q = indexQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.topic.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.section.toLowerCase().includes(q) ||
          item.book.toLowerCase().includes(q) ||
          String(item.page).includes(q)
      );
    }
    return list;
  }, [selectedSourcebook, selectedLetter, selectedIndexCategory, indexQuery]);

  // Filtered Table of Contents for Selected Book
  const activeTocList = SOURCEBOOKS_TOC[tocBook] || [];
  const filteredToc = useMemo(() => {
    if (!indexQuery.trim()) return activeTocList;
    const q = indexQuery.toLowerCase().trim();
    return activeTocList.filter(
      (item) => item.title.toLowerCase().includes(q) || String(item.page).includes(q)
    );
  }, [activeTocList, indexQuery]);

  const handleJumpPdf = (bookLabel, pdfPage) => {
    const meta = SOURCEBOOK_METADATA[bookLabel] || bookByName(bookLabel);
    const fileName = meta?.file || (meta?.label ? `${meta.label}.pdf` : null);
    if (!fileName) {
      notify('Sourcebook document not found');
      return;
    }
    const targetUrl = `${BOOK_BASE}${fileName}#page=${pdfPage}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePinSourcebookEntry = (entry) => {
    const titleKey = entry.topic || entry.title;
    const bookName = entry.book || tocBook || 'Corebook';
    const isPinned = pinnedItems.some((p) => p.refId === `sb_${bookName}_${titleKey}`);
    if (isPinned) {
      const updated = pinnedItems.filter((p) => p.refId !== `sb_${bookName}_${titleKey}`);
      savePins(updated);
      notify('Removed from pinned board');
    } else {
      const meta = SOURCEBOOK_METADATA[bookName] || bookByName(bookName);
      const targetUrl = meta?.file ? `${BOOK_BASE}${meta.file}#page=${entry.pdfPage}` : null;
      const newPin = {
        id: `pin_sb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        refId: `sb_${bookName}_${titleKey}`,
        type: 'sourcebook',
        title: `${titleKey} (${bookName})`,
        bookLabel: bookName,
        page: entry.page,
        url: targetUrl,
        content: entry.summary || entry.section || `Table of Contents, Page ${entry.page}`,
        note: `${bookName} Printed p. ${entry.page}, PDF p. ${entry.pdfPage}`,
        createdAt: new Date().toISOString()
      };
      savePins([newPin, ...pinnedItems]);
      notify(`Pinned ${titleKey}`);
    }
  };

  // Filtered Books
  const filteredBooks = useMemo(() => {
    return BOOKS.filter((b) => {
      if (libraryFilter === 'core') return b.label === 'Corebook' || b.label === "Players Guide" || b.label === 'Companion';
      if (libraryFilter === 'factions') return b.label === 'Camarilla' || b.label === 'Anarch' || b.label === 'Sabbat' || b.label === 'Second Inquisition';
      if (libraryFilter === 'settings') return b.label.includes('Chicago') || b.label.includes('London') || b.label.includes('Cults');
      return true;
    });
  }, [libraryFilter]);

  // Actions for opening book covers and specific pages
  const handleOpenBook = (book, pageNumber = null) => {
    if (!book || !book.file) {
      notify('This document is not uploaded yet');
      return;
    }
    const targetUrl = bookUrl(book, pageNumber);
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleJumpPage = (book) => {
    const rawVal = pageInputs[book.file];
    if (!rawVal) {
      handleOpenBook(book);
      return;
    }
    const pageNum = parseInt(rawVal, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      notify('Please enter a valid page number');
      return;
    }
    handleOpenBook(book, pageNum);
  };

  const handlePinBookPage = (book, specifiedPage = null) => {
    const rawVal = specifiedPage != null ? specifiedPage : pageInputs[book.file];
    const pageNum = rawVal ? parseInt(rawVal, 10) : 1;
    const itemUrl = bookUrl(book, pageNum);
    const newPin = {
      id: `pin_pdf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'page',
      title: `${book.label}, Page ${pageNum}`,
      bookLabel: book.label,
      page: pageNum,
      url: itemUrl,
      note: `Direct bookmark into ${book.label} page ${pageNum}`,
      createdAt: new Date().toISOString()
    };
    savePins([newPin, ...pinnedItems]);
    notify(`Pinned ${book.label} page ${pageNum}`);
  };

  const handlePinItem = (item) => {
    const isPinned = pinnedItems.some((p) => p.refId === item.id || p.title === item.title);
    if (isPinned) {
      const updated = pinnedItems.filter((p) => p.refId !== item.id && p.title !== item.title);
      savePins(updated);
      notify('Removed from pinned board');
    } else {
      const newPin = {
        id: `pin_ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        refId: item.id,
        type: item.category || 'reference',
        title: item.title,
        content: item.content,
        source: item.source,
        cost: item.cost,
        createdAt: new Date().toISOString()
      };
      savePins([newPin, ...pinnedItems]);
      notify(`Pinned ${item.title}`);
    }
  };

  const handleRemovePin = (pinId) => {
    const updated = pinnedItems.filter((p) => p.id !== pinId);
    savePins(updated);
    notify('Pin removed');
  };

  const handleCreateCustomPin = (e) => {
    e.preventDefault();
    const bk = BOOKS.find((b) => b.label === newPinBook);
    const pg = parseInt(newPinPage, 10) || 1;
    const url = bk ? bookUrl(bk, pg) : null;
    const pin = {
      id: `pin_custom_${Date.now()}`,
      type: 'page',
      title: newPinTitle.trim() || `${newPinBook}, Page ${pg}`,
      bookLabel: newPinBook,
      page: pg,
      url: url,
      note: newPinNote.trim() || `Bookmark for ${newPinBook}`,
      createdAt: new Date().toISOString()
    };
    savePins([pin, ...pinnedItems]);
    setNewPinPage('');
    setNewPinTitle('');
    setNewPinNote('');
    setShowAddPinModal(false);
    notify('Custom bookmark saved');
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>Knowledge Base : Admin Codex</title>
      </Helmet>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitleRow}>
          <div className={styles.titleArea}>
            <span className={styles.badge}>
              <span className="material-symbols-outlined text-[14px]">shield</span>
              Storyteller Administration
            </span>
            <h1 className={styles.title}>
              <span className="material-symbols-outlined text-[36px]">psychology</span>
              Knowledge Base
            </h1>
            <p className={styles.subtitle}>
              Universal rulebook library, searchable codex, direct page navigation, and persistent pinned archives.
            </p>
          </div>

          {feedbackMsg && (
            <div style={{
              background: 'rgba(186, 26, 26, 0.2)',
              border: '1px solid var(--primary)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              color: '#fff',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {feedbackMsg}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className={styles.navTabs}>
          <button
            type="button"
            className={`${styles.navTab} ${activeTab === 'library' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <span className="material-symbols-outlined text-[18px]">library_books</span>
            Sourcebooks and PDFs
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeTab === 'corebook_index' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('corebook_index')}
          >
            <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
            Sourcebook Master Index
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeTab === 'search' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <span className="material-symbols-outlined text-[18px]">manage_search</span>
            Universal Codex Search
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeTab === 'pins' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('pins')}
          >
            <span className="material-symbols-outlined text-[18px]">push_pin</span>
            Pinned Archives
            {pinnedItems.length > 0 && <span className={styles.navTabCount}>{pinnedItems.length}</span>}
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeTab === 'clans' ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab('clans')}
          >
            <span className="material-symbols-outlined text-[18px]">gavel</span>
            Clans and Banes
          </button>
          <button
            type="button"
            className={styles.navTab}
            onClick={() => {
              const el = document.getElementById('wiki-quick-reference');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            title="Jump to Paradox Wiki Quick Reference"
          >
            <span className="material-symbols-outlined text-[18px]">public</span>
            Paradox Wiki (28)
          </button>
        </div>
      </header>

      {/* Global Quick Search Input */}
      <div className={styles.quickSearchBar}>
        <span className="material-symbols-outlined text-[22px] text-primary">search</span>
        <input
          type="text"
          className={styles.quickSearchInput}
          placeholder="Search disciplines, rules, rituals, merits, flaws, or sourcebook citations..."
          value={globalSearch}
          onChange={(e) => {
            setGlobalSearch(e.target.value);
            if (activeTab === 'library' && e.target.value.trim().length > 1) {
              setActiveTab('search');
            }
          }}
        />
        {globalSearch && (
          <button
            type="button"
            onClick={() => setGlobalSearch('')}
            className="text-on-surface-variant hover:text-on-surface px-2 text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Rule Master AI Assistant Section */}
      <div className={styles.ruleMasterSection} id="rule-master-ai">
        <div className={styles.ruleMasterHeader}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="material-symbols-outlined text-[22px] text-primary">psychology</span>
            <span className={styles.ruleMasterTitle}>Rule Master AI</span>
            <span className={styles.ruleMasterBadge}>V5 Storyteller Arbiter</span>
            {aiResponse?.modelUsed && (
              <span className={styles.ruleMasterModelPill}>
                <span className="material-symbols-outlined text-[13px] text-primary">bolt</span>
                {aiResponse.modelUsed}
              </span>
            )}
            {aiResponse?.isDeepSearch && (
              <span className={styles.ruleMasterDeepPill}>
                <span className="material-symbols-outlined text-[13px]">travel_explore</span>
                Deep Search
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className={styles.modeToggleGroup} role="group" aria-label="Research Mode">
              <button
                type="button"
                className={`${styles.modeToggleBtn} ${!isDeepSearch ? styles.modeToggleActive : ''}`}
                onClick={() => setIsDeepSearch(false)}
                title="Standard fast rule lookup"
              >
                <span className="material-symbols-outlined text-[15px]">bolt</span>
                <span>Fast</span>
              </button>
              <button
                type="button"
                className={`${styles.modeToggleBtn} ${isDeepSearch ? styles.modeToggleDeepActive : ''}`}
                onClick={() => setIsDeepSearch(true)}
                title="Deep multi prompt verification loop with verbatim quotes"
              >
                <span className="material-symbols-outlined text-[15px]">travel_explore</span>
                <span>Deep Search</span>
              </button>
            </div>

            <button
              type="button"
              className={styles.ruleMasterToggleBtn}
              onClick={() => setAiExpanded(!aiExpanded)}
              title={aiExpanded ? 'Collapse Rule Master' : 'Expand Rule Master'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {aiExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
        </div>

        {aiExpanded && (
          <div className={styles.ruleMasterBody}>
            <form
              className={styles.ruleMasterForm}
              onSubmit={(e) => {
                e.preventDefault();
                handleAskRuleMaster();
              }}
            >
              <input
                type="text"
                className={styles.ruleMasterInput}
                placeholder={
                  isDeepSearch
                    ? 'Ask Deep Search AI for multi prompt V5 research, citations, and exact quotes...'
                    : 'Ask Rule Master AI any question about V5 rules, disciplines, or mechanics...'
                }
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                disabled={aiLoading}
              />
              {aiLoading ? (
                <button
                  type="button"
                  className={styles.ruleMasterStopBtn}
                  onClick={handleStopRuleMaster}
                  title="Halt Research and Reasoning Loop"
                >
                  <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className={`${styles.ruleMasterSubmitBtn} ${isDeepSearch ? styles.ruleMasterSubmitDeepBtn : ''}`}
                  disabled={!aiQuestion.trim()}
                  title={isDeepSearch ? 'Execute Deep Codex Research' : 'Consult Rule Master AI'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isDeepSearch ? 'travel_explore' : 'auto_awesome'}
                  </span>
                  <span>{isDeepSearch ? 'Deep Search' : 'Ask AI'}</span>
                </button>
              )}
              {aiResponse && !aiLoading && (
                <button
                  type="button"
                  className={styles.ruleMasterClearBtn}
                  onClick={() => {
                    setAiResponse(null);
                    setAiQuestion('');
                    setAiError(null);
                  }}
                  title="Clear Ruling"
                >
                  <span className="material-symbols-outlined text-[18px]">clear_all</span>
                </button>
              )}
            </form>

            {aiError && (
              <div className={styles.ruleMasterError}>
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{aiError}</span>
              </div>
            )}

            {aiLoading && conversationHistory.length <= 1 && (
              <div className={styles.ruleMasterThinkingContainer}>
                <div className={styles.arcaneCognitionOrb}>
                  <div className={styles.arcaneOrbPulse} />
                  <div className={styles.arcaneOrbRing} />
                  <span className={`material-symbols-outlined ${styles.arcaneBrainIcon}`}>
                    {isDeepSearch ? 'travel_explore' : 'psychology'}
                  </span>
                </div>
                <div className={styles.thinkingStatusArea}>
                  <div className="flex items-center gap-2">
                    <span className={styles.thinkingStatusBadge}>
                      <span className="material-symbols-outlined text-[13px] animate-spin text-primary">auto_mode</span>
                      {isDeepSearch ? 'Deep Codex Loop' : 'Cognitive Retrieval'}
                    </span>
                    {isDeepSearch && (
                      <span className={styles.thinkingDeepStepPill}>
                        Step {thinkingStage + 1} of 3
                      </span>
                    )}
                  </div>
                  <div className={styles.thinkingStageText}>
                    {currentStages[thinkingStage]}
                  </div>
                  <div className={styles.thinkingSkeletons}>
                    <div className={`${styles.skeletonBar} ${styles.skeletonWide}`} />
                    <div className={`${styles.skeletonBar} ${styles.skeletonMedium}`} />
                    <div className={`${styles.skeletonBar} ${styles.skeletonShort}`} />
                  </div>
                </div>
                <div className={styles.thinkingActionArea}>
                  <button
                    type="button"
                    className={styles.thinkingStopBtn}
                    onClick={handleStopRuleMaster}
                    title="Halt Research and Reasoning Loop"
                  >
                    <span className="material-symbols-outlined text-[16px]">stop</span>
                    <span>Stop</span>
                  </button>
                </div>
              </div>
            )}

            {(conversationHistory.length > 0 || aiResponse) && (
              <div className={`${styles.ruleMasterResultBox} ${styles.resultBoxEntrance}`}>
                <div className={styles.ruleMasterResultHeader}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="material-symbols-outlined text-[18px] text-primary">gavel</span>
                    <strong className="text-sm uppercase tracking-wider text-on-surface">Rule Master Arbitration</strong>
                    <span className={styles.rulingDeliveredBadge}>
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      Delivered
                    </span>
                    {isDeepSearch && (
                      <span className={styles.rulingDeepSearchBadge}>
                        <span className="material-symbols-outlined text-[14px]">travel_explore</span>
                        Deep Search Verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={styles.rulingResetBtn}
                      onClick={handleResetConversation}
                      title="Reset conversation and start fresh query"
                    >
                      <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                      <span>Reset Thread</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.rulingCopyBtn} ${copiedRuling ? styles.rulingCopiedBtn : ''}`}
                      onClick={() => {
                        const allAssistantText = conversationHistory
                          .filter(m => m.role === 'assistant')
                          .map(m => m.text)
                          .join('\n\n---\n\n');
                        handleCopyRuling(allAssistantText || aiResponse?.answer || '');
                      }}
                      title="Copy ruling text"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {copiedRuling ? 'done' : 'content_copy'}
                      </span>
                      <span>{copiedRuling ? 'Copied' : 'Copy Ruling'}</span>
                    </button>
                  </div>
                </div>

                <div className={styles.conversationList}>
                  {conversationHistory.map((msg, idx) => {
                    if (msg.role === 'user') {
                      return (
                        <div key={msg.id || idx} className={styles.threadUserMessage}>
                          <div className={styles.threadUserHeader}>
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                              <span className="text-xs font-bold uppercase tracking-wider text-on-surface">Storyteller Inquiry</span>
                            </div>
                            {msg.timestamp && (
                              <span className="text-xs text-on-surface-variant opacity-70">{msg.timestamp}</span>
                            )}
                          </div>
                          <p className={styles.threadUserText}>{msg.text}</p>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id || idx} className={styles.threadAssistantMessage}>
                        <div className={styles.threadAssistantHeader}>
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-primary">gavel</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">Rule Master Ruling</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {msg.timestamp && (
                              <span className="text-xs text-on-surface-variant opacity-70">{msg.timestamp}</span>
                            )}
                            <button
                              type="button"
                              className={`${styles.msgCopyBtn} ${copiedMsgId === (msg.id || idx) ? styles.msgCopiedBtn : ''}`}
                              onClick={() => handleCopyMessage(msg.text, msg.id || idx)}
                              title={copiedMsgId === (msg.id || idx) ? 'Copied message' : 'Copy message text'}
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {copiedMsgId === (msg.id || idx) ? 'done' : 'content_copy'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {(msg.steps || msg.hypothesis || (msg.quotes && msg.quotes.length > 0)) && (
                          <details className={styles.reasoningDetails}>
                            <summary className={styles.reasoningSummary}>
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px] text-amber-400">psychology</span>
                                <span className={styles.reasoningSummaryTitle}>
                                  Reasoning Process & Verified Quotes {msg.quotes && msg.quotes.length > 0 ? `(${msg.quotes.length} Excerpts)` : ''}
                                </span>
                              </div>
                              <span className={`material-symbols-outlined text-[18px] ${styles.reasoningChevron}`}>
                                expand_more
                              </span>
                            </summary>

                            <div className={styles.reasoningInner}>
                              {msg.steps && msg.steps.length > 0 && (
                                <div className={styles.researchStepsBar}>
                                  <span className={styles.researchStepsLabel}>
                                    <span className="material-symbols-outlined text-[15px] text-green-400">task_alt</span>
                                    Reasoning Loop Complete:
                                  </span>
                                  <div className={styles.stepsPillList}>
                                    {msg.steps.map((st, sIdx) => (
                                      <div key={sIdx} className={styles.stepPill}>
                                        <span className={styles.stepNumber}>{sIdx + 1}</span>
                                        <span>{st}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {msg.hypothesis && (
                                <div className={styles.hypothesisCard}>
                                  <div className={styles.hypothesisHeader}>
                                    <span className="material-symbols-outlined text-[16px] text-amber-400">lightbulb</span>
                                    <span className={styles.hypothesisTitle}>Initial Reasoning Hypothesis</span>
                                  </div>
                                  <p className={styles.hypothesisText}>{msg.hypothesis}</p>
                                </div>
                              )}

                              {msg.quotes && msg.quotes.length > 0 && (
                                <div className={styles.quotesSection}>
                                  <div className={styles.quotesSectionHeader}>
                                    <span className="material-symbols-outlined text-[16px] text-primary">format_quote</span>
                                    <span className={styles.quotesSectionTitle}>Verified Codex Excerpts</span>
                                    <span className={styles.quotesCountBadge}>{msg.quotes.length} Quotes</span>
                                  </div>
                                  <div className={styles.quotesGrid}>
                                    {msg.quotes.map((q, qIdx) => (
                                      <div key={qIdx} className={styles.quoteCard}>
                                        <div className={styles.quoteCardTop}>
                                          <span className={styles.quoteTopic}>{q.topic}</span>
                                          <span className={styles.quoteSource}>{q.source} {q.page ? `p. ${q.page}` : ''}</span>
                                        </div>
                                        <blockquote className={styles.quoteText}>
                                          "{q.quote}"
                                        </blockquote>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </details>
                        )}

                        <div className={styles.ruleMasterAnswerMarkdown}>
                          {renderMarkdownRuling(msg.text)}
                        </div>

                        {msg.citations && msg.citations.length > 0 && (
                          <div className={styles.ruleMasterCitationsBar}>
                            <span className="text-xs uppercase tracking-wider text-on-surface-variant font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">menu_book</span>
                              Cited Sourcebooks:
                            </span>
                            <div className="flex flex-wrap gap-2 items-center">
                              {msg.citations.map((c, cIdx) => {
                                const pdfTarget = `${BOOK_BASE}${c.file || 'Vampire-the-Masquerade-1.pdf'}#page=${c.pdfPage || c.page}`;
                                return (
                                  <div key={cIdx} className={styles.ruleMasterCitationTag}>
                                    <a
                                      href={pdfTarget}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={styles.ruleMasterCitationPdf}
                                      title={`Jump to ${c.book} PDF page ${c.pdfPage || c.page}`}
                                    >
                                      <span className="material-symbols-outlined text-[13px]">auto_stories</span>
                                      <span>{c.book || 'Corebook'} (p. {c.page})</span>
                                    </a>
                                    {c.url && (
                                      <a
                                        href={c.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.ruleMasterCitationWiki}
                                        title={`Open ${c.title} on Paradox Wiki`}
                                      >
                                        <span className="material-symbols-outlined text-[13px]">public</span>
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {aiLoading && conversationHistory.length > 1 && (
                    <div className={styles.followUpThinkingCard}>
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined ${styles.spinIcon} text-[18px] text-primary`}>sync</span>
                        <span className="text-xs font-semibold text-primary">
                          {currentStages[thinkingStage] || 'Consulting V5 archives...'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.followUpStopBtn}
                        onClick={handleStopRuleMaster}
                        title="Stop generating ruling"
                      >
                        <span className="material-symbols-outlined text-[14px]">stop_circle</span>
                        <span>Stop</span>
                      </button>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                <div className={styles.chatFooterArea}>
                  {!aiLoading && conversationHistory.length > 0 && (
                    <div className={styles.quickFollowUpRow}>
                      <span className={styles.quickFollowUpLabel}>
                        <span className="material-symbols-outlined text-[13px] text-primary">psychology_alt</span>
                        Suggested:
                      </span>
                      {[
                        'Contest mechanics & dice pools',
                        'Ending conditions & Exorcism',
                        'Torpor & mortal host differences',
                        'Powers usable through host'
                      ].map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          className={styles.quickFollowUpChip}
                          onClick={() => handleSendFollowUp(null, suggestion)}
                          disabled={aiLoading}
                        >
                          <span className="material-symbols-outlined text-[12px] text-primary">arrow_forward</span>
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <form className={styles.followUpForm} onSubmit={handleSendFollowUp}>
                    <div className={styles.followUpInputContainer}>
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant select-none ml-3">
                        forum
                      </span>
                      <input
                        type="text"
                        value={followUpQuestion}
                        onChange={(e) => setFollowUpQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendFollowUp(e);
                          }
                        }}
                        placeholder="Ask a follow up question or explore edge cases..."
                        className={styles.followUpInput}
                        disabled={aiLoading}
                      />
                      {aiLoading ? (
                        <button
                          type="button"
                          className={styles.followUpStopBtnBar}
                          onClick={handleStopRuleMaster}
                          title="Stop generating ruling"
                        >
                          <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className={styles.followUpSendBtn}
                          disabled={!followUpQuestion.trim()}
                          title="Send follow up inquiry"
                        >
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          <span>Send</span>
                        </button>
                      )}
                    </div>
                    <div className={styles.followUpFooterHint}>
                      <span>Press Enter to send inquiry. History is preserved across turns.</span>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: Sourcebooks and PDFs */}
      {activeTab === 'library' && (
        <section>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className="material-symbols-outlined text-[24px] text-primary">auto_stories</span>
              Official V5 Sourcebooks
            </h2>

            <div className={styles.filterRow}>
              <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mr-1">Filter:</span>
              <button
                type="button"
                className={`${styles.filterBtn} ${libraryFilter === 'all' ? styles.filterBtnActive : ''}`}
                onClick={() => setLibraryFilter('all')}
              >
                All ({BOOKS.length})
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${libraryFilter === 'core' ? styles.filterBtnActive : ''}`}
                onClick={() => setLibraryFilter('core')}
              >
                Core and Guides
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${libraryFilter === 'factions' ? styles.filterBtnActive : ''}`}
                onClick={() => setLibraryFilter('factions')}
              >
                Factions
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${libraryFilter === 'settings' ? styles.filterBtnActive : ''}`}
                onClick={() => setLibraryFilter('settings')}
              >
                Settings and Cults
              </button>
            </div>
          </div>

          <div className={styles.bookGrid}>
            {filteredBooks.map((b) => {
              const meta = BOOK_STYLES[b.label] || { color: '#1a1012', accent: '#baa07b', edition: 'Supplement' };
              const presets = BOOK_QUICK_PRESETS[b.label] || [];
              const currentPageVal = pageInputs[b.file] || '';

              return (
                <div key={b.file || b.label} className={styles.bookCard}>
                  {/* Authentic Sourcebook Cover */}
                  <div
                    className={styles.bookCoverContainer}
                    onClick={() => handleOpenBook(b)}
                    title={`Open ${b.label} in new tab`}
                  >
                    <img
                      src={`/img/books/${b.file.replace(/\.pdf$/i, '.webp')}`}
                      alt={`${b.label} Cover`}
                      className={styles.bookCoverImg}
                      loading="lazy"
                    />

                    <div className={styles.bookCoverOverlayBadge}>
                      <span className={styles.bookCoverEdition} style={{ color: meta.accent }}>{meta.edition}</span>
                      <span className="material-symbols-outlined text-[16px] text-white/90">open_in_new</span>
                    </div>

                    <div className={styles.bookHoverOverlay}>
                      <span className="material-symbols-outlined text-[28px]">open_in_new</span>
                      <span>Open Rulebook</span>
                    </div>
                  </div>

                  {/* Book Controls */}
                  <div className={styles.bookControls}>
                    <div className={styles.bookMetaRow}>
                      <span className={styles.bookLabel} title={b.label}>{b.label}</span>
                      <span className={styles.bookOffset}>
                        {b.offset ? `Offset +${b.offset}` : 'Exact'}
                      </span>
                    </div>

                    {/* Direct Page Jump Input */}
                    <div className={styles.jumpRow}>
                      <input
                        type="number"
                        min="1"
                        placeholder="Page number..."
                        className={styles.pageInput}
                        value={currentPageVal}
                        onChange={(e) => setPageInputs({ ...pageInputs, [b.file]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleJumpPage(b);
                        }}
                      />
                      <button
                        type="button"
                        className={styles.jumpBtn}
                        onClick={() => handleJumpPage(b)}
                        title="Open this specific page in a new tab"
                      >
                        <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                        Go
                      </button>
                      <button
                        type="button"
                        className={styles.pinPageBtn}
                        onClick={() => handlePinBookPage(b)}
                        title="Pin this page to your Pinned Archives"
                      >
                        <span className="material-symbols-outlined text-[16px]">push_pin</span>
                      </button>
                    </div>

                    {/* Quick Presets */}
                    {presets.length > 0 && (
                      <div className={styles.quickPresets}>
                        {presets.map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            className={styles.presetChip}
                            onClick={() => handleOpenBook(b, p.page)}
                            title={`Jump to ${p.label} (Page ${p.page})`}
                          >
                            {p.label}: p. {p.page}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: Multi:Sourcebook Master Index and Navigator */}
      {activeTab === 'corebook_index' && (
        <section>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                <span className="material-symbols-outlined text-[24px] text-primary">format_list_numbered</span>
                Sourcebook Master Index and Navigator
              </h2>
              <p className="text-xs text-on-surface-variant m-0 mt-1">
                Comprehensive mechanics, clans, disciplines, rituals, and loresheets across Corebook, Players Guide, Cults of the Blood Gods, Camarilla, Anarch, and Sabbat.
              </p>
            </div>

            {/* View Mode Switcher */}
            <div className={styles.filterRow}>
              <button
                type="button"
                className={`${styles.filterBtn} ${indexViewMode === 'index' ? styles.filterBtnActive : ''}`}
                onClick={() => setIndexViewMode('index')}
              >
                <span className="material-symbols-outlined text-[16px]">sort_by_alpha</span>
                Alphabetical Index ({filteredSubjectIndex.length})
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${indexViewMode === 'toc' ? styles.filterBtnActive : ''}`}
                onClick={() => setIndexViewMode('toc')}
              >
                <span className="material-symbols-outlined text-[16px]">list</span>
                Table of Contents ({filteredToc.length})
              </button>
            </div>
          </div>

          {/* Sourcebook Selector Bar */}
          <div className="flex gap-1.5 flex-wrap items-center mb-3">
            <span className="text-xs font-bold text-on-surface-variant uppercase mr-1">Filter Book:</span>
            {['ALL', ...SOURCEBOOK_KEYS].map((key) => {
              const meta = SOURCEBOOK_METADATA[key];
              return (
                <button
                  key={key}
                  type="button"
                  className={`${styles.filterBtn} ${selectedSourcebook === key ? styles.filterBtnActive : ''}`}
                  onClick={() => {
                    setSelectedSourcebook(key);
                    if (key !== 'ALL') setTocBook(key);
                  }}
                  style={selectedSourcebook === key && meta ? { borderColor: meta.accent } : {}}
                >
                  {key === 'ALL' ? `All Sourcebooks (${SOURCEBOOKS_SUBJECT_INDEX.length})` : key}
                </button>
              );
            })}
          </div>

          {/* Quick Filter inside Index */}
          <div className="mb-4">
            <input
              type="text"
              placeholder={indexViewMode === 'index' ? 'Filter mechanics, clans, rituals, loresheets, disciplines, or page...' : 'Filter chapters and sections...'}
              className={styles.quickSearchInput}
              value={indexQuery}
              onChange={(e) => setIndexQuery(e.target.value)}
            />
          </div>

          {indexViewMode === 'index' && (
            <div>
              {/* Category Filter Pills */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                {INDEX_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`${styles.filterBtn} ${selectedIndexCategory === cat ? styles.filterBtnActive : ''}`}
                    onClick={() => setSelectedIndexCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Alphabet Letter Selector */}
              <div className={styles.letterFilterBar}>
                <span className="text-xs font-bold text-on-surface-variant uppercase mr-1">Letter:</span>
                {ALPHABET.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    className={`${styles.letterBtn} ${selectedLetter === letter ? styles.letterBtnActive : ''}`}
                    onClick={() => setSelectedLetter(letter)}
                  >
                    {letter}
                  </button>
                ))}
              </div>

              {/* Index Cards Grid */}
              {filteredSubjectIndex.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={`material-symbols-outlined ${styles.emptyStateIcon}`}>search_off</span>
                  <p>No sourcebook index entries match your filter.</p>
                </div>
              ) : (
                <div className={styles.indexGrid}>
                  {filteredSubjectIndex.map((entry, idx) => {
                    const isPinned = pinnedItems.some((p) => p.refId === `sb_${entry.book}_${entry.topic}`);
                    const bookMeta = SOURCEBOOK_METADATA[entry.book];

                    return (
                      <div key={idx} className={styles.indexCard}>
                        <div className={styles.indexCardHeader}>
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className={styles.indexCategory}
                                style={bookMeta?.accent ? { color: bookMeta.accent, borderColor: `${bookMeta.accent}55` } : {}}
                              >
                                {entry.book}
                              </span>
                              <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">
                                {entry.category}
                              </span>
                            </div>
                            <h3 className={styles.indexTopic}>{entry.topic}</h3>
                            <span className={styles.indexSection}>{entry.section}</span>
                          </div>

                          <div className={styles.resultActions}>
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${isPinned ? styles.iconBtnActive : ''}`}
                              onClick={() => handlePinSourcebookEntry(entry)}
                              title={isPinned ? 'Remove from Pinned Board' : 'Pin to Board'}
                            >
                              <span className="material-symbols-outlined text-[18px]">push_pin</span>
                            </button>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              onClick={() => {
                                copyToClipboard(`${entry.topic} (${entry.book}) : Printed p. ${entry.page}, PDF p. ${entry.pdfPage}\n${entry.section}\n${entry.summary}`);
                                notify(`Copied ${entry.topic} reference`);
                              }}
                              title="Copy citation"
                            >
                              <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            </button>
                          </div>
                        </div>

                        <p className={styles.indexSummary}>{entry.summary}</p>

                        <div className={styles.indexFooter}>
                          <span className={styles.pageBadge}>
                            Printed p. {entry.page}, PDF p. {entry.pdfPage}
                          </span>

                          <button
                            type="button"
                            className={styles.jumpBtn}
                            onClick={() => handleJumpPdf(entry.book, entry.pdfPage)}
                            title={`Open ${entry.book} PDF at page ${entry.pdfPage}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            Jump to PDF (p. {entry.pdfPage})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {indexViewMode === 'toc' && (
            <div>
              {/* Select which book's TOC to navigate */}
              <div className="flex gap-2 flex-wrap items-center mb-3">
                <span className="text-xs font-bold text-on-surface-variant uppercase mr-1">Book Table of Contents:</span>
                {SOURCEBOOK_KEYS.map((key) => {
                  const meta = SOURCEBOOK_METADATA[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`${styles.filterBtn} ${tocBook === key ? styles.filterBtnActive : ''}`}
                      onClick={() => setTocBook(key)}
                      style={tocBook === key && meta ? { borderColor: meta.accent } : {}}
                    >
                      {key} ({SOURCEBOOKS_TOC[key]?.length || 0})
                    </button>
                  );
                })}
              </div>

              <div className={styles.tocList}>
                <div className="flex justify-between items-center px-3 py-2 text-xs font-bold text-on-surface-variant uppercase tracking-wider border-b border-white/5">
                  <span>{tocBook} Section Title</span>
                  <span>Page Location</span>
                </div>

                {filteredToc.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className={`material-symbols-outlined ${styles.emptyStateIcon}`}>search_off</span>
                    <p>No table of contents sections match your search.</p>
                  </div>
                ) : (
                  filteredToc.map((item, idx) => {
                    const levelClass = item.level === 1 ? styles.tocLevel1 : item.level === 2 ? styles.tocLevel2 : styles.tocLevel3;

                    return (
                      <div
                        key={idx}
                        className={`${styles.tocRow} ${levelClass}`}
                        onClick={() => handleJumpPdf(tocBook, item.pdfPage)}
                        title={`Jump to ${item.title} (${tocBook} PDF page ${item.pdfPage})`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-primary opacity-70">
                            {item.level === 1 ? 'bookmark' : item.level === 2 ? 'subdirectory_arrow_right' : 'chevron_right'}
                          </span>
                          <span>{item.title}</span>
                        </div>

                        <div className={styles.tocPage}>
                          <span>Printed p. {item.page}</span>
                          <span className="text-white/40">,</span>
                          <span className="text-white">PDF p. {item.pdfPage}</span>
                          <span className="material-symbols-outlined text-[14px] text-primary ml-1">open_in_new</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: Universal Codex Search */}
      {activeTab === 'search' && (
        <section>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className="material-symbols-outlined text-[24px] text-primary">menu_book</span>
              Universal Codex ({searchResults.length} entries)
            </h2>

            <div className={styles.filterRow}>
              {[
                { id: 'all', label: 'All' },
                { id: 'rules', label: 'Rules' },
                { id: 'disciplines', label: 'Disciplines' },
                { id: 'rituals', label: 'Rituals' },
                { id: 'merits', label: 'Merits' },
                { id: 'flaws', label: 'Flaws' },
                { id: 'clans', label: 'Clans' },
                { id: 'wiki', label: 'LARP Wiki' },
                { id: 'sourcebooks', label: 'Sourcebooks Index' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.filterBtn} ${searchCategory === cat.id ? styles.filterBtnActive : ''}`}
                  onClick={() => setSearchCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* External Paradox Wiki Search banner */}
          {globalSearch.trim() && (
            <div className={styles.wikiSearchBanner}>
              <div className={styles.wikiBannerLeft}>
                <span className="material-symbols-outlined text-[20px] text-primary">public</span>
                <span>
                  Search external Paradox Vampire Wiki for: <strong>"{globalSearch.trim()}"</strong>
                </span>
              </div>
              <button
                type="button"
                className={styles.wikiSearchBtn}
                onClick={() => {
                  const pUrl = `https://vtm.paradoxwikis.com/index.php?search=${encodeURIComponent(globalSearch.trim())}`;
                  window.open(pUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Search Paradox Wiki
              </button>
            </div>
          )}

          {searchResults.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={`material-symbols-outlined ${styles.emptyStateIcon}`}>search_off</span>
              <p>No rules, powers, or citations matched your search query.</p>
            </div>
          ) : (
            <div className={styles.searchResultsGrid}>
              {searchResults.map((item, idx) => {
                const isPinned = pinnedItems.some((p) => p.refId === item.id || p.title === item.title);
                const sourceSegments = item.source ? parseSourceString(item.source) : [];

                return (
                  <div key={item.id || idx} className={styles.resultCard}>
                    <div className={styles.resultCardHeader}>
                      <div className={styles.resultCardTitleArea}>
                        <span className={styles.resultCategory}>{item.category}</span>
                        <h3 className={styles.resultTitle}>{item.title}</h3>
                        {(item.cost || item.pool) && (
                          <span className={styles.resultCost}>
                            {item.cost && `Cost: ${item.cost}`}
                            {item.cost && item.pool && ' | '}
                            {item.pool && `Pool: ${item.pool}`}
                          </span>
                        )}
                      </div>

                      <div className={styles.resultActions}>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${isPinned ? styles.iconBtnActive : ''}`}
                          onClick={() => handlePinItem(item)}
                          title={isPinned ? 'Remove from Pinned Board' : 'Pin to Board'}
                        >
                          <span className="material-symbols-outlined text-[18px]">push_pin</span>
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => {
                            copyToClipboard(`${item.title}\n${item.content}`);
                            notify('Copied entry to clipboard');
                          }}
                          title="Copy text"
                        >
                          <span className="material-symbols-outlined text-[18px]">content_copy</span>
                        </button>
                      </div>
                    </div>

                    <p className={styles.resultContent}>{item.content}</p>

                    {/* Direct link for LARP wiki articles */}
                    {item.wikiUrl && item.category === 'wiki' && (
                      <div className={styles.sourceLine}>
                        <span className="material-symbols-outlined text-[16px]">language</span>
                        <span>LARP Wiki:</span>
                        <a
                          href={item.wikiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.sourceLink}
                          title={`Open ${item.title} on Athens Through Time Wiki`}
                        >
                          Open Wiki Article
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </a>
                      </div>
                    )}

                    {/* Direct link for Sourcebook Index and Clan entries */}
                    {item.pdfPage && (
                      <div className={styles.sourceLine}>
                        <span className="material-symbols-outlined text-[16px]">auto_stories</span>
                        <span>{item.book || 'Corebook'} PDF:</span>
                        <a
                          href={`${BOOK_BASE}${(SOURCEBOOK_METADATA[item.book] || bookByName(item.book))?.file || 'Vampire-the-Masquerade-1.pdf'}#page=${item.pdfPage}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.sourceLink}
                          title={`Jump directly to ${item.book || 'Corebook'} PDF page ${item.pdfPage}`}
                        >
                          Jump to PDF Page {item.pdfPage}
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </a>
                      </div>
                    )}

                    {/* Source citations for powers and merits */}
                    {sourceSegments.length > 0 && !item.pdfPage && (
                      <div className={styles.sourceLine}>
                        <span className="material-symbols-outlined text-[16px]">menu_book</span>
                        <span>Source:</span>
                        {sourceSegments.map((seg, sIdx) => (
                          <React.Fragment key={sIdx}>
                            {sIdx > 0 && <span>, </span>}
                            {seg.url ? (
                              <a
                                href={seg.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.sourceLink}
                                title={`Open ${seg.label} Page ${seg.page} in new tab`}
                              >
                                {seg.raw}
                                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                              </a>
                            ) : (
                              <span>{seg.raw}</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    {/* Paradox Wiki Link for Disciplines, Powers, Rituals, Ceremonies, and Clans */}
                    {(item.wikiUrl || item.discipline || item.category === 'disciplines' || item.category === 'rituals' || item.category === 'ceremonies' || item.category === 'clans') && item.category !== 'wiki' && (
                      <div className={styles.sourceLine}>
                        <span className="material-symbols-outlined text-[16px]">public</span>
                        <span>Paradox Wiki:</span>
                        <a
                          href={item.wikiUrl || (
                            item.category === 'ceremonies'
                              ? 'https://vtm.paradoxwikis.com/Oblivion'
                              : item.category === 'rituals'
                              ? 'https://vtm.paradoxwikis.com/Blood_Sorcery'
                              : item.discipline
                              ? `https://vtm.paradoxwikis.com/${item.discipline.replace(/\s+/g, '_')}`
                              : `https://vtm.paradoxwikis.com/${item.title.replace(/\s+/g, '_')}`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.sourceLink}
                          title="Open official Paradox Wiki page"
                        >
                          Open Paradox Wiki
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: Pinned Archives */}
      {activeTab === 'pins' && (
        <section>
          <div className={styles.pinnedHeader}>
            <div className={styles.pinnedSummary}>
              <span className="material-symbols-outlined text-[24px] text-primary">push_pin</span>
              <div>
                <strong>Storyteller Pinned Board</strong>
                <div className="text-xs text-on-surface-variant">
                  {pinnedItems.length} active bookmark{pinnedItems.length === 1 ? '' : 's'} saved across browser sessions
                </div>
              </div>
            </div>

            <div className={styles.pinnedControls}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => setShowAddPinModal(!showAddPinModal)}
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Bookmark
              </button>
              {pinnedItems.length > 0 && (
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => {
                    const text = pinnedItems.map((p) => `${p.title}: ${p.url || p.content || p.note || ''}`).join('\n\n');
                    copyToClipboard(text);
                    notify('Copied all bookmarks');
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  Copy All
                </button>
              )}
            </div>
          </div>

          {/* Modal / Form to add custom bookmark */}
          {showAddPinModal && (
            <form onSubmit={handleCreateCustomPin} className={styles.addPinForm}>
              <h3 className="text-base font-bold text-primary m-0 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">bookmark_add</span>
                New Custom Sourcebook Bookmark
              </h3>

              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Select Book</label>
                  <select
                    className={styles.formInput}
                    value={newPinBook}
                    onChange={(e) => setNewPinBook(e.target.value)}
                  >
                    {BOOKS.map((b) => (
                      <option key={b.label} value={b.label}>{b.label}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Page Number</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 338"
                    className={styles.formInput}
                    value={newPinPage}
                    onChange={(e) => setNewPinPage(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Custom Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Frenzy and Resistance Rules"
                    className={styles.formInput}
                    value={newPinTitle}
                    onChange={(e) => setNewPinTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Session Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Important for upcoming combat scene with elder"
                  className={styles.formInput}
                  value={newPinNote}
                  onChange={(e) => setNewPinNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => setShowAddPinModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                >
                  Save to Board
                </button>
              </div>
            </form>
          )}

          {pinnedItems.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={`material-symbols-outlined ${styles.emptyStateIcon}`}>push_pin</span>
              <p>Your pinned board is empty.</p>
              <p className="text-xs max-w-md">
                Pin down specific PDF pages by typing a page number below any book cover and clicking the pin icon, or pin any rules, disciplines, or merits from the search codex.
              </p>
            </div>
          ) : (
            <div className={styles.pinnedGrid}>
              {pinnedItems.map((pin) => (
                <div key={pin.id} className={styles.pinCard}>
                  <div className={styles.pinCardHeader}>
                    <div>
                      <span className={styles.pinTypeBadge}>{pin.type || 'Bookmark'}</span>
                      <h3 className={styles.pinTitle}>{pin.title}</h3>
                    </div>

                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => handleRemovePin(pin.id)}
                      title="Remove bookmark"
                    >
                      <span className="material-symbols-outlined text-[16px] text-error">delete</span>
                    </button>
                  </div>

                  {pin.content && <p className={styles.resultContent}>{pin.content}</p>}
                  {pin.note && <p className={styles.pinNote}>{pin.note}</p>}

                  <div className={styles.pinFooter}>
                    {pin.url ? (
                      <a
                        href={pin.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.sourceLink}
                      >
                        <span className="material-symbols-outlined text-[16px]">menu_book</span>
                        Open in New Tab
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                      </a>
                    ) : (
                      <span className="text-xs text-on-surface-variant">Archived reference</span>
                    )}

                    <span className="text-[11px] text-on-surface-variant font-mono">
                      {pin.createdAt ? new Date(pin.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 4: Clans and Banes Matrix */}
      {activeTab === 'clans' && (
        <section>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className="material-symbols-outlined text-[24px] text-primary">shield</span>
              Clans, Banes, and Compulsions
            </h2>
          </div>

          <div className={styles.searchResultsGrid}>
            {Object.entries(CLAN_REFERENCE).map(([clanName, clanInfo]) => {
              const clanMeta = CLANS_LEXICON.find((c) => c.name.toLowerCase() === clanName.toLowerCase()) || {
                book: clanInfo.book || 'Corebook',
                page: 65,
                pdfPage: 67,
                file: 'Vampire-the-Masquerade-1.pdf',
                url: `https://vtm.paradoxwikis.com/${clanName.replace(/\s+/g, '_')}`
              };
              const pdfLink = `${BOOK_BASE}${clanMeta.file}#page=${clanMeta.pdfPage}`;
              const wikiLink = clanMeta.url;

              return (
                <div key={clanName} className={styles.resultCard}>
                  <div className={styles.resultCardHeader}>
                    <div className="flex items-center gap-3">
                      <img
                        src={`/img/clans/white/330px-${clanName.replace(/\s+/g, '_')}_symbol_white.webp`}
                        alt={clanName}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        className="w-8 h-8 object-contain opacity-80"
                      />
                      <div>
                        <span className={styles.resultCategory}>V5 Clan</span>
                        <h3 className={styles.resultTitle}>{clanName}</h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => {
                        copyToClipboard(`${clanName}\nBane: ${clanInfo.bane}\nCompulsion: ${clanInfo.compulsion}`);
                        notify(`Copied ${clanName} rules`);
                      }}
                      title="Copy rules"
                    >
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    </button>
                  </div>

                  <div className={styles.resultContent}>
                    <div className="mb-2">
                      <strong className="text-primary block text-xs uppercase tracking-wider mb-0.5">Bane:</strong>
                      {clanInfo.bane}
                    </div>
                    <div>
                      <strong className="text-primary block text-xs uppercase tracking-wider mb-0.5">Compulsion:</strong>
                      {clanInfo.compulsion}
                    </div>
                  </div>

                  <div className={styles.sourceLine} style={{ marginTop: '0.25rem' }}>
                    <span className="material-symbols-outlined text-[16px]">menu_book</span>
                    <a
                      href={pdfLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.sourceLink}
                      title={`Open ${clanName} in ${clanMeta.book} PDF page ${clanMeta.page}`}
                    >
                      {clanMeta.book} PDF (p. {clanMeta.page})
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </a>

                    <span className="text-on-surface-variant mx-1">:</span>

                    <span className="material-symbols-outlined text-[16px]">public</span>
                    <a
                      href={wikiLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.sourceLink}
                      title={`Open ${clanName} on Paradox Wiki`}
                    >
                      Paradox Wiki
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Integrated Grand Lexicon: Disciplines and Clans Quick Reference */}
      <section className={styles.lexiconSection} id="wiki-quick-reference" aria-label="Official Paradox Wiki Quick Reference">
        <div className={styles.lexiconHeader}>
          <div className={styles.lexiconTitleArea}>
            <span className={styles.badge}>
              <span className="material-symbols-outlined text-[14px]">public</span>
              External Codex & Sourcebook Library
            </span>
            <h2 className={styles.lexiconTitle}>
              <span className="material-symbols-outlined text-[24px] text-primary">auto_stories</span>
              Paradox Wiki & Sourcebook Lexicon
            </h2>
            <p className={styles.lexiconSubtitle}>
              Dual action quick references for all official V5 disciplines and clans: direct links to official Paradox Wiki articles and verified sourcebook PDF pages.
            </p>
          </div>
          <div className={styles.lexiconHeaderActions}>
            <a
              href="https://vtm.paradoxwikis.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.lexiconMainBtn}
              title="Open Paradox Vampire Wiki Homepage"
            >
              <span>Main Paradox Wiki</span>
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
            </a>
          </div>
        </div>

        {/* Disciplines Grid */}
        <div className={styles.lexiconBlock}>
          <div className={styles.lexiconBlockHeader}>
            <span className="material-symbols-outlined text-[18px] text-primary">psychology</span>
            <h3 className={styles.lexiconBlockTitle}>V5 Disciplines (12)</h3>
          </div>
          <div className={styles.disciplinesGrid}>
            {DISCIPLINES_LEXICON.map((disc) => (
              <div key={disc.name} className={styles.lexiconCard}>
                <div className={styles.lexiconCardTop}>
                  <div className={styles.lexiconIconBox}>
                    <img
                      src={disc.icon}
                      alt={disc.name}
                      className={styles.disciplineIconImg}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.lexiconCardInfo}>
                    <span className={styles.lexiconCardName}>{disc.name}</span>
                    <span className={styles.lexiconBookRef}>{disc.book}</span>
                  </div>
                </div>
                <div className={styles.lexiconCardActions}>
                  <a
                    href={disc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.lexiconActionBtn}
                    title={`Open ${disc.name} on Paradox Wiki`}
                  >
                    <span>Wiki</span>
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </a>
                  <a
                    href={`${BOOK_BASE}${disc.file}#page=${disc.pdfPage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.lexiconPdfBtn}
                    title={`Open ${disc.name} in ${disc.book} PDF (p. ${disc.page})`}
                  >
                    <span>p. {disc.page}</span>
                    <span className="material-symbols-outlined text-[12px]">menu_book</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clans Grid */}
        <div className={styles.lexiconBlock}>
          <div className={styles.lexiconBlockHeader}>
            <span className="material-symbols-outlined text-[18px] text-primary">shield</span>
            <h3 className={styles.lexiconBlockTitle}>V5 Clans and Lineages (16)</h3>
          </div>
          <div className={styles.clansLexiconGrid}>
            {CLANS_LEXICON.map((clan) => (
              <div key={clan.name} className={styles.lexiconCard}>
                <div className={styles.lexiconCardTop}>
                  <div className={styles.lexiconIconBox}>
                    <img
                      src={clan.icon}
                      alt={clan.name}
                      className={styles.clanIconImg}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.lexiconCardInfo}>
                    <span className={styles.lexiconCardName}>{clan.name}</span>
                    <span className={styles.lexiconBookRef}>{clan.book}</span>
                  </div>
                </div>
                <div className={styles.lexiconCardActions}>
                  <a
                    href={clan.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.lexiconActionBtn}
                    title={`Open ${clan.name} on Paradox Wiki`}
                  >
                    <span>Wiki</span>
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </a>
                  <a
                    href={`${BOOK_BASE}${clan.file}#page=${clan.pdfPage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.lexiconPdfBtn}
                    title={`Open ${clan.name} in ${clan.book} PDF (p. ${clan.page})`}
                  >
                    <span>p. {clan.page}</span>
                    <span className="material-symbols-outlined text-[12px]">menu_book</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
