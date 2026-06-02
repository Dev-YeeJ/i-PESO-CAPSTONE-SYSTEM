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
// ============================================================

const BASE_URL = 'https://psgc.cloud/api'

// ── In-memory cache ──────────────────────────────────────────────────────
// Keyed by: 'provinces' | 'cities:{provinceCode}' | 'barangays:{cityCode}'
const cache = new Map()

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
      name   : item.name,
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
  const normalized = searchName.toLowerCase().trim()

  // 1. Exact match
  const exact = cities.find(
    (c) => c.name.toLowerCase() === normalized
  )
  if (exact) return exact

  // 2. Contains match (handles "City of Urdaneta" vs "Urdaneta City")
  const contains = cities.find(
    (c) =>
      c.name.toLowerCase().includes(normalized) ||
      normalized.includes(c.name.toLowerCase())
  )
  return contains ?? null
}

/**
 * Searches barangays within a city for a name match.
 * Used by GPS detection to match Nominatim results.
 *
 * @param {string} cityCode
 * @param {string} searchName - Barangay name to search for
 * @returns {Promise<{ code: string, name: string }|null>}
 */
export async function findBarangayByName(cityCode, searchName) {
  if (!cityCode || !searchName) return null

  const barangays  = await getBarangaysByCity(cityCode)
  const normalized = searchName.toLowerCase().trim()

  // 1. Exact match
  const exact = barangays.find(
    (b) => b.name.toLowerCase() === normalized
  )
  if (exact) return exact

  // 2. Contains match
  const contains = barangays.find(
    (b) =>
      b.name.toLowerCase().includes(normalized) ||
      normalized.includes(b.name.toLowerCase())
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