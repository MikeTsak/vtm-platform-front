// Utility functions for News module
export const apiJoin = (path) => {
  const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, "") : "";
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (API_BASE.endsWith("/api") && path.startsWith("/api/")) return `${API_BASE}${path.slice(4)}`;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const isVideoUrl = (url) => /\.(mp4|webm)|#video/i.test(url);