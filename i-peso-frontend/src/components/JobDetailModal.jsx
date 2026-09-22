import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Award, Banknote, Bookmark, BriefcaseBusiness, CalendarDays, Check, ExternalLink, GraduationCap, Loader2, MapPin, Navigation, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import EmployerPreferenceChip from '@/components/jobs/EmployerPreferenceChip'
import { getMapJobDetail } from '@/services/jobMapService'
import { applyToJob, toggleSavedJob } from '@/services/seekerService'

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

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback

/**
 * Self-contained "view this job" popup — fetches its own data from a bare
 * post_id and handles Apply/Save itself, so any page can open it in place
 * (a job fair booth, an employer profile, …) without losing where the seeker
 * was. Content mirrors JobMapDetailsPanel's sections; this just isn't tied to
 * the Job Map page's own state/layout the way that panel is.
 */
export default function JobDetailModal({ postId, open, onClose, seekerLocation, sourceLabel, hideJobFairBanner = false }) {
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [applying, setApplying] = useState(false)
  const [saving, setSaving] = useState(false)
  const abortRef = useRef(null)

  useEffect(() => {
    if (!open || !postId) return undefined
    setJob(null)
    setError('')
    setShowFullDescription(false)
    setLoading(true)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    getMapJobDetail(postId, seekerLocation || {}, { signal: controller.signal })
      .then((detail) => { if (!controller.signal.aborted) setJob(detail) })
      .catch((requestError) => {
        if (controller.signal.aborted || requestError?.name === 'AbortError' || requestError?.code === 'ERR_CANCELED') return
        setError(errorMessage(requestError, 'Unable to load this job right now.'))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId])

  const handleApply = async () => {
    if (!job || job.has_applied) return
    setApplying(true)
    try {
      await applyToJob(job.post_id)
      setJob((current) => current && { ...current, has_applied: true })
      toast.success('Application submitted successfully.')
    } catch (applyError) {
      toast.error(errorMessage(applyError, 'Unable to submit your application.'))
    } finally {
      setApplying(false)
    }
  }

  const handleSave = async () => {
    if (!job) return
    setSaving(true)
    const optimistic = !job.is_saved
    setJob((current) => current && { ...current, is_saved: optimistic })
    try {
      const data = await toggleSavedJob(job.post_id)
      const saved = (data.saved_jobs || []).map(Number).includes(job.post_id)
      setJob((current) => current && { ...current, is_saved: saved })
      toast.success(saved ? 'Job saved.' : 'Job removed from saved jobs.')
    } catch (saveError) {
      setJob((current) => current && { ...current, is_saved: !optimistic })
      toast.error(errorMessage(saveError, 'Unable to update saved jobs.'))
    } finally {
      setSaving(false)
    }
  }

  const hasMatch = job && job.match_percentage !== null && job.match_percentage !== undefined
  const matchPercentage = hasMatch ? Math.round(job.match_percentage) : null
  const breakdown = job?.match_breakdown || {}
  const factors = [
    ['Skills', breakdown.skills],
    ['Experience', breakdown.experience],
    ['Education', breakdown.education],
    ['Occupation fit', breakdown.occupation],
  ]
  const location = job?.full_work_address || job?.work_location || 'Location not specified'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          {sourceLabel && (
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Viewing from {sourceLabel}</p>
          )}
          <DialogTitle className="pr-6">{job?.job_title || (loading ? 'Loading job…' : 'Job details')}</DialogTitle>
          {job && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ring-inset ${hasMatch ? matchTone(matchPercentage) : 'bg-blue-50 text-blue-700 ring-blue-200'}`}>{hasMatch ? `${matchPercentage}% match` : 'Match pending'}</span>
              {job.distance_km !== null && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700"><Navigation className="h-3 w-3" />{Number(job.distance_km).toFixed(1)} km away</span>}
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><BriefcaseBusiness className="h-3.5 w-3.5" />{job.employer_name}</span>
            </div>
          )}
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold text-blue-800"><Loader2 className="h-4 w-4 animate-spin" />Loading job details…</div>
        )}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">{error}</div>
        )}

        {job && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Salary</p><p className="mt-1 flex items-center gap-1 text-xs font-extrabold text-slate-800"><Banknote className="h-3.5 w-3.5 text-emerald-600" />{formatSalary(job)}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Employment type</p><p className="mt-1 text-xs font-extrabold text-slate-800">{titleCase(job.employment_type || 'Not specified')}</p></div>
            </div>

            <EmployerPreferenceChip job={job} />

            <section>
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-900">Work location</h3>
              <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />{location}</p>
            </section>

            <section>
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-900">About the role</h3>
              <p className={`mt-2 whitespace-pre-line text-xs leading-5 text-slate-600 ${showFullDescription ? '' : 'line-clamp-4'}`}>{job.job_description || 'The employer has not added a detailed job description.'}</p>
              {!showFullDescription && job.job_description && <button type="button" onClick={() => setShowFullDescription(true)} className="mt-2 text-[11px] font-bold text-blue-800 hover:text-blue-950">Read full description</button>}
            </section>

            {hasMatch && (
              <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-950 text-amber-400"><Sparkles className="h-3.5 w-3.5" /></span><div><h3 className="text-xs font-black text-blue-950">Why this job matches</h3><p className="text-[10px] text-blue-700">Based on your current i-PESO profile</p></div></div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {factors.map(([label, score]) => <div key={label} className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-blue-100"><div className="flex items-center justify-between gap-2"><p className="text-[9px] font-bold text-slate-500">{label}</p><p className="text-xs font-black text-blue-950">{Math.round(Number(score || 0))}%</p></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{ width: `${Math.min(100, Math.max(0, Number(score || 0)))}%` }} /></div></div>)}
                </div>
              </section>
            )}

            {job.matched_skills?.length > 0 && <section><h3 className="text-xs font-black uppercase tracking-wide text-slate-900">Matched skills</h3><div className="mt-2 flex flex-wrap gap-1.5">{job.matched_skills.map((skill) => <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-100"><Check className="h-3 w-3" />{skill}</span>)}</div></section>}

            {job.certificate_match?.matched && <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800"><Award className="mt-0.5 h-4 w-4 shrink-0" />Your certificate vault supports this match.</div>}
            {!hideJobFairBanner && job.job_fair?.is_available_at_job_fair && <div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><p className="flex items-center gap-2 text-xs font-black text-blue-950"><CalendarDays className="h-4 w-4" />Available at {job.job_fair.title}</p><p className="mt-1 text-[10px] leading-4 text-blue-700">{job.job_fair.date || 'Date to be announced'} · {job.job_fair.venue || 'Venue to be announced'}</p></div>}
            {job.upskill?.recommended && <div className="rounded-xl border border-violet-100 bg-violet-50 p-3"><p className="flex items-center gap-2 text-xs font-black text-violet-950"><GraduationCap className="h-4 w-4" />Upskill recommended</p><p className="mt-1 text-[10px] leading-4 text-violet-700">{job.upskill.programs?.[0]?.title || 'Training is available for one or more missing skills.'}</p></div>}

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
              <button type="button" disabled={saving} onClick={handleSave} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition disabled:opacity-50 ${job.is_saved ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-900'}`}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className={`h-4 w-4 ${job.is_saved ? 'fill-current' : ''}`} />}{job.is_saved ? 'Saved' : 'Save Job'}</button>
              <button type="button" disabled={applying} onClick={() => job.has_applied ? navigate('/seeker/applications') : handleApply()} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition disabled:bg-slate-300 ${job.has_applied ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-blue-950 hover:bg-blue-900'}`}>{applying && <Loader2 className="h-4 w-4 animate-spin" />}{job.has_applied ? 'View Application' : applying ? 'Applying…' : 'Apply Now'}</button>
              {job.google_maps_url && <a href={job.google_maps_url} target="_blank" rel="noreferrer" className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-900"><ExternalLink className="h-4 w-4" />Open in Maps</a>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
