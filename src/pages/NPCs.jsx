import React, { useEffect, useState } from 'react';
import api from '../api';
import CharacterSetup from './CharacterSetup';
import CharacterView from './CharacterView';

export default function NPCs() {
  const [list, setList] = useState([]);
  const [mode, setMode] = useState('list'); // list | create | view
  const [viewId, setViewId] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    setErr(''); setMsg('');
    try {
      const { data } = await api.get('/admin/npcs');
      setList(data.npcs || []);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load NPCs');
    }
  }
  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!window.confirm('Delete this NPC?')) return;
    setErr(''); setMsg('');
    try {
      await api.delete(`/admin/npcs/${id}`);
      setMsg('NPC deleted');
      await load();
      setMode('list');
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to delete NPC');
    }
  }

  return (
    <div style={{ padding:16 }}>
      <h2>NPCs (Admin)</h2>
      {err && <div style={{ color:'#b91c1c', marginBottom:8 }}>{err}</div>}
      {msg && <div style={{ color:'#065f46', marginBottom:8 }}>{msg}</div>}

      {mode === 'list' && (
        <>
          <button onClick={()=>setMode('create')}>+ New NPC</button>
          <table border="1" cellPadding="6" style={{ marginTop:12, width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Clan</th><th>XP</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(n => (
                <tr key={n.id}>
                  <td>{n.id}</td>
                  <td>{n.name}</td>
                  <td>{n.clan}</td>
                  <td>{n.xp}</td>
                  <td>{new Date(n.created_at).toLocaleString()}</td>
                  <td>
                    <button onClick={()=>{ setViewId(n.id); setMode('view'); }}>View</button>{' '}
                    <button onClick={()=>remove(n.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr><td colSpan="6" style={{ color:'#6b7280' }}>No NPCs yet.</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {mode === 'create' && (
        <div style={{ marginTop:12 }}>
          <h3>Create NPC</h3>
          <CharacterSetup
            forNPC
            onDone={async ()=>{ await load(); setMode('list'); }}
          />
          <div style={{ marginTop:8 }}>
            <button onClick={()=>setMode('list')}>Back</button>
          </div>
        </div>
      )}

      {mode === 'view' && viewId && (
        <div style={{ marginTop:12 }}>
          <h3>View NPC #{viewId}</h3>
          <CharacterView
            loadPath={`/admin/npcs/${viewId}`}
            xpSpendPath={`/admin/npcs/${viewId}/xp/spend`}
          />
          <div style={{ marginTop:8 }}>
            <button onClick={()=>setMode('list')}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
