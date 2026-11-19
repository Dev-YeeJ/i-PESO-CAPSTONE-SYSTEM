import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { companyLogoUrl } from '@/utils/companyLogoUrl'
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Layers3,
  MapPin,
  QrCode,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  WalletCards,
  X,
  Zap,
} from 'lucide-react'
import toast from '@/lib/toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import EmployerPreferenceChip from '@/components/jobs/EmployerPreferenceChip'
import EmployerProfileModal from './EmployerProfileModal'
import { applyToJob, getProfileImage, toggleSavedJob as toggleSavedJobApi } from '@/services/seekerService'
import { reviewService } from '@/services/reviewService'
import { formatInterviewTime, interviewPhase } from '@/utils/interview'

const sortOptions = [
  { value: 'match', label: 'Best match' },
  { value: 'distance', label: 'Nearest' },
  { value: 'newest', label: 'Newest' },
]

// Application statuses grouped the way the summary card reads them.
const IN_PROGRESS_STATUSES = ['pending', 'reviewed', 'shortlisted']

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
  jobFairs = [],
  applications = null,
}) {
  const [draftQuery, setDraftQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('smart')
  const [sortMode, setSortMode] = useState('match')
  const [selectedJob, setSelectedJob] = useState(null)
  const [selectedEmployerId, setSelectedEmployerId] = useState(null)
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

  const [photoUrl, setPhotoUrl] = useState(null)
  useEffect(() => {
    if (!profile?.has_profile_image) return undefined

    let active = true
    let objectUrl
    getProfileImage()
      .then((file) => {
        objectUrl = URL.createObjectURL(file)
        if (active) setPhotoUrl(objectUrl)
      })
      .catch(() => {
        if (active) setPhotoUrl(null)
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [profile?.has_profile_image])

  const seeker = useMemo(
    () => buildSeekerView(profile, user, profile?.has_profile_image ? photoUrl : null),
    [profile, user, photoUrl],
  )
  const feedJobs = useMemo(() => ({
    recommended: normalizeApiJobs(recommendedJobsData?.jobs ?? []),
    nearby: normalizeApiJobs(nearbyJobsData?.jobs ?? []),
    latest: normalizeApiJobs(latestJobsData?.jobs ?? []),
  }), [latestJobsData, nearbyJobsData, recommendedJobsData])
  const apiJobs = useMemo(() => feedJobs[jobFeedMode] ?? [], [feedJobs, jobFeedMode])

  // Verified-review ratings for the employers in the feeds, in one request.
  // Employers with fewer than 3 reviewers come back without a rating.
  const ratingEmployerIds = useMemo(() => [...new Set(
    Object.values(feedJobs).flat().map((job) => job.employerId).filter(Boolean),
  )].sort((a, b) => a - b), [feedJobs])
  const { data: employerRatings = {} } = useQuery({
    queryKey: ['seeker', 'employer-ratings', ratingEmployerIds],
    queryFn: () => reviewService.ratings(ratingEmployerIds),
    enabled: ratingEmployerIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })
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

  const firstName = profile?.first_name || String(seeker.name || '').split(' ')[0] || 'there'
  const recommendedCount = feedJobs.recommended.length

  return (
    <div className="min-h-full">
      <div className="portal-page mx-auto max-w-[1440px] space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[32px] sm:leading-10">{greeting()}, {firstName}</h1>
            <p className="mt-1 text-[15px] text-slate-600">
              {activeApplications > 0
                ? <>You have <span className="font-semibold text-slate-900">{activeApplications} active application{activeApplications === 1 ? '' : 's'}</span>{recommendedCount > 0 && <> and <span className="font-semibold text-slate-900">{recommendedCount} recommended job{recommendedCount === 1 ? '' : 's'}</span></>}.</>
                : recommendedCount > 0
                  ? <><span className="font-semibold text-slate-900">{recommendedCount} job{recommendedCount === 1 ? '' : 's'}</span> match your profile right now.</>
                  : 'Search open vacancies below, or complete your profile to get matched.'}
            </p>
          </div>
          <Link to="/seeker/job-map" className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f2d56] sm:self-auto">
            <MapPin className="h-4 w-4" aria-hidden="true" /> Find jobs near me
          </Link>
        </div>

        {(error || jobsError) && (
          <div className="grid gap-3">
            {error && <Notice tone="danger" message={error} />}
            {jobsError && <Notice tone="warning" message={jobsError} />}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-6">
          <aside className="grid gap-4 sm:grid-cols-2 lg:sticky lg:top-24 lg:block lg:space-y-5">
            <ProfileStrengthCard profile={profile} seeker={seeker} />
            <ApplicationsSummaryCard applications={applications} />
            <JobFairCard fairs={jobFairs} />
            <ProfileInsightsCard analytics={analyticsData} />
          </aside>

          <main className="min-w-0 space-y-4">
            <SearchPanel
              usingFallbackJobs={usingFallbackJobs}
              radiusKm={Number(nearbyJobsData?.radius_km ?? 20)}
              hasLocation={hasLocation}
              noNearbyJobs={hasLocation && feedJobs.nearby.length === 0}
              draftQuery={draftQuery}
              searchQuery={searchQuery}
              onQueryChange={setDraftQuery}
              onClear={clearSearch}
              onSubmit={submitSearch}
            />

            <FeedSwitcher
              activeFeed={jobFeedMode}
              activeTab={activeTab}
              hasLocation={hasLocation}
              counts={{
                recommended: feedJobs.recommended.length,
                nearby: feedJobs.nearby.length,
                latest: feedJobs.latest.length,
                saved: savedJobIds.length,
              }}
              resultCount={visibleJobs.length}
              sortMode={sortMode}
              onFeedChange={(feed) => {
                setJobFeedMode(feed)
                setActiveTab('smart')
              }}
              onSavedSelect={() => setActiveTab('saved')}
              onSortChange={setSortMode}
            />

            <Motion.section
              layout
              className="space-y-3 sm:space-y-4"
              aria-busy={jobsLoading}
              aria-label="Job vacancies"
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
                        rating={employerRatings[job.employerId]}
                        saved={savedJobIds.includes(job.id)}
                        applying={applyingJobIds.includes(job.id)}
                        onSave={() => toggleSavedJob(job)}
                        onDetails={() => setSelectedJob(job)}
                        onQuickApply={() => handleQuickApply(job)}
                        onViewEmployer={() => setSelectedEmployerId(job.employerId)}
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
                    ? 'Tap the bookmark on any vacancy to keep it here and compare later.'
                    : 'Try another keyword, or switch to Latest to see every open vacancy.'}
                />
              )}
            </Motion.section>
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
            onViewEmployer={() => {
              setSelectedJob(null)
              setSelectedEmployerId(selectedJob.employerId)
            }}
          />
        )}

        {selectedEmployerId && (
          <EmployerProfileModal
            open={!!selectedEmployerId}
            employerId={selectedEmployerId}
            onClose={() => setSelectedEmployerId(null)}
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
  searchQuery,
  onQueryChange,
  onClear,
  onSubmit,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <form onSubmit={onSubmit} className="flex gap-2 p-3 sm:gap-3 sm:p-4" role="search">
        <label className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4 transition focus-within:border-[#2563b8] focus-within:ring-2 focus-within:ring-[#c4d9f7]">
          <Search className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Search jobs</span>
          <input
            value={draftQuery}
            onChange={(event) => onQueryChange(event.target.value)}
            className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Job title, skill or company"
          />
          {draftQuery && (
            <button type="button" onClick={onClear} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 text-sm font-semibold text-white transition hover:bg-[#0f2d56] focus:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:px-5"
        >
          <Search className="h-4 w-4 sm:hidden" aria-hidden="true" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>
      {searchQuery && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0fc] px-3 py-1 text-xs font-semibold text-brand-navy">
            “{searchQuery}”
            <button type="button" onClick={onClear} aria-label={`Remove search ${searchQuery}`}><X className="h-3 w-3" /></button>
          </span>
        </div>
      )}

      {!hasLocation && (
        <div className="flex items-start gap-2 border-t border-amber-200 bg-[#fffbeb] px-4 py-3 text-xs font-medium leading-5 text-amber-900">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Your profile has no saved location yet, so Nearby is off. <Link to="/seeker/profile" className="font-semibold underline">Add your location</Link> to see jobs close to home.</span>
        </div>
      )}
      {noNearbyJobs && (
        <div className="border-t border-slate-200 bg-brand-canvas px-4 py-3 text-xs font-medium leading-5 text-slate-600">
          Your location is saved, but no open vacancies were found within {radiusKm} km.
        </div>
      )}
      {usingFallbackJobs && hasLocation && (
        <div className="border-t border-[#c4d9f7] bg-[#e8f0fc] px-4 py-3 text-xs font-medium leading-5 text-brand-navy">
          Showing every open vacancy, newest first.
        </div>
      )}
    </section>
  )
}

function FeedSwitcher({ activeFeed, activeTab, hasLocation, counts, resultCount, sortMode, onFeedChange, onSavedSelect, onSortChange }) {
  const options = [
    { key: 'recommended', label: 'Recommended', icon: Sparkles, count: counts.recommended },
    ...(hasLocation ? [{ key: 'nearby', label: 'Nearby', icon: MapPin, count: counts.nearby }] : []),
    { key: 'latest', label: 'Latest', icon: Clock3, count: counts.latest },
    { key: 'saved', label: 'Saved', icon: Bookmark, count: counts.saved },
  ]

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-card" role="tablist" aria-label="Job lists">
        {options.map((option) => {
          const active = option.key === 'saved' ? activeTab === 'saved' : activeTab !== 'saved' && activeFeed === option.key
          return (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => (option.key === 'saved' ? onSavedSelect() : onFeedChange(option.key))}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                active ? 'bg-brand-navy text-white' : 'text-slate-600 hover:text-brand-navy'
              }`}
            >
              {createElement(option.icon, { className: 'h-4 w-4', 'aria-hidden': true })}
              {option.label}
              <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : 'bg-slate-100'}`}>{option.count}</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <span className="text-sm text-slate-500">{resultCount} result{resultCount === 1 ? '' : 's'}</span>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Sort by
          <select
            value={sortMode}
            onChange={(event) => onSortChange(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#2563b8] focus:ring-2 focus:ring-[#c4d9f7]"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

function JobCard({ job, rating, saved = false, applying = false, onSave, onDetails, onQuickApply, onViewEmployer }) {
  const strong = !job.matchDeferred && job.matchScore >= 80
  const openFromKeyboard = (event) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onDetails()
    }
  }
  const stop = (handler) => (event) => { event.stopPropagation(); handler() }

  return (
    <Motion.article
      layout
      variants={{
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0 },
      }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      tabIndex={0}
      onClick={onDetails}
      onKeyDown={openFromKeyboard}
      aria-label={`${job.title} at ${job.company}. Press Enter for details.`}
      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-card outline-none transition hover:border-[#c4d9f7] hover:shadow-elevated focus-visible:ring-2 focus-visible:ring-focus sm:p-5"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <button type="button" className="shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-focus" onClick={stop(onViewEmployer)} title={`View ${job.company} profile`}>
          <CompanyMark company={job.company} logoPath={job.companyLogoPath} sizeClass="h-12 w-12" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold leading-snug text-slate-900 group-hover:text-brand-navy">{job.title}</h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-slate-600">
                <button type="button" className="font-medium hover:text-brand-navy hover:underline focus:outline-none focus-visible:underline" onClick={stop(onViewEmployer)}>{job.company}</button>
                {rating ? (
                  <span className="inline-flex items-center gap-1" aria-label={`Rated ${rating.average.toFixed(1)} out of 5 by ${rating.reviewers} verified reviewers`}>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <Star className="h-3.5 w-3.5 fill-brand-gold text-brand-gold" aria-hidden="true" />
                    {rating.average.toFixed(1)} <span className="text-slate-400">({rating.reviewers})</span>
                  </span>
                ) : null}
              </p>
            </div>
            {!job.matchDeferred && (
              <div className="shrink-0 text-right">
                <p className="font-display text-[30px] leading-none text-brand-navy sm:text-[34px]">{job.matchScore}<span className="text-lg">%</span></p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${strong ? 'bg-brand-gold text-brand-navy' : 'bg-[#e8f0fc] text-brand-navy'}`}>
                  {strong ? 'Strong match' : job.matchScore >= 60 ? 'Good match' : 'Partial match'}
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />{job.location}{job.distanceKm != null && ` (${formatDistance(job.distanceKm)})`}</span>
            <span className="flex items-center gap-1.5"><WalletCards className="h-4 w-4 text-slate-400" aria-hidden="true" /><span className="font-semibold text-slate-900 tabular-nums">{job.salaryRange}</span></span>
            <span className="flex items-center gap-1.5"><BriefcaseBusiness className="h-4 w-4 text-slate-400" aria-hidden="true" />{job.workSetup || 'Not specified'}</span>
            <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-slate-400" aria-hidden="true" />{formatDate(job.postedAt) || 'Recently'}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {job.requiredSkills.slice(0, 3).map((skill) => (
              <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{skill}</span>
            ))}
            {job.requiredSkills.length > 3 && <span className="text-xs font-medium text-slate-400">+{job.requiredSkills.length - 3} more</span>}
            <EmployerPreferenceChip job={job} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          {job.hasApplied ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fffbeb] px-3 py-1 text-[#b45309]"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Applied: {titleCase(job.applicationStatus || 'pending')}</span>
          ) : job.matchDeferred ? (
            <span className="font-medium text-slate-500">Open the details to check requirements</span>
          ) : job.missingCriticalSkills.length ? (
            <span className="flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />Missing {job.missingCriticalSkills.length} skill{job.missingCriticalSkills.length > 1 ? 's' : ''}</span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Meets the listed skills</span>
          )}
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={stop(onSave)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${saved ? 'border-brand-navy bg-[#e8f0fc] text-brand-navy' : 'border-slate-200 text-slate-500 hover:border-brand-navy hover:text-brand-navy'}`}
            aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
            aria-pressed={saved}
          >
            {saved ? <BookmarkCheck className="h-[18px] w-[18px]" /> : <Bookmark className="h-[18px] w-[18px]" />}
          </button>
          {job.hasApplied ? (
            <Link to="/seeker/applications" onClick={(event) => event.stopPropagation()} className="rounded-xl border border-brand-navy px-4 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-[#e8f0fc]">View application</Link>
          ) : (
            <>
              <button type="button" onClick={stop(onDetails)} className="rounded-xl border border-brand-navy px-4 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-[#e8f0fc]">Details</button>
              <button
                type="button"
                onClick={stop(onQuickApply)}
                disabled={applying}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f2d56] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Zap className="h-4 w-4" aria-hidden="true" />{applying ? 'Applying…' : 'Quick apply'}
              </button>
            </>
          )}
        </div>
      </div>
    </Motion.article>
  )
}

function DashboardJobSkeleton({ compact = false }) {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5" aria-hidden="true">
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

function ProfileStrengthCard({ profile, seeker }) {
  const completion = Math.max(0, Math.min(100, Number(seeker.nsrpCompletion) || 0))
  const action = nextBestAction(profile, seeker)
  const circumference = 2 * Math.PI * 15.5
  const verdict = completion >= 90 ? 'Excellent — your profile is complete.' : completion >= 60 ? 'Good — employers can find you.' : 'Needs work — employers may skip you.'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-5">
        <div className="relative h-[88px] w-[88px] shrink-0" role="img" aria-label={`Profile ${completion}% complete`}>
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e8f0fc" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#123563" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(completion / 100) * circumference} ${circumference}`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-2xl text-brand-navy">{completion}%</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">Profile strength</p>
          <p className="mt-1 font-semibold leading-6 text-slate-900">{verdict}</p>
          <Link to="/seeker/profile" className="text-sm font-medium text-brand-navy hover:underline">View my profile</Link>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-brand-gold/40 bg-[#fffbeb] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Sparkles className="h-4 w-4 text-[#d97706]" aria-hidden="true" />Next best step</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{action.title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{action.description}</p>
        <Link to={action.href} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-navy px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#0f2d56]">
          {action.cta} <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

function ApplicationsSummaryCard({ applications }) {
  const list = applications ?? []
  const inProgress = list.filter((application) => IN_PROGRESS_STATUSES.includes(application.status)).length
  const interviews = list.filter((application) => application.status === 'interview').length
  const hired = list.filter((application) => application.status === 'hired').length
  const nextInterview = list
    .filter((application) => application.status === 'interview' && application.interview?.schedule && interviewPhase(application.interview) === 'upcoming')
    .sort((a, b) => new Date(a.interview.schedule) - new Date(b.interview.schedule))[0]

  const rows = [
    { label: 'In progress', value: inProgress, icon: Send, tone: 'text-[#2563b8]' },
    { label: 'Interview', value: interviews, icon: CalendarCheck, tone: 'text-[#d97706]' },
    { label: 'Hired', value: hired, icon: CheckCircle2, tone: 'text-emerald-600' },
  ]

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">My applications</h2>
        <Link to="/seeker/applications" className="text-sm font-semibold text-brand-navy hover:underline">View all</Link>
      </div>
      {applications === null ? (
        <div className="mt-4 space-y-2.5" aria-busy="true">
          {[0, 1, 2].map((key) => <div key={key} className="h-10 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : list.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">You haven&apos;t applied yet. Use <span className="font-semibold text-slate-900">Quick apply</span> on any vacancy — you&apos;ll track it here.</p>
      ) : (
        <>
          <ul className="mt-4 space-y-2 text-sm">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center justify-between rounded-xl bg-brand-canvas px-3 py-2.5">
                <span className="flex items-center gap-2.5 text-slate-700">{createElement(row.icon, { className: `h-4 w-4 ${row.tone}`, 'aria-hidden': true })}{row.label}</span>
                <span className="font-semibold tabular-nums text-slate-900">{row.value}</span>
              </li>
            ))}
          </ul>
          {nextInterview && (
            <div className="mt-4 rounded-xl border border-slate-200 p-3.5">
              <p className="text-sm font-semibold text-slate-500">Up next</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Interview for {nextInterview.job?.job_title || 'a vacancy'}{nextInterview.job?.employer?.company_name ? ` at ${nextInterview.job.employer.company_name}` : ''}</p>
              <p className="text-sm text-slate-500">{formatInterviewTime(nextInterview.interview.schedule)}</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function JobFairCard({ fairs }) {
  const fair = fairs[0]
  if (!fair) return null
  const date = fair.start_date ? new Date(`${String(fair.start_date).slice(0, 10)}T00:00:00`) : null
  const valid = date && !Number.isNaN(date.getTime())

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="font-semibold text-slate-900">Upcoming job fair</h2>
      <div className="mt-4 flex items-center gap-4">
        <div className="w-14 shrink-0 rounded-xl bg-brand-navy py-2 text-center text-white">
          <p className="text-[10px] font-semibold text-white/70">{valid ? date.toLocaleDateString('en-PH', { month: 'short' }) : '—'}</p>
          <p className="font-display text-2xl leading-none">{valid ? String(date.getDate()).padStart(2, '0') : '—'}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{fair.title}</p>
          <p className="truncate text-sm text-slate-500">{[fair.venue, fair.start_time?.slice(0, 5)].filter(Boolean).join(', ')}</p>
        </div>
      </div>
      <Link to="/seeker/job-fairs" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-navy px-4 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-[#e8f0fc]">
        <QrCode className="h-4 w-4" aria-hidden="true" />Register &amp; get my QR pass
      </Link>
    </section>
  )
}

// Profile visibility plus a short note on how the feed is ranked. The
// visibility half appears once analytics has loaded.
function ProfileInsightsCard({ analytics }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="font-semibold text-slate-900">How your feed is ranked</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Your match % (occupation, skills, experience, education) is kept separate from distance, so a closer job never hides a better fit. Sort by <span className="font-semibold text-slate-900">Nearest</span> when commute matters most.
      </p>

      {analytics && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-900">Profile visibility in the last 30 days</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <SidebarStat label="Profile views" value={analytics.total_views_30_days} />
            <SidebarStat label="Search appearances" value={analytics.search_appearances} />
          </div>
          {analytics.recent_viewers?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500">Recently viewed by</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {analytics.recent_viewers.map((viewer, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="truncate">{viewer.company_name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function JobDetailModal({ job, saved, applying = false, onClose, onSave, onQuickApply, onViewEmployer }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#e8f0fc] px-3 py-1 text-xs font-semibold text-brand-navy">
            <Layers3 className="h-3.5 w-3.5" />
            Match explanation
          </span>
          <div className="mt-4 flex items-center gap-4">
            <button
              type="button"
              onClick={onViewEmployer}
              className="shrink-0 transition-transform hover:scale-105 focus:outline-none"
              title={`View ${job.company} profile`}
            >
              <CompanyMark company={job.company} logoPath={job.companyLogoPath} sizeClass="h-12 w-12" />
            </button>
            <div>
              <DialogTitle>{job.title}</DialogTitle>
              <DialogDescription className="mt-1">
                <button
                  type="button"
                  onClick={onViewEmployer}
                  className="font-semibold text-slate-700 hover:text-blue-700 hover:underline focus:outline-none focus:text-blue-700 focus:underline"
                >
                  {job.company}
                </button>
                {', '}{job.location}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            {job.matchDeferred
              ? <Fact icon={Star} label="Merit" value="Not scored" />
              : <Fact icon={Star} label="Merit" value={`${job.matchScore}%`} />}
            <Fact icon={MapPin} label="Distance" value={formatDistance(job.distanceKm)} />
            <Fact icon={WalletCards} label="Salary" value={job.salaryRange} />
            <Fact icon={CalendarDays} label="Deadline" value={formatDate(job.deadline) || 'Open'} />
          </div>

          {job.matchDeferred ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-black text-slate-950">Match scoring not run for this list</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This job comes from a broader feed that skips detailed match scoring. Compare the required skills below against your profile, or check the Recommended tab for jobs scored against your profile.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-black text-slate-950">Why this appears in your feed</h3>
              <div className="mt-4 space-y-3">
                {Object.entries(job.matchSummary).map(([key, value]) => (
                  <ScoreRow key={key} label={titleCase(key)} value={value} />
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-black text-slate-950">Required skills</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.requiredSkills.map((skill) => (
                  <span key={skill} className="rounded-full bg-[#e8f0fc] px-3 py-1.5 text-xs font-semibold text-brand-navy">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            {!job.matchDeferred && (
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
            )}
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
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-navy bg-white px-4 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-[#e8f0fc]"
          >
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {saved ? 'Saved' : 'Save Job'}
          </button>
          <button
            type="button"
            onClick={onQuickApply}
            disabled={job.hasApplied || applying}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f2d56] disabled:cursor-not-allowed disabled:opacity-60"
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
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f0fc]">
        <SlidersHorizontal className="h-7 w-7 text-brand-navy" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
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
      <p className="mt-3 text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function MiniFact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
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
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
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
        <div className="h-full rounded-full bg-brand-navy" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
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
        <div className="h-full rounded-full bg-brand-navy" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

function CompanyMark({ company, logoPath, sizeClass = 'h-14 w-14' }) {
  const [imageFailed, setImageFailed] = useState(false)
  const logoUrl = companyLogoUrl(logoPath)

  if (logoUrl && !imageFailed) {
    return (
      <img
        src={logoUrl}
        alt={company}
        onError={() => setImageFailed(true)}
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white object-cover p-1 shadow-sm`}
      />
    )
  }

  return (
    <div className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-black text-slate-500 shadow-sm`}>
      {companyMonogram(company)}
    </div>
  )
}

function SidebarStat({ label, value }) {
  return (
    <div className="rounded-xl bg-brand-canvas px-3 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl leading-none text-slate-900 tabular-nums">{value ?? '—'}</p>
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

function greeting(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function buildSeekerView(profile, user, photoUrl = null) {
  const preferredOccupation = profile?.occupations?.find((occupation) => (
    occupation?.occupation_title
    || occupation?.general_term
    || occupation?.raw_job_title
  ))

  const name = fullName(profile) || user?.name || 'Job Seeker'

  return {
    name,
    firstName: profile?.first_name || user?.name?.split(' ')[0] || name.split(' ')[0] || 'there',
    profilePhoto: photoUrl || createAvatarDataUrl(name),
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
      employerId: row.employer_id ?? row.employer?.id ?? row.employer?.employer_id,
      title: row.job_title ?? 'Untitled vacancy',
      company: row.employer?.company_name ?? 'PESO Partner Employer',
      companyLogoPath: row.employer?.company_logo_url ?? row.employer?.company_logo,
      location: [row.barangay, row.city_municipality, row.province].filter(Boolean).join(', ') || row.location || 'Location not specified',
      distanceKm: Number(row.distance_km ?? 0),
      salaryMin: Number(row.salary_min ?? 0),
      salaryMax: Number(row.salary_max ?? 0),
      salaryRange: formatSalary(row),
      requiredSkills,
      matchScore: Math.round(Number(match.percentage ?? match.total_score ?? 0)),
      // Nearby/Latest feeds intentionally skip full match scoring for
      // performance — match/match_percentage come back null and this flag
      // tells the card to hide match UI instead of showing a misleading 0%.
      matchDeferred: Boolean(row.match_deferred),
      workSetup: normalizeWorkSetup(row.work_setup),
      employmentType: normalizeEmploymentType(row.employment_type),
      jobLevel: inferJobLevel(experienceLevel, row.minimum_experience_months),
      vacancies: row.vacancies_count,
      postedAt: row.posted_at,
      deadline: row.application_deadline,
      description: row.job_description,
      preferredGender: row.preferred_gender,
      minimumAge: row.minimum_age,
      maximumAge: row.maximum_age,
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
      description: 'You are missing a short About Me section. Add one now to make your profile easier for employers to understand.',
      cta: 'Complete Your Profile',
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
