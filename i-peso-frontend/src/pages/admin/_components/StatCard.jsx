// i-peso-frontend/src/components/admin/StatCard.jsx

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    text: 'text-blue-700',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    text: 'text-green-700',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    text: 'text-amber-700',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    text: 'text-red-700',
  },
  slate: {
    bg: 'bg-slate-50',
    icon: 'text-slate-600',
    text: 'text-slate-700',
  },
}

export function StatCard({ icon: IconComponent, label, value, subtitle, color = 'blue', trend }) {
  const colors = colorClasses[color] || colorClasses.blue

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>

        <div className={`${colors.bg} p-3 rounded-xl`}>
          {IconComponent && <IconComponent className={`w-6 h-6 ${colors.icon}`} />}
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1">
          <span
            className={`text-xs font-semibold ${
              trend.value >= 0 ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs text-slate-500">{trend.label}</span>
        </div>
      )}
    </div>
  )
}

export default StatCard