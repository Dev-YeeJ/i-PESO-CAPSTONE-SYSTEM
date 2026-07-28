import { createElement } from 'react'
import { Link } from 'react-router-dom'

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
  to,
  className = '',
  type = 'button',
  ...props
}) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50',
    variants[variant] ?? variants.primary,
    sizes[size] ?? sizes.md,
    className,
  ].join(' ')
  const content = <>{icon && createElement(icon, { className: 'h-4 w-4 shrink-0' })}{children}</>

  return to
    ? <Link to={to} className={classes} {...props}>{content}</Link>
    : <button type={type} className={classes} {...props}>{content}</button>
}
