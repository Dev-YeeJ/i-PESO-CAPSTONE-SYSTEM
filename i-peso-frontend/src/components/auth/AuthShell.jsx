import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import BrandMark from './BrandMark'
import RegistrationJourneyShell from './RegistrationJourneyShell'

export default function AuthShell({
  children,
  title,
  subtitle,
  eyebrow = 'Official PESO Digital Service',
  maxWidth = 'max-w-md',
  journey,
}) {
  if (journey) {
    return (
      <RegistrationJourneyShell
        role={journey.role}
        steps={journey.steps}
        currentStep={journey.currentStep}
        title={title}
        subtitle={subtitle}
        maxWidth={maxWidth}
      >
        {children}
      </RegistrationJourneyShell>
    )
  }

  return (
    <div className="auth-glass-shell pre-dashboard-shell relative flex min-h-screen items-center justify-center overflow-x-hidden px-4 py-5 sm:px-6">
      <div className="auth-aurora auth-aurora-one" />
      <div className="auth-aurora auth-aurora-two" />
      <div className="auth-grid" />

      <div className={`auth-stage relative z-10 w-full ${maxWidth}`}>
        <div className="mb-4 flex items-center justify-between">
          <BrandMark light compact />
          <Link to="/" className="glass-nav-link">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>

        <div className="auth-glass-panel">
          <div className="mb-5 text-center">
            <span className="auth-service-pill">
              <ShieldCheck className="h-4 w-4" /> {eyebrow}
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1>
            {subtitle && <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-300">{subtitle}</p>}
          </div>

          {children}

          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Secure, accessible, and managed by Urdaneta City PESO
          </div>
        </div>
      </div>
    </div>
  )
}
