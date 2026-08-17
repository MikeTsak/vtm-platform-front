// Real-world population figures for the 49 Athens map divisions (2021 ELSTAT census
// where available). Flavor data for the domain dossier UI — see ../Domains.jsx.
//
// Methodology:
// - Divisions that ARE their own standalone Municipality (Δήμος) in Attica use the
//   official 2021 ELSTAT permanent-population census figure for that municipality.
// - Divisions that are neighborhoods inside the Municipality of Athens proper (which
//   has no official per-neighborhood 2021 breakdown) are attributed to the relevant
//   1st-7th Municipal Community (Δημοτική Κοινότητα) of Athens. Because ELSTAT has not
//   published an official population-by-community table for 2021, these community
//   totals are derived estimates (total municipal population of 637,798 distributed
//   across the 7 communities by typical relative size/density) and are marked
//   "(estimated)" in their source string.
// - Divisions covering multiple named towns that are each their OWN standalone
//   municipality (not merged, not shared with any other division) sum every named
//   town's official 2021 figure, so the number represents the whole division rather
//   than silently favoring whichever town happened to be listed first (this was a
//   bug in the initial pass — division 45 originally showed only Korydallos's 61,247
//   while quietly ignoring Nikaia-Agios Ioannis Rentis, which is actually bigger).
// - Divisions that are actually a sub-area (Δημοτική Κοινότητα/Ενότητα) of a merged
//   municipality without a published individual figure use an estimated proportional
//   share of the merged municipality's total, marked "(estimated)".
//
// `population` is NOT necessarily exclusive to one division — several divisions can
// share the same real-world municipality/community and therefore the same figure.
// `group` is a stable key identifying that real-world place; any two divisions with
// the same `group` are reporting the SAME population, not one each. The UI must make
// this explicit (see Domains.jsx) rather than implying e.g. Kolonaki alone has
// 82,900 residents when that's actually the whole 1st Municipal Community of Athens.
export const DIVISION_POPULATIONS = {
  1: { population: 95700, placeLabel: 'Pagkrati', group: 'athens-2', groupLabel: '2nd Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  2: { population: 69857, placeLabel: 'Zografou (adjoining Kaisariani)', group: 'zografou', groupLabel: 'Municipality of Zografou', source: 'ELSTAT 2021 Census, Municipality of Zografou' },
  3: { population: 82900, placeLabel: 'Exarcheia', group: 'athens-1', groupLabel: '1st Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  4: { population: 27000, placeLabel: 'Voula', group: 'vvv', groupLabel: 'Municipality of Vari-Voula-Vouliagmeni', source: 'ELSTAT 2021 Census, Municipality of Vari-Voula-Vouliagmeni (estimated share of combined total) (estimated)' },
  5: { population: 108400, placeLabel: 'Ampelokipoi', group: 'athens-7', groupLabel: '7th Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  6: { population: 96118, placeLabel: 'Kallithea', group: 'kallithea', groupLabel: 'Municipality of Kallithea', source: 'ELSTAT 2021 Census, Municipality of Kallithea' },
  7: { population: 63800, placeLabel: 'Petralona', group: 'athens-3', groupLabel: '3rd Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  8: { population: 82900, placeLabel: 'Plaka', group: 'athens-1', groupLabel: '1st Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  9: { population: 63800, placeLabel: 'Keramikos', group: 'athens-3', groupLabel: '3rd Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  10: { population: 14670, placeLabel: 'Tavros', group: 'moschato-tavros', groupLabel: 'Municipality of Moschato-Tavros', source: 'ELSTAT 2021 Census, Municipality of Moschato-Tavros (estimated share of combined total) (estimated)' },
  11: { population: 63800, placeLabel: 'Thiseio', group: 'athens-3', groupLabel: '3rd Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  12: { population: 24990, placeLabel: 'Moschato', group: 'moschato-tavros', groupLabel: 'Municipality of Moschato-Tavros', source: 'ELSTAT 2021 Census, Municipality of Moschato-Tavros (estimated share of combined total) (estimated)' },
  13: { population: 64879, placeLabel: 'Palaio Faliro', group: 'palaio-faliro', groupLabel: 'Municipality of Palaio Faliro', source: 'ELSTAT 2021 Census, Municipality of Palaio Faliro' },
  14: { population: 72546, placeLabel: 'Nea Smyrni', group: 'nea-smyrni', groupLabel: 'Municipality of Nea Smyrni', source: 'ELSTAT 2021 Census, Municipality of Nea Smyrni' },
  15: { population: 71747, placeLabel: 'Agios Dimitrios', group: 'agios-dimitrios', groupLabel: 'Municipality of Agios Dimitrios', source: 'ELSTAT 2021 Census, Municipality of Agios Dimitrios' },
  16: { population: 95700, placeLabel: 'Neos Kosmos', group: 'athens-2', groupLabel: '2nd Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  17: { population: 34934, placeLabel: 'Nea Penteli & Melissia', group: 'penteli', groupLabel: 'Municipality of Penteli', source: 'ELSTAT Census, Municipality of Penteli (2011 figure carried forward; 2021 per-municipality figure unconfirmed) (estimated)' },
  18: { population: 82900, placeLabel: 'Kolonaki & Lykavittos', group: 'athens-1', groupLabel: '1st Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  19: { population: 132123, placeLabel: 'Peristeri', group: 'peristeri', groupLabel: 'Municipality of Peristeri', source: 'ELSTAT 2021 Census, Municipality of Peristeri' },
  20: { population: 64828, placeLabel: 'Aigaleo', group: 'aigaleo', groupLabel: 'Municipality of Aigaleo', source: 'ELSTAT 2021 Census, Municipality of Aigaleo' },
  21: { population: 205632, placeLabel: 'Petroupoli, Ilion & Agioi Anargyroi-Kamatero (combined)', group: 'petroupoli-ilion-aak', groupLabel: 'Petroupoli + Ilion + Agioi Anargyroi-Kamatero', source: 'ELSTAT 2021 Census — sum of Municipality of Petroupoli (60,166) + Municipality of Ilion (84,004) + Municipality of Agioi Anargyroi-Kamatero (61,462)' },
  22: { population: 49722, placeLabel: 'Argyroupoli-Elliniko', group: 'argyroupoli-elliniko', groupLabel: 'Municipality of Argyroupoli-Elliniko', source: 'ELSTAT 2021 Census, Municipality of Argyroupoli-Elliniko' },
  23: { population: 27636, placeLabel: 'Psychiko & Neo Psychiko', group: 'filothei-psychiko', groupLabel: 'Municipality of Filothei-Psychiko', source: 'ELSTAT 2021 Census, Municipality of Filothei-Psychiko' },
  24: { population: 82900, placeLabel: 'Attiki Square', group: 'athens-4', groupLabel: '4th Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  25: { population: 102000, placeLabel: 'Kypseli', group: 'athens-6', groupLabel: '6th Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  26: { population: 57917, placeLabel: 'Galatsi', group: 'galatsi', groupLabel: 'Municipality of Galatsi', source: 'ELSTAT 2021 Census, Municipality of Galatsi' },
  27: { population: 72860, placeLabel: 'Kifisia (with Nea Erythraia)', group: 'kifisia', groupLabel: 'Municipality of Kifisia', source: 'ELSTAT 2021 Census, Municipality of Kifisia' },
  28: { population: 42872, placeLabel: 'Alimos', group: 'alimos', groupLabel: 'Municipality of Alimos', source: 'ELSTAT 2021 Census, Municipality of Alimos' },
  29: { population: 70519, placeLabel: 'Marousi', group: 'marousi', groupLabel: 'Municipality of Marousi', source: 'ELSTAT 2021 Census, Municipality of Marousi (Amaroussion) — note: Pefki, also named in this division, is a merged municipality with Lykovrysi and is counted under Division 30 instead, not here' },
  30: { population: 111667, placeLabel: 'Iraklio, Metamorfosi & Lykovrysi-Pefki (combined)', group: 'iraklio-metamorfosi-lykovrysi-pefki', groupLabel: 'Iraklio Attikis + Metamorfosi + Lykovrysi-Pefki', source: 'ELSTAT 2021 Census — sum of Municipality of Iraklio Attikis (50,495) + Municipality of Metamorfosi (30,174) + Municipality of Lykovrysi-Pefki (30,998)' },
  31: { population: 77118, placeLabel: 'Chalandri (with Vrilissia)', group: 'chalandri', groupLabel: 'Municipality of Chalandri', source: 'ELSTAT 2021 Census, Municipality of Chalandri' },
  32: { population: 115172, placeLabel: 'Perama & Keratsini-Drapetsona (combined)', group: 'perama-keratsini', groupLabel: 'Perama + Keratsini-Drapetsona', source: 'ELSTAT 2021 Census — sum of Municipality of Perama (25,636) + Municipality of Keratsini-Drapetsona (89,536)' },
  33: { population: 102000, placeLabel: 'Patisia', group: 'athens-5', groupLabel: '5th Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  34: { population: 82900, placeLabel: 'Kolonos & Sepolia', group: 'athens-4', groupLabel: '4th Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  35: { population: 31600, placeLabel: 'Cholargos (near Agia Paraskevi)', group: 'papagou-cholargos', groupLabel: 'Municipality of Papagou-Cholargos', source: 'ELSTAT 2021 Census, Municipality of Papagou-Cholargos (estimated share of combined total) (estimated)' },
  36: { population: 108400, placeLabel: 'Katehaki', group: 'athens-7', groupLabel: '7th Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate, approximate (borders Zografou) (estimated)' },
  37: { population: 34958, placeLabel: 'Nea Filadelfeia', group: 'nea-filadelfeia-nea-chalkidona', groupLabel: 'Municipality of Nea Filadelfeia-Nea Chalkidona', source: 'ELSTAT 2021 Census, Municipality of Nea Filadelfeia-Nea Chalkidona' },
  38: { population: 135842, placeLabel: 'Ilioupoli & Vyronas (combined)', group: 'ilioupoli-vyronas', groupLabel: 'Ilioupoli + Vyronas', source: 'ELSTAT 2021 Census — sum of Municipality of Ilioupoli (76,708) + Municipality of Vyronas (59,134)' },
  39: { population: 82900, placeLabel: 'Athina (Omonia-Syntagma center)', group: 'athens-1', groupLabel: '1st Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  40: { population: 82900, placeLabel: 'Psyrri', group: 'athens-1', groupLabel: '1st Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  41: { population: 11300, placeLabel: 'Ymittos', group: 'dafni-ymittos', groupLabel: 'Municipality of Dafni-Ymittos', source: 'ELSTAT 2021 Census, Municipality of Dafni-Ymittos (estimated share of combined total) (estimated)' },
  42: { population: 150, placeLabel: 'Parnitha (Mount Parnitha National Park)', group: 'parnitha', groupLabel: 'Parnitha National Park area', source: 'No permanent census population; mountain/forest area near Acharnes with only rangers and monastery staff (estimated)' },
  43: { population: 168151, placeLabel: 'Piraeus (with Neo Faliro)', group: 'piraeus', groupLabel: 'Municipality of Piraeus', source: 'ELSTAT 2021 Census, Municipality of Piraeus — 4th largest municipality in Greece; Neo Faliro is a neighborhood within it, not a separate municipality' },
  44: { population: 46983, placeLabel: 'Chaidari', group: 'chaidari', groupLabel: 'Municipality of Chaidari', source: 'ELSTAT 2021 Census, Municipality of Chaidari' },
  45: { population: 191494, placeLabel: 'Korydallos, Nikaia-Agios Ioannis Rentis & Agia Varvara (combined)', group: 'korydallos-nikaia-agiavarvara', groupLabel: 'Korydallos + Nikaia-Agios Ioannis Rentis + Agia Varvara', source: 'ELSTAT 2021 Census — sum of Municipality of Korydallos (61,247) + Municipality of Nikaia-Agios Ioannis Rentis (103,488) + Municipality of Agia Varvara (26,759)' },
  46: { population: 89605, placeLabel: 'Glyfada', group: 'glyfada', groupLabel: 'Municipality of Glyfada', source: 'ELSTAT 2021 Census, Municipality of Glyfada' },
  47: { population: 108400, placeLabel: 'Gyzi', group: 'athens-7', groupLabel: '7th Municipal Community of Athens', source: 'ELSTAT 2021 Census, Municipality of Athens — district-level estimate (estimated)' },
  48: { population: 29619, placeLabel: 'Elefsina', group: 'elefsina', groupLabel: 'Municipality of Elefsina', source: 'ELSTAT 2021 Census, Municipality of Elefsina' },
  49: { population: 31420, placeLabel: 'Aspropyrgos', group: 'aspropyrgos', groupLabel: 'Municipality of Aspropyrgos', source: 'ELSTAT 2021 Census, Municipality of Aspropyrgos' },
};

// Divisions that share a `group` report the SAME population — this maps each
// group key to the list of division numbers that belong to it, so the UI can
// say "shared with #8, #39, #40" instead of implying an exclusive figure.
export const POPULATION_GROUP_MEMBERS = Object.entries(DIVISION_POPULATIONS).reduce((acc, [numStr, info]) => {
  const num = Number(numStr);
  (acc[info.group] = acc[info.group] || []).push(num);
  return acc;
}, {});
