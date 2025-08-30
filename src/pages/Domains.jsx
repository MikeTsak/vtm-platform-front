import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Domains() {
  const [list, setList] = useState([]);

  useEffect(() => {
    api.get('/domains').then(r => setList(r.data.domains || []));
  }, []);

  return (
    <div style={{ maxWidth: 800, margin:'2rem auto' }}>
      <h2>Domains</h2>
      {!list.length && <i>No domains yet.</i>}
      {list.map(d => (
        <div key={d.id} style={{ border:'1px solid #444', padding:8, margin:'8px 0' }}>
          <b>{d.name}</b>
          {d.description && <div><small>{d.description}</small></div>}
          <div style={{ marginTop:6 }}>
            <b>Members:</b> {d.members?.length ? d.members.map(m => `${m.name} (${m.clan})`).join(', ') : '—'}
          </div>
        </div>
      ))}
    </div>
  );
}
