import React, { useEffect, useRef } from 'react';

/**
 * Reusable Google AdSense component
 * Pass your ad-slot ID via the `slot` prop for each placement.
 * Requires the AdSense script tag in index.html to function properly.
 */
export default function GoogleAd({ style, className, format = 'auto', layout = '', slot = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && ref.current) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense error', e);
    }
  }, []);

  return (
    <div ref={ref} style={{ overflow: 'hidden', textAlign: 'center', width: '100%', ...style }} className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-2086654176767394"
        data-ad-slot={slot || undefined}
        data-ad-format={format}
        data-ad-layout={layout}
        data-full-width-responsive="true"
      />
    </div>
  );
}
