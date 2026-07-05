import React, { useEffect, useRef, useState } from 'react'
import { APIProvider, Map, Marker as GoogleMarker } from '@vis.gl/react-google-maps'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker as LeafletMarker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Navigation } from 'lucide-react'
import { DEFAULT_MAP_CENTER, GOOGLE_MAP_ID, toMapPosition } from '@/utils/mapCoordinates'

const leafletPinIcon = L.divIcon({
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  html: '<span style="display:block;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#2563eb;border:3px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,.35)"><i style="display:block;width:7px;height:7px;margin:8px auto 0;border-radius:999px;background:#fff"></i></span>',
})

function LeafletMapUpdater({ position }) {
  const map = useMap()

  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom())
  }, [map, position.lat, position.lng])

  return null
}

function LeafletClickHandler({ onChange }) {
  useMapEvents({
    click(event) {
      const position = toMapPosition(event.latlng.lat, event.latlng.lng)
      if (position) onChange({ latitude: position.lat, longitude: position.lng })
    },
  })

  return null
}

export default function MapPinPicker({
  latitude,
  longitude,
  onChange,
  defaultCenter = DEFAULT_MAP_CENTER,
}) {
  const containerRef = useRef(null)
  const [googleFailed, setGoogleFailed] = useState(false)
  const fallbackPosition = toMapPosition(defaultCenter?.lat, defaultCenter?.lng) ?? DEFAULT_MAP_CENTER
  const position = toMapPosition(latitude, longitude) ?? fallbackPosition
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY
  const preferredProvider = import.meta.env.VITE_JOB_MAP_PROVIDER?.toLowerCase()
  const useLeaflet = preferredProvider === 'leaflet' || !googleKey || googleFailed

  useEffect(() => {
    if (useLeaflet) return undefined

    const previousAuthFailure = window.gm_authFailure
    const handleAuthFailure = () => {
      setGoogleFailed(true)
      if (typeof previousAuthFailure === 'function') previousAuthFailure()
    }

    window.gm_authFailure = handleAuthFailure
    return () => {
      if (window.gm_authFailure === handleAuthFailure) window.gm_authFailure = previousAuthFailure
    }
  }, [useLeaflet])

  useEffect(() => {
    if (useLeaflet || !containerRef.current) return undefined

    const detectGoogleError = () => {
      if (containerRef.current?.querySelector('.gm-err-container, .gm-err-message')) setGoogleFailed(true)
    }
    const observer = new MutationObserver(detectGoogleError)
    observer.observe(containerRef.current, { childList: true, subtree: true })
    detectGoogleError()
    return () => observer.disconnect()
  }, [useLeaflet])
    
  const handleDragEnd = (e) => {
    if (e.latLng) {
      const latlng = toMapPosition(e.latLng.lat(), e.latLng.lng())
      if (!latlng) return
      onChange({ latitude: latlng.lat, longitude: latlng.lng })
    }
  }

  const handleMapClick = (e) => {
    if (e.detail.latLng) {
      const latlng = toMapPosition(e.detail.latLng.lat, e.detail.latLng.lng)
      if (!latlng) return
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
      <div ref={containerRef} className="h-64 w-full relative z-0">
        {useLeaflet ? (
          <MapContainer center={[position.lat, position.lng]} zoom={15} className="h-full w-full" attributionControl>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LeafletMapUpdater position={position} />
            <LeafletClickHandler onChange={onChange} />
            <LeafletMarker
              position={[position.lat, position.lng]}
              icon={leafletPinIcon}
              draggable
              eventHandlers={{
                dragend(event) {
                  const latlng = event.target.getLatLng()
                  const nextPosition = toMapPosition(latlng.lat, latlng.lng)
                  if (nextPosition) onChange({ latitude: nextPosition.lat, longitude: nextPosition.lng })
                },
              }}
            />
          </MapContainer>
        ) : (
          <APIProvider version="quarterly" apiKey={googleKey} onError={() => setGoogleFailed(true)}>
            <Map
              defaultZoom={15}
              defaultCenter={position}
              onClick={handleMapClick}
              mapId={GOOGLE_MAP_ID}
              disableDefaultUI={false}
            >
              <GoogleMarker
                position={position}
                draggable={true}
                onDragEnd={handleDragEnd}
                title="Selected location"
              />
            </Map>
          </APIProvider>
        )}
      </div>
    </div>
  )
}
