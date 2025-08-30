import React, { useEffect, useState } from 'react';
import api from '../api';
import CharacterSetup from './CharacterSetup';

export default function Dashboard() {
  const [hasChar, setHasChar] = useState(false);
  const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  const [list, setList] = useState([]);
  async function load() {
    const me = await api.get('/characters/me');
    setHasChar(!!me.data.character);
    if (me.data.character) {
      const { data } = await api.get('/downtimes/mine');
      setList(data.downtimes);
    }
  }
  useEffect(() => { load(); }, []);

  if (!hasChar) return <CharacterSetup onDone={load} />;

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/downtimes', { title, body });
    setTitle(''); setBody(''); load();
  };

  return (
    <div style={{ maxWidth: 720, margin:'2rem auto' }}>
      <h2>Downtimes</h2>
      <form onSubmit={submit}>
        <input placeholder='Short title' value={title} onChange={(e)=>setTitle(e.target.value)} />
        <textarea placeholder='What do you do between sessions?' value={body} onChange={(e)=>setBody(e.target.value)} rows={5}/>
        <button>Submit</button>
      </form>
      <hr/>
      {list.map(d => (
        <div key={d.id} style={{ padding:'8px 0' }}>
          <b>{d.title}</b> — <i>{d.status}</i><br/>
          <small>{new Date(d.created_at).toLocaleString()}</small>
          <p>{d.body}</p>
          {d.gm_notes && <p><b>GM Notes:</b> {d.gm_notes}</p>}
        </div>
      ))}
      {!list.length && <i>No downtimes yet.</i>}
    </div>
  );
}