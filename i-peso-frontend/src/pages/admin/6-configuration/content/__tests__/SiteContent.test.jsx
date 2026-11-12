import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import SiteContentPage from '../SiteContentPage'
import { renderWithProviders } from '@/test/utils'
import { adminFaqService, adminPolicyService, adminSiteContentService } from '@/services/siteContentService'
import { LANDING_DEFAULTS, OFFICE_DEFAULTS } from '@/components/site-content/siteContentDefaults'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/services/siteContentService', async (importOriginal) => ({
  ...(await importOriginal()),
  adminSiteContentService: { list: vi.fn(), save: vi.fn(), reset: vi.fn(), revisions: vi.fn(), restore: vi.fn() },
  adminFaqService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), publish: vi.fn(), unpublish: vi.fn(), feature: vi.fn(), reorder: vi.fn(), revisions: vi.fn(), remove: vi.fn(), starterPack: vi.fn() },
  adminPolicyService: { list: vi.fn(), get: vi.fn(), version: vi.fn(), startDraft: vi.fn(), saveDraft: vi.fn(), publish: vi.fn(), discard: vi.fn() },
}))
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))

const labels = {
  office: { office_name: 'Office name', address: 'Address', map_url: 'Map link', hours: 'Office hours', phone: 'Phone', email: 'Email', facebook: 'Facebook page', fees_policy: 'Fees policy', employer_approval_time: 'Employer approval time' },
  landing: { hero_badge: 'Hero badge', headline_lead: 'Headline (first words)', headline_highlight: 'Headline (highlighted words)', headline_tail: 'Headline (second line)', subheadline: 'Sub-headline', highlights: 'Highlights under the buttons', features_eyebrow: 'Features label', features_heading: 'Features heading', features: 'Feature cards', footer_tagline: 'Footer tagline' },
}

const sections = {
  sections: {
    office: { key: 'office', values: OFFICE_DEFAULTS, defaults: OFFICE_DEFAULTS, labels: labels.office, version: 3, updated_at: null, updated_by: null },
    landing: { key: 'landing', values: LANDING_DEFAULTS, defaults: LANDING_DEFAULTS, labels: labels.landing, version: 0, updated_at: null, updated_by: null },
  },
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
  })

  it('shows the changes before saving office info and sends the version it loaded', async () => {
    adminSiteContentService.save.mockResolvedValue({ message: 'Changes saved. They are live now.', section: { ...sections.sections.office, version: 4 } })
    renderWithProviders(<SiteContentPage />)

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
    renderWithProviders(<SiteContentPage />)

    await userEvent.type(await screen.findByRole('textbox', { name: 'Office hours' }), 'x')
    await userEvent.click(screen.getByRole('button', { name: /save \(1\)/i }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /save and publish/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Someone else saved changes to this section a moment ago.'))
    await waitFor(() => expect(adminSiteContentService.list).toHaveBeenCalledTimes(2))
  })

  it('previews landing page text as it is typed', async () => {
    renderWithProviders(<SiteContentPage />, { route: '/admin/site-content?tab=landing' })

    const highlight = await screen.findByRole('textbox', { name: 'Headline (highlighted words)' })
    await userEvent.clear(highlight)
    await userEvent.type(highlight, 'Your Next Job')

    const preview = screen.getByLabelText('Landing page preview')
    expect(within(preview).getByText('Your Next Job')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /use the original text/i })).toBeInTheDocument()
  })

  it('offers the suggested FAQs when the list is empty', async () => {
    adminFaqService.starterPack.mockResolvedValue({ message: '12 suggested FAQs added.' })
    renderWithProviders(<SiteContentPage />, { route: '/admin/site-content?tab=faqs' })

    await userEvent.click(await screen.findByRole('button', { name: /add suggested faqs/i }))

    await waitFor(() => expect(adminFaqService.starterPack).toHaveBeenCalledTimes(1))
    expect(toast.success).toHaveBeenCalledWith('12 suggested FAQs added.')
  })

  it('gives front-desk CRM staff only the FAQs tab', async () => {
    useAuthStore.setState({ user: { admin_id: 2, access: { constituent_crm: 'manage', configuration: 'none' } } })
    renderWithProviders(<SiteContentPage />)

    expect(await screen.findByRole('tab', { name: /faqs/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /office info/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /policy pages/i })).not.toBeInTheDocument()
    expect(adminSiteContentService.list).not.toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: /new faq/i })).toBeInTheDocument()
  })

  it('opens read-only for view-only staff', async () => {
    useAuthStore.setState({ user: { admin_id: 3, access: { configuration: 'view' } } })
    renderWithProviders(<SiteContentPage />)

    expect(await screen.findByRole('textbox', { name: 'Office hours' })).toBeDisabled()
    expect(screen.getByText(/can view the office information but not change it/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^save/i })).not.toBeInTheDocument()
  })
})
