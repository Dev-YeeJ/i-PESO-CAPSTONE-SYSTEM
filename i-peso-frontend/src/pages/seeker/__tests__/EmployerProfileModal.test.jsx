import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EmployerProfileModal from '../EmployerProfileModal'
import { getPublicEmployerProfile } from '@/services/seekerService'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/services/seekerService', () => ({
  getPublicEmployerProfile: vi.fn(),
  reportEmployer: vi.fn(),
  applyToJob: vi.fn(),
  toggleSavedJob: vi.fn(),
}))

// The job popup fetches its own data; keep it inert so this test stays on the panel.
vi.mock('@/components/JobDetailModal', () => ({
  default: ({ open, postId }) => (open ? <div role="dialog" aria-label="Job details">job {postId}</div> : null),
}))

const profile = {
  employer: {
    employer_id: 7,
    company_name: 'Northwind Foods Corporation',
    trade_name: 'Northwind',
    industry: ['Retail', 'Food service'],
    company_size: 'small',
    full_address: 'Poblacion, Urdaneta City, Pangasinan',
    company_description: 'Regional grocery chain.',
    company_logo_url: null,
    verification_status: 'verified',
    created_at: '2025-03-01T00:00:00Z',
  },
  vacancies: [
    { post_id: 31, job_title: 'Store Cashier', location: 'Urdaneta City', employment_type: 'full_time', salary_min: 15000, salary_max: 18000, created_at: new Date().toISOString() },
  ],
}

const renderPanel = (props = {}) =>
  renderWithProviders(<EmployerProfileModal open employerId={7} onClose={vi.fn()} {...props} />)

describe('EmployerProfileModal (seeker company profile panel)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('leads with the brand name and shows readable facts instead of raw codes', async () => {
    getPublicEmployerProfile.mockResolvedValue(profile)
    renderPanel()

    expect(await screen.findByRole('heading', { name: 'Northwind' })).toBeInTheDocument()
    expect(screen.getByText('Registered as Northwind Foods Corporation')).toBeInTheDocument()
    expect(screen.getByText('Retail, Food service')).toBeInTheDocument()
    expect(screen.getByText('Small (10–99 employees)')).toBeInTheDocument()
    expect(screen.getByText('₱15,000–₱18,000 a month')).toBeInTheDocument()
    expect(screen.getByText('Posted today')).toBeInTheDocument()
  })

  it('opens the job when its row is selected', async () => {
    getPublicEmployerProfile.mockResolvedValue(profile)
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: /Store Cashier/ }))
    // The stub sits outside the panel's Radix tree, so the modal aria-hides it;
    // the real JobDetailModal is its own Dialog and layers correctly.
    expect(screen.getByText('job 31')).toBeInTheDocument()
  })

  it('reports through the structured form, not a browser prompt', async () => {
    getPublicEmployerProfile.mockResolvedValue(profile)
    const promptSpy = vi.spyOn(window, 'prompt')
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'Report this employer' }))
    const reportDialog = await screen.findByRole('dialog', { name: /Report Northwind/ })
    expect(within(reportDialog).getByRole('combobox')).toBeInTheDocument()
    expect(promptSpy).not.toHaveBeenCalled()
    promptSpy.mockRestore()
  })

  it('explains an unavailable profile instead of a generic error', async () => {
    getPublicEmployerProfile.mockRejectedValue({ response: { status: 404 } })
    renderPanel()

    expect(await screen.findByText("This company profile isn't available")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to jobs' })).toBeInTheDocument()
  })

  it('has no detectable accessibility violations', async () => {
    getPublicEmployerProfile.mockResolvedValue(profile)
    renderPanel()

    await screen.findByRole('heading', { name: 'Northwind' })
    // Radix portals the dialog to <body>, outside the render container.
    expect(await axe(document.body)).toHaveNoViolations()
  })
})
