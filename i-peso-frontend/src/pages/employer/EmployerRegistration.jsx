import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import * as employerService from '@/services/employerService'
import Step2CompanyProfile from './steps/Step2CompanyProfile'
import Step3DocumentUpload from './steps/Step3DocumentUpload'
import Step4Representative from './steps/Step4Representative'

const STEPS = [
  { number: 1, label: 'Account', title: 'Account Setup', subtitle: 'Employer login and legal company type.' },
  { number: 2, label: 'Email', title: 'Email Verification', subtitle: 'Six-digit OTP verification.' },
  { number: 3, label: 'Company', title: 'Company Profile', subtitle: 'Complete the official company information and business address.' },
  { number: 4, label: 'Documents', title: 'Legal Verification Vault', subtitle: 'Upload the permits and registrations required for the selected company type.' },
  { number: 5, label: 'Representative', title: 'Authorized Representative', subtitle: 'Provide the person authorized to transact with PESO for the company.' },
]

const StepIndicator = ({ current, completed }) => (
  <div className="mb-8 flex items-center">
    {STEPS.map((step, index) => {
      const active = step.number === current
      const done = completed.includes(step.number)
      const last = index === STEPS.length - 1

      return (
        <div key={step.number} className={`flex items-center ${last ? '' : 'flex-1'}`}>
          <div className="flex flex-col items-center gap-1.5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
              done
                ? 'border-green-300 bg-green-100 text-green-700'
                : active
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-slate-200 bg-slate-100 text-slate-400'
            }`}>
              {done ? '\u2713' : step.number}
            </div>
            <span className={`whitespace-nowrap text-[10px] font-semibold ${
              active ? 'text-blue-700' : done ? 'text-green-700' : 'text-slate-400'
            }`}>
              {step.label}
            </span>
          </div>
          {!last && <div className={`mx-2 mb-5 h-0.5 flex-1 ${done ? 'bg-green-300' : 'bg-slate-200'}`} />}
        </div>
      )
    })}
  </div>
)

export default function EmployerRegistration() {
  const navigate = useNavigate()
  const cardRef = useRef(null)
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const [step, setStep] = useState(3)
  const [completed, setCompleted] = useState([1, 2])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await employerService.getProfile()
        setProfile(data.employer)
      } catch (error) {
        setLoadError(error.response?.data?.message ?? 'Unable to load your employer profile.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  const completeStep = (data) => {
    if (data.registrationSubmitted) {
      updateUser({ verification_status: 'pending' })
      navigate('/employer/dashboard', { replace: true })
      return
    }

    setProfile((current) => ({ ...current, ...data }))
    setCompleted((current) => [...new Set([...current, step])])
    setStep((current) => Math.min(current + 1, 5))
  }

  const initialCompanyData = {
    company_name: profile?.company_name ?? user?.company_name ?? '',
    tin: profile?.tin ?? user?.tin ?? '',
    trade_name: profile?.trade_name ?? '',
    industry: profile?.industry ?? user?.industry ?? '',
    company_size: profile?.company_size ?? '',
    province: profile?.province ?? '',
    city: profile?.city_municipality ?? '',
    barangay: profile?.barangay ?? '',
    street_address: profile?.house_unit_street ?? '',
    description: profile?.company_description ?? '',
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-7 text-center">
          <div className="mb-3 inline-flex rounded-xl bg-blue-700 px-4 py-2 text-base font-bold tracking-wide text-white">
            i-PESO
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Complete Your Employer Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Employer accreditation and document verification</p>
        </div>

        <div ref={cardRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1 bg-slate-100">
            <div
              className="h-full bg-blue-700 transition-all duration-300"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>

          <div className="p-6 sm:p-8">
            <StepIndicator current={step} completed={completed} />

            {loadError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                {loadError}
              </div>
            )}

            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-bold text-blue-900">Step {step} of 5: {STEPS[step - 1].title}</p>
              <p className="mt-1 text-xs text-blue-700">{STEPS[step - 1].subtitle}</p>
            </div>

            {step === 3 && (
              <Step2CompanyProfile initialData={initialCompanyData} onComplete={completeStep} />
            )}
            {step === 4 && (
              <Step3DocumentUpload companyType={profile?.company_type ?? user?.company_type} onComplete={completeStep} />
            )}
            {step === 5 && <Step4Representative onComplete={completeStep} />}

            {step > 3 && (
              <button
                type="button"
                onClick={() => setStep((current) => current - 1)}
                className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                &larr; Back
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-slate-400">
          Your information is protected under the Data Privacy Act of 2012 (RA 10173).
        </p>
      </div>
    </div>
  )
}
