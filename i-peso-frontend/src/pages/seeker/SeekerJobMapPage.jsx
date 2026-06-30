import React, { useState, useEffect, useRef } from 'react'
import api from '@/services/api'
import { Loader2, Navigation, MapPin, ExternalLink, Sparkles, LocateFixed, Briefcase, ChevronRight, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Link } from 'react-router-dom'
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps'

// Urdaneta City Default Coordinates
const DEFAULT_CENTER = { lat: 15.9758, lng: 120.5707 }

function MapBounds({ center, jobs, panToId }) {
  const map = useMap()
  
  useEffect(() => {
    if (!map || !center || !window.google.maps) return
    
    // If a specific job is clicked, pan and zoom to it
    if (panToId) {
      const job = jobs.find(j => j.id === panToId)
      if (job && job.latitude && job.longitude) {
        map.panTo({ lat: parseFloat(job.latitude), lng: parseFloat(job.longitude) })
        map.setZoom(16)
      }
      return
    }

    if (jobs.length === 0) {
      map.setCenter(center)
      map.setZoom(13)
      return
    }
    const bounds = new window.google.maps.LatLngBounds()
    bounds.extend(center)
    jobs.forEach(job => {
      if (job.latitude && job.longitude) {
        bounds.extend({ lat: parseFloat(job.latitude), lng: parseFloat(job.longitude) })
      }
    })
    map.fitBounds(bounds, { padding: 40 })
  }, [map, center, jobs, panToId])

  return null
}

function RadiusCircle({ center, radiusKm }) {
  const map = useMap()
  const circleRef = useRef(null)

  useEffect(() => {
    if (!map || !window.google.maps || !center) return

    circleRef.current = new window.google.maps.Circle({
      strokeColor: '#3b82f6',
      strokeOpacity: 0.3,
      strokeWeight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.05,
      map,
      center,
      radius: radiusKm * 1000
    })

    return () => {
      if (circleRef.current) circleRef.current.setMap(null)
    }
  }, [map, center, radiusKm])

  return null
}

const JobSkeleton = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
    <div className="flex justify-between mb-3">
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
        <div className="h-3 w-1/2 bg-slate-100 rounded"></div>
      </div>
    </div>
    <div className="flex gap-2">
      <div className="h-6 w-16 bg-slate-100 rounded-lg"></div>
      <div className="h-6 w-20 bg-slate-100 rounded-lg"></div>
    </div>
  </div>
)

