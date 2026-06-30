import { createElement, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock3,
  Filter,
  GraduationCap,
  Layers3,
  List,
  Map,
  MapPin,
  Newspaper,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  UserRound,
  WalletCards,
  X,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { applyToJob, toggleSavedJob as toggleSavedJobApi } from '@/services/seekerService'

const feedTabs = [
  { key: 'smart', label: 'Smart Matches', icon: Star },
  { key: 'saved', label: 'Saved Jobs', icon: BookmarkCheck },
  { key: 'bulletin', label: 'PESO Bulletin', icon: Newspaper },
]

const quickFilterOptions = [
  { key: 'distance10', label: '< 10km', icon: MapPin },
  { key: 'fullTime', label: 'Full-Time', icon: BriefcaseBusiness },
  { key: 'remoteHybrid', label: 'Remote/Hybrid', icon: Building2 },
  { key: 'highMatch', label: '>80% Match', icon: Star },
]

const sortOptions = [
  { value: 'match', label: 'Highest Match Score (Merit)' },
  { value: 'distance', label: 'Closest Distance (GPS)' },
  { value: 'newest', label: 'Newest' },
]

const jobLevels = ['Entry', 'Mid', 'Senior']

const emptyFilters = {
  salaryMin: '',
  salaryMax: '',
  levels: [],
  datePosted: 'any',
}

const fallbackJobs = []

const bulletins = []

export default function JobSeekerHome({
  profile = null,
  user = null,
  jobsData = null,
  analyticsData = null,
  error = '',
  jobsError = '',
}) {
  const [draftQuery, setDraftQuery] = useState('')
  const [draftLocation, setDraftLocation] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [activeTab, setActiveTab] = useState('smart')
  const [sortMode, setSortMode] = useState('match')
  const [viewMode, setViewMode] = useState('list')
  const [selectedJob, setSelectedJob] = useState(null)
  const [savedJobIds, setSavedJobIds] = useState(profile?.dashboard_stats?.saved_jobs || [])
  const [activeQuickFilters, setActiveQuickFilters] = useState([])
  const [filters, setFilters] = useState(emptyFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [appliedJobs, setAppliedJobs] = useState({})
  const [applyingJobIds, setApplyingJobIds] = useState([])

  useEffect(() => {
    if (profile?.dashboard_stats?.saved_jobs) {
      setSavedJobIds(profile.dashboard_stats.saved_jobs.map(String))
    }
  }, [profile])

  const seeker = useMemo(() => buildSeekerView(profile, user), [profile, user])
  const apiJobs = useMemo(() => normalizeApiJobs(jobsData?.jobs ?? []), [jobsData])
  const quickFilterSet = useMemo(() => new Set(activeQuickFilters), [activeQuickFilters])

  const jobs = useMemo(() => {
    const source = apiJobs.length ? apiJobs : fallbackJobs

    return source.map((job) => ({
      ...job,
      hasApplied: Boolean(appliedJobs[job.id]) || job.hasApplied,
      applicationStatus: appliedJobs[job.id]?.status ?? job.applicationStatus,
      applicationId: appliedJobs[job.id]?.apply_id ?? job.applicationId,
    }))
  }, [apiJobs, appliedJobs])

  const usingFallbackJobs = apiJobs.length === 0
  const savedJobs = useMemo(
    () => jobs.filter((job) => savedJobIds.includes(job.id)),
    [jobs, savedJobIds],
  )

  const filteredJobs = useMemo(() => {
    const source = activeTab === 'saved' ? savedJobs : jobs
    const query = normalizeText(searchQuery)
    const location = normalizeText(locationQuery)

    return source
      .filter((job) => {
        if (!query) return true

        return normalizeText([
          job.title,
          job.company,
          job.location,
          job.salaryRange,
          job.workSetup,
          job.employmentType,
          job.jobLevel,
          ...job.requiredSkills,
        ].join(' ')).includes(query)
      })
      .filter((job) => !location || normalizeText(job.location).includes(location))
      .filter((job) => !quickFilterSet.has('distance10') || Number(job.distanceKm) <= 10)
      .filter((job) => !quickFilterSet.has('fullTime') || isFullTime(job.employmentType))
      .filter((job) => !quickFilterSet.has('remoteHybrid') || isRemoteOrHybrid(job.workSetup))
      .filter((job) => !quickFilterSet.has('highMatch') || Number(job.matchScore) >= 80)
      .filter((job) => !filters.salaryMin || Number(job.salaryMax || job.salaryMin || 0) >= Number(filters.salaryMin))
      .filter((job) => !filters.salaryMax || Number(job.salaryMin || job.salaryMax || 0) <= Number(filters.salaryMax))
      .filter((job) => filters.levels.length === 0 || filters.levels.includes(job.jobLevel))
      .filter((job) => matchesDateFilter(job.postedAt, filters.datePosted))
  }, [activeTab, filters, jobs, locationQuery, quickFilterSet, savedJobs, searchQuery])

  const visibleJobs = useMemo(
    () => sortJobs(filteredJobs, sortMode),
    [filteredJobs, sortMode],
  )

  const topMatch = useMemo(
    () => sortJobs(jobs, 'match')[0],
    [jobs],
  )

  const activeApplications = Number(profile?.dashboard_stats?.active_applications ?? 0)

  useEffect(() => {
    const next = {}

    for (const job of apiJobs) {
      if (job.hasApplied) {
        next[job.id] = {
          apply_id: job.applicationId,
          status: job.applicationStatus ?? 'pending',
        }
      }
    }

    setAppliedJobs(next)
  }, [apiJobs])

  const submitSearch = (event) => {
    event.preventDefault()
    setSearchQuery(draftQuery)
    setLocationQuery(draftLocation)
    if (activeTab === 'bulletin') setActiveTab('smart')
  }

  const clearSearch = () => {
    setDraftQuery('')
    setDraftLocation('')
    setSearchQuery('')
    setLocationQuery('')
  }

  const toggleQuickFilter = (key) => {
    setActiveQuickFilters((current) => (
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    ))
  }

  const toggleSavedJob = async (job) => {
    const isSaved = savedJobIds.includes(String(job.id))
    const nextSaved = isSaved
      ? savedJobIds.filter((savedJobId) => savedJobId !== String(job.id))
      : [...savedJobIds, String(job.id)]

    setSavedJobIds(nextSaved)
    
    try {
      await toggleSavedJobApi(job.id)
      toast.success(isSaved ? `${job.title} removed from saved jobs.` : `${job.title} saved.`)
    } catch (caught) {
      // Revert on error
      setSavedJobIds(savedJobIds)
      toast.error('Failed to update saved jobs.')
    }
  }

  const handleQuickApply = async (job) => {
    if (String(job.id).startsWith('local-')) {
      toast.error('This is only a sample job. Apply from a live employer vacancy.')
      return
    }

    if (job.hasApplied) {
      toast.success(`You already applied to ${job.title}.`)
      return
    }

    setApplyingJobIds((current) => [...current, job.id])

    try {
      const data = await applyToJob(job.id)
      setAppliedJobs((current) => ({
        ...current,
        [job.id]: {
          apply_id: data.application?.apply_id,
          status: data.application?.status ?? 'pending',
        },
      }))
      toast.success(`Application submitted for ${job.title}.`)
      setSelectedJob(null)
    } catch (caught) {
      const body = caught.response?.data
      const firstError = body?.errors ? Object.values(body.errors)[0]?.[0] : ''
      toast.error(firstError || body?.message || 'Unable to submit application.')
    } finally {
      setApplyingJobIds((current) => current.filter((id) => id !== job.id))
    }
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="portal-page space-y-6">
        {(error || jobsError) && (
          <div className="grid gap-3">
            {error && <Notice tone="danger" message={error} />}
            {jobsError && (
              <Notice
                tone="warning"
                message={`${jobsError} Showing a sample local feed until live nearby matches are available.`}
              />
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,2fr)] lg:items-start">
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <ProfileSnapshot seeker={seeker} activeApplications={activeApplications} />
            <NextBestAction profile={profile} seeker={seeker} />
            {analyticsData && <ProfileViewsAnalytics analytics={analyticsData} />}
            <MatchingEngineCard />
          </aside>

          <main className="space-y-5">
            <SearchPanel
              seeker={seeker}
              topMatch={topMatch}
              usingFallbackJobs={usingFallbackJobs}
              radiusKm={Number(jobsData?.radius_km ?? 20)}
              draftQuery={draftQuery}
              draftLocation={draftLocation}
              activeQuickFilters={activeQuickFilters}
              onQueryChange={setDraftQuery}
              onLocationChange={setDraftLocation}
              onClear={clearSearch}
              onSubmit={submitSearch}
              onToggleQuickFilter={toggleQuickFilter}
              onOpenFilters={() => setFiltersOpen(true)}
            />

            <FeedControls
              activeTab={activeTab}
              savedCount={savedJobIds.length}
              resultCount={activeTab === 'bulletin' ? bulletins.length : visibleJobs.length}
              sortMode={sortMode}
              viewMode={viewMode}
              onTabChange={setActiveTab}
              onSortChange={setSortMode}
              onViewChange={setViewMode}
            />

            {activeTab === 'bulletin' ? (
              <section className="space-y-4">
                {bulletins.map((item) => (
                  <BulletinCard key={item.id} item={item} />
                ))}
              </section>
            ) : viewMode === 'map' ? (
              <MapPlaceholder jobs={visibleJobs} />
            ) : (
              <section className="space-y-4">
                {visibleJobs.length ? (
                  visibleJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      saved={savedJobIds.includes(job.id)}
                      applying={applyingJobIds.includes(job.id)}
                      onSave={() => toggleSavedJob(job)}
                      onDetails={() => setSelectedJob(job)}
                      onQuickApply={() => handleQuickApply(job)}
                    />
                  ))
                ) : (
                  <EmptyFeedState
                    title={activeTab === 'saved' ? 'No saved jobs yet' : 'No exact matches found'}
                    text={activeTab === 'saved'
                      ? 'Save promising vacancies from Smart Matches so you can compare them later.'
                      : 'No exact matches found with these strict filters. Try expanding your radius or removing the salary minimum.'}
                  />
                )}
              </section>
            )}
          </main>
        </div>

        {selectedJob && (
          <JobDetailModal
            job={selectedJob}
            saved={savedJobIds.includes(selectedJob.id)}
            onClose={() => setSelectedJob(null)}
            onSave={() => toggleSavedJob(selectedJob)}
            onQuickApply={() => handleQuickApply(selectedJob)}
            applying={applyingJobIds.includes(selectedJob.id)}
          />
        )}

        {filtersOpen && (
          <FilterDrawer
            filters={filters}
            onChange={setFilters}
            onClose={() => setFiltersOpen(false)}
            onClear={() => setFilters(emptyFilters)}
          />
        )}
      </div>
    </div>
  )
}

function SearchPanel({
  seeker,
  topMatch,
  usingFallbackJobs,
  radiusKm,
  draftQuery,
  draftLocation,
  activeQuickFilters,
  onQueryChange,
  onLocationChange,
  onClear,
  onSubmit,
  onToggleQuickFilter,
  onOpenFilters,
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4 sm:p-5">
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={draftQuery}
              onChange={(event) => onQueryChange(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 hover:bg-white pl-12 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="Search by title, skill, or company"
            />
          </div>

          <div className="relative flex-1">
            <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={draftLocation}
              onChange={(event) => onLocationChange(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 hover:bg-white pl-12 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="City, province, or region"
            />
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              Search
            </button>
            {(draftQuery || draftLocation) && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                aria-label="Clear search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </form>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {quickFilterOptions.map((filter) => (
            <QuickFilterPill
              key={filter.key}
              filter={filter}
              active={activeQuickFilters.includes(filter.key)}
              onClick={() => onToggleQuickFilter(filter.key)}
            />
          ))}
          <button
            type="button"
            onClick={onOpenFilters}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            <Settings2 className="h-4 w-4" />
            All Filters
          </button>
        </div>
      </div>

      {usingFallbackJobs && (
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs font-semibold leading-5 text-amber-800">
          Showing a preview feed. Update your location in your profile to enable GPS-based nearby matching.
        </div>
      )}
    </section>
  )
}

function QuickFilterPill({ filter, active, onClick }) {
  const Icon = filter.icon

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-black shadow-sm transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${
        active
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
      }`}
    >
      {createElement(Icon, { className: 'h-4 w-4' })}
      {filter.label}
    </button>
  )
}

function FeedControls({
  activeTab,
  savedCount,
  resultCount,
  sortMode,
  viewMode,
  onTabChange,
  onSortChange,
  onViewChange,
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {feedTabs.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.key

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black transition ${
                  active
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.key === 'saved' && savedCount > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {savedCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            {resultCount} result{resultCount === 1 ? '' : 's'}
          </span>

          {activeTab !== 'bulletin' && (
            <>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                Sort by
                <select
                  value={sortMode}
                  onChange={(event) => onSortChange(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1 shadow-sm">
                <ViewToggleButton active={viewMode === 'list'} icon={List} label="List" onClick={() => onViewChange('list')} />
                <ViewToggleButton active={viewMode === 'map'} icon={Map} label="Map" onClick={() => onViewChange('map')} />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function ViewToggleButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-700'
      }`}
    >
      {createElement(Icon, { className: 'h-4 w-4' })}
      {label}
    </button>
  )
}

function JobCard({ job, saved = false, applying = false, onSave, onDetails, onQuickApply }) {
  const matchMeta = matchMetaFor(job.matchScore)

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg cursor-pointer group" onClick={onDetails}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <CompanyMark company={job.company} />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-blue-700 group-hover:underline">{job.title}</h2>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{job.company}</p>
            <p className="mt-0.5 text-sm text-slate-500 flex items-center gap-1.5 flex-wrap">
              <span>{job.location}</span>
              {job.distanceKm != null && (
                <>
                  <span className="text-slate-300">&bull;</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/> {formatDistance(job.distanceKm)}</span>
                </>
              )}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1"><WalletCards className="h-3.5 w-3.5"/> {job.salaryRange}</span>
              <span className="text-slate-300">&bull;</span>
              <span className="flex items-center gap-1"><BriefcaseBusiness className="h-3.5 w-3.5"/> {job.workSetup || 'Not specified'}</span>
            </p>
          </div>
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); onSave(); }} 
            className="text-slate-400 hover:text-blue-600 transition p-2 hover:bg-blue-50 rounded-full"
            aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
          >
            {saved ? <BookmarkCheck className="h-6 w-6 text-blue-600" /> : <Bookmark className="h-6 w-6" />}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <ScoreBadge icon={Star} label={`${job.matchScore}% Match`} className={matchMeta.className} />
          {job.requiredSkills.slice(0, 3).map((skill) => (
            <span key={skill} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {skill}
            </span>
          ))}
          {job.requiredSkills.length > 3 && (
            <span className="text-xs font-semibold text-slate-400">+{job.requiredSkills.length - 3} more</span>
          )}
        </div>
        
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
          <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            {job.missingCriticalSkills.length ? (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5"/> Missing {job.missingCriticalSkills.length} skill{job.missingCriticalSkills.length > 1 ? 's' : ''}
              </span>
            ) : (
              <><ShieldCheck className="h-3.5 w-3.5"/> Strong Match</>
            )}
          </p>
          
          <div className="flex gap-2">
            <span className="text-xs text-slate-500 self-center mr-2">{formatDate(job.postedAt) || 'recently'}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onQuickApply(); }}
              disabled={job.hasApplied || applying}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Zap className="h-3.5 w-3.5" />
              {job.hasApplied ? 'Applied' : applying ? 'Wait...' : 'Easy Apply'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function ProfileSnapshot({ seeker, activeApplications }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-20 bg-gradient-to-r from-blue-700 to-indigo-800">
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
          <img src={seeker.profilePhoto} alt={seeker.name} className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-md" />
        </div>
      </div>
      
      <div className="pt-10 px-5 pb-4 text-center">
        <h2 className="text-lg font-black text-slate-950 truncate hover:underline cursor-pointer">
          <Link to="/seeker/profile">{seeker.name}</Link>
        </h2>
        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{seeker.headline}</p>
      </div>

      <div className="border-t border-slate-100 py-3">
        <div className="px-5 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition">
          <span className="text-xs font-semibold text-slate-500">Profile Readiness</span>
          <span className="text-xs font-black text-blue-700">{seeker.nsrpCompletion}%</span>
        </div>
        <div className="px-5 pb-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500" style={{ width: `${Math.min(seeker.nsrpCompletion, 100)}%` }} />
          </div>
        </div>
        <div className="px-5 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition">
          <span className="text-xs font-semibold text-slate-500">Active Applications</span>
          <span className="text-xs font-black text-blue-700">{activeApplications}</span>
        </div>
      </div>

      <div className="border-t border-slate-100 p-4">
        <Link to="/seeker/profile" className="flex w-full min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50">
          <UserRound className="h-4 w-4" />
          Manage Profile
        </Link>
      </div>
    </section>
  )
}

