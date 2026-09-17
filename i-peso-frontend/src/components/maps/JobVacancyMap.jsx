import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { APIProvider, InfoWindow, Map as GoogleMap, Marker as GoogleMarker, useMap as useGoogleMap, useMarkerRef } from '@vis.gl/react-google-maps'
import { GOOGLE_MAP_ID, toMapPosition } from '@/utils/mapCoordinates'
import { ChevronDown, Expand, Layers3, List, LocateFixed, RotateCcw, Sparkles } from 'lucide-react'
import '@/assets/styles/job-map.css'

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

const CompactJobPopup = memo(function CompactJobPopup({ job, onViewJob }) {
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
})

const MapControls = memo(function MapControls({ onRecenter, onListToggle, onFullscreen, onReset, clustersEnabled, onClustersToggle, highOnly, onHighToggle, detailsOpen }) {
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
})

// Mirrors the actual pin shapes on the map (teardrop for jobs/fairs, dot for
// "you are here") instead of plain colored circles, so the legend reads as
// the same visual language as the pins themselves — including the pulsing
// halo that marks a selected job and a PESO job fair.
function LegendSwatch({ shape, color, border, ring }) {
  if (shape === 'dot') {
    return <i className="block h-3 w-3 shrink-0 rounded-full border-2 border-white shadow" style={{ background: color }} />
  }
  return (
    <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
      {ring && <i className="jm-pin-ring absolute inset-[-3px] rounded-full" style={{ background: color, opacity: 0.4 }} />}
      <i className="relative block h-3 w-3 rounded-[50%_50%_50%_0]" style={{ background: color, border: `1.5px solid ${border}`, transform: 'rotate(-45deg)' }} />
    </span>
  )
}

function MapLegend({ fallback = false, showJobFairs = false }) {
  const [collapsed, setCollapsed] = useState(false)
  const entries = [
    { shape: 'teardrop', color: '#16a34a', border: '#14532d', label: 'High match' },
    { shape: 'teardrop', color: '#eab308', border: '#713f12', label: 'Medium match' },
    { shape: 'teardrop', color: '#94a3b8', border: '#334155', label: 'Low match' },
    { shape: 'teardrop', color: '#f59e0b', border: '#92400e', label: 'Selected', ring: true },
    { shape: 'dot', color: '#2563eb', label: 'Your location' },
  ]
  if (showJobFairs) entries.push({ shape: 'teardrop', color: '#7c3aed', border: '#4c1d95', label: 'PESO Job Fair', ring: true })

  return (
    <div className="jm-legend-panel absolute bottom-3 left-3 z-[500] max-w-[190px] rounded-xl border border-slate-200 bg-white/95 shadow-md backdrop-blur">
      <button type="button" onClick={() => setCollapsed((value) => !value)} className="flex w-full items-center justify-between gap-3 px-3 py-2" aria-expanded={!collapsed}>
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Map legend</span>
        <span className="flex items-center gap-1.5">
          {fallback && <span className="text-[9px] font-bold text-blue-700">OSM</span>}
          <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
        </span>
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-1.5 px-3 pb-2.5 text-[10px] font-semibold text-slate-600">
          {entries.map((entry) => (
            <span key={entry.label} className="flex items-center gap-2">
              <LegendSwatch {...entry} />
              {entry.label}
            </span>
          ))}
        </div>
      )}
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

const GoogleJobMarker = memo(function GoogleJobMarker({ job, selected, onSelect, registerMarker }) {
  const [markerRef, marker] = useMarkerRef()

  useEffect(() => {
    registerMarker(job.post_id, marker)
    return () => registerMarker(job.post_id, null)
  }, [job.post_id, marker, registerMarker])

  return (
    <GoogleMarker ref={markerRef} position={{ lat: Number(job.latitude), lng: Number(job.longitude) }} onClick={() => onSelect(job.post_id)} zIndex={selected ? 50 : 10} title={`${job.job_title} · ${job.match_percentage == null ? 'open to calculate match' : `${Math.round(job.match_percentage)}% match`}`} />
  )
})

const GoogleJobFairMarker = memo(function GoogleJobFairMarker({ fair, onSelect }) {
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
      // Passing onSelect straight through as onClick hands it a raw
      // MapMouseEvent instead of the fair — harmless while the caller
      // ignored its argument, but broke the moment the click handler needed
      // to know *which* fair was clicked (see JobMapPage.jsx's job-fair popup).
      onClick={() => onSelect(fair)}
      zIndex={20}
      icon={icon}
      // A one-time drop-in (native to classic Marker, no custom DOM needed)
      // draws the eye to PESO job fairs as the map loads, without the
      // constant-bounce noise a continuously-animated pin would add.
      animation={window.google?.maps?.Animation?.DROP}
      title={`PESO Job Fair: ${fair.title} · ${fair.venue}`}
    />
  )
})

// The whole map (Google/Leaflet tiles + every marker) previously re-rendered
// on any JobMapPage state change — applying to a job, toggling a panel, a
// filter debounce tick — none of which need to touch the map at all as long
// as the props below stay referentially stable. Callers must memoize the
// handlers they pass in for this to actually skip work; see JobMapPage.jsx.
function JobVacancyMap({ jobs, jobFairs = [], onJobFairSelect, seekerLocation, selectedJobId, popupJobId, onMarkerSelect, onPopupClose, onViewJob, detailsOpen, onListToggle, onReset, highOnly, onHighToggle }) {
  const containerRef = useRef(null)
  const [markers, setMarkers] = useState({})
  const markerRegistry = useRef({})
  const registerFlushPending = useRef(false)
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

  // N job markers each register on mount in their own effect. Committing one
  // setMarkers() per registration made GoogleClusterManager tear down and
  // rebuild its entire clusterer once per marker (worst case O(N²) for N
  // markers). Coalescing same-tick registrations into a single state update
  // via a microtask turns that into one rebuild per batch instead.
  const registerMarker = useCallback((id, marker) => {
    if (markerRegistry.current[id] === marker) return
    if (marker) markerRegistry.current[id] = marker
    else delete markerRegistry.current[id]
    if (registerFlushPending.current) return
    registerFlushPending.current = true
    queueMicrotask(() => {
      registerFlushPending.current = false
      setMarkers({ ...markerRegistry.current })
    })
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

export default memo(JobVacancyMap)
