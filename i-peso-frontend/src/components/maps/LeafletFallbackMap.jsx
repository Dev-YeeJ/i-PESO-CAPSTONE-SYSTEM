import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'

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

// Violet teardrop with a small calendar glyph — visually distinct from the
// match-colored job pins and the blue "your location" marker.
const leafletJobFairIcon = L.divIcon({
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  html: '<span style="display:block;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#7c3aed;border:3px solid #4c1d95;box-shadow:0 3px 8px rgba(15,23,42,.3)"><i style="display:block;width:10px;height:8px;margin:12px auto 0;background:#fff;border-radius:1px;transform:rotate(45deg)"></i></span>',
})

function CompactJobPopup({ job, onViewJob }) {
  const hasMatch = job.match_percentage !== null && job.match_percentage !== undefined
  return (
    <div className="w-[240px] p-1 font-sans text-slate-900">
      <h3 className="line-clamp-2 text-sm font-extrabold">{job.job_title}</h3>
      <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{job.employer_name}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] font-bold">
        <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">{hasMatch ? `${Math.round(job.match_percentage)}% match` : 'View match'}</span>
        {job.distance_km !== null && <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">{job.distance_km.toFixed(1)} km</span>}
        {formatSalary(job) && <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{formatSalary(job)}</span>}
      </div>
      <button type="button" onClick={() => onViewJob(job)} className="mt-3.5 w-full rounded-lg bg-blue-950 px-2 py-2 text-[10px] font-bold text-white">View details</button>
    </div>
  )
}

function MapUpdater({ center, jobs, selectedJob, recenterRequest }) {
  const map = useMap()
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

function ClusterLayer({ jobs, activeJobId, onMarkerSelect, clustersEnabled }) {
  const map = useMap()
  useEffect(() => {
    const cluster = clustersEnabled ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 48, spiderfyOnMaxZoom: true }) : L.layerGroup()
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

export default function LeafletFallbackMap({ center, jobs, jobFairs = [], onJobFairSelect, seekerLocation, selectedJob, popupJob, activeJobId, onMarkerSelect, onPopupClose, onViewJob, recenterRequest, clustersEnabled }) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={13} zoomControl={false} className="h-full w-full" attributionControl>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapUpdater center={center} jobs={jobs} selectedJob={selectedJob} recenterRequest={recenterRequest} />
      <ClusterLayer jobs={jobs} activeJobId={activeJobId} onMarkerSelect={onMarkerSelect} clustersEnabled={clustersEnabled} />
      {seekerLocation?.latitude != null && seekerLocation?.longitude != null && <Marker position={[center.lat, center.lng]} icon={leafletUserIcon} zIndexOffset={1000} />}
      {jobFairs.map((fair) => (
        <Marker
          key={fair.job_fair_id}
          position={[fair.latitude, fair.longitude]}
          icon={leafletJobFairIcon}
          zIndexOffset={500}
          eventHandlers={{ click: () => onJobFairSelect?.(fair) }}
          title={`PESO Job Fair: ${fair.title} · ${fair.venue}`}
        />
      ))}
      {popupJob && <Popup position={[popupJob.latitude, popupJob.longitude]} eventHandlers={{ remove: () => onPopupClose(popupJob.post_id) }} closeButton><CompactJobPopup job={popupJob} onViewJob={onViewJob} /></Popup>}
    </MapContainer>
  )
}
