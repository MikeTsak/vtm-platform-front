// src/components/GlobalBanner.jsx
import React, { useState, useEffect } from 'react';
import api from '../core/api';

export default function GlobalBanner() {
  const [config, setConfig] = useState({ enabled: false, message: '', countdown: '' });
  const [timeLeft, setTimeLeft] = useState('');

  // 1. Fetch banner data on load AND poll every 10 minutes
  useEffect(() => {
    const fetchBanner = () => {
      api.get('/system/banner')
        .then(res => {
          setConfig({
            enabled: res.data.banner_enabled === true || res.data.banner_enabled === 'true',
            message: res.data.banner_message || '',
            countdown: res.data.banner_countdown || ''
          });
        })
        .catch(err => console.error("Failed to load banner", err));
    };

    fetchBanner(); // Check immediately on load
    
    // 600,000 milliseconds = 10 minutes
    const interval = setInterval(fetchBanner, 600000); 

    return () => clearInterval(interval);
  }, []);

  // 2. Handle countdown logic
  useEffect(() => {
    if (!config.enabled || !config.countdown) return;
    
    const target = new Date(config.countdown).getTime();
    if (isNaN(target)) return;
    
    // Function to calculate and update time instantly
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = target - now;
      
      if (diff <= 0) {
        setTimeLeft('00:00:00:00');
        return true; // Stop timer
      }
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
      return false; // Keep running
    };

    updateTimer(); // Initial call so it doesn't blink
    
    const timerId = setInterval(() => {
      const done = updateTimer();
      if (done) clearInterval(timerId);
    }, 1000);

    return () => clearInterval(timerId);
  }, [config.countdown, config.enabled]);

  // Hide entirely if disabled
  if (!config.enabled) return null;

  return (
    <div style={{
      background: 'linear-gradient(90deg, #5a060f, #8a0f1a, #5a060f)',
      color: 'white',
      textAlign: 'center',
      padding: '10px 20px',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '15px',
      zIndex: 9999,
      position: 'relative',
      borderBottom: '2px solid #d4af37',
      boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
      fontSize: '0.95rem'
    }}>
      
      {config.message && (
        <span 
          style={{ lineHeight: '1.4' }} 
          dangerouslySetInnerHTML={{ __html: config.message }} 
        />
      )}
      
      {config.countdown && timeLeft && (
        <span style={{ 
          background: 'rgba(0,0,0,0.4)', 
          padding: '4px 12px', 
          borderRadius: '6px', 
          fontFamily: "'Fira Code', monospace",
          letterSpacing: '1px',
          fontWeight: 'bold',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          ⏳ {timeLeft}
        </span>
      )}
      
    </div>
  );
}