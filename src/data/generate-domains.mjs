// generate-domains.mjs
// Usage: node generate-domains.mjs

import fs from "fs";
import path from "path";
import * as turf from "@turf/turf"; 
import cliProgress from "cli-progress";
import inquirer from "inquirer";

// --- FILE PATHS (The flipped 3-Tier Hierarchy) ---
const TIER1_FILE = process.argv[2] ?? "./atthensgeo.NEWDATA.21.6.26.geojson"; // Regional
const TIER2_FILE = process.argv[3] ?? "./AthensCenterSector.geojson";         // Center
const TIER3_FILE = process.argv[4] ?? "./newcomplete.athens.geojson";         // Complete
const OUTPUT = process.argv[5] ?? "./Domains.json"; 

// --- TRANSLITERATION ENGINE ---
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
    if (!rawName) return "Unnamed Area";
    let clean = rawName.replace(/^(ΔΗΜΟΤΙΚΗ ΕΝΟΤΗΤΑ|ΔΗΜΟΣ|ΟΡΟΣ|ΕΘΝΙΚΟΣ ΔΡΥΜΟΣ)\s+/i, "").trim();
    clean = clean.split(' ').map(word => {
        if (!word) return "";
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
    return transliterate(clean);
}

// --- SPATIAL COOKIE CUTTER ---
function cutFeature(subjectFeat, clippers) {
    let current = subjectFeat;
    
    for (const clipper of clippers) {
        if (!current) return null; 
        if (!clipper.geometry || !['Polygon', 'MultiPolygon'].includes(clipper.geometry.type)) continue;

        try {
            const bbox1 = turf.bbox(current);
            const bbox2 = turf.bbox(clipper);
            const overlap = !(
                bbox1[2] < bbox2[0] || bbox1[0] > bbox2[2] || 
                bbox1[3] < bbox2[1] || bbox1[1] > bbox2[3]
            );

            if (overlap) {
                const result = turf.difference(turf.featureCollection([current, clipper]));
                if (result) {
                     current = result;
                } else {
                     current = null;
                }
            }
        } catch(e) {}
    }
    
    // Filter out tiny ghost slivers left by imperfect borders
    if (current && turf.area(current) < 1000) return null; 
    return current;
}


// ==========================================
// PHASE 1: FRESH 3-TIER GENERATOR
// ==========================================
console.log(`\n⚙️  Booting Flipped 3-Tier Spatial Generator...`);

function loadGeoJSON(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } catch (e) {
        console.warn(`⚠️  Could not load ${filePath}. Skipping this tier.`);
        return { features: [] };
    }
}

const tier1Raw = loadGeoJSON(TIER1_FILE);
const tier2Raw = loadGeoJSON(TIER2_FILE);
const tier3Raw = loadGeoJSON(TIER3_FILE);

let nextDivNum = 1;
const finalFeatures = [];
const blockingFeatures = []; // This array grows to cut the lower tiers

// ----------------------------------------------------
// TIER 1: Regional Data (Base Layer, Uncut)
// ----------------------------------------------------
console.log(`\n🗺️  Processing Tier 1: Regional Data (Highest Priority)...`);
let t1Added = 0;
const t1Bar = new cliProgress.SingleBar({ format: 'Progress |{bar}| {percentage}%', barCompleteChar: '\u2588', barIncompleteChar: '\u2591', hideCursor: true });
t1Bar.start(tier1Raw.features.length, 0);

for (let feat of tier1Raw.features) {
    if (!feat.geometry) { t1Bar.increment(); continue; }
    
    feat.properties = { 
        division: nextDivNum,
        name: formatNewName(feat.properties?.name || feat.properties?.Name || "Regional Domain")
    };
    
    blockingFeatures.push(feat);
    finalFeatures.push(feat);
    nextDivNum++;
    t1Added++;
    t1Bar.increment();
}
t1Bar.stop();

// ----------------------------------------------------
// TIER 2: Center Sector (Cut by Tier 1)
// ----------------------------------------------------
console.log(`\n👑 Processing Tier 2: Center Sector (Cutting around Tier 1)...`);
let t2Added = 0;
const t2Bar = new cliProgress.SingleBar({ format: 'Progress |{bar}| {percentage}%', barCompleteChar: '\u2588', barIncompleteChar: '\u2591', hideCursor: true });
t2Bar.start(tier2Raw.features.length, 0);

for (let feat of tier2Raw.features) {
    if (!feat.geometry) { t2Bar.increment(); continue; }
    
    feat = cutFeature(feat, blockingFeatures);
    
    if (feat) {
        feat.properties = { 
            division: nextDivNum,
            name: formatNewName(feat.properties?.name || feat.properties?.Name || "Center Sector") 
        };
        blockingFeatures.push(feat); // Add to blockers so it cuts Tier 3!
        finalFeatures.push(feat);
        nextDivNum++;
        t2Added++;
    }
    t2Bar.increment();
}
t2Bar.stop();

// ----------------------------------------------------
// TIER 3: Complete Athens (Cut by Tier 1 & Tier 2)
// ----------------------------------------------------
console.log(`\n🏙️  Processing Tier 3: Complete Athens (Cutting around Tiers 1 & 2)...`);
let t3Added = 0;
const t3Bar = new cliProgress.SingleBar({ format: 'Progress |{bar}| {percentage}%', barCompleteChar: '\u2588', barIncompleteChar: '\u2591', hideCursor: true });
t3Bar.start(tier3Raw.features.length, 0);

for (let feat of tier3Raw.features) {
    if (!feat.geometry) { t3Bar.increment(); continue; }
    
    feat = cutFeature(feat, blockingFeatures);
    
    if (feat) {
        feat.properties = { 
            division: nextDivNum,
            name: formatNewName(feat.properties?.name || feat.properties?.Name || "Municipality") 
        };
        finalFeatures.push(feat);
        nextDivNum++;
        t3Added++;
    }
    t3Bar.increment();
}
t3Bar.stop();


// ==========================================
// PHASE 2: COMPILE & SAVE
// ==========================================
fs.writeFileSync(OUTPUT, JSON.stringify({ type: "FeatureCollection", features: finalFeatures }), "utf-8");

console.log(`\n=================================================`);
console.log(`✅ MAP GENERATION COMPLETE`);
console.log(`=================================================`);
console.log(`🗺️  ${t1Added} Regional Domains Injected`);
console.log(`👑 ${t2Added} Center Sectors Injected & Carved`);
console.log(`🏙️  ${t3Added} Municipalities Injected & Carved`);
console.log(`💾 Total active divisions saved: ${finalFeatures.length} → ${path.resolve(OUTPUT)}\n`);

// ==========================================
// PHASE 3: INTERACTIVE CLI EDITOR
// ==========================================
async function runInteractiveEditor() {
    let geoData = JSON.parse(fs.readFileSync(OUTPUT, "utf-8"));

    const { startUi } = await inquirer.prompt([{
        type: 'confirm', name: 'startUi',
        message: 'Would you like to open the Interactive Editor to make manual adjustments?',
        default: true
    }]);

    if (!startUi) {
        console.log("Exiting script. Your new layered map is ready!");
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