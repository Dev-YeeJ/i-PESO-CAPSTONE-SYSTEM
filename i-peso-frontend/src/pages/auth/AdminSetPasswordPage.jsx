import { useState } from 'react'
import { Check, Eye, EyeOff, ShieldCheck, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AuthShell from '@/components/auth/AuthShell'
import Button from '@/components/ui/Button'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/authStore'
import { adminHomePath } from '@/utils/adminAccess'

// Mirrors the API rule: Password::min(8)->numbers()->symbols().
const RULES = [
  { label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { label: 'At least one number', test: (value) => /\d/.test(value) },
  { label: 'At least one symbol (e.g. ! @ # $)', test: (value) => /[^A-Za-z0-9]/.test(value) },
]

export default function AdminSetPasswordPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const logout = useAuthStore((s) => s.logout)
  const isFirstTime = !!user?.must_change_password

  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const rulesMet = RULES.every((rule) => rule.test(password))
  const matches = password !== '' && password === confirmation

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    // On first sign-in they just used the temporary password, so it isn't asked for again.
    if (!isFirstTime && !current) nextErrors.current_password = 'Enter your current password.'
    if (!rulesMet) nextErrors.password = 'Your new password does not meet all the requirements.'
    else if (!isFirstTime && password === current) nextErrors.password = 'Choose a password different from your current one.'
    if (!matches) nextErrors.password_confirmation = 'The passwords do not match.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setLoading(true)
    setApiError('')
    try {
      await authService.changeAdminPassword(isFirstTime ? null : current, password, confirmation)
      updateUser({ must_change_password: false })
      navigate(adminHomePath(user), { replace: true })
    } catch (error) {
      const fieldErrors = error.response?.data?.errors
      if (fieldErrors) {
        setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([key, messages]) => [key, messages[0]])))
      } else {
        setApiError(error.response?.data?.message ?? 'Your password could not be updated. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await logout()
    navigate('/administrator', { replace: true })
  }

  const roleLabel = user?.position_label ?? user?.admin_role?.name

  return (
    <AuthShell
      variant="staff"
      title={isFirstTime ? 'Set your password' : 'Change your password'}
      subtitle={isFirstTime
        ? <>Signed in as <span className="font-semibold text-slate-900">{user?.email}</span></>
        : 'Enter your current password, then choose a new one.'}
      sideTitle={isFirstTime ? `Welcome to the team${user?.first_name ? `, ${user.first_name}` : ''}.` : 'Keep your account secure.'}
      sideText={isFirstTime
        ? 'Choose your own password to replace the temporary one from your email. Your access follows the role your Office Manager gave you.'
        : 'Use a password you don\'t use anywhere else.'}
      sideExtra={roleLabel ? (
        <dl className="mt-8 rounded-xl border border-white/15 bg-white/5 p-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-white/60">Role</dt><dd className="text-right font-semibold">{roleLabel}</dd></div>
        </dl>
      ) : null}
    >
      {apiError && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        {!isFirstTime && (
          <PasswordField
            label="Current password"
            value={current}
            onChange={setCurrent}
            show={show}
            autoComplete="current-password"
            error={errors.current_password}
          />
        )}
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          show={show}
          autoComplete="new-password"
          error={errors.password}
        />
        <ul className="space-y-1 text-sm" aria-label="Password requirements">
          {RULES.map((rule) => {
            const met = rule.test(password)
            return (
              <li key={rule.label} className={`flex items-center gap-2 ${met ? 'text-emerald-700' : 'text-slate-500'}`}>
                <Check className={`h-4 w-4 ${met ? 'opacity-100' : 'opacity-30'}`} aria-hidden="true" />
                {rule.label}<span className="sr-only">{met ? ' (met)' : ' (not met yet)'}</span>
              </li>
            )
          })}
        </ul>
        <PasswordField
          label="Confirm new password"
          value={confirmation}
          onChange={setConfirmation}
          show={show}
          autoComplete="new-password"
          error={errors.password_confirmation}
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Show passwords
        </label>

        <Button type="submit" loading={loading} icon={ShieldCheck} className="w-full">
          {loading ? 'Saving…' : isFirstTime ? 'Save and open workspace' : 'Change password'}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
        {isFirstTime ? <span /> : (
          <button type="button" onClick={() => navigate(-1)} className="font-semibold text-slate-600 hover:text-brand-navy">Cancel</button>
        )}
        <button type="button" onClick={signOut} className="font-semibold text-slate-600 hover:text-brand-navy">Sign out</button>
      </div>
    </AuthShell>
  )
}

function PasswordField({ label, value, onChange, show, error, autoComplete }) {
  const [reveal, setReveal] = useState(false)
  const visible = show || reveal

  return (
    <div>
      <label className="portal-label">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className={`portal-input pr-11 ${error ? 'border-red-400' : ''}`}
        />
        <button type="button" onClick={() => setReveal((current) => !current)} className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={visible ? 'Hide password' : 'Show password'}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-700">{error}</p>}
    </div>
  )
}
