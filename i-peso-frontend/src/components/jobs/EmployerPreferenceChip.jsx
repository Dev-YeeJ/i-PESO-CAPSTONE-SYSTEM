import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Builds the employer-preference label, or null when no real preference was
 * stated. 'Any' is the job posting form's default, not a preference.
 *
 * Accepts either a raw API row (preferred_gender / minimum_age / maximum_age)
 * or an already-normalised job object (preferredGender / minimumAge /
 * maximumAge), so every seeker surface can call it with whatever shape it
 * happens to hold.
 */
function formatEmployerPreference(job) {
  if (!job) return null

  const gender = job.preferred_gender ?? job.preferredGender
  const min = job.minimum_age ?? job.minimumAge
  const max = job.maximum_age ?? job.maximumAge

  const parts = []
  if (gender && gender !== 'Any') parts.push(gender)
  if (min && max) parts.push(`${min}–${max} yrs old`)
  else if (min) parts.push(`${min} yrs old and above`)
  else if (max) parts.push(`up to ${max} yrs old`)

  return parts.length ? parts.join(' · ') : null
}

/**
 * Shows what the employer noted as their preferred candidate profile.
 *
 * This is an indication only. Nothing in the system filters, ranks or gates an
 * application on it — every seeker sees every posting and can still apply — so
 * it is deliberately styled as neutral information rather than as a
 * disqualification, and says as much on hover.
 */
export default function EmployerPreferenceChip({ job, className = '' }) {
  const label = formatEmployerPreference(job)
  if (!label) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700',
        className,
      )}
      title="The employer noted this preference. It does not affect your match score and you can still apply."
    >
      <Info className="h-3.5 w-3.5 shrink-0" />
      Employer preference: {label}
    </span>
  )
}
