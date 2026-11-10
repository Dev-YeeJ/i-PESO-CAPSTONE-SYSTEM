import { useId, useState } from 'react'
import { Star } from 'lucide-react'

const WORDS = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent']

/**
 * 1–5 star input, built as a radio group so it works with the keyboard
 * (arrow keys) and screen readers ("Communication, 4 of 5 stars, Good").
 */
export function StarInput({ label, value, onChange, error, disabled = false }) {
  const name = useId()
  const [hover, setHover] = useState(0)
  const shown = hover || value || 0

  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="text-sm font-bold text-slate-800">{label}</legend>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <label key={star} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(star)}>
              <input
                type="radio"
                name={name}
                value={star}
                checked={value === star}
                onChange={() => onChange(star)}
                className="peer sr-only"
                aria-label={`${star} of 5 stars, ${WORDS[star]}`}
              />
              <Star
                aria-hidden
                className={`h-7 w-7 rounded transition peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-1 ${
                  star <= shown ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300'
                }`}
              />
            </label>
          ))}
        </div>
        <span className="text-xs font-semibold text-slate-500" aria-hidden>{WORDS[shown]}</span>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </fieldset>
  )
}

/** Read-only stars, e.g. "4.3 ★★★★☆". */
export function Stars({ value, size = 'sm', label }) {
  const rounded = Math.round((Number(value) || 0) * 2) / 2
  const sizeClass = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'

  return (
    <span className="inline-flex items-center" role="img" aria-label={label ?? `${Number(value || 0).toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const full = star <= rounded
        const half = !full && star - 0.5 === rounded
        return (
          <span key={star} className={`relative ${sizeClass}`} aria-hidden>
            <Star className={`absolute inset-0 ${sizeClass} fill-transparent text-slate-300`} />
            {(full || half) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: half ? '50%' : '100%' }}>
                <Star className={`${sizeClass} fill-amber-400 text-amber-400`} />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}
