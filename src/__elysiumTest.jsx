// TEMPORARY test page. Delete after use.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { InvitationCard } from './features/court/ElysiumInvitation';
import DownloadCardButton from './features/court/CardExport';
import { DEFAULT_TEXT_BY_LANG } from './features/court/elysiumPresets';

const date = '2026-10-10T15:00:00.000Z';
const en = { ...DEFAULT_TEXT_BY_LANG.en, name: 'Feast of Thorns', location: 'Club Κοινόδοντας', design: { lang: 'en' } };
const el = { ...DEFAULT_TEXT_BY_LANG.el, name: 'Το Γλέντι των Αγκαθιών', location: 'Club Κοινόδοντας', design: { lang: 'el', font: 'script' } };
const guest = { name: 'Ιάσονας Παπαπέτρου', clan: 'Toreador' };

function App() {
  return (
    <div style={{ display: 'flex', gap: 24, padding: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ width: 520 }} id="c-en"><InvitationCard invitation={en} eventDate={date} guest={guest} /></div>
      <div style={{ width: 520 }} id="c-el"><InvitationCard invitation={el} eventDate={date} guest={guest} /></div>
      <div style={{ width: 520 }} id="c-barred"><InvitationCard invitation={el} eventDate={date} guest={guest} barred /></div>
      <DownloadCardButton id="dl" className="dl" invitation={el} eventDate={date} guest={guest} filename="test-el">Download image</DownloadCardButton>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
