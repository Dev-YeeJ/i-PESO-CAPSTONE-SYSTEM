import { createElement, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BriefcaseBusiness, Building2, CalendarDays, Check, Clock, MapPin, QrCode, UsersRound } from 'lucide-react'
import { Button, EmptyState, LoadingSkeleton } from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LocationPreviewCard from '@/components/maps/LocationPreviewCard'
import DigitalQRPass from './DigitalQRPass'
import PosterFeedTab from './components/PosterFeedTab'
import { listJobFairs, rsvpToJobFair } from '@/services/jobFairService'
import PortalPageHeader from '@/components/shell/PortalPageHeader'

const reminders = ['Bring several printed copies of your resume', 'Bring a valid government ID', 'Dress for an interview', 'Arrive early, and show your QR pass at the entrance']
const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'long' }) : 'To be announced'
// Mirrors JobFairService::MAP_STATUSES on the backend — the set of statuses
// where the fair is still upcoming or in progress, so RSVP still makes sense.
const registrableStatuses = ['published', 'accepting_employers', 'upcoming', 'ongoing']
const todayIso = () => new Date().toISOString().slice(0, 10)
// A fair is "past" once its last day is behind us, or PESO has closed it out.
const isPast = (fair) => ['closed', 'completed'].includes(fair.status) || String(fair.end_date ?? fair.start_date ?? '9999') < todayIso()
const monthDay = (value) => {
  const date = value ? new Date(`${value}T00:00:00`) : null
  return date && !Number.isNaN(date.getTime())
    ? { month: date.toLocaleDateString('en-PH', { month: 'short' }), day: String(date.getDate()).padStart(2, '0') }
    : { month: '', day: '—' }
}
const timeRange = (fair) => [fair.start_time?.slice(0, 5), fair.end_time?.slice(0, 5)].filter(Boolean).join(' to ')

