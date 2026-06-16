import { useMemo, useState } from 'react'
import {
  Bell,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Clock3,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge, Button, Card, CardHeader } from '@/components/ui'

const createAvatarDataUrl = (name, startColor = '#123563', endColor = '#1d4ed8') => {
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
      <text x="50%" y="54%" text-anchor="middle" fill="white" font-family="DM Sans, Arial, sans-serif" font-size="42" font-weight="700">${initials}</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const mockSeeker = {
  name: 'Maria Regina Santos',
  profilePhoto: createAvatarDataUrl('Maria Regina Santos'),
  headline: 'Administrative Assistant',
  nsrpCompletion: 85,
}

const mockJobs = [
  {
    id: 1,
    title: 'Administrative Aide IV',
    company: 'Urdaneta City LGU',
    location: 'Nancayasan, Urdaneta City',
    distanceKm: 1.8,
    salaryRange: 'PHP 18,500 - PHP 22,000 / month',
    requiredSkills: ['Records Management', 'MS Excel', 'Document Control', 'Client Service'],
    matchScore: 95,
  },
  {
    id: 2,
    title: 'HR Assistant',
    company: 'Pangasinan Allied Services',
    location: 'San Vicente, Urdaneta City',
    distanceKm: 3.2,
    salaryRange: 'PHP 17,000 - PHP 21,000 / month',
    requiredSkills: ['Recruitment Support', 'HRIS', 'Data Encoding', 'Communication'],
    matchScore: 91,
  },
  {
    id: 3,
    title: 'Cashier / Front Desk Associate',
    company: 'CB Mall Urdaneta',
    location: 'Poblacion, Urdaneta City',
    distanceKm: 4.4,
    salaryRange: 'PHP 15,000 - PHP 18,000 / month',
    requiredSkills: ['Cash Handling', 'POS Systems', 'Customer Service', 'Inventory'],
    matchScore: 82,
  },
  {
    id: 4,
    title: 'Data Encoder',
    company: 'North Luzon Diagnostics',
    location: 'Mabini, Urdaneta City',
    distanceKm: 5.1,
    salaryRange: 'PHP 16,000 - PHP 19,500 / month',
    requiredSkills: ['Typing', 'Spreadsheet Management', 'Data Validation', 'Confidentiality'],
    matchScore: 76,
  },
  {
    id: 5,
    title: 'Customer Support Associate',
    company: 'PESO Partner BPO Hub',
    location: 'Anonas, Urdaneta City',
    distanceKm: 6.8,
    salaryRange: 'PHP 20,000 - PHP 25,000 / month',
    requiredSkills: ['Email Support', 'CRM', 'Problem Solving', 'English Communication'],
    matchScore: 72,
  },
]

const mockAnnouncements = [
  {
    id: 1,
    title: 'Upcoming Mega Job Fair at UCU Gymnasium',
    detail: 'Bring multiple resumes and valid IDs on July 12 for walk-in interviews with PESO partner employers.',
    meta: 'Urdaneta City PESO • 8:00 AM',
  },
  {
    id: 2,
    title: 'TESDA Certificate Validation Week',
    detail: 'Job seekers can upload or verify TESDA-related records through the PESO help desk for faster profile completion.',
    meta: 'City Hall Annex • Weekdays',
  },
  {
    id: 3,
    title: 'Resume and Interview Coaching',
    detail: 'Free one-on-one coaching slots are available this Friday for first-time applicants and returning OFWs.',
    meta: 'PESO Career Center • Limited slots',
  },
]

export default function JobSeekerHome({ profile = null, user = null, error = '' }) {
  const [draftQuery, setDraftQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [savedJobIds, setSavedJobIds] = useState([])

  const seeker = useMemo(() => buildSeekerView(profile, user), [profile, user])

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) return mockJobs

    return mockJobs.filter((job) => (
      [job.title, job.company, job.location, job.salaryRange, ...job.requiredSkills]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    ))
  }, [searchQuery])

  const smartMatches = useMemo(
    () => [...filteredJobs].sort((left, right) => right.matchScore - left.matchScore).slice(0, 2),
    [filteredJobs],
  )

  const smartMatchIds = useMemo(
    () => new Set(smartMatches.map((job) => job.id)),
    [smartMatches],
  )

  const localFeedJobs = useMemo(
    () => filteredJobs.filter((job) => !smartMatchIds.has(job.id)),
    [filteredJobs, smartMatchIds],
  )

  const handleSearch = (event) => {
    event.preventDefault()
    setSearchQuery(draftQuery)
  }

  const toggleSavedJob = (job) => {
    const nextSaved = savedJobIds.includes(job.id)
      ? savedJobIds.filter((savedJobId) => savedJobId !== job.id)
      : [...savedJobIds, job.id]

    setSavedJobIds(nextSaved)
    toast.success(
      nextSaved.includes(job.id)
        ? `${job.title} saved to your dashboard list.`
        : `${job.title} removed from your saved jobs.`,
    )
  }

  const handleQuickApply = (job) => {
    toast.success(`Quick Apply is ready for ${job.title} at ${job.company}.`)
  }

  return (
    <div className="portal-page">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
        <section className="space-y-6">
          <Card padding="lg" className="bg-white">
            <div className="space-y-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Badge variant="review" className="border-blue-100 bg-blue-50 text-blue-700">
                    PESO Job Feed
                  </Badge>
                  <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                    Welcome back, {seeker.firstName}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Search nearby PESO opportunities, review your highest smart matches, and apply faster using your NSRP profile.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Today&apos;s Focus</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {smartMatches.length ? `${smartMatches[0].title} is your strongest nearby match.` : 'Complete your profile to unlock stronger matches.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSearch} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={draftQuery}
                    onChange={(event) => setDraftQuery(event.target.value)}
                    placeholder="Search by job title, company, barangay, or hard skill"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <Button type="submit" variant="navy" className="sm:min-w-36">
                  Search
                </Button>
              </form>
            </div>
          </Card>

          <Card padding="lg" className="border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50">
            <CardHeader
              title="🔥 Top Smart Matches"
              subtitle="Highest-scoring opportunities based on your preferred occupation, declared hard skills, and local target area."
              action={(
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ranked by i-PESO matching
                </span>
              )}
            />

            <div className="space-y-4">
              {smartMatches.length ? (
                smartMatches.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    featured
                    saved={savedJobIds.includes(job.id)}
                    onSave={() => toggleSavedJob(job)}
                    onQuickApply={() => handleQuickApply(job)}
                  />
                ))
              ) : (
                <EmptyFeedState
                  title="No smart matches for that search"
                  text="Try a wider keyword or clear the search to see your strongest local recommendations again."
                />
              )}
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader
              title="Local Job Feed"
              subtitle={searchQuery
                ? `Showing PESO job cards that match "${searchQuery}".`
                : 'Recent local opportunities near Urdaneta City and nearby partner employers.'}
              action={(
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {filteredJobs.length} job{filteredJobs.length === 1 ? '' : 's'} found
                </span>
              )}
            />

            <div className="space-y-4">
              {localFeedJobs.length ? (
                localFeedJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    saved={savedJobIds.includes(job.id)}
                    onSave={() => toggleSavedJob(job)}
                    onQuickApply={() => handleQuickApply(job)}
                  />
                ))
              ) : (
                <EmptyFeedState
                  title="No additional local jobs right now"
                  text="Your top smart matches are still available above. More partner vacancies will appear here as they are published."
                />
              )}
            </div>
          </Card>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card padding="lg">
            <div className="flex items-start gap-4">
              <img
                src={seeker.profilePhoto}
                alt={seeker.name}
                className="h-16 w-16 rounded-2xl border border-slate-200 object-cover shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">NSRP Profile Tracker</p>
                <h2 className="mt-2 text-lg font-bold text-slate-950">{seeker.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{seeker.headline}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">Profile completion</p>
                  <p className="text-xs text-slate-500">Powered by your NSRP employment record</p>
                </div>
                <span className="text-2xl font-black text-brand-navy">{seeker.nsrpCompletion}%</span>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-navy to-blue-500 transition-all duration-300"
                  style={{ width: `${Math.min(seeker.nsrpCompletion, 100)}%` }}
                />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Your NSRP Profile is {seeker.nsrpCompletion}% complete. Add your TESDA certificates to reach 100%!
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button to="/seeker/profile" variant="navy" size="sm" icon={ShieldCheck}>
                  Update Profile
                </Button>
                <Button to="/seeker/onboarding" variant="outline" size="sm">
                  Continue NSRP Form
                </Button>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader
              title="PESO Announcements"
              subtitle="Urdaneta City employment updates and job seeker reminders."
              action={(
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  <Bell className="h-3.5 w-3.5" />
                  Live bulletin
                </span>
              )}
            />

            <div className="space-y-3">
              {mockAnnouncements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-700">
                      <Bell className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900">{announcement.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{announcement.detail}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        {announcement.meta}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function JobCard({ job, featured = false, saved = false, onSave, onQuickApply }) {
  return (
    <Card
      padding="md"
      interactive
      className={featured ? 'border-blue-200 bg-white/95' : ''}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${featured ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
              {companyMonogram(job.company)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-950">{job.title}</h3>
                <MatchBadge matchScore={job.matchScore} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {job.company}
                </span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {job.location}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Salary Range</p>
            <p className="mt-2 font-bold text-slate-900">{job.salaryRange}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
            <MapPin className="h-4 w-4 text-blue-700" />
            {job.distanceKm.toFixed(1)} km away
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
            <BriefcaseBusiness className="h-4 w-4 text-blue-700" />
            PESO partner listing
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {job.requiredSkills.map((skill) => (
            <span
              key={`${job.id}-${skill}`}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {featured
              ? 'Highlighted because it strongly aligns with your preferred occupation and declared hard skills.'
              : 'Review the skills and location, then bookmark or proceed with a quick application.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
              aria-pressed={saved}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition duration-200 hover:-translate-y-0.5 ${saved ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}
            >
              {saved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
            </button>
            <Button variant="navy" size="md" icon={ChevronRight} className="min-w-36" onClick={onQuickApply}>
              Quick Apply
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function MatchBadge({ matchScore }) {
  const meta = matchMetaFor(matchScore)

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${meta.className}`}>
      <Sparkles className="h-3.5 w-3.5" />
      {matchScore}% match
    </span>
  )
}

function EmptyFeedState({ title, text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <Search className="mx-auto h-8 w-8 text-slate-300" />
      <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  )
}

function buildSeekerView(profile, user) {
  const preferredOccupation = profile?.occupations?.find((occupation) => (
    occupation?.occupation_title
    || occupation?.general_term
    || occupation?.raw_job_title
  ))

  const name = fullName(profile) || user?.name || mockSeeker.name
  const nsrpCompletion = profile?.profile_strength?.percentage ?? mockSeeker.nsrpCompletion

  return {
    name,
    firstName: profile?.first_name || user?.name?.split(' ')[0] || mockSeeker.name.split(' ')[0],
    profilePhoto: mockSeeker.profilePhoto,
    headline: preferredOccupation?.occupation_title
      || preferredOccupation?.general_term
      || preferredOccupation?.raw_job_title
      || mockSeeker.headline,
    nsrpCompletion,
  }
}

function fullName(profile) {
  if (!profile) return ''
  return [profile.first_name, profile.middle_name, profile.last_name, profile.suffix].filter(Boolean).join(' ')
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
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function matchMetaFor(score) {
  if (score >= 90) {
    return {
      label: 'Excellent match',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }

  if (score >= 70) {
    return {
      label: 'Strong match',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    }
  }

  return {
    label: 'Potential match',
    className: 'border-slate-200 bg-slate-100 text-slate-600',
  }
}
