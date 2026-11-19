import { createElement, useEffect } from 'react'
import { Building2, Info, UserRound } from 'lucide-react'
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
      title="Create an account"
      subtitle="Pick the account that fits how you'll use i-PESO."
      maxWidth="max-w-2xl"
      sideTitle="Pick the account that fits how you'll use i-PESO."
      sideText="Each account type gets its own profile, requirements and tools, so this choice can't be changed later. One email address belongs to one account."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map(({ route, icon, eyebrow, title, text }) => (
          <button key={route} type="button" onClick={() => navigate(route)} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-card transition hover:border-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            <span className="absolute inset-x-0 top-0 h-1 bg-brand-gold opacity-0 transition group-hover:opacity-100" />
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8f0fc] text-brand-navy">{createElement(icon, { className: 'h-6 w-6' })}</span>
                        <h2 className="mt-5 text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 min-h-20 text-sm leading-6 text-slate-600">{text}</p>
            <span className="mt-5 inline-flex h-10 items-center rounded-xl border border-brand-navy px-4 text-sm font-semibold text-brand-navy transition group-hover:bg-brand-navy group-hover:text-white">Continue as {eyebrow === 'Employer' ? 'an employer' : 'a job seeker'}</span>
          </button>
        ))}
      </div>
      <p className="mt-5 flex items-start gap-2 text-sm text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy" aria-hidden="true" />
        Employers will need their Mayor's permit, BIR certificate and DTI or SEC registration to finish accreditation.
      </p>
      <p className="mt-6 text-center text-sm text-slate-600">Already registered? <Link to="/login" className="font-semibold text-brand-navy hover:underline">Sign in</Link></p>
    </AuthShell>
  )
}
