// src/utils/pdfGenerator.js

export default async function generateVTMCharacterSheetPDF(character) {
  // 1. Parse the sheet data securely (Handle both wrapped and raw sheet objects)
  let sheet = {};
  try {
    if (character.sheet) {
      sheet = typeof character.sheet === 'string' ? JSON.parse(character.sheet) : character.sheet;
    } else {
      sheet = character; // Fallback if the object passed IS the sheet directly
    }
  } catch (e) {
    console.error('Invalid sheet JSON', e);
    alert('Invalid JSON sheet. Cannot generate PDF.');
    return;
  }

  // --- Date Formatter ---
  const formatExportDate = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mmm = months[now.getMonth()];
    const yyyy = now.getFullYear();
    return `${hh}:${mm} - ${dd} ${mmm} ${yyyy}`;
  };

  // --- Helpers for dots and boxes ---
  const renderDots = (value, max = 5) => {
    let html = '<div class="dots-container">';
    for (let i = 1; i <= max; i++) {
      html += `<span class="dot ${i <= (Number(value) || 0) ? 'filled' : ''}"></span>`;
    }
    html += '</div>';
    return html;
  };

  // Advanced tracker renderer for X, /, and blood emojis
  const renderTrackerBoxes = (max, agg = 0, sup = 0, isValueTracker = false, value = 0, stains = 0, isHunger = false) => {
    let html = '<div class="boxes-container">';
    for (let i = 0; i < max; i++) {
      let content = '';
      let isFilled = false;
      let boxStyle = 'width: 14px; height: 14px; border: 1px solid #222; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; line-height: 1;';

      if (isValueTracker) {
        if (i < (Number(value) || 0)) isFilled = true;
        if (i >= max - (Number(stains) || 0)) content = '/';
        
        if (isFilled) {
          if (isHunger) {
            content = '🩸';
            boxStyle += ' background: rgba(0,0,0,0.05); border-color: rgba(128,128,128,0.5); font-size: 10px;';
          } else {
            boxStyle += ' background: #222; color: #fff;';
          }
        } else {
          boxStyle += ' background: #fff; color: #222;';
        }
      } else {
        boxStyle += ' background: #fff; color: #222;';
        if (i < (Number(agg) || 0)) { 
          content = 'X'; 
          boxStyle += ' color: #b40f1f;'; 
        } 
        else if (i < (Number(agg) || 0) + (Number(sup) || 0)) { 
          content = '/'; 
        }
      }

      html += `<span style="${boxStyle}">${content}</span>`;
    }
    html += '</div>';
    return html;
  };

  // --- Data Extraction with Ultra-Safe Null Checks ---
  const attrs = sheet.attributes || {};
  const skills = sheet.skills || {};
  
  // Safely extract skill dots whether they are an object or a flat number
  const getSkill = (k) => (skills[k] && typeof skills[k] === 'object') ? skills[k].dots : (skills[k] || 0);
  
  const disciplines = sheet.disciplines || {};
  const merits = Array.isArray(sheet.advantages?.merits) ? sheet.advantages.merits : [];
  const flaws = Array.isArray(sheet.advantages?.flaws) ? sheet.advantages.flaws : [];

  // Calculate dynamic max values and current tracker status
  const stamina = Number(attrs.Stamina) || 1;
  let maxHealth = stamina + 3;
  
  const fortitudePowers = Array.isArray(sheet.disciplinePowers?.Fortitude) ? sheet.disciplinePowers.Fortitude : [];
  if (fortitudePowers.some(p => String(p?.name || p?.id || '').toLowerCase().includes('resilience'))) {
     maxHealth += Number(sheet.disciplines?.Fortitude || 0);
  }
  
  const maxWillpower = (Number(attrs.Composure) || 1) + (Number(attrs.Resolve) || 1);

  const healthAgg = sheet.health?.aggravated || 0;
  const healthSup = sheet.health?.superficial || 0;

  const wpAgg = sheet.willpower?.aggravated || 0;
  const wpSup = sheet.willpower?.superficial || 0;

  const humanityVal = sheet.morality?.humanity ?? sheet.humanity ?? 7;
  const stains = sheet.stains || 0;
  const hungerVal = sheet.hunger || 0;

  // Use the absolute URL so html2pdf and the new window can definitely find your image
  const logoUrl = window.location.origin + '/img/ATT-logo(1).png';
  const exportDateString = formatExportDate();

  // --- STRICTLY NO SPACES IN FILENAME ---
  const charName = (character.name || sheet.name || 'Character').trim();
  let rawFileName = `${charName}-Athens-Through-Time-VTM-${exportDateString}.pdf`;
  const finalFileName = rawFileName.replace(/[\s:]+/g, '-').replace(/-+/g, '-');
  
  // Very important: Escape single quotes so it doesn't break the injected javascript
  const safeFileName = finalFileName.replace(/'/g, "\\'");

  // --- HTML Template for the VTM Sheet ---
  const contentHtml = `
    <div id="vtm-sheet-content" style="font-family: 'Crimson Text', serif; color: #222; background: #fff; padding: 20px 40px; width: 800px; margin: 0 auto; box-sizing: border-box;">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Oswald:wght@400;700&display=swap');
        
        #vtm-sheet-content h1, #vtm-sheet-content h2, #vtm-sheet-content h3, #vtm-sheet-content .section-title { font-family: 'Oswald', sans-serif; text-transform: uppercase; }
        
        /* Updated Header for Logo and Subtitle */
        #vtm-sheet-content .header { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 30px; border-bottom: 2px solid #8a0303; padding-bottom: 10px; }
        #vtm-sheet-content .header img { height: 65px; width: auto; object-fit: contain; }
        #vtm-sheet-content .header-text { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; }
        #vtm-sheet-content .header h1 { color: #8a0303; font-size: 32px; letter-spacing: 2px; margin: 0; line-height: 1.1; }
        #vtm-sheet-content .header .subtitle { font-family: 'Oswald', sans-serif; font-size: 16px; color: #555; letter-spacing: 1px; margin-top: 2px; text-transform: uppercase; }
        
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
        <div class="header-text">
          <h1>VAMPIRE THE MASQUERADE</h1>
          <div class="subtitle">Chronicle: Athens Through-Time LARP</div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-field"><strong>Name:</strong> <span>${charName}</span></div>
        <div class="meta-field"><strong>Concept:</strong> <span>${sheet.concept || ''}</span></div>
        <div class="meta-field"><strong>Predator:</strong> <span>${sheet.predatorType || sheet.predator_type || ''}</span></div>
        
        <div class="meta-field"><strong>Exported:</strong> <span>${exportDateString}</span></div>
        <div class="meta-field"><strong>Ambition:</strong> <span>${sheet.ambition || ''}</span></div>
        <div class="meta-field"><strong>Sire:</strong> <span>${sheet.sire || ''}</span></div>
        
        <div class="meta-field"><strong>Clan:</strong> <span>${character.clan || sheet.clan || ''}</span></div>
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
            ${renderTrackerBoxes(maxHealth, healthAgg, healthSup, false)}
          </div>
          <div class="tracker-row">
            <strong>WILLPOWER</strong>
            ${renderTrackerBoxes(maxWillpower, wpAgg, wpSup, false)}
          </div>
        </div>
        <div>
          <div class="tracker-row">
            <strong>HUMANITY</strong>
            ${renderTrackerBoxes(10, 0, 0, true, humanityVal, stains, false)}
          </div>
          <div class="tracker-row">
            <strong>HUNGER</strong>
            ${renderTrackerBoxes(5, 0, 0, true, hungerVal, 0, true)}
          </div>
        </div>
      </div>

      <div class="section-title">DISCIPLINES & POWERS</div>
      <div class="three-col">
        ${Object.entries(disciplines).filter(([_,v]) => Number(v)>0).map(([d, val]) => `
          <div>
            <div class="stat-row"><strong>${d}</strong> ${renderDots(val)}</div>
            <div style="padding-left:10px; font-size:13px; color:#555;">
              ${(Array.isArray(sheet.disciplinePowers?.[d]) ? sheet.disciplinePowers[d] : []).map(p => `• ${p.name || p.id}`).join('<br>')}
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

  // --- HTML for the ENTIRE New Window (Includes CDN and Button) ---
  const fullHtmlPage = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${charName} - V5 Sheet</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
          body {
            margin: 0; 
            background: #e5e5e5; 
            display: flex; 
            flex-direction: column;
            align-items: center; 
            padding: 40px 20px;
            font-family: sans-serif;
          }
          .sheet-wrapper {
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            background: #fff;
          }
          .action-area {
            width: 100%;
            max-width: 800px; /* Matches the sheet width */
            margin-bottom: 20px;
            display: flex;
          }
          .btn-download {
            background-color: #8a0303;
            color: #fff;
            border: none;
            padding: 20px;
            font-size: 20px;
            border-radius: 0px; /* Sharp, boxy corners */
            cursor: pointer;
            font-weight: bold;
            width: 100%; /* Long, full width */
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            transition: all 0.2s ease;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .btn-download:hover {
            background-color: #600202;
          }
          .btn-download:disabled {
            background-color: #555;
            cursor: wait;
          }
        </style>
      </head>
      <body>
        
        <div class="action-area">
          <button id="download-btn" class="btn-download">Download PDF</button>
        </div>

        <div class="sheet-wrapper">
          ${contentHtml}
        </div>

        <script>
          document.getElementById('download-btn').addEventListener('click', function() {
            var btn = this;
            var originalText = btn.innerText;
            
            // UI feedback while processing
            btn.innerText = 'GENERATING PDF... PLEASE WAIT';
            btn.disabled = true;

            var element = document.getElementById('vtm-sheet-content');
            
            // MAGIC FIX: scrollY: 0 prevents the huge blank space at the top
            var opt = {
              margin:       [5, 0, 5, 0],
              filename:     '${safeFileName}',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true, scrollY: 0, scrollX: 0 },
              jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Call the globally loaded html2pdf library
            html2pdf().set(opt).from(element).save().then(function() {
               // Restore button state after download starts
               btn.innerText = originalText;
               btn.disabled = false;
            }).catch(function(err) {
               console.error("PDF Generation Error:", err);
               alert("An error occurred while generating the PDF.");
               btn.innerText = originalText;
               btn.disabled = false;
            });
          });
        </script>

      </body>
    </html>
  `;

  // 2. Convert the HTML string into a Blob URL to avoid the 'about:blank' display
  const blob = new Blob([fullHtmlPage], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  
  const printWindow = window.open(blobUrl, '_blank');
  
  if (!printWindow) {
    alert("Pop-up blocked! Could not open the new tab to view your character sheet.");
  }
}