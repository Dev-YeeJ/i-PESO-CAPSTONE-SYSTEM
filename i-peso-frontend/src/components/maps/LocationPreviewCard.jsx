import React, { useEffect, useRef, useState } from 'react'
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps'
import { MapContainer, Marker as LeafletMarker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Map as MapIcon, ExternalLink, AlertTriangle } from 'lucide-react'
import { GOOGLE_MAP_ID, toMapPosition } from '@/utils/mapCoordinates'

const leafletPinIcon = L.divIcon({
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  html: '<span style="display:block;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.3)"></span>',
})

export default function LocationPreviewCard({
  title = "Saved Location",
  fullAddress,
  latitude,
  longitude,
  onUpdateClick,
  isAdmin = false,
  verified = false,
}) {
  const containerRef = useRef(null)
  const [googleFailed, setGoogleFailed] = useState(false)
  const position = toMapPosition(latitude, longitude)
  const hasCoordinates = position !== null
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY
  const preferredProvider = import.meta.env.VITE_JOB_MAP_PROVIDER?.toLowerCase()
  const useLeaflet = preferredProvider === 'leaflet' || !googleKey || googleFailed
  const mapUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : (fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : null)

  // Same resilience MapPinPicker/JobVacancyMap already have: a misconfigured
  // or referrer-restricted key renders Google's own error UI inside the map
  // container rather than throwing, so it has to be caught by watching for it.
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <MapIcon className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
        </div>
        {onUpdateClick && (
          <button
            type="button"
            onClick={onUpdateClick}
            className="text-xs font-bold text-blue-600 hover:text-blue-800"
          >
            Update Location
          </button>
        )}
      </div>

      <div className="p-4 flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Address</p>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-900 font-medium leading-relaxed">
                {fullAddress || <span className="text-slate-400 italic">No address provided</span>}
              </p>
            </div>
          </div>

          {!hasCoordinates && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p>Location coordinates are missing. Nearby job mapping may not work accurately until updated.</p>
            </div>
          )}

          {isAdmin && hasCoordinates && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Debug Info</p>
              <p className="text-xs font-mono text-slate-700">Lat: {latitude}</p>
              <p className="text-xs font-mono text-slate-700">Lng: {longitude}</p>
              <p className="text-xs font-mono text-slate-700">Verified: {verified ? 'Yes' : 'No'}</p>
            </div>
          )}

          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800"
            >
              Open in Google Maps
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {hasCoordinates && (
          <div ref={containerRef} className="w-full md:w-64 h-48 rounded-xl overflow-hidden border border-slate-200 relative z-0">
            {useLeaflet ? (
              <MapContainer center={[position.lat, position.lng]} zoom={14} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} className="h-full w-full" attributionControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LeafletMarker position={[position.lat, position.lng]} icon={leafletPinIcon} />
              </MapContainer>
            ) : (
              <APIProvider version="quarterly" apiKey={googleKey} onError={() => setGoogleFailed(true)}>
                <Map
                  defaultZoom={14}
                  defaultCenter={position}
                  disableDefaultUI={true}
                  gestureHandling="none"
                  mapId={GOOGLE_MAP_ID}
                >
                  <Marker position={position} title={title} />
                </Map>
              </APIProvider>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
