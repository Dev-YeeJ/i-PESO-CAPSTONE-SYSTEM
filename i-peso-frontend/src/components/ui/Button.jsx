import { createElement } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'border border-amber-500 bg-brand-gold text-brand-navy shadow-sm hover:border-amber-400 hover:bg-amber-400',
  accent: 'border border-amber-500 bg-brand-gold text-brand-navy shadow-sm hover:border-amber-400 hover:bg-amber-400',
  navy: 'border border-blue-900 bg-blue-900 text-white shadow-sm hover:border-blue-800 hover:bg-blue-800',
  secondary: 'border border-brand-navy bg-white text-brand-navy hover:bg-brand-navy hover:text-white',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:border-brand-navy hover:text-brand-navy',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-success text-white shadow-sm hover:bg-emerald-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
}

const sizes = {
  sm: 'min-h-9 px-3 py-2 text-xs',
  md: 'min-h-10 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-5 py-3 text-sm',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  // Renders a spinning Loader2 in place of `icon` and disables the button — the one place
  // this lives so every "busy" button in the app actually animates instead of the common
  // copy-pasted `icon={busy ? Loader2 : X}` pattern, which swaps in Loader2 but never
  // applies `animate-spin`, so it just sits there looking frozen while a request is in flight.
  loading = false,
  to,
  className = '',
  type = 'button',
  disabled = false,
  ...props
}) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50',
    variants[variant] ?? variants.primary,
    sizes[size] ?? sizes.md,
    className,
  ].join(' ')
  const resolvedIcon = loading ? Loader2 : icon
  const content = (
    <>
      {resolvedIcon && createElement(resolvedIcon, { className: `h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}` })}
      {children}
    </>
  )
  const isDisabled = disabled || loading

  return to
    ? <Link to={to} className={classes} aria-disabled={isDisabled} {...props}>{content}</Link>
    : <button type={type} className={classes} disabled={isDisabled} {...props}>{content}</button>
}
