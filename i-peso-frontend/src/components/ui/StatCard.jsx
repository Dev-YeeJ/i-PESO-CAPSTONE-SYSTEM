// src/components/ui/StatCard.jsx
import { ArrowDown, ArrowUp, Info, Minus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const colorClasses = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-700' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-700' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-700' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-700' },
  slate: { bg: 'bg-slate-50', icon: 'text-slate-600', text: 'text-slate-700' },
}

/**
 * StatCard — a KPI tile. Shared across admin + portals.
 *
 * Trend direction is coloured by whether the change is *good*, not merely
 * whether it is positive. For metrics where a rise is undesirable (e.g. rising
 * unemployment, pending backlog), pass `trendPositiveIsGood={false}` so an
 * increase reads red, not green. Direction is also shown with an arrow + sign
 * so it never relies on colour alone.
 *
 * @param {{value:number,label:string}} [trend]
 * @param {boolean} [trendPositiveIsGood=true]
 * @param {string}  [hint]  short explanation of how the value is calculated
 */
export function StatCard({
  icon: IconComponent,
  label,
  value,
  subtitle,
  color = 'blue',
  trend,
  trendPositiveIsGood = true,
  hint,
}) {
  const colors = colorClasses[color] || colorClasses.blue

  let trendUi = null
  if (trend && typeof trend.value === 'number') {
    const up = trend.value > 0
    const flat = trend.value === 0
    const isGood = flat ? null : up === trendPositiveIsGood
    const tone = flat ? 'text-slate-500' : isGood ? 'text-success' : 'text-danger'
    const TrendIcon = flat ? Minus : up ? ArrowUp : ArrowDown
    const directionWord = flat ? 'no change' : up ? 'up' : 'down'
    trendUi = (
      <div
        className="mt-4 flex items-center gap-1.5"
        aria-label={`${label}: ${directionWord} ${Math.abs(trend.value)}% ${trend.label}`}
      >
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${tone}`}>
          <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {up ? '+' : ''}{trend.value}%
        </span>
        <span className="text-xs text-slate-500">{trend.label}</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
            {label}
            {hint && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`How ${label} is calculated`}
                      className="rounded text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1"
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs font-normal">{hint}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>

        <div className={`${colors.bg} rounded-xl p-3`}>
          {IconComponent && <IconComponent className={`h-6 w-6 ${colors.icon}`} aria-hidden="true" />}
        </div>
      </div>

      {trendUi}
    </div>
  )
}

export default StatCard
