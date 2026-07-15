import React, { useEffect } from 'react';

/**
 * Reusable Google AdSense component
 * You must add your actual `data-ad-client` (Publisher ID) and `data-ad-slot` to see real ads.
 * Requires the AdSense script tag in index.html to function properly.
 */
export default function GoogleAd({ style, className, format = 'auto', layout = '' }) {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("AdSense error", e);
    }
  }, []);

  return (
    <div style={{ overflow: 'hidden', textAlign: 'center', width: '100%', ...style }} className={className}>
      {/* 
        IMPORTANT: Replace 'ca-pub-XXXXXXXXXXXXXXXX' with your real Google AdSense Publisher ID
        Replace '1234567890' with your specific Ad Slot ID for this placement if needed.
      */}
      <ins 
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-2086654176767394" 
        /* data-ad-slot="1234567890" */
        data-ad-format={format}
        data-ad-layout={layout}
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}
