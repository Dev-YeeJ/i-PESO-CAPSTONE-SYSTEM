import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { APIProvider, InfoWindow, Map as GoogleMap, Marker as GoogleMarker, useMap as useGoogleMap, useMarkerRef } from '@vis.gl/react-google-maps'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { GOOGLE_MAP_ID, toMapPosition } from '@/utils/mapCoordinates'
import { MapContainer, Marker, Popup, TileLayer, useMap as useLeafletMap } from 'react-leaflet'
import { Expand, Layers3, List, LocateFixed, RotateCcw, Sparkles } from 'lucide-react'

const DEFAULT_CENTER = { lat: 15.9758, lng: 120.567 }

const markerColors = (percentage) => {
  if (percentage >= 80) return { background: '#16a34a', borderColor: '#14532d' }
  if (percentage >= 50) return { background: '#eab308', borderColor: '#713f12' }
  return { background: '#94a3b8', borderColor: '#334155' }
}

const formatSalary = (job) => {
  if (job.hide_salary || (!job.salary_min && !job.salary_max)) return null
  const format = (amount) => `₱${Number(amount).toLocaleString()}`
  if (job.salary_min && job.salary_max) return `${format(job.salary_min)}–${format(job.salary_max)}`
  return format(job.salary_min || job.salary_max)
}

function CompactJobPopup({ job, onViewJob }) {
  return (
    <div className="w-[240px] p-1 font-sans text-slate-900">
      <h3 className="line-clamp-2 text-sm font-extrabold text-slate-900">{job.job_title}</h3>
      <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{job.employer_name}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] font-bold">
        <span className={`rounded-md px-2 py-1 ${job.match_percentage >= 80 ? 'bg-emerald-50 text-emerald-700' : job.match_percentage >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{Math.round(job.match_percentage)}% match</span>
        {job.distance_km !== null && <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">{job.distance_km.toFixed(1)} km</span>}
        {formatSalary(job) && <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{formatSalary(job)}</span>}
      </div>
      <div className="mt-3.5 flex gap-2 border-t border-slate-100 pt-3">
        <button type="button" onClick={() => onViewJob(job)} className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-bold text-slate-700 transition hover:bg-slate-50 hover:text-blue-900">View details</button>
        {!job.has_applied && (
          <button type="button" onClick={() => onViewJob(job)} className="flex-1 rounded-lg bg-blue-950 px-2 py-2 text-[10px] font-bold text-white transition hover:bg-blue-900">Apply now</button>
        )}
      </div>
    </div>
  )
}

function MapControls({ onRecenter, onListToggle, onFullscreen, onReset, clustersEnabled, onClustersToggle, highOnly, onHighToggle, detailsOpen }) {
  return (
    <div className={`absolute right-3 top-3 z-[500] flex flex-col gap-2 transition-[right] duration-300 ${detailsOpen ? 'md:right-[420px]' : 'md:right-3'}`}>
      <button type="button" onClick={onRecenter} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-950 shadow-md hover:bg-slate-50" title="Recenter to my location"><LocateFixed className="h-4 w-4" /></button>
      <button type="button" onClick={onListToggle} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-950 shadow-md hover:bg-slate-50" title="Toggle job list"><List className="h-4 w-4" /></button>
      <button type="button" onClick={onFullscreen} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-950 shadow-md hover:bg-slate-50" title="Fullscreen map"><Expand className="h-4 w-4" /></button>
      <button type="button" onClick={onReset} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-950 shadow-md hover:bg-slate-50" title="Reset filters"><RotateCcw className="h-4 w-4" /></button>
      <button type="button" onClick={onClustersToggle} className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-md ${clustersEnabled ? 'border-blue-200 bg-blue-950 text-white' : 'border-slate-200 bg-white text-blue-950'}`} title="Toggle marker clusters"><Layers3 className="h-4 w-4" /></button>
      <button type="button" onClick={onHighToggle} className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-md ${highOnly ? 'border-amber-300 bg-amber-400 text-blue-950' : 'border-slate-200 bg-white text-blue-950'}`} title="Toggle high-match jobs"><Sparkles className="h-4 w-4" /></button>
    </div>
  )
}

function MapLegend({ fallback = false }) {
  return (
    <div className="absolute bottom-3 left-3 z-[500] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Match legend</p>
        {fallback && <span className="text-[9px] font-bold text-blue-700">OpenStreetMap</span>}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-600">
        {[['bg-emerald-600', 'High'], ['bg-amber-400', 'Medium'], ['bg-slate-400', 'Low'], ['bg-blue-600', 'Your location']].map(([color, label]) => <span key={label} className="flex items-center gap-1"><i className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}
      </div>
    </div>
  )
}

function GoogleMapUpdater({ center, jobs, selectedJob, recenterRequest }) {
  const map = useGoogleMap()

  useEffect(() => {
    if (!map) return
    if (selectedJob && selectedJob.latitude !== null && selectedJob.longitude !== null) {
      map.panTo({ lat: selectedJob.latitude, lng: selectedJob.longitude })
      map.setZoom(15)
      return
    }
    map.panTo(center)
    map.setZoom(13)
  }, [map, center, selectedJob, recenterRequest])

  useEffect(() => {
    if (!map || selectedJob || !window.google?.maps || jobs.length === 0) return
    const bounds = new window.google.maps.LatLngBounds()
    bounds.extend(center)
    jobs.forEach((job) => bounds.extend({ lat: job.latitude, lng: job.longitude }))
    const padding = { top: 70, right: 70, bottom: 70, left: window.innerWidth >= 768 ? 420 : 70 }
    map.fitBounds(bounds, padding)
  }, [map, center, jobs, selectedJob])

  return null
}

function GoogleClusterManager({ markers, enabled }) {
  const map = useGoogleMap()
  const clusterer = useRef(null)

  useEffect(() => {
    if (!map) return undefined
    clusterer.current = new MarkerClusterer({ map })
    return () => clusterer.current?.clearMarkers()
  }, [map])

  useEffect(() => {
    if (!clusterer.current) return
    clusterer.current.clearMarkers()
    const markerList = Object.values(markers)
    if (enabled) clusterer.current.addMarkers(markerList)
    else markerList.forEach((marker) => marker.setMap(map))
  }, [markers, enabled, map])

  return null
}

function GoogleJobMarker({ job, selected, onSelect, registerMarker }) {
  const [markerRef, marker] = useMarkerRef()

  useEffect(() => {
    registerMarker(job.post_id, marker)
    return () => registerMarker(job.post_id, null)
  }, [job.post_id, marker, registerMarker])

  return (
    <GoogleMarker ref={markerRef} position={{ lat: Number(job.latitude), lng: Number(job.longitude) }} onClick={() => onSelect(job.post_id)} zIndex={selected ? 50 : 10} title={`${job.job_title} · ${Math.round(job.match_percentage)}% match`} />
  )
}

const leafletJobIcon = (job, selected) => {
  const colors = markerColors(job.match_percentage)
  const background = selected ? '#f59e0b' : colors.background
  const border = selected ? '#92400e' : colors.borderColor
  const size = selected ? 34 : 28
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${background};border:3px solid ${border};box-shadow:0 3px 8px rgba(15,23,42,.28)"><i style="display:block;width:7px;height:7px;margin:${Math.round(size / 2 - 5)}px auto 0;border-radius:999px;background:#fff"></i></span>`,
  })
}

