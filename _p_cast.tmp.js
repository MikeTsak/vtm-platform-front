module.exports = [
  {
    file: 'src/features/admin/AdminNPCsTab.jsx',
    edits: [
      [`<div className={styles.row} style={{ justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>`,
       `<div className={styles.row} style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>`],
      [`<div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>`,
       `<div className={styles.tableContainer}>
          <table className={styles.table} style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>ID</th>`],
      [`<div className={styles.row} style={{ gap: '8px', justifyContent: 'flex-end' }}>
                        {n.is_disabled ? (`,
       `<div className={styles.row} style={{ gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {n.is_disabled ? (`],
      [`<div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: 'var(--glass-shadow)' }}>
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
            <h4 style={{ margin: 0, color: 'var(--accent-purple)', fontSize: '1.4rem', fontWeight: 800 }}>Create NPC</h4>`,
       `<div className={styles.adminCard}>
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
            <h4 style={{ margin: 0, color: 'var(--accent-purple)', fontSize: '1.4rem', fontWeight: 800 }}>Create NPC</h4>`],
      [`<div style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <CharacterSetup`,
       `<div style={{ background: 'var(--glass-inset)', padding: 'clamp(0.75rem, 3vw, 1.5rem)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <CharacterSetup`],
    ],
  },
  {
    file: 'src/features/admin/AdminNewsTab.jsx',
    edits: [
      [`<div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>`,
       `<div className={styles.sectionHeader}>`],
      [`<div className={styles.tableContainer}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>User</th>`,
       `<div className={styles.tableContainer}>
            <table style={{ width: '100%', minWidth: 360, textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>User</th>`],
      [`<button className={styles.btnSecondary} onClick={() => handleRevokePermission(p.id)} style={{ color: 'red' }}>Revoke</button>`,
       `<button className={\`\${styles.btn} \${styles.btnDanger} \${styles.btnSmall}\`} onClick={() => handleRevokePermission(p.id)}>Revoke</button>`],
      [`<div className={styles.tableContainer} style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>`,
       `<div className={styles.tableContainer} style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', minWidth: 640, textAlign: 'left', borderCollapse: 'collapse' }}>`],
      [`<div style={{ display: 'flex', gap: '0.5rem' }}>
                        {n.is_private ? (
                          <button className={styles.btnSecondary} onClick={() => handlePublishNews(n.id)} style={{ color: '#4caf50' }}>Publish</button>
                        ) : null}
                        <button className={styles.btnSecondary} onClick={() => window.open(\`/news/\${n.id}\`, '_blank')}>View</button>
                        <button className={styles.btnSecondary} onClick={() => handleDeleteNews(n.id)} style={{ color: 'red' }}>Del</button>`,
       `<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {n.is_private ? (
                          <button className={\`\${styles.btn} \${styles.btnSuccess} \${styles.btnSmall}\`} onClick={() => handlePublishNews(n.id)}>Publish</button>
                        ) : null}
                        <button className={\`\${styles.btn} \${styles.btnSecondary} \${styles.btnSmall}\`} onClick={() => window.open(\`/news/\${n.id}\`, '_blank')}>View</button>
                        <button className={\`\${styles.btn} \${styles.btnDanger} \${styles.btnSmall}\`} onClick={() => handleDeleteNews(n.id)}>Del</button>`],
    ],
  },
];
