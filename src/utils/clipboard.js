// src/utils/clipboard.js
export async function copyToClipboard(text) {
  if (!text || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
