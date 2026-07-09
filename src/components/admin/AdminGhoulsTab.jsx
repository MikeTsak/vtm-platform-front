import React, { useState } from 'react';
import styles from '../../styles/Admin.module.css'; // Use shared admin styles if appropriate, or inline/custom
import { DISCIPLINES } from '../../data/disciplines';

export default function AdminGhoulsTab({ ghouls }) {
  const [selectedGhoul, setSelectedGhoul] = useState(null);

  if (!ghouls || ghouls.length === 0) {
    return <div className={styles.adminCard}>No ghouls found.</div>;
  }

  return (
    <div className={styles.adminCard}>
      <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Ghouls Directory</h2>
      <table className={styles.table} style={{ width: '100%', textAlign: 'left', color: '#ccc' }}>
        <thead>
          <tr>
            <th style={{ padding: '0.5rem', borderBottom: '1px solid #444' }}>Ghoul Name</th>
            <th style={{ padding: '0.5rem', borderBottom: '1px solid #444' }}>Tier</th>
            <th style={{ padding: '0.5rem', borderBottom: '1px solid #444' }}>Domitor Name</th>
            <th style={{ padding: '0.5rem', borderBottom: '1px solid #444' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {ghouls.map(g => (
            <tr key={g.id}>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>{g.retainer_name}</td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>{g.tier}</td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>{g.domitor_name}</td>
              <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>
                <button 
                  className={styles.btnSmall}
                  style={{ background: '#555', color: '#fff', padding: '4px 8px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  onClick={() => setSelectedGhoul(g)}
                >
                  View Sheet
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedGhoul && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a1a', border: '1px solid #8a0303', padding: '2rem', 
            borderRadius: '8px', maxWidth: '600px', width: '100%', color: '#ccc',
            maxHeight: '80vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: '#fff' }}>{selectedGhoul.retainer_name} (Tier {selectedGhoul.tier})</h2>
              <button 
                onClick={() => setSelectedGhoul(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            
            <p><strong>Domitor:</strong> {selectedGhoul.domitor_name}</p>

            <h3 style={{ color: '#fff', marginTop: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>Disciplines</h3>
            {selectedGhoul.sheet?.disciplines && Object.keys(selectedGhoul.sheet.disciplines).length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {Object.entries(selectedGhoul.sheet.disciplines).map(([disc, dots]) => (
                  <li key={disc} style={{ marginBottom: '0.5rem' }}>
                    <strong>{disc}:</strong> {dots} dot(s)
                    {selectedGhoul.sheet.disciplinePowers?.[disc] && (
                      <ul style={{ marginTop: '4px', paddingLeft: '1rem', color: '#aaa' }}>
                        {selectedGhoul.sheet.disciplinePowers[disc].map((p, i) => (
                          <li key={i}>• {p.name || p.id} (Lvl {p.level})</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#888' }}>No Disciplines allocated.</p>
            )}

            <h3 style={{ color: '#fff', marginTop: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>Attributes & Skills</h3>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#eee' }}>Attributes</strong>
                {selectedGhoul.sheet?.attributes && Object.entries(selectedGhoul.sheet.attributes).map(([attr, dots]) => (
                  dots > 0 && <div key={attr}>{attr}: {dots}</div>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#eee' }}>Skills</strong>
                {selectedGhoul.sheet?.skills && Object.entries(selectedGhoul.sheet.skills).map(([skill, data]) => (
                  data.dots > 0 && (
                    <div key={skill}>
                      {skill}: {data.dots} 
                      {data.specialties?.length > 0 ? ` (${data.specialties.join(', ')})` : ''}
                    </div>
                  )
                ))}
              </div>
            </div>

            <h3 style={{ color: '#fff', marginTop: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>Advantages</h3>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#eee' }}>Merits</strong>
                {selectedGhoul.sheet?.advantages?.merits?.map((m, i) => (
                  <div key={i}>• {m.name} ({m.rating} dots)</div>
                )) || <div style={{ color: '#888' }}>None</div>}
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#eee' }}>Flaws</strong>
                {selectedGhoul.sheet?.advantages?.flaws?.map((f, i) => (
                  <div key={i}>• {f.name} ({f.rating} dots)</div>
                )) || <div style={{ color: '#888' }}>None</div>}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
