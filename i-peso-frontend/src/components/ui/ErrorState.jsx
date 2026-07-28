import { AlertTriangle, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import Button from './Button'

const isDev = import.meta.env?.DEV

/**
 * ErrorState — shown when a data region fails to load. Explains what happened,
 * offers a retry, and surfaces raw error detail in development only.
 *
 * @param {string}   [title]       defaults to a plain-language message
 * @param {string}   [description] what to try next
 * @param {Function} [onRetry]     retry handler; renders a "Try again" button when provided
 * @param {unknown}  [error]       raw error; shown only when DEV
 * @param {'sm'|'md'} [size]
 */
export default function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Check your connection and try again.",
  onRetry,
  error,
  size = 'md',
  className = '',
}) {
  const pad = size === 'sm' ? 'py-8' : 'py-14'
  const detail = isDev && error ? (error?.message ?? String(error)) : null

  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 text-center', pad, className)}
      role="alert"
    >
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-bg text-danger">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="outline" size="sm" icon={RotateCw} onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
      {detail && (
        <pre className="mt-4 max-w-md overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 text-left text-xs text-slate-100">
          {detail}
        </pre>
      )}
    </div>
  )
}
