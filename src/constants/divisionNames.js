// src/constants/divisionNames.js
// Canonical dictionary of the 49 Athens domain division names and options.

export const DIVISION_NAMES = {
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
  45: 'Korydallos, Nikaia, Agia Barbara', 46: 'Glyfada', 47: 'Gkyzh', 48: 'Eleysina', 49: 'Aspropirgos',
};

// The outer municipalities (50+) the Domains map added later. Kept apart so
// DIVISION_OPTIONS (the coterie domain picker) is unchanged; name lookups
// should go through getDivisionName, which reads both.
export const OUTER_DIVISION_NAMES = {
  50: "Magoylas", 51: "Mandras", 52: "Vilion", 53: "Erythron", 54: "Oinois",
  55: "Neas Peramoy", 56: "Ano Liosion", 57: "Zefyrioy", 58: "Rodopoleos", 59: "Stamatas",
  60: "Anthoysas", 61: "Agioy Stefanoy", 62: "Anoixeos", 63: "Dionysoy", 64: "Drosias",
  65: "Pallinis", 66: "Spaton - Loytsas", 67: "Thrakomakedonon", 68: "Agioy Konstantinoy", 69: "Rafinas",
  70: "Varnava", 71: "Pikermioy", 72: "Neas Makris", 73: "Koyvara", 74: "Palaias Fokaias",
  75: "Afidnon", 76: "Oropion", 77: "Kalamoy", 78: "Malakasis", 79: "Kapandritioy",
  80: "Sykaminoy", 81: "Polydendrioy", 82: "Methanon", 83: "Salamina", 84: "Fyli, Xasia",
  85: "Axarnes, Menidi", 86: "Koropi", 87: "Markopoylo Mesogaias", 88: "Skaramagkas", 89: "Penteli",
};

export const DIVISION_OPTIONS = Object.entries(DIVISION_NAMES)
  .map(([id, name]) => ({
    value: Number(id),
    label: name || `Division ${id}`,
  }))
  .sort((a, b) => a.value - b.value);

export function getDivisionName(division) {
  if (division == null) return '';
  return DIVISION_NAMES[division] || OUTER_DIVISION_NAMES[division] || `Division ${division}`;
}
