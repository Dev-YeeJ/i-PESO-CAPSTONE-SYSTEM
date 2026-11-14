import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import ContentModulesPage from '../ContentModulesPage'
import { renderWithProviders } from '@/test/utils'
import { adminContentInsightService, adminFaqService, adminPolicyService, adminSiteContentService } from '@/services/siteContentService'
import { ABOUT_DEFAULTS, LANDING_DEFAULTS, OFFICE_DEFAULTS } from '@/components/site-content/siteContentDefaults'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/services/siteContentService', async (importOriginal) => ({
  ...(await importOriginal()),
  adminSiteContentService: { list: vi.fn(), save: vi.fn(), reset: vi.fn(), revisions: vi.fn(), restore: vi.fn() },
  adminFaqService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), publish: vi.fn(), unpublish: vi.fn(), feature: vi.fn(), reorder: vi.fn(), revisions: vi.fn(), remove: vi.fn(), starterPack: vi.fn() },
  adminPolicyService: { list: vi.fn(), get: vi.fn(), version: vi.fn(), startDraft: vi.fn(), saveDraft: vi.fn(), publish: vi.fn(), discard: vi.fn() },
  adminContentInsightService: { health: vi.fn(), insights: vi.fn(), resolve: vi.fn(), assist: vi.fn() },
}))
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const labels = {
  office: { office_name: 'Office name', address: 'Address', map_url: 'Map link', hours: 'Office hours', phone: 'Phone', email: 'Email', facebook: 'Facebook page', fees_policy: 'Fees policy', employer_approval_time: 'Employer approval time' },
  about: { headline: 'Page heading', intro: 'Introduction', mission: 'Mission', vision: 'Vision', mandate: 'Legal mandate', services: 'PESO services' },
  landing: { hero_badge: 'Hero badge', headline_lead: 'Headline (first words)', headline_highlight: 'Headline (highlighted words)', headline_tail: 'Headline (second line)', subheadline: 'Sub-headline', highlights: 'Highlights under the buttons', features_eyebrow: 'Features label', features_heading: 'Features heading', features: 'Feature cards', footer_tagline: 'Footer tagline', show_sections: 'Sections shown' },
}

const sections = {
  sections: {
    office: { key: 'office', values: OFFICE_DEFAULTS, defaults: OFFICE_DEFAULTS, labels: labels.office, version: 3, updated_at: null, updated_by: null },
    landing: { key: 'landing', values: LANDING_DEFAULTS, defaults: LANDING_DEFAULTS, labels: labels.landing, version: 0, updated_at: null, updated_by: null },
    about: { key: 'about', values: ABOUT_DEFAULTS, defaults: ABOUT_DEFAULTS, labels: labels.about, version: 0, updated_at: null, updated_by: null },
  },
}

const health = {
  score: 60,
  checks: [
    { id: 'office_blank', status: 'warn', title: 'Office info has blanks', detail: 'Not on record yet: Office hours.', module: 'office', action: 'Fill in Office info', items: [] },
    { id: 'faq_duplicates', status: 'warn', title: '1 possible duplicate FAQs', detail: 'These questions look alike.', module: 'faqs', action: 'Compare', items: [{ id: 4, label: 'How do I register?', other_id: 5, other_label: 'How to register?' }] },
    { id: 'faq_published', status: 'ok', title: '2 FAQs published', detail: 'The assistant answers from them.', module: 'faqs', action: null, items: [] },
  ],
  counts: { faqs_published: 2, faqs_unpublished: 1, chatbot_gaps: 2 },
}

const insights = {
  days: 30,
  chatbot_gaps: [{ normalized: 'saan ang tesda office', text: 'Saan ang TESDA office?', count: 2, last_at: '2026-11-12T08:00:00Z', sources: ['guest'], closest_faq: null }],
  gap_logging: true,
  retention_days: 90,
}

const faqList = {
  data: [
    { id: 4, question: 'How do I register as a job seeker?', answer: 'Use Register.', audience: 'everyone', audience_label: 'Everyone', topic: 'account', is_published: true, updated_at: '2026-11-01T00:00:00Z' },
  ],
  summary: { total: 1, published: 1, unpublished: 0, in_assistant: 1, assistant_limit: 40 },
  can_add_starter_pack: false,
}