export default function JobFairFeed() {
  const [fairs, setFairs] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const [passes, setPasses] = useState({}); const [registeringId, setRegisteringId] = useState(null); const [registerErrors, setRegisterErrors] = useState({})
  const [when, setWhen] = useState('upcoming')
  useEffect(() => { listJobFairs().then(setFairs).catch((e) => setError(e.response?.data?.message ?? 'Unable to load Job Fairs.')).finally(() => setLoading(false)) }, [])
  const grouped = useMemo(() => ({
    upcoming: fairs.filter((fair) => !isPast(fair)),
    past: fairs.filter(isPast).reverse(),
  }), [fairs])
  const shown = grouped[when]

  // Lets a link elsewhere in the app (e.g. the "View full job fair page"
  // popup for a job-fair-linked job) land directly on that fair's card
  // instead of dumping the seeker at the top of the whole list.
  useEffect(() => {
    if (loading || fairs.length === 0 || !window.location.hash) return
    const target = document.querySelector(window.location.hash)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [loading, fairs])

  const register = async (fair) => {
    setRegisteringId(fair.job_fair_id)
    setRegisterErrors((prev) => ({ ...prev, [fair.job_fair_id]: '' }))
    try {
      const { pass } = await rsvpToJobFair(fair.job_fair_id)
      setPasses((prev) => ({ ...prev, [fair.job_fair_id]: pass }))
    } catch (e) {
      setRegisterErrors((prev) => ({ ...prev, [fair.job_fair_id]: e.response?.data?.errors?.job_fair?.[0] ?? e.response?.data?.message ?? 'Unable to register right now.' }))
    } finally {
      setRegisteringId(null)
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-12">
      <PortalPageHeader
        title="Job Fairs"
        subtitle="Meet several employers in one day. Register for a QR pass for faster check-in, or walk in on the day."
      />

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>}

      <Tabs defaultValue="fairs">
        <TabsList>
          <TabsTrigger value="fairs">Job fairs</TabsTrigger>
          <TabsTrigger value="posters">Employer posters</TabsTrigger>
        </TabsList>

        <TabsContent value="fairs">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-5">
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-card" role="group" aria-label="Show fairs">
                {[['upcoming', 'Upcoming'], ['past', 'Past']].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={when === key}
                    onClick={() => setWhen(key)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${when === key ? 'bg-brand-navy text-white' : 'text-slate-600 hover:text-brand-navy'}`}
                  >
                    {label} <span className={`ml-1 rounded-full px-1.5 text-xs ${when === key ? 'bg-white/20' : 'bg-slate-100'}`}>{grouped[key].length}</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <LoadingSkeleton variant="card" rows={3} />
              ) : shown.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-card">
                  <EmptyState
                    icon={CalendarDays}
                    title={when === 'upcoming' ? 'No job fairs coming up yet' : 'No past job fairs'}
                    description={when === 'upcoming' ? 'PESO announces fairs here and in your notifications as soon as they are published.' : 'Fairs you could have attended will be listed here after they end.'}
                  />
                </div>
              ) : (
                shown.map((fair, index) => {
                  const { month, day } = monthDay(fair.start_date)
                  const past = when === 'past'
                  const registered = Boolean(passes[fair.job_fair_id] || fair.is_rsvped)
                  return (
                    <article key={fair.job_fair_id} id={`fair-${fair.job_fair_id}`} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
                      {fair.banner_url && <img src={fair.banner_url} alt="" className="max-h-72 w-full object-cover" />}
                      <div className="flex gap-5 p-6">
                        <div className={`w-14 shrink-0 rounded-xl py-2 text-center ${index === 0 && !past ? 'bg-brand-navy text-white' : 'bg-[#e8f0fc] text-brand-navy'}`}>
                          <p className={`text-[11px] font-semibold ${index === 0 && !past ? 'text-white/70' : 'text-brand-navy/70'}`}>{month}</p>
                          <p className="font-display text-2xl leading-none">{day}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{fair.target_sector || 'All sectors'}</span>
                            <EmployerCountBadge count={fair.participating_employers?.length ?? 0} />
                            {registered && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Check className="h-3.5 w-3.5" aria-hidden="true" />Registered</span>}
                            {past && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">{fair.status.replaceAll('_', ' ')}</span>}
                          </div>
                          <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{fair.title}</h2>
                          {fair.description && <p className="mt-2 max-w-[70ch] text-[15px] leading-6 text-slate-600">{fair.description}</p>}
                          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                            <Info icon={Clock} label="Date and time" value={[formatDate(fair.start_date), timeRange(fair)].filter(Boolean).join(', ')} />
                            <Info icon={MapPin} label="Venue" value={fair.venue} />
                            <Info icon={UsersRound} label="Partners" value={(fair.partner_agencies ?? []).join(', ') || 'PESO and the LGU'} />
                          </dl>
                        </div>
                      </div>

                      {!past && (passes[fair.job_fair_id] ? (
                        <div className="border-t border-slate-100 bg-brand-canvas p-6">
                          <DigitalQRPass pass={passes[fair.job_fair_id]} />
                        </div>
                      ) : registrableStatuses.includes(fair.status) ? (
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-[#e8f0fc] px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-brand-navy">{fair.is_rsvped ? "You're registered" : 'Registration is open'}</p>
                            <p className="text-sm text-brand-navy/80">{fair.is_rsvped ? 'Open your QR pass to show at the entrance.' : "You'll get a QR pass right away. Walk-ins are welcome too."}</p>
                            {registerErrors[fair.job_fair_id] && <p className="mt-1 text-sm font-semibold text-red-700" role="alert">{registerErrors[fair.job_fair_id]}</p>}
                          </div>
                          <Button icon={QrCode} loading={registeringId === fair.job_fair_id} onClick={() => register(fair)}>
                            {registeringId === fair.job_fair_id ? 'Registering…' : fair.is_rsvped ? 'View my QR pass' : 'Register for this fair'}
                          </Button>
                        </div>
                      ) : null)}

                      {(!!fair.participating_employers?.length || !!fair.published_vacancies?.length || (fair.latitude && fair.longitude)) && (
                        <div className="space-y-6 border-t border-slate-100 p-6">
                          {!!fair.participating_employers?.length && (
                            <section>
                              <h3 className="text-sm font-semibold text-slate-900">Employers attending ({fair.participating_employers.length})</h3>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {fair.participating_employers.map((employer) => (
                                  <Link
                                    key={employer.employer_id}
                                    to={`/seeker/job-fairs/${fair.job_fair_id}/employers/${employer.employer_id}`}
                                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-navy hover:text-brand-navy"
                                  >
                                    {employer.company_name}
                                  </Link>
                                ))}
                              </div>
                            </section>
                          )}
                          {!!fair.published_vacancies?.length && (
                            <section>
                              <h3 className="text-sm font-semibold text-slate-900">Vacancies at this fair</h3>
                              <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {fair.published_vacancies.map((vacancy) => (
                                  <li key={vacancy.post_id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 text-sm">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fc] text-brand-navy"><BriefcaseBusiness className="h-4 w-4" aria-hidden="true" /></span>
                                    <span><span className="block font-semibold leading-tight text-slate-900">{vacancy.job_title}</span><span className="text-slate-500">{vacancy.vacancies_count} opening{vacancy.vacancies_count === 1 ? '' : 's'}</span></span>
                                  </li>
                                ))}
                              </ul>
                            </section>
                          )}
                          {fair.latitude && fair.longitude && (
                            <section>
                              <h3 className="text-sm font-semibold text-slate-900">Find the venue</h3>
                              <div className="mt-3">
                                <LocationPreviewCard title={fair.venue || 'Venue'} fullAddress={fair.full_address || fair.venue} latitude={fair.latitude} longitude={fair.longitude} />
                              </div>
                            </section>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })
              )}
            </div>

            <aside className="space-y-5 lg:sticky lg:top-24">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <h2 className="font-semibold text-slate-900">Before you go</h2>
                <ul className="mt-3 space-y-2.5">
                  {reminders.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy" aria-hidden="true" />{item}</li>
                  ))}
                </ul>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <h2 className="font-semibold text-slate-900">Walking in?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">That&apos;s fine. Registering only speeds up check-in, and the day follows the usual PESO process.</p>
              </section>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="posters">
          <PosterFeedTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Informational only — never a gate. The fair is visible to seekers the
 * moment PESO publishes it, regardless of how many employers have joined;
 * this just tells a seeker how populated it's getting so far, so they can
 * judge for themselves whether it's worth the trip.
 */
function EmployerCountBadge({ count }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
      count > 0 ? 'bg-brand-gold text-brand-navy' : 'bg-slate-100 text-slate-600'
    }`}
    >
      <Building2 className="h-3.5 w-3.5" />
      {count > 0 ? `${count} employer${count === 1 ? '' : 's'} confirmed` : 'Employers confirming soon'}
    </span>
  )
}

function Info({ icon: InfoIcon, label, value }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-slate-500">{createElement(InfoIcon, { className: 'h-4 w-4', 'aria-hidden': true })}{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-900">{value || 'To be announced'}</dd>
    </div>
  )
}
