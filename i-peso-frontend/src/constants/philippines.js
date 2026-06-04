// src/constants/philippines.js
// Philippine geographic data for the i-PESO Job Seeker registration form.
// Pangasinan (Urdaneta City PESO's home province) has the most complete dataset.

export const PHILIPPINES_PROVINCES = [
  // ── Region I — Ilocos ──────────────────────────────────────────────────
  { code: 'ilocos-norte',     name: 'Ilocos Norte',     region: 'I' },
  { code: 'ilocos-sur',       name: 'Ilocos Sur',       region: 'I' },
  { code: 'la-union',         name: 'La Union',          region: 'I' },
  { code: 'pangasinan',       name: 'Pangasinan',        region: 'I' },
  // ── Region II — Cagayan Valley ────────────────────────────────────────
  { code: 'batanes',          name: 'Batanes',           region: 'II' },
  { code: 'cagayan',          name: 'Cagayan',           region: 'II' },
  { code: 'isabela',          name: 'Isabela',           region: 'II' },
  { code: 'nueva-vizcaya',    name: 'Nueva Vizcaya',     region: 'II' },
  { code: 'quirino',          name: 'Quirino',           region: 'II' },
  // ── Region III — Central Luzon ────────────────────────────────────────
  { code: 'aurora',           name: 'Aurora',            region: 'III' },
  { code: 'bataan',           name: 'Bataan',            region: 'III' },
  { code: 'bulacan',          name: 'Bulacan',           region: 'III' },
  { code: 'nueva-ecija',      name: 'Nueva Ecija',       region: 'III' },
  { code: 'pampanga',         name: 'Pampanga',          region: 'III' },
  { code: 'tarlac',           name: 'Tarlac',            region: 'III' },
  { code: 'zambales',         name: 'Zambales',          region: 'III' },
  // ── Region IV-A — CALABARZON ──────────────────────────────────────────
  { code: 'batangas',         name: 'Batangas',          region: 'IV-A' },
  { code: 'cavite',           name: 'Cavite',            region: 'IV-A' },
  { code: 'laguna',           name: 'Laguna',            region: 'IV-A' },
  { code: 'quezon',           name: 'Quezon',            region: 'IV-A' },
  { code: 'rizal',            name: 'Rizal',             region: 'IV-A' },
  // ── Region IV-B — MIMAROPA ────────────────────────────────────────────
  { code: 'marinduque',       name: 'Marinduque',        region: 'IV-B' },
  { code: 'occidental-mindoro', name: 'Occidental Mindoro', region: 'IV-B' },
  { code: 'oriental-mindoro', name: 'Oriental Mindoro',  region: 'IV-B' },
  { code: 'palawan',          name: 'Palawan',           region: 'IV-B' },
  { code: 'romblon',          name: 'Romblon',           region: 'IV-B' },
  // ── Region V — Bicol ──────────────────────────────────────────────────
  { code: 'albay',            name: 'Albay',             region: 'V' },
  { code: 'camarines-norte',  name: 'Camarines Norte',   region: 'V' },
  { code: 'camarines-sur',    name: 'Camarines Sur',     region: 'V' },
  { code: 'catanduanes',      name: 'Catanduanes',       region: 'V' },
  { code: 'masbate',          name: 'Masbate',           region: 'V' },
  { code: 'sorsogon',         name: 'Sorsogon',          region: 'V' },
  // ── Region VI — Western Visayas ───────────────────────────────────────
  { code: 'aklan',            name: 'Aklan',             region: 'VI' },
  { code: 'antique',          name: 'Antique',           region: 'VI' },
  { code: 'capiz',            name: 'Capiz',             region: 'VI' },
  { code: 'guimaras',         name: 'Guimaras',          region: 'VI' },
  { code: 'iloilo',           name: 'Iloilo',            region: 'VI' },
  { code: 'negros-occidental', name: 'Negros Occidental', region: 'VI' },
  // ── Region VII — Central Visayas ──────────────────────────────────────
  { code: 'bohol',            name: 'Bohol',             region: 'VII' },
  { code: 'cebu',             name: 'Cebu',              region: 'VII' },
  { code: 'negros-oriental',  name: 'Negros Oriental',   region: 'VII' },
  { code: 'siquijor',         name: 'Siquijor',          region: 'VII' },
  // ── Region VIII — Eastern Visayas ─────────────────────────────────────
  { code: 'biliran',          name: 'Biliran',           region: 'VIII' },
  { code: 'eastern-samar',    name: 'Eastern Samar',     region: 'VIII' },
  { code: 'leyte',            name: 'Leyte',             region: 'VIII' },
  { code: 'northern-samar',   name: 'Northern Samar',    region: 'VIII' },
  { code: 'samar',            name: 'Samar',             region: 'VIII' },
  { code: 'southern-leyte',   name: 'Southern Leyte',    region: 'VIII' },
  // ── Region IX — Zamboanga Peninsula ──────────────────────────────────
  { code: 'zamboanga-del-norte', name: 'Zamboanga del Norte', region: 'IX' },
  { code: 'zamboanga-del-sur',   name: 'Zamboanga del Sur',   region: 'IX' },
  { code: 'zamboanga-sibugay',   name: 'Zamboanga Sibugay',   region: 'IX' },
  // ── Region X — Northern Mindanao ─────────────────────────────────────
  { code: 'bukidnon',         name: 'Bukidnon',          region: 'X' },
  { code: 'camiguin',         name: 'Camiguin',          region: 'X' },
  { code: 'lanao-del-norte',  name: 'Lanao del Norte',   region: 'X' },
  { code: 'misamis-occidental', name: 'Misamis Occidental', region: 'X' },
  { code: 'misamis-oriental', name: 'Misamis Oriental',  region: 'X' },
  // ── Region XI — Davao ─────────────────────────────────────────────────
  { code: 'davao-de-oro',     name: 'Davao de Oro',      region: 'XI' },
  { code: 'davao-del-norte',  name: 'Davao del Norte',   region: 'XI' },
  { code: 'davao-del-sur',    name: 'Davao del Sur',     region: 'XI' },
  { code: 'davao-occidental', name: 'Davao Occidental',  region: 'XI' },
  { code: 'davao-oriental',   name: 'Davao Oriental',    region: 'XI' },
  // ── Region XII — SOCCSKSARGEN ─────────────────────────────────────────
  { code: 'cotabato',         name: 'Cotabato',          region: 'XII' },
  { code: 'sarangani',        name: 'Sarangani',         region: 'XII' },
  { code: 'south-cotabato',   name: 'South Cotabato',    region: 'XII' },
  { code: 'sultan-kudarat',   name: 'Sultan Kudarat',    region: 'XII' },
  // ── Region XIII — Caraga ──────────────────────────────────────────────
  { code: 'agusan-del-norte', name: 'Agusan del Norte',  region: 'XIII' },
  { code: 'agusan-del-sur',   name: 'Agusan del Sur',    region: 'XIII' },
  { code: 'dinagat-islands',  name: 'Dinagat Islands',   region: 'XIII' },
  { code: 'surigao-del-norte', name: 'Surigao del Norte', region: 'XIII' },
  { code: 'surigao-del-sur',  name: 'Surigao del Sur',   region: 'XIII' },
  // ── CAR ───────────────────────────────────────────────────────────────
  { code: 'abra',             name: 'Abra',              region: 'CAR' },
  { code: 'apayao',           name: 'Apayao',            region: 'CAR' },
  { code: 'benguet',          name: 'Benguet',           region: 'CAR' },
  { code: 'ifugao',           name: 'Ifugao',            region: 'CAR' },
  { code: 'kalinga',          name: 'Kalinga',           region: 'CAR' },
  { code: 'mountain-province', name: 'Mountain Province', region: 'CAR' },
  // ── NCR ───────────────────────────────────────────────────────────────
  { code: 'metro-manila',     name: 'Metro Manila (NCR)', region: 'NCR' },
  // ── BARMM ─────────────────────────────────────────────────────────────
  { code: 'basilan',          name: 'Basilan',           region: 'BARMM' },
  { code: 'lanao-del-sur',    name: 'Lanao del Sur',     region: 'BARMM' },
  { code: 'maguindanao-norte', name: 'Maguindanao del Norte', region: 'BARMM' },
  { code: 'maguindanao-sur',  name: 'Maguindanao del Sur', region: 'BARMM' },
  { code: 'sulu',             name: 'Sulu',              region: 'BARMM' },
  { code: 'tawi-tawi',        name: 'Tawi-Tawi',         region: 'BARMM' },
]

