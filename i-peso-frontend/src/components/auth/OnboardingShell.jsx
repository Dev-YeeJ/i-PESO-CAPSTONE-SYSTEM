import RegistrationJourneyShell from './RegistrationJourneyShell'

export default function OnboardingShell({
  children,
  title,
  subtitle,
  maxWidth = 'max-w-5xl',
  role,
  steps,
  currentStep,
}) {
  return (
    <RegistrationJourneyShell
      role={role}
      steps={steps}
      currentStep={currentStep}
      title={title}
      subtitle={subtitle}
      maxWidth={maxWidth}
    >
      {children}
    </RegistrationJourneyShell>
  )
}
