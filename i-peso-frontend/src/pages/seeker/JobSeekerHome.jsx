import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  Filter,
  Layers3,
  MapPin,
  Search,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { applyToJob, toggleSavedJob as toggleSavedJobApi } from '@/services/seekerService'

const feedTabs = [
  { key: 'smart', label: 'Jobs', icon: Star },
  { key: 'saved', label: 'Saved Jobs', icon: BookmarkCheck },
]

const sortOptions = [
  { value: 'match', label: 'Highest Match Score (Merit)' },
  { value: 'distance', label: 'Closest Distance (GPS)' },
  { value: 'newest', label: 'Newest' },
]

const JOBS_PER_BATCH = 6

export default function JobSeekerHome({
  profile = null,
  user = null,
  recommendedJobsData = null,
  nearbyJobsData = null,
  latestJobsData = null,
  locationState = 'unknown',
  analyticsData = null,
  error = '',
  jobsError = '',
  jobsLoading = false,
}) {
  const [draftQuery, setDraftQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('smart')
  const [sortMode, setSortMode] = useState('match')
  const [selectedJob, setSelectedJob] = useState(null)
  const [savedJobIds, setSavedJobIds] = useState(profile?.dashboard_stats?.saved_jobs || [])
  const [appliedJobs, setAppliedJobs] = useState({})
  const [applyingJobIds, setApplyingJobIds] = useState([])
  const [jobFeedMode, setJobFeedMode] = useState('recommended')
  const [visibleCount, setVisibleCount] = useState(JOBS_PER_BATCH)
  const loadMoreRef = useRef(null)

  useEffect(() => {
    if (profile?.dashboard_stats?.saved_jobs) {
      setSavedJobIds(profile.dashboard_stats.saved_jobs.map(String))
    }
  }, [profile])

  const seeker = useMemo(() => buildSeekerView(profile, user), [profile, user])
  const feedJobs = useMemo(() => ({
    recommended: normalizeApiJobs(recommendedJobsData?.jobs ?? []),
    nearby: normalizeApiJobs(nearbyJobsData?.jobs ?? []),
    latest: normalizeApiJobs(latestJobsData?.jobs ?? []),
  }), [latestJobsData, nearbyJobsData, recommendedJobsData])
  const apiJobs = useMemo(() => feedJobs[jobFeedMode] ?? [], [feedJobs, jobFeedMode])
  const hasLocation = locationState === 'available'

  const jobs = useMemo(() => {
    return apiJobs.map((job) => ({
      ...job,
      hasApplied: Boolean(appliedJobs[job.id]) || job.hasApplied,
      applicationStatus: appliedJobs[job.id]?.status ?? job.applicationStatus,
      applicationId: appliedJobs[job.id]?.apply_id ?? job.applicationId,
    }))
  }, [apiJobs, appliedJobs])

  const usingFallbackJobs = jobFeedMode === 'latest'

  useEffect(() => {
    if (feedJobs.recommended.length) {
      setJobFeedMode('recommended')
    } else if (hasLocation && feedJobs.nearby.length) {
      setJobFeedMode('nearby')
    } else {
      setJobFeedMode('latest')
    }
  }, [feedJobs.latest.length, feedJobs.nearby.length, feedJobs.recommended.length, hasLocation])
  const savedJobs = useMemo(
    () => jobs.filter((job) => savedJobIds.includes(job.id)),
    [jobs, savedJobIds],
  )

  const filteredJobs = useMemo(() => {
    const source = activeTab === 'saved' ? savedJobs : jobs
    const query = normalizeText(searchQuery)
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
  }, [activeTab, jobs, savedJobs, searchQuery])

  const visibleJobs = useMemo(
    () => sortJobs(filteredJobs, sortMode),
    [filteredJobs, sortMode],
  )
  const visibleFeedJobs = useMemo(
    () => visibleJobs.slice(0, visibleCount),
    [visibleCount, visibleJobs],
  )
  const canLoadMoreJobs = visibleCount < visibleJobs.length

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

  useEffect(() => {
    setVisibleCount(JOBS_PER_BATCH)
  }, [activeTab, jobFeedMode, searchQuery, sortMode])

  useEffect(() => {
    if (jobsLoading || !canLoadMoreJobs || !loadMoreRef.current) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((current) => Math.min(current + JOBS_PER_BATCH, visibleJobs.length))
        }
      },
      { rootMargin: '420px 0px' },
    )

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [canLoadMoreJobs, jobsLoading, visibleJobs.length])

  const submitSearch = (event) => {
    event.preventDefault()
    setSearchQuery(draftQuery)
  }

  const clearSearch = () => {
    setDraftQuery('')
    setSearchQuery('')
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
    } catch {
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
    <div className="min-h-full">
      <div className="portal-page mx-auto max-w-[1440px] space-y-4 sm:space-y-6">
        {(error || jobsError) && (
          <div className="grid gap-3">
            {error && <Notice tone="danger" message={error} />}
            {jobsError && (
              <Notice
                tone="warning"
                message={jobsError}
              />
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,2fr)] lg:gap-6 lg:items-start">
          <aside className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-1 sm:gap-5 lg:sticky lg:top-24 lg:block lg:space-y-5 lg:overflow-visible lg:pb-0">
            <ProfileSnapshot seeker={seeker} activeApplications={activeApplications} />
            <NextBestAction profile={profile} seeker={seeker} />
            {analyticsData && <ProfileViewsAnalytics analytics={analyticsData} />}
            <MatchingEngineCard />
          </aside>

          <main className="space-y-5">
            <SearchPanel
              usingFallbackJobs={usingFallbackJobs}
              radiusKm={Number(nearbyJobsData?.radius_km ?? 20)}
              hasLocation={hasLocation}
              noNearbyJobs={hasLocation && feedJobs.nearby.length === 0}
              draftQuery={draftQuery}
              onQueryChange={setDraftQuery}
              onClear={clearSearch}
              onSubmit={submitSearch}
            />

            <JobFeedSelector
              activeFeed={jobFeedMode}
              hasLocation={hasLocation}
              counts={{
                recommended: feedJobs.recommended.length,
                nearby: feedJobs.nearby.length,
                latest: feedJobs.latest.length,
              }}
              onChange={(feed) => {
                setJobFeedMode(feed)
                setActiveTab('smart')
              }}
            />

            <FeedControls
              activeTab={activeTab}
              savedCount={savedJobIds.length}
              resultCount={visibleJobs.length}
              sortMode={sortMode}
              onTabChange={setActiveTab}
              onSortChange={setSortMode}
            />

            <motion.section
              layout
              className="space-y-3 sm:space-y-4"
              aria-busy={jobsLoading}
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.055 } },
              }}
            >
              {jobsLoading ? (
                <><DashboardJobSkeleton /><DashboardJobSkeleton /><DashboardJobSkeleton /></>
              ) : visibleJobs.length ? (
                <>
                  <AnimatePresence initial={false}>
                    {visibleFeedJobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        saved={savedJobIds.includes(job.id)}
                        applying={applyingJobIds.includes(job.id)}
                        onSave={() => toggleSavedJob(job)}
                        onDetails={() => setSelectedJob(job)}
                        onQuickApply={() => handleQuickApply(job)}
                      />
                    ))}
                  </AnimatePresence>
                  <div ref={loadMoreRef} className="h-6" aria-hidden="true" />
                  {canLoadMoreJobs && <DashboardJobSkeleton compact />}
                </>
              ) : (
                <EmptyFeedState
                  title={activeTab === 'saved' ? 'No saved jobs yet' : 'No matching vacancies found'}
                  text={activeTab === 'saved'
                    ? 'Save promising vacancies so you can compare them later.'
                    : 'Try another keyword or switch to Latest Active Vacancies.'}
                />
              )}
            </motion.section>
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

      </div>
    </div>
  )
}

