import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [dts, setDts] = useState([]);

  async function load() {
    const u = await api.get('/admin/users'); setUsers(u.data.users);
    const d = await api.get('/admin/downtimes'); setDts(d.data.downtimes);
  }

  useEffect(() => { load(); }, []);

  async function updateDt(id, status) {
    await api.patch(`/admin/downtimes/${id}`, { status });
    load();
  }

  return (
    <div style={{ maxWidth: 1000, margin:'2rem auto' }}>
      <h2>Admin</h2>
      <h3>Users</h3>
      <ul>
        {users.map(u => (
          <li key={u.id}>
            {u.display_name} &lt;{u.email}&gt; — {u.role} — Char: {u.char_name || '-'} ({u.clan || '-'})
          </li>
        ))}
      </ul>
      <h3>Downtimes</h3>
      {dts.map(d => (
        <div key={d.id} style={{border:'1px solid #444', padding:8, marginBottom:8}}>
          <b>{d.title}</b> — {d.status} — {d.char_name} ({d.clan}) by {d.player_name} &lt;{d.email}&gt;
          <p>{d.body}</p>
          {d.gm_notes && <p><b>GM Notes:</b> {d.gm_notes}</p>}
          <div>
            <button onClick={()=>updateDt(d.id,'approved')}>Approve</button>
            <button onClick={()=>updateDt(d.id,'rejected')}>Reject</button>
            <button onClick={()=>updateDt(d.id,'resolved')}>Resolve</button>
          </div>
        </div>
      ))}
    </div>
  );
}
