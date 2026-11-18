module.exports = [
  {
    file: 'src/features/admin/AdminChatLogsTab.jsx',
    edits: [
      [`import { symlogo, CLAN_HEX as CLAN_COLORS } from '../../data/clans';`,
       `import { symlogo, CLAN_HEX as CLAN_COLORS } from '../../data/clans';
import { useIsMobile } from '../../utils/useMediaQuery';`],
      [`  const handleModeChange = (m) => {
    setViewMode(m);
    setSelectedNpc(null); setSelectedConversationKey(null); setSelectedGroup(null);
    setNpcSearch(''); setDirectSearch(''); setGroupSearch('');
  };

  return (
    <div style={{ display: 'flex', height: '78vh', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', overflow: 'hidden', boxShadow: 'var(--glass-shadow)' }}>
      
      {/* SIDEBAR: LISTS */}
      <aside style={{ width: '380px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--glass-border)' }}>`,
       `  const handleModeChange = (m) => {
    setViewMode(m);
    setSelectedNpc(null); setSelectedConversationKey(null); setSelectedGroup(null);
    setNpcSearch(''); setDirectSearch(''); setGroupSearch('');
  };

  // Phones show a single pane at a time: list → (NPC threads) → messages, with back buttons.
  const isMobile = useIsMobile();
  const hasThread = (viewMode === 'direct' && !!selectedConversationKey)
    || (viewMode === 'npc' && !!selectedNpcConversation)
    || (viewMode === 'group' && !!selectedGroup);
  const stage = !isMobile ? 'all' : hasThread ? 'messages' : (viewMode === 'npc' && selectedNpc ? 'convos' : 'list');
  const showListPane = stage === 'all' || stage === 'list';
  const showConvoPane = viewMode === 'npc' && (stage === 'all' || stage === 'convos');
  const showMainPane = stage === 'all' || stage === 'messages';
  const backFromMessages = () => {
    if (viewMode === 'direct') setSelectedConversationKey(null);
    else if (viewMode === 'npc') setSelectedNpcConversation(null);
    else setSelectedGroup(null);
  };

  return (
    <div className={styles.chatShell}>
      
      {/* SIDEBAR: LISTS */}
      <aside className={showListPane ? '' : styles.rPaneHidden} style={{ width: isMobile ? '100%' : '380px', display: 'flex', flexDirection: 'column', borderRight: isMobile ? 'none' : '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', flexShrink: 0, minHeight: 0 }}>
        <div style={{ padding: 'clamp(0.9rem, 3vw, 1.5rem)', display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--glass-border)' }}>`],
      [`      {/* MIDDLE: NPC CONVOS */}
      {viewMode === 'npc' && (
        <aside style={{ width: '320px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.45)', flexShrink: 0 }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
            <input `,
       `      {/* MIDDLE: NPC CONVOS */}
      {showConvoPane && (
        <aside style={{ width: isMobile ? '100%' : '320px', display: 'flex', flexDirection: 'column', borderRight: isMobile ? 'none' : '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.45)', flexShrink: 0, minHeight: 0 }}>
          <div style={{ padding: 'clamp(0.9rem, 3vw, 1.5rem)', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isMobile && selectedNpc && (
              <button type="button" className={\`\${styles.btn} \${styles.btnGhost} \${styles.btnSmall}\`} style={{ alignSelf: 'flex-start', marginLeft: '-8px' }} onClick={() => setSelectedNpc(null)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">arrow_back</span> NPCs · <b style={{ color: CLAN_COLORS[selectedNpc.clan] || 'inherit' }}>{selectedNpc.name}</b>
              </button>
            )}
            <input `],
      [`      {/* MAIN: MESSAGES */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--glass-inset)' }}>
        {viewMode === 'direct' && selectedConversationKey && (
          <MessagePanel messages={currentMessages} participants={currentParticipants} mode="direct" />
        )}`,
       `      {/* MAIN: MESSAGES */}
      <main className={showMainPane ? '' : styles.rPaneHidden} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, background: 'var(--glass-inset)' }}>
        {viewMode === 'direct' && selectedConversationKey && (
          <MessagePanel messages={currentMessages} participants={currentParticipants} mode="direct" onBack={isMobile ? backFromMessages : null} />
        )}`],
      [`            mode="npc" loading={loading.thread}
          />`,
       `            mode="npc" loading={loading.thread}
            onBack={isMobile ? backFromMessages : null}
          />`],
      [`            mode="group" loading={loading.groupThread}
          />`,
       `            mode="group" loading={loading.groupThread}
            onBack={isMobile ? backFromMessages : null}
          />`],
      [`function MessagePanel({ messages, participants, loading, mode }) { `,
       `function MessagePanel({ messages, participants, loading, mode, onBack }) { `],
      [`      const c1 = participants.user1Clan; const c2 = participants.user2Clan;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', fontWeight: 800 }}>`,
       `      const c1 = participants.user1Clan; const c2 = participants.user2Clan;
      return (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 10px', fontSize: 'clamp(1rem, 3.5vw, 1.25rem)', fontWeight: 800, minWidth: 0 }}>`],
      [`    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', fontWeight: 800 }}>
        <span style={{color: CLAN_COLORS[participants.npcClan] || 'var(--text-color)'}}>{participants.npc}</span>`,
       `    return (
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 10px', fontSize: 'clamp(1rem, 3.5vw, 1.25rem)', fontWeight: 800, minWidth: 0 }}>
        <span style={{color: CLAN_COLORS[participants.npcClan] || 'var(--text-color)'}}>{participants.npc}</span>`],
      [`      <div style={{ display: 'flex', padding: '1.5rem', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--glass-border)', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 10 }}>
        {getHeaderTitle()}
        <button className={styles.aiButton} onClick={handleSummarize} disabled={aiLoading || !messages || messages.length === 0}>`,
       `      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: 'clamp(0.75rem, 3vw, 1.5rem)', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--glass-border)', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 10 }}>
        {onBack && (
          <button type="button" className={\`\${styles.btn} \${styles.btnGhost} \${styles.btnSmall}\`} style={{ flexBasis: '100%', alignSelf: 'flex-start', justifyContent: 'flex-start', marginLeft: '-8px' }} onClick={onBack}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">arrow_back</span> Back to threads
          </button>
        )}
        {getHeaderTitle()}
        <button className={\`\${styles.btn} \${styles.aiButton}\`} onClick={handleSummarize} disabled={aiLoading || !messages || messages.length === 0}>`],
      [`      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading && <div className={styles.loading}><span className={styles.spinner} /> Extracting transmission stream...</div>}`,
       `      <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(0.75rem, 3vw, 2rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading && <div className={styles.loading}><span className={styles.spinner} /> Extracting transmission stream...</div>}`],
    ],
  },
];
