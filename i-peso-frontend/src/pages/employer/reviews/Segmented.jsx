import { useId } from 'react'
import { motion as Motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * Pill-style switch with a sliding highlight. Behaves as a radio group:
 * one option is always selected and arrow keys move between options.
 */
export default function Segmented({ label, value, onChange, options, size = 'md', className }) {
  const pill = useId()
  const move = (event, index) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = options[(index + step + options.length) % options.length]
    onChange(next.value)
    event.currentTarget.parentElement?.querySelectorAll('[role="radio"]')[(index + step + options.length) % options.length]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-2xl bg-slate-100 p-1', className)}>
      {options.map((option, index) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-xl font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              active ? 'text-slate-950' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {active && (
              <Motion.span layoutId={pill} className="absolute inset-0 rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70" transition={{ type: 'spring', stiffness: 500, damping: 38 }} aria-hidden="true" />
            )}
            <span className="relative flex items-center gap-1.5">{option.label}</span>
            {option.count != null && (
              <span className={cn('relative min-w-5 rounded-full px-1.5 text-[11px] tabular-nums', option.highlight && option.count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200/80 text-slate-600')}>
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