const leafletUserIcon = L.divIcon({
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: '<span style="display:block;width:24px;height:24px;border-radius:999px;background:#2563eb;border:4px solid #fff;box-shadow:0 0 0 2px #1e3a8a,0 3px 10px rgba(15,23,42,.3)"></span>',
})

function LeafletMapUpdater({ center, jobs, selectedJob, recenterRequest }) {
  const map = useLeafletMap()

  useEffect(() => {
    if (selectedJob) map.flyTo([selectedJob.latitude, selectedJob.longitude], 15, { duration: 0.45 })
    else map.setView([center.lat, center.lng], 13)
  }, [map, center, selectedJob, recenterRequest])

  useEffect(() => {
    if (selectedJob || jobs.length === 0) return
    const points = [[center.lat, center.lng], ...jobs.map((job) => [job.latitude, job.longitude])]
    const paddingLeft = window.innerWidth >= 768 ? 420 : 60
    map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [paddingLeft, 60], paddingBottomRight: [60, 60], maxZoom: 14 })
  }, [map, center, jobs, selectedJob])

  return null
}

function LeafletClusterLayer({ jobs, activeJobId, onMarkerSelect, clustersEnabled }) {
  const map = useLeafletMap()

  useEffect(() => {
    const cluster = clustersEnabled
      ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 48, spiderfyOnMaxZoom: true })
      : L.layerGroup()
    jobs.forEach((job) => {
      const marker = L.marker([job.latitude, job.longitude], { icon: leafletJobIcon(job, activeJobId === job.post_id), title: job.job_title })
      marker.on('click', () => onMarkerSelect(job.post_id))
      cluster.addLayer(marker)
    })
    map.addLayer(cluster)
    return () => map.removeLayer(cluster)
  }, [map, jobs, activeJobId, onMarkerSelect, clustersEnabled])

  return null
}

function LeafletFallbackMap({ center, jobs, seekerLocation, selectedJob, popupJob, activeJobId, onMarkerSelect, onPopupClose, onViewJob, recenterRequest, clustersEnabled }) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={13} zoomControl={false} className="h-full w-full" attributionControl>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LeafletMapUpdater center={center} jobs={jobs} selectedJob={selectedJob} recenterRequest={recenterRequest} />
      <LeafletClusterLayer jobs={jobs} activeJobId={activeJobId} onMarkerSelect={onMarkerSelect} clustersEnabled={clustersEnabled} />
      {seekerLocation?.latitude != null && seekerLocation?.longitude != null && <Marker position={[center.lat, center.lng]} icon={leafletUserIcon} zIndexOffset={1000} />}
      {popupJob && (
        <Popup position={[popupJob.latitude, popupJob.longitude]} eventHandlers={{ remove: () => onPopupClose(popupJob.post_id) }} closeButton>
          <CompactJobPopup job={popupJob} onViewJob={onViewJob} />
        </Popup>
      )}
    </MapContainer>
  )
}

