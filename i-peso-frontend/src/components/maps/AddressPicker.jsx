import React, { useState } from 'react'
import { LocateFixed, Loader2, MapPin } from 'lucide-react'
import PsgcCascade from '@/pages/employer/components/PsgcCascade'
import toast from 'react-hot-toast'
import { detectAddress } from '@/services/geoService'

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
  const [detectionMessage, setDetectionMessage] = useState('')

  const handleDetect = async () => {
    setLocating(true)
    setDetectionMessage('')
    if (onDetectLocation) {
      onDetectLocation(() => setLocating(false))
      return
    }

    try {
      const result = await detectAddress()
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

      if (result.isComplete) {
        setDetectionMessage('Address fields were filled from your current location. Please verify the details.')
        toast.success('Address detected and filled automatically.')
      } else {
        const missing = result.missingFields.map((field) => ({
          province: 'Province',
          city: 'City/Municipality',
          barangay: 'Barangay',
          houseStreet: 'Specific Address',
        }[field] ?? field))
        setDetectionMessage(`Location detected. Please complete: ${missing.join(', ')}.`)
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
            onChange({
              ...data, // Keep the text address
              latitude: results[0].lat,
              longitude: results[0].lon,
              location_accuracy: 1000 // Approximate geocoded accuracy
            })
          }
        }
      } catch (err) {
        console.error('Auto-geocoding failed:', err)
      }
    }
  }

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
            Detect Current Location
          </button>
        )}
      </div>

      {(latitude && longitude) && (
        <div className="mb-4 flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
          <LocateFixed className="h-4 w-4" />
          <span>GPS Location saved. Ready for map display.</span>
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
    </div>
  )
}
