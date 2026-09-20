// src/features/comms/useCommsEnabled.js
//
// Shared by Comms.jsx, SchreckNet.jsx, SurfaceWeb.jsx, and ChatSystem.jsx.
// Provides realtime comms availability, master switch status, and next scheduled opening.

import { useEffect, useState } from 'react';
import api from '../../core/api';
import { socket } from '../../api/liveSession';

export function useCommsEnabled() {
  const [commsEnabled, setCommsEnabled] = useState(true);
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [nextOpening, setNextOpening] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkComms = async () => {
      try {
        const { data } = await api.get('/comms/status');
        setCommsEnabled(data.comms_enabled);
        if (data.master_enabled !== undefined) {
          setMasterEnabled(data.master_enabled);
        }
        setNextOpening(data.next_opening || null);
      } catch (e) {
        // ignore errors, keep previous state
      } finally {
        setIsLoading(false);
      }
    };

    checkComms();
    const interval = setInterval(checkComms, 60000); // safety net for schedule transitions
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onStatus = (payload) => {
      if (payload && typeof payload.comms_enabled === 'boolean') {
        setCommsEnabled(payload.comms_enabled);
        if (payload.master_enabled !== undefined) {
          setMasterEnabled(payload.master_enabled);
        }
        if (payload.next_opening !== undefined) {
          setNextOpening(payload.next_opening);
        }
      }
    };
    socket.on('comms:status', onStatus);
    return () => socket.off('comms:status', onStatus);
  }, []);

  return { commsEnabled, masterEnabled, nextOpening, isLoading };
}