function SearchPanel({
  usingFallbackJobs,
  radiusKm,
  hasLocation,
  noNearbyJobs,
  draftQuery,
  onQueryChange,
  onClear,
  onSubmit,
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
      <div className="p-3 sm:p-5">
        <form onSubmit={onSubmit} className="flex gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={draftQuery}
              onChange={(event) => onQueryChange(event.target.value)}
              className="h-12 w-full rounded-lg border border-slate-300 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 hover:bg-white focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="Search jobs, skills, or employers"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 sm:px-6"
            >
              <Search className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Search</span>
            </button>
            {draftQuery && (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                aria-label="Clear search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </form>

      </div>

      {!hasLocation && (
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs font-semibold leading-5 text-amber-800">
          Your saved profile has no GPS coordinates. Latest active vacancies remain available; add your location to enable nearby matching.
        </div>
      )}
      {noNearbyJobs && (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold leading-5 text-slate-600">
          Your location is saved, but no active vacancies were found within {radiusKm} km. This does not mean your location is missing.
        </div>
      )}
      {usingFallbackJobs && hasLocation && (
        <div className="border-t border-blue-100 bg-blue-50 px-5 py-3 text-xs font-semibold leading-5 text-blue-800">
          Showing the latest active vacancies as a broader fallback feed.
        </div>
      )}
    </section>
  )
}

function JobFeedSelector({ activeFeed, hasLocation, counts, onChange }) {
  const feeds = [
    {
      key: 'recommended',
      title: 'Recommended Jobs',
      description: counts.recommended ? 'Ranked by your profile and skills' : 'No recommended jobs yet',
    },
    ...(hasLocation ? [{
      key: 'nearby',
      title: 'Nearby Jobs',
      description: counts.nearby ? 'Based on your saved GPS location' : 'No nearby jobs in the current radius',
    }] : []),
    {
      key: 'latest',
      title: 'Latest Active Vacancies',
      description: 'Broader fallback across active postings',
    },
  ]

  return (
    <section className="flex snap-x gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm shadow-slate-900/[0.03]" aria-label="Dashboard job feeds">
      {feeds.map((feed) => {
        const active = activeFeed === feed.key
        return (
          <button
            key={feed.key}
            type="button"
            onClick={() => onChange(feed.key)}
            className={`min-w-[210px] flex-1 snap-start rounded-md px-3 py-2.5 text-left transition focus:outline-none focus:ring-4 focus:ring-blue-100 sm:min-w-max ${
              active
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-xs font-black sm:text-sm">{feed.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{counts[feed.key]}</span>
            </span>
            <span className={`mt-1 block text-[11px] font-semibold ${active ? 'text-blue-100' : 'text-slate-500'}`}>{feed.description}</span>
          </button>
        )
      })}
    </section>
  )
}

function FeedControls({
  activeTab,
  savedCount,
  resultCount,
  sortMode,
  onTabChange,
  onSortChange,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-900/[0.03] sm:p-4">
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
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-black transition ${
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

          <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
            Sort
            <select
              value={sortMode}
              onChange={(event) => onSortChange(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  )
}

function JobCard({ job, saved = false, applying = false, onSave, onDetails, onQuickApply }) {
  const matchMeta = matchMetaFor(job.matchScore)
  const openFromKeyboard = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onDetails()
    }
  }

  return (
    <motion.article
      layout
      variants={{
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0 },
      }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      tabIndex={0}
      role="button"
      onClick={onDetails}
      onKeyDown={openFromKeyboard}
      className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03] outline-none transition-colors hover:border-blue-300 hover:shadow-md focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-100 sm:p-5"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <CompanyMark company={job.company} logoPath={job.companyLogoPath} />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black leading-snug text-blue-700 group-hover:underline sm:text-lg">{job.title}</h2>
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
            className="rounded-full p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100"
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
        
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            {job.missingCriticalSkills.length ? (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5"/> Missing {job.missingCriticalSkills.length} skill{job.missingCriticalSkills.length > 1 ? 's' : ''}
              </span>
            ) : (
              <><ShieldCheck className="h-3.5 w-3.5"/> Strong Match</>
            )}
          </p>
          
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="mr-2 self-center text-xs text-slate-500">{formatDate(job.postedAt) || 'recently'}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDetails(); }}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-100"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              View all details
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

function DashboardJobSkeleton({ compact = false }) {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03] sm:p-5">
      <div className="flex gap-3 sm:gap-4">
        <div className="h-12 w-12 shrink-0 rounded-md bg-slate-200" />
        <div className="flex-1">
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
          <div className="mt-4 h-3 w-4/5 rounded bg-slate-100" />
          {!compact && (
            <>
              <div className="mt-4 flex gap-2">
                <div className="h-7 w-24 rounded-full bg-slate-100" />
                <div className="h-7 w-20 rounded-full bg-slate-100" />
                <div className="h-7 w-16 rounded-full bg-slate-100" />
              </div>
              <div className="mt-4 h-px w-full bg-slate-100" />
              <div className="mt-4 flex items-center justify-between">
                <div className="h-3 w-28 rounded bg-slate-100" />
                <div className="h-9 w-24 rounded-full bg-slate-200" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
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

function JobDetailModal({ job, saved, applying = false, onClose, onSave, onQuickApply }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            <Layers3 className="h-3.5 w-3.5" />
            Match explanation
          </span>
          <div className="mt-4 flex items-center gap-4">
            {job.companyLogoPath && (
              <img
                src={job.companyLogoPath.startsWith('http') ? job.companyLogoPath : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/${job.companyLogoPath}`}
                alt={job.company}
                className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-white object-cover p-1 shadow-sm"
              />
            )}
            <div>
              <DialogTitle>{job.title}</DialogTitle>
              <DialogDescription className="mt-1">{job.company} · {job.location}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
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

        <DialogFooter>
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
            {job.hasApplied ? `Applied: ${titleCase(job.applicationStatus || 'pending')}` : applying ? 'Submitting...' : 'Apply'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function CompanyMark({ company, logoPath }) {
  if (logoPath) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000'
    const logoUrl = logoPath.startsWith('http') ? logoPath : `${baseUrl}/storage/${logoPath}`
    return (
      <img src={logoUrl} alt={company} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white object-cover p-1 shadow-sm border border-slate-200" />
    )
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 shadow-sm text-sm font-black text-slate-500">
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
      companyLogoPath: row.employer?.company_logo,
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
