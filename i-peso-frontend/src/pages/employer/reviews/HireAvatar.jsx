import { useEffect, useState } from 'react'
import { employerFeedbackService } from '@/services/employerFeedbackService'
import { cn } from '@/lib/utils'

const GRADIENTS = ['from-sky-500 to-brand-navy', 'from-emerald-500 to-teal-700', 'from-amber-400 to-orange-600', 'from-violet-500 to-indigo-700', 'from-rose-400 to-pink-700']
const SIZES = { md: 'h-12 w-12 text-base', lg: 'h-16 w-16 text-lg' }

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'

/**
 * A hire's 2x2 photo (behind the authenticated /employer/hires/{seeker}/photo, so it
 * is fetched as a blob), or an initials tile when they have none or it fails to load.
 */
export default function HireAvatar({ seekerId, name, hasPhoto, size = 'md' }) {
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    if (!hasPhoto || !seekerId) return undefined
    let active = true
    let objectUrl
    employerFeedbackService.getHirePhoto(seekerId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (active) setPhoto(objectUrl)
      })
      .catch(() => { if (active) setPhoto(null) })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [seekerId, hasPhoto])

  const sizeClass = SIZES[size] ?? SIZES.md

  if (hasPhoto && photo) {
    return <img src={photo} alt={name} className={cn(sizeClass, 'shrink-0 rounded-2xl object-cover shadow-md ring-1 ring-slate-200')} />
  }

  return (
    <span className={cn(sizeClass, 'flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-bold text-white shadow-md', GRADIENTS[(seekerId ?? 0) % GRADIENTS.length])} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
