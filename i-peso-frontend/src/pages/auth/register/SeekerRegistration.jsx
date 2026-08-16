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

const fields = ['first_name', 'last_name', 'email', 'mobile_number', 'password', 'password_confirmation']

const firstError = (error) => Array.isArray(error) ? error[0] : error

const normalizeServerErrors = (serverErrors = {}) => Object.fromEntries(
  Object.entries(serverErrors).map(([field, error]) => [field, firstError(error)])
)

const squish = (value) => String(value ?? '').trim().replace(/\s+/g, ' ')

const formatName = (value) => squish(value)
  .toLowerCase()
  .replace(/(^|[\s'-])([a-z])/g, (match, separator, letter) => `${separator}${letter.toUpperCase()}`)

const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase()

const normalizeMobileNumber = (value) => {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (digits.startsWith('639')) digits = `0${digits.slice(2)}`
  else if (digits.startsWith('9')) digits = `0${digits}`
  return digits.slice(0, 11)
}

const normalizeForm = (form) => ({
  ...form,
  first_name: formatName(form.first_name),
  last_name: formatName(form.last_name),
  email: normalizeEmail(form.email),
  mobile_number: normalizeMobileNumber(form.mobile_number),
})

const validate = (form) => {
  const errors = {}
  const clean = normalizeForm(form)
  const namePattern = /^[\p{L}\s.'-]+$/u

  if (!clean.first_name) errors.first_name = 'First name is required.'
  else if (clean.first_name.length < 2) errors.first_name = 'Enter at least 2 characters.'
  else if (!namePattern.test(clean.first_name)) errors.first_name = 'Use letters, spaces, hyphens, apostrophes, or periods only.'

  if (!clean.last_name) errors.last_name = 'Last name is required.'
  else if (clean.last_name.length < 2) errors.last_name = 'Enter at least 2 characters.'
  else if (!namePattern.test(clean.last_name)) errors.last_name = 'Use letters, spaces, hyphens, apostrophes, or periods only.'

  if (!clean.email) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean.email)) errors.email = 'Enter a valid email address.'

  if (!clean.mobile_number) errors.mobile_number = 'Mobile number is required.'
  else if (!/^09\d{9}$/.test(clean.mobile_number)) errors.mobile_number = 'Enter a valid PH mobile number.'

  if (!form.password) errors.password = 'Password is required.'
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  else if (!/\d/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) errors.password = 'Include at least one number and one symbol.'

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
    const { name } = event.target
    let { value } = event.target

    if (name === 'mobile_number') value = normalizeMobileNumber(value)
    if (name === 'email') value = value.replace(/\s/g, '').toLowerCase()

    setForm((current) => ({ ...current, [name]: value }))
    setApiError('')
    setErrors((current) => ({ ...current, [name]: undefined }))
  }, [])

  const blur = useCallback((event) => {
    const { name } = event.target
    setTouched((current) => ({ ...current, [name]: true }))
    setForm((current) => {
      if (name === 'first_name' || name === 'last_name') return { ...current, [name]: formatName(current[name]) }
      if (name === 'email') return { ...current, email: normalizeEmail(current.email) }
      if (name === 'mobile_number') return { ...current, mobile_number: normalizeMobileNumber(current.mobile_number) }
      return current
    })
  }, [])
  const fieldError = (name) => touched[name] ? firstError(errors[name]) : undefined

  const submit = async (event) => {
    event.preventDefault()
    setTouched(Object.fromEntries(fields.map((field) => [field, true])))
    const cleanForm = normalizeForm(form)
    setForm(cleanForm)
    const nextErrors = validate(cleanForm)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setLoading(true)
    setApiError('')
    try {
      const data = await authService.register({
        role: 'seeker',
        first_name: cleanForm.first_name,
        last_name: cleanForm.last_name,
        email: cleanForm.email,
        mobile_number: cleanForm.mobile_number,
        password: cleanForm.password,
        password_confirmation: cleanForm.password_confirmation,
      })
      localStorage.setItem('ipeso_pending_email', data.email)
      localStorage.setItem('ipeso_pending_role', 'seeker')
      navigate('/verify-email', { state: { email: data.email } })
    } catch (error) {
      if (error.response?.status === 422) {
        const serverErrors = normalizeServerErrors(error.response.data.errors ?? {})
        setErrors(serverErrors)
        setTouched((current) => ({
          ...current,
          ...Object.fromEntries(Object.keys(serverErrors).map((field) => [field, true])),
        }))
      }
      else if (error.response?.status && error.response.status < 500) {
        setApiError(error.response?.data?.message ?? 'Registration failed. Please try again.')
      } else {
        setApiError('Registration is temporarily unavailable. Please try again.')
      }
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
      <Card padding="sm">
        <FormError message={apiError} />
        <form onSubmit={submit} noValidate className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" name="first_name" placeholder="Juan" value={form.first_name ?? ''} onChange={change} onBlur={blur} error={fieldError('first_name')} autoComplete="given-name" maxLength={100} />
            <Field label="Last name" name="last_name" placeholder="Dela Cruz" value={form.last_name ?? ''} onChange={change} onBlur={blur} error={fieldError('last_name')} autoComplete="family-name" maxLength={100} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email address" name="email" type="email" placeholder="you@example.com" value={form.email ?? ''} onChange={change} onBlur={blur} error={fieldError('email')} autoComplete="email" inputMode="email" maxLength={255} />
            <Field label="Mobile number" name="mobile_number" type="tel" placeholder="09XXXXXXXXX" value={form.mobile_number ?? ''} onChange={change} onBlur={blur} error={fieldError('mobile_number')} autoComplete="tel-national" inputMode="numeric" maxLength={11} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Field label="Password" name="password" type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters with a number and symbol" value={form.password ?? ''} onChange={change} onBlur={blur} error={fieldError('password')} autoComplete="new-password" rightElement={<VisibilityButton shown={showPassword} onClick={() => setShowPassword((current) => !current)} />} />
              <PasswordStrengthMeter password={form.password} strength={strength} />
            </div>
            <Field label="Confirm password" name="password_confirmation" type={showConfirmation ? 'text' : 'password'} placeholder="Re-enter your password" value={form.password_confirmation ?? ''} onChange={change} onBlur={blur} error={fieldError('password_confirmation')} autoComplete="new-password" rightElement={<VisibilityButton shown={showConfirmation} onClick={() => setShowConfirmation((current) => !current)} />} />
          </div>
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
