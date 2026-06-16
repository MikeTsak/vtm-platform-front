// Utility functions for News module
export const apiJoin = (path) => {
  const RAW_BASE = process.env.REACT_APP_API_URL || (window.location.port === "3000" ? "http://localhost:3001/api" : "/api");
  const API_BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, "") : "";
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (API_BASE.endsWith("/api") && path.startsWith("/api/")) return `${API_BASE}${path.slice(4)}`;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const isVideoUrl = (url) => /\.(mp4|webm)|#video/i.test(url);