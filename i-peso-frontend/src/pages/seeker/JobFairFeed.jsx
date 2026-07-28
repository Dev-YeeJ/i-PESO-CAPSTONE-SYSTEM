import { createElement, useEffect, useState } from 'react'
import { BriefcaseBusiness, CalendarDays, CheckCircle2, MapPin, UsersRound } from 'lucide-react'
import { AlertBox, Card, CardHeader, EmptyState, LoadingSkeleton } from '@/components/ui'
import { listJobFairs } from '@/services/jobFairService'

const reminders = ['Bring multiple copies of your résumé', 'Bring a valid ID', 'Dress appropriately', 'Arrive early']
const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'long' }) : 'To be announced'

export default function JobFairFeed() {
  const [fairs, setFairs] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => { listJobFairs().then(setFairs).catch((e) => setError(e.response?.data?.message ?? 'Unable to load Job Fairs.')).finally(() => setLoading(false)) }, [])
  return <div className="portal-page">
    <div><p className="portal-eyebrow">PESO Bulletin Board</p><h1 className="portal-title mt-1">Upcoming Job Fairs</h1><p className="portal-subtitle">Plan your visit and prepare your documents. No digital RSVP, QR pass, or app check-in is required.</p></div>
    {error && <AlertBox variant="danger" title="Unable to load announcements">{error}</AlertBox>}
    <Card><CardHeader title="Preparation reminders" subtitle="The physical event follows the usual PESO process." /><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{reminders.map((item) => <div key={item} className="flex gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"><CheckCircle2 className="h-5 w-5 shrink-0" />{item}</div>)}</div></Card>
    {loading ? <LoadingSkeleton variant="card" rows={3} /> : fairs.length === 0 ? <EmptyState icon={CalendarDays} title="No job fairs announced yet" description="Published PESO job fair announcements will appear here." /> :<div className="space-y-5">{fairs.map((fair) => <Card key={fair.job_fair_id}><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-800">{fair.target_sector || fair.sector || 'Multi-sector'}</span><h2 className="mt-3 text-xl font-black text-slate-950">{fair.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{fair.description}</p></div><span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">{fair.status.replaceAll('_', ' ')}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Info icon={CalendarDays} label="Date and time" value={`${formatDate(fair.start_date)} · ${fair.start_time?.slice(0, 5) || ''}–${fair.end_time?.slice(0, 5) || ''}`} /><Info icon={MapPin} label="Venue" value={fair.venue} /><Info icon={UsersRound} label="Partners" value={(fair.partner_agencies ?? []).join(', ') || 'PESO / LGU'} /></div>
      {!!fair.participating_employers?.length && <section className="mt-5 border-t pt-4"><h3 className="text-sm font-black">Approved participating employers</h3><div className="mt-2 flex flex-wrap gap-2">{fair.participating_employers.map((e) => <span key={e.employer_id} className="rounded-full border bg-white px-3 py-1 text-xs font-semibold">{e.company_name}</span>)}</div></section>}
      {!!fair.published_vacancies?.length && <section className="mt-5 border-t pt-4"><h3 className="text-sm font-black">Published vacancies</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{fair.published_vacancies.map((v) => <div key={v.post_id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm"><BriefcaseBusiness className="h-4 w-4" /><strong>{v.job_title}</strong><span className="text-slate-500">· {v.vacancies_count} opening(s)</span></div>)}</div></section>}
    </Card>)}</div>}
  </div>
}

function Info({ icon, label, value }) { return <div className="rounded-lg border bg-slate-50 p-3"><p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">{createElement(icon, { className: 'h-4 w-4' })}{label}</p><p className="mt-2 text-sm font-semibold text-slate-800">{value || 'To be announced'}</p></div> }
