import { useEffect, useState } from 'react'
import { Building2, FileText, ImageOff } from 'lucide-react'
import { EmptyState, LoadingSkeleton } from '@/components/ui'
import { listJobFairPosters, viewJobFairPoster } from '@/services/jobFairService'

const avatarTones = ['bg-blue-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-cyan-600']
const toneFor = (name) => avatarTones[[...(name || '')].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % avatarTones.length]
const initialsFor = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

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

export default function PosterFeedTab() {
  const [posters, setPosters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listJobFairPosters()
      .then(setPosters)
      .catch((e) => setError(e.response?.data?.message ?? 'Unable to load employer posters.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="max-w-2xl mx-auto"><LoadingSkeleton variant="card" rows={2} /></div>
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>
  if (!posters.length) {
    return (
      <div className="max-w-2xl mx-auto rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
        <EmptyState icon={ImageOff} title="No employer posters yet" description="PESO-approved job vacancy posters from participating employers will appear here." />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {posters.map((poster) => <PosterCard key={poster.id} poster={poster} />)}
    </div>
  )
}

function PosterCard({ poster }) {
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

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${toneFor(poster.company_name)}`}>
          {initialsFor(poster.company_name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-black text-slate-950">{poster.company_name || 'Employer'}</p>
          <p className="truncate text-xs font-semibold text-slate-500">
            {poster.job_fair_title}{poster.venue ? ` · ${poster.venue}` : ''}{poster.posted_at ? ` · ${timeAgo(poster.posted_at)}` : ''}
          </p>
        </div>
      </div>

      {isImage ? (
        imageUrl ? (
          <img src={imageUrl} alt={`${poster.company_name} job vacancy poster`} className="w-full border-t border-slate-100 object-cover" />
        ) : failed ? (
          <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 p-10 text-sm font-semibold text-slate-400">
            <ImageOff className="h-4 w-4" />Poster unavailable
          </div>
        ) : (
          <div className="aspect-[4/3] w-full animate-pulse border-t border-slate-100 bg-slate-100" />
        )
      ) : (
        <button type="button" onClick={openPoster} className="flex w-full items-center gap-3 border-t border-slate-100 bg-slate-50 p-5 text-left hover:bg-slate-100">
          <FileText className="h-8 w-8 shrink-0 text-blue-600" />
          <span>
            <span className="block text-sm font-bold text-slate-800">{poster.original_filename || 'View poster'}</span>
            <span className="block text-xs font-semibold text-slate-500">Tap to open</span>
          </span>
        </button>
      )}

      <div className="flex items-center gap-2 border-t border-slate-100 p-3 text-xs font-semibold text-slate-400">
        <Building2 className="h-3.5 w-3.5" />PESO-approved employer posting
      </div>
    </article>
  )
}
