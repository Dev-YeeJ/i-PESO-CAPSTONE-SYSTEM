import { useEffect, useRef, useState } from 'react'
import { LocateFixed, Loader2, MapPin } from 'lucide-react'
import PsgcCascade from '@/pages/employer/components/PsgcCascade'
import toast from 'react-hot-toast'
import { detectAddress, resolveCoordinatesAddress } from '@/services/geoService'
import { MapContainer, Marker as LeafletMarker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const leafletPinIcon = L.divIcon({
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  html: '<span style="display:block;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.3)"></span>',
})

const FIELD_LABELS = {
  province: 'Province',
  city: 'City/Municipality',
  barangay: 'Barangay',
  houseStreet: 'Specific Address',
}

/** Recenters the map only when told to (a GPS fix, a picked PSGC address) — never on a drag/click the user just made on the visible map themselves. */
function MapRecenter({ latitude, longitude, signal }) {
  const map = useMap()

  useEffect(() => {
    if (latitude == null || longitude == null) return
    map.setView([latitude, longitude], Math.max(map.getZoom(), 16))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal])

  return null
}

function MapClickToPlace({ onPlace }) {
  useMapEvents({
    click: (event) => onPlace(event.latlng.lat, event.latlng.lng),
  })

  return null
}

export default function AddressPicker({
  title = "Address & Location",
  province,
  provinceCode,
  city,
  cityCode,
  barangay,
  barangayCode,
  street,
  latitude,
  longitude,
  location_accuracy,
  google_place_id,
  onChange,
  onDetectLocation,
  showDetectButton = true,
}) {
  const [locating, setLocating] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [detectionMessage, setDetectionMessage] = useState('')
  const [recenterSignal, setRecenterSignal] = useState(0)
  // Guards against a slower, earlier reverse-geocode overwriting a faster,
  // later one if the pin gets dragged again before the first lookup returns.
  const requestIdRef = useRef(0)

  const describeMissingFields = (missingFields) =>
    missingFields.map((field) => FIELD_LABELS[field] ?? field).join(', ')

  /**
   * Reverse-geocodes a map coordinate and fills the province/city/barangay/
   * street fields from it — the same PSGC-matching logic "Use current
   * location" already relies on (resolveCoordinatesAddress), just fed a pin
   * position instead of the device's GPS fix.
   */
  const applyPinLocation = async (lat, lng) => {
    const requestId = ++requestIdRef.current
    setResolving(true)
    setDetectionMessage('')
    try {
      const result = await resolveCoordinatesAddress(lat, lng)
      if (requestId !== requestIdRef.current) return // superseded by a newer drag/click

      onChange({
        province: result.province?.name ?? province,
        province_code: result.province?.code ?? provinceCode,
        city: result.city?.name ?? city,
        city_code: result.city?.code ?? cityCode,
        barangay: result.barangay?.name ?? barangay,
        barangay_code: result.barangay?.code ?? barangayCode,
        street: result.houseStreet ?? street,
        latitude: result.lat ?? lat,
        longitude: result.lng ?? lng,
        location_accuracy: result.accuracy,
        google_place_id: result.placeId,
      })

      if (result.isComplete) {
        setDetectionMessage('Address fields updated from the pin location. Please verify the details.')
      } else {
        setDetectionMessage(`Pin moved. Please complete: ${describeMissingFields(result.missingFields)}.`)
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return
      const message = error.message ?? 'Unable to determine an address for this pin location.'
      setDetectionMessage(message)
      toast.error(message)
    } finally {
      if (requestId === requestIdRef.current) setResolving(false)
    }
  }

  /** Moves the pin immediately (so it never visually snaps back while the address lookup below is still in flight) and kicks off that lookup. */
  const movePin = (lat, lng) => {
    onChange({
      province, province_code: provinceCode, city, city_code: cityCode,
      barangay, barangay_code: barangayCode, street, location_accuracy, google_place_id,
      latitude: lat, longitude: lng,
    })
    applyPinLocation(lat, lng)
  }

  const handleDetect = async () => {
    setLocating(true)
    setDetectionMessage('')
    if (onDetectLocation) {
      onDetectLocation(() => setLocating(false))
      return
    }

    try {
      const result = await detectAddress()
      requestIdRef.current += 1 // supersede any in-flight pin-drag lookup
      const nextLocation = {
        province: result.province?.name ?? province,
        province_code: result.province?.code ?? provinceCode,
        city: result.city?.name ?? city,
        city_code: result.city?.code ?? cityCode,
        barangay: result.barangay?.name ?? barangay,
        barangay_code: result.barangay?.code ?? barangayCode,
        street: result.houseStreet ?? street,
        latitude: result.lat,
        longitude: result.lng,
        location_accuracy: result.accuracy,
        google_place_id: result.placeId,
      }
      onChange(nextLocation)
      setRecenterSignal((tick) => tick + 1)

      if (result.isComplete) {
        setDetectionMessage('Address fields were filled from your current location. Please verify the details.')
        toast.success('Address detected and filled automatically.')
      } else {
        setDetectionMessage(`Location detected. Please complete: ${describeMissingFields(result.missingFields)}.`)
        toast.success('Location detected. Complete the remaining address fields.')
      }
    } catch (error) {
      const message = error.message ?? 'Unable to detect and fill the address.'
      setDetectionMessage(message)
      toast.error(message)
    } finally {
      setLocating(false)
    }
  }

  const handlePsgcChange = async (data) => {
    // 1. Immediately pass the text address to parent
    onChange(data)

    // 2. Silently geocode the selected address to auto-fill latitude/longitude
    if (data.city && data.province) {
      try {
        const query = `${data.barangay ? data.barangay + ', ' : ''}${data.city}, ${data.province}, Philippines`
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
        if (res.ok) {
          const results = await res.json()
          if (results && results.length > 0) {
            requestIdRef.current += 1 // supersede any in-flight pin-drag lookup
            onChange({
              ...data, // Keep the text address
              latitude: results[0].lat,
              longitude: results[0].lon,
              location_accuracy: 1000 // Approximate geocoded accuracy
            })
            setRecenterSignal((tick) => tick + 1)
          }
        }
      } catch (err) {
        console.error('Auto-geocoding failed:', err)
      }
    }
  }

  const hasCoordinates = latitude != null && longitude != null

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-700" />
          <p className="text-sm font-black text-slate-900">{title}</p>
        </div>
        {showDetectButton && (
          <button
            type="button"
            disabled={locating}
            onClick={handleDetect}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
            Use current location
          </button>
        )}
      </div>

      {hasCoordinates && (
        <div className="mb-4 flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
          <LocateFixed className="h-4 w-4" />
          <span>Location saved. Drag the pin (or click elsewhere on the map) to fine-tune — the address fields below update automatically.</span>
        </div>
      )}

      {detectionMessage && (
        <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
          {detectionMessage}
        </p>
      )}

      <PsgcCascade
        province={province}
        provinceCode={provinceCode}
        city={city}
        cityCode={cityCode}
        barangay={barangay}
        barangayCode={barangayCode}
        onChange={handlePsgcChange}
      />
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Specific Address (House No. / Street / Purok)
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={street || ''}
            onChange={(e) => onChange({
              province,
              province_code: provinceCode,
              city,
              city_code: cityCode,
              barangay,
              barangay_code: barangayCode,
              latitude,
              longitude,
              location_accuracy,
              google_place_id,
              street: e.target.value
            })}
            placeholder="e.g. 123 Main St."
          />
        </div>
        {hasCoordinates && (
          <div className="relative mt-4 h-64 w-full rounded-xl overflow-hidden border border-slate-300 z-0">
            <MapContainer center={[latitude, longitude]} zoom={16} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapRecenter latitude={latitude} longitude={longitude} signal={recenterSignal} />
              <MapClickToPlace onPlace={movePin} />
              <LeafletMarker
                position={[latitude, longitude]}
                icon={leafletPinIcon}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng()
                    movePin(lat, lng)
                  },
                }}
              />
            </MapContainer>
            {resolving && (
              <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Detecting address…
                </span>
              </div>
            )}
          </div>
        )}
    </div>
  )
}
