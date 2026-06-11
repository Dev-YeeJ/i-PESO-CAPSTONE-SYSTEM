import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function RecenterMap({ latitude, longitude }) {
  const map = useMap()

  useEffect(() => {
    map.setView([latitude, longitude], 16)
  }, [latitude, longitude, map])

  return null
}

export default function LocationMapPreview({ latitude, longitude }) {
  const mapKey = import.meta.env.VITE_GEOAPIFY_MAP_KEY

  if (!mapKey || latitude == null || longitude == null) return null

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        scrollWheelZoom={false}
        dragging
        className="h-56 w-full"
      >
        <RecenterMap latitude={latitude} longitude={longitude} />
        <TileLayer
          maxZoom={20}
          attribution='&copy; OpenStreetMap contributors, &copy; Geoapify'
          url={`https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${mapKey}`}
        />
        <CircleMarker
          center={[latitude, longitude]}
          radius={9}
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#1d4ed8', fillOpacity: 1 }}
        />
      </MapContainer>
      <div className="bg-white px-3 py-2 text-xs text-slate-600">
        Saved location: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
      </div>
    </div>
  )
}
