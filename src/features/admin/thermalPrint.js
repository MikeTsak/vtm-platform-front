// src/features/admin/thermalPrint.js
//
// Shared by the admin print tools (PrintTool, StatsTab) for the Epson
// TM-T20III: 80 mm roll, 72 mm printed. The Epson driver set to cut every
// page cuts after each printed page.

// Side margin in mm, set in the print tool (the head doesn't reach the edges).
export const thermalSideMm = () => {
  try { return Number(localStorage.getItem('printTool.sideMm')) || 7; } catch { return 7; }
};

// Prints a document in a hidden iframe, so the app's layout and print rules
// stay out of it. Resolves once the print dialog has closed.
let frame = null;
export async function printDocument(bodyHtml, css) {
  frame?.remove();
  frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  await new Promise((resolve) => {
    frame.onload = resolve;
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>Print</title><style>${css}</style></head><body>${bodyHtml}</body></html>`;
  });
  const doc = frame.contentDocument;
  await Promise.all([...doc.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r; }))));
  await doc.fonts?.ready;
  frame.contentWindow.focus();
  frame.contentWindow.print();
}
