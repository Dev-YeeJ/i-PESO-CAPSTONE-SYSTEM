import { createElement } from 'react'
import { Link } from 'react-router-dom'
import { LifeBuoy, LogIn, Wrench } from 'lucide-react'
import IPesoLogo from '@/components/branding/IPesoLogo'
import { useSystemStatus } from './useSystemStatus'

function NoticeShell({ icon, title, message, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A192F] px-6 py-16 font-sans text-white">
      <main className="w-full max-w-lg text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-blue-500/20">
          <IPesoLogo className="h-full w-full" />
        </div>
        <span className="mx-auto mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/15 text-yellow-400">
          {createElement(icon, { className: 'h-6 w-6', 'aria-hidden': true })}
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-3 whitespace-pre-line text-base leading-7 text-slate-300">{message}</p>
        {children}
        <p className="mt-10 text-xs text-slate-500">Public Employment Service Office · Urdaneta City</p>
      </main>
    </div>
  )
}

/** Full-page notice while System Settings → Maintenance mode is on. */
export function MaintenanceScreen({ message }) {
  return (
    <NoticeShell
      icon={Wrench}
      title="i-PESO is under maintenance"
      message={message || 'i-PESO is being updated right now. Please try again in a little while.'}
    >
      <p className="mt-6 text-sm text-slate-400">This page refreshes on its own when the portal is back.</p>
      <Link to="/administrator" className="mt-6 inline-block text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline">
        PESO staff sign-in
      </Link>
    </NoticeShell>
  )
}

/**
 * Wraps a registration page: shows the paused-registration notice instead
 * when PESO paused sign-ups for that role. `role="any"` (the gateway) only
 * closes when both roles are paused.
 */
export function RegistrationGate({ role, children }) {
  const status = useSystemStatus()
  const { seekers_open: seekers, employers_open: employers, closed_message: message } = status.registration
  const closed = role === 'seeker' ? !seekers : role === 'employer' ? !employers : !seekers && !employers

  if (!closed) return children

  return (
    <NoticeShell icon={LogIn} title="Registration is paused" message={message}>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/login" className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100">Sign in to an existing account</Link>
        <Link to="/help" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">
          <LifeBuoy className="h-4 w-4" aria-hidden="true" /> Help &amp; FAQs
        </Link>
      </div>
      {role === 'any' ? null : (
        <p className="mt-6 text-sm text-slate-400">
          {role === 'seeker' && employers && <>Registering a company? <Link to="/register/employer" className="font-bold text-yellow-400 hover:underline">Employer registration is open</Link>.</>}
          {role === 'employer' && seekers && <>Looking for work? <Link to="/register/seeker" className="font-bold text-yellow-400 hover:underline">Job seeker registration is open</Link>.</>}
        </p>
      )}
    </NoticeShell>
  )
}
