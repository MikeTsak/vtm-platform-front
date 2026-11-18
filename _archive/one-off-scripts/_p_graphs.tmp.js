const heightEdits = [
  [`    const height = 600;`, `    const height = containerRef.current.clientHeight || 600;`],
  [`      graph.changeSize(containerRef.current.scrollWidth, 600);`,
   `      graph.changeSize(containerRef.current.scrollWidth, containerRef.current.clientHeight || 600);`],
];

module.exports = [
  { file: 'src/features/admin/AdminCoteriesTab.jsx', edits: heightEdits },
  { file: 'src/features/admin/AdminPrestationTab.jsx', edits: heightEdits },
  {
    file: 'src/features/admin/AdminTimelineTab.jsx',
    edits: [
      [`    const height = 600; `, `    const height = containerRef.current.clientHeight || 600;`],
      heightEdits[1],
      [`        <div 
          ref={containerRef} 
          style={{ 
            width: '100%', 
            height: '600px', 
            background: 'var(--glass-bg)', 
            border: '1px solid var(--glass-border)', 
            borderRadius: '8px',
            display: (charId && filteredTimeline.length > 0) ? 'block' : 'none'
          }} 
        />`,
       `        <div 
          ref={containerRef} 
          className={styles.rGraphCanvas}
          style={{ 
            width: '100%', 
            background: 'var(--glass-bg)', 
            border: '1px solid var(--glass-border)', 
            borderRadius: '8px',
            display: (charId && filteredTimeline.length > 0) ? 'block' : 'none'
          }} 
        />`],
    ],
  },
  {
    file: 'src/features/admin/AdminBloodWebTab.jsx',
    edits: [
      ...heightEdits,
      [`<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>`,
       `<div className={styles.rGrid3} style={{ marginBottom: '2rem' }}>`],
      [`        <div 
          ref={containerRef} 
          style={{ 
            width: '100%', 
            height: '600px', 
            background: 'var(--glass-bg)', 
            border: '1px solid var(--glass-border)', 
            borderRadius: '8px',
            display: web.length > 0 ? 'block' : 'none',`,
       `        <div 
          ref={containerRef} 
          className={styles.rGraphCanvas}
          style={{ 
            width: '100%', 
            background: 'var(--glass-bg)', 
            border: '1px solid var(--glass-border)', 
            borderRadius: '8px',
            display: web.length > 0 ? 'block' : 'none',`],
      [`<div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%', backdropFilter: 'blur(10px)' }}>`,
       `<div className={styles.modalBackdrop} onClick={() => setSelectedNode(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', padding: 'clamp(1.25rem, 4vw, 2rem)' }}>`],
      [`<button 
                className={styles.btnSecondary} 
                style={{ padding: '0.5rem 1rem' }} 
                onClick={() => setSelectedNode(null)}
              >`,
       `<button 
                className={\`\${styles.btn} \${styles.btnSecondary}\`}
                onClick={() => setSelectedNode(null)}
              >`],
      [`<button 
                className={styles.submitBtn} 
                style={{ padding: '0.5rem 1.5rem', width: 'auto' }} 
                disabled={saving} `,
       `<button 
                className={\`\${styles.btn} \${styles.btnPrimary}\`}
                disabled={saving} `],
    ],
  },
];
