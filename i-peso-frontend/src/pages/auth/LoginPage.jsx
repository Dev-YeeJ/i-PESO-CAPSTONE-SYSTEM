// src/pages/auth/LoginPage.jsx
import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import AppInput from '@/components/common/AppInput'
import AppButton from '@/components/common/AppButton'
import AppAlert from '@/components/common/AppAlert'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(er => ({ ...er, [e.target.name]: '' }))
    setApiError('')
  }

  const validate = () => {
    const errs = {}
    if (!form.email) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address'
    if (!form.password) errs.password = 'Password is required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const { user, token } = await authService.login(form.email, form.password)
      setAuth(user, token)

      // Redirect to intended page or role dashboard
      const redirect = searchParams.get('redirect')
      if (redirect) {
        navigate(redirect, { replace: true })
      } else {
        navigate(`/${user.role}/dashboard`, { replace: true })
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials. Please try again.'
      setApiError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f9fb 0%, #e8f0fc 100%)',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Card */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
          padding: '40px 40px',
        }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
              background: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff',
            }}>iP</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>
              Sign in to your i-PESO account
            </p>
          </div>

          {apiError && (
            <div style={{ marginBottom: 20 }}>
              <AppAlert variant="error" onDismiss={() => setApiError('')}>{apiError}</AppAlert>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AppInput
              id="email"
              name="email"
              label="Email address"
              type="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <AppInput
              id="password"
              name="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6 }}>
              <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
                Forgot password?
              </Link>
            </div>

            <AppButton type="submit" loading={loading} style={{ width: '100%', marginTop: 4 }}>
              Sign in
            </AppButton>
          </form>

          <div style={{
            marginTop: 24, paddingTop: 24,
            borderTop: '1px solid var(--color-border)',
            textAlign: 'center', fontSize: 14, color: 'var(--color-text-2)',
          }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Register here
            </Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--color-text-3)' }}>
          <Link to="/" style={{ color: 'var(--color-text-3)', textDecoration: 'none' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  )
}