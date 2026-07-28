// Philippine Standard Geographic Code (PSGC) lookup — TypeScript port of the
// website's src/services/psgcServices.js, kept behaviorally identical so the
// two clients resolve the same free-text address to the same official code.
//
// Source: psgc.cloud — free, official PSA data. No API key required.
// This is a best-effort enrichment: mobile's address fields are plain free
// text (no cascading PSGC picker like the website), so we resolve codes from
// whatever the seeker already typed. A failed/partial match is expected and
// safe — address_*_code fields are nullable on the backend.

const BASE_URL = 'https://psgc.cloud/api'

interface PsgcEntry {
  code: string
  name: string
}

interface PsgcCity extends PsgcEntry {
  rawName: string
  isCity: boolean
}

const cache = new Map<string, unknown>()

function formatCityMunicipalityName(name: string) {
  const cleanName = String(name ?? '').trim()
  if (cleanName === '') return ''

  const cityMatch = cleanName.match(/^city of\s+(.+)$/i)
  if (cityMatch) return `${cityMatch[1].trim()} City`

  const municipalityMatch = cleanName.match(/^municipality of\s+(.+)$/i)
  if (municipalityMatch) return municipalityMatch[1].trim()

  return cleanName
}

function normalizePlaceName(name: string) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/^(city|municipality)\s+of\s+/i, '')
    .replace(/\s+city$/i, '')
    .replace(/[^a-z0-9]+/g, '')
}

function sanitizeAddress(str: string) {
  return str
    .toLowerCase()
    .replace(/^(barangay|brgy\.?|barrio)\s+/i, '')
    .replace(/\s+\(pob\.?|poblacion\)/i, '')
    .replace(/[^a-z0-9]/g, '')
}

function levenshteinDistance(a: string, b: string) {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
      }
    }
  }
  return matrix[b.length][a.length]
}

async function fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
  if (cache.has(cacheKey)) return cache.get(cacheKey) as T

  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`PSGC API error: ${response.status} — ${url}`)

  const data = (await response.json()) as T
  cache.set(cacheKey, data)
  return data
}

export async function getProvinces(): Promise<PsgcEntry[]> {
  const data = await fetchWithCache<PsgcEntry[]>(`${BASE_URL}/provinces`, 'provinces')
  return [...data].sort((a, b) => a.name.localeCompare(b.name))
}

export async function getCitiesByProvince(provinceCode: string): Promise<PsgcCity[]> {
  if (!provinceCode) return []
  const data = await fetchWithCache<Array<{ code: string; name: string }>>(
    `${BASE_URL}/provinces/${provinceCode}/cities-municipalities`,
    `cities:${provinceCode}`
  )
  return [...data]
    .map((item) => ({
      code: item.code,
      rawName: item.name,
      name: formatCityMunicipalityName(item.name),
      isCity: item.name.toLowerCase().includes('city'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getBarangaysByCity(cityCode: string): Promise<PsgcEntry[]> {
  if (!cityCode) return []
  const data = await fetchWithCache<PsgcEntry[]>(
    `${BASE_URL}/cities-municipalities/${cityCode}/barangays`,
    `barangays:${cityCode}`
  )
  return [...data].sort((a, b) => a.name.localeCompare(b.name))
}

export async function findProvinceByName(searchName: string): Promise<PsgcEntry | null> {
  if (!searchName) return null
  const provinces = await getProvinces()
  const normalized = searchName.toLowerCase().trim()

  const exact = provinces.find((p) => p.name.toLowerCase() === normalized)
  if (exact) return exact

  const contains = provinces.find(
    (p) => p.name.toLowerCase().includes(normalized) || normalized.includes(p.name.toLowerCase())
  )
  return contains ?? null
}

export async function findCityByName(provinceCode: string, searchName: string): Promise<PsgcCity | null> {
  if (!provinceCode || !searchName) return null
  const cities = await getCitiesByProvince(provinceCode)
  const normalized = normalizePlaceName(searchName)

  const exact = cities.find(
    (c) => normalizePlaceName(c.name) === normalized || normalizePlaceName(c.rawName) === normalized
  )
  if (exact) return exact

  const contains = cities.find(
    (c) =>
      normalizePlaceName(c.name).includes(normalized) ||
      normalized.includes(normalizePlaceName(c.name)) ||
      normalizePlaceName(c.rawName).includes(normalized) ||
      normalized.includes(normalizePlaceName(c.rawName))
  )
  return contains ?? null
}

export async function findBarangayByName(cityCode: string, searchName: string): Promise<PsgcEntry | null> {
  if (!cityCode || !searchName) return null
  const barangays = await getBarangaysByCity(cityCode)
  const searchClean = sanitizeAddress(searchName)

  const exactMatch = barangays.find((b) => {
    const bClean = sanitizeAddress(b.name)
    return bClean === searchClean || bClean.includes(searchClean) || searchClean.includes(bClean)
  })
  if (exactMatch) return exactMatch

  let bestMatch: PsgcEntry | null = null
  let lowestDistance = Infinity
  for (const b of barangays) {
    const distance = levenshteinDistance(searchClean, sanitizeAddress(b.name))
    if (distance < lowestDistance) {
      lowestDistance = distance
      bestMatch = b
    }
  }

  // Accept only close matches (1-2 character typos) to avoid matching the wrong barangay.
  if (bestMatch && lowestDistance <= 2) return bestMatch
  return null
}

export interface ResolvedPsgcCodes {
  address_province_code: string | null
  address_city_code: string | null
  address_barangay_code: string | null
}

/**
 * Best-effort: resolves free-text province/city/barangay to PSGC codes.
 * Each level only resolves if its parent resolved — returns whatever was
 * found, which may be partial. Never throws; callers should still wrap this
 * in their own try/catch since it does network I/O.
 */
export async function resolvePsgcCodes(address: {
  address_province: string
  address_municipality_city: string
  address_barangay: string
}): Promise<ResolvedPsgcCodes | null> {
  const province = await findProvinceByName(address.address_province)
  if (!province) return null

  const city = await findCityByName(province.code, address.address_municipality_city)
  if (!city) return { address_province_code: province.code, address_city_code: null, address_barangay_code: null }

  const barangay = await findBarangayByName(city.code, address.address_barangay)
  return {
    address_province_code: province.code,
    address_city_code: city.code,
    address_barangay_code: barangay?.code ?? null,
  }
}
