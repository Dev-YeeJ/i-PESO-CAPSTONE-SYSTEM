import { createElement, useEffect } from 'react'
import { ArrowRight, Building2, Info, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '@/components/auth/AuthShell'

const roles = [
  {
    route: '/register/seeker',
    icon: UserRound,
    eyebrow: 'Job Seeker',
    title: 'I am looking for work',
    text: 'Create an account, complete your DOLE NSRP profile, and prepare for local job matching.',
  },
  {
    route: '/register/employer',
    icon: Building2,
    eyebrow: 'Employer',
    title: 'I want to hire talent',
    text: 'Register your company, submit legal requirements, and receive PESO accreditation.',
  },
]

export default function RegisterGateway() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const preselected = location.state?.preselectedRole
    if (preselected === 'seeker') navigate('/register/seeker', { replace: true })
    if (preselected === 'employer') navigate('/register/employer', { replace: true })
  }, [location.state, navigate])

  return (
    <AuthShell
      title="Choose your account type"
      subtitle="Select the role that matches how you will use i-PESO. One email address can only belong to one account type."
      maxWidth="max-w-2xl"
      sideTitle="Your first step into i-PESO."
      sideText="Registration is role-specific so every user receives the correct profile, requirements, and employment tools."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map(({ route, icon, eyebrow, title, text }) => (
          <button key={route} type="button" onClick={() => navigate(route)} className="auth-role-card group relative overflow-hidden rounded-2xl p-6 text-left transition duration-200 hover:-translate-y-1">
            <span className="absolute inset-x-0 top-0 h-1 bg-brand-gold opacity-0 transition group-hover:opacity-100" />
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-brand-navy transition group-hover:bg-brand-gold">{createElement(icon, { className: 'h-6 w-6' })}</span>
            <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-amber-600">{eyebrow}</p>
            <h2 className="mt-2 text-xl font-extrabold text-brand-navy">{title}</h2>
            <p className="mt-2 min-h-20 text-sm leading-6 text-slate-600">{text}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-brand-navy">Choose this account <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p>This is the official registration portal of Urdaneta City PESO and follows the DOLE National Skills Registration Program context.</p>
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">Already registered? <Link to="/login" className="font-extrabold text-blue-700 hover:underline">Sign in here</Link></p>
    </AuthShell>
  )
}
