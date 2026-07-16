// src/components/GlobalBanner.jsx
import React, { useState, useEffect } from 'react';
import api from '../core/api';
import styles from '../styles/GlobalBanner.module.css';

export default function GlobalBanner() {
  const [config, setConfig] = useState({ enabled: false, message: '', countdown: '' });
  const [timeLeft, setTimeLeft] = useState('');

  // 1. Fetch banner data on load AND listen via SSE
  useEffect(() => {
    // Initial fetch to get immediate data
    const fetchBanner = async () => {
      try {
        const res = await api.get('/system/banner');
        setConfig({
          enabled: res.data.banner_enabled === true || res.data.banner_enabled === 'true',
          message: res.data.banner_message || '',
          countdown: res.data.banner_countdown || ''
        });
      } catch (err) {
        console.error("Failed to load banner", err);
      }
    };
    fetchBanner();

    // Establish Server-Sent Events (SSE) connection for instant updates
    const baseUrl = api.defaults.baseURL || import.meta.env.VITE_API_URL || '';
    const es = new EventSource(`${baseUrl}/system/banner/stream`);

    es.onmessage = (event) => {
      if (event.data === 'ping') return;
      try {
        const data = JSON.parse(event.data);
        setConfig({
          enabled: data.banner_enabled === true || data.banner_enabled === 'true',
          message: data.banner_message || '',
          countdown: data.banner_countdown || ''
        });
      } catch (e) {
        console.error("Failed to parse banner stream update", e);
      }
    };

    es.onerror = () => {
      console.warn("Banner SSE connection lost. Will automatically reconnect.");
    };

    return () => {
      es.close();
    };
  }, []);

  // 2. Handle countdown logic
  useEffect(() => {
    if (!config.enabled || !config.countdown) return;
    
    const target = new Date(config.countdown).getTime();
    if (isNaN(target)) return;
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = target - now;
      
      if (diff <= 0) {
        setTimeLeft('00d 00h 00m 00s');
        return true; // Stop timer
      }
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
      return false; // Keep running
    };

    updateTimer(); 
    
    const timerId = setInterval(() => {
      const done = updateTimer();
      if (done) clearInterval(timerId);
    }, 1000);

    return () => clearInterval(timerId);
  }, [config.countdown, config.enabled]);

  if (!config.enabled) return null;

  return (
    <div className={styles.bannerContainer}>
      {config.message && (
        <span 
          className={styles.message}
          dangerouslySetInnerHTML={{ __html: config.message }} 
        />
      )}
      
      {config.countdown && timeLeft && (
        <span className={styles.countdownBadge}>
          ⏳ {timeLeft}
        </span>
      )}
    </div>
  );
}