// ── Cities and municipalities per province ────────────────────────────────
// Pangasinan is the most complete since this is Urdaneta City PESO.
const CITIES_MAP = {
  'pangasinan': [
    'Agno', 'Aguilar', 'Alaminos City', 'Alcala', 'Anda', 'Asingan',
    'Balungao', 'Bani', 'Basista', 'Bautista', 'Bayambang', 'Binalonan',
    'Bolinao', 'Bugallon', 'Burgos', 'Calasiao', 'Dagupan City', 'Dasol',
    'Infanta', 'Labrador', 'Laoac', 'Lingayen', 'Mabini', 'Malasiqui',
    'Manaoag', 'Mangaldan', 'Mangatarem', 'Mapandan', 'Natividad',
    'Pozorrubio', 'Rosales', 'San Carlos City', 'San Fabian', 'San Jacinto',
    'San Manuel', 'San Nicolas', 'San Quintin', 'Santa Barbara', 'Santa Maria',
    'Santo Tomas', 'Sison', 'Sual', 'Tayug', 'Umingan', 'Urbiztondo',
    'Urdaneta City', 'Villasis',
  ],
  'ilocos-norte': [
    'Laoag City', 'Batac City', 'Adams', 'Bacarra', 'Badoc', 'Bangui',
    'Banna', 'Burgos', 'Carasi', 'Currimao', 'Dingras', 'Dumalneg',
    'Espiritu', 'Marcos', 'Nueva Era', 'Pagudpud', 'Paoay', 'Pasuquin',
    'Piddig', 'Pinili', 'San Nicolas', 'Sarrat', 'Solsona', 'Vintar',
  ],
  'ilocos-sur': [
    'Vigan City', 'Candon City', 'Alilem', 'Banayoyo', 'Bantay',
    'Burgos', 'Cabugao', 'Caoayan', 'Cervantes', 'Galimuyod', 'Gregorio del Pilar',
    'Lidlidda', 'Magsingal', 'Nagbukel', 'Narvacan', 'Quirino',
    'Salcedo', 'San Emilio', 'San Esteban', 'San Ildefonso', 'San Juan',
    'San Vicente', 'Santa', 'Santa Catalina', 'Santa Cruz', 'Santa Lucia',
    'Santa Maria', 'Santiago', 'Santo Domingo', 'Sigay', 'Sinait',
    'Sugpon', 'Suyo', 'Tagudin',
  ],
  'la-union': [
    'San Fernando City', 'Agoo', 'Aringay', 'Bacnotan', 'Bagulin',
    'Balaoan', 'Bangar', 'Bauang', 'Burgos', 'Caba', 'Luna',
    'Naguilian', 'Pugo', 'Rosario', 'San Gabriel', 'San Juan',
    'Santo Tomas', 'Santol', 'Sudipen', 'Tubao',
  ],
  'metro-manila': [
    'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong',
    'Manila', 'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque',
    'Pasay', 'Pasig', 'Pateros', 'Quezon City', 'San Juan',
    'Taguig', 'Valenzuela',
  ],
  'cebu': [
    'Cebu City', 'Lapu-Lapu City', 'Mandaue City', 'Carcar City',
    'Danao City', 'Naga City', 'Talisay City', 'Toledo City',
    'Alcantara', 'Alcoy', 'Alegria', 'Aloguinsan', 'Argao',
    'Asturias', 'Badian', 'Balamban', 'Bantayan', 'Barili',
    'Bogo City', 'Boljoon', 'Borbon', 'Carmen', 'Catmon',
    'Compostela', 'Consolacion', 'Cordova', 'Daanbantayan',
    'Dalaguete', 'Dumanjug', 'Ginatilan', 'Liloan', 'Madridejos',
    'Malabuyoc', 'Medellin', 'Minglanilla', 'Moalboal', 'Oslob',
    'Pilar', 'Pinamungahan', 'Poro', 'Ronda', 'Samboan',
    'San Fernando', 'San Francisco', 'San Remigio', 'Santa Fe',
    'Santander', 'Sibonga', 'Sogod', 'Tabogon', 'Tabuelan',
    'Tuburan', 'Tudela',
  ],
  'davao-del-sur': [
    'Davao City', 'Bansalan', 'Digos City', 'Don Marcelino',
    'Hagonoy', 'Jose Abad Santos', 'Kiblawan', 'Magsaysay',
    'Malalag', 'Matanao', 'Padada', 'Santa Cruz', 'Sulop',
  ],
  'bulacan': [
    'Malolos City', 'Meycauayan City', 'San Jose del Monte City',
    'Angat', 'Balagtas', 'Baliuag', 'Bocaue', 'Bulakan',
    'Bustos', 'Calumpit', 'Doña Remedios Trinidad', 'Guiguinto',
    'Hagonoy', 'Marilao', 'Norzagaray', 'Obando', 'Pandi',
    'Paombong', 'Plaridel', 'Pulilan', 'San Ildefonso', 'San Miguel',
    'San Rafael', 'Santa Maria',
  ],
  'pampanga': [
    'Angeles City', 'San Fernando City', 'Apalit', 'Arayat', 'Bacolor',
    'Candaba', 'Floridablanca', 'Guagua', 'Lubao', 'Mabalacat City',
    'Macabebe', 'Magalang', 'Masantol', 'Mexico', 'Minalin',
    'Porac', 'San Luis', 'San Simon', 'Santa Ana', 'Santa Rita',
    'Santo Tomas', 'Sasmuan',
  ],
}

