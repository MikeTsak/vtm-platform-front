// src/data/cotteries.js

// Small helpers
const dots = (n) => Number(n || 0);
const asArray = (v) => (Array.isArray(v) ? v : (v ? [v] : []));

// Registry-level meta (overview + rules you show in the UI)
export const COTERIE_DOC = {
  overview: [
    "Players may choose one of the example coterie types below or invent their own.",
    "Build what the troupe desires first, rules second. Swap prerequisites freely if the table prefers.",
    "Coterie types can change during play; adjust advantages to reflect the story.",
  ],
  pool_rules: [
    "Start with a Coterie pool equal to members × points_per_member (default 1; ST may allow 2).",
    "Pay listed costs from the coterie pool. If it’s not enough, collect from characters.",
    "Increase any listed value with remaining pool; use 'Possible Extras' as sinks for leftovers.",
  ],
  bonus_rules: [
    "At ST discretion, if all prerequisites of a type are met, grant +1 dot to one Domain Trait (not above 5).",
    "If a coterie later changes and would exceed 5, refund a dot or XP accordingly.",
  ],
  bonus_eligible: {
    Chasse: ["Blood Cult","Envoys","Fang Gang","Hunting Party","Plumaire","Questari","Regency","Sbirri"],
    Lien: ["Champions","Corporate","Family","Gatekeeper","Vehme"],
    Portillon: ["Cerberus","Commando","Day Watch","Maréchal","Saboteur","Watchmen"],
    no_domain_bonus_fallback: ["Contacts","Retainers"], // for types without Domains (e.g., Fugitive, Nomad)
  },
  core_greek: [
    "Ελάχιστοι 3 παίκτες φτιάχνουν Κοτέρι και ΠΡΕΠΕΙ να επιλέξουν Domain. Χωρίς domain, δεν υπάρχει Κοτέρι.",
    "Βασικά Domain Traits: Chasse (feeding), Lien (προσαρμογή), Portillon (ασφάλεια).",
    "Κάθε μέλος δίνει 1 (ή 2) Coterie Point στη δημιουργία. Οι πόντοι μοιράζονται σε Chasse/Lien/Portillon ή σε coterie Backgrounds.",
    "Τα ατομικά XP ΔΕΝ ξοδεύονται για το Κοτέρι. Υπάρχει ξεχωριστό Coterie XP pool (reward καλού ομαδικού play από τον ST).",
    "Τα Backgrounds του Κοτεριού ανήκουν στο Κοτέρι. Η χρήση τους «χρεώνει» όλους. Κάθε αλλαγή απαιτεί ΟΜΟΦΩΝΙΑ.",
  ],
};

