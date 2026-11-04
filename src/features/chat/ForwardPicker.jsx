// src/features/chat/ForwardPicker.jsx
//
// Forward a chat message to one chat (a player, a group or an NPC thread):
// picking it sends straight away. The server copies the original's text and
// attachment and labels the copy with its author (back services/chatForward.js),
// so all we send is which message, and where.
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import api, { formatApiError } from '../../core/api';

const SEND = {
  user: (t, forward_of) => api.post('/chat/messages', { recipient_id: t.id, forward_of }),
  group: (t, forward_of) => api.post(`/chat/groups/${t.id}/messages`, { forward_of }),
  npc: (t, forward_of) => api.post('/chat/npc/messages', { npc_id: t.id, forward_of }),
};
const ICON = { user: 'person', group: 'groups', npc: 'theater_comedy' };

/**
 * @param {{ forwardOf: { kind: 'dm'|'group'|'npc', id: number }, targets: Array<{ key, type, id, label }>, onClose: () => void }} props
 */
export default function ForwardPicker({ forwardOf, targets, onClose }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(null);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? targets.filter((t) => String(t.label || '').toLowerCase().includes(needle)) : targets;
  }, [q, targets]);

  const send = async (t) => {
    if (busy) return;
    setBusy(t.key);
    try {
      await SEND[t.type](t, forwardOf);
      toast.success(`Forwarded to ${t.label}`);
      onClose();
    } catch (e) {
      toast.error(formatApiError(e, 'Could not forward the message'));
      setBusy(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Forward message"
        className="chat-overlay-surface border border-outline-variant rounded-lg w-full max-w-sm max-h-[75vh] flex flex-col shadow-[0_0_25px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 border-b border-outline-variant/40 shrink-0">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">forward</span>
            Forward to...
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-on-surface-variant hover:text-white p-2 rounded transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="p-2.5 border-b border-outline-variant/30 shrink-0">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="w-full bg-surface-container-highest text-on-surface rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <ul className="overflow-y-auto custom-scrollbar">
          {shown.map((t) => (
            <li key={t.key}>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => send(t)}
                className="w-full flex items-center gap-3 px-4 min-h-[56px] text-left text-on-surface hover:bg-surface-container-highest disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">{ICON[t.type]}</span>
                <span className="flex-1 truncate">{t.label}</span>
                {busy === t.key && <span className="text-xs text-on-surface-variant">Sending...</span>}
              </button>
            </li>
          ))}
          {!shown.length && <li className="px-4 py-6 text-sm text-on-surface-variant text-center">No chats found.</li>}
        </ul>
      </div>
    </div>,
    document.body
  );
}