/**
 * Get cities/municipalities by province code.
 * Falls back to an empty array if the province isn't in the map.
 *
 * @param {string} provinceCode - The code from PHILIPPINES_PROVINCES (e.g., 'pangasinan')
 * @returns {string[]} Array of city/municipality names
 */
export function getCitiesByProvince(provinceCode) {
  if (!provinceCode) return []
  return CITIES_MAP[provinceCode.toLowerCase()] ?? []
}

// ── Urdaneta City barangays (target PESO area) ────────────────────────────
const URDANETA_BARANGAYS = [
  'Anonas', 'Apaya', 'Asingan', 'Ayala', 'Bacag', 'Bactad East',
  'Bactad Proper', 'Bayaoas', 'Bolaoen', 'Cabaruan', 'Cabuloaan',
  'Cagayan', 'Camantiles', 'Casantaan', 'Catablan', 'Cayambanan',
  'Consolacion', 'Dilan-Paurido', 'Labit Proper', 'Labit West',
  'Macarang', 'Malabago', 'Manaog', 'Mangsalut', 'Nancayasan',
  'Oltama', 'Palina East', 'Palina West', 'Pinmaludpod', 'Poblacion',
  'San Jose', 'San Vicente', 'Santa Lucia', 'Santo Domingo',
  'Sugcong', 'Tomeeng', 'Trinidad',
]

