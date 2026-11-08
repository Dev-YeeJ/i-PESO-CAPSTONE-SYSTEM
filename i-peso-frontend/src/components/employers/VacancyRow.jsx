import { Banknote, BriefcaseBusiness, ChevronRight, MapPin } from 'lucide-react'
import EmployerPreferenceChip from '@/components/jobs/EmployerPreferenceChip'
import { formatEmploymentType, formatPostedDate, formatSalary } from '@/utils/employerProfile'

/**
 * One open job on a company profile. Render inside a <ul>.
 *
 * With `onSelect` the whole row is the button (one large target, not a small
 * "View" link) and shows a chevron + hover state. Without it the row is plain
 * information with no hover — so it never looks clickable when it isn't
 * (the admin read-only list).
 */
export default function VacancyRow({ job, onSelect }) {
  const type = formatEmploymentType(job.employment_type)
  const salary = formatSalary(job)
  const posted = formatPostedDate(job.created_at)

  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug text-slate-900 group-hover:text-brand-navy">{job.job_title}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600">
          {job.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              {job.location}
            </span>
          )}
          {type && (
            <span className="inline-flex items-center gap-1.5">
              <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              {type}
            </span>
          )}
          {salary && (
            <span className="inline-flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              {salary}
            </span>
          )}
        </div>
        <EmployerPreferenceChip job={job} className="mt-2" />
        {posted && <p className="mt-1.5 text-xs text-slate-500">{posted}</p>}
      </div>
      {onSelect && (
        <ChevronRight
          className="h-5 w-5 shrink-0 self-center text-slate-300 transition-colors group-hover:text-brand-navy"
          aria-hidden="true"
        />
      )}
    </>
  )

  if (!onSelect) {
    return <li className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">{body}</li>
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(job)}
        className="group flex w-full gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-brand-navy/40 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      >
        {body}
      </button>
    </li>
  )
}