function ProfileViewsAnalytics({ analytics }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
          <UserRound className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-black text-slate-950">Profile Analytics</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Past 30 days visibility</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <SidebarStat label="Profile Views" value={analytics.total_views_30_days} />
        <SidebarStat label="Search Appearances" value={analytics.search_appearances} />
      </div>

      {analytics.recent_viewers?.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Recent Viewers</p>
          <ul className="mt-3 space-y-3 text-sm font-semibold text-slate-700">
            {analytics.recent_viewers.map((viewer, i) => (
              <li key={i} className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">{viewer.company_name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function NextBestAction({ profile, seeker }) {
  const action = nextBestAction(profile, seeker)

  return (
    <section className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-white p-2 text-indigo-600 shadow-sm">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Next Best Action</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">{action.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
        </div>
      </div>
      <Link
        to={action.href}
        className="mt-5 inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700"
      >
        <Sparkles className="h-4 w-4" />
        {action.cta}
      </Link>
    </section>
  )
}

function MatchingEngineCard() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
          <Layers3 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-black text-slate-950">How your feed is ranked</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            i-PESO separates merit score from GPS distance so qualified applicants are not hidden just because another job is closer.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <EngineRow icon={Star} title="Merit Score" text="Occupation, skills, experience, and education." />
        <EngineRow icon={MapPin} title="GPS Distance" text="Nearby jobs can still be sorted by commute distance." />
      </div>
    </section>
  )
}

function FilterDrawer({ filters, onChange, onClose, onClear }) {
  const update = (name, value) => onChange({ ...filters, [name]: value })
  const toggleLevel = (level) => {
    update(
      'levels',
      filters.levels.includes(level)
        ? filters.levels.filter((item) => item !== level)
        : [...filters.levels, level],
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 px-3 py-3 sm:px-5">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close filters" />
      <aside className="relative flex h-full w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Advanced Filters</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Refine job matches</h2>
            <p className="mt-1 text-sm text-slate-500">Use stricter controls only when you have too many results.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Close filter drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <FilterSection title="Salary Range" icon={WalletCards}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Minimum</span>
                <input
                  type="number"
                  min="0"
                  value={filters.salaryMin}
                  onChange={(event) => update('salaryMin', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  placeholder="PHP 0"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Maximum</span>
                <input
                  type="number"
                  min="0"
                  value={filters.salaryMax}
                  onChange={(event) => update('salaryMax', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  placeholder="No max"
                />
              </label>
            </div>
            <div className="mt-4 space-y-3">
              <input
                type="range"
                min="0"
                max="100000"
                step="1000"
                value={filters.salaryMin || 0}
                onChange={(event) => update('salaryMin', event.target.value)}
                className="w-full accent-blue-600"
                aria-label="Minimum salary range"
              />
              <input
                type="range"
                min="0"
                max="100000"
                step="1000"
                value={filters.salaryMax || 100000}
                onChange={(event) => update('salaryMax', event.target.value)}
                className="w-full accent-blue-600"
                aria-label="Maximum salary range"
              />
            </div>
          </FilterSection>

          <FilterSection title="Job Level" icon={GraduationCap}>
            <div className="flex flex-wrap gap-2">
              {jobLevels.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleLevel(level)}
                  className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                    filters.levels.includes(level)
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Date Posted" icon={Clock3}>
            <div className="grid gap-2">
              {[
                { value: 'any', label: 'Any time' },
                { value: 'day', label: 'Past 24 hours' },
                { value: 'week', label: 'Past week' },
              ].map((option) => (
                <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  <input
                    type="radio"
                    name="datePosted"
                    value={option.value}
                    checked={filters.datePosted === option.value}
                    onChange={(event) => update('datePosted', event.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-600"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </FilterSection>
        </div>

        <div className="flex gap-3 border-t border-slate-200 p-5">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </aside>
    </div>
  )
}

function FilterSection({ title, icon: Icon, children }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
        {createElement(Icon, { className: 'h-4 w-4 text-blue-600' })}
        {title}
      </h3>
      {children}
    </section>
  )
}

function MapPlaceholder({ jobs }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="relative min-h-[30rem] bg-gradient-to-br from-blue-50 via-slate-50 to-emerald-50 p-6">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(#cbd5e1_1px,transparent_1px),linear-gradient(90deg,#cbd5e1_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative z-10 max-w-md rounded-xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
              <Map className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-black text-slate-950">Map view preview</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                This layout is ready for the live map layer. Current filtered jobs are represented as location pins.
              </p>
            </div>
          </div>
        </div>

        {jobs.slice(0, 8).map((job, index) => (
          <div
            key={job.id}
            className="absolute z-10 rounded-full border-4 border-white bg-blue-600 p-2 text-white shadow-lg"
            style={{
              left: `${18 + ((index * 17) % 68)}%`,
              top: `${28 + ((index * 19) % 48)}%`,
            }}
            title={`${job.title} - ${formatDistance(job.distanceKm)}`}
          >
            <MapPin className="h-4 w-4" />
          </div>
        ))}

        {!jobs.length && (
          <div className="relative z-10 mt-32">
            <EmptyFeedState
              title="No map pins to show"
              text="No exact matches found with these strict filters. Try expanding your radius or removing the salary minimum."
            />
          </div>
        )}
      </div>
    </section>
  )
}

function JobDetailModal({ job, saved, applying = false, onClose, onSave, onQuickApply }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              <Layers3 className="h-3.5 w-3.5" />
              Match explanation
            </div>
            <h2 className="mt-3 text-xl font-black text-slate-950">{job.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{job.company} / {job.location}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close details">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <Fact icon={Star} label="Merit" value={`${job.matchScore}%`} />
            <Fact icon={MapPin} label="Distance" value={formatDistance(job.distanceKm)} />
            <Fact icon={WalletCards} label="Salary" value={job.salaryRange} />
            <Fact icon={CalendarDays} label="Deadline" value={formatDate(job.deadline) || 'Open'} />
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-black text-slate-950">Why this appears in your feed</h3>
            <div className="mt-4 space-y-3">
              {Object.entries(job.matchSummary).map(([key, value]) => (
                <ScoreRow key={key} label={titleCase(key)} value={value} />
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-black text-slate-950">Required skills</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.requiredSkills.map((skill) => (
                  <span key={skill} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-black text-slate-950">Skill gaps</h3>
              {job.missingCriticalSkills.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.missingCriticalSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">No critical skill gap was detected from the current job requirement data.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-black text-slate-950">Job description</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{job.description || 'The employer has not added a detailed description yet.'}</p>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onSave}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {saved ? 'Saved' : 'Save Job'}
          </button>
          <button
            type="button"
            onClick={onQuickApply}
            disabled={job.hasApplied || applying}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Zap className="h-4 w-4" />
            {job.hasApplied ? `Applied: ${titleCase(job.applicationStatus || 'pending')}` : applying ? 'Submitting...' : '1-Click Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BulletinCard({ item }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        <span className={`rounded-xl p-3 ${item.priority === 'high' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
          <Bell className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-slate-950">{item.title}</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{item.type}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{item.date}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{item.location}</span>
          </div>
        </div>
      </div>
    </article>
  )
}

function EmptyFeedState({ title, text }) {
  return (
    <div className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-50">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
          <SlidersHorizontal className="h-8 w-8 text-blue-600" />
        </div>
      </div>
      <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{text}</p>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        {createElement(Icon, { className: 'h-4 w-4' })}
      </span>
      <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function MiniFact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
        {createElement(Icon, { className: 'h-3.5 w-3.5' })}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-slate-900">{value}</p>
    </div>
  )
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
        {createElement(Icon, { className: 'h-3.5 w-3.5' })}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-slate-900">{value}</p>
    </div>
  )
}

function ScoreBadge({ icon: Icon, label, className }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${className}`}>
      {createElement(Icon, { className: 'h-3.5 w-3.5' })}
      {label}
    </span>
  )
}

function ScorePill({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-500">{label}</span>
        <span className="text-xs font-black text-slate-900">{Math.round(value)}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

function ScoreRow({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        <span className="text-sm font-black text-slate-950">{Math.round(value)}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

function CompanyMark({ company }) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-50 shadow-sm text-sm font-black text-slate-500">
      {companyMonogram(company)}
    </div>
  )
}

function SidebarStat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  )
}

function EngineRow({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3 rounded-xl bg-slate-50 p-3">
      {createElement(Icon, { className: 'mt-0.5 h-4 w-4 shrink-0 text-blue-700' })}
      <div>
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  )
}

function Notice({ message, tone }) {
  const classes = tone === 'danger'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-amber-200 bg-amber-50 text-amber-800'

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm ${classes}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  )
}

function buildSeekerView(profile, user) {
  const preferredOccupation = profile?.occupations?.find((occupation) => (
    occupation?.occupation_title
    || occupation?.general_term
    || occupation?.raw_job_title
  ))

  const name = fullName(profile) || user?.name || 'Job Seeker'

  return {
    name,
    firstName: profile?.first_name || user?.name?.split(' ')[0] || name.split(' ')[0] || 'there',
    profilePhoto: createAvatarDataUrl(name),
    headline: preferredOccupation?.occupation_title
      || preferredOccupation?.general_term
      || preferredOccupation?.raw_job_title
      || profile?.educ_attainment
      || 'Job seeker',
    nsrpCompletion: Math.round(Number(profile?.profile_strength?.percentage ?? 0)),
  }
}

function normalizeApiJobs(rows) {
  return rows.map((row) => {
    const match = row.match ?? {}
    const factors = match.factors ?? {}
    const requiredSkills = [
      ...(Array.isArray(row.required_skills) ? row.required_skills : []),
      ...(Array.isArray(row.soft_skills) ? row.soft_skills : []),
    ].filter(Boolean)
    const experienceLevel = String(row.experience_level ?? '')

    return {
      id: String(row.post_id ?? row.id),
      title: row.job_title ?? 'Untitled vacancy',
      company: row.employer?.company_name ?? 'PESO Partner Employer',
      location: [row.barangay, row.city_municipality, row.province].filter(Boolean).join(', ') || row.location || 'Location not specified',
      distanceKm: Number(row.distance_km ?? 0),
      salaryMin: Number(row.salary_min ?? 0),
      salaryMax: Number(row.salary_max ?? 0),
      salaryRange: formatSalary(row),
      requiredSkills,
      matchScore: Math.round(Number(match.percentage ?? match.total_score ?? 0)),
      workSetup: normalizeWorkSetup(row.work_setup),
      employmentType: normalizeEmploymentType(row.employment_type),
      jobLevel: inferJobLevel(experienceLevel, row.minimum_experience_months),
      vacancies: row.vacancies_count,
      postedAt: row.posted_at,
      deadline: row.application_deadline,
      description: row.job_description,
      hasApplied: Boolean(row.has_applied),
      applicationId: row.application_id,
      applicationStatus: row.application_status,
      matchSummary: {
        occupation: factorScore(factors.occupation),
        skills: factorScore(factors.skills),
        experience: factorScore(factors.experience),
        education: factorScore(factors.education),
      },
      missingCriticalSkills: normalizeMissingSkills(match.missing_critical_skills),
    }
  }).filter((job) => job.id)
}

function normalizeMissingSkills(skills) {
  if (!Array.isArray(skills)) return []

  return skills
    .map((skill) => (typeof skill === 'string' ? skill : skill?.skill ?? skill?.name))
    .filter(Boolean)
}

function factorScore(factor) {
  return Math.round(Number(factor?.score ?? 0))
}

function sortJobs(rows, sortMode) {
  return [...rows].sort((left, right) => {
    if (sortMode === 'distance') {
      return Number(left.distanceKm) - Number(right.distanceKm) || Number(right.matchScore) - Number(left.matchScore)
    }

    if (sortMode === 'newest') {
      return dateValue(right.postedAt) - dateValue(left.postedAt) || Number(right.matchScore) - Number(left.matchScore)
    }

    return Number(right.matchScore) - Number(left.matchScore) || Number(left.distanceKm) - Number(right.distanceKm)
  })
}

function matchesDateFilter(postedAt, filter) {
  if (filter === 'any') return true

  const posted = dateValue(postedAt)
  if (!posted) return false

  const ageMs = Date.now() - posted
  if (filter === 'day') return ageMs <= 24 * 60 * 60 * 1000
  if (filter === 'week') return ageMs <= 7 * 24 * 60 * 60 * 1000

  return true
}

function nextBestAction(profile, seeker) {
  const summary = profile?.professional_summary || profile?.summary || profile?.about_me
  const checks = profile?.profile_strength?.checks ?? profile?.profile_strength?.items ?? []
  const missing = checks.find((check) => !check.complete)

  if (!summary) {
    return {
      title: 'Add your Professional Summary',
      description: 'You are missing a short About Me section. Add one with AI to make your profile easier for employers to understand.',
      cta: 'Open Profile to Add with AI',
      href: '/seeker/profile',
    }
  }

  if (missing) {
    return {
      title: missing.label || 'Complete your profile',
      description: 'This missing item can improve match quality and make your resume studio output stronger.',
      cta: 'Open Profile',
      href: '/seeker/profile',
    }
  }

  if (seeker.nsrpCompletion < 90) {
    return {
      title: 'Polish your employment profile',
      description: 'Your profile is usable, but a few final details can improve referrals and resume quality.',
      cta: 'Review Profile',
      href: '/seeker/profile',
    }
  }

  return {
    title: 'Apply to a high-match job',
    description: 'Your profile is strong. Start with jobs above 80% merit match and compare distance before applying.',
    cta: 'Review Matches',
    href: '/seeker/dashboard',
  }
}

function isFullTime(value) {
  const normalized = normalizeText(value)
  return normalized.includes('full') || normalized.includes('permanent') || normalized.includes('regular')
}

function isRemoteOrHybrid(value) {
  const normalized = normalizeText(value)
  return normalized.includes('remote') || normalized.includes('hybrid') || normalized.includes('wfh')
}

function inferJobLevel(experienceLevel, months) {
  const normalized = normalizeText(experienceLevel)
  const requiredMonths = Number(months ?? 0)

  if (normalized.includes('5') || requiredMonths >= 60) return 'Senior'
  if (normalized.includes('3') || requiredMonths >= 24) return 'Mid'
  return 'Entry'
}

function normalizeEmploymentType(value) {
  const raw = String(value ?? '').replaceAll('_', ' ').trim()
  if (!raw) return 'Not specified'
  if (normalizeText(raw).includes('permanent')) return 'Full-Time'
  return titleCase(raw)
}

function normalizeWorkSetup(value) {
  const raw = String(value ?? '').replaceAll('_', ' ').trim()
  if (!raw) return 'Not specified'
  if (normalizeText(raw).includes('on site')) return 'On-site'
  return titleCase(raw)
}

function formatSalary(job) {
  if (job.hide_salary) return 'Salary hidden'
  const min = Number(job.salary_min ?? job.salaryMin ?? 0)
  const max = Number(job.salary_max ?? job.salaryMax ?? 0)
  const type = job.salary_type ? ` / ${String(job.salary_type).toLowerCase()}` : ''

  if (min && max) return `${currency(min)} - ${currency(max)}${type}`
  if (min) return `${currency(min)}+${type}`
  if (max) return `Up to ${currency(max)}${type}`
  return 'Salary not specified'
}

function currency(value) {
  return `PHP ${Number(value).toLocaleString('en-PH')}`
}

function formatDistance(value) {
  if (value == null) return 'Distance Unknown'
  const distance = Number(value)
  return `${distance.toFixed(distance >= 10 ? 0 : 1)}km`
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function dateValue(value) {
  if (!value) return 0
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function fullName(profile) {
  if (!profile) return ''
  return [profile.first_name, profile.middle_name, profile.last_name, profile.suffix].filter(Boolean).join(' ')
}

function createAvatarDataUrl(name, startColor = '#123563', endColor = '#1d4ed8') {
  const initials = initialsFor(name)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="avatarGradient" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
          <stop stop-color="${startColor}" />
          <stop offset="1" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="28" fill="url(#avatarGradient)" />
      <text x="50%" y="54%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="42" font-weight="700">${initials}</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function initialsFor(name) {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'JS'
}

function companyMonogram(company) {
  return String(company)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || 'PE'
}

function matchMetaFor(score) {
  if (score >= 90) {
    return { className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
  }

  if (score >= 80) {
    return { className: 'border-blue-200 bg-blue-50 text-blue-700' }
  }

  if (score >= 60) {
    return { className: 'border-amber-200 bg-amber-50 text-amber-700' }
  }

  return { className: 'border-slate-200 bg-slate-100 text-slate-600' }
}

function titleCase(value) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}
