import apiClient from './api'
import {
  findProvinceByName,
  findCityByName,
  findBarangayByName,
} from './psgcServices'

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(new Error('Current location requires HTTPS or localhost.'))
      return
    }

    if (!navigator.geolocation) {
      reject(new Error('Your browser does not support location detection.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy),
      }),
      (error) => {
        const messages = {
          1: 'Location access was denied. Allow location access in your browser settings and try again.',
          2: 'Your location could not be determined. Make sure device location is enabled.',
          3: 'Location detection timed out. Move to an open area and try again.',
        }
        reject(new Error(messages[error.code] ?? 'Unable to get your location.'))
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    )
  })
}

export async function autocompleteAddress(text, coordinates = {}, sessionToken = null) {
  const response = await apiClient.get('/geo/autocomplete', {
    params: {
      text,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      session_token: sessionToken,
    },
  })

  return response.data.suggestions ?? []
}

export async function getPlaceAddress(placeId, sessionToken = null) {
  const response = await apiClient.get(`/geo/place/${encodeURIComponent(placeId)}`, {
    params: { session_token: sessionToken },
  })

  return response.data.location
}

export async function geocodeAddress(address) {
  const response = await apiClient.get('/geo/geocode', {
    params: { address },
  })

  return response.data.location
}

export async function reverseGeocode(latitude, longitude) {
  const response = await apiClient.get('/geo/reverse', {
    params: { latitude, longitude },
  })

  return response.data.location
}

async function matchPsgcLocation(location, accuracy = null) {
  const warnings = []
  const components = location?.address_components ?? location?.addressComponents ?? []
  const componentNames = (...types) => components
    .filter((component) => types.some((type) => component.types?.includes(type)))
    .map((component) => component.long_name ?? component.longText)
    .filter(Boolean)
  const uniqueNames = (...groups) => [
    ...new Set(
      groups
        .flat()
        .map((name) => String(name ?? '').trim())
        .filter(Boolean)
    ),
  ]
  const formattedParts = String(location?.formatted ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  const firstPsgcMatch = async (candidates, matcher) => {
    for (const candidate of candidates) {
      const match = await matcher(candidate)
      if (match) return { match, sourceName: candidate }
    }

    return { match: null, sourceName: candidates[0] ?? null }
  }

  const provinceCandidates = uniqueNames(
    location?.province_name,
    componentNames('administrative_area_level_1', 'administrative_area_level_2'),
    formattedParts
  )
  const provinceResult = await firstPsgcMatch(provinceCandidates, findProvinceByName)
  const province = provinceResult.match
  const provinceName = provinceResult.sourceName
  if (provinceName && !province) {
    warnings.push(`Province "${provinceName}" was not matched. Please select it manually.`)
  }

  const cityCandidates = uniqueNames(
    location?.city_name,
    componentNames(
      'locality',
      'postal_town',
      'administrative_area_level_3',
      'administrative_area_level_2'
    ),
    formattedParts
  )
  const cityResult = province
    ? await firstPsgcMatch(
        cityCandidates,
        (candidate) => findCityByName(province.code, candidate)
      )
    : { match: null, sourceName: cityCandidates[0] ?? null }
  const city = cityResult.match
  const cityName = cityResult.sourceName
  if (province && cityName && !city) {
    warnings.push(`City "${cityName}" was not found in ${province.name}. Please select it manually.`)
  }

  const barangayCandidates = uniqueNames(
    location?.barangay_name,
    componentNames(
      'neighborhood',
      'sublocality_level_1',
      'sublocality',
      'administrative_area_level_4'
    )
  )
  const barangayResult = city
    ? await firstPsgcMatch(
        barangayCandidates,
        (candidate) => findBarangayByName(city.code, candidate)
      )
    : { match: null, sourceName: barangayCandidates[0] ?? null }
  const barangay = barangayResult.match
  const barangayName = barangayResult.sourceName
  if (city && barangayName && !barangay) {
    warnings.push(`Barangay "${barangayName}" was not matched. Please select it manually.`)
  }

  if (accuracy !== null && accuracy > 500) {
    warnings.push(`GPS accuracy is low (+/-${accuracy}m). Please verify the detected address.`)
  }

  const houseStreet = [
    location?.house_number,
    location?.street,
  ].filter(Boolean).join(' ') || location?.address_line1 || null
  const missingFields = [
    !province && 'province',
    !city && 'city',
    !barangay && 'barangay',
    !houseStreet && 'houseStreet',
  ].filter(Boolean)

  return {
    lat: location?.latitude ?? null,
    lng: location?.longitude ?? null,
    accuracy,
    placeId: location?.place_id ?? null,
    provinceName,
    cityName,
    barangayName,
    province,
    city,
    barangay,
    houseStreet,
    displayName: location?.formatted ?? '',
    missingFields,
    isComplete: missingFields.length === 0,
    warnings,
  }
}

export async function resolveAddressSuggestion(suggestion, sessionToken = null) {
  const location = suggestion?.latitude != null && suggestion?.longitude != null
    ? suggestion
    : await getPlaceAddress(suggestion.place_id, sessionToken)

  return matchPsgcLocation(location)
}

export async function detectAddress() {
  const { lat, lng, accuracy } = await getCurrentPosition()
  const location = await reverseGeocode(lat, lng)

  if (!location) {
    throw new Error('Could not determine an address from your GPS location.')
  }

  return matchPsgcLocation(location, accuracy)
}

export async function calculateRouteDistance(origin, destination, mode = 'drive') {
  const response = await apiClient.post('/geo/route', {
    origin_latitude: origin.latitude,
    origin_longitude: origin.longitude,
    destination_latitude: destination.latitude,
    destination_longitude: destination.longitude,
    mode,
  })

  return response.data.route
}

export async function calculateRouteMatrix(sources, targets, mode = 'drive') {
  const response = await apiClient.post('/geo/matrix', {
    sources,
    targets,
    mode,
  })

  return response.data.matrix
}

export function calculateStraightLineDistance(origin, destination) {
  const earthRadiusKilometers = 6371
  const toRadians = (degrees) => degrees * (Math.PI / 180)
  const latitudeDelta = toRadians(destination.latitude - origin.latitude)
  const longitudeDelta = toRadians(destination.longitude - origin.longitude)
  const originLatitude = toRadians(origin.latitude)
  const destinationLatitude = toRadians(destination.latitude)

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude)
    * Math.cos(destinationLatitude)
    * Math.sin(longitudeDelta / 2) ** 2

  return earthRadiusKilometers * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}
