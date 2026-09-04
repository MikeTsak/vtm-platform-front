import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateConsent } from '../utils/analytics';
import { loadConsentGatedScripts } from '../utils/consentGatedScripts';

const CookieConsent = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check local storage to see if user has already made a choice
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // If no choice was made, show the banner
      setShow(true);
    } else if (consent === 'granted') {
      // If they previously accepted, tell GA to grant consent and start
      // AdSense/Clarity — neither loads at all until this fires.
      updateConsent(true);
      loadConsentGatedScripts();
    } else {
      // If they previously declined, tell GA to deny consent
      updateConsent(false);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'granted');
    updateConsent(true);
    loadConsentGatedScripts();
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'denied');
    updateConsent(false);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-surface-container border border-blood-accent/50 rounded-lg shadow-2xl max-w-md w-full p-6 text-on-surface flex flex-col gap-4 relative overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Thematic Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blood-accent/20 via-blood-accent to-blood-accent/20"></div>

        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-blood-accent text-3xl">policy</span>
          <h2 className="font-headline-md text-primary m-0">A Matter of Privacy</h2>
        </div>
        
        <div className="text-sm space-y-4 opacity-90 leading-relaxed">
          <p>
            Giannakis would never sell your data, it's a masquerade breach and the prince would kill him.
          </p>
          <p>
            We use strictly necessary cookies for the portal to function, and analytics to measure activity. 
            By clicking "Accept", you consent to our use of these technologies.
          </p>
          <p className="text-xs opacity-75">
            Read our <Link to="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link> and <Link to="/terms" className="text-primary hover:underline font-medium">Terms of Service</Link>.
          </p>
        </div>

        <div className="flex gap-3 mt-2 justify-end w-full">
          <button 
            onClick={handleDecline}
            className="px-5 py-2 border border-outline/50 text-on-surface rounded font-medium text-sm hover:bg-surface-variant transition-colors"
          >
            Decline
          </button>
          <button 
            onClick={handleAccept}
            className="px-5 py-2 bg-blood-accent text-white font-bold rounded text-sm hover:brightness-110 transition-colors shadow-sm"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
