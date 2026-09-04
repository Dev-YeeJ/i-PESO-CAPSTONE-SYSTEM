import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { APIProvider, InfoWindow, Map as GoogleMap, Marker as GoogleMarker, useMap as useGoogleMap, useMarkerRef } from '@vis.gl/react-google-maps'
import { GOOGLE_MAP_ID, toMapPosition } from '@/utils/mapCoordinates'
import { Expand, Layers3, List, LocateFixed, RotateCcw, Sparkles } from 'lucide-react'

const DEFAULT_CENTER = { lat: 15.9758, lng: 120.567 }
const LeafletFallbackMap = lazy(() => import('./LeafletFallbackMap'))

// Inline data-URI pin so a job fair marker needs no external asset and reads
// as visually distinct from the green/amber/slate match-colored job pins.
const JOB_FAIR_PIN_SVG = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">'
  + '<path d="M17 2c-7.2 0-13 5.8-13 13 0 9.5 13 17 13 17s13-7.5 13-17c0-7.2-5.8-13-13-13z" fill="#7c3aed" stroke="#4c1d95" stroke-width="2"/>'
  + '<rect x="10.5" y="11" width="13" height="10" rx="1.5" fill="#fff"/>'
  + '<rect x="10.5" y="11" width="13" height="3" fill="#4c1d95"/>'
  + '<rect x="13" y="9" width="1.6" height="4" fill="#4c1d95"/>'
  + '<rect x="19.4" y="9" width="1.6" height="4" fill="#4c1d95"/>'
  + '</svg>',
)

const formatSalary = (job) => {
  if (job.hide_salary || (!job.salary_min && !job.salary_max)) return null
  const format = (amount) => `₱${Number(amount).toLocaleString()}`
  if (job.salary_min && job.salary_max) return `${format(job.salary_min)}–${format(job.salary_max)}`
  return format(job.salary_min || job.salary_max)
}

function CompactJobPopup({ job, onViewJob }) {
  const hasMatch = job.match_percentage !== null && job.match_percentage !== undefined
  return (
    <div className="w-[240px] p-1 font-sans text-slate-900">
      <h3 className="line-clamp-2 text-sm font-extrabold text-slate-900">{job.job_title}</h3>
      <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{job.employer_name}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] font-bold">
        <span className={`rounded-md px-2 py-1 ${hasMatch ? (job.match_percentage >= 80 ? 'bg-emerald-50 text-emerald-700' : job.match_percentage >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600') : 'bg-blue-50 text-blue-700'}`}>{hasMatch ? `${Math.round(job.match_percentage)}% match` : 'View match'}</span>
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

function MapLegend({ fallback = false, showJobFairs = false }) {
  const entries = [['bg-emerald-600', 'High'], ['bg-amber-400', 'Medium'], ['bg-slate-400', 'Low'], ['bg-blue-600', 'Your location']]
  if (showJobFairs) entries.push(['bg-violet-600', 'PESO Job Fair'])
  return (
    <div className="absolute bottom-3 left-3 z-[500] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Match legend</p>
        {fallback && <span className="text-[9px] font-bold text-blue-700">OpenStreetMap</span>}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-600">
        {entries.map(([color, label]) => <span key={label} className="flex items-center gap-1"><i className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}
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
    <GoogleMarker ref={markerRef} position={{ lat: Number(job.latitude), lng: Number(job.longitude) }} onClick={() => onSelect(job.post_id)} zIndex={selected ? 50 : 10} title={`${job.job_title} · ${job.match_percentage == null ? 'open to calculate match' : `${Math.round(job.match_percentage)}% match`}`} />
  )
}

function GoogleJobFairMarker({ fair, onSelect }) {
  // google.maps.Size/Point must be real instances (not plain objects) — safe
  // to construct here since this only ever mounts inside an already-loaded
  // <APIProvider><GoogleMap>, same guarantee GoogleClusterManager relies on.
  const icon = window.google?.maps
    ? {
      url: JOB_FAIR_PIN_SVG,
      scaledSize: new window.google.maps.Size(34, 34),
      anchor: new window.google.maps.Point(17, 32),
    }
    : undefined

  return (
    <GoogleMarker
      position={{ lat: Number(fair.latitude), lng: Number(fair.longitude) }}
      onClick={onSelect}
      zIndex={20}
      icon={icon}
      title={`PESO Job Fair: ${fair.title} · ${fair.venue}`}
    />
  )
}

export default function JobVacancyMap({ jobs, jobFairs = [], onJobFairSelect, seekerLocation, selectedJobId, popupJobId, onMarkerSelect, onPopupClose, onViewJob, detailsOpen, onListToggle, onReset, highOnly, onHighToggle }) {
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
  const mappedFairs = useMemo(() => (Array.isArray(jobFairs) ? jobFairs : []).flatMap((fair) => {
    const position = toMapPosition(fair.latitude, fair.longitude)
    return position ? [{ ...fair, latitude: position.lat, longitude: position.lng }] : []
  }), [jobFairs])
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
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-slate-200" />}>
          <LeafletFallbackMap center={center} jobs={mappedJobs} jobFairs={mappedFairs} onJobFairSelect={onJobFairSelect} seekerLocation={seekerLocation} selectedJob={selectedJob} popupJob={popupJob} activeJobId={activeJobId} onMarkerSelect={onMarkerSelect} onPopupClose={onPopupClose} onViewJob={onViewJob} recenterRequest={recenterRequest} clustersEnabled={clustersEnabled} />
        </Suspense>
      ) : (
        <APIProvider version="quarterly" apiKey={googleKey} onError={() => setGoogleFailed(true)}>
          <GoogleMap defaultZoom={13} defaultCenter={center} mapId={GOOGLE_MAP_ID} disableDefaultUI gestureHandling="greedy" style={{ width: '100%', height: '100%' }}>
            <GoogleMapUpdater center={center} jobs={mappedJobs} selectedJob={selectedJob} recenterRequest={recenterRequest} />
            <GoogleClusterManager markers={markers} enabled={clustersEnabled} />
            {seekerPosition &&
          <GoogleMarker position={center} zIndex={100} title="Your location" />
        }
            {mappedJobs.map((job) => <GoogleJobMarker key={job.post_id} job={job} selected={activeJobId === job.post_id} onSelect={onMarkerSelect} registerMarker={registerMarker} />)}
            {mappedFairs.map((fair) => <GoogleJobFairMarker key={fair.job_fair_id} fair={fair} onSelect={onJobFairSelect} />)}
            {popupJob && <InfoWindow position={{ lat: Number(popupJob.latitude), lng: Number(popupJob.longitude) }} onCloseClick={() => onPopupClose(popupJob.post_id)} headerDisabled><CompactJobPopup job={popupJob} onViewJob={onViewJob} /></InfoWindow>}
          </GoogleMap>
        </APIProvider>
      )}

      <MapControls onRecenter={() => setRecenterRequest((value) => value + 1)} onListToggle={onListToggle} onFullscreen={toggleFullscreen} onReset={onReset} clustersEnabled={clustersEnabled} onClustersToggle={() => setClustersEnabled((enabled) => !enabled)} highOnly={highOnly} onHighToggle={onHighToggle} detailsOpen={detailsOpen} />
      <MapLegend fallback={useLeaflet} showJobFairs={mappedFairs.length > 0} />
    </div>
  )
}
