import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EyeIcon from '@/components/form/EyeIcon'
import Field from '@/components/form/Field'
import FormError from '@/components/form/FormError'
import PasswordStrengthMeter from '@/components/form/PasswordStrengthMeter'
import { authService } from '@/services/authService'
import { getPasswordStrength } from '@/services/validationHelpers'

const COMPANY_TYPES = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'corporation_partnership', label: 'Corporation / Partnership' },
  { value: 'local_recruitment_agency', label: 'Local Recruitment Agency' },
  { value: 'overseas_recruitment_agency', label: 'Overseas Recruitment Agency' },
]

const FIELDS = ['email', 'password', 'password_confirmation', 'company_type']

const validate = (form) => {
  const errors = {}

  if (!form.email?.trim()) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!form.password) errors.password = 'Password is required.'
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  if (!form.password_confirmation) {
    errors.password_confirmation = 'Please confirm your password.'
  } else if (form.password !== form.password_confirmation) {
    errors.password_confirmation = 'Passwords do not match.'
  }
  if (!form.company_type) errors.company_type = 'Please select a company type.'

  return errors
}

export default function EmployerRegistration() {
  const navigate = useNavigate()
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const strength = getPasswordStrength(form.password ?? '')

  const handleChange = useCallback((event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setApiError('')
  }, [])

  const handleBlur = useCallback((event) => {
    setTouched((current) => ({ ...current, [event.target.name]: true }))
  }, [])

  const fieldError = (name) => (touched[name] ? errors[name] : undefined)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setTouched(Object.fromEntries(FIELDS.map((field) => [field, true])))

    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setIsLoading(true)
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
      if (error.response?.status === 422) {
        setErrors(error.response.data.errors ?? {})
      } else {
        setApiError(error.response?.data?.message ?? 'Registration failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">
        <Link
          to="/register"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-blue-600"
        >
          &larr; Back to selection
        </Link>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1 bg-slate-100">
            <div className="h-full w-1/5 bg-blue-700" />
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-7">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-700">Step 1 of 5</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account Setup</h1>
              <p className="mt-1 text-sm text-slate-500">Create the employer login and select the legal company type.</p>
            </div>

            <FormError message={apiError} />

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Field
                label="Email Address"
                name="email"
                type="email"
                placeholder="company@example.com"
                value={form.email ?? ''}
                onChange={handleChange}
                onBlur={handleBlur}
                error={fieldError('email')}
              />

              <div>
                <Field
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={form.password ?? ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={fieldError('password')}
                  rightElement={(
                    <button type="button" onClick={() => setShowPassword((shown) => !shown)} className="text-slate-400 hover:text-slate-600">
                      <EyeIcon open={showPassword} />
                    </button>
                  )}
                />
                <PasswordStrengthMeter password={form.password} strength={strength} />
              </div>

              <Field
                label="Confirm Password"
                name="password_confirmation"
                type={showConfirmation ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={form.password_confirmation ?? ''}
                onChange={handleChange}
                onBlur={handleBlur}
                error={fieldError('password_confirmation')}
                rightElement={(
                  <button type="button" onClick={() => setShowConfirmation((shown) => !shown)} className="text-slate-400 hover:text-slate-600">
                    <EyeIcon open={showConfirmation} />
                  </button>
                )}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Company Type</label>
                <div className="space-y-2">
                  {COMPANY_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                        form.company_type === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="company_type"
                        value={type.value}
                        checked={form.company_type === type.value}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="h-4 w-4 accent-blue-700"
                      />
                      <span className="text-sm font-medium text-slate-700">{type.label}</span>
                    </label>
                  ))}
                </div>
                {fieldError('company_type') && <p className="mt-1.5 text-xs text-red-600">{fieldError('company_type')}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center rounded-xl bg-blue-700 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {isLoading ? 'Creating account...' : 'Continue to Email Verification'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
