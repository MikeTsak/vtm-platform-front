// src/pages/AdminNPC.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import CharacterView from './CharacterView';

export default function AdminNPC() {
  const { id } = useParams();
  // CharacterView knows how to hit /admin/npcs/:id when adminNPCId is set
  return <CharacterView adminNPCId={id} />;
}
