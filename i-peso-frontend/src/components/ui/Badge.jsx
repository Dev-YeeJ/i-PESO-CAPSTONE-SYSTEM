import { AlertTriangle, CheckCircle2, Clock3, Info, XCircle } from 'lucide-react'

const variants = {
  verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  hired: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  review: 'border-blue-200 bg-blue-50 text-blue-700',
  reviewed: 'border-blue-200 bg-blue-50 text-blue-700',
  matched: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  shortlisted: 'border-violet-200 bg-violet-50 text-violet-700',
  interview: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  closed: 'border-slate-200 bg-slate-100 text-slate-600',
  draft: 'border-slate-200 bg-slate-100 text-slate-600',
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
}

const icons = {
  verified: CheckCircle2,
  approved: CheckCircle2,
  active: CheckCircle2,
  pending: Clock3,
  warning: AlertTriangle,
  rejected: XCircle,
  review: Info,
  reviewed: Info,
}

export default function Badge({
  children,
  variant,
  status,
  dot = false,
  icon = true,
  className = '',
}) {
  const resolvedVariant = status ?? variant ?? 'neutral'
  const Icon = icons[resolvedVariant]

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${variants[resolvedVariant] ?? variants.neutral} ${className}`}>
      {icon && Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
