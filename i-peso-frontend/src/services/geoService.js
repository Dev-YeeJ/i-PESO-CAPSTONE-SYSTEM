import apiClient from './api'
import {
  findProvinceByName,
  findCityByName,
  findBarangayByName,
} from './psgcServices'

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
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

export async function autocompleteAddress(text, coordinates = {}) {
  const response = await apiClient.get('/geo/autocomplete', {
    params: {
      text,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    },
  })

  return response.data.suggestions ?? []
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

  const province = location?.province_name
    ? await findProvinceByName(location.province_name)
    : null
  if (location?.province_name && !province) {
    warnings.push(`Province "${location.province_name}" was not matched. Please select it manually.`)
  }

  const city = province && location?.city_name
    ? await findCityByName(province.code, location.city_name)
    : null
  if (province && location?.city_name && !city) {
    warnings.push(`City "${location.city_name}" was not found in ${province.name}. Please select it manually.`)
  }

  const barangay = city && location?.barangay_name
    ? await findBarangayByName(city.code, location.barangay_name)
    : null
  if (city && location?.barangay_name && !barangay) {
    warnings.push(`Barangay "${location.barangay_name}" was not matched. Please select it manually.`)
  }

  if (accuracy !== null && accuracy > 500) {
    warnings.push(`GPS accuracy is low (+/-${accuracy}m). Please verify the detected address.`)
  }

  return {
    lat: location?.latitude ?? null,
    lng: location?.longitude ?? null,
    accuracy,
    placeId: location?.place_id ?? null,
    province,
    city,
    barangay,
    houseStreet: [location?.house_number, location?.street].filter(Boolean).join(' ') || location?.address_line1 || null,
    displayName: location?.formatted ?? '',
    warnings,
  }
}

export async function resolveAddressSuggestion(suggestion) {
  return matchPsgcLocation(suggestion)
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
