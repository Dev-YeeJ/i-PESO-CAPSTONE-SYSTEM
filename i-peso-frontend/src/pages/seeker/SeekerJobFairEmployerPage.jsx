import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, CalendarDays, FileText, ImageOff, BriefcaseBusiness, Sparkles, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, LoadingSkeleton } from '@/components/ui'
import JobDetailModal from '@/components/JobDetailModal'
import EmployerPreferenceChip from '@/components/jobs/EmployerPreferenceChip'
import { getEmployerBooth, viewJobFairPoster } from '@/services/jobFairService'
import PortalPageHeader from '@/components/shell/PortalPageHeader'

function timeAgo(iso) {
  if (!iso) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [label, secondsPerUnit] of units) {
    const value = Math.floor(seconds / secondsPerUnit)
    if (value >= 1) return `${value} ${label}${value === 1 ? '' : 's'} ago`
  }
  return 'just now'
}

export default function SeekerJobFairEmployerPage() {
  const { fairId, employerId } = useParams()
  const navigate = useNavigate()
  
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewingJobId, setViewingJobId] = useState(null)

  const [activePosterIndex, setActivePosterIndex] = useState(0)

  useEffect(() => {
    getEmployerBooth(fairId, employerId)
      .then(setData)
      .catch((e) => setError(e.response?.data?.message ?? 'Unable to load employer booth data.'))
      .finally(() => setLoading(false))
  }, [fairId, employerId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
        <LoadingSkeleton variant="card" rows={1} />
        <LoadingSkeleton variant="card" rows={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { employer, job_fair, posters, vacancies } = data
  const displayName = employer.company_name || employer.trade_name

  const activePoster = posters && posters.length > 0 ? posters[activePosterIndex] : null

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 pb-12">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-brand-navy">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to job fairs
      </button>
      <PortalPageHeader title={displayName} subtitle={`Booth at ${job_fair.title}.`} />

      <div className="space-y-8">
        
        {/* Poster Section */}
        {posters && posters.length > 0 && activePoster && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Job fair poster</h2>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden relative">
              <PosterRenderer poster={activePoster} displayName={displayName} />
              
              {posters.length > 1 && (
                <>
                  <button 
                    disabled={activePosterIndex === 0} 
                    onClick={() => setActivePosterIndex(i => i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md text-slate-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button 
                    disabled={activePosterIndex === posters.length - 1} 
                    onClick={() => setActivePosterIndex(i => i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md text-slate-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  <div className="absolute top-4 right-4 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                    {activePosterIndex + 1} / {posters.length}
                  </div>
                </>
              )}

              <div className="border-t border-slate-100 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">{activePoster.original_filename}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Posted {timeAgo(activePoster.posted_at)}
                  </p>
                </div>
                {activePoster.match_percentage !== undefined && activePoster.match_percentage !== null && (
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm">
                    <Sparkles className="h-4 w-4" />
                    Up to {Math.round(activePoster.match_percentage)}% Match
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Vacancies Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Vacancies at this booth</h2>
            <span className="rounded-full bg-[#e8f0fc] text-brand-navy text-xs font-bold px-2.5 py-0.5">
              {vacancies.length} role{vacancies.length !== 1 && 's'}
            </span>
          </div>

          {vacancies.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
              No vacancies listed on their confirmation slip yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {vacancies.map((v) => (
                <VacancyCard key={v.id} vacancy={v} onView={setViewingJobId} />
              ))}
            </div>
          )}
        </section>
      </div>

      <JobDetailModal
        postId={viewingJobId}
        open={viewingJobId !== null}
        onClose={() => setViewingJobId(null)}
        sourceLabel={`${displayName}, ${job_fair.title}`}
        hideJobFairBanner
      />
    </div>
  )
}

function PosterRenderer({ poster, displayName }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [failed, setFailed] = useState(false)
  const isImage = (poster.mime_type || '').startsWith('image/')

  useEffect(() => {
    let objectUrl
    let cancelled = false
    if (isImage) {
      viewJobFairPoster(poster.id)
        .then((blob) => {
          if (cancelled) return
          objectUrl = URL.createObjectURL(blob)
          setImageUrl(objectUrl)
        })
        .catch(() => !cancelled && setFailed(true))
    }
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [poster.id, isImage])

  const openPoster = async () => {
    try {
      const blob = await viewJobFairPoster(poster.id)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      setFailed(true)
    }
  }

  if (isImage) {
    if (imageUrl) {
      return (
        <a href={imageUrl} target="_blank" rel="noreferrer" className="block cursor-zoom-in">
          <img src={imageUrl} alt={`${displayName} job vacancy poster`} className="w-full h-auto object-contain bg-slate-100 max-h-[600px]" />
        </a>
      )
    }
    if (failed) {
      return (
        <div className="flex items-center justify-center gap-2 bg-slate-50 p-16 text-sm font-semibold text-slate-400">
          <ImageOff className="h-5 w-5" />Poster unavailable
        </div>
      )
    }
    return <div className="aspect-[4/3] w-full animate-pulse bg-slate-100" />
  }

  return (
    <button type="button" onClick={openPoster} className="flex w-full items-center justify-center gap-3 bg-slate-50 p-12 hover:bg-slate-100 transition">
      <FileText className="h-10 w-10 text-brand-navy" />
      <div className="text-left">
        <span className="block text-base font-bold text-slate-800">View Document</span>
        <span className="block text-xs font-semibold text-slate-500 mt-1">Click to open PDF/Document in a new tab</span>
      </div>
    </button>
  )
}

function VacancyCard({ vacancy, onView }) {
  const hasJobLink = !!vacancy.vacancy
  
  return (
    <div className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition ${hasJobLink ? 'border-[#c4d9f7] hover:border-[#c4d9f7] hover:shadow-md' : 'border-slate-200'}`}>
      <div>
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-bold text-slate-900 text-base leading-tight">
            {hasJobLink ? vacancy.vacancy.job_title : vacancy.position_title}
          </h3>
          {vacancy.match_percentage !== undefined && vacancy.match_percentage !== null && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 shadow-sm border border-emerald-100">
              {Math.round(vacancy.match_percentage)}% Match
            </span>
          )}
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <BriefcaseBusiness className="h-4 w-4 shrink-0 text-slate-400" />
            <span>{vacancy.number_needed} vacancy/ies</span>
          </div>
          
          <div className="flex items-start gap-2 text-xs font-semibold text-slate-600">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
            <span className="leading-relaxed line-clamp-2">
              {hasJobLink ? vacancy.vacancy.location : vacancy.place_of_work}
            </span>
          </div>

          {hasJobLink && <EmployerPreferenceChip job={vacancy.vacancy} />}
        </div>

        {!hasJobLink && vacancy.qualifications && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 mb-1.5">Qualifications</p>
            <p className="text-xs font-medium text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
              {vacancy.qualifications}
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100">
        {hasJobLink ? (
          <button
            type="button"
            onClick={() => onView(vacancy.vacancy.post_id)}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#e8f0fc] px-4 py-2 text-xs font-bold text-brand-navy transition hover:bg-[#e8f0fc]"
          >
            View Full Job Details
          </button>
        ) : (
          <p className="text-center text-[11px] font-semibold text-slate-400">Not linked to an online posting — ask about this role at the booth.</p>
        )}
      </div>
    </div>
  )
}
