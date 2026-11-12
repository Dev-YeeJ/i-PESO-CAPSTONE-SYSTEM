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
    { id: 'faq_published', status: 'ok', title: '2 FAQs published', detail: 'Readers can use them.', module: 'faqs', action: null, items: [] },
  ],
  counts: { faqs_published: 2, faqs_unpublished: 1, missed_searches: 4, chatbot_gaps: 2, votes: 3 },
}

const insights = {
  days: 30,
  faq_feedback: [{ faq_id: 4, question: 'How do I register?', helpful: 1, not_helpful: 5, total: 6, score: 17, needs_work: true, is_published: true }],
  missed_searches: [{ normalized: 'tesda scholarship', text: 'tesda scholarship', count: 4, last_at: '2026-11-12T08:00:00Z', sources: ['public'], closest_faq: null }],
  chatbot_gaps: [{ normalized: 'saan ang tesda office', text: 'Saan ang TESDA office?', count: 2, last_at: '2026-11-12T08:00:00Z', sources: ['guest'], closest_faq: null }],
  gap_logging: true,
  retention_days: 90,
}

const faqList = {
  data: [
    { id: 4, question: 'How do I register as a job seeker?', answer: 'Use Register.', audience: 'everyone', audience_label: 'Everyone', topic: 'account', is_published: true, is_featured: false, helpful_votes: 1, unhelpful_votes: 5, updated_at: '2026-11-01T00:00:00Z' },
  ],
  summary: { total: 1, published: 1, unpublished: 0, featured: 0, in_assistant: 1, assistant_limit: 40, max_featured: 5 },
  can_add_starter_pack: false,
}

const emptyFaqs = {
  data: [],
  summary: { total: 0, published: 0, unpublished: 0, featured: 0, in_assistant: 0, assistant_limit: 40, max_featured: 5 },
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

  it('shows the changes before saving office info and sends the version it loaded', async () => {
    adminSiteContentService.save.mockResolvedValue({ message: 'Changes saved. They are live now.', section: { ...sections.sections.office, version: 4 } })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=office' })

    const hours = await screen.findByRole('textbox', { name: 'Office hours' })
    expect(screen.getByText(/the assistant can’t answer questions about/i)).toHaveTextContent('office hours')

    await userEvent.type(hours, 'Mon–Fri, 8 AM – 5 PM')
    await userEvent.click(screen.getByRole('button', { name: /save \(1\)/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('(not on record)')).toBeInTheDocument()
    expect(within(dialog).getByText('Mon–Fri, 8 AM – 5 PM')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: /save and publish/i }))

    await waitFor(() => expect(adminSiteContentService.save).toHaveBeenCalledTimes(1))
    const [key, values, version] = adminSiteContentService.save.mock.calls[0]
    expect(key).toBe('office')
    expect(version).toBe(3)
    expect(values).toMatchObject({ hours: 'Mon–Fri, 8 AM – 5 PM', email: OFFICE_DEFAULTS.email })
  })

  it('reloads instead of overwriting when someone else saved first', async () => {
    adminSiteContentService.save.mockRejectedValue({ response: { status: 409, data: { message: 'Someone else saved changes to this section a moment ago.' } } })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=office' })

    await userEvent.type(await screen.findByRole('textbox', { name: 'Office hours' }), 'x')
    await userEvent.click(screen.getByRole('button', { name: /save \(1\)/i }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /save and publish/i }))

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
    expect(screen.getByRole('button', { name: /use the original text/i })).toBeInTheDocument()
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
    expect(within(nav).getByRole('button', { name: /reader insights/i })).toBeInTheDocument()
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

  it('turns a search nobody found into a new FAQ with an AI-cleaned question', async () => {
    adminContentInsightService.assist.mockResolvedValue({ suggestion: 'Does PESO offer TESDA scholarships?', note: '' })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=insights' })

    expect(await screen.findByText('“tesda scholarship”')).toBeInTheDocument()
    expect(screen.getByText('Rewrite')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /write faq/i })[0])

    expect(adminContentInsightService.assist).toHaveBeenCalledWith({ task: 'suggest_question', text: 'tesda scholarship' })
    expect(await screen.findByRole('textbox', { name: 'Question' })).toHaveValue('Does PESO offer TESDA scholarships?')
  })

  it('drafts an answer with AI, warns about a duplicate, and only fills the form when accepted', async () => {
    adminFaqService.list.mockResolvedValue(faqList)
    adminContentInsightService.assist.mockResolvedValue({ suggestion: 'Open **Register** and choose Job seeker.', note: 'Check every detail.' })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=faqs' })

    await userEvent.click(await screen.findByRole('button', { name: /new faq/i }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Question' }), 'How to register as job seeker?')
    expect(screen.getByText(/looks like an faq you already have/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /draft answer/i }))
    const suggestion = await screen.findByLabelText('AI suggestion')
    expect(within(suggestion).getByText('Register').tagName).toBe('STRONG')
    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('')

    await userEvent.click(within(suggestion).getByRole('button', { name: 'Use this' }))
    expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('Open **Register** and choose Job seeker.')
    expect(adminContentInsightService.assist).toHaveBeenCalledWith({ task: 'draft_answer', question: 'How to register as job seeker?', audience: 'everyone' })
  })

  it('switches landing page sections off', async () => {
    adminSiteContentService.save.mockResolvedValue({ message: 'Changes saved.', section: sections.sections.landing })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=landing' })

    await userEvent.click(await screen.findByRole('checkbox', { name: /government programs/i }))
    await userEvent.click(screen.getByRole('button', { name: /save \(1\)/i }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /save and publish/i }))

    await waitFor(() => expect(adminSiteContentService.save).toHaveBeenCalled())
    expect(adminSiteContentService.save.mock.calls[0][1].show_sections).toMatchObject({ programs: false, faq: true })
  })

  it('opens read-only for view-only staff', async () => {
    useAuthStore.setState({ user: { admin_id: 3, access: { configuration: 'view' } } })
    renderWithProviders(<ContentModulesPage />, { route: '/admin/content-modules?tab=office' })

    expect(await screen.findByRole('textbox', { name: 'Office hours' })).toBeDisabled()
    expect(screen.getByText(/can view the office information but not change it/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^save/i })).not.toBeInTheDocument()
  })
})
