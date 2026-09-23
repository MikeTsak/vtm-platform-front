// src/features/comms/useCommsUnread.js
//
// Unread totals for the nav's SchreckNet / Surface Web badges. Refreshed on
// the chat:refresh / emails:refresh socket signals (new message or a read),
// on route change, on returning to the tab, and by a slow safety-net poll.

import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../core/api';
import { socket } from '../../api/liveSession';

export function useCommsUnread(enabled) {
  const [chat, setChat] = useState(0);
  const [email, setEmail] = useState(0);
  const location = useLocation();

  const refresh = useCallback(() => {
    if (!enabled || document.hidden) return;
    api.get('/chat/unread-count').then(({ data }) => setChat(data.count || 0)).catch(() => { });
    api.get('/emails/unread-count').then(({ data }) => setEmail(data.count || 0)).catch(() => { });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) { setChat(0); setEmail(0); }
  }, [enabled]);

  useEffect(() => { refresh(); }, [refresh, location.pathname]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(refresh, 60000);
    socket.on('chat:refresh', refresh);
    socket.on('emails:refresh', refresh);
    socket.on('connect', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(interval);
      socket.off('chat:refresh', refresh);
      socket.off('emails:refresh', refresh);
      socket.off('connect', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled, refresh]);

  return { chat, email };
}