// Generic barangay names used for cities not in the specific map
const GENERIC_BARANGAYS = [
  'Poblacion', 'Barangay I', 'Barangay II', 'Barangay III',
  'Barangay IV', 'Barangay V', 'Barangay VI', 'Barangay VII',
  'Barangay VIII', 'Barangay IX', 'Barangay X',
  'Bagong Silang', 'Bagong Buhay', 'Bagong Pag-asa', 'Bagong Pagasa',
  'San Antonio', 'San Jose', 'San Juan', 'San Pedro', 'San Roque',
  'Santa Cruz', 'Santa Maria', 'Santo Niño', 'Santo Rosario',
  'Salvacion', 'Daang Bakal', 'Maligaya', 'Mabuhay',
]

const BARANGAYS_BY_CITY = {
  'Urdaneta City': URDANETA_BARANGAYS,
}

/**
 * Get barangays for a given city.
 * Returns Urdaneta City barangays if the city is Urdaneta,
 * otherwise returns the generic list.
 *
 * @param {string} cityName
 * @returns {string[]}
 */
export function getBarangaysByCity(cityName) {
  return BARANGAYS_BY_CITY[cityName] ?? GENERIC_BARANGAYS
}

// Default export for backward compatibility with existing imports
export const COMMON_BARANGAYS = [
  ...URDANETA_BARANGAYS,
  ...GENERIC_BARANGAYS.filter((b) => !URDANETA_BARANGAYS.includes(b)),
]

// Add at the bottom of src/constants/philippines.js

/**
 * Finds the province code by matching a name string.
 * Used by geoService to match Nominatim results back to
 * our dropdown values.
 *
 * @param {string} name - Province name from external source
 * @returns {string|null} - Province code or null if not found
 */
export function getProvinceCodeByName(name) {
  if (!name) return null
  const normalized = name.toLowerCase().trim()
  const match = PHILIPPINES_PROVINCES.find(
    (p) =>
      p.name.toLowerCase() === normalized ||
      p.code.toLowerCase() === normalized.replace(/\s+/g, '-')
  )
  return match?.code ?? null
}