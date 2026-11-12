import { Check, CircleHelp, X } from 'lucide-react'

// Renders the per-rule "why you matched" list from an eligibility payload.
// Each item: { label, met, required, detail }.
export default function EligibilityBreakdown({ eligibility, title = 'Eligibility estimate' }) {
  const items = eligibility?.breakdown ?? []
  if (!eligibility) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      {!items.length ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          No profile-based criteria are configured for this category. Review the listed requirements and confirm eligibility with PESO in person.
        </p>
      ) : eligibility.status === 'profile_incomplete' ? (
        <p className="mt-2 text-xs leading-5 text-amber-800">
          Preliminary match: {typeof eligibility.score === 'number' ? `${eligibility.score}%` : 'not enough profile data'} using {eligibility.evaluated_rules} of {eligibility.total_rules} criteria.
          Update your profile to check the missing criteria. PESO confirms eligibility in person.
        </p>
      ) : (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          This is an estimate based on your i-PESO profile, not an official decision. PESO confirms eligibility in person.
        </p>
      )}
      <ul className="mt-3 space-y-2.5">
        {items.map((item, index) => (
          <li key={`${index}-${item.label}`} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                !item.known ? 'bg-amber-100 text-amber-700' : item.met ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {!item.known
                ? <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
                : item.met
                  ? <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  : <X className="h-3.5 w-3.5" aria-hidden="true" />}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {item.label}
                {item.required && item.known && !item.met && <span className="ml-1 text-xs font-bold text-red-600">(required)</span>}
              </p>
              {item.detail && <p className="text-xs text-slate-500">{item.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
