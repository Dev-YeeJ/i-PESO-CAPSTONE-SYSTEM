export const DEFAULT_MAP_CENTER = { lat: 15.9758, lng: 120.5707 }
export const GOOGLE_MAP_ID = import.meta.env?.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'

export function toMapPosition(latitude, longitude) {
  const isCoordinateValue = (value) => (
    typeof value === 'number'
    || (typeof value === 'string' && value.trim() !== '')
  )

  if (!isCoordinateValue(latitude) || !isCoordinateValue(longitude)) return null

  const lat = Number(latitude)
  const lng = Number(longitude)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  return { lat, lng }
}
