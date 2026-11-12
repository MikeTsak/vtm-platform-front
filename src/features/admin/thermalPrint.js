// src/features/admin/thermalPrint.js
//
// Shared by the admin print tools (PrintTool, StatsTab) for the Epson
// TM-T20III: 80 mm roll, 72 mm printed. The Epson driver set to cut every
// page cuts after each printed page.

// The longest page the Epson driver offers (Roll Paper 80 x 3276 mm).
export const MAX_PAGE_MM = 3276;
const PAGE_WIDTH_MM = 80;

// Side margin in mm, set in the print tool (the head doesn't reach the edges).
export const thermalSideMm = () => {
  try { return Number(localStorage.getItem('printTool.sideMm')) || 7; } catch { return 7; }
};

// Prints a document in a hidden iframe, so the app's layout and print rules
// stay out of it. Resolves once the print dialog has closed.
//
// fitPage: make the page exactly as tall as the content (an 80 mm wide page),
// so one long report is ONE page and the printer doesn't cut it in pieces at
// the paper size's length. Resolves { heightMm, capped }: capped is true when
// the content is longer than the longest page the driver offers, and it then
// continues on a second page.
let frame = null;
export async function printDocument(bodyHtml, css, { fitPage = false } = {}) {
  frame?.remove();
  frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  // Laid out at the paper's width (off-screen) so its height can be measured.
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_WIDTH_MM}mm;height:200px;border:0;`;
  document.body.appendChild(frame);
  await new Promise((resolve) => {
    frame.onload = resolve;
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>Print</title><style>${css}</style></head><body>${bodyHtml}</body></html>`;
  });
  const doc = frame.contentDocument;
  await Promise.all([...doc.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r; }))));
  await doc.fonts?.ready;

  let result = null;
  if (fitPage) {
    const px = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
    const wanted = Math.ceil((px * 25.4) / 96) + 4; // a little slack so it never spills a line onto page two
    const heightMm = Math.min(wanted, MAX_PAGE_MM);
    const style = doc.createElement('style');
    style.textContent = `@page { size: ${PAGE_WIDTH_MM}mm ${heightMm}mm; margin: 0; }`;
    doc.head.appendChild(style);
    result = { heightMm, capped: wanted > MAX_PAGE_MM };
  }

  frame.contentWindow.focus();
  frame.contentWindow.print();
  return result;
}
