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

const fields = ['email', 'password', 'password_confirmation']

const validate = (form) => {
  const errors = {}
  if (!form.email?.trim()) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.'
  if (!form.password) errors.password = 'Password is required.'
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  if (!form.password_confirmation) errors.password_confirmation = 'Please confirm your password.'
  else if (form.password !== form.password_confirmation) errors.password_confirmation = 'Passwords do not match.'
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
      subtitle="Set up your company login. Your legal company type, company details, and documents follow after email verification."
      maxWidth="max-w-2xl"
      journey={{ role: 'employer', steps: employerRegistrationSteps, currentStep: 1 }}
      sideTitle="Join the verified employer network."
      sideText="PESO accreditation protects job seekers and enables trusted companies to publish local employment opportunities."
      sideItems={['Legal document review', 'Email and dashboard status notifications', 'Job posting access after approval']}
    >
      <Link to="/register" className="registration-change-role"><ArrowLeft className="h-4 w-4" />Change account type</Link>
      <Card padding="sm">
        <FormError message={apiError} />
        <form onSubmit={submit} noValidate className="space-y-3">
          <Field label="Company email address" name="email" type="email" placeholder="company@example.com" value={form.email ?? ''} onChange={change} onBlur={blur} error={fieldError('email')} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Field label="Password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Minimum 8 characters" value={form.password ?? ''} onChange={change} onBlur={blur} error={fieldError('password')} rightElement={<VisibilityButton shown={showPassword} onClick={() => setShowPassword((current) => !current)} />} />
              <PasswordStrengthMeter password={form.password} strength={strength} />
            </div>
            <Field label="Confirm password" name="password_confirmation" type={showConfirmation ? 'text' : 'password'} placeholder="Re-enter your password" value={form.password_confirmation ?? ''} onChange={change} onBlur={blur} error={fieldError('password_confirmation')} rightElement={<VisibilityButton shown={showConfirmation} onClick={() => setShowConfirmation((current) => !current)} />} />
          </div>

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
