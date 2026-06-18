import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Filter,
  MapPin,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  WalletCards,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge, Button, Card, CardHeader } from '@/components/ui'

const savedJobsStorageKey = 'ipeso_seeker_saved_jobs'

const feedTabs = [
  { key: 'for_you', label: 'For You' },
  { key: 'nearby', label: 'Nearby' },
  { key: 'saved', label: 'Saved' },
  { key: 'bulletin', label: 'Bulletin' },
]

const fallbackJobs = [
  {
    id: 'local-1',
    title: 'Administrative Aide IV',
    company: 'Urdaneta City LGU',
    location: 'Nancayasan, Urdaneta City',
    distanceKm: 1.8,
    salaryRange: 'PHP 18,500 - PHP 22,000 / month',
    requiredSkills: ['Records Management', 'MS Excel', 'Document Control', 'Client Service'],
    matchScore: 95,
    workSetup: 'On-site',
    employmentType: 'Permanent',
    vacancies: 4,
    postedAt: '2026-06-16',
    deadline: '2026-07-12',
    description: 'Assist with records, front desk coordination, routing of documents, and citizen service support.',
    matchSummary: {
      occupation: 95,
      skills: 92,
      experience: 88,
      education: 100,
    },
    missingCriticalSkills: [],
  },
  {
    id: 'local-2',
    title: 'HR Assistant',
    company: 'Pangasinan Allied Services',
    location: 'San Vicente, Urdaneta City',
    distanceKm: 3.2,
    salaryRange: 'PHP 17,000 - PHP 21,000 / month',
    requiredSkills: ['Recruitment Support', 'Data Encoding', 'Communication', 'MS Excel'],
    matchScore: 91,
    workSetup: 'On-site',
    employmentType: 'Contractual',
    vacancies: 2,
    postedAt: '2026-06-14',
    deadline: '2026-07-05',
    description: 'Support applicant screening, appointment scheduling, employment document preparation, and reporting.',
    matchSummary: {
      occupation: 88,
      skills: 94,
      experience: 84,
      education: 100,
    },
    missingCriticalSkills: [],
  },
  {
    id: 'local-3',
    title: 'Cashier / Front Desk Associate',
    company: 'CB Mall Urdaneta',
    location: 'Poblacion, Urdaneta City',
    distanceKm: 4.4,
    salaryRange: 'PHP 15,000 - PHP 18,000 / month',
    requiredSkills: ['Cash Handling', 'POS Systems', 'Customer Service', 'Inventory'],
    matchScore: 82,
    workSetup: 'On-site',
    employmentType: 'Full-time',
    vacancies: 6,
    postedAt: '2026-06-13',
    deadline: '2026-06-30',
    description: 'Handle front desk transactions, customer inquiries, payment processing, and basic inventory checks.',
    matchSummary: {
      occupation: 78,
      skills: 80,
      experience: 85,
      education: 90,
    },
    missingCriticalSkills: ['POS Systems'],
  },
  {
    id: 'local-4',
    title: 'Data Encoder',
    company: 'North Luzon Diagnostics',
    location: 'Mabini, Urdaneta City',
    distanceKm: 5.1,
    salaryRange: 'PHP 16,000 - PHP 19,500 / month',
    requiredSkills: ['Typing', 'Spreadsheet Management', 'Data Validation', 'Confidentiality'],
    matchScore: 76,
    workSetup: 'Hybrid',
    employmentType: 'Contractual',
    vacancies: 3,
    postedAt: '2026-06-10',
    deadline: '2026-07-01',
    description: 'Encode laboratory records, validate patient forms, and maintain confidential digital files.',
    matchSummary: {
      occupation: 72,
      skills: 76,
      experience: 70,
      education: 95,
    },
    missingCriticalSkills: ['Data Validation'],
  },
  {
    id: 'local-5',
    title: 'Customer Support Associate',
    company: 'PESO Partner BPO Hub',
    location: 'Anonas, Urdaneta City',
    distanceKm: 6.8,
    salaryRange: 'PHP 20,000 - PHP 25,000 / month',
    requiredSkills: ['Email Support', 'CRM', 'Problem Solving', 'English Communication'],
    matchScore: 72,
    workSetup: 'Hybrid',
    employmentType: 'Full-time',
    vacancies: 8,
    postedAt: '2026-06-08',
    deadline: '2026-07-15',
    description: 'Respond to customer inquiries, maintain CRM records, and coordinate issue resolution with supervisors.',
    matchSummary: {
      occupation: 70,
      skills: 68,
      experience: 78,
      education: 90,
    },
    missingCriticalSkills: ['CRM'],
  },
]

