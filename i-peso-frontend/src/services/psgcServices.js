// src/services/psgcService.js
// ============================================================
// Philippine Standard Geographic Code (PSGC) API Service
//
// Source: psgc.cloud — Free, official PSA data
// Covers: All 81 provinces, 1,647 cities/municipalities,
//         42,000+ barangays
//
// Strategy: In-memory cache so each list is only fetched once
//           per browser session. No API key required.
//           Includes Levenshtein distance for fuzzy matching GPS data.
// ============================================================

const BASE_URL = 'https://psgc.cloud/api'

// ── In-memory cache ──────────────────────────────────────────────────────
// Keyed by: 'provinces' | 'cities:{provinceCode}' | 'barangays:{cityCode}'
const cache = new Map()

function formatCityMunicipalityName(name) {
  const cleanName = String(name ?? '').trim()
  if (cleanName === '') return ''

  const cityMatch = cleanName.match(/^city of\s+(.+)$/i)
  if (cityMatch) {
    return `${cityMatch[1].trim()} City`
  }

  const municipalityMatch = cleanName.match(/^municipality of\s+(.+)$/i)
  if (municipalityMatch) {
    return municipalityMatch[1].trim()
  }

  return cleanName
}

function normalizePlaceName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/^(city|municipality)\s+of\s+/i, '')
    .replace(/\s+city$/i, '')
    .replace(/[^a-z0-9]+/g, '')
}

// ── Fetch with cache ─────────────────────────────────────────────────────
async function fetchWithCache(url, cacheKey) {
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`PSGC API error: ${response.status} — ${url}`)
  }

  const data = await response.json()
  cache.set(cacheKey, data)
  return data
}

// ── PUBLIC API ────────────────────────────────────────────────────────────

/**
 * Fetches all Philippine provinces.
 * Sorted alphabetically by name.
 *
 * @returns {Promise<Array<{ code: string, name: string }>>}
 */
export async function getProvinces() {
  const data = await fetchWithCache(
    `${BASE_URL}/provinces`,
    'provinces'
  )
  return [...data].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Fetches all cities and municipalities within a province.
 *
 * @param {string} provinceCode - PSGC province code (e.g., "0128000000")
 * @returns {Promise<Array<{ code: string, name: string, isCity: boolean }>>}
 */
export async function getCitiesByProvince(provinceCode) {
  if (!provinceCode) return []

  const data = await fetchWithCache(
    `${BASE_URL}/provinces/${provinceCode}/cities-municipalities`,
    `cities:${provinceCode}`
  )

  return [...data]
    .map((item) => ({
      code   : item.code,
      rawName: item.name,
      name   : formatCityMunicipalityName(item.name),
      isCity : item.name.toLowerCase().includes('city'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Fetches all barangays within a city or municipality.
 *
 * @param {string} cityCode - PSGC city/municipality code
 * @returns {Promise<Array<{ code: string, name: string }>>}
 */
export async function getBarangaysByCity(cityCode) {
  if (!cityCode) return []

  const data = await fetchWithCache(
    `${BASE_URL}/cities-municipalities/${cityCode}/barangays`,
    `barangays:${cityCode}`
  )

  return [...data].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Searches all provinces for a name match.
 * Used by GPS detection to match Nominatim results.
 *
 * @param {string} searchName - Province name to search for
 * @returns {Promise<{ code: string, name: string }|null>}
 */
export async function findProvinceByName(searchName) {
  if (!searchName) return null

  const provinces  = await getProvinces()
  const normalized = searchName.toLowerCase().trim()

  // 1. Exact match
  const exact = provinces.find(
    (p) => p.name.toLowerCase() === normalized
  )
  if (exact) return exact

  // 2. Contains match
  const contains = provinces.find(
    (p) =>
      p.name.toLowerCase().includes(normalized) ||
      normalized.includes(p.name.toLowerCase())
  )
  return contains ?? null
}

/**
 * Searches cities within a province for a name match.
 * Used by GPS detection to match Nominatim results.
 *
 * @param {string} provinceCode
 * @param {string} searchName - City name to search for
 * @returns {Promise<{ code: string, name: string }|null>}
 */
export async function findCityByName(provinceCode, searchName) {
  if (!provinceCode || !searchName) return null

  const cities     = await getCitiesByProvince(provinceCode)
  const normalized = normalizePlaceName(searchName)

  // 1. Exact match
  const exact = cities.find(
    (c) => normalizePlaceName(c.name) === normalized
      || normalizePlaceName(c.rawName) === normalized
  )
  if (exact) return exact

  // 2. Contains match (handles "City of Urdaneta" vs "Urdaneta City")
  const contains = cities.find(
    (c) =>
      normalizePlaceName(c.name).includes(normalized) ||
      normalized.includes(normalizePlaceName(c.name)) ||
      normalizePlaceName(c.rawName).includes(normalized) ||
      normalized.includes(normalizePlaceName(c.rawName))
  )
  return contains ?? null
}

/**
 * Clears the in-memory cache.
 * Call this if you need to force a data refresh.
 */
export function clearCache() {
  cache.clear()
}


// ── HELPER: Levenshtein Distance (Fuzzy Matcher) ──────────────────────────
// Calculates how many typos/differences exist between two strings
function getLevenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion/deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// ── HELPER: Address Sanitizer ─────────────────────────────────────────────
// Strips out "Brgy", "Barangay", "Pob.", spaces, and special characters
function sanitizeAddress(str) {
  return str.toLowerCase()
    .replace(/^(barangay|brgy\.?|barrio)\s+/i, '')
    .replace(/\s+\(pob\.?|poblacion\)/i, '')
    .replace(/[^a-z0-9]/g, ''); // Remove all spaces and punctuation
}

/**
 * Searches barangays within a city for a name match.
 * UPGRADED: Now uses text sanitization and Fuzzy Typo Matching.
 *
 * @param {string} cityCode
 * @param {string} searchName - Barangay name to search for
 * @returns {Promise<{ code: string, name: string }|null>}
 */
export async function findBarangayByName(cityCode, searchName) {
  if (!cityCode || !searchName) return null

  const barangays  = await getBarangaysByCity(cityCode)
  const searchClean = sanitizeAddress(searchName)

  // 1. Strict Sanitized Match (Handles "Brgy. Mabanogbog" vs "Mabanogbog")
  let exactMatch = barangays.find((b) => {
    const bClean = sanitizeAddress(b.name);
    return bClean === searchClean || bClean.includes(searchClean) || searchClean.includes(bClean);
  });
  
  if (exactMatch) return exactMatch;

  // 2. Fuzzy Match (Handles Typos like "Mabanognog" vs "Mabanogbog")
  let bestMatch = null;
  let lowestDistance = Infinity;

  for (const b of barangays) {
    const bClean = sanitizeAddress(b.name);
    const distance = getLevenshteinDistance(searchClean, bClean);
    
    if (distance < lowestDistance) {
      lowestDistance = distance;
      bestMatch = b;
    }
  }

  // If the word is very similar (e.g., 1 or 2 letters off), accept it as a match!
  // We use 2 as the threshold to prevent matching completely wrong barangays.
  if (lowestDistance <= 2) {
    console.log(`Fuzzy Matched: "${searchName}" to official PSGC "${bestMatch.name}" (Typo distance: ${lowestDistance})`);
    return bestMatch;
  }

  return null
}
