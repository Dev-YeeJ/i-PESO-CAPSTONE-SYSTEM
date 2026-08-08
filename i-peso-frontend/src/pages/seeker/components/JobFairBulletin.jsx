import { CalendarDays, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function JobFairBulletin({ fairs = [] }) {
  if (!fairs.length) return null

  return (
    <section className="mx-auto mb-4 max-w-[1440px] rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm shadow-blue-950/[0.03] sm:mb-5 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-blue-700">PESO Job Fair Bulletin</p>
          <h2 className="mt-1 text-lg font-black text-blue-950">Upcoming employment events</h2>
          <p className="mt-1 text-sm text-blue-800">Informational only. No RSVP, QR pass, or digital check-in required.</p>
        </div>
        <Link to="/seeker/job-fairs" className="rounded-lg bg-blue-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-900">
          View details
        </Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {fairs.map((fair) => (
          <div key={fair.job_fair_id} className="rounded-lg bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
            <p className="font-black text-slate-950">{fair.title}</p>
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <CalendarDays className="h-4 w-4" />
              {fair.start_date} - {fair.start_time?.slice(0, 5)}
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs text-slate-600">
              <MapPin className="h-4 w-4" />
              {fair.venue}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
