module.exports = [
  {
    file: 'src/features/admin/ChatStatsTab.jsx',
    edits: [
      [`<div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            value={customTitle} 
            onChange={e => setCustomTitle(e.target.value)} 
            placeholder="Custom Export Title..."
            className={styles.input}
            style={{ width: '220px', margin: 0 }}
          />`,
       `<div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', flex: '1 1 320px', justifyContent: 'flex-end' }}>
          <input 
            type="text" 
            value={customTitle} 
            onChange={e => setCustomTitle(e.target.value)} 
            placeholder="Custom Export Title..."
            className={styles.input}
            style={{ flex: '1 1 180px', maxWidth: '260px', margin: 0 }}
          />`],
      [`<div style={{ display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: isExporting ? 'center' : 'flex-start', background: 'rgba(20, 20, 24, 0.7)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', width: '100%', boxSizing: 'border-box' }}>`,
       `<div style={{ display: 'flex', flexWrap: isExporting ? 'nowrap' : 'wrap', gap: '2rem', alignItems: 'center', justifyContent: isExporting ? 'center' : 'flex-start', background: 'rgba(20, 20, 24, 0.7)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', width: '100%', boxSizing: 'border-box' }}>`],
      [`<div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: isExporting ? 'none' : '180px', overflowY: isExporting ? 'visible' : 'auto', paddingRight: '0.5rem', flex: 1, minWidth: 0 }}>`,
       `<div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: isExporting ? 'none' : '180px', overflowY: isExporting ? 'visible' : 'auto', paddingRight: '0.5rem', flex: '1 1 200px', minWidth: 0 }}>`],
    ],
  },
];
