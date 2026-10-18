// "Get item" (player sheet) / "Take back item" (admin tab): scan a code, then
// hand it to ReceiveFlow for the "are you sure?" and the handshake.
import React, { useState } from 'react';
import QrScanner from './QrScanner';
import ReceiveFlow from './ReceiveFlow';

export default function GetItem({ className, onClaimed, asStoryteller = false, label = 'Get item' }) {
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState(null);

  const finish = () => { setCode(null); onClaimed?.(); };

  return (
    <>
      <button type="button" className={className} onClick={() => setScanning(true)}>
        <span className="material-symbols-outlined" aria-hidden="true">qr_code_scanner</span> {label}
      </button>
      {scanning && (
        <QrScanner
          title={label}
          onCode={(c) => { setScanning(false); setCode(c); }}
          onClose={() => setScanning(false)}
        />
      )}
      {code && (
        <ReceiveFlow
          code={code}
          asStoryteller={asStoryteller}
          onClose={() => setCode(null)}
          onDone={finish}
          onRetry={() => { setCode(null); setScanning(true); }}
        />
      )}
    </>
  );
}
