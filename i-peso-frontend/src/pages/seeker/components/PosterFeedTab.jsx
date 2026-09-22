import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, FileText, ImageOff, ArrowRight } from 'lucide-react'
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
      {posters.map((poster) => <PosterCard key={poster.employer_id + '-' + poster.job_fair_id} poster={poster} />)}
    </div>
  )
}

function PosterCard({ poster }) {
  const [imageUrls, setImageUrls] = useState({})
  const [failed, setFailed] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  
  // Ensure we have a valid array of files
  const files = Array.isArray(poster.files) ? poster.files : []
  const hasMultiple = files.length > 1
  const currentFile = files[currentIndex]
  const isImage = (currentFile?.mime_type || '').startsWith('image/')

  useEffect(() => {
    let cancelled = false
    let objectUrls = {}
    
    // Load all images for this post
    files.forEach(file => {
      if ((file.mime_type || '').startsWith('image/')) {
        viewJobFairPoster(file.id)
          .then((blob) => {
            if (cancelled) return
            const url = URL.createObjectURL(blob)
            objectUrls[file.id] = url
            setImageUrls(prev => ({ ...prev, [file.id]: url }))
          })
          .catch(() => !cancelled && setFailed(true))
      }
    })
    
    return () => { 
      cancelled = true
      Object.values(objectUrls).forEach(url => URL.revokeObjectURL(url))
    }
  }, [poster.files])

  const openPoster = async (file) => {
    try {
      const blob = await viewJobFairPoster(file.id)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      setFailed(true)
    }
  }

  const nextImage = () => setCurrentIndex(prev => (prev + 1) % files.length)
  const prevImage = () => setCurrentIndex(prev => (prev - 1 + files.length) % files.length)

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 p-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${toneFor(poster.company_name)}`}>
          {initialsFor(poster.company_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-slate-950">{poster.company_name || 'Employer'}</p>
          <p className="truncate text-xs font-semibold text-slate-500">
            {poster.job_fair_title}{poster.venue ? ` · ${poster.venue}` : ''}{poster.posted_at ? ` · ${timeAgo(poster.posted_at)}` : ''}
          </p>
        </div>
      </div>

      <div className="relative group bg-slate-50 border-t border-b border-slate-100 flex items-center justify-center min-h-[300px]">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-slate-400">
            <ImageOff className="h-6 w-6 mb-2" />
            <span className="text-sm font-semibold">No files uploaded</span>
          </div>
        ) : isImage ? (
          imageUrls[currentFile?.id] ? (
            <img src={imageUrls[currentFile.id]} alt={`${poster.company_name} job vacancy`} className="w-full h-auto object-contain max-h-[600px]" />
          ) : failed ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-slate-400">
              <ImageOff className="h-4 w-4" />Image unavailable
            </div>
          ) : (
            <div className="flex items-center justify-center p-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          )
        ) : (
          <div className="flex flex-col items-center gap-4 bg-slate-50 p-12 text-center text-slate-500">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Document Uploaded</p>
              <p className="mt-1 text-sm">{currentFile.original_filename}</p>
            </div>
            <button type="button" onClick={() => openPoster(currentFile)} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100">
              View Document <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Carousel Navigation */}
        {hasMultiple && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm opacity-0 transition-all hover:bg-black/50 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm opacity-0 transition-all hover:bg-black/50 group-hover:opacity-100"
              aria-label="Next image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            
            {/* Pagination Dots */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/20 px-2.5 py-1.5 backdrop-blur-md">
              {files.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            
            {/* Counter Badge */}
            <div className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-md">
              {currentIndex + 1} / {files.length}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between border-t border-slate-100 p-3 text-xs font-semibold text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />PESO-approved employer posting
          </div>
          {poster.match_percentage !== undefined && poster.match_percentage !== null && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 shadow-sm">
              {Math.round(poster.match_percentage)}% match
            </div>
          )}
        </div>
        
        {poster.job_fair_id && poster.employer_id && (
          <Link 
            to={`/seeker/job-fairs/${poster.job_fair_id}/employers/${poster.employer_id}`}
import { Building2, FileText, ImageOff, ArrowRight } from 'lucide-react'
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
      {posters.map((poster) => <PosterCard key={poster.employer_id + '-' + poster.job_fair_id} poster={poster} />)}
    </div>
  )
}

function PosterCard({ poster }) {
  const [imageUrls, setImageUrls] = useState({})
  const [failed, setFailed] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  
  // Ensure we have a valid array of files
  const files = Array.isArray(poster.files) ? poster.files : []
  const hasMultiple = files.length > 1
  const currentFile = files[currentIndex]
  const isImage = (currentFile?.mime_type || '').startsWith('image/')

  useEffect(() => {
    let cancelled = false
    let objectUrls = {}
    
    // Load all images for this post
    files.forEach(file => {
      if ((file.mime_type || '').startsWith('image/')) {
        viewJobFairPoster(file.id)
          .then((blob) => {
            if (cancelled) return
            const url = URL.createObjectURL(blob)
            objectUrls[file.id] = url
            setImageUrls(prev => ({ ...prev, [file.id]: url }))
          })
          .catch(() => !cancelled && setFailed(true))
      }
    })
    
    return () => { 
      cancelled = true
      Object.values(objectUrls).forEach(url => URL.revokeObjectURL(url))
    }
  }, [poster.files])

  const openPoster = async (file) => {
    try {
      const blob = await viewJobFairPoster(file.id)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      setFailed(true)
    }
  }

  const nextImage = () => setCurrentIndex(prev => (prev + 1) % files.length)
  const prevImage = () => setCurrentIndex(prev => (prev - 1 + files.length) % files.length)

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 p-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${toneFor(poster.company_name)}`}>
          {initialsFor(poster.company_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-slate-950">{poster.company_name || 'Employer'}</p>
          <p className="truncate text-xs font-semibold text-slate-500">
            {poster.job_fair_title}{poster.venue ? ` · ${poster.venue}` : ''}{poster.posted_at ? ` · ${timeAgo(poster.posted_at)}` : ''}
          </p>
        </div>
      </div>

      <div className="relative group bg-slate-50 border-t border-b border-slate-100 flex items-center justify-center min-h-[300px]">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-slate-400">
            <ImageOff className="h-6 w-6 mb-2" />
            <span className="text-sm font-semibold">No files uploaded</span>
          </div>
        ) : isImage ? (
          imageUrls[currentFile?.id] ? (
            <img src={imageUrls[currentFile.id]} alt={`${poster.company_name} job vacancy`} className="w-full h-auto object-contain max-h-[600px]" />
          ) : failed ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm font-semibold text-slate-400">
              <ImageOff className="h-4 w-4" />Image unavailable
            </div>
          ) : (
            <div className="flex items-center justify-center p-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          )
        ) : (
          <div className="flex flex-col items-center gap-4 bg-slate-50 p-12 text-center text-slate-500">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Document Uploaded</p>
              <p className="mt-1 text-sm">{currentFile.original_filename}</p>
            </div>
            <button type="button" onClick={() => openPoster(currentFile)} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100">
              View Document <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Carousel Navigation */}
        {hasMultiple && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm opacity-0 transition-all hover:bg-black/50 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm opacity-0 transition-all hover:bg-black/50 group-hover:opacity-100"
              aria-label="Next image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            
            {/* Pagination Dots */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/20 px-2.5 py-1.5 backdrop-blur-md">
              {files.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            
            {/* Counter Badge */}
            <div className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-md">
              {currentIndex + 1} / {files.length}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between border-t border-slate-100 p-3 text-xs font-semibold text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />PESO-approved employer posting
          </div>
          {poster.match_percentage !== undefined && poster.match_percentage !== null && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 shadow-sm">
              {Math.round(poster.match_percentage)}% match
            </div>
          )}
        </div>
        
        {poster.job_fair_id && poster.employer_id && (
          <Link 
            to={`/seeker/job-fairs/${poster.job_fair_id}/employers/${poster.employer_id}`}
            className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
          >
            View Booth <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </article>
  )
}
