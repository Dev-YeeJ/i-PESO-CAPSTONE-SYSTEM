import { Link, NavLink } from 'react-router-dom'
import IPesoLogo from '@/components/branding/IPesoLogo'

/** Top bar for public content pages (About, policy pages). The landing page keeps its own. */
export function PublicHeader() {
  const linkClass = ({ isActive }) => `rounded-lg px-3.5 py-2 transition ${isActive ? 'bg-[#e8f0fc] text-brand-navy' : 'hover:bg-slate-100 hover:text-brand-navy'}`

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white"><IPesoLogo className="h-full w-full" /></span>
          <span className="leading-tight">
            <span className="block text-[17px] font-bold tracking-tight text-brand-navy">i-PESO</span>
            <span className="block text-xs text-slate-500">Urdaneta City</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 text-[15px] font-medium text-slate-600 md:flex" aria-label="Main">
          <Link to="/#jobs" className="rounded-lg px-3.5 py-2 hover:bg-slate-100 hover:text-brand-navy">Find jobs</Link>
          <Link to="/#programs" className="rounded-lg px-3.5 py-2 hover:bg-slate-100 hover:text-brand-navy">Programs</Link>
          <NavLink to="/about" className={linkClass}>About PESO</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-brand-navy hover:bg-[#e8f0fc] sm:inline-flex">Sign in</Link>
          <Link to="/register" className="rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2d56] sm:px-5">Create free account</Link>
        </div>
      </div>
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="mt-auto bg-[#071122] text-sm text-slate-400">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>Public Employment Service Office, Urdaneta City, Pangasinan</p>
        <div className="flex flex-wrap gap-5">
          <Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
          <Link to="/terms-of-service" className="hover:text-white">Terms of Service</Link>
          <Link to="/review-guidelines" className="hover:text-white">Review Guidelines</Link>
        </div>
      </div>
    </footer>
  )
}
