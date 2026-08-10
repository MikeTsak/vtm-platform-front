export function formatEuDate(dateValue) {
  if (!dateValue) return "";
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return String(dateValue);
    const pad = (n) => String(n).padStart(2, '0');
    const dd = pad(d.getDate());
    const mm = pad(d.getMonth() + 1);
    const yy = String(d.getFullYear()).slice(-2);
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${dd}/${mm}/${yy} ${hh}:${min}:${ss}`;
  } catch (e) {
    return String(dateValue);
  }
}
