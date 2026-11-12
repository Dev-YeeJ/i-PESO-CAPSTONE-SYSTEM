import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import RichText from '../RichText'
import HelpCenter from '../HelpCenter'
import LandingPage from '@/pages/landing/LandingPage'
import PolicyRoute from '@/pages/legal/PolicyRoute'
import AboutPage from '@/pages/about/AboutPage'
import { publicSiteContentService } from '@/services/siteContentService'

vi.mock('@/services/siteContentService', async (importOriginal) => ({
  ...(await importOriginal()),
  publicSiteContentService: { get: vi.fn(), faqs: vi.fn(), policy: vi.fn(), policyVersion: vi.fn(), voteFaq: vi.fn(), reportSearchMiss: vi.fn() },
}))
vi.mock('@/services/governmentProgramService', () => ({ default: { publicPrograms: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/services/announcementService', async (importOriginal) => ({
  ...(await importOriginal()),
  publicAnnouncementService: { list: vi.fn().mockResolvedValue([]), attachmentUrl: vi.fn() },
}))

const office = {
  office_name: 'PESO Urdaneta',
  address: 'Alexander St, Urdaneta City',
  hours: null,
  phone: '0923 810 2011',
  email: 'office@peso.example',
  facebook: null,
  fees_policy: null,
  employer_approval_time: null,
  map_url: null,
}

describe('RichText', () => {
  it('renders paragraphs, bullets, bold, links and office details — never HTML', () => {
    const { container } = renderWithProviders(
      <RichText office={office} text={'Intro with **bold** and https://dole.gov.ph.\n\n- First\n- Email {office.email}\n\n<script>alert(1)</script>'} />,
    )

    expect(screen.getByText('bold').tagName).toBe('STRONG')
    expect(screen.getByRole('link', { name: 'https://dole.gov.ph' })).toHaveAttribute('href', 'https://dole.gov.ph')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'office@peso.example' })).toHaveAttribute('href', 'mailto:office@peso.example')
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
  })
})

describe('HelpCenter', () => {
  const faqs = [
    { id: 1, question: 'Do I pay to register?', answer: 'No, it is free.', topic: 'office', audience: 'everyone' },
    { id: 2, question: 'I forgot my password', answer: 'Use the reset link.', topic: 'account', audience: 'everyone' },
  ]
  const topics = [{ value: 'account', label: 'Registration & account' }, { value: 'office', label: 'Office & services' }]

  it('filters as you type and hides contact details that are not on record', async () => {
    renderWithProviders(<HelpCenter faqs={faqs} topics={topics} office={office} />)

    expect(screen.getByRole('heading', { name: 'Registration & account' })).toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox', { name: /search questions/i }), 'password')
    expect(screen.getByRole('button', { name: /forgot my password/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pay to register/i })).not.toBeInTheDocument()

    const contact = screen.getByRole('region', { name: 'PESO Urdaneta' })
    expect(within(contact).getByText('0923 810 2011')).toBeInTheDocument()
    expect(within(contact).queryByText('Office hours')).not.toBeInTheDocument()
  })

  it('opens a linked question and explains a link to one that was removed', async () => {
    const { unmount } = renderWithProviders(<HelpCenter faqs={faqs} topics={topics} office={office} />, { route: '/help#faq-1' })
    expect(await screen.findByText('No, it is free.')).toBeVisible()
    unmount()

    renderWithProviders(<HelpCenter faqs={faqs} topics={topics} office={office} />, { route: '/help#faq-99' })
    expect(screen.getByText(/that question is no longer available/i)).toBeInTheDocument()
  })
})

describe('Landing page content', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the text PESO saved, the featured questions and the office contact', async () => {
    publicSiteContentService.get.mockResolvedValue({
      office: { ...office, hours: 'Mon–Fri, 8 AM – 5 PM' },
      landing: { headline_highlight: 'Your Next Job', subheadline: 'Made for Urdaneta.', features_heading: 'Everything in one place.' },
      featured_faqs: [{ id: 5, question: 'Is i-PESO free?', answer: 'Yes.', topic: 'office' }],
    })

    renderWithProviders(<LandingPage />)

    expect(await screen.findByText('Your Next Job')).toBeInTheDocument()
    expect(screen.getByText('Made for Urdaneta.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Everything in one place.' })).toBeInTheDocument()
    // Fields not saved keep the original wording.
    expect(screen.getByText('Find Your', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Is i-PESO free?' })).toBeInTheDocument()
    expect(screen.getByText('Mon–Fri, 8 AM – 5 PM')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Help & FAQs' })).toHaveAttribute('href', '/help')
  })

  it('falls back to the original text when the API cannot be reached', async () => {
    publicSiteContentService.get.mockRejectedValue(new Error('offline'))

    renderWithProviders(<LandingPage />)

    expect(screen.getByText('Perfect Match')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Built for finding work and talent.' })).toBeInTheDocument()
    await waitFor(() => expect(publicSiteContentService.get).toHaveBeenCalled())
    expect(screen.getByText('Perfect Match')).toBeInTheDocument()
  })
})