export default function JobVacancyMap({ jobs, seekerLocation, selectedJobId, popupJobId, onMarkerSelect, onPopupClose, onViewJob, detailsOpen, onListToggle, onReset, highOnly, onHighToggle }) {
  const containerRef = useRef(null)
  const [markers, setMarkers] = useState({})
  const markerRegistry = useRef({})
  const [recenterRequest, setRecenterRequest] = useState(0)
  const [googleFailed, setGoogleFailed] = useState(false)
  const [clustersEnabled, setClustersEnabled] = useState(true)
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY
  const preferredProvider = import.meta.env.VITE_JOB_MAP_PROVIDER?.toLowerCase()

  const seekerPosition = useMemo(
    () => toMapPosition(seekerLocation?.latitude, seekerLocation?.longitude),
    [seekerLocation],
  )
  const center = seekerPosition ?? DEFAULT_CENTER
  const mappedJobs = useMemo(() => (Array.isArray(jobs) ? jobs : []).flatMap((job) => {
    const position = toMapPosition(job.latitude, job.longitude)
    return position ? [{ ...job, latitude: position.lat, longitude: position.lng }] : []
  }), [jobs])
  const selectedJob = mappedJobs.find((job) => job.post_id === selectedJobId) || null
  const popupJob = mappedJobs.find((job) => job.post_id === popupJobId) || null
  const activeJobId = selectedJobId || popupJobId
  const useLeaflet = preferredProvider === 'leaflet' || !googleKey || googleFailed

  const registerMarker = useCallback((id, marker) => {
    if (markerRegistry.current[id] === marker) return
    if (marker) markerRegistry.current[id] = marker
    else delete markerRegistry.current[id]
    setMarkers({ ...markerRegistry.current })
  }, [])

  useEffect(() => {
    const previousAuthFailure = window.gm_authFailure
    const handleAuthFailure = () => {
      setGoogleFailed(true)
      if (typeof previousAuthFailure === 'function') previousAuthFailure()
    }
    window.gm_authFailure = handleAuthFailure
    return () => {
      if (window.gm_authFailure === handleAuthFailure) window.gm_authFailure = previousAuthFailure
    }
  }, [])

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

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    if (document.fullscreenElement) await document.exitFullscreen()
    else await containerRef.current.requestFullscreen?.()
  }

  return (
    <div ref={containerRef} className="relative h-full min-h-[320px] w-full overflow-hidden bg-slate-100">
      {useLeaflet ? (
        <LeafletFallbackMap center={center} jobs={mappedJobs} seekerLocation={seekerLocation} selectedJob={selectedJob} popupJob={popupJob} activeJobId={activeJobId} onMarkerSelect={onMarkerSelect} onPopupClose={onPopupClose} onViewJob={onViewJob} recenterRequest={recenterRequest} clustersEnabled={clustersEnabled} />
      ) : (
        <APIProvider version="quarterly" apiKey={googleKey} onError={() => setGoogleFailed(true)}>
          <GoogleMap defaultZoom={13} defaultCenter={center} mapId={GOOGLE_MAP_ID} disableDefaultUI gestureHandling="greedy" style={{ width: '100%', height: '100%' }}>
            <GoogleMapUpdater center={center} jobs={mappedJobs} selectedJob={selectedJob} recenterRequest={recenterRequest} />
            <GoogleClusterManager markers={markers} enabled={clustersEnabled} />
            {seekerPosition &&
          <GoogleMarker position={center} zIndex={100} title="Your location" />
        }
            {mappedJobs.map((job) => <GoogleJobMarker key={job.post_id} job={job} selected={activeJobId === job.post_id} onSelect={onMarkerSelect} registerMarker={registerMarker} />)}
            {popupJob && <InfoWindow position={{ lat: Number(popupJob.latitude), lng: Number(popupJob.longitude) }} onCloseClick={() => onPopupClose(popupJob.post_id)} headerDisabled><CompactJobPopup job={popupJob} onViewJob={onViewJob} /></InfoWindow>}
          </GoogleMap>
        </APIProvider>
      )}

      <MapControls onRecenter={() => setRecenterRequest((value) => value + 1)} onListToggle={onListToggle} onFullscreen={toggleFullscreen} onReset={onReset} clustersEnabled={clustersEnabled} onClustersToggle={() => setClustersEnabled((enabled) => !enabled)} highOnly={highOnly} onHighToggle={onHighToggle} detailsOpen={detailsOpen} />
      <MapLegend fallback={useLeaflet} />
    </div>
  )
}
