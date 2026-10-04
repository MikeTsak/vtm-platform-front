// src/utils/ghoulPdfGenerator.js
import { listAllItems } from '../data/merits_flaws';
import { SKILL_DESCRIPTIONS } from '../data/descriptions';
import { ALL_DISCIPLINE_NAMES, DISCIPLINES } from '../data/disciplines';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

const TIER_TITLES = {
  1: 'Tier 1: Pawn',
  2: 'Tier 2: Associate',
  3: 'Tier 3: Specialist',
};

export default async function generateGhoulCharacterSheetPDF(retainer, options = {}) {
  let sheet = {};
  try {
    if (retainer.sheet) {
      sheet = typeof retainer.sheet === 'string' ? JSON.parse(retainer.sheet) : retainer.sheet;
    } else {
      sheet = retainer;
    }
  } catch (e) {
    console.error('Invalid ghoul sheet JSON', e);
    alert('Invalid JSON sheet. Cannot generate PDF.');
    return;
  }

  const formatExportDate = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mmm = months[now.getMonth()];
    const yyyy = now.getFullYear();
    return `${hh}:${mm} : ${dd} ${mmm} ${yyyy}`;
  };

  const renderDots = (value, max = 5) => {
    let html = '<div class="dots-container">';
    for (let i = 1; i <= max; i++) {
      html += `<span class="dot ${i <= (Number(value) || 0) ? 'filled' : ''}"></span>`;
    }
    html += '</div>';
    return html;
  };

  const renderTrackerBoxes = (max, agg = 0, sup = 0, isValueTracker = false, value = 0) => {
    let html = '<div class="boxes-container">';
    for (let i = 0; i < max; i++) {
      let content = '';
      let boxStyle = 'width: 14px; height: 14px; border: 1px solid #222; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; line-height: 1;';

      if (isValueTracker) {
        const isFilled = i < (Number(value) || 0);
        if (isFilled) {
          boxStyle += ' background: #222; color: #fff;';
        } else {
          boxStyle += ' background: #fff; color: #222;';
        }
      } else {
        boxStyle += ' background: #fff; color: #222;';
        if (i < (Number(agg) || 0)) {
          content = 'X';
          boxStyle += ' color: #b40f1f;';
        } else if (i < (Number(agg) || 0) + (Number(sup) || 0)) {
          content = '/';
        }
      }

      html += `<span style="${boxStyle}">${content}</span>`;
    }
    html += '</div>';
    return html;
  };

  // Basic Information
  const ghoulName = (retainer.retainer_name || retainer.name || sheet.name || 'Unnamed Ghoul').trim();
  const tier = Number(retainer.tier || sheet.tier || 1);
  const tierLabel = TIER_TITLES[tier] || `Tier ${tier}`;
  const isGhoul = Boolean(sheet.isGhoul ?? true);
  const natureLabel = isGhoul ? 'Ghoul (Bound by Vitae)' : 'Mortal Retainer';

  const domitorName = (
    retainer.domitor_name ||
    options.character?.name ||
    options.domitorName ||
    (options.selectedCoterie ? `Coterie: ${options.selectedCoterie.name}` : '') ||
    'Independent / Unknown'
  ).trim();

  const rawDomitorClan = retainer.domitor_clan || options.character?.clan || options.domitorClan || '';
  const domitorClan = (typeof rawDomitorClan === 'object' && rawDomitorClan !== null)
    ? String(rawDomitorClan.name || rawDomitorClan.title || rawDomitorClan.clan || '').trim()
    : String(rawDomitorClan || '').trim();

  const playerName = (retainer.player_name || options.playerName || 'Kindred Retainer').trim();

  // Avatar URL
  let avatarUrl = null;
  const retainerId = retainer.id || sheet.id;
  if (retainer.avatar_url || sheet.avatar_url) {
    const raw = retainer.avatar_url || sheet.avatar_url;
    avatarUrl = raw.startsWith('http') ? raw : `${window.location.origin}${raw.startsWith('/') ? '' : '/'}${raw}`;
  } else if (retainerId) {
    avatarUrl = `${window.location.origin}/api/retainers/${retainerId}/avatar`;
  }

  // Domitor Clan Logo
  const getClanTextLogoUrl = (rawClan) => {
    if (!rawClan) return null;
    let str = String(rawClan).trim().toLowerCase().replace(/^clan\s+/i, '').trim();
    const clanMap = {
      'banu haqim': 'Banu_Haqim',
      'banu_haqim': 'Banu_Haqim',
      'brujah': 'Brujah',
      'caitiff': 'Caitiff',
      'gangrel': 'Gangrel',
      'hecata': 'Hecata',
      'lasombra': 'Lasombra',
      'malkavian': 'Malkavian',
      'ministry': 'Ministry',
      'the ministry': 'Ministry',
      'the_ministry': 'Ministry',
      'nosferatu': 'Nosferatu',
      'ravnos': 'Ravnos',
      'salubri': 'Salubri',
      'thin-blood': 'Thinblood',
      'thin blood': 'Thinblood',
      'thinblood': 'Thinblood',
      'toreador': 'Toreador',
      'tremere': 'Tremere',
      'tzimisce': 'Tzimisce',
      'ventrue': 'Ventrue',
    };
    const fileName = clanMap[str] || clanMap[str.replace(/[\s_-]+/g, ' ')];
    if (fileName) {
      return `${window.location.origin}/img/clans/text/300px-${fileName}_logo.webp`;
    }
    return null;
  };
  const clanLogoUrl = getClanTextLogoUrl(domitorClan);

  // Attributes & Skills
  const attrs = sheet.attributes || {};
  const skills = sheet.skills || {};

  const getAttr = (k) => Number(attrs[k] ?? attrs[k.toLowerCase()] ?? 1);
  const getSkillDots = (k) => {
    const keyLower = k.toLowerCase();
    const foundKey = Object.keys(skills).find(key => key.toLowerCase() === keyLower);
    const node = foundKey ? skills[foundKey] : undefined;
    return (node && typeof node === 'object') ? Number(node.dots || 0) : Number(node || 0);
  };

  const renderSkillRow = (name) => {
    const dots = getSkillDots(name);
    const desc = SKILL_DESCRIPTIONS[name] || '';
    return `
      <div class="stat-row" style="align-items: center; margin-bottom: 5px;" title="${escapeHtml(desc)}">
        <span>${escapeHtml(name)}</span>
        ${renderDots(dots)}
      </div>
    `;
  };

  // Vitals & Trackers
  const stamina = getAttr('Stamina');
  let maxHealth = stamina + 3;

  // Ghoul flaw Crone's Curse lowers health
  const flawsList = Array.isArray(sheet.flaws) ? sheet.flaws : [];
  if (flawsList.some(f => (f.name || f.id || '').toLowerCase() === "crone's curse")) {
    maxHealth = Math.max(1, maxHealth - 1);
  }

  // Fortitude Resilience power bonus
  const disciplines = sheet.disciplines || {};
  const powers = Array.isArray(sheet.powers) ? sheet.powers : [];
  const fortitudeDots = Number(disciplines['Fortitude'] || disciplines['fortitude'] || 0);
  if (fortitudeDots > 0) {
    maxHealth += fortitudeDots;
  }

  const composure = getAttr('Composure');
  const resolve = getAttr('Resolve');
  const maxWillpower = composure + resolve;

  const healthAgg = sheet.health?.aggravated || 0;
  const healthSup = sheet.health?.superficial || 0;
  const wpAgg = sheet.willpower?.aggravated || 0;
  const wpSup = sheet.willpower?.superficial || 0;
  const humanityVal = sheet.humanity || 7;

  // Disciplines & Powers resolution
  const normalizeDiscName = (raw) => {
    const s = String(raw || '').trim().toLowerCase();
    const canon = ALL_DISCIPLINE_NAMES.find(n => n.toLowerCase() === s);
    if (canon) return canon;
    return String(raw || '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getDisciplinePowerFullData = (discName, power) => {
    const disc = DISCIPLINES[discName];
    if (!disc || !disc.levels) return null;
    const pId = typeof power === 'object' ? (power.id || power.name) : power;
    const pIdStr = String(pId || '').toLowerCase().trim();
    for (const level of Object.values(disc.levels)) {
      const found = level.find(p =>
        String(p.id).toLowerCase() === pIdStr ||
        String(p.name).toLowerCase() === pIdStr
      );
      if (found) return found;
    }
    return null;
  };

  const activeDisciplines = Object.entries(disciplines)
    .filter(([_, v]) => Number(v) > 0)
    .map(([d, v]) => [normalizeDiscName(d), Number(v)]);

  const renderDisciplineBlock = (discName, dots) => {
    const discPowers = powers.filter(p => normalizeDiscName(p.discipline || '') === discName);
    return `
      <div class="avoid-break" style="margin-bottom: 16px;">
        <div class="stat-row" style="border-bottom: 1px solid #8a0303; padding-bottom: 2px; margin-bottom: 8px;">
          <strong style="color: #8a0303; font-size: 15px; font-family: 'Oswald', sans-serif; text-transform: uppercase;">${escapeHtml(discName)}</strong>
          ${renderDots(dots)}
        </div>
        ${discPowers.length ? discPowers.map(p => {
          const full = getDisciplinePowerFullData(discName, p) || {};
          const powerName = p.name || full.name || p.id || 'Power';
          const lvl = p.level || full.level || 1;
          const roll = p.dice_pool || p.roll || full.dice_pool || '';
          const opposing = p.opposing_pool || full.opposing_pool || '';
          let rollText = '';
          if (roll && roll !== '—') {
            if (opposing && opposing !== 'None' && opposing !== '—') {
              rollText = `${roll} vs ${opposing}`;
            } else {
              rollText = roll;
            }
          }
          const cleanRoll = rollText.replace(/[—–]/g, '');
          const source = (p.source || full.source || '').replace(/[—–]/g, ', ');
          const desc = (p.notes || p.description || p.effect || p.system || full.notes || full.description || full.effect || full.system || '').replace(/[—–]/g, ', ');

          return `
            <div class="adv-entry avoid-break" style="margin-bottom: 10px;">
              <div class="stat-row" style="margin-bottom: 2px;">
                <span><strong>${escapeHtml(powerName)}</strong></span>
                <span style="font-family: 'Oswald', sans-serif; font-size: 11px; color: #8a0303; text-transform: uppercase;">Level ${escapeHtml(lvl)}</span>
              </div>
              ${desc ? `<div class="adv-desc" style="margin-bottom: 3px;">${escapeHtml(desc)}</div>` : ''}
              ${(cleanRoll || source) ? `
                <div style="font-size: 11px; color: #666; margin-top: 2px; display: flex; flex-wrap: wrap; gap: 10px;">
                  ${cleanRoll ? `<span><strong>Roll:</strong> ${escapeHtml(cleanRoll)}</span>` : ''}
                  ${source ? `<span><strong>Page:</strong> ${escapeHtml(source)}</span>` : ''}
                </div>
              ` : ''}
            </div>
          `;
        }).join('') : '<div class="adv-empty" style="padding-left: 4px;">Level 1 vitae affinity granted by Domitor</div>'}
      </div>
    `;
  };

  // Catalog Item Lookup for Advantages and Flaws
  const allCatalogItems = listAllItems();
  const catalogById = new Map();
  const catalogByName = new Map();
  allCatalogItems.forEach(item => {
    if (item.id) catalogById.set(String(item.id).toLowerCase(), item);
    if (item.name) catalogByName.set(String(item.name).toLowerCase(), item);
  });

  const findCatalogItem = (entry) => {
    if (!entry) return null;
    const idKey = String(entry.id || '').toLowerCase().trim();
    const nameKey = String(entry.name || '').toLowerCase().trim();
    if (idKey && catalogById.has(idKey)) return catalogById.get(idKey);
    if (nameKey && catalogByName.has(nameKey)) return catalogByName.get(nameKey);
    return allCatalogItems.find(i => {
      const cId = String(i.id || '').toLowerCase();
      const cName = String(i.name || '').toLowerCase();
      return (idKey && cId.includes(idKey)) || (nameKey && cName === nameKey);
    }) || null;
  };

  const withCatalogDescription = (entry) => {
    const catalogItem = findCatalogItem(entry);
    const desc = (entry.desc || entry.description || entry.notes || catalogItem?.description || '').replace(/[—–]/g, ', ');
    const name = entry.name || catalogItem?.name || entry.id || 'Trait';
    return { ...entry, name, description: desc };
  };

  const rawAdvantages = Array.isArray(sheet.advantages) ? sheet.advantages : [];
  const advantagesList = rawAdvantages.map(withCatalogDescription);
  const resolvedFlaws = flawsList.map(withCatalogDescription);

  const logoUrl = window.location.origin + '/img/ATT-logo(1).webp';
  const exportDateString = formatExportDate();
  const safeFileName = `${ghoulName}_Ghoul_Record_${exportDateString}`.replace(/[\s:]+/g, '_').replace(/_+/g, '_').replace(/'/g, "\\'");

  const contentHtml = `
    <div id="vtm-sheet-content" style="font-family: 'Crimson Text', serif; color: #222; background: #fff; padding: 20px 40px; width: 800px; margin: 0 auto; box-sizing: border-box;">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Oswald:wght@400;700&display=swap');
        
        #vtm-sheet-content h1, #vtm-sheet-content h2, #vtm-sheet-content h3, #vtm-sheet-content .section-title { font-family: 'Oswald', sans-serif; text-transform: uppercase; }
        
        #vtm-sheet-content .header { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 25px; border-bottom: 2px solid #8a0303; padding-bottom: 12px; }
        #vtm-sheet-content .header-brand { display: flex; align-items: center; gap: 20px; }
        #vtm-sheet-content .header-brand img.logo-img { height: 65px; width: auto; object-fit: contain; }
        #vtm-sheet-content .header-text { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; }
        #vtm-sheet-content .header h1 { color: #8a0303; font-size: 30px; letter-spacing: 2px; margin: 0; line-height: 1.1; }
        #vtm-sheet-content .header .subtitle { font-family: 'Oswald', sans-serif; font-size: 15px; color: #555; letter-spacing: 1px; margin-top: 2px; text-transform: uppercase; }
        #vtm-sheet-content .header-avatar { display: flex; align-items: center; justify-content: center; }
        #vtm-sheet-content .header-avatar img { width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 2px solid #8a0303; box-shadow: 0 2px 6px rgba(0,0,0,0.25); }
        
        #vtm-sheet-content .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px 30px; margin-bottom: 25px; font-size: 14px; }
        #vtm-sheet-content .meta-field { display: flex; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
        #vtm-sheet-content .meta-field strong { margin-right: 8px; color: #8a0303; font-family: 'Oswald', sans-serif; }
        #vtm-sheet-content .meta-field span { flex: 1; }
        
        #vtm-sheet-content .section-title { text-align: center; color: #8a0303; font-size: 18px; margin: 20px 0 15px; border-top: 1px solid #8a0303; border-bottom: 1px solid #8a0303; padding: 4px 0; letter-spacing: 1px; }
        #vtm-sheet-content .three-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        #vtm-sheet-content .two-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; }
        #vtm-sheet-content .col-header { text-align: center; font-style: italic; color: #666; margin-bottom: 10px; }
        #vtm-sheet-content .stat-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 15px; }
        #vtm-sheet-content .dots-container, #vtm-sheet-content .boxes-container { display: flex; gap: 3px; }
        #vtm-sheet-content .dot { width: 10px; height: 10px; border: 1px solid #222; border-radius: 50%; background: #fff; display: inline-block; box-sizing: border-box; }
        #vtm-sheet-content .dot.filled { background: #8a0303; border-color: #8a0303; }
        #vtm-sheet-content .box { width: 12px; height: 12px; border: 1px solid #222; background: #fff; display: inline-block; box-sizing: border-box; }
        #vtm-sheet-content .box.filled { background: #222; }
        #vtm-sheet-content .trackers { margin-top: 20px; padding: 15px; background: #f4f4f4; border: 1px solid #ddd; border-radius: 4px; }
        #vtm-sheet-content .tracker-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        #vtm-sheet-content .tracker-row:last-child { margin-bottom: 0; }
        #vtm-sheet-content .tracker-row strong { font-family: 'Oswald', sans-serif; font-size: 16px; width: 110px; }
        #vtm-sheet-content .adv-entry { margin-bottom: 10px; }
        #vtm-sheet-content .adv-desc { padding-left: 4px; font-size: 12px; color: #555; line-height: 1.4; margin-top: 2px; }
        #vtm-sheet-content .adv-empty { font-size: 13px; color: #999; font-style: italic; }
        #vtm-sheet-content .avoid-break, #vtm-sheet-content .section-title, #vtm-sheet-content .adv-entry { page-break-inside: avoid; break-inside: avoid; }
      </style>

      <div class="header">
        <div class="header-brand">
          <img class="logo-img" src="${logoUrl}" alt="ATT Logo" />
          <div class="header-text">
            <h1>VAMPIRE THE MASQUERADE</h1>
            <div class="subtitle">Ghoul and Retainer Record: Athens Through Time LARP</div>
          </div>
        </div>
        ${avatarUrl ? `
          <div class="header-avatar">
            <img src="${avatarUrl}" alt="${escapeHtml(ghoulName)}" onerror="this.parentElement.style.display='none';" />
          </div>
        ` : ''}
      </div>

      <div class="meta-grid">
        <div class="meta-field"><strong>Name:</strong> <span>${escapeHtml(ghoulName)}</span></div>
        <div class="meta-field"><strong>Nature:</strong> <span>${escapeHtml(natureLabel)}</span></div>
        <div class="meta-field"><strong>Tier:</strong> <span>${escapeHtml(tierLabel)}</span></div>

        <div class="meta-field"><strong>Exported:</strong> <span>${escapeHtml(exportDateString)}</span></div>
        <div class="meta-field"><strong>Domitor:</strong> <span>${escapeHtml(domitorName)}</span></div>
        <div class="meta-field" style="align-items: center;">
          <strong>Domitor Clan:</strong>
          <span style="display: inline-flex; align-items: center; min-height: 22px;">
            ${clanLogoUrl ? `<img src="${clanLogoUrl}" alt="${escapeHtml(domitorClan)}" style="max-height: 22px; max-width: 130px; object-fit: contain; vertical-align: middle;" />` : escapeHtml(domitorClan || 'Unknown')}
          </span>
        </div>

        <div class="meta-field"><strong>Chronicle:</strong> <span>Athens Through Time</span></div>
        <div class="meta-field"><strong>Player / Handler:</strong> <span>${escapeHtml(playerName)}</span></div>
        <div class="meta-field"><strong>Bond Status:</strong> <span>${isGhoul ? 'Bound by Vitae' : 'Mortal Service'}</span></div>
      </div>

      <div class="section-title">ATTRIBUTES</div>
      <div class="three-col">
        <div>
          <div class="col-header">Physical</div>
          <div class="stat-row"><span>Strength</span> ${renderDots(getAttr('Strength'))}</div>
          <div class="stat-row"><span>Dexterity</span> ${renderDots(getAttr('Dexterity'))}</div>
          <div class="stat-row"><span>Stamina</span> ${renderDots(getAttr('Stamina'))}</div>
        </div>
        <div>
          <div class="col-header">Social</div>
          <div class="stat-row"><span>Charisma</span> ${renderDots(getAttr('Charisma'))}</div>
          <div class="stat-row"><span>Manipulation</span> ${renderDots(getAttr('Manipulation'))}</div>
          <div class="stat-row"><span>Composure</span> ${renderDots(getAttr('Composure'))}</div>
        </div>
        <div>
          <div class="col-header">Mental</div>
          <div class="stat-row"><span>Intelligence</span> ${renderDots(getAttr('Intelligence'))}</div>
          <div class="stat-row"><span>Wits</span> ${renderDots(getAttr('Wits'))}</div>
          <div class="stat-row"><span>Resolve</span> ${renderDots(getAttr('Resolve'))}</div>
        </div>
      </div>

      <div class="section-title">SKILLS</div>
      <div class="three-col">
        <div>
          ${renderSkillRow('Athletics')}
          ${renderSkillRow('Brawl')}
          ${renderSkillRow('Craft')}
          ${renderSkillRow('Drive')}
          ${renderSkillRow('Firearms')}
          ${renderSkillRow('Larceny')}
          ${renderSkillRow('Melee')}
          ${renderSkillRow('Stealth')}
          ${renderSkillRow('Survival')}
        </div>
        <div>
          ${renderSkillRow('Animal Ken')}
          ${renderSkillRow('Etiquette')}
          ${renderSkillRow('Insight')}
          ${renderSkillRow('Intimidation')}
          ${renderSkillRow('Leadership')}
          ${renderSkillRow('Performance')}
          ${renderSkillRow('Persuasion')}
          ${renderSkillRow('Streetwise')}
          ${renderSkillRow('Subterfuge')}
        </div>
        <div>
          ${renderSkillRow('Academics')}
          ${renderSkillRow('Awareness')}
          ${renderSkillRow('Finance')}
          ${renderSkillRow('Investigation')}
          ${renderSkillRow('Medicine')}
          ${renderSkillRow('Occult')}
          ${renderSkillRow('Politics')}
          ${renderSkillRow('Science')}
          ${renderSkillRow('Technology')}
        </div>
      </div>

      <div class="trackers two-col avoid-break">
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
            ${renderTrackerBoxes(10, 0, 0, true, humanityVal)}
          </div>
          <div style="font-size: 12px; color: #666; margin-top: 10px; line-height: 1.4;">
            <strong>Mortal Vitals:</strong> Ghouls suffer damage as mortals. Superficial damage from sharp weapons or firearms is not halved unless protected by Fortitude.
          </div>
        </div>
      </div>

      <div class="section-title">GHOUL VITAE &amp; BLOOD BOND STATUS</div>
      <div class="two-col avoid-break" style="margin-bottom: 20px;">
        <div style="background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 12px 16px;">
          <div style="font-family: 'Oswald', sans-serif; font-size: 15px; color: #8a0303; border-bottom: 1px solid #8a0303; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase;">
            Vitae Sustenance
          </div>
          <div style="font-size: 13px; line-height: 1.5; color: #333;">
            <div style="margin-bottom: 4px;"><strong>Feeding Cycle:</strong> Must ingest vampire vitae at least once every calendar month.</div>
            <div style="margin-bottom: 4px;"><strong>Aging:</strong> Physical aging is halted while sustained on vitae. Withdrawing causes rapid biological catch:up.</div>
            <div><strong>Blood Surge:</strong> Ghouls cannot Surge their Blood like true vampires, but gain access to 1 dot of their Domitor's disciplines.</div>
          </div>
        </div>

        <div style="background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 12px 16px;">
          <div style="font-family: 'Oswald', sans-serif; font-size: 15px; color: #8a0303; border-bottom: 1px solid #8a0303; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase;">
            The Blood Bond
          </div>
          <div style="font-size: 13px; line-height: 1.5; color: #333;">
            <div style="margin-bottom: 4px;"><strong>Regnant / Master:</strong> ${escapeHtml(domitorName)}</div>
            <div style="margin-bottom: 4px;"><strong>Oath Nature:</strong> Enforces supernatural loyalty, emotional devotion, and loss of resistance to the Domitor's commands.</div>
            <div><strong>Threshold:</strong> Resisting a direct Domitor command requires spending Willpower and rolling against Domitor's Blood Potency.</div>
          </div>
        </div>
      </div>

      <div class="section-title">DISCIPLINES &amp; POWERS</div>
      ${activeDisciplines.length ? `
        <div class="two-col">
          ${activeDisciplines.map(([d, val]) => renderDisciplineBlock(d, val)).join('')}
        </div>
      ` : '<div class="adv-empty" style="text-align: center; margin-bottom: 15px;">No discipline powers currently awakened</div>'}

      <div class="section-title">ADVANTAGES &amp; FLAWS</div>
      <div class="two-col">
        <div>
          <div class="col-header">Advantages</div>
          ${advantagesList.length ? advantagesList.map(a => `
            <div class="adv-entry avoid-break">
              <div class="stat-row"><span>${escapeHtml(a.name || a.id)}</span> ${renderDots(a.dots || 1)}</div>
              ${a.description ? `<div class="adv-desc">${escapeHtml(a.description)}</div>` : ''}
            </div>
          `).join('') : '<div class="adv-empty">None</div>'}
        </div>
        <div>
          <div class="col-header">Flaws</div>
          ${resolvedFlaws.length ? resolvedFlaws.map(f => `
            <div class="adv-entry avoid-break">
              <div class="stat-row"><span>${escapeHtml(f.name || f.id)}</span> ${renderDots(f.dots || 1)}</div>
              ${f.description ? `<div class="adv-desc">${escapeHtml(f.description)}</div>` : ''}
            </div>
          `).join('') : '<div class="adv-empty">None</div>'}
        </div>
      </div>
    </div>
  `;

  const fullHtmlPage = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(ghoulName)}: Ghoul Record</title>
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
            max-width: 800px;
            margin-bottom: 20px;
            display: flex;
            justify-content: center;
          }
          .btn-download {
            background-color: #8a0303;
            color: #fff;
            border: none;
            padding: 20px;
            font-size: 20px;
            border-radius: 0px;
            cursor: pointer;
            font-weight: bold;
            width: 100%;
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
            btn.innerText = 'GENERATING PDF... PLEASE WAIT';
            btn.disabled = true;

            var element = document.getElementById('vtm-sheet-content');
            var opt = {
              margin:       [5, 0, 5, 0],
              filename:     '${safeFileName}.pdf',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true, scrollY: 0, scrollX: 0 },
              jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
              pagebreak:    { mode: ['css', 'legacy'] }
            };

            html2pdf().set(opt).from(element).save().then(function() {
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

  const blob = new Blob([fullHtmlPage], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    alert("Pop-up blocked! Could not open the new tab to view the character sheet.");
  }
}