export default function SeekerJobMapPage() {
  const { user } = useAuthStore()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [radius, setRadius] = useState(15)
  
  // Interactive States
  const [openInfoWindowId, setOpenInfoWindowId] = useState(null)
  const [hoveredJobId, setHoveredJobId] = useState(null)
  const [panToId, setPanToId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyHighlyMatched, setOnlyHighlyMatched] = useState(false)
  
  // Custom Center State
  const [activeCenter, setActiveCenter] = useState(null)
  const [isLocating, setIsLocating] = useState(false)

  // Initialize Center
  useEffect(() => {
    if (user?.latitude && user?.longitude) {
      setActiveCenter({ lat: parseFloat(user.latitude), lng: parseFloat(user.longitude) })
    } else {
      setActiveCenter(DEFAULT_CENTER)
    }
  }, [user])

  useEffect(() => {
    if (activeCenter) {
      fetchMapJobs()
    }
  }, [radius, activeCenter])

  const fetchMapJobs = async () => {
    try {
      setLoading(true)
      const res = await api.get('/seeker/nearby-jobs', {
        params: { 
          radius_km: radius, 
          limit: 100,
          lat: activeCenter.lat,
          lng: activeCenter.lng
        }
      })
      setJobs(res.data.jobs || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLocateMe = () => {
    setIsLocating(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setActiveCenter({ lat: position.coords.latitude, lng: position.coords.longitude })
          setIsLocating(false)
        },
        (error) => {
          console.error("Error obtaining location:", error)
          setIsLocating(false)
          alert("Could not detect your exact location. Please ensure location permissions are granted.")
        }
      )
    } else {
      setIsLocating(false)
      alert("Geolocation is not supported by this browser.")
    }
  }

  // Handle Map Dragging
  const handleMapChange = (ev) => {
    // Only update active center if the user actually dragged it, avoiding loop
    if (ev.detail.center && !panToId) {
       setActiveCenter(ev.detail.center)
    }
  }

  const filteredJobs = jobs.filter(job => {
    if (onlyHighlyMatched && job.match_percentage < 70) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!job.job_title.toLowerCase().includes(q) && !job.employer_name.toLowerCase().includes(q)) return false
    }
    return true
  })

  if (!activeCenter) return null

  return (
    <div className="flex h-[calc(100vh-6rem)] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm relative">
      
      {/* Toggle Sidebar Button (Mobile/Desktop) */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-md border border-slate-200 transition hover:bg-slate-50 md:hidden"
      >
        {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
      </button>

      {/* LEFT SIDEBAR: Job List */}
      <div className={`flex h-full flex-col border-r border-slate-200 bg-slate-50 transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-full md:w-[400px] lg:w-[450px]' : 'w-0 overflow-hidden border-r-0'}`}>
        {/* Sidebar Header */}
        <div className="border-b border-slate-200 bg-white p-5 min-w-[320px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black text-slate-900">Nearby Jobs</h1>
              <p className="text-sm font-medium text-slate-500">Interactive Discovery Map</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleLocateMe}
                disabled={isLocating}
                className="group flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition hover:bg-blue-600 hover:text-white"
                title="Use My Current Location"
              >
                {isLocating ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5 transition-transform group-hover:scale-110" />}
              </button>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Search Radius</label>
              <select 
                value={radius} 
                onChange={e => setRadius(Number(e.target.value))}
                className="w-full rounded-xl border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="5">Within 5 km</option>
                <option value="15">Within 15 km</option>
                <option value="30">Within 30 km</option>
                <option value="50">Within 50 km</option>
                <option value="100">Within 100 km</option>
              </select>
            </div>
            <div className="flex-1">
               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Results</label>
               <div className="h-[38px] flex items-center px-3 bg-blue-50 text-blue-700 font-bold rounded-xl text-sm border border-blue-100">
                 {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : filteredJobs.length} Found
               </div>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Filter by title or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm font-medium focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={onlyHighlyMatched}
              onChange={(e) => setOnlyHighlyMatched(e.target.checked)}
              className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
            />
            <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Only show Highly Matched (70%+)</span>
          </label>
        </div>

        {/* Sidebar List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-w-[320px]">
          {loading ? (
             <>
               <JobSkeleton />
               <JobSkeleton />
               <JobSkeleton />
             </>
          ) : filteredJobs.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
               <MapPin className="h-12 w-12 text-slate-300 mb-4" />
               <p className="text-base font-bold text-slate-600 mb-1">No jobs in this area</p>
               <p className="text-sm font-medium">Try increasing your search radius or changing filters.</p>
             </div>
          ) : (
            filteredJobs.map(job => {
              const isSelected = openInfoWindowId === job.id || hoveredJobId === job.id
              return (
                <div 
                  key={job.id} 
                  onMouseEnter={() => setHoveredJobId(job.id)}
                  onMouseLeave={() => setHoveredJobId(null)}
                  onClick={() => {
                    setOpenInfoWindowId(job.id)
                    setPanToId(job.id) // Trigger Map Pan
                    if (window.innerWidth < 768) setSidebarOpen(false) // auto close on mobile
                  }}
                  className={`group cursor-pointer rounded-2xl border bg-white p-4 transition-all duration-200 ${isSelected ? 'border-blue-500 shadow-md ring-1 ring-blue-500 translate-x-1' : 'border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-3">
                      <h3 className="font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{job.job_title}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-0.5 line-clamp-1">{job.employer_name}</p>
                    </div>
                    {job.match_percentage >= 70 && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 whitespace-nowrap">
                        <Sparkles className="h-3 w-3" /> Top
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3 text-xs font-semibold">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>
                      <Navigation className="h-3.5 w-3.5" />
                      {Number(job.distance_km || 0).toFixed(1)} km
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${isSelected ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600'}`}>
                      <Briefcase className="h-3.5 w-3.5" />
                      {job.match_percentage ? Math.round(job.match_percentage) + '% Match' : 'Unmatched'}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT CONTENT: Interactive Map */}
      <div className="relative flex-1 bg-slate-100">
        {/* Toggle open sidebar button when collapsed */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-md border border-slate-200 transition hover:bg-slate-50"
            title="Open Sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}

        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY}>
          <Map
            defaultZoom={13}
            defaultCenter={activeCenter}
            mapId="seeker-job-map"
            disableDefaultUI={false}
            gestureHandling="greedy"
            onDragstart={() => setPanToId(null)} // Cancel pan tracking if user manually drags
            onZoomChanged={() => setPanToId(null)}
          >
            <MapBounds center={activeCenter} jobs={filteredJobs} panToId={panToId} />

            {/* User / Active Center Marker */}
            <AdvancedMarker position={activeCenter} zIndex={100}>
              <div className="relative flex h-14 w-14 items-center justify-center">
                <div className="absolute h-full w-full animate-ping rounded-full bg-blue-400 opacity-20"></div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-blue-600 shadow-lg">
                  <div className="h-2 w-2 rounded-full bg-white"></div>
                </div>
              </div>
            </AdvancedMarker>

            <RadiusCircle center={activeCenter} radiusKm={radius} />

            {filteredJobs.map(job => {
              if (!job.latitude || !job.longitude) return null
              const position = { lat: parseFloat(job.latitude), lng: parseFloat(job.longitude) }
              const isSelected = openInfoWindowId === job.id
              const isHovered = hoveredJobId === job.id
              
              return (
                <React.Fragment key={job.id}>
                  <AdvancedMarker 
                    position={position}
                    onClick={() => {
                      setOpenInfoWindowId(job.id)
                      setPanToId(job.id)
                    }}
                    zIndex={isSelected || isHovered ? 50 : 10}
                  >
                    <div className={`transition-transform duration-300 ${isSelected || isHovered ? 'scale-125' : 'scale-100 hover:scale-110'}`}>
                      <Pin 
                        background={isSelected || isHovered ? '#2563eb' : '#ef4444'} 
                        borderColor={isSelected || isHovered ? '#1e3a8a' : '#991b1b'} 
                        glyphColor="#fff" 
                      />
                    </div>
                  </AdvancedMarker>

                  {isSelected && (
                    <InfoWindow
                      position={position}
                      onCloseClick={() => {
                        setOpenInfoWindowId(null)
                        setPanToId(null)
                      }}
                      headerDisabled
                      className="rounded-xl overflow-hidden shadow-2xl"
                    >
                      <div className="w-[280px] p-1 font-sans">
                        <div className="flex flex-col gap-3 p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-inner">
                              <Briefcase className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-black text-slate-900 leading-tight">{job.job_title}</h3>
                              <p className="mt-0.5 text-sm font-semibold text-slate-600 line-clamp-1">{job.employer_name}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                             <div className="flex flex-col rounded-xl bg-emerald-50 p-2 text-center border border-emerald-100/50">
                               <span className="text-[10px] font-bold uppercase text-emerald-600/70 mb-0.5">Match</span>
                               <span className="text-sm font-black text-emerald-700">{Math.round(job.match_percentage || 0)}%</span>
                             </div>
                             <div className="flex flex-col rounded-xl bg-blue-50 p-2 text-center border border-blue-100/50">
                               <span className="text-[10px] font-bold uppercase text-blue-600/70 mb-0.5">Distance</span>
                               <span className="text-sm font-black text-blue-700">{Number(job.distance_km || 0).toFixed(1)} km</span>
                             </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-2 pt-0 border-t border-slate-100 mt-1">
                          <Link 
                            to={`/seeker/jobs/${job.id}`} 
                            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 mt-2"
                          >
                            View Job <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                          <a 
                            href={`https://www.google.com/maps/dir/?api=1&origin=${activeCenter.lat},${activeCenter.lng}&destination=${job.latitude},${job.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 mt-2"
                            title="Get Directions"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </React.Fragment>
              )
            })}
          </Map>
        </APIProvider>
      </div>
    </div>
  )
}
