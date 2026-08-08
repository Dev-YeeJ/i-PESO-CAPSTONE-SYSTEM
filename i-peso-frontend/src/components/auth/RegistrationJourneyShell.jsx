import { ArrowLeft, Check, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import BrandMark from './BrandMark'
import { registrationJourneyCopy } from './registrationJourneys'

/**
 * Shell for the seeker (9 step) and employer (5 step) registration journeys.
 *
 * The rail is a companion, not a billboard. Once someone has an account they
 * have already accepted the pitch, so from step 3 on the rail drops the
 * marketing and spends its width on orientation: where you are, what this
 * step will ask for, and the fact that finished steps are saved.
 */
export default function RegistrationJourneyShell({
  children,
  role,
  steps,
  currentStep,
  title,
  subtitle,
  maxWidth = 'max-w-4xl',
}) {
  const copy = registrationJourneyCopy[role] ?? registrationJourneyCopy.seeker
  const active = steps[currentStep - 1]
  const completedCount = Math.max(0, currentStep - 1)
  const progress = Math.round((completedCount / steps.length) * 100)

  // The pitch earns its space only while someone is still signing up. After
  // verification they are committed, and the rail owes them help instead.
  const showPitch = currentStep <= 2

  return (
    <div className="registration-journey-shell pre-dashboard-shell min-h-screen">
      <div className="registration-journey-grid" />

      <div className="registration-journey-layout mx-auto grid min-h-screen w-full max-w-[1720px]">
        <aside className="registration-journey-aside">
          <BrandMark light compact />

          <div className="registration-rail-scroll">
            {showPitch && (
              <div className="mb-7">
                <p className="registration-rail-label mb-2">{copy.eyebrow}</p>
                <h1 className="text-[1.6rem] font-bold leading-[1.15] tracking-tight text-white" style={{ fontFamily: 'var(--rj-display)' }}>
                  {copy.heading}
                </h1>
              </div>
            )}

            <p className="registration-rail-label">Your progress</p>
            <div className="registration-step-list">
              {steps.map((step, index) => {
                const number = index + 1
                const complete = number < currentStep
                const isActive = number === currentStep

                return (
                  <div
                    key={step.label}
                    className={`registration-step ${complete ? 'is-complete' : ''} ${isActive ? 'is-active' : ''}`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <span className="registration-step-number" aria-hidden="true">
                      {complete ? <Check className="h-3 w-3" strokeWidth={3} /> : number}
                    </span>
                    <span className="min-w-0 truncate">{step.label}</span>
                    <span className="sr-only">
                      {complete ? '— saved' : isActive ? '— current step' : '— not started'}
                    </span>
                  </div>
                )
              })}
            </div>

            {active?.ready?.length > 0 && (
              <div className="registration-ready mt-7">
                <p className="registration-rail-label">Have this ready</p>
                <ul className="registration-ready-list">
                  {active.ready.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <p className="registration-ready-note">
                  Missing something? Every finished step is saved. Sign back in and you will land right here.
                </p>
              </div>
            )}
          </div>

          <div className="registration-rail-foot">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Protected under the Data Privacy Act
          </div>
        </aside>

        <main className="registration-journey-main">
          <div className={`w-full ${maxWidth}`}>
            <div className="registration-main-bar">
              <Link to="/" className="registration-home-link">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to home
              </Link>
              {completedCount > 0 && (
                <span className="registration-saved">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                  {completedCount} of {steps.length} steps saved
                </span>
              )}
            </div>

            <div className="registration-mobile-progress">
              <div className="flex items-center justify-between gap-3">
                <BrandMark light compact />
                <span className="registration-saved">Step {currentStep} of {steps.length}</span>
              </div>
              <div className="rj-track">
                {steps.map((step, index) => (
                  <span key={step.label} className={index < currentStep ? 'is-done' : ''} />
                ))}
              </div>
              <p className="mt-2 truncate text-xs font-semibold text-white/75">{active?.label}</p>
            </div>

            <section className="registration-form-panel">
              <div className="registration-form-heading">
                {/* One progress signal. The rail says which step; this says how far. */}
                <div className="registration-meter">
                  <div
                    className="registration-meter-track"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Registration progress: step ${currentStep} of ${steps.length}`}
                  >
                    <div className="registration-meter-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="registration-meter-caption">
                    {currentStep} / {steps.length} · {active?.shortLabel ?? active?.label}
                  </span>
                </div>

                <h2>{title}</h2>
                {subtitle && <p className="rj-sub">{subtitle}</p>}
                <p className="rj-ref">{copy.portal} · Urdaneta City PESO</p>
              </div>

              <div className="registration-form-content">{children}</div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
