module.exports = [
  {
    file: 'src/features/admin/Admin.jsx',
    edits: [
      [`import { formatEuDate } from '../../utils/dateFormatter';`,
       `import { formatEuDate } from '../../utils/dateFormatter';
import { useMediaQuery, ADMIN_MOBILE_BREAKPOINT as MOBILE_BREAKPOINT } from '../../utils/useMediaQuery';`],
      [`const DEFAULT_TAB = 'home';
const MOBILE_BREAKPOINT = 900;
const NAV_STORAGE_KEY`,
       `const DEFAULT_TAB = 'home';
const NAV_STORAGE_KEY`],
      [`/* ---------------- Small hooks ---------------- */
function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, [query]);
  return matches;
}

function useClickOutside`,
       `/* ---------------- Small hooks ---------------- */
function useClickOutside`],
    ],
  },
  {
    file: 'src/features/admin/AdminNpcEmailTab.jsx',
    edits: [
      [`import { sanitizeHtml } from '../../utils/sanitizeHtml';`,
       `import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { useIsMobile } from '../../utils/useMediaQuery';`],
      [`  const messagesEndRef = useRef(null);

  const loadIdentities`,
       `  const messagesEndRef = useRef(null);
  const isMobile = useIsMobile();
  // Phones show either the inbox list or the open thread, never both side by side.
  const showList = !isMobile || !selectedThreadId;
  const showDetail = !isMobile || !!selectedThreadId;

  const loadIdentities`],
      [`<div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--glass-shadow)' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-color)', margin: 0 }}>Email Identities</h3>`,
       `<div className={styles.adminCard}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-color)', margin: 0 }}>Email Identities</h3>`],
      [`<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', alignItems: 'start' }}>`,
       `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: '2rem', alignItems: 'start' }}>`],
      [`<button className={styles.btnPrimary} style={{ width: '100%', padding: '0.6rem' }} disabled={isSubmitting}>`,
       `<button className={\`\${styles.btn} \${styles.btnPrimary}\`} style={{ width: '100%', padding: '0.6rem' }} disabled={isSubmitting}>`],
      [`<td><button className={styles.btnDanger} style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }} onClick={() => handleDeleteIdentity(id.id)}>Delete</button></td>`,
       `<td><button className={\`\${styles.btn} \${styles.btnDanger} \${styles.btnSmall}\`} onClick={() => handleDeleteIdentity(id.id)}>Delete</button></td>`],
      [`<div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '620px', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--glass-shadow)' }}>
        {/* Inbox Left List Track */}
        <div style={{ borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)' }}>`,
       `<div className={\`\${styles.masterDetail} \${isMobile && selectedThreadId ? styles.masterDetailShowDetail : ''}\`}>
        {/* Inbox Left List Track */}
        <div className={showList ? '' : styles.rPaneHidden} style={{ borderRight: isMobile ? 'none' : '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', minHeight: 0 }}>`],
      [`{/* Content Panel Right Wire Track */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--glass-inset)' }}>
          {selectedThreadId && activeThread ? (
            <>
              <div style={{ padding: '1.25rem 2rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--glass-border)' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-color)' }}>{activeThread.subject}</h3>`,
       `{/* Content Panel Right Wire Track */}
        <div className={showDetail ? '' : styles.rPaneHidden} style={{ display: 'flex', flexDirection: 'column', background: 'var(--glass-inset)', minHeight: 0, minWidth: 0 }}>
          {selectedThreadId && activeThread ? (
            <>
              <div style={{ padding: 'clamp(0.9rem, 3vw, 1.25rem) clamp(1rem, 4vw, 2rem)', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--glass-border)' }}>
                <button type="button" className={\`\${styles.btn} \${styles.btnGhost} \${styles.btnSmall} \${styles.rBackBtn}\`} style={{ marginBottom: '8px', marginLeft: '-8px' }} onClick={() => setSelectedThreadId(null)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">arrow_back</span> Inbox
                </button>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-color)', overflowWrap: 'anywhere' }}>{activeThread.subject}</h3>`],
      [`<div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>`,
       `<div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(0.9rem, 3vw, 2rem)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>`],
      [`<div key={i} style={{ alignSelf: isIdentity ? 'flex-end' : 'flex-start', maxWidth: '80%', display: 'flex',`,
       `<div key={i} style={{ alignSelf: isIdentity ? 'flex-end' : 'flex-start', maxWidth: isMobile ? '96%' : '80%', display: 'flex',`],
      [`<div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                <TextEditor`,
       `<div style={{ padding: 'clamp(0.9rem, 3vw, 1.5rem) clamp(0.9rem, 3vw, 2rem)', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                <TextEditor`],
      [`<button className={styles.btnPrimary} onClick={handleReply} disabled={!reply.trim()}>Send Reply</button>`,
       `<button className={\`\${styles.btn} \${styles.btnPrimary}\`} onClick={handleReply} disabled={!reply.trim()}>Send Reply</button>`],
    ],
  },
];
