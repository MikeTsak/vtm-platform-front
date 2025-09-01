// clean-domains.mjs
// Usage:
//   node clean-domains.mjs               // reads ./Domains.json, overwrites it
//   node clean-domains.mjs in.json out.json

import fs from "fs";
import path from "path";

const INPUT  = process.argv[2] ?? "./Domains.json";
const OUTPUT = process.argv[3] ?? INPUT; // default: overwrite original

const raw = JSON.parse(fs.readFileSync(INPUT, "utf-8"));

if (raw?.type !== "FeatureCollection" || !Array.isArray(raw.features)) {
  throw new Error("Invalid GeoJSON: expected FeatureCollection with features[].");
}

// Optional: keep a backup when overwriting
if (!process.argv[3]) {
  const bak = INPUT.replace(/\.json$/i, ".bak.json");
  fs.writeFileSync(bak, JSON.stringify(raw), "utf-8");
  console.log(`🗂  Backup written → ${bak}`);
}

const cleaned = {
  type: "FeatureCollection",
  features: raw.features.map((f, i) => ({
    type: "Feature",
    properties: { division: i + 1 }, // <-- only division kept
    geometry: f.geometry
  }))
};

fs.writeFileSync(OUTPUT, JSON.stringify(cleaned), "utf-8");
console.log(`✅ Cleaned ${raw.features.length} features → ${path.resolve(OUTPUT)}`);
console.log("Kept: geometry + { division }");
console.log("Removed: all other properties (names, owners, colors, styles, notes, etc.)");
