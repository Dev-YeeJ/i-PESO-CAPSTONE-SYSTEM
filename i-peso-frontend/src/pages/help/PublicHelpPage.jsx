import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, LifeBuoy } from 'lucide-react'
import IPesoLogo from '@/components/branding/IPesoLogo'
import { publicSiteContentService } from '@/services/siteContentService'
import HelpCenter from '@/components/site-content/HelpCenter'
import { OFFICE_DEFAULTS, withDefaults } from '@/components/site-content/siteContentDefaults'

/** /help — the public FAQ page (no sign-in), in the same chrome as the policy pages. */
export default function PublicHelpPage() {
  const navigate = useNavigate()
  const query = useQuery({ queryKey: ['public-faqs'], queryFn: publicSiteContentService.faqs, staleTime: 5 * 60 * 1000 })
  const office = withDefaults(OFFICE_DEFAULTS, query.data?.office)

  return (
    <div className="min-h-screen bg-[#0A192F] font-sans text-white">
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
        <div className="flex cursor-pointer items-center gap-3" onClick={() => navigate('/')}>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-blue-500/20">
            <IPesoLogo className="h-full w-full" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none tracking-wide text-white">i-PESO</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-blue-300">Urdaneta City</p>
          </div>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </nav>

      <header className="relative z-10 mx-auto max-w-4xl px-6 pb-14 pt-6 text-center sm:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/30 px-4 py-2 text-xs font-medium text-slate-300 backdrop-blur-sm">
          <LifeBuoy className="h-4 w-4 text-yellow-500" aria-hidden="true" /> Help &amp; FAQs
        </span>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">How can we help?</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-400">
          Answers from the PESO office of Urdaneta City to the questions people ask most about i-PESO,
          registration, jobs and PESO services.
        </p>
      </header>

      <main className="relative z-10 bg-[#F8F7F2] text-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:px-8">
          <HelpCenter
            faqs={query.data?.faqs ?? []}
            topics={query.data?.topics ?? []}
            office={office}
            isLoading={query.isLoading}
            isError={query.isError}
            onRetry={() => query.refetch()}
          />
          <p className="mt-8 text-center text-sm text-slate-600">
            Have an account? Sign in to see answers for{' '}
            <Link to="/login" className="font-bold text-[#0A192F] underline decoration-[#B45309] decoration-2 underline-offset-2">job seekers and employers</Link>.
          </p>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 bg-[#071122] px-6 py-8 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-3 font-semibold text-slate-400">
          <Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <Link to="/terms-of-service" className="hover:text-white">Terms of Service</Link>
        </div>
      </footer>
    </div>
  )
}
