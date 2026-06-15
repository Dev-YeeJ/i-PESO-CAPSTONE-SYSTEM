export default function LocationMapPreview({ latitude, longitude }) {
  const mapKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY

  if (!mapKey || latitude == null || longitude == null) return null

  const coordinates = `${Number(latitude)},${Number(longitude)}`
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(mapKey)}&q=${encodeURIComponent(coordinates)}&zoom=16`

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <iframe
        title="Saved address map"
        src={mapUrl}
        className="h-56 w-full border-0"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="bg-white px-3 py-2 text-xs text-slate-600">
        Saved location: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
      </div>
    </div>
  )
}
