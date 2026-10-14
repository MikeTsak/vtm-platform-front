// src/features/comms/drafts/useCommsDrafts.js
//
// Drafts a player keeps while comms are closed (back/routes/drafts.js).
// Shared by ChatSystem.jsx and EmailSystem.jsx. A target is { kind, id }:
// 'user' | 'group' | 'npc' | 'email' (thread id) | 'email-new' (id null).
// Every change on the server emits drafts:refresh to the author, so a draft
// written on the phone appears on an open PC tab too.

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import api, { formatApiError } from '../../../core/api';
import { socket } from '../../../api/liveSession';

const byWritten = (a, b) => (new Date(a.created_at) - new Date(b.created_at)) || (a.id - b.id);

export function useCommsDrafts(target) {
  const kind = target?.kind || null;
  const id = target?.id ?? null;
  const key = kind ? `${kind}:${id}` : null;
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  // Ignores a response that lands after the player switched conversation.
  const keyRef = useRef(key);
  keyRef.current = key;

  const load = useCallback(async () => {
    if (!kind) return;
    const asked = `${kind}:${id}`;
    try {
      const { data } = await api.get('/drafts', { params: { kind, id: id ?? undefined } });
      if (keyRef.current === asked) setDrafts((data.drafts || []).sort(byWritten));
    } catch { /* keep what we have */ }
  }, [kind, id]);

  useEffect(() => {
    setDrafts([]);
    if (!kind) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [kind, id, load]);

  useEffect(() => {
    if (!kind) return undefined;
    socket.on('drafts:refresh', load);
    return () => socket.off('drafts:refresh', load);
  }, [kind, load]);

  const upsert = (draft) => setDrafts(prev => [...prev.filter(d => d.id !== draft.id), draft].sort(byWritten));

  const save = useCallback(async (fields) => {
    const { data } = await api.post('/drafts', { kind, id, ...fields });
    if (keyRef.current === `${kind}:${id}`) upsert(data.draft);
    return data.draft;
  }, [kind, id]);

  const update = useCallback(async (draftId, fields) => {
    const { data } = await api.put(`/drafts/${draftId}`, fields);
    upsert(data.draft);
    return data.draft;
  }, []);

  // Silent removal: after the draft was sent.
  const remove = useCallback(async (draftId) => {
    setDrafts(prev => prev.filter(d => d.id !== draftId));
    try {
      await api.delete(`/drafts/${draftId}`);
    } catch (e) {
      if (e?.response?.status !== 404) load();
    }
  }, [load]);

  // The player threw it away: gone at once, with a few seconds to undo.
  const discard = useCallback(async (draft) => {
    let undone = false;
    await remove(draft.id);
    toast('Draft deleted', {
      duration: 6000,
      action: {
        label: 'Undo',
        onClick: async () => {
          if (undone) return;
          undone = true;
          try {
            const { data } = await api.post('/drafts', {
              kind: draft.kind, id: draft.target_id, body: draft.body,
              subject: draft.subject, to_address: draft.to_address, created_at: draft.created_at,
            });
            if (keyRef.current === `${draft.kind}:${draft.target_id ?? null}`) upsert(data.draft);
          } catch (e) {
            toast.error(formatApiError(e, 'Could not restore the draft.'));
          }
        },
      },
    });
  }, [remove]);

  return { drafts, loading, save, update, remove, discard, reload: load };
}

// Draft counts per conversation, for the badges in the contact list / inbox.
// countFor('user', 12) -> 2
export function useDraftSummary(enabled = true) {
  const [counts, setCounts] = useState({});

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/drafts/summary');
      const next = {};
      for (const c of data.counts || []) next[`${c.kind}:${c.id ?? null}`] = c.count;
      setCounts(next);
    } catch { /* badges are a nicety */ }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    load();
    socket.on('drafts:refresh', load);
    return () => socket.off('drafts:refresh', load);
  }, [enabled, load]);

  const countFor = useCallback((kind, id) => counts[`${kind}:${id ?? null}`] || 0, [counts]);
  return { countFor };
}
