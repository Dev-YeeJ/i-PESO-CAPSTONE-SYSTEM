import { useCallback, useState } from 'react'
import { ArrowLeft, Building2, Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '@/components/auth/AuthShell'
import { employerRegistrationSteps } from '@/components/auth/registrationJourneys'
import Field from '@/components/form/Field'
import FormError from '@/components/form/FormError'
import PasswordStrengthMeter from '@/components/form/PasswordStrengthMeter'
import { Button, Card } from '@/components/ui'
import { authService } from '@/services/authService'
import { getPasswordStrength } from '@/services/validationHelpers'

const companyTypes = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship', helper: 'Best for DTI-registered single-owner businesses.' },
  { value: 'corporation_partnership', label: 'Corporation / Partnership', helper: 'Use for SEC-registered corporations or partnerships.' },
  { value: 'local_recruitment_agency', label: 'Local Recruitment Agency', helper: 'Use when recruiting workers for local placement.' },
  { value: 'overseas_recruitment_agency', label: 'Overseas Recruitment Agency', helper: 'Use for overseas placement agencies subject to additional review.' },
]

const fields = ['email', 'password', 'password_confirmation', 'company_type']

const validate = (form) => {
  const errors = {}
  if (!form.email?.trim()) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.'
  if (!form.password) errors.password = 'Password is required.'
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  if (!form.password_confirmation) errors.password_confirmation = 'Please confirm your password.'
  else if (form.password !== form.password_confirmation) errors.password_confirmation = 'Passwords do not match.'
  if (!form.company_type) errors.company_type = 'Please select a company type.'
  return errors
}

export default function EmployerRegistration() {
  const navigate = useNavigate()
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const strength = getPasswordStrength(form.password ?? '')

  const change = useCallback((event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setApiError('')
  }, [])
  const blur = useCallback((event) => setTouched((current) => ({ ...current, [event.target.name]: true })), [])
  const fieldError = (name) => touched[name] ? errors[name] : undefined

  const submit = async (event) => {
    event.preventDefault()
    setTouched(Object.fromEntries(fields.map((field) => [field, true])))
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setLoading(true)
    setApiError('')
    try {
      const data = await authService.register({
        role: 'employer',
        email: form.email.trim().toLowerCase(),
        password: form.password,
        password_confirmation: form.password_confirmation,
        company_type: form.company_type,
      })
      localStorage.setItem('ipeso_pending_email', data.email)
      localStorage.setItem('ipeso_pending_role', 'employer')
      navigate('/verify-email', { replace: true })
    } catch (error) {
      if (error.response?.status === 422) setErrors(error.response.data.errors ?? {})
      else setApiError(error.response?.data?.message ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create an employer account"
      subtitle="Set up the company login and legal organization type. Company details and documents follow after email verification."
      maxWidth="max-w-2xl"
      journey={{ role: 'employer', steps: employerRegistrationSteps, currentStep: 1 }}
      sideTitle="Join the verified employer network."
      sideText="PESO accreditation protects job seekers and enables trusted companies to publish local employment opportunities."
      sideItems={['Legal document review', 'Email and dashboard status notifications', 'Job posting access after approval']}
    >
      <Link to="/register" className="registration-change-role"><ArrowLeft className="h-4 w-4" />Change account type</Link>
      <Card>
        <FormError message={apiError} />
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="Company email address" name="email" type="email" placeholder="company@example.com" value={form.email ?? ''} onChange={change} onBlur={blur} error={fieldError('email')} />
          <div>
            <Field label="Password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Minimum 8 characters" value={form.password ?? ''} onChange={change} onBlur={blur} error={fieldError('password')} rightElement={<VisibilityButton shown={showPassword} onClick={() => setShowPassword((current) => !current)} />} />
            <PasswordStrengthMeter password={form.password} strength={strength} />
          </div>
          <Field label="Confirm password" name="password_confirmation" type={showConfirmation ? 'text' : 'password'} placeholder="Re-enter your password" value={form.password_confirmation ?? ''} onChange={change} onBlur={blur} error={fieldError('password_confirmation')} rightElement={<VisibilityButton shown={showConfirmation} onClick={() => setShowConfirmation((current) => !current)} />} />

          <fieldset>
            <legend className="mb-2 text-sm font-bold text-slate-700">Smart legal company type</legend>
            <p className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs leading-5 text-indigo-700">
              Select the closest legal classification so PESO can request the correct verification documents after email confirmation.
            </p>
            <div className="grid gap-2">
              {companyTypes.map((type) => (
                <label key={type.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${form.company_type === type.value ? 'border-brand-navy bg-slate-50 ring-1 ring-brand-navy' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="company_type" value={type.value} checked={form.company_type === type.value} onChange={change} onBlur={blur} className="h-4 w-4 accent-slate-900" />
                  <span>
                    <span className="block text-sm font-bold text-slate-800">{type.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{type.helper}</span>
                  </span>
                </label>
              ))}
            </div>
            {fieldError('company_type') && <p className="mt-1.5 text-xs font-medium text-red-600">{fieldError('company_type')}</p>}
          </fieldset>
          <Button type="submit" disabled={loading} icon={Building2} className="w-full">{loading ? 'Creating account...' : 'Continue to Email Verification'}</Button>
        </form>
        <p className="registration-secondary-action">Already registered? <Link to="/login">Sign in</Link></p>
      </Card>
    </AuthShell>
  )
}

function VisibilityButton({ shown, onClick }) {
  return <button type="button" onClick={onClick} className="text-slate-400 hover:text-slate-700" aria-label={shown ? 'Hide password' : 'Show password'}>{shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
}
