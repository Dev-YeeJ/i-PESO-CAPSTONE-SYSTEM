import { useState } from 'react'
import { Eye, EyeOff, ShieldCheck, XCircle } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'

const validate = (email, password) => {
  const errors = {}
  if (!email) errors.email = 'Email is required.'
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Password is required.'
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.'
  return errors
}

// Generic on purpose — this screen and the citizen /login screen must never
// reveal to each other which account type an email belongs to.
const CREDENTIALS_ERROR = 'These credentials do not match our records.'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState({})

  const fieldError = (field) => touched[field] ? validate(email, password)[field] ?? errors[field] : ''

  const submit = async (event) => {
    event.preventDefault()
    setTouched({ email: true, password: true })
    const nextErrors = validate(email, password)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)
    setApiError('')
    setErrors({})
    try {
      const data = await authService.login(email, password)

      if (data.user.role !== 'administrator') {
        setApiError(CREDENTIALS_ERROR)
        return
      }

      useAuthStore.setState({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isInitialized: true,
      })
      localStorage.setItem('ipeso_token', data.token)
      await new Promise((resolve) => setTimeout(resolve, 50))
      const redirect = new URLSearchParams(location.search).get('redirect')
      navigate(redirect ?? '/admin/dashboard', { replace: true })
    } catch (error) {
      setApiError(error.response?.data?.message ?? CREDENTIALS_ERROR)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
              i-PESO &middot; Administrator Console
            </span>
          </div>
          <Link to="/" className="text-[11px] font-medium text-slate-600 hover:text-slate-400">
            Public site &rarr;
          </Link>
        </div>

        {apiError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-md border border-red-900/60 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-7">
          <ShieldCheck className="h-7 w-7 text-sky-500" strokeWidth={1.75} />
          <h1 className="mt-4 text-xl font-bold text-white">Administrator sign-in</h1>
          <p className="mt-1.5 text-sm leading-5 text-slate-400">
            Restricted to Urdaneta City PESO administrators and staff.
          </p>

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <ConsoleField
              label="Work email address"
              type="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setApiError('') }}
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              placeholder="you@urdanetacity.gov.ph"
              error={fieldError('email')}
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setApiError('') }}
                  onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                  placeholder="Enter your password"
                  className={`w-full rounded-md border bg-slate-950 px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-slate-600 transition focus:outline-none focus:ring-2 focus:ring-sky-500/40 ${fieldError('password') ? 'border-red-500' : 'border-slate-700 focus:border-sky-500'}`}
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldError('password') && <p className="mt-1.5 text-xs font-medium text-red-400">{fieldError('password')}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 border-t border-slate-800 pt-4 text-xs text-slate-500">
            Staff accounts are created by a PESO system administrator. Contact your office if you need access.
          </p>
        </div>
      </div>
    </div>
  )
}

function ConsoleField({ label, error, ...props }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
      {label}
      <input
        {...props}
        className={`mt-1.5 w-full rounded-md border bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 transition focus:outline-none focus:ring-2 focus:ring-sky-500/40 ${error ? 'border-red-500' : 'border-slate-700 focus:border-sky-500'}`}
      />
      {error && <span className="mt-1.5 block text-xs font-medium normal-case tracking-normal text-red-400">{error}</span>}
    </label>
  )
}