describe('Policy pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    publicSiteContentService.get.mockResolvedValue({ office, landing: {}, featured_faqs: [] })
  })

  const builtin = { version: 1, is_builtin: true, effective_at: '2026-09-09', change_note: 'Original version.' }

  it('shows the original page with Office info contact details until a version is published', async () => {
    publicSiteContentService.policy.mockResolvedValue({ policy: { slug: 'privacy-policy' }, current: builtin, upcoming: null, versions: [{ ...builtin, is_current: true }] })

    renderWithProviders(<PolicyRoute slug="privacy-policy" />, { route: '/privacy-policy' })

    expect(await screen.findByRole('heading', { name: /Who We Are/ })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'office@peso.example' })).toBeInTheDocument()
    expect(screen.queryByText(/all versions/i)).not.toBeInTheDocument()
  })

  it('renders a published version, announces an upcoming one and lists every version', async () => {
    const current = {
      version: 2, is_builtin: false, effective_at: '2026-11-13', change_note: 'Named a DPO.',
      summary: null,
      sections: [{ id: 'dpo', title: 'Data Protection Officer', body: 'Write to {office.email}.' }],
    }
    publicSiteContentService.policy.mockResolvedValue({
      policy: { slug: 'privacy-policy' },
      current,
      upcoming: { version: 3, effective_at: '2026-12-01', change_note: 'Longer retention.' },
      versions: [
        { version: 3, effective_at: '2026-12-01', change_note: 'Longer retention.', is_upcoming: true },
        { ...current, is_current: true },
        { ...builtin },
      ],
    })

    renderWithProviders(<PolicyRoute slug="privacy-policy" />, { route: '/privacy-policy' })

    expect(await screen.findByRole('heading', { name: /Data Protection Officer/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'office@peso.example' })).toBeInTheDocument()
    expect(screen.getByText(/takes effect on/i)).toHaveTextContent('December 1, 2026')
    expect(screen.getByRole('link', { name: 'Read it now' })).toHaveAttribute('href', '/privacy-policy?version=3')
    expect(screen.getByRole('link', { name: 'Version 1' })).toHaveAttribute('href', '/privacy-policy?version=1')
    // In the page header and again in the version list.
    expect(screen.getAllByText('Effective November 13, 2026', { exact: false }).length).toBeGreaterThan(0)
  })
})

describe('Learning from readers', () => {
  const faqs = [{ id: 1, question: 'Do I pay to register?', answer: 'No, it is free.', topic: 'office', audience: 'everyone' }]

  beforeEach(() => {
    vi.clearAllMocks()
    try { window.localStorage.clear() } catch { /* ignore */ }
    publicSiteContentService.voteFaq.mockResolvedValue({ message: 'ok' })
    publicSiteContentService.reportSearchMiss.mockResolvedValue({ message: 'Noted.' })
  })

  it('records a helpful vote and remembers it', async () => {
    renderWithProviders(<HelpCenter faqs={faqs} topics={[]} office={office} />, { route: '/help#faq-1' })

    await userEvent.click(await screen.findByRole('button', { name: 'No' }))

    expect(publicSiteContentService.voteFaq).toHaveBeenCalledWith(1, false)
    expect(screen.getByText(/PESO will improve this answer/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('tells PESO about a search that found nothing, once', async () => {
    renderWithProviders(<HelpCenter faqs={faqs} topics={[]} office={office} />)

    await userEvent.type(screen.getByRole('searchbox', { name: /search questions/i }), 'tesda scholarship')
    expect(screen.getByText(/no questions match/i)).toBeInTheDocument()

    await waitFor(() => expect(publicSiteContentService.reportSearchMiss).toHaveBeenCalledWith('tesda scholarship'), { timeout: 3000 })
    expect(publicSiteContentService.reportSearchMiss).toHaveBeenCalledTimes(1)
  })
})

describe('About page and landing sections', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the mission PESO saved, its services, and hides a blank vision', async () => {
    publicSiteContentService.get.mockResolvedValue({
      office,
      landing: {},
      about: { headline: 'About PESO Urdaneta City', intro: 'We connect people with work.', mission: 'Decent work for every Urdaneteño.', vision: null, mandate: null, services: [{ title: 'Career counseling', description: 'Guidance at the office.', audience: 'seekers', link_label: null, link_url: null }] },
      featured_faqs: [],
    })

    renderWithProviders(<AboutPage />, { route: '/about' })

    expect(await screen.findByText('Decent work for every Urdaneteño.')).toBeInTheDocument()
    expect(screen.queryByText('Vision')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Career counseling' })).toBeInTheDocument()
    expect(screen.queryByText(/our mandate/i)).not.toBeInTheDocument()
  })

  it('leaves out a landing section PESO switched off, and its menu link', async () => {
    publicSiteContentService.get.mockResolvedValue({ office, landing: { show_sections: { announcements: true, features: true, jobs: true, programs: false, faq: true } }, featured_faqs: [] })

    renderWithProviders(<LandingPage />)

    await waitFor(() => expect(screen.queryByRole('link', { name: 'Programs' })).not.toBeInTheDocument())
    expect(document.getElementById('programs')).toBeNull()
    expect(screen.getAllByRole('link', { name: 'About PESO' }).length).toBeGreaterThan(0)
  })
})
