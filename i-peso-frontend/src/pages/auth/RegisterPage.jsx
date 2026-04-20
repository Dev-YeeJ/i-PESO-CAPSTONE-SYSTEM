// src/pages/auth/RegisterPage.jsx
import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import AppInput from '@/components/common/AppInput'
import AppButton from '@/components/common/AppButton'
import AppAlert from '@/components/common/AppAlert'

const EDUC_OPTIONS = [
  'Elementary Graduate', 'High School Graduate', 'Vocational / Technical',
  'College Level', "Bachelor's Degree", "Master's Degree", 'Doctorate',
]

const INDUSTRY_OPTIONS = [
  'Agriculture', 'Construction', 'Education', 'Finance & Banking',
  'Healthcare', 'Hospitality & Tourism', 'Information Technology',
  'Manufacturing', 'Retail & Commerce', 'Transportation', 'Other',
]

function SeekerForm({ onSuccess }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', mobile_number: '',
    complete_address: '', educ_attainment: '', password: '', password_confirmation: '',
  })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)

  const set = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(er => ({ ...er, [e.target.name]: '' }))
    setApiError('')
  }

  const validate = () => {
    const errs = {}
    if (!form.first_name.trim()) errs.first_name = 'Required'
    if (!form.last_name.trim())  errs.last_name  = 'Required'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required'
    if (!form.mobile_number.trim()) errs.mobile_number = 'Required'
    if (!form.complete_address.trim()) errs.complete_address = 'Required'
    if (!form.educ_attainment) errs.educ_attainment = 'Required'
    if (!form.password || form.password.length < 8) errs.password = 'At least 8 characters'
    if (form.password !== form.password_confirmation) errs.password_confirmation = 'Passwords do not match'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const { user, token } = await authService.registerSeeker(form)
      setAuth(user, token)
      onSuccess()
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) {
        // Laravel validation errors
        const mapped = {}
        Object.entries(data.errors).forEach(([k, v]) => { mapped[k] = v[0] })
        setErrors(mapped)
      } else {
        setApiError(data?.message || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {apiError && <AppAlert variant="error" onDismiss={() => setApiError('')}>{apiError}</AppAlert>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <AppInput id="first_name" name="first_name" label="First name" value={form.first_name} onChange={set} error={errors.first_name} required />
        <AppInput id="last_name"  name="last_name"  label="Last name"  value={form.last_name}  onChange={set} error={errors.last_name}  required />
      </div>
      <AppInput id="email"        name="email"        label="Email address"  type="email"  value={form.email}        onChange={set} error={errors.email}        required />
      <AppInput id="mobile_number" name="mobile_number" label="Mobile number" type="tel" value={form.mobile_number} onChange={set} error={errors.mobile_number} required placeholder="09XX XXX XXXX" />
      <AppInput id="complete_address" name="complete_address" label="Complete address" value={form.complete_address} onChange={set} error={errors.complete_address} required />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="educ_attainment" style={{ fontSize: 14, fontWeight: 500 }}>
          Educational attainment <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <select
          id="educ_attainment" name="educ_attainment"
          value={form.educ_attainment} onChange={set}
          style={{
            padding: '10px 14px', fontSize: 15, fontFamily: 'var(--font-body)',
            border: `1px solid ${errors.educ_attainment ? 'var(--color-error)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)', background: 'var(--color-surface)',
            color: form.educ_attainment ? 'var(--color-text)' : 'var(--color-text-3)',
            outline: 'none',
          }}
        >
          <option value="">Select attainment…</option>
          {EDUC_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {errors.educ_attainment && <span style={{ fontSize: 13, color: 'var(--color-error)' }}>⚠ {errors.educ_attainment}</span>}
      </div>

      <AppInput id="password"              name="password"              label="Password"         type="password" value={form.password}              onChange={set} error={errors.password}              required hint="Minimum 8 characters" />
      <AppInput id="password_confirmation" name="password_confirmation" label="Confirm password" type="password" value={form.password_confirmation} onChange={set} error={errors.password_confirmation} required />

      <AppButton type="submit" loading={loading} style={{ width: '100%', marginTop: 4 }}>
        Create Seeker Account
      </AppButton>
    </form>
  )
}

function EmployerForm({ onSuccess }) {
  const [form, setForm] = useState({
    company_name: '', representative_name: '', email: '', mobile_number: '',
    complete_address: '', industry_type: '', password: '', password_confirmation: '',
  })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)

  const set = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(er => ({ ...er, [e.target.name]: '' }))
    setApiError('')
  }

  const validate = () => {
    const errs = {}
    if (!form.company_name.trim())       errs.company_name       = 'Required'
    if (!form.representative_name.trim()) errs.representative_name = 'Required'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required'
    if (!form.mobile_number.trim())      errs.mobile_number      = 'Required'
    if (!form.complete_address.trim())   errs.complete_address   = 'Required'
    if (!form.industry_type)             errs.industry_type      = 'Required'
    if (!form.password || form.password.length < 8) errs.password = 'At least 8 characters'
    if (form.password !== form.password_confirmation) errs.password_confirmation = 'Passwords do not match'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const { user, token } = await authService.registerEmployer(form)
      setAuth(user, token)
      onSuccess()
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) {
        const mapped = {}
        Object.entries(data.errors).forEach(([k, v]) => { mapped[k] = v[0] })
        setErrors(mapped)
      } else {
        setApiError(data?.message || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {apiError && <AppAlert variant="error" onDismiss={() => setApiError('')}>{apiError}</AppAlert>}

      <AppInput id="company_name"       name="company_name"       label="Company name"          value={form.company_name}       onChange={set} error={errors.company_name}       required />
      <AppInput id="representative_name" name="representative_name" label="Representative name"  value={form.representative_name} onChange={set} error={errors.representative_name} required />
      <AppInput id="email"              name="email"              label="Company email"  type="email" value={form.email}        onChange={set} error={errors.email}              required />
      <AppInput id="mobile_number"      name="mobile_number"      label="Mobile number"  type="tel"   value={form.mobile_number}   onChange={set} error={errors.mobile_number}      required placeholder="09XX XXX XXXX" />
      <AppInput id="complete_address"   name="complete_address"   label="Business address"       value={form.complete_address}   onChange={set} error={errors.complete_address}   required />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="industry_type" style={{ fontSize: 14, fontWeight: 500 }}>
          Industry type <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <select
          id="industry_type" name="industry_type"
          value={form.industry_type} onChange={set}
          style={{
            padding: '10px 14px', fontSize: 15, fontFamily: 'var(--font-body)',
            border: `1px solid ${errors.industry_type ? 'var(--color-error)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)', background: 'var(--color-surface)',
            color: form.industry_type ? 'var(--color-text)' : 'var(--color-text-3)',
            outline: 'none',
          }}
        >
          <option value="">Select industry…</option>
          {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {errors.industry_type && <span style={{ fontSize: 13, color: 'var(--color-error)' }}>⚠ {errors.industry_type}</span>}
      </div>

      <AppInput id="password"              name="password"              label="Password"         type="password" value={form.password}              onChange={set} error={errors.password}              required hint="Minimum 8 characters" />
      <AppInput id="password_confirmation" name="password_confirmation" label="Confirm password" type="password" value={form.password_confirmation} onChange={set} error={errors.password_confirmation} required />

      <AppButton type="submit" loading={loading} style={{ width: '100%', marginTop: 4 }} variant="primary">
        Create Employer Account
      </AppButton>
    </form>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialRole = searchParams.get('role') === 'employer' ? 'employer' : 'seeker'
  const [activeTab, setActiveTab] = useState(initialRole)

  const handleSuccess = () => {
    // After registration, always go to verify-email
    navigate('/verify-email', { replace: true })
  }

  const tabStyle = (tab) => ({
    flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
    background: activeTab === tab ? 'var(--color-surface)' : 'transparent',
    color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-2)',
    borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
    transition: 'all 0.15s',
  })

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f9fb 0%, #e8f0fc 100%)',
      padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '32px 40px 24px', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
              background: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff',
            }}>iP</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
              Create an account
            </h1>
            <p style={{ fontSize: 14, color: 'var(--color-text-2)' }}>
              Join i-PESO and start your employment journey
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
            <button style={tabStyle('seeker')}   onClick={() => setActiveTab('seeker')}>👤 Job Seeker</button>
            <button style={tabStyle('employer')} onClick={() => setActiveTab('employer')}>🏢 Employer</button>
          </div>

          {/* Form */}
          <div style={{ padding: '28px 40px 32px' }}>
            {activeTab === 'seeker'
              ? <SeekerForm   onSuccess={handleSuccess} />
              : <EmployerForm onSuccess={handleSuccess} />
            }
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--color-text-2)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Log in
          </Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: 'var(--color-text-3)' }}>
          <Link to="/" style={{ color: 'var(--color-text-3)', textDecoration: 'none' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  )
}