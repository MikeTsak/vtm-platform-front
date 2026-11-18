module.exports = [
  {
    file: 'src/features/admin/AdminDisciplinesTab.jsx',
    edits: [
      [`<input
                className={styles.input}
                style={{ width: '260px' }}
                placeholder="Search character or discipline…"`,
       `<input
                className={\`\${styles.input} \${styles.rInput}\`}
                placeholder="Search character or discipline…"`],
      [`<div style={{ overflowX: 'auto' }}>
                <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                      <th style={thStyle}>Character</th>`,
       `<div className={styles.rTable}>
                <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                      <th style={thStyle}>Character</th>`],
    ],
  },
];
