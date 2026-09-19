import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, BriefcaseBusiness, Loader2, LocateFixed, MapPinned, PanelLeftOpen, RefreshCw, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import JobMapAssistant from '../../components/maps/JobMapAssistant'
import JobMapCard from '../../components/maps/JobMapCard'
import JobMapFilters from '../../components/maps/JobMapFilters'
import JobMapDetailsPanel from '../../components/maps/JobMapDetailsPanel'
import ReportEmployerModal from '../../components/ReportEmployerModal'
import JobFairInfoModal from '../../components/JobFairInfoModal'
import { ALLOWED_RADII, getMapJobDetail, getMapJobs } from '../../services/jobMapService'
import { applyToJob, toggleSavedJob } from '../../services/seekerService'
import { listJobFairs } from '../../services/jobFairService'

// hide_low_match and coordinates_only used to live here too, but neither had
// a manual control, wasn't reachable via Smart Search, and min_match's own
// "50% and above" option already covers the same need — dead filters that
// only added confusing "active filter" chips no click path could ever
// produce. Removed rather than wired up, since they were pure redundancy.
const DEFAULT_FILTERS = {
  radius_km: 15,
  min_match: 0,
  keyword: '',
  sort: 'distance',
  job_type: '',
  salary_min: '',
  salary_max: '',
  hide_applied: false,
  location_keyword: '',
  saved_only: false,
  job_fair_only: false,
  upskill_recommended_only: false,
  certificate_match_only: false,
  can_apply_only: false,
  max_missing_skills: '',
  limit: 30,
}

const EMPTY_SEEKER_LOCATION = { latitude: null, longitude: null, full_address: '' }
const EMPTY_LIST = []

const JobVacancyMap = lazy(() => import('../../components/maps/JobVacancyMap'))

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback

function JobSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
      <div className="h-4 w-3/4 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
      <div className="mt-4 flex gap-2"><div className="h-6 w-16 rounded bg-slate-100" /><div className="h-6 w-20 rounded bg-slate-100" /></div>
      <div className="mt-4 h-8 rounded bg-slate-100" />
    </div>
  )
}

function SmartSummary({ summary }) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-2.5">
      <p className="text-[11px] font-semibold leading-5 text-slate-600">
        <strong className="text-slate-900">{summary.total_found} jobs</strong> found
        {' · '}<strong className="text-emerald-700">{summary.high_match_count}</strong> high-match
        {summary.nearest_distance_km !== null && <>{' · '}nearest <strong className="text-blue-800">{Number(summary.nearest_distance_km).toFixed(1)} km</strong></>}
      </p>
    </div>
  )
}

