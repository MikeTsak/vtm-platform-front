// src/features/admin/thermalPrint.js
//
// Shared by the admin print tools (PrintTool, StatsTab) for the Epson
// TM-T20III: 80 mm roll, 72 mm printed. The Epson driver set to cut every
// page cuts after each printed page.
//
// A web page can't change Windows or Chrome print settings, and a custom
// @page size the driver doesn't know makes Chrome SHRINK the whole page to the
// nearest paper it does know (tiny print). So the page size is never set
// here: the layout is made to fit the paper chosen in the print dialog.

// Roll Paper lengths the Epson driver offers.
export const PAGE_CHOICES = [
  { mm: 297, label: '297 mm pieces, cut between them' },
  { mm: 3276, label: 'One long receipt (3276 mm)' },
];
export const DEFAULT_PAGE_MM = 297;

const PX_PER_MM = 96 / 25.4;
const PAGE_WIDTH_MM = 80;

export const thermalPageMm = () => {
  try {
    const mm = Number(localStorage.getItem('printTool.pageMm'));
    return PAGE_CHOICES.some((c) => c.mm === mm) ? mm : DEFAULT_PAGE_MM;
  } catch { return DEFAULT_PAGE_MM; }
};
export const saveThermalPageMm = (mm) => {
  try { localStorage.setItem('printTool.pageMm', String(mm)); } catch { /* private window */ }
};

// Side margin in mm, set in the print tool (the head doesn't reach the edges).
export const thermalSideMm = () => {
  try { return Number(localStorage.getItem('printTool.sideMm')) || 7; } catch { return 7; }
};

// Starts a new page before any `.unit` that would run past the bottom of the
// current one, so a cut never lands inside a card. Heights are measured at the
// paper's width. A unit taller than a whole page just spills onto the next.
// Returns the number of pages.
export function paginate(doc, pageMm) {
  const limit = (pageMm - 8) * PX_PER_MM; // 8 mm slack: the head's dead zone and rounding
  const lead = 3 * PX_PER_MM; // top padding a page-start unit gets
  let used = 0;
  let pages = 1;
  for (const unit of doc.querySelectorAll('.unit')) {
    const h = unit.getBoundingClientRect().height;
    if (used > 0 && used + h + lead > limit) {
      unit.classList.add('pageStart');
      unit.style.breakBefore = 'page';
      used = lead;
      pages += 1;
    }
    used += h;
  }
  return pages;
}

// Prints a document in a hidden iframe, so the app's layout and print rules
// stay out of it. Resolves once the print dialog has closed.
//   paginateMm: split `.unit` blocks into pages of this length (see above);
//               resolves { pages }.
let frame = null;
export async function printDocument(bodyHtml, css, { paginateMm = 0 } = {}) {
  frame?.remove();
  frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  // Laid out at the paper's width (off-screen), so heights can be measured.
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_WIDTH_MM}mm;height:200px;border:0;`;
  document.body.appendChild(frame);
  await new Promise((resolve) => {
    frame.onload = resolve;
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>Print</title><style>${css}</style></head><body>${bodyHtml}</body></html>`;
  });
  const doc = frame.contentDocument;
  await Promise.all([...doc.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r; }))));
  await doc.fonts?.ready;

  const result = paginateMm ? { pages: paginate(doc, paginateMm) } : null;

  frame.contentWindow.focus();
  frame.contentWindow.print();
  return result;
}
