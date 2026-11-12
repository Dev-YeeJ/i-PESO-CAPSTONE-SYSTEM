import { useQuery } from '@tanstack/react-query'
import { helpService } from '@/services/siteContentService'
import HelpCenter from '@/components/site-content/HelpCenter'
import { OFFICE_DEFAULTS, withDefaults } from '@/components/site-content/siteContentDefaults'

/**
 * Help & FAQs inside the seeker and employer portals: FAQs for Everyone plus
 * the reader's role, and the office contact card. Employers still being
 * verified can open it too.
 */
export default function HelpPage({ role }) {
  const query = useQuery({ queryKey: ['help', role], queryFn: helpService.get, staleTime: 5 * 60 * 1000 })
  const office = withDefaults(OFFICE_DEFAULTS, query.data?.office)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">PESO Urdaneta</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">Help &amp; FAQs</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Answers from the PESO office to the questions {role === 'employer' ? 'employers' : 'job seekers'} ask most.
          Can&apos;t find yours? The office contact details are at the bottom.
        </p>
      </header>

      <div className="mt-6">
        <HelpCenter
          faqs={query.data?.faqs ?? []}
          topics={query.data?.topics ?? []}
          office={office}
          role={role}
          isLoading={query.isLoading}
          isError={query.isError}
          onRetry={() => query.refetch()}
        />
      </div>
    </div>
  )
}
