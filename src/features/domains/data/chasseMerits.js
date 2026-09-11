// ── Chasse Merits ────────────────────────────────────────────────────────
// Landmark-based feeding-ground merits (V5 Cults of the Blood Gods / Chicago
// by Night domain rules). These are hand-assigned to the Athens map divisions
// whose real-world landmarks fit — a hospital row, a nightlife strip, a
// cemetery, embassy villas, etc. Shown only in the division dossier (side
// panel), for every player. `dots` on an assignment overrides the merit's
// canonical rating where the local landmark is a lesser version of it.
//
// Font Awesome 6 Free (Solid) glyphs, inlined as { viewBox, path } so we don't
// pull in the whole icon library. Icons: CC BY 4.0 — fontawesome.com/license.

export const CHASSE_MERIT_DEFS = {
  apartment_towers: {
    name: 'Apartment Towers',
    dots: 2,
    resonances: ['All'],
    favours: ['Extortionist'],
    icon: {
      viewBox: '0 0 384 512',
      path: 'M48 0C21.5 0 0 21.5 0 48V464c0 26.5 21.5 48 48 48h96V432c0-26.5 21.5-48 48-48s48 21.5 48 48v80h96c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48H48zM64 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V240zm112-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V240c0-8.8 7.2-16 16-16zm80 16c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H272c-8.8 0-16-7.2-16-16V240zM80 96h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V112c0-8.8 7.2-16 16-16zm80 16c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V112zM272 96h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H272c-8.8 0-16-7.2-16-16V112c0-8.8 7.2-16 16-16z',
    },
    color: '#8fb3d9',
    description:
      "Extortionist Predator Type vampires receive one bonus die on their hunts in the domain. Subtract one die from the domain's Portillon pools.",
  },
  back_alleys: {
    name: 'Back Alleys',
    dots: 2,
    resonances: ['Phlegmatic'],
    favours: ['Alleycat', 'Montero'],
    icon: {
      viewBox: '0 0 576 512',
      path: 'M49.7 32c-10.5 0-19.8 6.9-22.9 16.9L.9 133c-.6 2-.9 4.1-.9 6.1C0 150.7 9.3 160 20.9 160h94L140.5 32H49.7zM272 160V32H173.1L147.5 160H272zm32 0H428.5L402.9 32H304V160zm157.1 0h94c11.5 0 20.9-9.3 20.9-20.9c0-2.1-.3-4.1-.9-6.1L549.2 48.9C546.1 38.9 536.8 32 526.3 32H435.5l25.6 128zM32 192l4 32H32c-17.7 0-32 14.3-32 32s14.3 32 32 32H44L64 448c0 17.7 14.3 32 32 32s32-14.3 32-32H448c0 17.7 14.3 32 32 32s32-14.3 32-32l20-160h12c17.7 0 32-14.3 32-32s-14.3-32-32-32h-4l4-32H32z',
    },
    color: '#9aa694',
    description:
      "Alley Cat or Montero Predator Type vampires receive one bonus die on their hunts in the domain. Add one die to an Animalism pool using rats to spy on the character's domain.",
  },
  funerary: {
    name: 'Funerary',
    dots: 1,
    resonances: ['None', 'Melancholy'],
    favours: ['Bagger', 'Graverobber'],
    icon: {
      viewBox: '0 0 384 512',
      path: 'M176 0c-26.5 0-48 21.5-48 48v80H48c-26.5 0-48 21.5-48 48v32c0 26.5 21.5 48 48 48h80V464c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V256h80c26.5 0 48-21.5 48-48V176c0-26.5-21.5-48-48-48H256V48c0-26.5-21.5-48-48-48H176z',
    },
    color: '#b9b1c9',
    description:
      "Bagger or Graverobber Predator Type vampires receive one bonus die on their hunts in the domain. Due to high-clan snobs seeing feeding in this method as less than worthy of respect, the coterie loses one die from Social pools when in a contest against them.",
  },
  gated_community: {
    name: 'Gated Community',
    dots: 2,
    resonances: ['Melancholy'],
    favours: ['Sandman'],
    icon: {
      viewBox: '0 0 640 512',
      path: 'M384 480c0 11.7 3.1 22.6 8.6 32H392c-22.1 0-40-17.9-40-40V448 384c0-17.7-14.3-32-32-32H256c-17.7 0-32 14.3-32 32v64 24c0 22.1-17.9 40-40 40H160 128.1c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2H104c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9 .1-2.8V287.6H32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L490.7 166.3C447.2 181.7 416 223.2 416 272v24.6c-19.1 11.1-32 31.7-32 55.4V480zM528 240c-17.7 0-32 14.3-32 32v48h64V272c0-17.7-14.3-32-32-32zm-80 32c0-44.2 35.8-80 80-80s80 35.8 80 80v48c17.7 0 32 14.3 32 32V480c0 17.7-14.3 32-32 32H448c-17.7 0-32-14.3-32-32V352c0-17.7 14.3-32 32-32V272z',
    },
    color: '#c7a86a',
    description:
      "The base Difficulty for Larceny tests and related tests is equivalent to the Resource dots of the average resident. Sandman Predator Type vampires receive one bonus die on their hunts in the domain. The mortals within this area tend to be educated professionals or otherwise, making them good sources for Allies, Contacts, or Retainers — but on the flip side can cause problems if they spot a vampire hunting. Storytellers may deny this Merit if the coterie is located in the heart of a city.",
  },
  hospital: {
    name: 'Hospital',
    dots: 2,
    resonances: ['Melancholy', 'Phlegmatic'],
    favours: ['Bagger', 'Consensualist', 'Grim Reaper', 'Trapdoor'],
    icon: {
      viewBox: '0 0 576 512',
      path: 'M543.8 287.6c17 0 32-14 32-32.1c1-9-3-17-11-24L309.5 7c-6-5-14-7-21-7s-15 1-22 8L10 231.5c-7 7-10 15-10 24c0 18 14 32.1 32 32.1h32V448c0 35.3 28.7 64 64 64H448.5c35.5 0 64.2-28.8 64-64.3l-.7-160.2h32zM256 208c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v48h48c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H320v48c0 8.8-7.2 16-16 16H272c-8.8 0-16-7.2-16-16V320H208c-8.8 0-16-7.2-16-16V272c0-8.8 7.2-16 16-16h48V208z',
    },
    color: '#e2554e',
    description:
      "Bagger, Consensualist, Grim Reaper or Trapdoor Predator Type vampires receive one bonus die on their hunts in the domain, as do the pools to obtain bagged blood or medical supplies. Hunter groups receive an extra die to their pools to infiltrate the domain.",
  },
  nightlife: {
    name: 'Nightlife',
    dots: 3,
    resonances: ['Choleric', 'Sanguine'],
    favours: ['Montero', 'Pursuer', 'Scene Queen', 'Siren', 'Trapdoor'],
    icon: {
      viewBox: '0 0 512 512',
      path: 'M32 0C19.1 0 7.4 7.8 2.4 19.8s-2.2 25.7 6.9 34.9L224 269.3V448H160c-17.7 0-32 14.3-32 32s14.3 32 32 32h96 96c17.7 0 32-14.3 32-32s-14.3-32-32-32H288V269.3L502.6 54.6c9.2-9.2 11.9-22.9 6.9-34.9S492.9 0 480 0H32zM173.3 128l-64-64H402.7l-64 64H173.3z',
    },
    color: '#e06fb4',
    description:
      "Montero, Pursuer, Scene Queen, Siren or Trapdoor Predator Type vampires receive one bonus die on their hunts in the domain. Other Kindred may be willing to pay boons to feed in this territory. Any 1 on a hunting pool roll means the target has tainted blood. Due to extra leverage for both organized crime and the city government, add one dot to those Influence groups here for both the coterie and foes. Storytellers may deny this Merit to a coterie in the outskirts.",
  },
  shelter: {
    name: 'Shelter',
    dots: 2,
    resonances: ['Choleric', 'Melancholy'],
    favours: ['Alleycat', 'Sandman'],
    icon: {
      viewBox: '0 0 640 512',
      path: 'M32 32c17.7 0 32 14.3 32 32V320H288V160c0-17.7 14.3-32 32-32H544c53 0 96 43 96 96V448c0 17.7-14.3 32-32 32s-32-14.3-32-32V416H352 320 64v32c0 17.7-14.3 32-32 32s-32-14.3-32-32V64C0 46.3 14.3 32 32 32zm144 96a80 80 0 1 1 0 160 80 80 0 1 1 0-160z',
    },
    color: '#e0a35a',
    description:
      "Alley Cat or Sandman Predator Type vampires receive one bonus die on their hunts in the domain. Any 1 on a hunting pool roll means the target has tainted blood. The mortals within this area tend to know about street life, making them a good source for Allies, Contacts, or Retainers. Storytellers may deny this Merit to a coterie within a prestigious area of the city.",
  },
};

