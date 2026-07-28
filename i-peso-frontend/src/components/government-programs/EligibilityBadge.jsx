import { AlertTriangle, CheckCircle2, MinusCircle, XCircle } from 'lucide-react'

// Visual mapping for the eligibility statuses returned by
// EligibilityMatchingService (backend). Keep in sync with that service.
const MAP = {
  highly_eligible: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: CheckCircle2, showScore: true },
  eligible: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: CheckCircle2, showScore: false },
  partially_eligible: { cls: 'border-amber-200 bg-amber-50 text-amber-700', Icon: AlertTriangle, showScore: true },
  low_match: { cls: 'border-slate-200 bg-slate-100 text-slate-600', Icon: MinusCircle, showScore: true },
  not_eligible: { cls: 'border-red-200 bg-red-50 text-red-700', Icon: XCircle, showScore: false },
  unknown: { cls: 'border-slate-200 bg-slate-100 text-slate-500', Icon: MinusCircle, showScore: false },
}

export default function EligibilityBadge({ eligibility, className = '' }) {
  if (!eligibility) return null
  const { status, label, score } = eligibility
  const { cls, Icon, showScore } = MAP[status] ?? MAP.low_match

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-extrabold ${cls} ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}{showScore && typeof score === 'number' ? ` · ${score}%` : ''}
    </span>
  )
}
