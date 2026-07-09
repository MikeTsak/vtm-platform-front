import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../styles/Admin.module.css';

export default function AdminGhoulsTab({ ghouls }) {
  const navigate = useNavigate();

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
                  style={{ background: 'var(--tint)', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={() => navigate('/retainers', {
                    state: {
                      character: {
                        id: g.domitor_id,
                        name: g.domitor_name,
                        clan: g.domitor_clan,
                        xp: g.domitor_xp
                      },
                      preselectRetainerId: g.id,
                      isAdminBypass: true
                    }
                  })}
                >
                  Manage Ghoul
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
