import { ArrowRight, CalendarDays, CircleCheck, Clock3, MapPin, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { categoryLabel, statusLabel } from './programConstants'
import EligibilityBadge from './EligibilityBadge'

const dateText = (value) => value
  ? new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
  : 'No deadline'

export default function ProgramCard({ program, to, actionLabel = 'View program', compact = false }) {
  const skills = program.skills?.filter((skill) => skill.type === 'taught' || skill.type === 'target').slice(0, 4) ?? []
  const slots = Number(program.total_slots) === 0 ? 'Open capacity' : `${program.available_slots} of ${program.total_slots} slots left`

  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/10 group">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] uppercase tracking-wider font-extrabold text-blue-700">
          {categoryLabel(program.category)}
        </span>
        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] uppercase tracking-wider font-extrabold text-slate-600 shadow-sm">
          {statusLabel(program.status)}
        </span>
        <EligibilityBadge eligibility={program.eligibility} />
        {program.recommendation_score > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] uppercase tracking-wider font-extrabold text-amber-700 shadow-sm">
            <CircleCheck className="h-3.5 w-3.5" /> Recommended
          </span>
        )}
      </div>

      <h2 className="mt-1 text-xl font-black leading-tight text-slate-900 group-hover:text-blue-900 transition-colors">{program.title}</h2>
      {!compact && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{program.short_description || program.description}</p>}

      {skills.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {skills.map((skill) => <span key={`${skill.id}-${skill.name}`} className="rounded-xl bg-slate-100/80 px-2.5 py-1 text-xs font-bold text-slate-600">{skill.name}</span>)}
        </div>
      )}

      {program.recommendation_reason && !compact && (
        <div className="mt-5 rounded-2xl bg-amber-50/50 border border-amber-100 p-3">
           <p className="text-xs font-semibold leading-relaxed text-amber-900">{program.recommendation_reason}</p>
        </div>
      )}

      <dl className="mt-6 grid gap-3 text-xs font-semibold text-slate-500 bg-slate-50 rounded-2xl p-4 border border-slate-100">
        <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-blue-400 shrink-0" /><dt className="sr-only">Deadline</dt><dd>Apply by {dateText(program.application_deadline)}</dd></div>
        <div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-emerald-400 shrink-0" /><dt className="sr-only">Slots</dt><dd>{slots}</dd></div>
        {(program.venue || program.location_address) && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-rose-400 shrink-0" /><dt className="sr-only">Venue</dt><dd className="line-clamp-1">{program.venue || program.location_address}</dd></div>}
        {program.start_date && <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-indigo-400 shrink-0" /><dt className="sr-only">Start date</dt><dd>Starts {dateText(program.start_date)}</dd></div>}
      </dl>

      {to && (
        <div className="mt-auto pt-6">
          <Link to={to} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-blue-900 shadow-md">
            {actionLabel}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      )}
    </article>
  )
}