function ApplyConfirmation({ job, onCancel, onConfirm, applying }) {
  const isOpen = Boolean(job)

  // Escape-to-close and a background scroll lock — this is a true blocking
  // modal (unlike the map's floating panels, which stay reachable behind
  // the details drawer), so it needs both to behave like one.
  useEffect(() => {
    if (!isOpen) return undefined
    const handleKeyDown = (event) => { if (event.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onCancel])

  if (!job) return null
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="apply-confirmation-title" className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-slate-200" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-900">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div>
            <h2 id="apply-confirmation-title" className="text-sm font-black text-slate-900">Confirm Application</h2>
            <p className="text-xs font-medium text-slate-500">Apply using your i-PESO profile.</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 ring-1 ring-inset ring-slate-200/50">
          Apply to <strong className="text-slate-900">{job.job_title}</strong> at <strong className="text-slate-900">{job.employer_name}</strong>?
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" autoFocus onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Cancel</button>
          <button type="button" disabled={applying} onClick={() => onConfirm(job)} className="flex-1 rounded-xl bg-blue-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
            {applying ? 'Applying…' : 'Confirm Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JobMapPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { jobId: routeJobIdParam } = useParams()
  const routeJobId = routeJobIdParam ? parseInt(routeJobIdParam, 10) : null

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [debouncedFilters, setDebouncedFilters] = useState(DEFAULT_FILTERS)
  const [selectedJobId, setSelectedJobId] = useState(routeJobId)
  const [detailsById, setDetailsById] = useState({})
  const [detailLoadingId, setDetailLoadingId] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [reportTarget, setReportTarget] = useState(null)
  const [jobFairPopup, setJobFairPopup] = useState(null)
  const [popupJobId, setPopupJobId] = useState(null)
  const [locationNotice, setLocationNotice] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [applyingIds, setApplyingIds] = useState([])
  const [savingIds, setSavingIds] = useState([])
  const [pendingApplyJobId, setPendingApplyJobId] = useState(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const detailAbortRef = useRef(null)
  const detailRequestId = useRef(0)
  const filtersRef = useRef(filters)
  useEffect(() => { filtersRef.current = filters }, [filters])

  // Filter changes debounce into this before becoming the query key, so a
  // burst of changes (Smart Search setting several filters at once, quick
  // successive dropdown clicks) settles into one request instead of one per
  // change — react-query itself then handles caching, de-duping, and
  // cancelling a superseded in-flight request automatically.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedFilters(filters), 400)
    return () => window.clearTimeout(timer)
  }, [filters])

  const jobsQuery = useQuery({
    queryKey: ['jobMap', debouncedFilters],
    queryFn: async ({ signal }) => {
      try {
        const data = await getMapJobs(debouncedFilters, { signal })
        return { ...data, locationRequired: false, locationFallbackNotice: '' }
      } catch (fetchError) {
        if (fetchError?.response?.data?.code !== 'location_required') throw fetchError

        try {
          const fallback = await getMapJobs({ ...debouncedFilters, feed_mode: 'latest', sort: 'newest', limit: 30 }, { signal })
          return {
            ...fallback,
            seeker_location: fetchError.response.data.seeker_location || EMPTY_SEEKER_LOCATION,
            locationRequired: false,
            locationFallbackNotice: 'Showing latest active vacancies. Add your location to enable nearby map pins.',
          }
        } catch (fallbackError) {
          if (fallbackError?.code === 'ERR_CANCELED' || fallbackError?.name === 'AbortError') throw fallbackError
          return {
            jobs: [],
            seeker: fetchError.response.data.seeker || null,
            summary: null,
            seeker_location: fetchError.response.data.seeker_location || EMPTY_SEEKER_LOCATION,
            locationRequired: true,
            locationFallbackNotice: '',
          }
        }
      }
    },
    placeholderData: (previous) => previous,
  })

  const jobs = jobsQuery.data?.jobs ?? EMPTY_LIST
  const summary = jobsQuery.data?.summary ?? null
  const seekerLocation = jobsQuery.data?.seeker_location ?? EMPTY_SEEKER_LOCATION
  const locationRequired = jobsQuery.data?.locationRequired ?? false
  // isLoading is only true before the very first result ever lands;
  // isFetching covers every subsequent re-fetch too (used for the
  // non-blocking "Updating map…" pill instead of re-showing skeletons and
  // wiping out perfectly good results already on screen).
  const isLoading = jobsQuery.isLoading
  const isFetching = jobsQuery.isFetching
  const error = jobsQuery.isError ? errorMessage(jobsQuery.error, 'Unable to load nearby jobs. Please try again.') : ''

  // Keep the selected/previewed job in step with what the query actually
  // returned — e.g. a job that drops out of a narrower radius shouldn't stay
  // "selected" with stale details still on screen.
  useEffect(() => {
    if (!jobsQuery.data) return
    const currentJobs = jobsQuery.data.jobs || []
    setSelectedJobId((id) => (id === routeJobId) ? id : (currentJobs.some((job) => job.post_id === id) ? id : null))
    setPopupJobId((id) => currentJobs.some((job) => job.post_id === id) ? id : null)
  }, [jobsQuery.data, routeJobId])

  // Independent of filters/location — PESO job fairs are a small, slow-moving
  // set of events, not something to re-fetch every time the seeker adjusts a
  // vacancy search. A failure here shouldn't block the primary job map.
  const jobFairsQuery = useQuery({
    queryKey: ['jobMapFairs'],
    queryFn: async () => (await listJobFairs()).filter((fair) => fair.map_eligible),
    staleTime: 5 * 60_000,
  })
  const jobFairs = jobFairsQuery.data ?? EMPTY_LIST

  const updateFilters = (changes) => {
    setFilters((current) => ({ ...current, ...changes }))
    setSelectedJobId(null)
    setPopupJobId(null)
  }

  // Memoized so it stays referentially stable across the frequent re-renders
  // this page does for unrelated state (applying, saving, panel toggles) —
  // JobVacancyMap is memo()'d and depends on that stability to actually skip
  // re-rendering the map (and, on the Leaflet path, avoid rebuilding every
  // marker) when none of that unrelated state should touch it.
  //
  // Resetting used to silently drop a live "Use current location" override
  // back to the seeker's saved profile address with no indication that's
  // what happened — confusing, since Reset is framed as "clear my filters,"
  // not "forget where I said I am." It now keeps an active lat/lng override
  // (read via a ref so this can stay a zero-dependency, stable callback).
  const resetFilters = useCallback(() => {
    const { lat, lng } = filtersRef.current
    const hasLocationOverride = lat !== undefined
    setFilters(hasLocationOverride ? { ...DEFAULT_FILTERS, lat, lng } : DEFAULT_FILTERS)
    setSelectedJobId(null)
    setPopupJobId(null)
    if (!hasLocationOverride) setLocationNotice('')
  }, [])

  const updateJob = (postId, changes) => {
    queryClient.setQueryData(['jobMap', debouncedFilters], (current) => current && {
      ...current,
      jobs: current.jobs.map((job) => job.post_id === postId ? { ...job, ...changes } : job),
    })
    setDetailsById((current) => current[postId]
      ? { ...current, [postId]: { ...current[postId], ...changes } }
      : current)
  }

  const requestApply = (job) => {
    if (job.has_applied) return
    // Basic registration info is enough to apply — the full profile can be finished later.
    setPendingApplyJobId(job.post_id)
  }

  const submitApplication = async (job) => {
    if (job.has_applied || applyingIds.includes(job.post_id)) return
    setPendingApplyJobId(null)
    setApplyingIds((ids) => [...ids, job.post_id])
    try {
      const data = await applyToJob(job.post_id)
      updateJob(job.post_id, { has_applied: true, application_id: data.application?.apply_id, application_status: data.application?.status || 'pending' })
      toast.success('Application submitted successfully.')
    } catch (applyError) {
      toast.error(errorMessage(applyError, 'Unable to submit your application.'))
    } finally {
      setApplyingIds((ids) => ids.filter((id) => id !== job.post_id))
    }
  }

  const handleSave = async (job) => {
    if (savingIds.includes(job.post_id)) return
    setSavingIds((ids) => [...ids, job.post_id])
    updateJob(job.post_id, { is_saved: !job.is_saved })
    try {
      const data = await toggleSavedJob(job.post_id)
      const saved = (data.saved_jobs || []).map(Number).includes(job.post_id)
      updateJob(job.post_id, { is_saved: saved })
      toast.success(saved ? 'Job saved.' : 'Job removed from saved jobs.')
    } catch (saveError) {
      updateJob(job.post_id, { is_saved: job.is_saved })
      toast.error(errorMessage(saveError, 'Unable to update saved jobs.'))
    } finally {
      setSavingIds((ids) => ids.filter((id) => id !== job.post_id))
    }
  }

  // Previously both of these hard-navigated to the generic /seeker/job-fairs
  // list regardless of which fair was actually clicked — a jarring, contextless
  // redirect. They now show a popup with that specific fair's info first.
  const handleJobFair = (job) => {
    const fair = job.job_fair
    if (!fair?.job_fair_id) return
    setJobFairPopup(fair)
  }

  // Tapping a standalone PESO Job Fair pin on the map. Memoized — passed
  // straight into the memo()'d JobVacancyMap as onJobFairSelect.
  const handleJobFairPin = useCallback((fair) => {
    if (!fair?.job_fair_id) return
    setJobFairPopup({ job_fair_id: fair.job_fair_id, title: fair.title, date: fair.date || fair.start_date, venue: fair.venue })
  }, [])

  const viewTraining = (job) => {
    const skill = job.upskill?.programs?.[0]?.matched_skills?.[0] || job.missing_skills?.[0]?.skill || ''
    navigate(`/seeker/government-programs${skill ? `?search=${encodeURIComponent(skill)}` : ''}`)
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationNotice('Location services are not supported by this browser. You can still use your saved address.')
      return
    }
    setIsLocating(true)
    setLocationNotice('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        updateFilters({ lat: coords.latitude, lng: coords.longitude })
        setLocationNotice('Using your current location for this search. Your coordinates are not shared with employers.')
        setIsLocating(false)
      },
      () => {
        setLocationNotice('Location permission was denied. You can still use your saved address.')
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // Memoized (deps: detailsById, seekerLocation, debouncedFilters, queryClient)
  // — passed into the memo()'d JobVacancyMap as onViewJob, so it only changes
  // reference when a detail fetch actually needs to.
  const openDetails = useCallback(async (job) => {
    const id = typeof job === 'object' ? job.post_id : job
    setSelectedJobId(id)
    setPopupJobId(null)
    setDetailError('')
    if (id) document.getElementById(`map-job-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

    if (!id || detailsById[id]) return

    const currentRequest = ++detailRequestId.current
    detailAbortRef.current?.abort()
    const controller = new AbortController()
    detailAbortRef.current = controller
    setDetailLoadingId(id)
    try {
      const detailedJob = await getMapJobDetail(id, seekerLocation, { signal: controller.signal })
      if (currentRequest !== detailRequestId.current) return
      setDetailsById((current) => ({ ...current, [id]: detailedJob }))
      queryClient.setQueryData(['jobMap', debouncedFilters], (current) => current && {
        ...current,
        jobs: current.jobs.map((item) => item.post_id === id ? { ...item, ...detailedJob } : item),
      })
    } catch (requestError) {
      if (requestError?.code === 'ERR_CANCELED' || requestError?.name === 'AbortError') return
      if (currentRequest === detailRequestId.current) {
        setDetailError(errorMessage(requestError, 'Detailed matching could not be loaded. Please try again.'))
      }
    } finally {
      if (currentRequest === detailRequestId.current) setDetailLoadingId(null)
    }
  }, [detailsById, seekerLocation, debouncedFilters, queryClient])

  // Memoized — passed into the memo()'d JobVacancyMap as onMarkerSelect. This
  // was previously recreated on every render, which forced the Leaflet path
  // to tear down and rebuild every marker on the map on almost any unrelated
  // page interaction (applying, saving, panel toggles) since it sat in the
  // marker-cluster effect's dependency array.
  const previewMarkerJob = useCallback((id) => {
    setSelectedJobId(null)
    setPopupJobId(id)
  }, [])

  const closePopup = useCallback((id) => {
    setPopupJobId((current) => (current === id ? null : current))
  }, [])

  const togglePanel = useCallback(() => setPanelOpen((open) => !open), [])

  const hasLocation = seekerLocation?.latitude != null && seekerLocation?.longitude != null

  // `hasLocation ? jobs : []` would otherwise build a brand-new empty array
  // on every render whenever location is missing, defeating JobVacancyMap's
  // memo() every time regardless of how stable the other props are.
  const mapJobs = useMemo(() => (hasLocation ? jobs : []), [hasLocation, jobs])

  const toggleHighMatch = useCallback(() => {
    setFilters((current) => ({ ...current, min_match: Number(current.min_match) >= 80 ? 0 : 80 }))
    setSelectedJobId(null)
    setPopupJobId(null)
  }, [])

  useEffect(() => {
    if (routeJobId) {
      openDetails(routeJobId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeJobId])

  const detailsJob = selectedJobId
    ? detailsById[selectedJobId] || jobs.find((job) => job.post_id === selectedJobId) || null
    : null
  const pendingApplyJob = jobs.find((job) => job.post_id === pendingApplyJobId) || null
  const highMatchEmpty = Number(filters.min_match) >= 70
  const liveSummary = useMemo(() => ({
    total_found: jobs.length,
    high_match_count: jobs.filter((job) => job.match_percentage >= 80).length,
    nearest_distance_km: jobs.map((job) => job.distance_km).filter((distance) => distance !== null).sort((left, right) => left - right)[0] ?? summary?.nearest_distance_km ?? null,
    applied_count: jobs.filter((job) => job.has_applied).length,
    saved_count: jobs.filter((job) => job.is_saved).length,
    upskill_recommendation_count: jobs.filter((job) => job.upskill?.recommended).length,
  }), [jobs, summary])

  const activeFilters = [
    filters.job_type && { key: 'job_type', label: filters.job_type },
    filters.hide_applied && { key: 'hide_applied', label: 'Hide applied' },
    filters.saved_only && { key: 'saved_only', label: 'Saved jobs' },
    filters.job_fair_only && { key: 'job_fair_only', label: 'Job Fairs' },
    filters.upskill_recommended_only && { key: 'upskill_recommended_only', label: 'Upskill matches' },
    filters.certificate_match_only && { key: 'certificate_match_only', label: 'Certificate matches' },
    filters.can_apply_only && { key: 'can_apply_only', label: 'Can apply now' },
    filters.location_keyword && { key: 'location_keyword', label: `Near: ${filters.location_keyword}` },
    filters.salary_min && { key: 'salary_min', label: `Min ₱${Number(filters.salary_min).toLocaleString()}` },
    filters.salary_max && { key: 'salary_max', label: `Max ₱${Number(filters.salary_max).toLocaleString()}` },
    // Smart Search can set this with no manual control and no other visual
    // trace of it — without a chip here, it could silently be narrowing
    // results with zero way for the seeker to notice or undo it.
    filters.max_missing_skills !== '' && { key: 'max_missing_skills', label: `≤${filters.max_missing_skills} missing skills` },
  ].filter(Boolean)

  return (
    <div className="relative -mx-4 -my-6 flex h-[calc(100vh-76px)] flex-col overflow-hidden bg-slate-100 sm:-mx-6 lg:-mx-8 lg:-my-8">
      {/* Background Map Canvas */}
      <main className="absolute inset-0 z-0">
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-slate-200" />}>
          <JobVacancyMap jobs={mapJobs} jobFairs={jobFairs} onJobFairSelect={handleJobFairPin} seekerLocation={seekerLocation} selectedJobId={selectedJobId} popupJobId={popupJobId} onMarkerSelect={previewMarkerJob} onPopupClose={closePopup} onViewJob={openDetails} detailsOpen={Boolean(detailsJob)} onListToggle={togglePanel} onReset={resetFilters} highOnly={Number(filters.min_match) >= 80} onHighToggle={toggleHighMatch} />
        </Suspense>
        <div role="status" aria-live="polite" className={`pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 transition-all duration-300 ${isFetching ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-bold text-blue-950 shadow-lg backdrop-blur">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {isLoading ? 'Loading map…' : 'Updating map…'}
          </span>
        </div>
        {!hasLocation && !isFetching && (
          <div className="pointer-events-none absolute inset-x-4 top-16 z-10 mx-auto max-w-md rounded-xl border border-amber-200 bg-white/95 p-3 text-center text-xs font-semibold leading-5 text-amber-800 shadow-lg backdrop-blur">Update your address or use your current location to view nearby job pins.</div>
        )}
      </main>

      {/* Floating Left Panel */}
      <aside className={`absolute z-10 flex min-h-0 flex-col overflow-hidden bg-white/95 shadow-2xl ring-1 ring-slate-200/80 backdrop-blur-md transition-all duration-300 ease-in-out ${panelOpen ? 'inset-x-0 bottom-0 h-[72%] rounded-t-3xl md:inset-auto md:left-4 md:top-4 md:bottom-4 md:h-auto md:w-[380px] md:rounded-2xl md:translate-x-0 xl:w-[420px]' : 'inset-x-0 bottom-0 h-[72%] translate-y-full rounded-t-3xl md:inset-auto md:left-4 md:top-4 md:bottom-4 md:h-auto md:w-[380px] md:rounded-2xl md:-translate-x-[110%] xl:w-[420px]'}`}>
        <header className="z-20 flex items-center justify-between border-b border-slate-200/50 bg-transparent px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950 text-amber-400 shadow-inner"><MapPinned className="h-4 w-4" /></span>
            <div><h1 className="text-sm font-black tracking-wide text-slate-900">Smart Job Map</h1><p className="max-w-[250px] text-[10px] font-medium leading-4 text-slate-500">Discover jobs near you.</p></div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setAssistantOpen((open) => !open)} aria-expanded={assistantOpen} className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[10px] font-bold shadow-sm transition ${assistantOpen ? 'border-blue-900 bg-blue-950 text-white' : 'border-slate-200 bg-white text-blue-950 hover:bg-slate-50'}`} title="Smart-assisted search"><Sparkles className="h-3.5 w-3.5" /> Smart Search</button>
            <button type="button" onClick={useCurrentLocation} disabled={isLocating} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-blue-950 shadow-sm transition hover:bg-slate-50 hover:text-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" aria-label={isLocating ? 'Locating…' : 'Use current location'} title="Use current location">{isLocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}</button>
          </div>
        </header>

        {assistantOpen && <JobMapAssistant onFiltersParsed={updateFilters} />}
        <JobMapFilters filters={filters} onFilterChange={updateFilters} onReset={resetFilters} />
        <SmartSummary summary={liveSummary} />

        {activeFilters.length > 0 && (
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
            <div className="flex flex-wrap gap-1.5">
              {activeFilters.map((filter) => (
                <span key={filter.key} className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-[9px] font-bold text-blue-800">
                  {filter.label}
                  <button type="button" onClick={() => updateFilters({ [filter.key]: typeof filters[filter.key] === 'boolean' ? false : '' })} className="text-blue-900 hover:text-blue-950">&times;</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {(locationNotice || !hasLocation) && (
          <div className={`mx-3 mt-2 rounded-lg border px-3 py-2 text-[11px] leading-4 ${hasLocation ? 'border-blue-100 bg-blue-50/70 text-blue-800' : 'border-amber-200 bg-amber-50/70 text-amber-800'}`}>
            {locationNotice || 'Update your address to view nearby jobs on the map. You can still browse the available job list.'}
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50/70 p-3 [scrollbar-gutter:stable]">
          {isLoading ? <><JobSkeleton /><JobSkeleton /><JobSkeleton /></> : error ? (
            <div className="rounded-2xl border border-red-200 bg-white p-5 text-center shadow-sm"><AlertCircle className="mx-auto h-7 w-7 text-red-500" /><h2 className="mt-2 text-sm font-black text-slate-800">Unable to load jobs</h2><p className="mt-1 text-xs leading-5 text-slate-500">{error}</p><button type="button" onClick={() => jobsQuery.refetch()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-950 px-3 py-2 text-xs font-bold text-white shadow transition hover:bg-blue-900"><RefreshCw className="h-3.5 w-3.5" /> Try again</button></div>
          ) : locationRequired ? (
            <div className="rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm"><LocateFixed className="mx-auto h-8 w-8 text-amber-500" /><h2 className="mt-3 text-sm font-black text-slate-800">Location needed for nearby jobs</h2><p className="mt-1 text-xs leading-5 text-slate-500">Update your profile address or allow your current location for this search.</p><button type="button" onClick={useCurrentLocation} disabled={isLocating} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-950 px-3 py-2 text-xs font-bold text-white shadow transition hover:bg-blue-900 disabled:opacity-50">{isLocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />} Use current location</button></div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
              <BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-300" />
              <h2 className="mt-3 text-sm font-black text-slate-800">{highMatchEmpty ? 'No high-match jobs found nearby' : `No jobs found within ${filters.radius_km} km`}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{highMatchEmpty ? 'Try widening the radius or lowering the match filter.' : 'Try widening the radius or clearing your search filters.'}</p>
              {/* One consistent visual language for every secondary action here — solid
                  for the single recommended next step, matching outline treatment for
                  the rest, regardless of where each one navigates to. */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => updateFilters({ radius_km: Math.max(...ALLOWED_RADII) })} className="rounded-lg bg-blue-950 px-3 py-2 text-xs font-bold text-white shadow transition hover:bg-blue-900">Search a wider area</button>
                {highMatchEmpty && <button type="button" onClick={() => updateFilters({ min_match: 0 })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-900">Lower match filter</button>}
                <button type="button" onClick={() => navigate('/seeker/government-programs')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-900">Explore Government Programs</button>
              </div>
            </div>
          ) : jobs.map((job) => (
            <div id={`map-job-${job.post_id}`} key={job.post_id}>
              <JobMapCard job={job} isActive={selectedJobId === job.post_id} isApplying={applyingIds.includes(job.post_id)} isSaving={savingIds.includes(job.post_id)} onClick={() => openDetails(job)} onView={openDetails} onApply={requestApply} onSave={handleSave} onTraining={viewTraining} onJobFair={handleJobFair} />
            </div>
          ))}
          {!isFetching && !error && jobs.length >= Number(filters.limit) && Number(filters.limit) < 100 && (
            <button
              type="button"
              onClick={() => updateFilters({ limit: Math.min(100, Number(filters.limit) + 20) })}
              className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs font-black text-blue-900 shadow-sm transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Load more vacancies
            </button>
          )}
        </div>
      </aside>

      {!panelOpen && (
        <button type="button" onClick={() => setPanelOpen(true)} className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-4 py-2.5 text-xs font-bold text-blue-950 shadow-lg backdrop-blur hover:bg-white md:left-6 md:top-6">
          <PanelLeftOpen className="h-4 w-4" /> Show {jobs.length} jobs
        </button>
      )}

      {/* Floating Details Panel */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <JobMapDetailsPanel job={detailsJob} isLoading={detailLoadingId === selectedJobId} loadError={detailError} onClose={() => { detailAbortRef.current?.abort(); setSelectedJobId(null); setDetailError('') }} onApply={requestApply} onSave={handleSave} onTraining={viewTraining} onJobFair={handleJobFair} onApplicationStatus={() => navigate('/seeker/applications')} onReport={(job) => setReportTarget({ employer_id: job.employer_id || job.employer?.employer_id, employer_name: job.employer_name })} isApplying={detailsJob ? applyingIds.includes(detailsJob.post_id) : false} isSaving={detailsJob ? savingIds.includes(detailsJob.post_id) : false} />
      </div>

      <ApplyConfirmation job={pendingApplyJob} onCancel={() => setPendingApplyJobId(null)} onConfirm={submitApplication} applying={pendingApplyJob ? applyingIds.includes(pendingApplyJob.post_id) : false} />
      <ReportEmployerModal open={Boolean(reportTarget)} employer={reportTarget} onClose={() => setReportTarget(null)} />
      <JobFairInfoModal fair={jobFairPopup} open={Boolean(jobFairPopup)} onClose={() => setJobFairPopup(null)} />
    </div>
  )
}
