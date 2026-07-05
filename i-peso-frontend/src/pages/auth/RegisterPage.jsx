import { useState, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { authService } from '@/services/authService'
import IPesoLogo from '@/components/branding/IPesoLogo'

const EDUC_OPTIONS = [
  'Elementary Graduate', 'High School Graduate', 'Senior High School Graduate',
  'Vocational / Technical', 'College Undergraduate', 'College Graduate',
  "Master's Degree", 'Doctorate',
]

const INDUSTRY_OPTIONS = [
  'Agriculture', 'Construction', 'Education', 'Finance & Banking',
  'Food & Beverage', 'Healthcare', 'Information Technology',
  'Manufacturing', 'Retail & Commerce', 'Transportation', 'Tourism & Hospitality', 'Other',
]

// ── Password Strength ────────────────────────────────────────
const getPasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)           score++
  if (pw.length >= 12)          score++
  if (/[A-Z]/.test(pw))         score++
  if (/[0-9]/.test(pw))         score++
  if (/[^A-Za-z0-9]/.test(pw))  score++
  if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-400' }
  if (score <= 3) return { score, label: 'Fair',   color: 'bg-amber-400' }
  if (score === 4) return { score, label: 'Good',  color: 'bg-blue-500' }
  return { score, label: 'Strong', color: 'bg-green-500' }
}

// ── Validation ───────────────────────────────────────────────
const validateSeeker = (f) => {
  const e = {}
  if (!f.first_name?.trim())          e.first_name      = 'First name is required.'
  if (!f.last_name?.trim())           e.last_name       = 'Last name is required.'
  if (!f.educ_attainment)             e.educ_attainment = 'Please select your educational attainment.'
  if (!f.email?.trim())               e.email           = 'Email is required.'
  else if (!/\S+@\S+\.\S+/.test(f.email)) e.email       = 'Enter a valid email address.'
  if (!f.mobile_number?.trim())       e.mobile_number   = 'Mobile number is required.'
  else if (!/^09\d{9}$/.test(f.mobile_number.replace(/[-\s]/g, '')))
                                      e.mobile_number   = 'Enter a valid PH mobile number (09XXXXXXXXX).'
  if (!f.complete_address?.trim())    e.complete_address = 'Complete address is required.'
  if (!f.password)                    e.password        = 'Password is required.'
  else if (f.password.length < 8)     e.password        = 'Password must be at least 8 characters.'
  if (!f.password_confirmation)       e.password_confirmation = 'Please confirm your password.'
  else if (f.password !== f.password_confirmation)
                                      e.password_confirmation = 'Passwords do not match.'
  return e
}

const validateEmployer = (f) => {
  const e = {}
  if (!f.company_name?.trim())            e.company_name        = 'Company name is required.'
  if (!f.representative_name?.trim())     e.representative_name = 'Representative name is required.'
  if (!f.industry_type)                   e.industry_type       = 'Please select an industry.'
  if (!f.email?.trim())                   e.email               = 'Email is required.'
  else if (!/\S+@\S+\.\S+/.test(f.email)) e.email              = 'Enter a valid email address.'
  if (!f.mobile_number?.trim())           e.mobile_number       = 'Mobile number is required.'
  if (!f.complete_address?.trim())        e.complete_address    = 'Complete address is required.'
  if (!f.password)                        e.password            = 'Password is required.'
  else if (f.password.length < 8)         e.password            = 'Password must be at least 8 characters.'
  if (!f.password_confirmation)           e.password_confirmation = 'Please confirm your password.'
  else if (f.password !== f.password_confirmation)
                                          e.password_confirmation = 'Passwords do not match.'
  return e
}

// ── Eye Icon ─────────────────────────────────────────────────
const EyeIcon = ({ open }) => open ? (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
) : (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
)

