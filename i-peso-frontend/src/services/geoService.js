// src/services/geoService.js
// GPS detection + Nominatim reverse geocoding
// Matched against real PSGC data instead of hardcoded arrays

import {
  findProvinceByName,
  findCityByName,
  findBarangayByName,
} from './psgcServices'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'

// ── Geolocation ───────────────────────────────────────────────────────────

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('Your browser does not support location detection.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat      : pos.coords.latitude,
        lng      : pos.coords.longitude,
        accuracy : Math.round(pos.coords.accuracy),
      }),
      (err) => {
        const msgs = {
          1: 'Location access was denied. Please allow it in your browser settings and try again.',
          2: 'Your location could not be determined. Please try again or enter your address manually.',
          3: 'Location request timed out. Please try again.',
        }
        reject(msgs[err.code] ?? 'Unable to get your location.')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    )
  })
}

// ── Nominatim Reverse Geocoding ───────────────────────────────────────────

async function reverseGeocode(lat, lng) {
  const params = new URLSearchParams({
    lat           : lat.toString(),
    lon           : lng.toString(),
    format        : 'json',
    addressdetails: '1',
    zoom          : '18',
    countrycodes  : 'ph',
  })

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      'User-Agent'     : 'iPESO-Capstone/1.0 (Urdaneta City PESO)',
      'Accept-Language': 'en',
    },
  })

  if (!res.ok) throw new Error('Address lookup service unavailable.')

  const data = await res.json()
  if (!data?.address) throw new Error('Could not determine address from GPS coordinates.')

  const addr = data.address

  return {
    provinceName : addr.state ?? addr.region ?? null,
    cityName     : addr.city ?? addr.town ?? addr.municipality ?? addr.county ?? null,
    barangayName : addr.village ?? addr.suburb ?? addr.neighbourhood ?? addr.hamlet ?? null,
    road         : addr.road ?? addr.pedestrian ?? null,
    houseNumber  : addr.house_number ?? null,
    displayName  : data.display_name ?? '',
  }
}

// ── Main Export ───────────────────────────────────────────────────────────

/**
 * Full GPS + reverse geocode + PSGC matching pipeline.
 *
 * Returns PSGC codes (not just names) so the cascading
 * dropdowns can select the correct options.
 *
 * @returns {Promise<{
 *   lat: number, lng: number, accuracy: number,
 *   province: { code, name }|null,
 *   city:     { code, name }|null,
 *   barangay: { code, name }|null,
 *   houseStreet: string|null,
 *   displayName: string,
 *   warnings: string[],
 * }>}
 */
export async function detectAddress() {
  const warnings = []

  // ── Step 1: Get coordinates ──────────────────────────────────────────
  const { lat, lng, accuracy } = await getCurrentPosition()

  // ── Step 2: Reverse geocode ──────────────────────────────────────────
  const geo = await reverseGeocode(lat, lng)

  // ── Step 3: Match against PSGC data ──────────────────────────────────

  // Province
  let province = null
  if (geo.provinceName) {
    province = await findProvinceByName(geo.provinceName)
    if (!province) {
      warnings.push(`Province "${geo.provinceName}" not matched — please select manually.`)
    }
  }

  // City (only if province was matched)
  let city = null
  if (province && geo.cityName) {
    city = await findCityByName(province.code, geo.cityName)
    if (!city) {
      warnings.push(`City "${geo.cityName}" not found in ${province.name} — please select manually.`)
    }
  }

  // Barangay (only if city was matched)
  let barangay = null
  if (city && geo.barangayName) {
    barangay = await findBarangayByName(city.code, geo.barangayName)
    if (!barangay) {
      warnings.push(`Barangay "${geo.barangayName}" not found — please select manually.`)
    }
  }

  // Low accuracy warning
  if (accuracy > 500) {
    warnings.push(`GPS accuracy is low (±${accuracy}m). Barangay detection may be incorrect — please verify.`)
  }

  // House / Street
  const houseStreet = [geo.houseNumber, geo.road].filter(Boolean).join(' ') || null

  return {
    lat, lng, accuracy,
    province, city, barangay,
    houseStreet,
    displayName: geo.displayName,
    warnings,
  }
}