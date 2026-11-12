import { createElement } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Activity, Building2, Landmark, Lightbulb, MessageCircleQuestion, PanelsTopLeft, ScrollText } from 'lucide-react'
import { ErrorState, LoadingSkeleton } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminContentInsightService, adminSiteContentService } from '@/services/siteContentService'
import { useAuthStore } from '@/stores/authStore'
import { canManage, canOpen } from '@/utils/adminAccess'
import { OFFICE_DEFAULTS, withDefaults } from '@/components/site-content/siteContentDefaults'
import OverviewModule from './site-content/OverviewModule'
import InsightsModule from './site-content/InsightsModule'
import OfficeInfoTab from './site-content/OfficeInfoTab'
import AboutTab from './site-content/AboutTab'
import FaqsTab from './site-content/FaqsTab'
import LandingTab from './site-content/LandingTab'
import PoliciesTab from './site-content/PoliciesTab'

const BOTH = ['configuration', 'constituent_crm']

/** Every module, grouped as in the sidebar. `module` = who may open it (docs/content-module-plan.md §2). */
const GROUPS = [
  {
    name: 'Overview',
    items: [
      { value: 'overview', label: 'Health check', icon: Activity, module: BOTH },
      { value: 'insights', label: 'Reader insights', icon: Lightbulb, module: BOTH },
    ],
  },
  {
    name: 'Information',
    items: [
      { value: 'office', label: 'Office info', icon: Building2, module: 'configuration' },
      { value: 'about', label: 'About PESO', icon: Landmark, module: 'configuration' },
    ],
  },
  { name: 'Help', items: [{ value: 'faqs', label: 'FAQs', icon: MessageCircleQuestion, module: BOTH }] },
  {
    name: 'Pages',
    items: [
      { value: 'landing', label: 'Landing page', icon: PanelsTopLeft, module: 'configuration' },
      { value: 'policies', label: 'Policy pages', icon: ScrollText, module: 'configuration' },
    ],
  },
]

/**
 * Configuration → Content Modules: the portal's standing information and
 * the tools that keep it good — a health check, what readers search for and
 * vote on, and what the assistant could not answer. Full width, with a
 * module sidebar; `?tab=` picks the module.
 */
export default function ContentModulesPage() {
  const user = useAuthStore((s) => s.user)
  const [params, setParams] = useSearchParams()

  const groups = GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => canOpen(user, item.module)) }))
    .filter((group) => group.items.length)
  const allowed = groups.flatMap((group) => group.items.map((item) => item.value))
  const requested = params.get('tab')
  const active = allowed.includes(requested) ? requested : allowed[0]
  const needsSections = canOpen(user, 'configuration')
  const canEditConfig = canManage(user, 'configuration')
  const canEditFaqs = canManage(user, BOTH)

  const sections = useQuery({ queryKey: ['admin-site-content'], queryFn: adminSiteContentService.list, enabled: needsSections })
  const health = useQuery({ queryKey: ['content-health'], queryFn: adminContentInsightService.health, staleTime: 60 * 1000 })
  const office = withDefaults(OFFICE_DEFAULTS, sections.data?.sections?.office?.values)

  /** Open a module, optionally with extra params (e.g. { faq: 12 } or { new: 'question' }). */
  const go = (value, extra = {}) => {
    const next = new URLSearchParams()
    if (value !== allowed[0]) next.set('tab', value)
    Object.entries(extra).forEach(([key, val]) => val !== undefined && val !== null && next.set(key, String(val)))
    setParams(next)
  }

  const badgeFor = (value) => {
    const data = health.data
    if (!data) return null
    if (value === 'overview') return data.checks.filter((check) => check.status === 'warn').length || null
    if (value === 'insights') return (data.counts.missed_searches + data.counts.chatbot_gaps) || null
    if (value === 'faqs') return data.counts.faqs_unpublished || null
    return null
  }

  const sectionModule = (render) => {
    if (!needsSections) return null
    if (sections.isLoading) return <LoadingSkeleton variant="card" rows={3} />
    if (sections.isError) return <ErrorState onRetry={() => sections.refetch()} />
    return render(sections.data.sections)
  }

  const content = {
    overview: () => <OverviewModule health={health} onGo={go} allowed={allowed} />,
    insights: () => <InsightsModule onGo={go} canEdit={canEditFaqs} allowed={allowed} />,
    office: () => sectionModule((all) => <OfficeInfoTab section={all.office} canEdit={canEditConfig} />),
    about: () => sectionModule((all) => <AboutTab section={all.about} canEdit={canEditConfig} office={office} />),
    faqs: () => <FaqsTab canEdit={canEditFaqs} office={office} />,
    landing: () => sectionModule((all) => <LandingTab section={all.landing} canEdit={canEditConfig} />),
    policies: () => <PoliciesTab canEdit={canEditConfig} office={office} />,
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Content Modules"
        subtitle="Everything people read on i-PESO that isn’t a record — office details, FAQs and pages — plus what readers and the assistant tell you is missing. Time-bound news belongs in Announcements."
      />

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Content modules" className="lg:sticky lg:top-6 lg:self-start">
          {/* Phones: one scrolling row. Desktop: grouped list. */}
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
            {groups.map((group) => (
              <div key={group.name} className="flex shrink-0 gap-2 lg:flex-col lg:gap-1">
                <p className="hidden px-3 text-[11px] font-black uppercase tracking-wider text-slate-400 lg:block">{group.name}</p>
                {group.items.map((item) => {
                  const selected = item.value === active
                  const badge = badgeFor(item.value)
                  return (
                    <button
                      key={item.value}
                      type="button"
                      aria-current={selected ? 'page' : undefined}
                      onClick={() => go(item.value)}
                      className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                        selected ? 'bg-brand-navy text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-navy hover:text-brand-navy lg:border-transparent lg:bg-transparent'
                      }`}
                    >
                      {createElement(item.icon, { className: 'h-4 w-4 shrink-0', 'aria-hidden': true })}
                      <span className="flex-1 whitespace-nowrap">{item.label}</span>
                      {badge ? (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${selected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`} aria-label={`${badge} to look at`}>
                          {badge}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </nav>

        <section aria-label={groups.flatMap((g) => g.items).find((item) => item.value === active)?.label} className="min-w-0">
          {active && content[active]()}
        </section>
      </div>
    </div>
  )
}
