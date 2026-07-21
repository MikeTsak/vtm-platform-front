import api from '../core/api';
import { io as socketIoClient } from 'socket.io-client';

const base = '/live-session';

// Use the exact same base URL as the API client, but switch protocol if needed.
// If the app is served from the same host, we can just omit the URL or use env vars.
// The api instance knows the baseURL:
const backendUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : window.location.origin;

export const socket = socketIoClient(backendUrl);

export const createLiveSession = async (payload) => {
  const { data } = await api.post(base, payload);
  return data;
};

export const getLiveSession = async (sessionId) => {
  const { data } = await api.get(`${base}/${sessionId}`);
  return data;
};

export const joinLiveSession = async (sessionId, payload) => {
  const { data } = await api.post(`${base}/${sessionId}/join`, payload);
  return data;
};

export const logLiveSessionRoll = async (sessionId, payload) => {
  const { data } = await api.post(`${base}/${sessionId}/rolls`, payload);
  return data;
};

export const getLiveSessionRolls = async (sessionId) => {
  const { data } = await api.get(`${base}/${sessionId}/rolls`);
  return data;
};

export const getLiveSessionPlayers = async (sessionId) => {
  const { data } = await api.get(`${base}/${sessionId}/players`);
  return data;
};

export const updateLiveSessionPlayer = async (sessionId, characterId, payload) => {
  const { data } = await api.patch(`${base}/${sessionId}/players/${characterId}`, payload);
  return data;
};

export const sendLiveSessionBroadcast = async (sessionId, payload) => {
  const { data } = await api.post(`${base}/${sessionId}/broadcast`, payload);
  return data;
};

export const getLiveSessionBroadcasts = async (sessionId) => {
  const { data } = await api.get(`${base}/${sessionId}/broadcast`);
  return data;
};
