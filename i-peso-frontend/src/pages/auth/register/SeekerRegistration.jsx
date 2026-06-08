import { useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '@/services/authService'

const EDUC_OPTIONS = [
  'Elementary Graduate',
  'High School Graduate',
  'Senior High School Graduate',
  'Vocational / Technical',
  'College Undergraduate',
  'College Graduate',
  "Master's Degree",
  'Doctorate',
]

const getPasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-400' }
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-400' }
  if (score === 4) return { score, label: 'Good', color: 'bg-blue-500' }
  return { score, label: 'Strong', color: 'bg-green-500' }
}

const validateSeeker = (f) => {
  const e = {}
  if (!f.first_name?.trim()) e.first_name = 'First name is required.'
  if (!f.last_name?.trim()) e.last_name = 'Last name is required.'
  if (!f.educ_attainment) e.educ_attainment = 'Please select your educational attainment.'
  if (!f.email?.trim()) e.email = 'Email is required.'
  else if (!/\S+@\S+\.\S+/.test(f.email)) e.email = 'Enter a valid email address.'
  if (!f.mobile_number?.trim()) e.mobile_number = 'Mobile number is required.'
  else if (!/^09\d{9}$/.test(f.mobile_number.replace(/[-\s]/g, ''))) e.mobile_number = 'Enter a valid PH mobile number (09XXXXXXXXX).'
  if (!f.password) e.password = 'Password is required.'
  else if (f.password.length < 8) e.password = 'Password must be at least 8 characters.'
  if (!f.password_confirmation) e.password_confirmation = 'Please confirm your password.'
  else if (f.password !== f.password_confirmation) e.password_confirmation = 'Passwords do not match.'
  return e
}

const EyeIcon = ({ open }) => open ? (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
) : (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
)

const Field = ({ label, name, type = 'text', placeholder, value, onChange, onBlur, error, rightElement }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <div className="relative">
      <input type={type} name={name} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${rightElement ? 'pr-11' : ''} ${error ? 'border-red-400 focus:border-red-400' : 'border-slate-300 focus:border-blue-400'}`} />
      {rightElement && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>}
    </div>
    {error && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{error}</p>}
  </div>
)

const SeekerRegistration = () => {
  const navigate = useNavigate()
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

  const handleBlur = useCallback((e) => setTouched((t) => ({ ...t, [e.target.name]: true })), [])
  const getError = (name) => touched[name] ? errors[name] : undefined

  const handleSubmit = async (e) => {
    e.preventDefault()
    const allFields = ['first_name', 'last_name', 'educ_attainment', 'email', 'mobile_number', 'password', 'password_confirmation']
    setTouched(Object.fromEntries(allFields.map((f) => [f, true])))

    const errs = validateSeeker(form)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setIsLoading(true)
    setApiError('')

    try {
      const payload = {
        role: 'seeker',
        first_name: form.first_name,
        last_name: form.last_name,
        educ_attainment: form.educ_attainment,
        email: form.email,
        mobile_number: form.mobile_number,
        password: form.password,
        password_confirmation: form.password_confirmation,
      }
      console.log('Register Payload:', payload)
      const data = await authService.register(payload)
      localStorage.setItem('ipeso_pending_email', data.email)
      localStorage.setItem('ipeso_pending_role', 'seeker')
      navigate('/verify-email', { state: { email: data.email } })
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg relative bg-white border border-slate-200 rounded-2xl shadow-sm p-8">

        <Link to="/register" className="text-sm font-medium text-slate-500 hover:text-blue-600 mb-6 inline-flex items-center gap-1">
          ← Back to selection
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">Job Seeker Registration</h1>

        {apiError && (
          <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" name="first_name" placeholder="Juan" value={form.first_name ?? ''} onChange={handleChange} onBlur={handleBlur} error={getError('first_name')} />
            <Field label="Last Name" name="last_name" placeholder="dela Cruz" value={form.last_name ?? ''} onChange={handleChange} onBlur={handleBlur} error={getError('last_name')} />
          </div>

          {/* Educational Attainment */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Educational Attainment</label>
            <select
              name="educ_attainment"
              value={form.educ_attainment ?? ''}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                getError('educ_attainment') ? 'border-red-400 focus:border-red-400' : 'border-slate-300 focus:border-blue-400'
              }`}
            >
              <option value="">Select highest attainment</option>
              {EDUC_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            {getError('educ_attainment') && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {getError('educ_attainment')}
              </p>
            )}
          </div>

          {/* Email & Mobile */}
          <Field label="Email Address" name="email" type="email" placeholder="you@example.com" value={form.email ?? ''} onChange={handleChange} onBlur={handleBlur} error={getError('email')} />
          <Field label="Mobile Number" name="mobile_number" placeholder="09XXXXXXXXX" value={form.mobile_number ?? ''} onChange={handleChange} onBlur={handleBlur} error={getError('mobile_number')} />

          {/* Password */}
          <div>
            <Field label="Password" name="password" type={showPw ? 'text' : 'password'} placeholder="Minimum 8 characters" value={form.password ?? ''} onChange={handleChange} onBlur={handleBlur} error={getError('password')} rightElement={<button type="button" onClick={() => setShowPw(!showPw)} className="text-slate-400 hover:text-slate-600" tabIndex={-1}><EyeIcon open={showPw} /></button>} />
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-slate-200'}`} />)}
                </div>
                <p className="text-xs font-medium text-slate-500">{strength.label} password</p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <Field label="Confirm Password" name="password_confirmation" type={showConfirmPw ? 'text' : 'password'} placeholder="Re-enter your password" value={form.password_confirmation ?? ''} onChange={handleChange} onBlur={handleBlur} error={getError('password_confirmation')} rightElement={<button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="text-slate-400 hover:text-slate-600" tabIndex={-1}><EyeIcon open={showConfirmPw} /></button>} />

          {/* Passwords match indicator */}
          {form.password && form.password_confirmation && form.password === form.password_confirmation && (
            <div className="flex items-center gap-1.5 -mt-1">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <p className="text-xs text-green-600 font-medium">Passwords match</p>
            </div>
          )}

          <button type="submit" disabled={isLoading} className="w-full py-3 mt-2 bg-blue-700 hover:bg-blue-800 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-200">
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Sending verification email…
              </>
            ) : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-700 hover:text-blue-800 hover:underline transition-colors">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

export default SeekerRegistration
