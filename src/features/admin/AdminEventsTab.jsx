import React, { useState, useEffect } from 'react';
import api from '../../core/api';
import styles from '../../styles/Admin.module.css';
import { Skeleton } from 'boneyard-js/react';

export default function AdminEventsTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [events, setEvents] = useState([]);
  
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [adding, setAdding] = useState(false);
  
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/events');
      setEvents(data.events || []);
    } catch (e) {
      setErr('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !date) return;
    setAdding(true); setErr('');
    try {
      await api.post('/admin/events', { title, date_string: date, description });
      setTitle(''); setDate(''); setDescription('');
      loadEvents();
    } catch (error) {
      setErr(error.response?.data?.error || 'Failed to create event');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await api.delete(`/admin/events/${id}`);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      setErr(error.response?.data?.error || 'Failed to delete event');
    }
  };

  return (
    <div className={styles.adminCard}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>📅 Event Scheduler</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.85rem' }}>Manage IC/OOC events that appear on the player dashboard.</p>
      </div>

      {err && <div className={`${styles.alert} ${styles.alertError}`}>{err}</div>}

      <div style={{ background: 'var(--glass-inset)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Schedule New Event</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label className={styles.labeledInput}>
              <span>Event Title</span>
              <input type="text" className={styles.input} value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Elysium Gathering" />
            </label>
            <label className={styles.labeledInput}>
              <span>Date & Time</span>
              <input type="datetime-local" className={styles.input} value={date} onChange={e => setDate(e.target.value)} required />
            </label>
          </div>
          <label className={styles.labeledInput}>
            <span>Description / Location (Optional)</span>
            <textarea className={styles.input} value={description} onChange={e => setDescription(e.target.value)} rows="3" placeholder="Additional details..." />
          </label>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={adding || !title || !date} style={{ alignSelf: 'flex-start' }}>
            {adding ? 'Adding...' : 'Add Event'}
          </button>
        </form>
      </div>

      <Skeleton loading={loading} name="admin-events-list">
        <div style={{ display: 'grid', gap: '1rem' }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
              No upcoming events scheduled.
            </div>
          ) : (
            events.map(ev => (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '1rem 1.5rem', boxShadow: 'var(--glass-shadow)' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: 'var(--accent-purple)', fontSize: '1.2rem' }}>{ev.title}</h4>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem', marginBottom: ev.description ? '8px' : 0 }}>
                    {new Date(ev.date).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {ev.description && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{ev.description}</div>}
                </div>
                <button type="button" onClick={() => handleDelete(ev.id)} className={styles.btnSmall} style={{ background: 'rgba(255,82,82,0.1)', color: '#ff5252', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 'var(--radius-sm)' }}>
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </Skeleton>
    </div>
  );
}