// A normalized record for each coterie type.
// Fields:
// - domain: { chasse, lien, portillon } numbers (0..5). Omit keys when not listed.
// - required: fixed advantages/flaws to buy (with dots)
// - flaws: named flaws (string or {name: dots})
// - extras: "Possible extras" suggestions (array of strings)
// - preferred_resonances: array of strings
// - common_advantages: array of strings (from your notes)
// - notes: short clarifications
export const COTERIES = {
  "Blood Cult": {
    domain: { lien: dots(1), portillon: dots(2) },
    required: { Herd: dots(3) },
    flaws: { "Status Flaw: Suspect": dots(1) },
    extras: ["Enemies (••)", "Haven (cult church/compound)", "Haven: Furcus", "Retainers"],
    preferred_resonances: ["Sanguine"],
    common_advantages: ["On Tap •", "Cursed (varies)", "Targeted •"],
    notes: "Entices mortals into rituals; take their blood and possibly enslave them.",
  },
  "Carnival": {
    domain: null,
    required: { Contacts: dots(3), Fame: dots(3), Retainers: dots(1) },
    extras: ["Allies", "Herd (Fans)", "Resources"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Mobile troupe — theater, politics, rites, or hidden in plain sight.",
  },
  "Cerberus": {
    domain: { chasse: dots(1), portillon: dots(3) },
    required: { Haven: dots(2) },
    extras: ["Adversary", "Haven: Haunted •", "Status (legacies)", "Retainers (Guards)", "Haven: Furcus"],
    preferred_resonances: ["Melancholy"],
    common_advantages: ["Privileged •••", "Bullies •", "Custodians ••", "Territorial •"],
    notes: "Protect a specific spot or item.",
  },
  "Champions": {
    domain: { chasse: dots(1), lien: dots(3) },
    required: { Allies: dots(1), Enemies: dots(2) },
    extras: ["Adversary", "Contacts", "Haven: Hidden Armory", "Influence (Religious/Police)"],
    preferred_resonances: ["Choleric"],
    common_advantages: ["Bolt Holes (varies)", "Transportation ••", "Custodian ••", "Targeted •"],
    notes: "Fight for a cause in mortal or kindred society.",
  },
  "Commando": {
    domain: { chasse: dots(1), portillon: dots(2) },
    required: { Mawla: dots(3), Status: dots(1), Enemies: dots(2) },
    extras: ["Adversary", "Haven (Base)", "Mask", "Retainers (NCOs/Troops)", "Haven: Hidden Armory"],
    preferred_resonances: ["Choleric"],
    common_advantages: ["Transportation ••", "Bullies •"],
    notes: "Built to fight enemies; mission-tasked by a Mawla.",
  },
  "Co-op": {
    domain: { chasse: dots(2), portillon: dots(2) },
    required: { Resources: dots(2), "Status: Notorious": dots(1) },
    extras: ["Herd", "Allies", "Contracts"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Mutual give-and-take cooperative.",
  },
  "Corporate": {
    domain: { chasse: dots(1), lien: dots(2) },
    required: { Influence: dots(2), Resources: dots(3) },
    extras: ["Contacts", "Haven: Business Establishment", "Herd", "Influence (Corporate/Political)", "Retainers"],
    preferred_resonances: ["Phlegmatic"],
    common_advantages: ["Debt ••", "Territorial •"],
    notes: "Organized like a business.",
  },
  "Day Watch": {
    domain: { chasse: dots(1), portillon: dots(2) },
    required: { Influence: dots(2), Enemies: dots(3) },
    extras: ["Allies", "Contacts", "Haven", "Mawla", "Relic/Ritual for day activity", "Status: City Secrets"],
    preferred_resonances: ["— (Alchemist needs)"],
    common_advantages: ["Debts •"],
    notes: "Protect someone/something in the day; often thin-blood Day Drinkers.",
  },
  "Diocese": {
    domain: { chasse: dots(3), lien: dots(2) },
    required: { Influence: dots(2), Herd: dots(2), Mask: dots(2), Enemies: dots(2) },
    extras: ["Allies", "Resources", "Retainers", "Status", "Shared relic", "Adversary", "Suspect"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Large cultic structure with mortal-facing front.",
  },
  "Envoys": {
    domain: { chasse: dots(1), lien: dots(3) },
    required: { Contacts: dots(3), Resources: dots(2), "Status Flaw: Suspect": dots(1) },
    extras: ["Mask (cover identities)", "No Haven or Shared Haven •"],
    preferred_resonances: ["Sanguine","Phlegmatic"],
    common_advantages: ["Privileged •••"],
    notes: "Diplomatic missions; negotiators and mediators.",
  },
  "Excommunicates": {
    domain: null,
    required: { Contacts: dots(3), Loresheet: dots(3), Mask: dots(2) },
    extras: ["Adversary","Destitute","Influence (Outside cult)","No Haven","Shunned"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "On the cult’s blacklist; often carry cult-related Flaws.",
  },
  "Family": {
    domain: { chasse: dots(1), lien: dots(1), portillon: dots(3) },
    required: { Allies: dots(1), Contacts: dots(2), Resources: dots(2), Enemies: dots(2) },
    extras: ["Herd (Extended family)","Influence (Family business)","Mawla (same family)","Retainers (Family ghoul)","Fame Flaw: Dark Secret","Haven","Haven Flaw: Haunted"],
    preferred_resonances: ["Sanguine"],
    common_advantages: ["Bolt Holes (varies)","Cursed","Territorial"],
    notes: "Reliance and support network; mortal & clan ties.",
  },
  "Fang Gang": {
    domain: { chasse: dots(1), lien: dots(1), portillon: dots(1) },
    required: { Contacts: dots(1), Enemies: dots(2) },
    extras: ["Haven (Clubhouse)","Herd (Human members/victims)","Influence (Organized Crime)","Retainers","Status (Anarchs)","Resources"],
    preferred_resonances: ["Choleric"],
    common_advantages: ["Targeted •"],
    notes: "Criminal enterprise.",
  },
  "Flagellant": {
    domain: { chasse: dots(1), lien: dots(2) },
    required: { Allies: dots(3), Influence: dots(1), Adversary: dots(2) },
    extras: ["Contacts","Loresheet (Golconda etc.)","Retainer (Saved with vitae)"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Redemption through charity or hunting abusive Kindred.",
  },
  "Fugitive": {
    domain: null,
    required: { Contacts: dots(3), Mask: dots(2), Retainers: dots(1) },
    extras: ["Allies","Cobbler •","Loresheets (knowing too much)","Resources","Despised ••"],
    preferred_resonances: ["Choleric"],
    common_advantages: ["Transportation ••","Targeted •"],
    notes: "On the run; always carries Flaws tied to the pursuer.",
  },
  "Gatekeeper": {
    domain: { chasse: dots(2), lien: dots(1), portillon: dots(1) },
    required: { Contacts: dots(2), Retainers: dots(3), "Infamy": dots(1) },
    extras: ["Mawla (necromancer)","Enemies (hunters)","Haven: Furcus","Resources (from the dead)","Status: City Secrets"],
    preferred_resonances: [],
    common_advantages: ["Bolt Holes","Cursed (varies)","Territorial •"],
    notes: "Communion with / control over the dead; spiritual aid and sabotage.",
  },
  "The Household": {
    domain: { chasse: dots(1), lien: dots(3), portillon: dots(2) },
    required: { Haven: dots(3), Herd: dots(5) },
    extras: ["Mawla (Joseph)","Retainers (Joseph’s ghouls)"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Butterflies (Golconda) household.",
  },
  "Hunting Party": {
    domain: { chasse: dots(3) },
    required: { "Ally or Mawla": dots(1) },
    extras: ["Herd","Influence (Organized Crime)"],
    preferred_resonances: ["— best match for prey"],
    common_advantages: ["On Tap ••"],
    notes: "Specialists in capturing humans with special blood.",
  },
  "Maréchal": {
    domain: { chasse: dots(2), portillon: dots(2) },
    required: { Status: dots(3) },
    extras: ["Adversaries","Influence","Mawla (Prince/Baron)","Retainers","Status (additional)"],
    preferred_resonances: ["Choleric","Sanguine"],
    common_advantages: ["Transportation ••","Bullies ••"],
    notes: "Guards of a Prince/Baron.",
  },
  "Missionaries": {
    domain: { chasse: dots(2) },
    required: { Mawla: dots(3), Resources: dots(3), Status: dots(2) },
    extras: ["Mask","Retainer","Suspect"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Seed a Blood Cult or Diocese; convert others.",
  },
  "Nemeses": {
    domain: { chasse: dots(2), portillon: dots(1) },
    required: { Contacts: dots(2), Influence: dots(2), Enemy: dots(1), "Status Flaw: Suspect": dots(1) },
    extras: ["Herd (Survivors)","Retainers (Survivors)"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Uplift the downtrodden; ruin oppressors.",
  },
  "Nomad": {
    domain: null,
    required: { Contacts: dots(3), Retainers: dots(2), "Status Flaw: Suspect": dots(1) },
    extras: ["Herd (Fellow travelers)","Allies","Fame","Resources"],
    preferred_resonances: ["Sanguine","Animal"],
    common_advantages: ["Transportation ••"],
    notes: "Travel together between domains.",
  },
  "Plumaire": {
    domain: { chasse: dots(2), lien: dots(2) },
    required: { Contacts: dots(3) },
    extras: ["Adversary/Enemy (Rival Fashionista)","Status (high society)","Fame (subculture)"],
    preferred_resonances: ["Sanguine"],
    common_advantages: ["Transportation ••","Debt ••"],
    notes: "United by social prominence or shared enthusiasms.",
  },
  "Questari": {
    domain: { chasse: dots(1), lien: dots(3) },
    required: { Contacts: dots(2) },
    extras: ["Haven (Library)","Mawla","Resources (Research budget)","Status: City Secrets"],
    preferred_resonances: ["Sanguine","Phlegmatic"],
    common_advantages: ["Transportation ••","Territorial •"],
    notes: "Pursue a major accomplishment, relic, or mystery.",
  },
  "Rectorate": {
    domain: { chasse: dots(2), portillon: dots(2) },
    required: { Resources: dots(2), Retainers: dots(1) },
    extras: ["Contacts","Enemies"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Hunters of magical relics and objects.",
  },
  "Regency": {
    domain: { chasse: dots(2), portillon: dots(3) },
    required: { Mawla: dots(2), Status: dots(4) }, // or ••• for Anarch
    extras: [
      "Up to 10 dots among Haven/Herd/Influence/Resources/Retainers/Status: City Secrets/Coterie Advantages",
      "Equal dots of Flaws among Adversaries/Compromised Haven/Despised/Enemies/Stalkers/Coterie Flaws",
    ],
    preferred_resonances: ["Phlegmatic"],
    common_advantages: ["Bolt Holes","Bullies •","Targeted •"],
    notes: "Watch over an elder’s domain; wield their political power.",
  },
  "Saboteur": {
    domain: null, // may later add Domain if embedded
    required: { Contacts: dots(2), Influence: dots(1), Mawla: dots(2), Mask: dots(1), Adversaries: dots(2) },
    extras: ["Domain (if embedded)","Suspect","Resources (Liquid cash)","Retainers","More Adversaries"],
    preferred_resonances: ["Melancholic","Choleric"],
    common_advantages: ["Bolt Holes"],
    notes: "Spy/assassination/political disruption; impressive mortal reach.",
  },
  "Sbirri": {
    domain: { /* mimics target coterie; spend one less dot overall */ },
    required: { Mawla: dots(2), Mask: dots(1) },
    extras: [
      "Adversaries (target city Primogen)",
      "Status: City Secrets",
      "Advantages from the cover type",
      "Dark Secret (••)"
    ],
    preferred_resonances: ["Melancholy"],
    common_advantages: ["Bolt Holes (varies)","Chasse: Back Alleys"],
    notes: "Posing as another type; actually spies for a rival faction/sect. Spend one less dot overall.",
  },
  "Schism": {
    domain: null,
    required: { Loresheet: dots(3), Resources: dots(1), Status: dots(2) },
    extras: ["Influence","Fame","Adversary","Despised","Excommunicated"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Leading a schism in a cult or splinter group.",
  },
  "Somnophile": {
    domain: { chasse: dots(1), portillon: dots(2) },
    required: { Loresheet: dots(2), Mawla: dots(3) },
    extras: ["Allies","Retainers","Status"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Serve an elder vampire.",
  },
  "Support Group": {
    domain: null,
    required: { Herd: dots(2), Haven: dots(1), Mawla: dots(2), Resources: dots(2), Enemy: dots(2) },
    extras: [],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Mutual aid (especially fledglings) to survive unlife.",
  },
  "Theologian Society": {
    domain: null,
    required: { Haven: dots(3), Resources: dots(2), Retainers: dots(2) },
    extras: ["Allies","Contacts","Suspect"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Dark magic dabblers or theological researchers within cults.",
  },
  "Think Tank": {
    domain: { chasse: dots(1), lien: dots(3) },
    required: { Allies: dots(3), Haven: dots(1) },
    extras: ["Resources (selling services)","Retainers (Librarians/Scholars)"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Advisors/strategists/researchers for a cult.",
  },
  "Vanguard": {
    domain: { chasse: dots(2), portillon: dots(3) },
    required: { Status: dots(1), Enemies: dots(1) },
    extras: ["Adversary","Mawla"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Base behind enemy lines.",
  },
  "Vehme": {
    domain: { chasse: dots(1) },
    required: { Influence: dots(3), Status: dots(3) },
    extras: ["Adversaries","Mawla (Primogen/Anarch Council)"],
    preferred_resonances: ["Sanguine"],
    common_advantages: ["Privileged •••","Custodians ••"],
    notes: "Protect the Masquerade; punish violators.",
  },
  "Watchmen": {
    domain: { chasse: dots(1), lien: dots(2), portillon: dots(1) },
    required: { Status: dots(2) },
    extras: ["Contacts","Retainers"],
    preferred_resonances: ["Animal","Melancholy"],
    common_advantages: ["Transportation ••","Territorial •","Under Siege ••"],
    notes: "Patrol the city, repel intruders, colonize territory.",
  },
  "Archonium": {
    domain: { /* Max • when arriving in new city */ },
    required: { Status: dots(4), Mawla: dots(3), Adversary: dots(4) },
    extras: [],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Justicar’s expendable enforcers; diplomats/spies operating under cover.",
  },
  "Primogen's Council": {
    domain: { /* Usually none shared; may add +1 dot to Chasse or Portillon */ },
    required: { Haven: dots(3) },
    extras: ["Members often donate personal Advantage dots to shared pool; ‘supervillain lair’ vibe"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Council constantly at covert war yet unites against external threats.",
  },
  "Prince's Court": {
    domain: { chasse: dots(3), portillon: dots(3) },
    required: { Haven: dots(3), Status: dots(3) },
    extras: ["Court often has shared Status •••• in Camarilla domains","Adversary (•••–•••••)"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Rules a smaller city or a major domain within a megacity.",
  },
  "The Decade Club": {
    domain: { chasse: 2, portillon: 3 }, // maximums per brief
    required: { Library: dots(3) },
    extras: ["Mythic Flaw (• or ••) suitable to the era"],
    preferred_resonances: [],
    common_advantages: [],
    notes: "Informal club bound by a shared decade/era, values, and holdings.",
  },
};

// Lightweight lookup helpers (optional)
export const ALL_COTERIE_NAMES = Object.keys(COTERIES);

export function getCoterie(name) {
  return COTERIES[name] || null;
}

export function summarizeCoterie(name) {
  const c = getCoterie(name);
  if (!c) return null;
  return {
    name,
    domain: c.domain || null,
    required: c.required || {},
    extras: asArray(c.extras),
    preferred_resonances: asArray(c.preferred_resonances),
    common_advantages: asArray(c.common_advantages),
    notes: c.notes || "",
  };
}

// eslint-disable-next-line no-unused-vars
function cap(s){ return String(s||"").charAt(0).toUpperCase()+String(s||"").slice(1); }
