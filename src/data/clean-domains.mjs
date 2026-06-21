//GET THE DATA FROM: https://athensgis.gr/
// clean-domains.mjs
// Usage: node clean-domains.mjs

import fs from "fs";
import path from "path";
import * as turf from "@turf/turf"; 
import cliProgress from "cli-progress";
import inquirer from "inquirer";

const DOMAINS_FILE = process.argv[2] ?? "./Domains.json";
const ATHENS_GEO_FILE = process.argv[3] ?? "./atthensgeo.NEWDATA.21.6.26.geojson";
const OUTPUT = process.argv[4] ?? DOMAINS_FILE; 

// The threshold for messy borders. 
// 0.05 = allows up to a 5% overlap before deleting the new domain.
const OVERLAP_TOLERANCE = 0.05; 

const DIVISION_NAMES = {
  1: 'Pagkrati', 2: 'Zografou/Kaisarianh', 3: 'Exarxia', 4: 'Boula', 5: 'Ampelokhpoi',
  6: 'Kalithea', 7: 'Petralona', 8: 'Plaka', 9: 'Keramikos', 10: 'Tauros, Agios Ioannis Rentis',
  11: 'Thiseio', 12: 'Mosxato', 13: 'Palaio Faliro', 14: 'Nea Smyrnh', 15: 'Agios Dhmhtrios',
  16: 'Neos Kosmos', 17: 'Nea Penteli, Melissia', 18: 'Kolonaki, Lykabhtos', 19: 'Peristeri',
  20: 'Aigaleo', 21: 'Petroupolh, Ilion, Agioi Anargyroi, Kamatero', 22: 'Ellhniko, Argyroupolh',
  23: 'Psyxiko, Neo Psyxiko', 24: 'Attikh', 25: 'Kypselh', 26: 'Galatsi', 27: 'Khfisia, Nea Erythraia',
  28: 'Alimos', 29: 'Marousi, Peykh', 30: 'Hrakleio, Metamorfosi, Lykobrysh', 31: 'Xalandri, Brilissia',
  32: 'Perama, Keratsini', 33: 'Pathsia', 34: 'Kolonos, Sepolia', 35: 'Xolargos, Agia Paraskeyh',
  36: 'Katexakh', 37: 'Nea Philadepfia', 38: 'Hlioupolh, Byronas', 39: 'Athina', 40: 'Psyrh',
  41: 'Ymuttos', 42: 'Parnitha', 43: 'Peiraias, Neo Faliro', 44: 'Xaidari',
  45: 'Korydallos, Nikaia, Agia Barbara', 46: 'Glyfada', 47: 'Gkyzh', 48: 'Eleysina', 49: 'Aspropirgos'
};

const greekToLatin = {
    'Α': 'A', 'Β': 'V', 'Γ': 'G', 'Δ': 'D', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'I', 'Θ': 'Th',
    'Ι': 'I', 'Κ': 'K', 'Λ': 'L', 'Μ': 'M', 'Ν': 'N', 'Ξ': 'X', 'Ο': 'O', 'Π': 'P',
    'Ρ': 'R', 'Σ': 'S', 'Τ': 'T', 'Υ': 'Y', 'Φ': 'F', 'Χ': 'Ch', 'Ψ': 'Ps', 'Ω': 'O',
    'α': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'i', 'θ': 'th',
    'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'ο': 'o', 'π': 'p',
    'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'y', 'φ': 'f', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o',
    'ά': 'a', 'έ': 'e', 'ή': 'i', 'ί': 'i', 'ό': 'o', 'ύ': 'y', 'ώ': 'o',
    'Ά': 'A', 'Έ': 'E', 'Ή': 'I', 'Ί': 'I', 'Ό': 'O', 'Ύ': 'Y', 'Ώ': 'O'
};

function transliterate(str) {
    return str.split('').map(c => greekToLatin[c] || c).join('');
}

