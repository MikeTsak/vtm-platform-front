module.exports = [
  {
    file: 'src/features/admin/AdminDowntimesTab.jsx',
    edits: [
      // View-mode switcher: let it wrap / stretch on phones
      [`<div style={{ display: 'flex', gap: '0.8rem', background: 'var(--glass-inset)', padding: '5px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', width: 'fit-content' }}>`,
       `<div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', background: 'var(--glass-inset)', padding: '5px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', width: 'fit-content', maxWidth: '100%' }}>`],
      // Config panel padding
      [`<section className={styles.editorSection} style={{ borderTop: \`4px solid \${viewMode === 'project' ? '#4da6ff' : 'var(--accent-purple)'}\`, background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--glass-shadow)' }}>`,
       `<section className={styles.editorSection} style={{ borderTop: \`4px solid \${viewMode === 'project' ? '#4da6ff' : 'var(--accent-purple)'}\` }}>`],
      // Deadline grid
      [`<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {viewMode === 'standard' ? (`,
       `<div className={styles.rGrid2}>
          {viewMode === 'standard' ? (`],
      // Mass release inner panel padding
      [`<div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--glass-shadow)', marginTop: '2rem' }}>`,
       `<div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: 'clamp(1rem, 3vw, 2rem)', boxShadow: 'var(--glass-shadow)', marginTop: '2rem' }}>`],
      [`<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>`,
       `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>`],
      [`<h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-color)' }}>Mass Release Mode</h3>`,
       `<h3 style={{ margin: 0, fontSize: 'clamp(1.05rem, 4vw, 1.4rem)', color: 'var(--text-color)' }}>Mass Release Mode</h3>`],
      // Config buttons row
      [`<div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
          <button className={\`\${styles.btn} \${styles.btnSecondary}\`} onClick={onReloadConfig}>Reset Configuration</button>`,
       `<div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
          <button className={\`\${styles.btn} \${styles.btnSecondary}\`} onClick={onReloadConfig}>Reset Configuration</button>`],
      // List panel padding
      [`<section className={styles.editorSection} style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', padding: '2rem', boxShadow: 'var(--glass-shadow)' }}>`,
       `<section className={styles.editorSection}>`],
      // Search / status grid
      [`<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'end', marginBottom: '1.5rem' }}>`,
       `<div className={styles.rMainSide} style={{ alignItems: 'end', marginBottom: '1.5rem' }}>`],
      [`<div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button className={\`\${styles.btn} \${styles.btnSecondary}\`} onClick={() => { setQ(''); setStatusFilter('all'); }}>Clear Filters</button>`,
       `<div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem' }}>
          <button className={\`\${styles.btn} \${styles.btnSecondary}\`} onClick={() => { setQ(''); setStatusFilter('all'); }}>Clear Filters</button>`],
      // Group header
      [`<header style={{ padding: '1.25rem 1.5rem', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ width: '44px', height: '44px',`,
       `<header style={{ padding: '1rem 1.25rem', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ flexShrink: 0, width: '44px', height: '44px',`],
      [`<div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-color)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{group.char_name || '(No Character)'}</span>`,
       `<div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-color)', textShadow: '0 2px 4px rgba(0,0,0,0.5)', overflowWrap: 'anywhere' }}>{group.char_name || '(No Character)'}</span>`],
      // Compact row → responsive grid class
      [`className={styles.downtimeCompactRow}
        style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '1.5rem', padding: '1.2rem 1.5rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: 'transparent', transition: 'all 0.2s ease' }}`,
       `className={\`\${styles.downtimeCompactRow} \${styles.downtimeRowGrid}\`}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: 'transparent', transition: 'all 0.2s ease' }}`],
      [`<div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          <b style={{ color: 'var(--accent-purple)', fontFamily: 'Fira Code, monospace', marginRight: '10px' }}>#{r.id}</b> {displayTitle}
        </div>`,
       `<div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', minWidth: 0, overflowWrap: 'anywhere' }}>
          <b style={{ color: 'var(--accent-purple)', fontFamily: 'Fira Code, monospace', marginRight: '10px' }}>#{r.id}</b> {displayTitle}
        </div>`],
      // Editor card margins
      [`style={{ background: 'var(--glass-inset)', border: '1px solid var(--glass-border)', padding: '1.5rem', margin: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)', borderLeft: \`4px solid \${isProj ? '#4da6ff' : 'var(--accent-purple)'}\` }}`,
       `style={{ background: 'var(--glass-inset)', border: '1px solid var(--glass-border)', padding: 'clamp(0.9rem, 3vw, 1.5rem)', margin: 'clamp(0.5rem, 2vw, 1.25rem)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)', borderLeft: \`4px solid \${isProj ? '#4da6ff' : 'var(--accent-purple)'}\` }}`],
      [`<div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Account:`,
       `<div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Account:`],
      // GM notes grid
      [`<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <label className={styles.labeledInput}>
            <span>GM Internal Notes</span>`,
       `<div className={styles.rGrid2}>
          <label className={styles.labeledInput}>
            <span>GM Internal Notes</span>`],
      // Status / quick actions grid
      [`<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', background: 'var(--glass-bg)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>`,
       `<div className={styles.rGrid2} style={{ background: 'var(--glass-bg)', padding: 'clamp(0.9rem, 3vw, 1.5rem)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>`],
      // Footer row
      [`<div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
          <button className={\`\${styles.btn} \${styles.btnSecondary}\`} onClick={() => onCancel(r.id)} disabled={b.saving}>Close</button>`,
       `<div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
          <button className={\`\${styles.btn} \${styles.btnSecondary}\`} onClick={() => onCancel(r.id)} disabled={b.saving}>Close</button>`],
    ],
  },
];
