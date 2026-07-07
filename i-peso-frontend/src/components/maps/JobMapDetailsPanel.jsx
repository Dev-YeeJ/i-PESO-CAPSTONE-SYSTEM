import { useEffect, useRef, useState } from 'react'
import { Award, Banknote, Bookmark, BriefcaseBusiness, CalendarDays, Check, ExternalLink, GraduationCap, Loader2, MapPin, Navigation, Sparkles, X } from 'lucide-react'

const formatSalary = (job) => {
  if (job.hide_salary || (!job.salary_min && !job.salary_max)) return 'Salary not disclosed'
  const format = (amount) => `₱${Number(amount).toLocaleString()}`
  if (job.salary_min && job.salary_max) return `${format(job.salary_min)}–${format(job.salary_max)}`
  return format(job.salary_min || job.salary_max)
}

const titleCase = (value = '') => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

const matchTone = (percentage) => {
  if (percentage >= 80) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (percentage >= 50) return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

export default function JobMapDetailsPanel({ job, isLoading = false, loadError = '', onClose, onApply, onSave, onTraining, onJobFair, onApplicationStatus, isApplying, isSaving }) {
  const [expandedJobId, setExpandedJobId] = useState(null)
  const contentRef = useRef(null)
  const descriptionRef = useRef(null)
  const isOpen = Boolean(job)
  const renderedJob = job || { match_breakdown: {}, match_percentage: 0, job_title: '', employer_name: '', distance_km: null }
  const showFullDescription = expandedJobId === renderedJob.post_id

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [job?.post_id])

  useEffect(() => {
    if (!isOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const hasMatch = renderedJob.match_percentage !== null && renderedJob.match_percentage !== undefined
  const matchPercentage = hasMatch ? Math.round(renderedJob.match_percentage) : null
  const breakdown = renderedJob.match_breakdown || {}
  const factors = [
    ['Skills', breakdown.skills],
    ['Experience', breakdown.experience],
    ['Education', breakdown.education],
    ['Occupation fit', breakdown.occupation],
  ]
  const location = renderedJob.full_work_address || renderedJob.work_location || 'Location not specified'

  const revealFullDetails = () => {
    setExpandedJobId(renderedJob.post_id)
    window.requestAnimationFrame(() => descriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <aside
      className={`fixed inset-x-0 bottom-0 z-[700] flex max-h-[78vh] flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-[0_-20px_60px_rgba(15,23,42,0.22)] transition-transform duration-300 ease-out md:absolute md:inset-y-3 md:left-auto md:right-3 md:max-h-none md:w-[400px] md:rounded-2xl md:shadow-[0_20px_60px_rgba(15,23,42,0.24)] ${isOpen ? 'pointer-events-auto translate-y-0 md:translate-x-0' : 'pointer-events-none translate-y-full md:translate-y-0 md:translate-x-[110%]'}`}
      aria-label="Selected job details"
      aria-hidden={!isOpen}
    >
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 md:hidden" />
      <header className="flex shrink-0 items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
        <div className="min-w-0 pr-3">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ring-inset ${hasMatch ? matchTone(matchPercentage) : 'bg-blue-50 text-blue-700 ring-blue-200'}`}>{hasMatch ? `${matchPercentage}% match` : 'Match pending'}</span>
            {renderedJob.distance_km !== null && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700"><Navigation className="h-3 w-3" />{Number(renderedJob.distance_km).toFixed(1)} km away</span>}
          </div>
          <h2 className="text-lg font-black leading-6 text-slate-950">{renderedJob.job_title}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><BriefcaseBusiness className="h-3.5 w-3.5" />{renderedJob.employer_name}</p>
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900" aria-label="Close job details"><X className="h-4 w-4" /></button>
      </header>

      <div ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
        {isLoading && <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold text-blue-800"><Loader2 className="h-4 w-4 animate-spin" />Calculating your detailed match and recommendations…</div>}
        {loadError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">{loadError}</div>}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Salary</p><p className="mt-1 flex items-center gap-1 text-xs font-extrabold text-slate-800"><Banknote className="h-3.5 w-3.5 text-emerald-600" />{formatSalary(renderedJob)}</p></div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Employment type</p><p className="mt-1 text-xs font-extrabold text-slate-800">{titleCase(renderedJob.employment_type || 'Not specified')}</p></div>
        </div>

        <section className="mt-5">
          <h3 className="text-xs font-black uppercase tracking-wide text-slate-900">Work location</h3>
          <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />{location}</p>
        </section>

        <section ref={descriptionRef} className="mt-5 scroll-mt-4">
          <h3 className="text-xs font-black uppercase tracking-wide text-slate-900">About the role</h3>
          <p className={`mt-2 whitespace-pre-line text-xs leading-5 text-slate-600 ${showFullDescription ? '' : 'line-clamp-4'}`}>{renderedJob.job_description || 'The employer has not added a detailed job description.'}</p>
          {!showFullDescription && renderedJob.job_description && <button type="button" onClick={revealFullDetails} className="mt-2 text-[11px] font-bold text-blue-800 hover:text-blue-950">Read full description</button>}
        </section>

        {hasMatch && <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-950 text-amber-400"><Sparkles className="h-3.5 w-3.5" /></span><div><h3 className="text-xs font-black text-blue-950">Why this job matches</h3><p className="text-[10px] text-blue-700">Based on your current i-PESO profile</p></div></div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {factors.map(([label, score]) => <div key={label} className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-blue-100"><div className="flex items-center justify-between gap-2"><p className="text-[9px] font-bold text-slate-500">{label}</p><p className="text-xs font-black text-blue-950">{Math.round(Number(score || 0))}%</p></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{ width: `${Math.min(100, Math.max(0, Number(score || 0)))}%` }} /></div></div>)}
          </div>
        </section>}

        {renderedJob.matched_skills?.length > 0 && <section className="mt-5"><h3 className="text-xs font-black uppercase tracking-wide text-slate-900">Matched skills</h3><div className="mt-2 flex flex-wrap gap-1.5">{renderedJob.matched_skills.map((skill) => <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-100"><Check className="h-3 w-3" />{skill}</span>)}</div></section>}
        {renderedJob.missing_skills?.length > 0 && <section className="mt-5"><h3 className="text-xs font-black uppercase tracking-wide text-slate-900">Skills to strengthen</h3><div className="mt-2 flex flex-wrap gap-1.5">{renderedJob.missing_skills.map((skill, index) => <span key={`${skill.skill || skill.name || skill}-${index}`} className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-100">{skill.skill || skill.name || String(skill)}</span>)}</div></section>}

        <div className="mt-5 space-y-2.5">
          {renderedJob.certificate_match?.matched && <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800"><Award className="mt-0.5 h-4 w-4 shrink-0" />Your certificate vault supports this match.</div>}
          {renderedJob.job_fair?.is_available_at_job_fair && <div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><p className="flex items-center gap-2 text-xs font-black text-blue-950"><CalendarDays className="h-4 w-4" />Available at {renderedJob.job_fair.title}</p><p className="mt-1 text-[10px] leading-4 text-blue-700">{renderedJob.job_fair.date || 'Date to be announced'} · {renderedJob.job_fair.venue || 'Venue to be announced'}</p><button type="button" onClick={() => onJobFair(renderedJob)} className="mt-2 rounded-lg bg-blue-950 px-3 py-2 text-[10px] font-bold text-white">View event details</button></div>}
          {renderedJob.upskill?.recommended && <div className="rounded-xl border border-violet-100 bg-violet-50 p-3"><p className="flex items-center gap-2 text-xs font-black text-violet-950"><GraduationCap className="h-4 w-4" />Upskill recommended</p><p className="mt-1 text-[10px] leading-4 text-violet-700">{renderedJob.upskill.programs?.[0]?.title || 'Training is available for one or more missing skills.'}</p><button type="button" onClick={() => onTraining(renderedJob)} className="mt-2 rounded-lg bg-violet-700 px-3 py-2 text-[10px] font-bold text-white">View related training</button></div>}
        </div>
      </div>

      <footer className="shrink-0 border-t border-slate-100 bg-white/95 p-4">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={isSaving} onClick={() => onSave(renderedJob)} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition disabled:opacity-50 ${renderedJob.is_saved ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-900'}`}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className={`h-4 w-4 ${renderedJob.is_saved ? 'fill-current' : ''}`} />}{renderedJob.is_saved ? 'Saved' : 'Save Job'}</button>
          <button type="button" disabled={isApplying} onClick={() => renderedJob.has_applied ? onApplicationStatus(renderedJob) : onApply(renderedJob)} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition disabled:bg-slate-300 ${renderedJob.has_applied ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-blue-950 hover:bg-blue-900'}`}>{isApplying && <Loader2 className="h-4 w-4 animate-spin" />}{renderedJob.has_applied ? 'View Application' : isApplying ? 'Applying…' : 'Apply Now'}</button>
          <button type="button" onClick={revealFullDetails} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-900">View Full Details</button>
          {renderedJob.google_maps_url ? <a href={renderedJob.google_maps_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-900"><ExternalLink className="h-4 w-4" />Open in Maps</a> : <button type="button" disabled className="rounded-xl border border-slate-100 px-3 py-2.5 text-xs font-bold text-slate-300">Map link unavailable</button>}
        </div>
      </footer>
    </aside>
  )
}
