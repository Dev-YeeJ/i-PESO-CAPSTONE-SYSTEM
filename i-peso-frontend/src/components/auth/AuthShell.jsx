import { House, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import IPesoLogo from '@/components/branding/IPesoLogo'
import RegistrationJourneyShell from './RegistrationJourneyShell'

/**
 * Split auth layout: a navy rail that says what this screen is for, and a
 * white form column. The registration journey (seeker 9 steps, employer 5)
 * hands off to RegistrationJourneyShell, which shows the steps in the rail.
 *
 * variant="staff" is the PESO staff workspace look (deeper navy, no public
 * links, a note that sign-ins are logged). It is never linked from the
 * public site.
 */
export default function AuthShell({
  children,
  title,
  subtitle,
  sideTitle = 'One account for everything PESO Urdaneta does for you.',
  sideText = 'Job seekers see their match for every vacancy and track each application. Employers post vacancies, screen ranked applicants and file monthly reports.',
  sideExtra = null,
  maxWidth = 'max-w-[440px]',
  journey,
  variant = 'public',
}) {
  if (journey) {
    return (
      <RegistrationJourneyShell
        role={journey.role}
        steps={journey.steps}
        currentStep={journey.currentStep}
        title={title}
        subtitle={subtitle}
        maxWidth={maxWidth === 'max-w-[440px]' ? 'max-w-xl' : maxWidth}
      >
        {children}
      </RegistrationJourneyShell>
    )
  }

  const staff = variant === 'staff'

  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-900">
      <aside className={`relative hidden w-[480px] shrink-0 flex-col justify-between px-12 py-10 text-white lg:flex xl:w-[520px] ${staff ? 'bg-[#0c2446]' : 'bg-brand-navy'}`}>
        <Link to={staff ? '/administrator' : '/'} className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white"><IPesoLogo className="h-full w-full" /></span>
          <span className="leading-tight">
            <span className="block text-[17px] font-bold">i-PESO</span>
            <span className="block text-xs text-white/60">{staff ? 'PESO staff workspace' : 'Public Employment Service Office, Urdaneta City'}</span>
          </span>
        </Link>

        <div className="max-w-sm">
          {staff && (
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/85">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Staff only
            </span>
          )}
          <p className="font-display text-[40px] leading-[1.12] xl:text-[44px]">{sideTitle}</p>
          {sideText && <p className="mt-5 text-[15px] leading-7 text-white/75">{sideText}</p>}
          {sideExtra}
        </div>

        <p className="text-xs leading-5 text-white/55">
          {staff
            ? 'Restricted to PESO Urdaneta City personnel. Every sign-in is recorded in the activity log.'
            : 'Free government service. PESO will never ask you to pay for job referrals.'}
        </p>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
          <Link to={staff ? '/administrator' : '/'} className="flex items-center gap-2 lg:invisible">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white"><IPesoLogo className="h-full w-full" /></span>
            <span className="font-bold text-brand-navy">i-PESO</span>
          </Link>
          {!staff && (
            <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-navy">
              <House className="h-4 w-4" aria-hidden="true" /> Back to home
            </Link>
          )}
        </div>

        <div className="flex flex-1 items-start justify-center px-5 pb-16 pt-4 sm:px-8 lg:items-center lg:pt-0">
          <div className={`w-full ${maxWidth}`}>
            <h1 className="text-[28px] font-bold leading-9 tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1.5 text-[15px] leading-6 text-slate-600">{subtitle}</p>}
            <div className="mt-6">{children}</div>
            {!staff && (
              <p className="mt-10 text-xs text-slate-500">
                <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-brand-navy">Privacy Policy</Link>
                <span className="mx-2 text-slate-300" aria-hidden="true">|</span>
                <Link to="/terms-of-service" className="underline underline-offset-2 hover:text-brand-navy">Terms of Service</Link>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
