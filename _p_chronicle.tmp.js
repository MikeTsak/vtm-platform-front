module.exports = [
  {
    file: 'src/features/admin/AdminFeedingTab.jsx',
    edits: [
      [`<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: themeColor, boxShadow: \`0 0 15px \${themeColor}\` }} />
              <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-color)' }}>Feeding Gate</h3>`,
       `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: themeColor, boxShadow: \`0 0 15px \${themeColor}\`, flexShrink: 0 }} />
              <h3 style={{ margin: 0, fontSize: 'clamp(1.05rem, 4vw, 1.4rem)', color: 'var(--text-color)' }}>Feeding Gate</h3>`],
      [`<div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaGlyph icon={FEEDING_ICONS.droplet} size={16} style={{ color: '#7ecfff' }} />`,
       `<div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <FaGlyph icon={FEEDING_ICONS.droplet} size={16} style={{ color: '#7ecfff' }} />`],
      [`<div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>`,
       `<div className={styles.rTable}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>`],
      [`<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button style={{ ...btnBase, padding: '0.3rem 0.75rem', fontSize: '1.1rem', lineHeight: 1 }}`,
       `<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button style={{ ...btnBase, padding: '0.3rem 0.75rem', fontSize: '1.1rem', lineHeight: 1 }}`],
      [`<div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>`,
       `<div className={styles.rTable}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>`],
    ],
  },
  {
    file: 'src/features/admin/AdminDomainsTab.jsx',
    edits: [
      [`<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>`,
       `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>`],
      [`<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* DOMAINS LIST */}`,
       `<div className={styles.rGrid2} style={{ gap: '2rem' }}>
        {/* DOMAINS LIST */}`],
      [`<form onSubmit={addCustomProblem} style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
            <select className={styles.input} value={customDom} onChange={e => setCustomDom(e.target.value)} required>`,
       `<form onSubmit={addCustomProblem} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
            <select className={styles.input} value={customDom} onChange={e => setCustomDom(e.target.value)} required style={{ flex: '1 1 160px', minWidth: 0 }}>`],
      [`<input type="text" className={styles.input} placeholder="Problem description" value={customText} onChange={e => setCustomText(e.target.value)} required style={{ flex: 1 }} />`,
       `<input type="text" className={styles.input} placeholder="Problem description" value={customText} onChange={e => setCustomText(e.target.value)} required style={{ flex: '2 1 200px', minWidth: 0 }} />`],
      [`<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: p.resolved ? 'var(--text-muted)' : 'var(--text-primary)' }}>{dName}</div>`,
       `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 'bold', color: p.resolved ? 'var(--text-muted)' : 'var(--text-primary)' }}>{dName}</div>`],
      [`<button className={styles.btnSmall} style={{ background: 'var(--glass-bg)' }} onClick={() => resolveProblem(p.id)}>Resolve</button>`,
       `<button className={\`\${styles.btn} \${styles.btnSmall}\`} style={{ flexShrink: 0 }} onClick={() => resolveProblem(p.id)}>Resolve</button>`],
    ],
  },
  {
    file: 'src/features/admin/AdminCoteriesTab.jsx',
    edits: [
      [`<div style={{ display: coteries.length > 0 ? 'grid' : 'none', gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>`,
       `<div className={styles.rGraphLayout} style={{ display: coteries.length > 0 ? 'grid' : 'none' }}>`],
      [`<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {coteries.map(c => {`,
       `<div className={styles.rGraphSide} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {coteries.map(c => {`],
      [`<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Chasse: {c.chasse || 0}</span>`,
       `<div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px 10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Chasse: {c.chasse || 0}</span>`],
      [`<div 
            ref={containerRef} 
            style={{ 
              width: '100%', 
              height: '600px', 
              background: 'var(--glass-bg)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px',
              overflow: 'hidden'
            }} 
          />

        </div>`,
       `<div 
            ref={containerRef} 
            className={styles.rGraphCanvas}
            style={{ 
              width: '100%', 
              background: 'var(--glass-bg)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px',
              overflow: 'hidden'
            }} 
          />

        </div>`],
    ],
  },
  {
    file: 'src/features/admin/AdminPrestationTab.jsx',
    edits: [
      [`<div style={{ display: boons.length > 0 ? 'grid' : 'none', gridTemplateColumns: '1fr 3fr', gap: '2rem' }}>
          <div style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>`,
       `<div className={styles.rGraphLayout} style={{ display: boons.length > 0 ? 'grid' : 'none' }}>
          <div className={styles.rGraphSide} style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', overflowY: 'auto' }}>`],
      [`<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {ranked.map(r => (`,
       `<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
              {ranked.map(r => (`],
      [`<div 
            ref={containerRef} 
            style={{ 
              width: '100%', 
              height: '600px', 
              background: 'var(--glass-bg)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px',
              overflow: 'hidden'
            }} 
          />
        </div>`,
       `<div 
            ref={containerRef} 
            className={styles.rGraphCanvas}
            style={{ 
              width: '100%', 
              background: 'var(--glass-bg)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '8px',
              overflow: 'hidden'
            }} 
          />
        </div>`],
    ],
  },
  {
    file: 'src/features/admin/AdminEventsTab.jsx',
    edits: [
      [`<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label className={styles.labeledInput}>
              <span>Event Title</span>`,
       `<div className={styles.rGrid2} style={{ gap: '1rem' }}>
            <label className={styles.labeledInput}>
              <span>Event Title</span>`],
      [`<div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '1rem 1.5rem', boxShadow: 'var(--glass-shadow)' }}>
                <div>`,
       `<div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', boxShadow: 'var(--glass-shadow)' }}>
                <div style={{ minWidth: 0 }}>`],
      [`<button type="button" onClick={() => handleDelete(ev.id)} className={styles.btnSmall} style={{ background: 'rgba(255,82,82,0.1)', color: '#ff5252', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 'var(--radius-sm)' }}>`,
       `<button type="button" onClick={() => handleDelete(ev.id)} className={\`\${styles.btn} \${styles.btnDanger} \${styles.btnSmall}\`} style={{ flexShrink: 0 }}>`],
    ],
  },
];