// ── Field Component (OUTSIDE RegisterPage) ───────────────────
const Field = ({ label, name, type = 'text', placeholder, value, onChange, onBlur, error, rightElement }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
    <div className="relative">
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          rightElement ? 'pr-11' : ''
        } ${
          error ? 'border-red-400 focus:border-red-400' : 'border-slate-300 focus:border-blue-400'
        }`}
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
    {error && (
      <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </p>
    )}
  </div>
)

const RegisterPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [role, setRole]         = useState(location.state?.preselectedRole ?? 'seeker')
  const [form, setForm]         = useState({})
  const [errors, setErrors]     = useState({})
  const [touched, setTouched]   = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  const strength = getPasswordStrength(form.password ?? '')

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setApiError('')
    // Live-clear field error once user starts correcting
    setErrors((err) => ({ ...err, [name]: undefined }))
  }, [])

  const handleBlur = useCallback((e) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }))
  }, [])

  const handleRoleSwitch = (newRole) => {
    setRole(newRole)
    setForm({})
    setErrors({})
    setTouched({})
    setApiError('')
  }

  const getError = (name) => touched[name] ? errors[name] : undefined

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Mark all fields touched to show all errors
    const allFields = role === 'seeker'
      ? ['first_name','last_name','educ_attainment','email','mobile_number','complete_address','password','password_confirmation']
      : ['company_name','representative_name','industry_type','email','mobile_number','complete_address','password','password_confirmation']

    setTouched(Object.fromEntries(allFields.map((f) => [f, true])))

    const errs = role === 'seeker' ? validateSeeker(form) : validateEmployer(form)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setIsLoading(true)
    setApiError('')

    try {
      const data = await authService.register({ ...form, role })
      localStorage.setItem('ipeso_pending_email', data.email)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white flex items-center justify-center p-4 py-10">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-100 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-blue-200"><IPesoLogo className="h-full w-full" /></div>
            <div className="text-left">
              <p className="text-base font-bold text-blue-900 leading-none">i-PESO</p>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5 uppercase tracking-wide">Urdaneta City</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Public Employment Service Office — Urdaneta City</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-100 p-8">

          {/* Role Toggle */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
            {[
              { value: 'seeker',   label: 'Job Seeker',
                icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
              },
              { value: 'employer', label: 'Employer',
                icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              },
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleRoleSwitch(value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  role === value
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {/* API Error */}
          {apiError && (
            <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* ── SEEKER FIELDS ── */}
            {role === 'seeker' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name" name="first_name" placeholder="Juan"
                    value={form.first_name ?? ''} onChange={handleChange} onBlur={handleBlur}
                    error={getError('first_name')} />
                  <Field label="Last Name" name="last_name" placeholder="dela Cruz"
                    value={form.last_name ?? ''} onChange={handleChange} onBlur={handleBlur}
                    error={getError('last_name')} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Educational Attainment</label>
                  <select name="educ_attainment" value={form.educ_attainment ?? ''}
                    onChange={handleChange} onBlur={handleBlur}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      getError('educ_attainment') ? 'border-red-400' : 'border-slate-300 focus:border-blue-400'
                    }`}>
                    <option value="">Select highest attainment</option>
                    {EDUC_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {getError('educ_attainment') && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {getError('educ_attainment')}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── EMPLOYER FIELDS ── */}
            {role === 'employer' && (
              <>
                <Field label="Company Name" name="company_name" placeholder="ACME Corporation"
                  value={form.company_name ?? ''} onChange={handleChange} onBlur={handleBlur}
                  error={getError('company_name')} />
                <Field label="Representative Name" name="representative_name" placeholder="Full name of HR/contact person"
                  value={form.representative_name ?? ''} onChange={handleChange} onBlur={handleBlur}
                  error={getError('representative_name')} />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Industry Type</label>
                  <select name="industry_type" value={form.industry_type ?? ''}
                    onChange={handleChange} onBlur={handleBlur}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      getError('industry_type') ? 'border-red-400' : 'border-slate-300 focus:border-blue-400'
                    }`}>
                    <option value="">Select industry</option>
                    {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {getError('industry_type') && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {getError('industry_type')}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── SHARED FIELDS ── */}
            <Field label="Email Address" name="email" type="email" placeholder="you@example.com"
              value={form.email ?? ''} onChange={handleChange} onBlur={handleBlur}
              error={getError('email')} />

            <Field label="Mobile Number" name="mobile_number" placeholder="09XXXXXXXXX"
              value={form.mobile_number ?? ''} onChange={handleChange} onBlur={handleBlur}
              error={getError('mobile_number')} />

            <Field label="Complete Address" name="complete_address" placeholder="Barangay, City, Province"
              value={form.complete_address ?? ''} onChange={handleChange} onBlur={handleBlur}
              error={getError('complete_address')} />

            {/* Password with strength meter */}
            <div>
              <Field label="Password" name="password" type={showPw ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                value={form.password ?? ''} onChange={handleChange} onBlur={handleBlur}
                error={getError('password')}
                rightElement={
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
                    <EyeIcon open={showPw} />
                  </button>
                }
              />
              {/* Password strength bar */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i <= strength.score ? strength.color : 'bg-slate-200'
                      }`} />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    strength.score <= 1 ? 'text-red-500' :
                    strength.score <= 3 ? 'text-amber-500' :
                    strength.score === 4 ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    {strength.label} password
                    {strength.score < 3 && ' — add uppercase, numbers, or symbols'}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <Field label="Confirm Password" name="password_confirmation"
              type={showConfirmPw ? 'text' : 'password'}
              placeholder="Re-enter your password"
              value={form.password_confirmation ?? ''} onChange={handleChange} onBlur={handleBlur}
              error={getError('password_confirmation')}
              rightElement={
                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
                  <EyeIcon open={showConfirmPw} />
                </button>
              }
            />

            {/* Password match checkmark */}
            {form.password && form.password_confirmation && form.password === form.password_confirmation && (
              <div className="flex items-center gap-1.5 -mt-1">
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <p className="text-xs text-green-600 font-medium">Passwords match</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-2 bg-blue-700 hover:bg-blue-800 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-blue-200"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
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
    </div>
  )
}

export default RegisterPage