const bulletins = [
  {
    id: 'news-1',
    type: 'Job Fair',
    title: 'Mega Job Fair at UCU Gymnasium',
    detail: 'PESO partner employers will conduct walk-in screening and initial interviews. Bring valid IDs and printed resumes.',
    date: 'July 12, 2026',
    location: 'Urdaneta City University Gymnasium',
    priority: 'high',
  },
  {
    id: 'news-2',
    type: 'Advisory',
    title: 'TESDA Certificate Validation Week',
    detail: 'Job seekers may verify TESDA-related records through the PESO help desk to strengthen their matching profile.',
    date: 'Weekdays',
    location: 'City Hall Annex',
    priority: 'normal',
  },
  {
    id: 'news-3',
    type: 'Coaching',
    title: 'Resume and Interview Coaching',
    detail: 'Free one-on-one coaching slots are available for first-time applicants, returning OFWs, and displaced workers.',
    date: 'Friday, 9:00 AM',
    location: 'PESO Career Center',
    priority: 'normal',
  },
]

const activityTimeline = [
  {
    id: 'activity-1',
    title: 'Profile screened',
    detail: 'Employers can now rank your NSRP profile against active vacancies.',
    meta: 'Automatic',
    status: 'complete',
  },
  {
    id: 'activity-2',
    title: 'Smart jobs refreshed',
    detail: 'Your feed updates when employers publish active local vacancies.',
    meta: 'Today',
    status: 'active',
  },
  {
    id: 'activity-3',
    title: 'Application tracking',
    detail: 'Shortlist and interview updates will appear here once you apply.',
    meta: 'Next',
    status: 'pending',
  },
]

