import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MyApplications from '../MyApplications'
import { reviewService } from '@/services/reviewService'
import {
  getSeekerApplications,
  withdrawSeekerApplication,
} from '@/services/seekerService'

vi.mock('@/services/reviewService', () => ({
  reviewService: { getMine: vi.fn(() => Promise.resolve({ opportunities: [], reviews: [] })) },
}))

vi.mock('@/services/seekerService', () => ({
  getSeekerApplications: vi.fn(),
  getSeekerApplicationDetail: vi.fn(),
  withdrawSeekerApplication: vi.fn(),
}))

const application = {
  apply_id: 1,
  status: 'shortlisted',
  status_label: 'Shortlisted',
  match_percentage: 88,
  applied_at: '2026-06-01T00:00:00Z',
  can_withdraw: true,
  job: {
    job_title: 'Data Encoder',
    location: 'Urdaneta City',
    employer: { company_name: 'Acme Corp' },
  },
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><MyApplications /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MyApplications (seeker application tracking)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders each application with plain-language "what’s next" guidance', async () => {
    getSeekerApplications.mockResolvedValue({ applications: [application] })

    renderPage()

    expect(await screen.findByText('Data Encoder')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    // "Shortlisted" now also appears in the status-filter chip introduced alongside the
    // card's own status badge, so at least one (not exactly one) is the correct assertion.
    expect(screen.getAllByText('Shortlisted').length).toBeGreaterThan(0)
    // The brief: explain what the status means and what to do next.
    expect(screen.getByText(/on the shortlist/i)).toBeInTheDocument()
  })

  it('shows an actionable empty state when there are no applications', async () => {
    getSeekerApplications.mockResolvedValue({ applications: [] })

    renderPage()

    expect(await screen.findByText('No applications yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open smart job map/i })).toBeInTheDocument()
  })

  it('confirms withdrawal in an accessible dialog, never window.confirm', async () => {
    getSeekerApplications.mockResolvedValue({ applications: [application] })
    withdrawSeekerApplication.mockResolvedValue({
      application: { ...application, status: 'withdrawn', status_label: 'Withdrawn', can_withdraw: false },
    })
    const confirmSpy = vi.spyOn(window, 'confirm')

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Withdraw' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName('Withdraw this application?')
    expect(confirmSpy).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Withdraw application' }))
    await waitFor(() => expect(withdrawSeekerApplication).toHaveBeenCalledWith(1))
  })

  it('surfaces a retry affordance when loading fails', async () => {
    getSeekerApplications.mockRejectedValue({ response: { data: { message: 'Server unavailable.' } } })

    renderPage()

    expect(await screen.findByText('Server unavailable.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('offers to rate the employer once a review is allowed', async () => {
    getSeekerApplications.mockResolvedValue({ applications: [{ ...application, status: 'rejected', can_withdraw: false }] })
    reviewService.getMine.mockResolvedValue({
      opportunities: [{
        source: 'application', source_id: 1, employer: { name: 'Acme Corp' }, job_title: 'Data Encoder',
        recruitment: { allowed: true, limited: false, review_id: null },
        employment: { allowed: false },
      }],
      reviews: [],
    })

    renderPage()

    expect(await screen.findByRole('button', { name: /rate this employer/i })).toBeInTheDocument()
  })
})
