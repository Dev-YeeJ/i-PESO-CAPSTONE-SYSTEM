import { ArrowRight, CalendarDays, CircleCheck, Clock3, MapPin, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { categoryLabel, categoryTone, statusLabel, statusTone } from './programConstants'

const dateText = (value) => value
  ? new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
  : 'No deadline'

export default function ProgramCard({ program, to, actionLabel = 'View program', compact = false }) {
  const skills = program.skills?.filter((skill) => skill.type === 'taught' || skill.type === 'target').slice(0, 4) ?? []
  const slots = Number(program.total_slots) === 0 ? 'Open capacity' : `${program.available_slots} of ${program.total_slots} slots left`

  return (
    <article className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${categoryTone[program.category] ?? categoryTone.other}`}>
          {categoryLabel(program.category)}
        </span>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusTone[program.status] ?? statusTone.draft}`}>
          {statusLabel(program.status)}
        </span>
        {program.recommendation_score > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-700">
            <CircleCheck className="h-3.5 w-3.5" /> Recommended
          </span>
        )}
      </div>

      <h2 className="mt-4 text-lg font-black leading-6 text-slate-950">{program.title}</h2>
      {!compact && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{program.short_description || program.description}</p>}

      {skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {skills.map((skill) => <span key={`${skill.id}-${skill.name}`} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{skill.name}</span>)}
        </div>
      )}

      {program.recommendation_reason && !compact && (
        <p className="mt-4 border-l-2 border-amber-400 pl-3 text-xs font-semibold leading-5 text-slate-600">{program.recommendation_reason}</p>
      )}

      <dl className="mt-5 grid gap-2 text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-slate-400" /><dt className="sr-only">Deadline</dt><dd>Apply by {dateText(program.application_deadline)}</dd></div>
        <div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-slate-400" /><dt className="sr-only">Slots</dt><dd>{slots}</dd></div>
        {(program.venue || program.location_address) && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /><dt className="sr-only">Venue</dt><dd className="line-clamp-1">{program.venue || program.location_address}</dd></div>}
        {program.start_date && <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" /><dt className="sr-only">Start date</dt><dd>Starts {dateText(program.start_date)}</dd></div>}
      </dl>

      {to && (
        <div className="mt-auto pt-5">
          <Link to={to} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-blue-900 bg-blue-900 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-blue-800">
            {actionLabel}<ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </article>
  )
}
