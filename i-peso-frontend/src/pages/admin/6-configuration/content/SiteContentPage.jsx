import { createElement } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, MessageCircleQuestion, PanelsTopLeft, ScrollText } from 'lucide-react'
import { ErrorState, LoadingSkeleton } from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PageHeader from '@/pages/admin/_components/PageHeader'
import { adminSiteContentService } from '@/services/siteContentService'
import { useAuthStore } from '@/stores/authStore'
import { canManage, canOpen } from '@/utils/adminAccess'
import { OFFICE_DEFAULTS, withDefaults } from '@/components/site-content/siteContentDefaults'
import OfficeInfoTab from './site-content/OfficeInfoTab'
import FaqsTab from './site-content/FaqsTab'
import LandingTab from './site-content/LandingTab'
import PoliciesTab from './site-content/PoliciesTab'

/** Who may open / change each tab (see docs/content-module-plan.md §2). */
const TABS = [
  { value: 'office', label: 'Office info', icon: Building2, module: 'configuration' },
  { value: 'faqs', label: 'FAQs', icon: MessageCircleQuestion, module: ['configuration', 'constituent_crm'] },
  { value: 'landing', label: 'Landing page', icon: PanelsTopLeft, module: 'configuration' },
  { value: 'policies', label: 'Policy pages', icon: ScrollText, module: 'configuration' },
]

/**
 * Configuration → Site Content: the portal's standing information — office
 * details, FAQs, landing page text and the versioned policy pages.
 */
export default function SiteContentPage() {
  const user = useAuthStore((s) => s.user)
  const [params, setParams] = useSearchParams()
  const tabs = TABS.filter((tab) => canOpen(user, tab.module))
  const requested = params.get('tab')
  const active = tabs.some((tab) => tab.value === requested) ? requested : tabs[0]?.value
  const needsSections = canOpen(user, 'configuration')

  const sections = useQuery({
    queryKey: ['admin-site-content'],
    queryFn: adminSiteContentService.list,
    enabled: needsSections,
  })
  const office = withDefaults(OFFICE_DEFAULTS, sections.data?.sections?.office?.values)

  const selectTab = (value) => setParams(value === tabs[0]?.value ? {} : { tab: value })

  const sectionTab = (render) => {
    // Office info / Landing page need Configuration access; FAQ-only staff never load them.
    if (!needsSections) return null
    if (sections.isLoading) return <LoadingSkeleton variant="card" rows={3} />
    if (sections.isError) return <ErrorState onRetry={() => sections.refetch()} />
    return render(sections.data.sections)
  }

  return (
    <div className="portal-page">
      <PageHeader
        eyebrow="Configuration"
        title="Site Content"
        subtitle="The standing information of i-PESO — office details, FAQs, landing page text and policy pages. Time-bound news belongs in Announcements."
      />

      <Tabs value={active} onValueChange={selectTab} className="mt-6">
        <div className="overflow-x-auto pb-1">
          <TabsList aria-label="Site Content sections">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {createElement(tab.icon, { className: 'h-4 w-4', 'aria-hidden': true })} {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="office">
          {sectionTab((all) => <OfficeInfoTab section={all.office} canEdit={canManage(user, 'configuration')} />)}
        </TabsContent>
        <TabsContent value="faqs">
          <FaqsTab canEdit={canManage(user, ['configuration', 'constituent_crm'])} office={office} />
        </TabsContent>
        <TabsContent value="landing">
          {sectionTab((all) => <LandingTab section={all.landing} canEdit={canManage(user, 'configuration')} />)}
        </TabsContent>
        <TabsContent value="policies">
          <PoliciesTab canEdit={canManage(user, 'configuration')} office={office} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
