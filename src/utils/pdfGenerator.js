// src/utils/pdfGenerator.js
import html2pdf from 'html2pdf.js';

export default async function generateVTMCharacterSheetPDF(character) {
  // 1. Parse the sheet data securely
  let sheet = {};
  try {
    sheet = typeof character.sheet === 'string' ? JSON.parse(character.sheet) : (character.sheet || {});
  } catch (e) {
    console.error('Invalid sheet JSON', e);
    alert('Invalid JSON sheet. Cannot generate PDF.');
    return;
  }

  // --- Helpers for dots and boxes ---
  const renderDots = (value, max = 5) => {
    let html = '<div class="dots-container">';
    for (let i = 1; i <= max; i++) {
      html += `<span class="dot ${i <= (value || 0) ? 'filled' : ''}"></span>`;
    }
    html += '</div>';
    return html;
  };

  const renderBoxes = (value, max = 10) => {
    let html = '<div class="boxes-container">';
    for (let i = 1; i <= max; i++) {
      html += `<span class="box ${i <= (value || 0) ? 'filled' : ''}"></span>`;
    }
    html += '</div>';
    return html;
  };

  // --- Data Extraction ---
  const attrs = sheet.attributes || {};
  const skills = sheet.skills || {};
  const getSkill = (k) => typeof skills[k] === 'object' ? skills[k].dots : skills[k];
  const disciplines = sheet.disciplines || {};
  const merits = (sheet.advantages && sheet.advantages.merits) || [];
  const flaws = (sheet.advantages && sheet.advantages.flaws) || [];

  // Use the absolute URL so html2pdf and the new window can definitely find your image
  const logoUrl = window.location.origin + '/img/ATT-logo(1).png';

  // --- HTML Template ---
  const contentHtml = `
    <div id="vtm-sheet-content" style="font-family: 'Crimson Text', serif; color: #222; background: #fff; padding: 20px 40px; width: 800px; margin: 0 auto; box-sizing: border-box;">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Oswald:wght@400;700&display=swap');
        
        #vtm-sheet-content h1, #vtm-sheet-content h2, #vtm-sheet-content h3, #vtm-sheet-content .section-title { font-family: 'Oswald', sans-serif; text-transform: uppercase; }
        
        /* Updated Header for Logo */
        #vtm-sheet-content .header { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 30px; border-bottom: 2px solid #8a0303; padding-bottom: 10px; }
        #vtm-sheet-content .header img { height: 55px; width: auto; object-fit: contain; }
        #vtm-sheet-content .header h1 { color: #8a0303; font-size: 32px; letter-spacing: 2px; margin: 0; }
        
        #vtm-sheet-content .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px 30px; margin-bottom: 30px; font-size: 14px; }
        #vtm-sheet-content .meta-field { display: flex; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
        #vtm-sheet-content .meta-field strong { margin-right: 8px; color: #8a0303; font-family: 'Oswald', sans-serif; }
        #vtm-sheet-content .meta-field span { flex: 1; }
        #vtm-sheet-content .section-title { text-align: center; color: #8a0303; font-size: 18px; margin: 20px 0 15px; border-top: 1px solid #8a0303; border-bottom: 1px solid #8a0303; padding: 4px 0; letter-spacing: 1px; }
        #vtm-sheet-content .three-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        #vtm-sheet-content .two-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; }
        #vtm-sheet-content .col-header { text-align: center; font-style: italic; color: #666; margin-bottom: 10px; }
        #vtm-sheet-content .stat-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 15px; }
        #vtm-sheet-content .dots-container, #vtm-sheet-content .boxes-container { display: flex; gap: 3px; }
        #vtm-sheet-content .dot { width: 10px; height: 10px; border: 1px solid #222; border-radius: 50%; background: #fff; display: inline-block; box-sizing: border-box; }
        #vtm-sheet-content .dot.filled { background: #8a0303; border-color: #8a0303; }
        #vtm-sheet-content .box { width: 12px; height: 12px; border: 1px solid #222; background: #fff; display: inline-block; box-sizing: border-box; }
        #vtm-sheet-content .box.filled { background: #222; }
        #vtm-sheet-content .trackers { margin-top: 30px; padding: 15px; background: #f4f4f4; border: 1px solid #ddd; border-radius: 4px; }
        #vtm-sheet-content .tracker-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        #vtm-sheet-content .tracker-row strong { font-family: 'Oswald', sans-serif; font-size: 16px; width: 100px; }
      </style>

      <div class="header">
        <img src="${logoUrl}" alt="ATT Logo" />
        <h1>VAMPIRE THE MASQUERADE</h1>
      </div>

      <div class="meta-grid">
        <div class="meta-field"><strong>Name:</strong> <span>${character.name || sheet.name || ''}</span></div>
        <div class="meta-field"><strong>Concept:</strong> <span>${sheet.concept || ''}</span></div>
        <div class="meta-field"><strong>Predator:</strong> <span>${sheet.predatorType || sheet.predator_type || ''}</span></div>
        
        <div class="meta-field"><strong>Chronicle:</strong> <span>${sheet.chronicle || 'Athens Through-Time'}</span></div>
        <div class="meta-field"><strong>Ambition:</strong> <span>${sheet.ambition || ''}</span></div>
        <div class="meta-field"><strong>Sire:</strong> <span>${sheet.sire || ''}</span></div>
        
        <div class="meta-field"><strong>Clan:</strong> <span>${character.clan || ''}</span></div>
        <div class="meta-field"><strong>Desire:</strong> <span>${sheet.desire || ''}</span></div>
        <div class="meta-field"><strong>Generation:</strong> <span>${sheet.generation || ''}</span></div>
      </div>

      <div class="section-title">ATTRIBUTES</div>
      <div class="three-col">
        <div>
          <div class="col-header">Physical</div>
          <div class="stat-row"><span>Strength</span> ${renderDots(attrs.Strength)}</div>
          <div class="stat-row"><span>Dexterity</span> ${renderDots(attrs.Dexterity)}</div>
          <div class="stat-row"><span>Stamina</span> ${renderDots(attrs.Stamina)}</div>
        </div>
        <div>
          <div class="col-header">Social</div>
          <div class="stat-row"><span>Charisma</span> ${renderDots(attrs.Charisma)}</div>
          <div class="stat-row"><span>Manipulation</span> ${renderDots(attrs.Manipulation)}</div>
          <div class="stat-row"><span>Composure</span> ${renderDots(attrs.Composure)}</div>
        </div>
        <div>
          <div class="col-header">Mental</div>
          <div class="stat-row"><span>Intelligence</span> ${renderDots(attrs.Intelligence)}</div>
          <div class="stat-row"><span>Wits</span> ${renderDots(attrs.Wits)}</div>
          <div class="stat-row"><span>Resolve</span> ${renderDots(attrs.Resolve)}</div>
        </div>
      </div>

      <div class="section-title">SKILLS</div>
      <div class="three-col">
        <div>
          <div class="stat-row"><span>Athletics</span> ${renderDots(getSkill('Athletics'))}</div>
          <div class="stat-row"><span>Brawl</span> ${renderDots(getSkill('Brawl'))}</div>
          <div class="stat-row"><span>Craft</span> ${renderDots(getSkill('Craft'))}</div>
          <div class="stat-row"><span>Drive</span> ${renderDots(getSkill('Drive'))}</div>
          <div class="stat-row"><span>Firearms</span> ${renderDots(getSkill('Firearms'))}</div>
          <div class="stat-row"><span>Larceny</span> ${renderDots(getSkill('Larceny'))}</div>
          <div class="stat-row"><span>Melee</span> ${renderDots(getSkill('Melee'))}</div>
          <div class="stat-row"><span>Stealth</span> ${renderDots(getSkill('Stealth'))}</div>
          <div class="stat-row"><span>Survival</span> ${renderDots(getSkill('Survival'))}</div>
        </div>
        <div>
          <div class="stat-row"><span>Animal Ken</span> ${renderDots(getSkill('Animal Ken'))}</div>
          <div class="stat-row"><span>Etiquette</span> ${renderDots(getSkill('Etiquette'))}</div>
          <div class="stat-row"><span>Insight</span> ${renderDots(getSkill('Insight'))}</div>
          <div class="stat-row"><span>Intimidation</span> ${renderDots(getSkill('Intimidation'))}</div>
          <div class="stat-row"><span>Leadership</span> ${renderDots(getSkill('Leadership'))}</div>
          <div class="stat-row"><span>Performance</span> ${renderDots(getSkill('Performance'))}</div>
          <div class="stat-row"><span>Persuasion</span> ${renderDots(getSkill('Persuasion'))}</div>
          <div class="stat-row"><span>Streetwise</span> ${renderDots(getSkill('Streetwise'))}</div>
          <div class="stat-row"><span>Subterfuge</span> ${renderDots(getSkill('Subterfuge'))}</div>
        </div>
        <div>
          <div class="stat-row"><span>Academics</span> ${renderDots(getSkill('Academics'))}</div>
          <div class="stat-row"><span>Awareness</span> ${renderDots(getSkill('Awareness'))}</div>
          <div class="stat-row"><span>Finance</span> ${renderDots(getSkill('Finance'))}</div>
          <div class="stat-row"><span>Investigation</span> ${renderDots(getSkill('Investigation'))}</div>
          <div class="stat-row"><span>Medicine</span> ${renderDots(getSkill('Medicine'))}</div>
          <div class="stat-row"><span>Occult</span> ${renderDots(getSkill('Occult'))}</div>
          <div class="stat-row"><span>Politics</span> ${renderDots(getSkill('Politics'))}</div>
          <div class="stat-row"><span>Science</span> ${renderDots(getSkill('Science'))}</div>
          <div class="stat-row"><span>Technology</span> ${renderDots(getSkill('Technology'))}</div>
        </div>
      </div>

      <div class="trackers two-col">
        <div>
          <div class="tracker-row">
            <strong>HEALTH</strong>
            ${renderBoxes(sheet.health_current ?? (attrs.Stamina + 3), attrs.Stamina + 3)}
          </div>
          <div class="tracker-row">
            <strong>WILLPOWER</strong>
            ${renderBoxes(sheet.willpower_current ?? (attrs.Composure + attrs.Resolve), attrs.Composure + attrs.Resolve)}
          </div>
        </div>
        <div>
          <div class="tracker-row">
            <strong>HUMANITY</strong>
            ${renderBoxes(sheet.humanity || 7, 10)}
          </div>
          <div class="tracker-row">
            <strong>HUNGER</strong>
            ${renderBoxes(sheet.hunger || 1, 5)}
          </div>
        </div>
      </div>

      <div class="section-title">DISCIPLINES & POWERS</div>
      <div class="three-col">
        ${Object.entries(disciplines).filter(([_,v]) => Number(v)>0).map(([d, val]) => `
          <div>
            <div class="stat-row"><strong>${d}</strong> ${renderDots(val)}</div>
            <div style="padding-left:10px; font-size:13px; color:#555;">
              ${(sheet.disciplinePowers?.[d] || []).map(p => `• ${p.name || p.id}`).join('<br>')}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="section-title">ADVANTAGES & FLAWS</div>
      <div class="two-col">
        <div>
          <div class="col-header">Merits & Backgrounds</div>
          ${merits.map(m => `<div class="stat-row"><span>${m.name || m.id}</span> ${renderDots(m.dots)}</div>`).join('')}
        </div>
        <div>
          <div class="col-header">Flaws</div>
          ${flaws.map(f => `<div class="stat-row"><span>${f.name || f.id}</span> ${renderDots(f.dots)}</div>`).join('')}
        </div>
      </div>
    </div>
  `;

  // 2. OPEN THE HTML IN A NEW TAB
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>${character.name || 'Character'} - V5 Sheet</title></head>
        <body style="margin: 0; background: #e5e5e5; display: flex; justify-content: center; padding: 20px;">
          <div style="box-shadow: 0 0 10px rgba(0,0,0,0.3);">
            ${contentHtml}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  } else {
    alert("Pop-up blocked! Could not open the new tab.");
  }

  // 3. GENERATE AND DOWNLOAD PDF IN THE BACKGROUND
  const hiddenContainer = document.createElement('div');
  hiddenContainer.innerHTML = contentHtml;
  hiddenContainer.style.position = 'absolute';
  hiddenContainer.style.left = '-9999px';
  hiddenContainer.style.top = '0';
  document.body.appendChild(hiddenContainer);

  const fileName = `${(character.name || 'Character').replace(/\s+/g, '_')}_Sheet.pdf`;
  const opt = {
    margin:       10,
    filename:     fileName,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(hiddenContainer.firstElementChild).save().then(() => {
    document.body.removeChild(hiddenContainer);
  }).catch(err => {
    console.error('PDF Download Error:', err);
    document.body.removeChild(hiddenContainer);
  });
}