export default function JobSeekerHome({
  profile = null,
  user = null,
  jobsData = null,
  error = '',
  jobsError = '',
}) {
  const [draftQuery, setDraftQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('for_you')
  const [selectedJob, setSelectedJob] = useState(null)
  const [savedJobIds, setSavedJobIds] = useState(() => readSavedJobs())

  const seeker = useMemo(() => buildSeekerView(profile, user), [profile, user])
  const apiJobs = useMemo(() => normalizeApiJobs(jobsData?.jobs ?? []), [jobsData])
  const jobs = apiJobs.length ? apiJobs : fallbackJobs
  const usingFallbackJobs = apiJobs.length === 0

  useEffect(() => {
    window.localStorage.setItem(savedJobsStorageKey, JSON.stringify(savedJobIds))
  }, [savedJobIds])

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const searchedJobs = useMemo(() => {
    if (!normalizedQuery) return jobs

    return jobs.filter((job) => (
      [
        job.title,
        job.company,
        job.location,
        job.salaryRange,
        job.workSetup,
        job.employmentType,
        ...job.requiredSkills,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    ))
  }, [jobs, normalizedQuery])

  const sortedJobs = useMemo(
    () => [...searchedJobs].sort((left, right) => right.matchScore - left.matchScore || left.distanceKm - right.distanceKm),
    [searchedJobs],
  )

  const savedJobs = useMemo(
    () => sortedJobs.filter((job) => savedJobIds.includes(job.id)),
    [savedJobIds, sortedJobs],
  )

  const visibleJobs = useMemo(() => {
    if (activeTab === 'saved') return savedJobs
    if (activeTab === 'nearby') return [...searchedJobs].sort((left, right) => left.distanceKm - right.distanceKm)
    return sortedJobs
  }, [activeTab, savedJobs, searchedJobs, sortedJobs])

  const topMatch = sortedJobs[0]
  const topMatches = sortedJobs.slice(0, 3)
  const activeApplications = Number(profile?.dashboard_stats?.active_applications ?? 0)

  const handleSearch = (event) => {
    event.preventDefault()
    setSearchQuery(draftQuery)
    if (activeTab === 'bulletin') setActiveTab('for_you')
  }

  const clearSearch = () => {
    setDraftQuery('')
    setSearchQuery('')
  }

  const toggleSavedJob = (job) => {
    const isSaved = savedJobIds.includes(job.id)
    const nextSaved = isSaved
      ? savedJobIds.filter((savedJobId) => savedJobId !== job.id)
      : [...savedJobIds, job.id]

    setSavedJobIds(nextSaved)
    toast.success(isSaved ? `${job.title} removed from saved jobs.` : `${job.title} saved.`)
  }

  const handleQuickApply = (job) => {
    toast.success(`Application workflow opened for ${job.title}.`)
    setSelectedJob(job)
  }

  return (
    <div className="portal-page space-y-6">
      {(error || jobsError) && (
        <div className="grid gap-3">
          {error && <Notice tone="danger" message={error} />}
          {jobsError && (
            <Notice
              tone="warning"
              message={`${jobsError} Showing a sample local feed until your live nearby matches are available.`}
            />
          )}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
          <div className="border-b border-slate-200 p-5 sm:p-7 lg:border-b-0 lg:border-r">
            <Badge variant="review" className="border-blue-100 bg-blue-50 text-blue-700">
              Job Seeker Home
            </Badge>
            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Welcome back, {seeker.firstName}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Review match-ranked vacancies, PESO advisories, and next actions from your NSRP employment profile.
                </p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Today&apos;s Focus</p>
                <p className="mt-2 text-sm font-bold text-blue-950">
                  {topMatch ? `${topMatch.title} is your strongest match.` : 'Complete your NSRP profile to unlock matches.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-100"
                  placeholder="Search job title, company, barangay, work setup, or skill"
                />
                {draftQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button type="submit" variant="navy" className="sm:min-w-36">
                Search
              </Button>
            </form>
          </div>

          <div className="bg-slate-50 p-5 sm:p-7">
            <div className="grid grid-cols-2 gap-3">
              <Metric icon={Target} label="Best Match" value={topMatch ? `${topMatch.matchScore}%` : '0%'} />
              <Metric icon={BookmarkCheck} label="Saved Jobs" value={savedJobIds.length} />
              <Metric icon={BriefcaseBusiness} label="Active Apps" value={activeApplications} />
              <Metric icon={MapPin} label="Radius" value={`${Number(jobsData?.radius_km ?? 20)} km`} />
            </div>
            {usingFallbackJobs && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
                Live nearby matching needs a saved map location and active published jobs. This preview feed keeps the home page usable while data is still being prepared.
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
        <main className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {feedTabs.map((tab) => {
                  const active = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition ${
                        active
                          ? 'border-blue-900 bg-blue-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800'
                      }`}
                    >
                      {tab.label}
                      {tab.key === 'saved' && savedJobIds.length > 0 && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {savedJobIds.length}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                <Filter className="h-3.5 w-3.5" />
                {activeTab === 'bulletin' ? `${bulletins.length} updates` : `${visibleJobs.length} jobs`}
              </span>
            </div>
          </section>

          {activeTab === 'bulletin' ? (
            <section className="space-y-4">
              {bulletins.map((item) => (
                <BulletinCard key={item.id} item={item} />
              ))}
            </section>
          ) : (
            <section className="space-y-4">
              {visibleJobs.length ? (
                visibleJobs.map((job) => (
                  <JobFeedCard
                    key={job.id}
                    job={job}
                    featured={topMatches.some((match) => match.id === job.id)}
                    saved={savedJobIds.includes(job.id)}
                    onSave={() => toggleSavedJob(job)}
                    onDetails={() => setSelectedJob(job)}
                    onQuickApply={() => handleQuickApply(job)}
                  />
                ))
              ) : (
                <EmptyFeedState
                  title={activeTab === 'saved' ? 'No saved jobs yet' : 'No jobs found'}
                  text={activeTab === 'saved'
                    ? 'Save promising vacancies from your feed so you can compare them later.'
                    : 'Try a broader keyword or check the PESO bulletin for upcoming job fair opportunities.'}
                />
              )}
            </section>
          )}
        </main>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <ProfilePanel seeker={seeker} />
          <NextActions profile={profile} />
          <ActivityPanel activeApplications={activeApplications} />
          <BulletinPreview />
        </aside>
      </div>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          saved={savedJobIds.includes(selectedJob.id)}
          onClose={() => setSelectedJob(null)}
          onSave={() => toggleSavedJob(selectedJob)}
        />
      )}
    </div>
  )
}

function JobFeedCard({ job, featured = false, saved = false, onSave, onDetails, onQuickApply }) {
  const matchMeta = matchMetaFor(job.matchScore)

  return (
    <article className={`rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
      featured ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <CompanyMark company={job.company} featured={featured} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-slate-950">{job.title}</h2>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${matchMeta.className}`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {job.matchScore}% match
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {job.company}
                </span>
                <span className="text-slate-300">/</span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {job.location}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Salary</p>
            <p className="mt-1 font-bold text-slate-900">{job.salaryRange}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Fact icon={MapPin} label="Distance" value={`${job.distanceKm.toFixed(1)} km`} />
          <Fact icon={BriefcaseBusiness} label="Setup" value={job.workSetup || 'Not specified'} />
          <Fact icon={CalendarDays} label="Deadline" value={formatDate(job.deadline) || 'Open until filled'} />
        </div>

        <div className="flex flex-wrap gap-2">
          {job.requiredSkills.slice(0, 6).map((skill) => (
            <span key={`${job.id}-${skill}`} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              {skill}
            </span>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          {Object.entries(job.matchSummary).map(([key, value]) => (
            <ScorePill key={key} label={titleCase(key)} value={value} />
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-500">
            {job.missingCriticalSkills.length
              ? `Improve this match by adding: ${job.missingCriticalSkills.slice(0, 2).join(', ')}.`
              : 'You meet the critical skill signals currently visible for this vacancy.'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
              aria-pressed={saved}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition hover:-translate-y-0.5 ${
                saved ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:text-blue-700'
              }`}
            >
              {saved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
            </button>
            <Button variant="outline" onClick={onDetails}>
              Details
            </Button>
            <Button variant="navy" icon={ChevronRight} onClick={onQuickApply}>
              Quick Apply
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

function JobDetailModal({ job, saved, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <Badge variant="review">Match explanation</Badge>
            <h2 className="mt-3 text-xl font-black text-slate-950">{job.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{job.company} / {job.location}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close details">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <Fact icon={Sparkles} label="Match" value={`${job.matchScore}%`} />
            <Fact icon={WalletCards} label="Salary" value={job.salaryRange} />
            <Fact icon={BriefcaseBusiness} label="Vacancies" value={job.vacancies || 1} />
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
          <Button variant="outline" onClick={onSave} icon={saved ? BookmarkCheck : Bookmark}>
            {saved ? 'Saved' : 'Save Job'}
          </Button>
          <Button variant="navy" icon={ChevronRight} onClick={() => toast.success(`Application workflow opened for ${job.title}.`)}>
            Quick Apply
          </Button>
        </div>
      </div>
    </div>
  )
}

function ProfilePanel({ seeker }) {
  return (
    <Card padding="lg">
      <div className="flex items-start gap-4">
        <img src={seeker.profilePhoto} alt={seeker.name} className="h-16 w-16 rounded-2xl border border-slate-200 object-cover shadow-sm" />
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">NSRP Profile</p>
          <h2 className="mt-2 truncate text-lg font-black text-slate-950">{seeker.name}</h2>
          <p className="mt-1 text-sm text-slate-600">{seeker.headline}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-slate-900">Profile readiness</p>
            <p className="text-xs text-slate-500">Used by matching and PESO assistance</p>
          </div>
          <span className="text-2xl font-black text-blue-900">{seeker.nsrpCompletion}%</span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-900 to-blue-500" style={{ width: `${Math.min(seeker.nsrpCompletion, 100)}%` }} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button to="/seeker/profile" variant="navy" size="sm" icon={ShieldCheck}>View Profile</Button>
          <Button to="/seeker/onboarding" variant="outline" size="sm">Update NSRP</Button>
        </div>
      </div>
    </Card>
  )
}

function NextActions({ profile }) {
  const checks = profile?.profile_strength?.checks ?? []
  const incomplete = checks.filter((check) => !check.complete).slice(0, 3)
  const actions = incomplete.length ? incomplete : [
    { key: 'applications', label: 'Save or apply to one high-match vacancy', complete: false },
    { key: 'bulletin', label: 'Check PESO bulletin for job fair schedules', complete: false },
    { key: 'skills', label: 'Keep your skills and experience updated', complete: false },
  ]

  return (
    <Card padding="lg">
      <CardHeader title="Next Best Actions" subtitle="Small updates that improve matching and referrals." />
      <div className="space-y-3">
        {actions.map((item) => (
          <div key={item.key} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-800">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Helps PESO and employers evaluate your profile faster.</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ActivityPanel({ activeApplications }) {
  return (
    <Card padding="lg">
      <CardHeader
        title="Application Activity"
        subtitle={`${activeApplications} active application${activeApplications === 1 ? '' : 's'} on record.`}
      />
      <div className="space-y-4">
        {activityTimeline.map((item) => (
          <div key={item.id} className="flex gap-3">
            <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${
              item.status === 'complete' ? 'bg-emerald-500' : item.status === 'active' ? 'bg-blue-600' : 'bg-slate-300'
            }`} />
            <div>
              <p className="text-sm font-bold text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm leading-5 text-slate-600">{item.detail}</p>
              <p className="mt-1 text-xs font-bold text-slate-400">{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function BulletinPreview() {
  return (
    <Card padding="lg">
      <CardHeader
        title="PESO News"
        subtitle="Official reminders and job seeker opportunities."
        action={<Bell className="h-5 w-5 text-amber-500" />}
      />
      <div className="space-y-3">
        {bulletins.slice(0, 2).map((item) => (
          <BulletinCard key={item.id} item={item} compact />
        ))}
      </div>
    </Card>
  )
}

function BulletinCard({ item, compact = false }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 rounded-lg p-2 ${item.priority === 'high' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
          {item.priority === 'high' ? <Megaphone className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-slate-950">{item.title}</h3>
            <Badge variant={item.priority === 'high' ? 'warning' : 'review'} icon={false}>{item.type}</Badge>
          </div>
          <p className={`mt-2 text-sm leading-6 text-slate-600 ${compact ? 'line-clamp-2' : ''}`}>{item.detail}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{item.date}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{item.location}</span>
          </div>
        </div>
      </div>
    </article>
  )
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-800">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-slate-900">{value}</p>
    </div>
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
        <div className="h-full rounded-full bg-blue-800" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
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
        <div className="h-full rounded-full bg-blue-800" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

function CompanyMark({ company, featured }) {
  return (
    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${
      featured ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-slate-100 text-slate-700'
    }`}>
      {companyMonogram(company)}
    </div>
  )
}

function EmptyFeedState({ title, text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <Search className="mx-auto h-8 w-8 text-slate-300" />
      <h3 className="mt-4 font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{text}</p>
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

    return {
      id: String(row.post_id ?? row.id),
      title: row.job_title ?? 'Untitled vacancy',
      company: row.employer?.company_name ?? 'PESO Partner Employer',
      location: [row.barangay, row.city_municipality, row.province].filter(Boolean).join(', ') || row.location || 'Location not specified',
      distanceKm: Number(row.distance_km ?? 0),
      salaryRange: formatSalary(row),
      requiredSkills,
      matchScore: Math.round(Number(match.percentage ?? match.total_score ?? 0)),
      workSetup: row.work_setup,
      employmentType: row.employment_type,
      vacancies: row.vacancies_count,
      postedAt: row.posted_at,
      deadline: row.application_deadline,
      description: row.job_description,
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

function formatSalary(job) {
  if (job.hide_salary) return 'Salary hidden'
  const min = Number(job.salary_min ?? 0)
  const max = Number(job.salary_max ?? 0)
  const type = job.salary_type ? ` / ${String(job.salary_type).toLowerCase()}` : ''

  if (min && max) return `${currency(min)} - ${currency(max)}${type}`
  if (min) return `${currency(min)}+${type}`
  if (max) return `Up to ${currency(max)}${type}`
  return 'Salary not specified'
}

function currency(value) {
  return `PHP ${Number(value).toLocaleString('en-PH')}`
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

  if (score >= 75) {
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

function readSavedJobs() {
  try {
    return JSON.parse(window.localStorage.getItem(savedJobsStorageKey) ?? '[]')
  } catch {
    return []
  }
}