function formatNewName(rawName) {
    if (!rawName) return "Unnamed Domain";
    let clean = rawName.replace(/^(ΔΗΜΟΤΙΚΗ ΕΝΟΤΗΤΑ|ΔΗΜΟΣ)\s+/i, "").trim();
    clean = clean.split(' ').map(word => {
        if (!word) return "";
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
    return transliterate(clean);
}

// ==========================================
// PHASE 1: AUTOMATED MERGE (With Tolerance)
// ==========================================
console.log(`\n⚙️  Running Automated Merge with ${OVERLAP_TOLERANCE * 100}% Border Tolerance...`);
const domainsRaw = JSON.parse(fs.readFileSync(DOMAINS_FILE, "utf-8"));
const athensGeoRaw = JSON.parse(fs.readFileSync(ATHENS_GEO_FILE, "utf-8"));

const bak = DOMAINS_FILE.replace(/\.json$/i, ".bak.json");
fs.writeFileSync(bak, JSON.stringify(domainsRaw), "utf-8");

const existingFeatures = domainsRaw.features.map((f, i) => {
    const divNum = i + 1;
    return {
        ...f,
        properties: { division: divNum, name: DIVISION_NAMES[divNum] || f.properties?.name || `Division ${divNum}` }
    };
});

const newFeaturesToAdd = [];
let duplicatesSkipped = 0;

const progressBar = new cliProgress.SingleBar({
    format: 'Progress |{bar}| {percentage}% || {value}/{total} checked',
    barCompleteChar: '\u2588', barIncompleteChar: '\u2591', hideCursor: true
});
progressBar.start(athensGeoRaw.features.length, 0);

for (const newFeat of athensGeoRaw.features) {
  if (!newFeat.geometry || !['Polygon', 'MultiPolygon'].includes(newFeat.geometry.type)) {
      progressBar.increment(); continue;
  }
  
  const areaNew = turf.area(newFeat);
  let isDuplicate = false;

  for (const existFeat of existingFeatures) {
    if (!existFeat.geometry) continue;

    try {
      // 1. If it's completely swallowed or completely swallows an original, it's a hard duplicate
      if (turf.booleanWithin(newFeat, existFeat) || turf.booleanContains(newFeat, existFeat)) {
        isDuplicate = true; break;
      }

      // 2. If it overlaps, calculate exactly how much
      if (turf.booleanOverlap(newFeat, existFeat)) {
        const intersection = turf.intersect(turf.featureCollection([newFeat, existFeat]));
        
        if (intersection) {
            const overlapArea = turf.area(intersection);
            const overlapRatio = overlapArea / areaNew;
            
            // If the overlap exceeds our 5% tolerance, reject it
            if (overlapRatio > OVERLAP_TOLERANCE) {
                isDuplicate = true; break;
            }
        }
      }
    } catch (error) {
        // If map math fails due to a broken polygon, default to strict rejection to be safe
        isDuplicate = true; break;
    }
  }

  if (isDuplicate) {
      duplicatesSkipped++;
  } else {
      newFeat.properties = { name: formatNewName(newFeat.properties?.name || "") }; 
      newFeaturesToAdd.push(newFeat);
  }
  progressBar.increment();
}
progressBar.stop();

const finalFeatures = [...existingFeatures];
let nextDivNum = existingFeatures.length + 1;
for (const nf of newFeaturesToAdd) {
    nf.properties.division = nextDivNum;
    finalFeatures.push(nf);
    nextDivNum++;
}

fs.writeFileSync(OUTPUT, JSON.stringify({ type: "FeatureCollection", features: finalFeatures }), "utf-8");
console.log(`\n✅ Merge complete!`);
console.log(`- Protected ${existingFeatures.length} original domains.`);
console.log(`- Rejected ${duplicatesSkipped} true duplicates (over 5% overlap).`);
console.log(`- Appended ${newFeaturesToAdd.length} clean new domains.`);
console.log(`Total Divisions: ${finalFeatures.length}\n`);

// ==========================================
// PHASE 2: INTERACTIVE CLI EDITOR
// ==========================================
async function runInteractiveEditor() {
    let geoData = JSON.parse(fs.readFileSync(OUTPUT, "utf-8"));

    const { startUi } = await inquirer.prompt([{
        type: 'confirm', name: 'startUi',
        message: 'Would you like to open the Interactive Editor to make manual adjustments?',
        default: true
    }]);

    if (!startUi) {
        console.log("Exiting script. Map is ready!");
        return;
    }

    while (true) {
        console.log(`\n--- Active Map: ${geoData.features.length} Divisions ---`);
        const { action } = await inquirer.prompt([{
            type: 'list',
            name: 'action',
            message: '🛠️ Interactive Editor: What would you like to do?',
            choices: [
                '✏️ Rename a Division',
                '🗑️ Delete a Division',
                '➕ Add a New Division (from a geojson file)',
                '💾 Save and Exit',
                '🚪 Exit without saving changes'
            ]
        }]);

        if (action === '🚪 Exit without saving changes') {
            console.log("Exiting. Manual changes discarded.");
            break;
        }

        if (action === '💾 Save and Exit') {
            fs.writeFileSync(OUTPUT, JSON.stringify(geoData), "utf-8");
            console.log(`✅ Saved all manual changes to ${OUTPUT}`);
            break;
        }

        if (action === '✏️ Rename a Division') {
            const { divNum } = await inquirer.prompt([{
                type: 'input', name: 'divNum', message: 'Enter the Division Number to rename:'
            }]);
            const feature = geoData.features.find(f => f.properties.division === Number(divNum));
            if (!feature) {
                console.log(`❌ Division ${divNum} not found.`);
                continue;
            }
            const { newName } = await inquirer.prompt([{
                type: 'input', name: 'newName',
                message: `Current name is "${feature.properties.name}". Enter new name:`
            }]);
            feature.properties.name = newName;
            console.log(`✅ Division ${divNum} renamed to "${newName}".`);
        }

        if (action === '🗑️ Delete a Division') {
            const { divNum } = await inquirer.prompt([{
                type: 'input', name: 'divNum', message: 'Enter the Division Number to delete:'
            }]);
            const targetNum = Number(divNum);
            
            if (targetNum >= 1 && targetNum <= 49) {
                const { confirmStrict } = await inquirer.prompt([{
                    type: 'confirm', name: 'confirmStrict',
                    message: `⚠️ WARNING: Division ${targetNum} is an ORIGINAL domain. Are you sure you want to delete it?`, default: false
                }]);
                if (!confirmStrict) continue;
            }

            const initialLength = geoData.features.length;
            geoData.features = geoData.features.filter(f => f.properties.division !== targetNum);
            
            if (geoData.features.length < initialLength) {
                console.log(`✅ Division ${divNum} deleted successfully.`);
            } else {
                console.log(`❌ Division ${divNum} not found.`);
            }
        }

        if (action === '➕ Add a New Division (from a geojson file)') {
            const { newFilePath } = await inquirer.prompt([{
                type: 'input', name: 'newFilePath',
                message: 'Enter the file path to the GeoJSON you want to inject (e.g., ./missing-area.geojson):'
            }]);
            try {
                const newGeo = JSON.parse(fs.readFileSync(newFilePath, "utf-8"));
                const featuresToAdd = newGeo.type === 'FeatureCollection' ? newGeo.features : [newGeo];
                
                let maxDiv = Math.max(...geoData.features.map(f => f.properties.division || 0));
                
                for (let f of featuresToAdd) {
                    if (!f.geometry) continue;
                    maxDiv++;
                    f.properties = f.properties || {};
                    f.properties.division = maxDiv;
                    f.properties.name = formatNewName(f.properties.name || f.properties.Name || `Custom Division ${maxDiv}`);
                    geoData.features.push(f);
                    console.log(`✅ Injected new Division ${maxDiv}: ${f.properties.name}`);
                }
            } catch (e) {
                console.log(`❌ Error reading or parsing file: ${e.message}`);
            }
        }
    }
}

runInteractiveEditor();