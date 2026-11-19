import { useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '@/components/auth/AuthShell'
import { AlertBox, Button } from '@/components/ui'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'

const roleRoutes = {
  seeker: '/seeker/dashboard',
  employer: '/employer/dashboard',
}

// Generic on purpose — this screen and the /administrator screen must never
// reveal to each other which account type an email belongs to.
const CREDENTIALS_ERROR = 'These credentials do not match our records.'

const validate = (email, password) => {
  const errors = {}
  if (!email) errors.email = 'Email is required.'
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Password is required.'
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.'
  return errors
}

export default function LoginPage() {
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

      if (data.user.role === 'administrator') {
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
      navigate(redirect ?? roleRoutes[data.user.role] ?? '/', { replace: true })
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.email_unverified) {
        const pendingEmail = error.response.data.email
        localStorage.setItem('ipeso_pending_email', pendingEmail)
        navigate('/verify-email', { state: { email: pendingEmail } })
        return
      }
      setApiError(error.response?.data?.message ?? 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Job seekers and employers use the same sign-in."
      sideTitle="Your next job starts at the PESO office, even online."
    >
      {apiError && <AlertBox variant="danger" title="That didn't work" className="mb-5">{apiError}</AlertBox>}
      <>
        <form onSubmit={submit} noValidate className="space-y-5">
          <AuthField
            label="Email address"
            type="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setApiError('') }}
            onBlur={() => setTouched((current) => ({ ...current, email: true }))}
            placeholder="you@example.com"
            error={fieldError('email')}
          />
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-800">Password</label>
              <Link to="/forgot-password" className="text-sm font-semibold text-brand-navy hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => { setPassword(event.target.value); setApiError('') }}
                onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                placeholder="Enter your password"
                className={`portal-input mt-0 pr-11 ${fieldError('password') ? 'border-red-400' : ''}`}
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldError('password') && <p className="mt-1.5 text-xs font-medium text-red-600">{fieldError('password')}</p>}
          </div>
          <Button type="submit" disabled={loading} icon={LogIn} className="w-full">{loading ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-brand-canvas p-5">
          <p className="text-sm font-semibold text-slate-900">New to i-PESO?</p>
          <p className="mt-1 text-sm text-slate-600">Registration is free for job seekers and employers.</p>
          <Button to="/register" variant="secondary" size="sm" className="mt-3">Create an account</Button>
        </div>
      </>
    </AuthShell>
  )
}

function AuthField({ label, error, ...props }) {
  return <label className="portal-label">{label}<input {...props} className={`portal-input ${error ? 'border-red-400' : ''}`} />{error && <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>}</label>
}
