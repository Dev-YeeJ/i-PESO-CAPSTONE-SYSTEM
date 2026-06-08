// src/pages/employer/steps/Step1AccountSetup.jsx
import { useState, useCallback } from 'react'
import Field from '@/components/form/Field'
import EyeIcon from '@/components/form/EyeIcon'
import PasswordStrengthMeter from '@/components/form/PasswordStrengthMeter'
import FormError from '@/components/form/FormError'
import apiClient from '@/services/api'
import { validateEmployerStep1, getPasswordStrength } from '@/services/validationHelpers'

// 👇 EXACT FIX: These values now perfectly match your Laravel Database Enums!
const COMPANY_TYPES = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'corporation_partnership', label: 'Corporation / Partnership' },
  { value: 'local_recruitment_agency', label: 'Local Recruitment Agency' },
  { value: 'overseas_recruitment_agency', label: 'Overseas Recruitment Agency' },
]

export default function Step1AccountSetup({ onComplete }) {
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  const strength = getPasswordStrength(form.password ?? '')

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setApiError('')
    setErrors((err) => ({ ...err, [name]: undefined }))
  }, [])

  const handleBlur = useCallback((e) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }))
  }, [])

  const getError = (name) => (touched[name] ? errors[name] : undefined)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const allFields = ['email', 'password', 'password_confirmation', 'company_type']
    setTouched(Object.fromEntries(allFields.map((f) => [f, true])))

    const errs = validateEmployerStep1(form)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setIsLoading(true)
    setApiError('')

    try {
      const payload = {
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        company_type: form.company_type,
      }

      const res = await apiClient.post('/employer/register/step-1', payload)
      const { employer_id } = res.data

      // Send data in new format for OTP flow
      onComplete({
        email: form.email,
        company_type: form.company_type,
        employerId: employer_id,
      })
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {})
      } else {
        setApiError(err.response?.data?.message ?? 'Registration failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormError message={apiError} />

      <Field
        label="Email Address"
        name="email"
        type="email"
        placeholder="company@example.com"
        value={form.email ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        error={getError('email')}
      />

      <div>
        <Field
          label="Password"
          name="password"
          type={showPw ? 'text' : 'password'}
          placeholder="Minimum 8 characters"
          value={form.password ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          error={getError('password')}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              <EyeIcon open={showPw} />
            </button>
          }
        />
        <PasswordStrengthMeter password={form.password} strength={strength} />
      </div>

      <Field
        label="Confirm Password"
        name="password_confirmation"
        type={showConfirmPw ? 'text' : 'password'}
        placeholder="Re-enter your password"
        value={form.password_confirmation ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        error={getError('password_confirmation')}
        rightElement={
          <button
            type="button"
            onClick={() => setShowConfirmPw(!showConfirmPw)}
            className="text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            <EyeIcon open={showConfirmPw} />
          </button>
        }
      />

      {/* Company Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Company Type
        </label>
        <div className="space-y-2">
          {COMPANY_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex items-center space-x-3 cursor-pointer p-3 border border-slate-300 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <input
                type="radio"
                name="company_type"
                value={type.value}
                checked={form.company_type === type.value}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <span className="text-sm text-slate-700">{type.label}</span>
            </label>
          ))}
        </div>
        {getError('company_type') && (
          <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <svg
              className="w-3 h-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {getError('company_type')}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 mt-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {isLoading ? 'Processing...' : 'Continue to Step 2'}
      </button>
    </form>
  )
}