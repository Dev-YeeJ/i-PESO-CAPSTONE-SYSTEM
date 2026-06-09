import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import BrandMark from './BrandMark'
import { registrationJourneyCopy } from './registrationJourneys'

export default function RegistrationJourneyShell({
  children,
  role,
  steps,
  currentStep,
  title,
  subtitle,
  maxWidth = 'max-w-2xl',
}) {
  const copy = registrationJourneyCopy[role] ?? registrationJourneyCopy.seeker
  const progress = Math.round((currentStep / steps.length) * 100)

  return (
    <div className="registration-journey-shell pre-dashboard-shell min-h-screen">
      <div className="registration-journey-grid" />
      <div className="registration-journey-layout mx-auto grid min-h-screen w-full max-w-[1520px] lg:grid-cols-[minmax(360px,0.82fr)_minmax(620px,1.18fr)]">
        <aside className="registration-journey-aside">
          <BrandMark light compact />

          <div className="my-auto py-12">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-gold">{copy.eyebrow}</p>
            <h1 className="mt-5 max-w-md text-4xl font-black leading-[1.08] tracking-tight text-white xl:text-5xl">{copy.heading}</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-blue-100/65">{copy.description}</p>

            <div className="registration-step-list mt-9">
              {steps.map((step, index) => {
                const number = index + 1
                const complete = number < currentStep
                const active = number === currentStep

                return (
                  <div key={step.label} className={`registration-step ${complete ? 'is-complete' : ''} ${active ? 'is-active' : ''}`}>
                    <span className="registration-step-number">{complete ? <Check className="h-4 w-4" /> : number}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold">{step.label}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-blue-200/55">
            <ShieldCheck className="h-4 w-4" /> Data Privacy Act protected
          </div>
        </aside>

        <main className="registration-journey-main">
          <div className={`w-full ${maxWidth}`}>
            <Link to="/" className="registration-home-link"><ArrowLeft className="h-4 w-4" /> Back to Home</Link>

            <div className="registration-mobile-progress">
              <div className="flex items-center justify-between gap-3">
                <BrandMark light compact />
                <span className="text-xs font-black text-brand-gold">{currentStep}/{steps.length}</span>
              </div>
              <div className="mt-3 flex gap-1.5">
                {steps.map((step, index) => (
                  <span
                    key={step.label}
                    className={`h-1.5 flex-1 rounded-full ${index < currentStep ? 'bg-brand-gold' : 'bg-white/15'}`}
                    title={step.label}
                  />
                ))}
              </div>
              <p className="mt-2 truncate text-xs font-bold text-blue-100/70">{steps[currentStep - 1]?.label}</p>
            </div>

            <section className="registration-form-panel">
              <div className="registration-form-heading">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Step {currentStep} of {steps.length}
                  </p>
                  <span className="text-sm font-black text-amber-600">{progress}%</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-brand-gold transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <h2 className="mt-5 text-2xl font-black tracking-tight text-brand-navy sm:text-3xl">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
                <p className="mt-2 text-xs font-bold text-blue-700">{copy.portal} · Urdaneta City PESO</p>
              </div>

              <div className="registration-form-content">{children}</div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
