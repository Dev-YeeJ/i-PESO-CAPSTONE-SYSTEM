import { createElement } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

const variants = {
  warning: {
    classes: 'border-amber-300 bg-amber-50 text-amber-950',
    icon: AlertTriangle,
    iconClasses: 'text-amber-600',
  },
  success: {
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    icon: CheckCircle2,
    iconClasses: 'text-emerald-600',
  },
  danger: {
    classes: 'border-red-200 bg-red-50 text-red-950',
    icon: XCircle,
    iconClasses: 'text-red-600',
  },
  info: {
    classes: 'border-blue-200 bg-blue-50 text-blue-950',
    icon: Info,
    iconClasses: 'text-blue-600',
  },
}

export default function AlertBox({
  title,
  children,
  variant = 'warning',
  action = null,
  className = '',
}) {
  const config = variants[variant] ?? variants.warning

  return (
    <div className={`flex flex-col gap-4 rounded-xl border px-5 py-4 sm:flex-row sm:items-center ${config.classes} ${className}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {createElement(config.icon, { className: `mt-0.5 h-5 w-5 shrink-0 ${config.iconClasses}` })}
        <div className="min-w-0">
          {title && <p className="text-sm font-extrabold">{title}</p>}
          {children && <div className="mt-0.5 text-sm leading-6 opacity-80">{children}</div>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
