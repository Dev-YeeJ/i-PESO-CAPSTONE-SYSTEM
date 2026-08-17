import { createElement, useEffect, useState } from 'react'
import { BriefcaseBusiness, CalendarDays, CheckCircle2, MapPin, UsersRound, CalendarClock } from 'lucide-react'
import { AlertBox, Card, CardHeader, EmptyState, LoadingSkeleton } from '@/components/ui'
import { listJobFairs } from '@/services/jobFairService'

const reminders = ['Bring multiple copies of your résumé', 'Bring a valid ID', 'Dress appropriately', 'Arrive early']
const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'long' }) : 'To be announced'

export default function JobFairFeed() {
  const [fairs, setFairs] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => { listJobFairs().then(setFairs).catch((e) => setError(e.response?.data?.message ?? 'Unable to load Job Fairs.')).finally(() => setLoading(false)) }, [])
  
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
            Plan your visit and prepare your documents. No digital RSVP, QR pass, or app check-in is required.
          </p>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>}

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
                  <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] uppercase tracking-wider font-extrabold text-blue-700">
                    {fair.target_sector || fair.sector || 'Multi-sector'}
                  </span>
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

              {!!fair.participating_employers?.length && (
                <section className="mt-8 border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Approved participating employers</h3>
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
