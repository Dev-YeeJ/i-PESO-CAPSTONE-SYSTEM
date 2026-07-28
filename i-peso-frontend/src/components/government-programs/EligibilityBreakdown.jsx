import { Check, X } from 'lucide-react'

// Renders the per-rule "why you matched" list from an eligibility payload.
// Each item: { label, met, required, detail }.
export default function EligibilityBreakdown({ eligibility, title = 'Why you matched' }) {
  const items = eligibility?.breakdown ?? []
  if (!items.length) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, index) => (
          <li key={`${index}-${item.label}`} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                item.met ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {item.met ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {item.label}
                {item.required && !item.met && <span className="ml-1 text-xs font-bold text-red-600">(required)</span>}
              </p>
              {item.detail && <p className="text-xs text-slate-500">{item.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
