import React, { useState, useEffect } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { Navigation } from 'lucide-react'

export default function MapPinPicker({
  latitude,
  longitude,
  onChange,
  defaultCenter = { lat: 15.9758, lng: 120.5707 }, // Urdaneta City
}) {
  const position = (latitude && longitude) ? { lat: Number(latitude), lng: Number(longitude) } : defaultCenter
  const [markerPosition, setMarkerPosition] = useState(position)

  useEffect(() => {
    if (latitude && longitude) {
      setMarkerPosition({ lat: Number(latitude), lng: Number(longitude) })
    }
  }, [latitude, longitude])

  const handleDragEnd = (e) => {
    if (e.latLng) {
      const latlng = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      setMarkerPosition(latlng)
      onChange({ latitude: latlng.lat, longitude: latlng.lng })
    }
  }

  const handleMapClick = (e) => {
    if (e.detail.latLng) {
      const latlng = e.detail.latLng
      setMarkerPosition(latlng)
      onChange({ latitude: latlng.lat, longitude: latlng.lng })
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="bg-slate-50 p-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-blue-700" />
          <p className="text-sm font-black text-slate-900">Pin Location on Map</p>
        </div>
        <p className="text-xs text-slate-500 mt-1">Click or drag the pin to set your exact location.</p>
      </div>
      <div className="h-64 w-full relative z-0">
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY}>
          <Map
            defaultZoom={15}
            defaultCenter={position}
            onClick={handleMapClick}
            mapId="map-pin-picker"
            disableDefaultUI={false}
          >
            <AdvancedMarker 
              position={markerPosition} 
              draggable={true}
              onDragEnd={handleDragEnd}
            >
              <Pin background="#ef4444" borderColor="#991b1b" glyphColor="#fff" />
            </AdvancedMarker>
          </Map>
        </APIProvider>
      </div>
    </div>
  )
}
