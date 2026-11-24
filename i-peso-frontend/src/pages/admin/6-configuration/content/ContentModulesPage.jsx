import { createElement } from 'react'
import { useUnsavedEntries } from '@/hooks/useUnsavedChanges'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, Landmark, MessageCircleQuestion, PanelsTopLeft, ScrollText } from 'lucide-react'
import { ErrorState, LoadingSkeleton } from '@/components/ui'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminSiteContentService } from '@/services/siteContentService'
import { useAuthStore } from '@/stores/authStore'
import { canManage, canOpen } from '@/utils/adminAccess'
import { OFFICE_DEFAULTS, withDefaults } from '@/components/site-content/siteContentDefaults'
import OfficeInfoTab from './site-content/OfficeInfoTab'
import AboutTab from './site-content/AboutTab'
import FaqsTab from './site-content/FaqsTab'
import LandingTab from './site-content/LandingTab'
import PoliciesTab from './site-content/PoliciesTab'

const CONFIG = 'configuration'

/** Every module, grouped as in the sidebar. `module` = who may open it (docs/content-module-plan.md §2). */
const GROUPS = [
  {
    name: 'Information',
    items: [
      { value: 'office', label: 'Office info', icon: Building2, module: 'configuration' },
      { value: 'about', label: 'About PESO', icon: Landmark, module: 'configuration' },
    ],
  },
  { name: 'Assistant', items: [{ value: 'faqs', label: 'FAQs', icon: MessageCircleQuestion, module: CONFIG }] },
  {
    name: 'Pages',
    items: [
      { value: 'landing', label: 'Landing page', icon: PanelsTopLeft, module: 'configuration' },
      { value: 'policies', label: 'Policy pages', icon: ScrollText, module: 'configuration' },
    ],
  },
]

/**
 * Configuration → Content Modules: the portal's standing information — office
 * details, About PESO, the assistant's FAQs (its answer bank; there is no Help
 * page), the landing page and the policy pages. Full width, with a module
 * sidebar; `?tab=` picks the module.
 */
export default function ContentModulesPage() {
  const user = useAuthStore((s) => s.user)
  const [params, setParams] = useSearchParams()
  // Tabs whose editor holds unsaved changes get a dot (ids are 'content:<tab>').
  const unsaved = new Set(useUnsavedEntries().map((entry) => entry.id))

  const groups = GROUPS
    .map((group) => ({ ...group, items: group.items.filter((item) => canOpen(user, item.module)) }))
    .filter((group) => group.items.length)
  const allowed = groups.flatMap((group) => group.items.map((item) => item.value))
  const requested = params.get('tab')
  const active = allowed.includes(requested) ? requested : allowed[0]
  const needsSections = canOpen(user, 'configuration')
  const canEditConfig = canManage(user, 'configuration')
  const canEditFaqs = canManage(user, CONFIG)

  const sections = useQuery({ queryKey: ['admin-site-content'], queryFn: adminSiteContentService.list, enabled: needsSections })
  const office = withDefaults(OFFICE_DEFAULTS, sections.data?.sections?.office?.values)

  /** Open a module, optionally with extra params (e.g. { faq: 12 } or { new: 'question' }). */
  const go = (value, extra = {}) => {
    const next = new URLSearchParams()
    if (value !== allowed[0]) next.set('tab', value)
    Object.entries(extra).forEach(([key, val]) => val !== undefined && val !== null && next.set(key, String(val)))
    setParams(next)
  }

  const sectionModule = (render) => {
    if (!needsSections) return null
    if (sections.isLoading) return <LoadingSkeleton variant="card" rows={3} />
    if (sections.isError) return <ErrorState onRetry={() => sections.refetch()} />
    return render(sections.data.sections)
  }

  const content = {
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
        subtitle="Everything people read on i-PESO that isn’t a record: office details, About PESO, the assistant’s FAQs, the landing page and the policy pages."
      />

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Content modules" className="lg:sticky lg:top-6 lg:self-start">
          {/* Phones: one scrolling row. Desktop: grouped list. */}
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-5 lg:overflow-visible lg:pb-0">
            {groups.map((group) => (
              <div key={group.name} className="flex shrink-0 gap-2 lg:flex-col lg:gap-1">
                <p className="hidden px-3 text-xs font-bold text-slate-400 lg:block">{group.name}</p>
                {group.items.map((item) => {
                  const selected = item.value === active
                  return (
                    <button
                      key={item.value}
                      type="button"
                      aria-current={selected ? 'page' : undefined}
                      onClick={() => go(item.value)}
                      className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                        selected ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200' : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900 lg:border-transparent lg:bg-transparent lg:hover:bg-white/70'
                      }`}
                    >
                      {createElement(item.icon, { className: 'h-4 w-4 shrink-0', 'aria-hidden': true })}
                      <span className="flex-1 whitespace-nowrap">{item.label}</span>
                      {unsaved.has(`content:${item.value}`) && (<><span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" aria-hidden="true" /><span className="sr-only">(unsaved changes)</span></>)}
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
