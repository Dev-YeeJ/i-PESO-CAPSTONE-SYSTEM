import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MyApplications from '../MyApplications'
import {
  getSeekerApplications,
  withdrawSeekerApplication,
} from '@/services/seekerService'

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
  return render(<MemoryRouter><MyApplications /></MemoryRouter>)
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
    expect(screen.getByText('Shortlisted')).toBeInTheDocument()
    // The brief: explain what the status means and what to do next.
    expect(screen.getByText(/on the shortlist/i)).toBeInTheDocument()
  })

  it('shows an actionable empty state when there are no applications', async () => {
    getSeekerApplications.mockResolvedValue({ applications: [] })

    renderPage()

    expect(await screen.findByText('No applications yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open ai job map/i })).toBeInTheDocument()
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
})
