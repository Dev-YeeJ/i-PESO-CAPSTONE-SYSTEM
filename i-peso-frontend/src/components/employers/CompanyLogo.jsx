import { useState } from 'react'
import { cn } from '@/lib/utils'

const SIZES = {
  md: 'h-16 w-16 rounded-xl text-xl',
  lg: 'h-20 w-20 rounded-2xl text-2xl',
  xl: 'h-24 w-24 rounded-2xl text-3xl sm:h-28 sm:w-28',
}

/**
 * Company logo with a lettermark fallback. The initial is more recognisable
 * than a generic building icon, and the fallback also covers a logo URL that
 * 404s (onError) instead of leaving a broken-image box.
 */
export default function CompanyLogo({ src, name, size = 'lg', className = '' }) {
  const [failed, setFailed] = useState(false)
  const initial = (name || '?').trim().charAt(0).toUpperCase()

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden border-4 border-white bg-white shadow-md',
        SIZES[size] ?? SIZES.lg,
        className,
      )}
    >
      {src && !failed ? (
        <img src={src} alt={`${name} logo`} className="h-full w-full object-contain p-1.5" onError={() => setFailed(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-slate-100 font-black text-brand-navy" aria-hidden="true">
          {initial}
        </span>
      )}
    </div>
  )
}
