export default function Card({
  children,
  className = '',
  padding = 'md',
  interactive = false,
  hero = false,
  heroContent = null,
}) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  }

  return (
    <section className={[
      'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm',
      interactive ? 'transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md' : '',
      className,
    ].filter(Boolean).join(' ')}>
      {hero && (
        <div className="portal-card-hero relative overflow-hidden border-b border-white/10 bg-brand-navy px-5 py-5 text-white sm:px-6">
          <div className="relative z-10">{heroContent}</div>
        </div>
      )}
      <div className={paddingClasses[padding] ?? paddingClasses.md}>{children}</div>
    </section>
  )
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`mb-5 flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div>
        <h2 className="text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">{title}</h2>
        {subtitle && <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