const emptyFaqs = {
  data: [],
  summary: { total: 0, published: 0, unpublished: 0, in_assistant: 0, assistant_limit: 40 },
  can_add_starter_pack: true,
}

describe('Site Content admin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { admin_id: 1, is_system_administrator: true } })
    adminSiteContentService.list.mockResolvedValue(sections)
    adminFaqService.list.mockResolvedValue(emptyFaqs)
    adminPolicyService.list.mockResolvedValue({ policies: [], tokens: [] })
    adminContentInsightService.health.mockResolvedValue(health)
    adminContentInsightService.insights.mockResolvedValue(insights)
  })

  it('saves office info in one click with the version it loaded', async () => {
    adminSiteContentService.save.mockResolvedValue({ message: 'Changes saved. They are live now.', section: { ...sections.sections.office, version: 4 } })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=office' })

    const hours = await screen.findByRole('textbox', { name: 'Office hours' })
    expect(screen.getByText(/the assistant can’t answer about/i)).toHaveTextContent('office hours')
    // Rarely-changed fields are folded away.
    expect(screen.queryByRole('textbox', { name: 'Map link' })).not.toBeInTheDocument()

    await userEvent.type(hours, 'Mon–Fri, 8 AM – 5 PM')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(adminSiteContentService.save).toHaveBeenCalledTimes(1))
    const [key, values, version] = adminSiteContentService.save.mock.calls[0]
    expect(key).toBe('office')
    expect(version).toBe(3)
    expect(values).toMatchObject({ hours: 'Mon–Fri, 8 AM – 5 PM', email: OFFICE_DEFAULTS.email })
  }, 15000)

  it('reloads instead of overwriting when someone else saved first', async () => {
    adminSiteContentService.save.mockRejectedValue({ response: { status: 409, data: { message: 'Someone else saved changes to this section a moment ago.' } } })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=office' })

    await userEvent.type(await screen.findByRole('textbox', { name: 'Office hours' }), 'x')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Someone else saved changes to this section a moment ago.'))
    await waitFor(() => expect(adminSiteContentService.list).toHaveBeenCalledTimes(2))
  })

  it('previews landing page text as it is typed', async () => {
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=landing' })

    const highlight = await screen.findByRole('textbox', { name: 'Headline (highlighted words)' })
    await userEvent.clear(highlight)
    await userEvent.type(highlight, 'Your Next Job')

    const preview = screen.getByLabelText('Landing page preview')
    expect(within(preview).getByText('Your Next Job')).toBeInTheDocument()
    // Feature cards and the rest wait behind "More options".
    expect(screen.queryByRole('textbox', { name: 'Card 1 title' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /more options/i }))
    expect(screen.getByRole('textbox', { name: 'Card 1 title' })).toBeInTheDocument()
  })

  it('offers the suggested FAQs when the list is empty', async () => {
    adminFaqService.starterPack.mockResolvedValue({ message: '12 suggested FAQs added.' })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=faqs' })

    await userEvent.click(await screen.findByRole('button', { name: /add suggested faqs/i }))

    await waitFor(() => expect(adminFaqService.starterPack).toHaveBeenCalledTimes(1))
    expect(toast.success).toHaveBeenCalledWith('12 suggested FAQs added.')
  })

  it('gives front-desk CRM staff the health check, insights and FAQs only', async () => {
    useAuthStore.setState({ user: { admin_id: 2, access: { constituent_crm: 'manage', configuration: 'none' } } })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=faqs' })

    const nav = screen.getByRole('navigation', { name: 'Content modules' })
    expect(within(nav).getByRole('button', { name: /health check/i })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /assistant insights/i })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /faqs/i })).toBeInTheDocument()
    expect(within(nav).queryByRole('button', { name: /office info/i })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('button', { name: /policy pages/i })).not.toBeInTheDocument()
    expect(adminSiteContentService.list).not.toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: /new faq/i })).toBeInTheDocument()
  })

  it('opens on the health check and takes you to what needs fixing', async () => {
    adminFaqService.list.mockResolvedValue(faqList)
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules' })

    expect(await screen.findByRole('heading', { name: 'Content Modules' })).toBeInTheDocument()
    expect(await screen.findByRole('progressbar', { name: /content health score/i })).toHaveAttribute('aria-valuenow', '60')
    expect(screen.getByText('Office info has blanks')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'How do I register?' }))
    // The duplicate opens straight in the FAQ editor.
    expect(await screen.findByRole('textbox', { name: 'Question' })).toHaveValue('How do I register as a job seeker?')
  })

  it('turns a question the assistant could not answer into a new FAQ with an AI-cleaned question', async () => {
    adminContentInsightService.assist.mockResolvedValue({ suggestion: 'Where is the TESDA office?', note: '' })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=insights' })

    expect(await screen.findByText('“Saan ang TESDA office?”')).toBeInTheDocument()
    // The Help page went, and with it its search and vote reports.
    expect(screen.queryByText(/help searches/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/was this helpful/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /write faq/i }))

    expect(adminContentInsightService.assist).toHaveBeenCalledWith({ task: 'suggest_question', text: 'Saan ang TESDA office?' })
    expect(await screen.findByRole('textbox', { name: 'Question' })).toHaveValue('Where is the TESDA office?')
  })

  it('drafts an answer with AI, warns about a duplicate, and only fills the form when accepted', async () => {
    adminFaqService.list.mockResolvedValue(faqList)
    adminContentInsightService.assist.mockResolvedValue({ suggestion: 'Open **Register** and choose Job seeker.', note: 'Check every detail.' })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=faqs' })

    // FAQs only feed the assistant: no landing-page toggle, no link button.
    await screen.findByText('How do I register as a job seeker?')
    expect(screen.queryByRole('button', { name: /show on home/i })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /new faq/i }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Question' }), 'How to register as job seeker?')
    expect(screen.getByText(/looks like an faq you already have/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue('account')
    expect(screen.queryByRole('textbox', { name: 'Link' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add a link button/i })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /draft answer/i }))
    const suggestion = await screen.findByLabelText('AI suggestion')
    expect(within(suggestion).getByText('Register').tagName).toBe('STRONG')
    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('')

    await userEvent.click(within(suggestion).getByRole('button', { name: 'Use this' }))
    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('Open **Register** and choose Job seeker.')
    expect(adminContentInsightService.assist).toHaveBeenCalledWith({ task: 'draft_answer', question: 'How to register as job seeker?', audience: 'everyone' })
  })

  it('saves and publishes a new FAQ in one click', async () => {
    adminFaqService.create.mockResolvedValue({ message: 'FAQ saved.', faq: { id: 9, is_published: false } })
    adminFaqService.publish.mockResolvedValue({ message: 'Published. The assistant can use it now.' })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=faqs' })

    await userEvent.click(await screen.findByRole('button', { name: /new faq/i }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Question' }), 'When is the next job fair?')
    await userEvent.type(screen.getByRole('textbox', { name: 'Answer' }), 'See the Job Fairs page.')
    expect(screen.getByRole('combobox', { name: 'Topic' })).toHaveValue('job_fairs')
    await userEvent.click(screen.getByRole('button', { name: /save & publish/i }))

    await waitFor(() => expect(adminFaqService.publish).toHaveBeenCalledWith(9))
    expect(adminFaqService.create.mock.calls[0][0]).toMatchObject({ topic: 'job_fairs' })
    expect(adminFaqService.create.mock.calls[0][0]).not.toHaveProperty('link_url')
    expect(toast.success).toHaveBeenCalledWith('Published. The assistant can use it now.')
  })

  it('switches landing page sections off', async () => {
    adminSiteContentService.save.mockResolvedValue({ message: 'Changes saved.', section: sections.sections.landing })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=landing' })

    await userEvent.click(await screen.findByRole('checkbox', { name: /government programs/i }))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(adminSiteContentService.save).toHaveBeenCalled())
    expect(adminSiteContentService.save.mock.calls[0][1].show_sections).toMatchObject({ programs: false })
    // The landing "Common questions" section is gone, so there is no switch for it.
    expect(adminSiteContentService.save.mock.calls[0][1].show_sections).not.toHaveProperty('faq')
  })

  it('opens read-only for view-only staff', async () => {
    useAuthStore.setState({ user: { admin_id: 3, access: { configuration: 'view' } } })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=office' })

    expect(await screen.findByRole('textbox', { name: 'Office hours' })).toBeDisabled()
    expect(screen.getByText(/can view the office information but not change it/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^save/i })).not.toBeInTheDocument()
  })
})
