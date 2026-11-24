import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HiresTab from '../HiresTab'

const service = vi.hoisted(() => ({ employerFeedbackService: { getHires: vi.fn(), getHirePhoto: vi.fn(), saveWorkerFeedback: vi.fn() } }))
vi.mock('@/services/employerFeedbackService', () => service)

const aspects = { professionalism: 'Professionalism', communication: 'Communication', reliability: 'Reliability', job_performance: 'Job performance' }

const glory = {
  source: 'application', source_id: 12, application_id: 12, seeker_id: 1, has_photo: false, name: 'Glory Ann Padilla',
  job_title: 'Real estate broker', start_date: '2026-11-25', can_give_feedback: true,
  feedback: { id: 3, ratings: { professionalism: 3, communication: 3, reliability: 5, job_performance: 5 }, would_rehire: 'yes', comment: 'Learns fast.', updated_at: '2026-11-25T03:00:00Z' },
}
const rubilisa = {
  source: 'placement', source_id: 40, application_id: null, seeker_id: 2, has_photo: false, name: 'Rubilisa Valdez',
  job_title: 'Accounting Staff', start_date: '2026-11-25', can_give_feedback: true, feedback: null,
}

function renderTab(hires = [glory, rubilisa]) {
  service.employerFeedbackService.getHires.mockResolvedValue({ hires, aspects, would_rehire: { yes: 'Yes', maybe: 'Maybe', no: 'No' } })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><HiresTab /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HiresTab', () => {
  beforeEach(() => vi.clearAllMocks())

  it('links an application hire to their applicant profile, and tags a placement hire instead', async () => {
    renderTab()

    expect(await screen.findByRole('link', { name: 'Glory Ann Padilla' })).toHaveAttribute('href', '/employer/ats/applicant/12')
    expect(screen.queryByRole('link', { name: 'Rubilisa Valdez' })).not.toBeInTheDocument()
    expect(screen.getByText('Rubilisa Valdez')).toBeInTheDocument()
    expect(screen.getByText('From placement report')).toBeInTheDocument()
  })

  it('lists hires waiting for feedback before rated ones', async () => {
    renderTab()

    await screen.findByText('Rubilisa Valdez')
    const names = screen.getAllByTestId('hire-name').map((node) => node.textContent)
    expect(names).toEqual(['Rubilisa Valdez', 'Glory Ann Padilla'])
  })

  it('shows the scores and comment already given without opening the editor', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(await screen.findByRole('button', { name: 'Show details' }))

    const details = screen.getByTestId('hire-feedback-details')
    expect(within(details).getByText('Professionalism')).toBeInTheDocument()
    expect(within(details).getByText('Job performance')).toBeInTheDocument()
    expect(within(details).getByText('Learns fast.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('keeps the privacy note to one line until asked', async () => {
    const user = userEvent.setup()
    renderTab()

    expect(await screen.findByText('Comments are private — only PESO and the worker read them.')).toBeInTheDocument()
    expect(screen.queryByText(/never your comments or your company name/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'How this works' }))
    expect(screen.getByText(/never your comments or your company name/)).toBeInTheDocument()
  })
})
