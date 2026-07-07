import { AlertTriangle, Award, Banknote, Bookmark, BriefcaseBusiness, CalendarDays, Check, ExternalLink, Eye, GraduationCap, Loader2, MapPin, Navigation } from 'lucide-react'

const matchClass = (percentage) => {
  if (percentage >= 80) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (percentage >= 50) return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

const titleCase = (value = '') => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

const formatSalary = (job) => {
  if (job.hide_salary || (!job.salary_min && !job.salary_max)) return null
  if (job.salary_min && job.salary_max) return `₱${job.salary_min.toLocaleString()}–₱${job.salary_max.toLocaleString()}`
  return `₱${Number(job.salary_min || job.salary_max).toLocaleString()}`
}

export default function JobMapCard({ job, isActive, isApplying, isSaving, onClick, onView, onApply, onSave, onTraining, onJobFair }) {
  const hasMatch = job.match_percentage !== null && job.match_percentage !== undefined
  const matchPercentage = hasMatch ? Math.round(job.match_percentage) : null
  const missingSkillCount = job.missing_skills?.length || 0

  return (
    <article
      onClick={onClick}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 transition-all duration-300 hover:shadow-lg ${
        isActive ? 'border-blue-400 bg-blue-50/50 shadow-md ring-4 ring-blue-400/20' : 'border-slate-200 shadow-sm hover:border-blue-300 hover:-translate-y-0.5'
      }`}
      aria-current={isActive ? 'true' : undefined}
    >
      {isActive && <span className="absolute inset-y-0 left-0 w-1.5 bg-amber-400" aria-hidden="true" />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold text-slate-900">{job.job_title}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-medium text-slate-500">
            <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0" /> {job.employer_name}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ring-1 ring-inset ${hasMatch ? matchClass(matchPercentage) : 'bg-blue-50 text-blue-700 ring-blue-200'}`}>
          {hasMatch ? `${matchPercentage}% match` : 'View match'}
        </span>
      </div>

      <p className="mt-2 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {job.full_work_address}
      </p>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {job.distance_km !== null && (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
            <Navigation className="h-3 w-3" /> {job.distance_km.toFixed(1)} km
          </span>
        )}
        {job.employment_type && <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{titleCase(job.employment_type)}</span>}
        {formatSalary(job) && <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700"><Banknote className="h-3 w-3" />{formatSalary(job)}</span>}
        {job.has_applied && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"><Check className="h-3 w-3" /> Applied · {titleCase(job.application_status || 'pending')}</span>}
        {job.is_saved && <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Saved</span>}
        {missingSkillCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700" title={`${missingSkillCount} missing skill${missingSkillCount === 1 ? '' : 's'}`}>
            <AlertTriangle className="h-3 w-3" /> {missingSkillCount} skill gap{missingSkillCount === 1 ? '' : 's'}
          </span>
        )}
        {job.upskill?.recommended && <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700"><GraduationCap className="h-3 w-3" /> Upskill recommended</span>}
        {job.job_fair?.is_available_at_job_fair && <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700"><CalendarDays className="h-3 w-3" /> Available at job fair</span>}
        {job.certificate_match?.matched && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"><Award className="h-3 w-3" /> Certificate match</span>}
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3">
        <button type="button" onClick={(event) => { event.stopPropagation(); onView(job) }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-bold text-slate-700 hover:border-blue-300 hover:text-blue-800">
          <Eye className="h-3.5 w-3.5" /> Details
        </button>
        <button type="button" disabled={job.has_applied || isApplying} onClick={(event) => { event.stopPropagation(); onApply(job) }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-950 px-2 py-2 text-[11px] font-bold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-300">
          {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : job.has_applied ? <Check className="h-3.5 w-3.5" /> : null}
          {job.has_applied ? 'Applied' : isApplying ? 'Applying' : 'Apply'}
        </button>
        <button type="button" disabled={isSaving} onClick={(event) => { event.stopPropagation(); onSave(job) }} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${job.is_saved ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-700'}`} aria-label={job.is_saved ? 'Remove saved job' : 'Save job'}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bookmark className={`h-3.5 w-3.5 ${job.is_saved ? 'fill-current' : ''}`} />}
        </button>
        {job.google_maps_url && (
          <a href={job.google_maps_url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-700" aria-label="Open in Google Maps">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {(job.upskill?.recommended || job.job_fair?.is_available_at_job_fair) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.upskill?.recommended && <button type="button" onClick={(event) => { event.stopPropagation(); onTraining(job) }} className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-bold text-violet-800 hover:bg-violet-100"><GraduationCap className="h-3 w-3" /> View training</button>}
          {job.job_fair?.is_available_at_job_fair && <button type="button" onClick={(event) => { event.stopPropagation(); onJobFair(job) }} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-800 hover:bg-blue-100"><CalendarDays className="h-3 w-3" /> View event details</button>}
        </div>
      )}
    </article>
  )
}
