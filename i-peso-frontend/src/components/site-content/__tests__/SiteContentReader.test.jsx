import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import RichText from '../RichText'
import LandingPage from '@/pages/landing/LandingPage'
import PolicyRoute from '@/pages/legal/PolicyRoute'
import AboutPage from '@/pages/about/AboutPage'
import { publicSiteContentService } from '@/services/siteContentService'
import { publicSystemStatusService } from '@/services/systemSettingsService'

vi.mock('@/services/siteContentService', async (importOriginal) => ({
  ...(await importOriginal()),
  publicSiteContentService: { get: vi.fn(), policy: vi.fn(), policyVersion: vi.fn() },
}))
vi.mock('@/services/systemSettingsService', async (importOriginal) => ({
  ...(await importOriginal()),
  publicSystemStatusService: { get: vi.fn() },
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

describe('Landing page content', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the text PESO saved and the office contact, with no FAQ section or Help link', async () => {
    publicSiteContentService.get.mockResolvedValue({
      office: { ...office, hours: 'Mon–Fri, 8 AM – 5 PM' },
      landing: { headline_highlight: 'Your Next Job', subheadline: 'Made for Urdaneta.', features_heading: 'Everything in one place.' },
      // An older API may still send featured questions; the page ignores them now.
      featured_faqs: [{ id: 5, question: 'Is i-PESO free?', answer: 'Yes.', topic: 'office' }],
    })

    renderWithProviders(<LandingPage />)

    expect(await screen.findByText('Your Next Job')).toBeInTheDocument()
    expect(screen.getByText('Made for Urdaneta.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Everything in one place.' })).toBeInTheDocument()
    // Fields not saved keep the original wording.
    expect(screen.getByText('Find Your', { exact: false })).toBeInTheDocument()
    // Office hours show in the contact card and again in the footer.
    expect(screen.getAllByText('Mon–Fri, 8 AM – 5 PM').length).toBeGreaterThan(0)
    // Help & FAQs was removed — the assistant answers questions instead.
    expect(screen.queryByText('Is i-PESO free?')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /help & faqs/i })).not.toBeInTheDocument()
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
    publicSiteContentService.get.mockResolvedValue({ office, landing: {} })
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

describe('About page and landing sections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    publicSystemStatusService.get.mockResolvedValue({ chatbot_enabled: true })
  })

  it('shows the mission PESO saved, its services, and hides a blank vision', async () => {
    publicSiteContentService.get.mockResolvedValue({
      office,
      landing: {},
      about: { headline: 'About PESO Urdaneta City', intro: 'We connect people with work.', mission: 'Decent work for every Urdaneteño.', vision: null, mandate: null, services: [{ title: 'Career counseling', description: 'Guidance at the office.', audience: 'seekers', link_label: null, link_url: null }] },
    })

    renderWithProviders(<AboutPage />, { route: '/about' })

    expect(await screen.findByText('Decent work for every Urdaneteño.')).toBeInTheDocument()
    expect(screen.queryByText('Vision')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Career counseling' })).toBeInTheDocument()
    expect(screen.queryByText(/our mandate/i)).not.toBeInTheDocument()
    // Questions go to the assistant now, not a Help page.
    expect(screen.getByText(/ask the/i)).toHaveTextContent('Ask the i-PESO assistant')
    expect(screen.queryByRole('link', { name: /help & faqs/i })).not.toBeInTheDocument()
  })

  it('shows the organization chart PESO entered, staff under their unit head, and hides it while empty', async () => {
    publicSiteContentService.get.mockResolvedValue({
      office,
      landing: {},
      about: {
        headline: 'About PESO Urdaneta City',
        intro: 'We connect people with work.',
        org_chart: [
          { name: 'Ana Cruz', position: 'PESO Manager', level: 'head', unit: null },
          { name: 'Ben Reyes', position: 'Unit Head', level: 'unit_head', unit: 'Employment facilitation' },
          { name: 'Carla Diaz', position: 'Job Placement Officer', level: 'staff', unit: 'employment facilitation' },
          { name: 'Dan Lim', position: 'Clerk', level: 'staff', unit: null },
        ],
      },
    })

    const { unmount } = renderWithProviders(<AboutPage />, { route: '/about' })

    expect(await screen.findByRole('heading', { name: 'Our team' })).toBeInTheDocument()
    expect(screen.getByText('Ana Cruz')).toBeInTheDocument()
    const unitCard = screen.getByText('Employment facilitation').closest('li')
    expect(unitCard).toHaveTextContent('Carla Diaz')
    expect(screen.getByRole('heading', { name: 'Other staff' }).parentElement).toHaveTextContent('Dan Lim')
    unmount()

    publicSiteContentService.get.mockResolvedValue({ office, landing: {}, about: { headline: 'About', intro: 'Hi.', org_chart: [] } })
    renderWithProviders(<AboutPage />, { route: '/about' })
    expect(await screen.findByText('Hi.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Our team' })).not.toBeInTheDocument()
  })

  it('does not point to the assistant on the About page when it is switched off', async () => {
    publicSystemStatusService.get.mockResolvedValue({ chatbot_enabled: false })
    publicSiteContentService.get.mockResolvedValue({ office, landing: {}, about: { mission: 'Decent work.' } })

    renderWithProviders(<AboutPage />, { route: '/about' })

    expect(await screen.findByText('Decent work.')).toBeInTheDocument()
    await waitFor(() => expect(publicSystemStatusService.get).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText(/i-PESO assistant/)).not.toBeInTheDocument())
  })

  it('leaves out a landing section PESO switched off, and its menu link', async () => {
    publicSiteContentService.get.mockResolvedValue({ office, landing: { show_sections: { announcements: true, features: true, jobs: true, programs: false } } })

    renderWithProviders(<LandingPage />)

    await waitFor(() => expect(screen.queryByRole('link', { name: 'Programs' })).not.toBeInTheDocument())
    expect(document.getElementById('programs')).toBeNull()
    expect(screen.getAllByRole('link', { name: 'About PESO' }).length).toBeGreaterThan(0)
  })
})