// division number -> [{ merit, dots?, note? }]
// note = the specific Athens landmark that earns the merit.
export const DIVISION_CHASSE = {
  1: [{ merit: 'funerary', note: 'The First Cemetery of Athens at Mets — marble mausoleums, family vaults, night wardens who look the other way.' }],
  2: [
    { merit: 'funerary', note: 'Zografou Cemetery on the Hymettos slope.' },
    { merit: 'nightlife', dots: 2, note: 'Student bars around the Panepistimioupoli campus and Kaisariani square.' },
  ],
  3: [
    { merit: 'back_alleys', note: 'The tight grid of Exarcheia — arcades, courtyards, walls of posters.' },
    { merit: 'shelter', note: 'Long-running squats and refugee housing off the square.' },
  ],
  4: [
    { merit: 'hospital', note: 'Asklepieion Voulas general hospital.' },
    { merit: 'gated_community', note: 'The Kavouri and Vouliagmeni villa strip.' },
  ],
  5: [
    { merit: 'hospital', note: 'The hospital row along Mesogeíon and Vas. Sofías — Gennimatás, the children\'s hospitals, the 401 Military Hospital.' },
    { merit: 'apartment_towers', note: 'The Athens Tower complex, the tallest in the city.' },
  ],
  6: [
    { merit: 'nightlife', note: 'The Syngroú Avenue mega-clubs and Tzitzifiés bouzoúkia on the Kallithéa waterfront.' },
    { merit: 'apartment_towers', note: 'Wall-to-wall post-war apartment blocks.' },
  ],
  8: [
    { merit: 'back_alleys', note: 'The stepped lanes of Pláka and Anafiótika.' },
    { merit: 'nightlife', dots: 2, note: 'Taverna courtyards and the bars spilling up from Monastiráki.' },
  ],
  9: [
    { merit: 'nightlife', note: 'Gázi — Technópolis, the clubs and queer bars around the old gasworks.' },
    { merit: 'funerary', note: 'The ancient Kerameikós necropolis and its Sacred Gate.' },
  ],
  11: [{ merit: 'nightlife', dots: 2, note: 'The café-bar strip along Apostólou Pávlou under the Acropolis.' }],
  13: [{ merit: 'nightlife', dots: 2, note: 'Édem and the Palaió Fáliro beachfront bars.' }],
  14: [{ merit: 'nightlife', dots: 2, note: 'The ring of cafés and bars around Néa Smýrni square.' }],
  16: [{ merit: 'nightlife', dots: 2, note: 'The Onassis Stégi / Fix corridor along Syngroú.' }],
  18: [
    { merit: 'nightlife', note: 'Kolonáki\'s bars and members\' clubs.' },
    { merit: 'hospital', note: 'The Evangelismós–Laïkó–Alexándra hospital cluster on Vas. Sofías.' },
  ],
  19: [
    { merit: 'apartment_towers', note: 'One of the densest municipalities in the country — nothing but apartment blocks.' },
    { merit: 'nightlife', dots: 2, note: 'The bars around Peristéri square.' },
  ],
  20: [{ merit: 'apartment_towers', note: 'Dense working-class blocks around the university.' }],
  23: [{ merit: 'gated_community', note: 'Psychikó — embassy residences, walled gardens, private security.' }],
  24: [
    { merit: 'shelter', note: 'The hostels and soup kitchens around Attikí and Viktoría squares.' },
    { merit: 'back_alleys', note: 'The gutted arcades of Metaxourgeío.' },
  ],
  25: [{ merit: 'apartment_towers', note: 'Kypséli — Europe\'s most densely built neighbourhood, balcony over balcony.' }],
  27: [
    { merit: 'gated_community', note: 'Ekáli and Politeía — the gated estates north of Kifisiá.' },
    { merit: 'hospital', note: 'KAT, the national accident and trauma hospital.' },
  ],
  28: [{ merit: 'nightlife', dots: 2, note: 'The Álimos marina beach bars.' }],
  29: [
    { merit: 'hospital', note: 'Sismanógleio, Amalía Fleming and the Athens Medical Center.' },
    { merit: 'apartment_towers', note: 'The office and residential towers along Kifisías Avenue.' },
  ],
  33: [
    { merit: 'apartment_towers', note: 'Solid post-war density from Patísia to Áno Patísia.' },
    { merit: 'shelter', dots: 1, note: 'Overflow from the city-centre shelters.' },
  ],
  34: [
    { merit: 'shelter', note: 'The rough ground around Kolonós and the freight yards.' },
    { merit: 'back_alleys', note: 'Warehouse lanes behind Sepólia.' },
  ],
  35: [{ merit: 'gated_community', note: 'Papágou — a planned garden suburb of officers\' housing, quiet and self-contained.' }],
  36: [{ merit: 'hospital', note: 'The Goudí medical campus — Sotiría, the military hospital, the children\'s hospitals of Athens.' }],
  39: [
    { merit: 'shelter', note: 'Omónoia and Váthis — the shelters, the migrant hostels, the people who sleep in the arcades.' },
    { merit: 'back_alleys', note: 'The wholesale market lanes and covered stoás of the old commercial triangle.' },
    { merit: 'nightlife', note: 'Syntagma to Sofokléous — the central bars, the after-hours spots, the crowds that never fully thin.' },
    { merit: 'apartment_towers', note: 'Dense residential stacked over the ground-floor shops, plus the tower hotels around the squares.' },
    { merit: 'funerary', dots: 1, note: 'The Mitrópolis and the smaller downtown churches keep active crypts and mortuary chapels.' },
  ],
  40: [
    { merit: 'nightlife', note: 'Psyrrí — the densest concentration of bars and late kitchens in the centre.' },
    { merit: 'back_alleys', note: 'Ironmongers\' rows and dead-end courtyards off the squares.' },
  ],
  43: [
    { merit: 'nightlife', note: 'Mikrolímano and Pasalimáni — the harbour bars and clubs of Piraeus.' },
    { merit: 'hospital', note: 'Tzáneio general hospital.' },
    { merit: 'apartment_towers', note: 'The Piraeus Tower and the wall of high blocks facing the Great Harbour.' },
    { merit: 'back_alleys', note: 'The warehouse grid behind the port — Ágios Dionýsios, the customs yards, the container lanes.' },
    { merit: 'shelter', note: 'The seamen\'s missions and the transients who pass through the ferry gates and never leave.' },
  ],
  44: [{ merit: 'hospital', note: 'Attikón university hospital and the Dromokaíteio.' }],
  45: [{ merit: 'hospital', note: 'Nikaia General "Ágios Panteleímon".' }],
  46: [
    { merit: 'nightlife', note: 'The Glyfáda strip and the Riviera beach clubs.' },
    { merit: 'gated_community', note: 'The golf-course quarter and the closed streets toward Voúla.' },
  ],
  48: [{ merit: 'hospital', note: 'Thriásio general hospital.' }],
  83: [
    { merit: 'back_alleys', note: 'The Paloúkia ferry ramp and the naval-yard fence line — dockworkers, night crews, sailors between watches.' },
    { merit: 'shelter', dots: 1, note: 'The shanty edges of Salamína town and Aiánteio, cut off from the mainland every night when the boats stop.' },
  ],
  84: [{ merit: 'funerary', note: 'The old chapels and rock-cut tombs around the Cave of Pan at Fylí, and the mountain cemeteries the city forgets.' }],
  85: [
    { merit: 'back_alleys', note: 'The SKA freight yards and the wholesale-market sprawl of Menídi — containers, sidings, and the lanes behind them.' },
    { merit: 'shelter', note: 'The rougher blocks of Menídi and the Roma quarters on the town\'s northern edge.' },
  ],
  88: [
    { merit: 'back_alleys', note: 'The Skaramangá shipyards — dry docks, gantry cranes, warehouse rows, and the workers\' gate on the coast road.' },
    { merit: 'shelter', note: 'The Skaramangás camp and the transients who pass through the container port and the coast highway.' },
  ],
};

// Resolve a division's assignments into full merit objects for the UI.
export function getDivisionChasse(division) {
  const list = DIVISION_CHASSE[division];
  if (!list) return [];
  return list
    .map(a => {
      const def = CHASSE_MERIT_DEFS[a.merit];
      if (!def) return null;
      return {
        key: a.merit,
        ...def,
        dots: a.dots ?? def.dots,
        note: a.note || '',
      };
    })
    .filter(Boolean);
}
