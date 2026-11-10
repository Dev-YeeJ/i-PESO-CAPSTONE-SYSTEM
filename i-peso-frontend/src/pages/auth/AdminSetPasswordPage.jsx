import { useState } from 'react'
import { Check, Eye, EyeOff, KeyRound, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
            i-PESO &middot; Administrator Console
          </span>
        </div>

        {apiError && (
          <div className="mb-5 flex items-start gap-2.5 rounded-md border border-red-900/60 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-7">
          <KeyRound className="h-7 w-7 text-sky-500" strokeWidth={1.75} />
          <h1 className="mt-4 text-xl font-bold text-white">
            {isFirstTime ? 'Set your password' : 'Change your password'}
          </h1>
          <p className="mt-1.5 text-sm leading-5 text-slate-400">
            {isFirstTime
              ? `Welcome${user?.first_name ? `, ${user.first_name}` : ''}. Choose your own password to replace the temporary one from your email.`
              : 'Enter your current password, then choose a new one.'}
          </p>

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
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
            <ul className="space-y-1 text-xs">
              {RULES.map((rule) => {
                const met = rule.test(password)
                return (
                  <li key={rule.label} className={`flex items-center gap-2 ${met ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <Check className={`h-3.5 w-3.5 ${met ? 'opacity-100' : 'opacity-30'}`} />
                    {rule.label}
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

            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} className="rounded border-slate-700 bg-slate-950" />
              Show passwords
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? 'Saving…' : isFirstTime ? 'Set password and continue' : 'Change password'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4 text-xs">
            {isFirstTime ? (
              <span className="text-slate-500">Signed in as {user?.email}</span>
            ) : (
              <button type="button" onClick={() => navigate(-1)} className="font-medium text-slate-400 hover:text-white">Cancel</button>
            )}
            <button type="button" onClick={signOut} className="font-medium text-slate-400 hover:text-white">Sign out</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PasswordField({ label, value, onChange, show, error, autoComplete }) {
  const [reveal, setReveal] = useState(false)
  const visible = show || reveal

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      <div className="relative mt-1.5">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className={`w-full rounded-md border bg-slate-950 px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-slate-600 transition focus:outline-none focus:ring-2 focus:ring-sky-500/40 ${error ? 'border-red-500' : 'border-slate-700 focus:border-sky-500'}`}
        />
        <button type="button" onClick={() => setReveal((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" aria-label={visible ? 'Hide password' : 'Show password'}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-400">{error}</p>}
    </div>
  )
}
