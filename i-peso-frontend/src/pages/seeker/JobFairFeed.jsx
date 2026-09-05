import { useEffect, useState } from 'react'
import { BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, MapPin, QrCode, UsersRound, CalendarClock } from 'lucide-react'
import { AlertBox, Button, Card, CardHeader, EmptyState, LoadingSkeleton } from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LocationPreviewCard from '@/components/maps/LocationPreviewCard'
import DigitalQRPass from './DigitalQRPass'
import PosterFeedTab from './components/PosterFeedTab'
import { listJobFairs, rsvpToJobFair } from '@/services/jobFairService'

const reminders = ['Bring multiple copies of your résumé', 'Bring a valid ID', 'Dress appropriately', 'Arrive early']
const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'long' }) : 'To be announced'
// Mirrors JobFairService::MAP_STATUSES on the backend — the set of statuses
// where the fair is still upcoming or in progress, so RSVP still makes sense.
const registrableStatuses = ['published', 'accepting_employers', 'upcoming', 'ongoing']

export default function JobFairFeed() {
  const [fairs, setFairs] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const [passes, setPasses] = useState({}); const [registeringId, setRegisteringId] = useState(null); const [registerErrors, setRegisterErrors] = useState({})
  useEffect(() => { listJobFairs().then(setFairs).catch((e) => setError(e.response?.data?.message ?? 'Unable to load Job Fairs.')).finally(() => setLoading(false)) }, [])

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
    <div className="space-y-10 pb-12 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 px-8 py-8 text-white shadow-xl sm:px-12 sm:py-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"></div>
        
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">PESO Bulletin Board</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white drop-shadow-sm">Upcoming Job Fairs</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-blue-100">
            Plan your visit and prepare your documents. Register below for a digital QR pass you can show at the venue — or simply walk in on the day.
          </p>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>}

      <Tabs defaultValue="fairs">
        <TabsList>
          <TabsTrigger value="fairs">Job Fairs</TabsTrigger>
          <TabsTrigger value="posters">Employer Posters</TabsTrigger>
        </TabsList>

        <TabsContent value="fairs">
          <div className="space-y-10">
            <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-black text-emerald-950 mb-1">Preparation Reminders</h2>
              <p className="text-sm text-emerald-800 mb-6 font-semibold">The physical event follows the usual PESO process.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {reminders.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white border border-emerald-100 p-4 text-sm font-bold text-emerald-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />{item}
                  </div>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="grid gap-6"><LoadingSkeleton variant="card" rows={4} /></div>
            ) : fairs.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
                <EmptyState icon={CalendarDays} title="No job fairs announced yet" description="Published PESO job fair announcements will appear here." />
              </div>
            ) : (
              <div className="space-y-6">
                {fairs.map((fair) => (
                  <article key={fair.job_fair_id} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] uppercase tracking-wider font-extrabold text-blue-700">
                            {fair.target_sector || fair.sector || 'Multi-sector'}
                          </span>
                          <EmployerCountBadge count={fair.participating_employers?.length ?? 0} />
                        </div>
                        <h2 className="mt-3 text-2xl font-black text-slate-950 tracking-tight">{fair.title}</h2>
                        <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600">{fair.description}</p>
                      </div>
                      <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 shadow-sm">
                        {fair.status.replaceAll('_', ' ')}
                      </span>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                      <Info icon={CalendarClock} label="Date and time" value={`${formatDate(fair.start_date)} · ${fair.start_time?.slice(0, 5) || ''}–${fair.end_time?.slice(0, 5) || ''}`} />
                      <Info icon={MapPin} label="Venue" value={fair.venue} />
                      <Info icon={UsersRound} label="Partners" value={(fair.partner_agencies ?? []).join(', ') || 'PESO / LGU'} />
                    </div>

                    <section className="mt-8 border-t border-slate-100 pt-6">
                      {passes[fair.job_fair_id] ? (
                        <DigitalQRPass pass={passes[fair.job_fair_id]} />
                      ) : registrableStatuses.includes(fair.status) ? (
                        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-blue-900">
                              {fair.is_rsvped ? 'You’re registered' : 'Reserve your spot'}
                            </h3>
                            <p className="mt-1 text-sm font-semibold text-blue-800">
                              {fair.is_rsvped ? 'Get your digital QR pass to show at the venue.' : 'Register to get a digital QR pass — walk-ins are still welcome too.'}
                            </p>
                            {registerErrors[fair.job_fair_id] && <p className="mt-2 text-sm font-bold text-red-600">{registerErrors[fair.job_fair_id]}</p>}
                          </div>
                          <Button variant="navy" icon={QrCode} disabled={registeringId === fair.job_fair_id} onClick={() => register(fair)}>
                            {registeringId === fair.job_fair_id ? 'Registering…' : fair.is_rsvped ? 'View my QR pass' : 'Register for this job fair'}
                          </Button>
                        </div>
                      ) : null}
                    </section>

                    {fair.latitude && fair.longitude && (
                      <section className="mt-8 border-t border-slate-100 pt-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Find the venue</h3>
                        <div className="mt-3">
                          <LocationPreviewCard title={fair.venue || 'Venue'} fullAddress={fair.full_address || fair.venue} latitude={fair.latitude} longitude={fair.longitude} />
                        </div>
                      </section>
                    )}

                    {!!fair.participating_employers?.length && (
                      <section className="mt-8 border-t border-slate-100 pt-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
                          Approved participating employers ({fair.participating_employers.length})
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {fair.participating_employers.map((e) => (
                            <span key={e.employer_id} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm">
                              {e.company_name}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    {!!fair.published_vacancies?.length && (
                      <section className="mt-8 border-t border-slate-100 pt-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Published vacancies</h3>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {fair.published_vacancies.map((v) => (
                            <div key={v.post_id} className="flex items-center gap-4 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm shadow-sm transition hover:border-slate-200 hover:bg-white hover:shadow-md">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100">
                                <BriefcaseBusiness className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-tight">{v.job_title}</p>
                                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mt-1">{v.vacancies_count} opening(s)</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </article>
                ))}
              </div>
            )}
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
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider ${
      count > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'
    }`}
    >
      <Building2 className="h-3.5 w-3.5" />
      {count > 0 ? `${count} employer${count === 1 ? '' : 's'} confirmed` : 'Employers confirming soon'}
    </span>
  )
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-start gap-4">
       <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100">
          <Icon className="h-5 w-5 text-indigo-400" />
       </div>
       <div>
         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
         <p className="mt-1 text-sm font-bold text-slate-800 leading-tight">{value || 'To be announced'}</p>
       </div>
    </div>
  )
}
