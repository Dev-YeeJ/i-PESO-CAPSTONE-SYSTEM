import { Inbox, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from './Button'

/**
 * EmptyState — shown when a data region has no rows.
 *
 * @param {React.ElementType} [icon]      lucide icon (defaults to Inbox, or SearchX when `filtered`)
 * @param {string}            title       what's empty, in the user's words
 * @param {string}            [description] why it's empty / what to do next
 * @param {{label,onClick,to,variant,icon}} [action]           primary recovery action
 * @param {{label,onClick,to,variant,icon}} [secondaryAction]  optional secondary action
 * @param {boolean}           [filtered]  true when filters caused the emptiness (changes default copy/icon)
 * @param {'sm'|'md'}         [size]
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  filtered = false,
  size = 'md',
  className = '',
}) {
  const ResolvedIcon = Icon ?? (filtered ? SearchX : Inbox)
  const pad = size === 'sm' ? 'py-8' : 'py-14'

  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 text-center', pad, className)}
      role="status"
    >
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <ResolvedIcon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <Button
              variant={action.variant ?? 'primary'}
              size="sm"
              icon={action.icon}
              to={action.to}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant ?? 'outline'}
              size="sm"
              icon={secondaryAction.icon}
              to={secondaryAction.to}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
