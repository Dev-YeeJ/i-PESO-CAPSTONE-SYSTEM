// i-peso-frontend/src/components/admin/PageHeader.jsx

export function PageHeader({ title, subtitle, actions = [] }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
      </div>

      {actions.length > 0 && (
        <div className="flex items-center gap-3">
          {actions.map((action, idx) => {
            const isVariantPrimary = action.variant === 'primary' || !action.variant
            const isVariantDanger = action.variant === 'danger'
            const isVariantGhost = action.variant === 'ghost'

            const buttonClass = isVariantPrimary
              ? 'bg-blue-700 hover:bg-blue-800 text-white'
              : isVariantDanger
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : isVariantGhost
              ? 'text-blue-700 hover:underline'
              : 'border border-slate-300 text-slate-700 hover:bg-slate-50'

            const baseClass = isVariantGhost
              ? 'text-sm font-medium'
              : 'rounded-xl px-4 py-2 text-sm font-semibold'

            return (
              <button
                key={idx}
                onClick={action.onClick}
                className={`${baseClass} ${buttonClass} transition-colors`}
              >
                {action.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PageHeader
