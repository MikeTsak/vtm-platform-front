// src/features/comms/useCommsEnabled.js
//
// Shared by Comms.jsx, SchreckNet.jsx and SurfaceWeb.jsx — previously each
// had its own identical copy of this polling logic. Behavior is unchanged
// (same fetch on mount, same returned shape) except the poll interval is now
// a slow safety net instead of the primary mechanism: an admin flipping the
// master switch now reaches every connected client instantly via the
// 'comms:status' socket event (see back/server.fastify.js), which carries
// the new value directly — no refetch needed for that case.
//
// The poll can't be removed entirely: comms_enabled also depends on a
// time-based schedule (see GET /api/comms/status) that can flip with no
// admin action at all, so nothing broadcasts *that* transition — the slow
// poll is what still catches it, just less frequently than before.
import { useEffect, useState } from 'react';
import api from '../../core/api';
import { socket } from '../../api/liveSession';

export function useCommsEnabled() {
  const [commsEnabled, setCommsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkComms = async () => {
      try {
        const { data } = await api.get('/comms/status');
        setCommsEnabled(data.comms_enabled);
      } catch (e) {
        // ignore errors, keep previous state
      } finally {
        setIsLoading(false);
      }
    };

    checkComms();
    const interval = setInterval(checkComms, 60000); // safety net for the schedule-boundary case above
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onStatus = (payload) => {
      if (payload && typeof payload.comms_enabled === 'boolean') {
        setCommsEnabled(payload.comms_enabled);
      }
    };
    socket.on('comms:status', onStatus);
    return () => socket.off('comms:status', onStatus);
  }, []);

  return { commsEnabled, isLoading };
}
