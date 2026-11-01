import React from 'react';

const AdsterraBanner = ({ adKey, width, height, className = '', style = {} }) => {
  if (!adKey || !width || !height) return null;

  const src = `/adsterra-banner.html?key=${encodeURIComponent(adKey)}&width=${encodeURIComponent(width)}&height=${encodeURIComponent(height)}`;

  return (
    <div
      className={`adsterra-banner-wrapper ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        maxWidth: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...style,
      }}
    >
      <iframe
        src={src}
        // No allow-same-origin: the ad page is served from our own origin with CSP
        // stripped (see public/.htaccess), so without the sandbox the third-party ad
        // script would run as portal.attlarp.gr and could reach the parent app and
        // the API with the visitor's session cookie. Sandboxed it gets an opaque origin.
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        title={`Advertisement ${width}x${height}`}
        width={width}
        height={height}
        allowTransparency="true"
        style={{
          border: 'none',
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: '100%',
          overflow: 'hidden',
          display: 'block',
          background: 'transparent',
        }}
        scrolling="no"
        loading="lazy"
      />
    </div>
  );
};

export default React.memo(AdsterraBanner);
