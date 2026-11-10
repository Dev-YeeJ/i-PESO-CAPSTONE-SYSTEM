import { formatHours } from '@/utils/ojt'

/** Approved hours against the required total, with pending hours shown as a lighter band. */
export default function HoursProgress({ progress, compact = false }) {
  const required = Number(progress?.required_hours ?? 0)
  const approved = Number(progress?.approved_hours ?? 0)
  const pending = Number(progress?.pending_hours ?? 0)
  const approvedPct = required ? Math.min(100, (approved / required) * 100) : 0
  const pendingPct = required ? Math.min(100 - approvedPct, (pending / required) * 100) : 0

  return (
    <div className={compact ? 'min-w-[160px]' : ''}>
      <div
        className={`relative w-full overflow-hidden rounded-full bg-slate-200 ${compact ? 'h-2' : 'h-3'}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={required || 100}
        aria-valuenow={approved}
        aria-label={required ? `${approved} of ${required} required hours approved` : `${approved} hours approved`}
      >
        <span className="absolute inset-y-0 left-0 bg-emerald-600" style={{ width: `${approvedPct}%` }} />
        <span className="absolute inset-y-0 bg-amber-300" style={{ left: `${approvedPct}%`, width: `${pendingPct}%` }} />
      </div>
      <p className={`mt-1.5 text-slate-600 ${compact ? 'text-xs' : 'text-sm'}`}>
        <strong className="text-slate-900">{formatHours(approved)}</strong>
        {required ? ` of ${formatHours(required)}` : ''}
        {pending > 0 && <span className="text-amber-700"> · {formatHours(pending)} waiting</span>}
      </p>
    </div>
  )
}
