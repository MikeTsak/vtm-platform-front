module.exports = [
  {
    file: 'src/features/admin/AdminUsersTab.jsx',
    edits: [
      [`<div className={styles.td}><span className={styles.idCell}>#{u.id}</span></div>`,
       `<div className={styles.td} data-label="ID"><span className={styles.idCell}>#{u.id}</span></div>`],
      [`<div className={styles.td} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>`,
       `<div className={styles.td} data-label="Display Name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>`],
      [`<div className={styles.td}><input className={styles.input} value={draft.email}`,
       `<div className={styles.td} data-label="Email"><input className={styles.input} type="email" value={draft.email}`],
      [`<div className={styles.td}><select className={styles.select} value={draft.role}`,
       `<div className={styles.td} data-label="Role"><select className={styles.select} value={draft.role}`],
      [`<div className={styles.td}><input className={\`\${styles.input} \${styles.inputMono}\`} value={draft.discord_id}`,
       `<div className={styles.td} data-label="Discord ID"><input className={\`\${styles.input} \${styles.inputMono}\`} value={draft.discord_id}`],
      [`<div className={styles.td}>
                      {u.character_id ? (`,
       `<div className={styles.td} data-label="Character">
                      {u.character_id ? (`],
      [`<div className={styles.td}>
                      <div className={styles.row} style={{ gap: '10px', alignItems: 'center' }}>`,
       `<div className={styles.td} data-label="Clan / XP">
                      <div className={styles.row} style={{ gap: '10px', alignItems: 'center' }}>`],
      [`<div className={\`\${styles.td} \${styles.rowEnd}\`}>`,
       `<div className={\`\${styles.td} \${styles.rowEnd} \${styles.userActions}\`}>`],
    ],
  },
  {
    file: 'src/features/admin/AdminXPTab.jsx',
    edits: [
      [`className={styles.input} style={{ width: '300px' }} value={searchTerm}`,
       `className={\`\${styles.input} \${styles.rInput}\`} value={searchTerm}`],
      [`marginBottom: '16px', display: 'flex', gap: '15px', alignItems: 'center', border:`,
       `marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', border:`],
      [`<div style={{ flexGrow: 1 }}>
            <strong style={{ display: 'block', marginBottom: '4px', fontSize: '1.2rem', color: 'var(--text-color)' }}>Bulk Grant Session XP</strong>`,
       `<div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <strong style={{ display: 'block', marginBottom: '4px', fontSize: '1.2rem', color: 'var(--text-color)' }}>Bulk Grant Session XP</strong>`],
      [`<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Global XP Audit Dashboard</h3>`,
       `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Global XP Audit Dashboard</h3>`],
      [`<div style={{ display: 'flex', gap: '15px', background: 'var(--glass-inset)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <label className={styles.labeledInput} style={{flex: 1}}>`,
       `<div className={styles.rGrid3} style={{ gridTemplateColumns: '1fr 1fr 2fr', background: 'var(--glass-inset)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
          <label className={styles.labeledInput} style={{flex: 1}}>`],
      [`<div className={styles.actionCell} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>`,
       `<div className={styles.actionCell} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>`],
      [`<div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', background:`,
       `<div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', background:`],
    ],
  },
  {
    file: 'src/features/admin/AdminGhoulsTab.jsx',
    edits: [
      [`<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>`,
       `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>`],
      [`<div style={{ overflowX: 'auto' }}>
        <table className={styles.table} style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>`,
       `<div className={styles.rTable}>
        <table className={styles.table} style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>`],
    ],
  },
];
