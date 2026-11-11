import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EmployerProfileModal from '../EmployerProfileModal'
import { getPublicEmployerProfile } from '@/services/seekerService'
import { safetyReportService } from '@/services/safetyReportService'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/services/seekerService', () => ({
  getPublicEmployerProfile: vi.fn(),
  applyToJob: vi.fn(),
  toggleSavedJob: vi.fn(),
}))

vi.mock('@/services/safetyReportService', () => ({
  safetyReportService: { options: vi.fn(), submit: vi.fn() },
}))

const reportOptions = {
  subject_type: 'employer',
  categories: [
    { value: 'illegal_fees', label: 'Request for money or unauthorized fees', hint: 'You were asked to pay.' },
    { value: 'other', label: 'Other concern', hint: null },
  ],
  limits: { description_min: 30, description_max: 3000, max_attachments: 5, max_attachment_kb: 5120, attachment_types: ['jpg', 'png', 'pdf'] },
}

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

  it('reports through the structured form, confirming who is reported and that it is truthful', async () => {
    getPublicEmployerProfile.mockResolvedValue(profile)
    safetyReportService.options.mockResolvedValue(reportOptions)
    safetyReportService.submit.mockResolvedValue({ report: { id: 12, case_number: 'RPT-2026-00012' } })
    const promptSpy = vi.spyOn(window, 'prompt')
    renderPanel()

    await userEvent.click(await screen.findByRole('button', { name: 'Report this employer' }))
    const reportDialog = await screen.findByRole('dialog', { name: /Report an employer/ })
    expect(within(reportDialog).getByText('You are reporting')).toBeInTheDocument()
    expect(within(reportDialog).getByText('Northwind')).toBeInTheDocument()

    await userEvent.click(await within(reportDialog).findByRole('radio', { name: /unauthorized fees/ }))
    await userEvent.type(within(reportDialog).getByRole('textbox', { name: /What happened/ }), 'The recruiter asked me for 1,500 pesos before the interview.')
    await userEvent.click(within(reportDialog).getByRole('button', { name: 'Review report' }))

    const confirmDialog = await screen.findByRole('dialog', { name: /Confirm your report/ })
    await userEvent.click(within(confirmDialog).getByRole('button', { name: 'Submit report' }))
    expect(within(confirmDialog).getByText('Please confirm that your report is truthful.')).toBeInTheDocument()
    expect(safetyReportService.submit).not.toHaveBeenCalled()

    await userEvent.click(within(confirmDialog).getByRole('checkbox'))
    await userEvent.click(within(confirmDialog).getByRole('button', { name: 'Submit report' }))

    expect(await screen.findByText('RPT-2026-00012')).toBeInTheDocument()
    expect(safetyReportService.submit).toHaveBeenCalledWith('seeker', expect.objectContaining({ subject_id: 7, category: 'illegal_fees', acknowledge: true }))
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
