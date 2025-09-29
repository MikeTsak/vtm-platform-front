// src/pages/AdminNPCView.jsx 
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import CharacterView from './CharacterView';
import { AuthCtx } from '../AuthContext';

export default function AdminNPCView() {
  const { user } = React.useContext(AuthCtx);
  const { id } = useParams();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  const npcId = Number(id);
  if (!Number.isInteger(npcId)) return <div>Bad NPC id.</div>;

  return <CharacterView adminNPCId={npcId} />;
}
