// src/ui/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  
  // Logic to clear service workers and cache storage
  const handleClearCache = async () => {
    if (window.confirm('This will refresh the app and clear local caches to fix loading issues. Continue?')) {
      try {
        // 1. Unregister Service Workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }
        
        // 2. Clear Cache Storage API
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        }

        // 3. Force Reload
        window.location.reload();
      } catch (e) {
        console.error("Cache clear failed", e);
        window.location.reload();
      }
    }
  };

  return (
    <>
      <style>{`
        .gothic-etched-border { border: 1px solid rgba(224, 224, 224, 0.1); }
      `}</style>

      <footer className="bg-surface-container-lowest border-t border-outline-variant/10 py-6 px-4 mt-12 shadow-[0_-4px_20px_rgba(0,0,0,0.6)] relative z-10">
        <div className="max-w-[1920px] mx-auto flex flex-col gap-4">
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Brand / Project */}
            <div className="flex items-center gap-3">
              <img
                src="/img/ATT-logo(1).png"
                alt="Erebus Portal"
                className="w-10 h-10 object-contain rounded border border-outline-variant/30 bg-surface-container p-0.5 shadow-md"
                draggable="false"
              />
              <div className="flex flex-col justify-center">
                <div className="font-['Playfair_Display'] font-bold text-lg text-on-surface tracking-wide leading-tight">
                  Erebus Portal
                </div>
                <div className="text-[10px] text-on-surface-variant font-['Inter'] leading-tight">
                  by <a href="https://miketsak.gr" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold transition-colors">MikeTsak</a> for Athens Through-Time — powered by{' '}
                  <a href="https://cerebralproductions.eu/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold transition-colors">Cerebral Prod.</a>
                </div>
              </div>
            </div>

            {/* Logos & Legal */}
            <div className="flex items-center gap-4">
              <a href="https://cerebralproductions.eu/" target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100 transition-opacity active:scale-95" aria-label="Cerebral Productions">
                <img src="/img/cerebralproductions.png" alt="Cerebral Productions" className="h-6 object-contain" draggable="false" />
              </a>
              <a href="https://www.paradoxinteractive.com/games/world-of-darkness/community/dark-pack-agreement" target="_blank" rel="noreferrer" className="opacity-60 hover:opacity-100 transition-opacity active:scale-95" aria-label="Dark Pack Agreement">
                <img src="/img/DarkPack_Logo2.png" alt="World of Darkness — Dark Pack" className="h-6 object-contain" draggable="false" />
              </a>
            </div>
          </div>

          <div className="w-full h-px bg-outline-variant/10"></div>

          {/* Legal text & Links - Compact Row */}
          <div className="flex flex-col lg:flex-row justify-between items-center lg:items-end gap-4">
            
            <div className="text-center lg:text-left text-[9px] font-['Inter'] text-on-surface-variant/50 max-w-4xl leading-tight">
              Portions of the materials are copyrights and trademarks of Paradox Interactive AB, used with permission. All rights reserved. Visit <a href="https://www.worldofdarkness.com" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors underline decoration-outline-variant/30 underline-offset-2">worldofdarkness.com</a>. 
              This is <b className="font-bold text-on-surface-variant/70">unofficial fan content</b>, not approved or endorsed by Paradox Interactive. 
              Vampire: The Masquerade and World of Darkness are trademarks of Paradox Interactive AB.
            </div>

            {/* Links Row */}
            <div className="flex flex-wrap justify-center lg:justify-end gap-x-4 gap-y-2 text-[9px] uppercase tracking-widest font-bold font-['Inter'] shrink-0">
              <Link to="/terms" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 group">
                <span className="material-symbols-outlined text-[12px] opacity-60 group-hover:opacity-100">gavel</span> Terms
              </Link>
              <Link to="/privacy" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 group">
                <span className="material-symbols-outlined text-[12px] opacity-60 group-hover:opacity-100">security</span> Privacy
              </Link>
              <Link to="/legal" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 group">
                <span className="material-symbols-outlined text-[12px] opacity-60 group-hover:opacity-100">info</span> Legal
              </Link>
              <a href="https://www.paradoxinteractive.com/games/world-of-darkness/community/dark-pack-agreement" target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 group">
                <span className="material-symbols-outlined text-[12px] opacity-60 group-hover:opacity-100">description</span> Dark Pack
              </a>
              <button type="button" onClick={handleClearCache} className="text-on-surface-variant hover:text-error transition-colors flex items-center gap-1 group focus:outline-none ml-2">
                <span className="material-symbols-outlined text-[12px] opacity-60 group-hover:opacity-100">delete_sweep</span> Cache
              </button>
            </div>
          </div>

        </div>
      </footer>
    </>
  );
}