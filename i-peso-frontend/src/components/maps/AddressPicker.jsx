import React, { useState } from 'react'
import { LocateFixed, Loader2, MapPin } from 'lucide-react'
import PsgcCascade from '@/pages/employer/components/PsgcCascade'
import toast from 'react-hot-toast'

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

  const handleDetect = () => {
    setLocating(true)
    if (onDetectLocation) {
      onDetectLocation(() => setLocating(false))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          location_accuracy: Math.round(position.coords.accuracy),
        })
        toast.success('Location captured successfully!')
        setLocating(false)
      },
      (err) => {
        toast.error('Unable to capture location. Please ensure location permissions are granted.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
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
