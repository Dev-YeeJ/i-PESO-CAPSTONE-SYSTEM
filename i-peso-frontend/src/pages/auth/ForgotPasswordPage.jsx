import { useState } from 'react'
import { ArrowLeft, KeyRound, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '@/components/auth/AuthShell'
import { AlertBox, Button, Card } from '@/components/ui'
import { authService } from '@/services/authService'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError(email.trim() ? 'Enter a valid email address.' : 'Email is required.')
      return
    }
    setLoading(true)
    setApiError('')
    setEmailError('')
    try {
      await authService.forgotPassword(email)
      localStorage.setItem('ipeso_reset_email', email)
      navigate('/reset-password', { state: { email, freshSent: true } })
    } catch (error) {
      setApiError(error.response?.data?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your registered email address and we will send a six-digit reset code." sideTitle="Recover access securely." sideText="Password recovery uses a time-limited verification code sent to the email address attached to your i-PESO account.">
      <Link to="/login" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-navy"><ArrowLeft className="h-4 w-4" />Back to sign in</Link>
      {apiError && <AlertBox variant="danger" title="Reset code could not be sent" className="mb-5">{apiError}</AlertBox>}
      <Card>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><KeyRound className="h-6 w-6" /></span>
        <form onSubmit={submit} noValidate className="mt-6 space-y-5">
          <label className="portal-label">
            Email address
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailError('') }} placeholder="you@example.com" className={`portal-input pl-10 ${emailError ? 'border-red-400' : ''}`} />
            </div>
            {emailError && <span className="mt-1.5 block text-xs font-medium text-red-600">{emailError}</span>}
          </label>
          <Button type="submit" disabled={loading} icon={Mail} className="w-full">{loading ? 'Sending reset code...' : 'Send Reset Code'}</Button>
        </form>
        <p className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">Remembered your password? <Link to="/login" className="font-extrabold text-blue-700 hover:underline">Sign in</Link></p>
      </Card>
    </AuthShell>
  )
}
