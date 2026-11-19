import { useState } from 'react'
import { Eye, EyeOff, KeyRound, LifeBuoy, LogIn, XCircle } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '@/components/auth/AuthShell'
import Button from '@/components/ui/Button'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { adminLandingPath } from '@/utils/adminAccess'

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
      if (data.user.must_change_password) {
        navigate('/admin/set-password', { replace: true })
        return
      }
      // ?redirect= may be left over from someone else's session — only follow it when this
      // account can open that page; otherwise land on their home (the dashboard).
      const redirect = new URLSearchParams(location.search).get('redirect')
      navigate(adminLandingPath(data.user, redirect), { replace: true })
    } catch (error) {
      setApiError(error.response?.data?.message ?? CREDENTIALS_ERROR)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      variant="staff"
      title="Staff sign in"
      subtitle="Use the work email your PESO Office Manager registered for you."
      sideTitle="PESO staff workspace"
      sideText="For PESO Urdaneta City personnel and OJT interns. Job seekers and employers sign in on the public site."
    >
      {apiError && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <ConsoleField
          label="Work email address"
          type="email"
          value={email}
          onChange={(event) => { setEmail(event.target.value); setApiError('') }}
          onBlur={() => setTouched((current) => ({ ...current, email: true }))}
          placeholder="you@urdanetacity.gov.ph"
          autoComplete="username"
          error={fieldError('email')}
        />
        <div>
          <label htmlFor="admin-password" className="portal-label">Password</label>
          <div className="relative">
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => { setPassword(event.target.value); setApiError('') }}
              onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              placeholder="Enter your password"
              autoComplete="current-password"
              className={`portal-input pr-11 ${fieldError('password') ? 'border-red-400' : ''}`}
            />
            <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldError('password') && <p className="mt-1.5 text-xs font-medium text-red-700">{fieldError('password')}</p>}
        </div>
        <Button type="submit" loading={loading} icon={LogIn} className="w-full">{loading ? 'Signing in…' : 'Sign in to workspace'}</Button>
      </form>

      <div className="mt-6 space-y-3 text-sm text-slate-600">
        <p className="flex gap-2"><KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy" aria-hidden="true" />First time? Sign in with the temporary password from your email. You&apos;ll choose your own next.</p>
        <p className="flex gap-2"><LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy" aria-hidden="true" />No account or locked out? Staff accounts are managed by the PESO Office Manager.</p>
      </div>
    </AuthShell>
  )
}

function ConsoleField({ label, error, ...props }) {
  return (
    <label className="portal-label">
      {label}
      <input {...props} className={`portal-input ${error ? 'border-red-400' : ''}`} />
      {error && <span className="mt-1.5 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  )
}
