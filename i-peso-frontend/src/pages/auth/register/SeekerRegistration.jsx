import { useCallback, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '@/components/auth/AuthShell'
import { seekerRegistrationSteps } from '@/components/auth/registrationJourneys'
import Field from '@/components/form/Field'
import FormError from '@/components/form/FormError'
import PasswordStrengthMeter from '@/components/form/PasswordStrengthMeter'
import { Button, Card } from '@/components/ui'
import { authService } from '@/services/authService'
import { getPasswordStrength } from '@/services/validationHelpers'

const validate = (form) => {
  const errors = {}
  if (!form.first_name?.trim()) errors.first_name = 'First name is required.'
  if (!form.last_name?.trim()) errors.last_name = 'Last name is required.'
  if (!form.email?.trim()) errors.email = 'Email is required.'
  else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Enter a valid email address.'
  if (!form.mobile_number?.trim()) errors.mobile_number = 'Mobile number is required.'
  else if (!/^09\d{9}$/.test(form.mobile_number.replace(/[-\s]/g, ''))) errors.mobile_number = 'Enter a valid PH mobile number (09XXXXXXXXX).'
  if (!form.password) errors.password = 'Password is required.'
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  if (!form.password_confirmation) errors.password_confirmation = 'Please confirm your password.'
  else if (form.password !== form.password_confirmation) errors.password_confirmation = 'Passwords do not match.'
  return errors
}

export default function SeekerRegistration() {
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
    setApiError('')
    setErrors((current) => ({ ...current, [name]: undefined }))
  }, [])

  const blur = useCallback((event) => setTouched((current) => ({ ...current, [event.target.name]: true })), [])
  const fieldError = (name) => touched[name] ? errors[name] : undefined

  const submit = async (event) => {
    event.preventDefault()
    const fields = ['first_name', 'last_name', 'email', 'mobile_number', 'password', 'password_confirmation']
    setTouched(Object.fromEntries(fields.map((field) => [field, true])))
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setLoading(true)
    setApiError('')
    try {
      const data = await authService.register({
        role: 'seeker',
        first_name: form.first_name,
        last_name: form.last_name,
        educ_attainment: form.educ_attainment,
        email: form.email,
        mobile_number: form.mobile_number,
        password: form.password,
        password_confirmation: form.password_confirmation,
      })
      localStorage.setItem('ipeso_pending_email', data.email)
      localStorage.setItem('ipeso_pending_role', 'seeker')
      navigate('/verify-email', { state: { email: data.email } })
    } catch (error) {
      if (error.response?.status === 422) setErrors(error.response.data.errors ?? {})
      else setApiError(error.response?.data?.message ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Enter your contact details and secure your account before completing the DOLE NSRP profile."
      maxWidth="max-w-2xl"
      journey={{ role: 'seeker', steps: seekerRegistrationSteps, currentStep: 1 }}
    >
      <Link to="/register" className="registration-change-role"><ArrowLeft className="h-4 w-4" />Change account type</Link>
      <Card>
        <FormError message={apiError} />
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="first_name" placeholder="Juan" value={form.first_name ?? ''} onChange={change} onBlur={blur} error={fieldError('first_name')} />
            <Field label="Last name" name="last_name" placeholder="Dela Cruz" value={form.last_name ?? ''} onChange={change} onBlur={blur} error={fieldError('last_name')} />
          </div>
          <Field label="Email address" name="email" type="email" placeholder="you@example.com" value={form.email ?? ''} onChange={change} onBlur={blur} error={fieldError('email')} />
          <Field label="Mobile number" name="mobile_number" placeholder="09XXXXXXXXX" value={form.mobile_number ?? ''} onChange={change} onBlur={blur} error={fieldError('mobile_number')} />
          <div>
            <Field label="Password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Minimum 8 characters" value={form.password ?? ''} onChange={change} onBlur={blur} error={fieldError('password')} rightElement={<VisibilityButton shown={showPassword} onClick={() => setShowPassword((current) => !current)} />} />
            <PasswordStrengthMeter password={form.password} strength={strength} />
          </div>
          <Field label="Confirm password" name="password_confirmation" type={showConfirmation ? 'text' : 'password'} placeholder="Re-enter your password" value={form.password_confirmation ?? ''} onChange={change} onBlur={blur} error={fieldError('password_confirmation')} rightElement={<VisibilityButton shown={showConfirmation} onClick={() => setShowConfirmation((current) => !current)} />} />
          <Button type="submit" disabled={loading} icon={UserPlus} className="w-full">{loading ? 'Creating account...' : 'Create Job Seeker Account'}</Button>
        </form>
        <p className="registration-secondary-action">Already registered? <Link to="/login">Sign in</Link></p>
      </Card>
    </AuthShell>
  )
}

function VisibilityButton({ shown, onClick }) {
  return <button type="button" onClick={onClick} className="text-slate-400 hover:text-slate-700" aria-label={shown ? 'Hide password' : 'Show password'}>{shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
}
