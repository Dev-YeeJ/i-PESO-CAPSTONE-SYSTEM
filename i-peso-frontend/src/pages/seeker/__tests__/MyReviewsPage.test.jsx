import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MyReviewsPage from '../MyReviewsPage'

const service = vi.hoisted(() => ({ reviewService: { getMine: vi.fn(), remove: vi.fn() } }))
vi.mock('@/services/reviewService', () => service)

const open = (id, employer, jobTitle) => ({
  source: 'application', source_id: id, employer, job_title: jobTitle,
  recruitment: { allowed: true, limited: false, review_id: null }, employment: null, review: null,
})
const greenCycle = { id: 3, name: 'GreenCycle Solutions', logo: null }
const ichiTech = { id: 5, name: 'IchiTech Solutions', logo: 'company_logos/ichi.png' }

const feedback = (id, employer, values, rehire) => ({
  id, employer, job_title: 'Accounting Staff', would_rehire: rehire, comment: null, updated_at: '2026-11-25T03:00:00Z',
  ratings: ['professionalism', 'communication', 'reliability', 'job_performance'].map((key, index) => ({ key, label: key, value: values[index] })),
})

function renderPage(data) {
  service.reviewService.getMine.mockResolvedValue({ opportunities: [], reviews: [], employer_feedback: [], ...data })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><MyReviewsPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MyReviewsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('groups jobs to review under one row per company, each linking to the company page', async () => {
    renderPage({ opportunities: [open(1, greenCycle, 'Service Crew'), open(2, greenCycle, 'Janitor'), open(3, ichiTech, 'Chef')] })

    const ready = await screen.findByRole('region', { name: /Ready to review/ })
    expect(within(ready).getAllByTestId('review-company')).toHaveLength(2)
    expect(within(ready).getAllByRole('button', { name: /Review/ })).toHaveLength(3)
    expect(within(ready).getByRole('link', { name: 'GreenCycle Solutions' })).toHaveAttribute('href', '/seeker/employers/3')
  })

  it('shows four companies, then the rest on request', async () => {
    const user = userEvent.setup()
    renderPage({ opportunities: [1, 2, 3, 4, 5, 6].map((id) => open(id, { id, name: `Company ${id}`, logo: null }, 'Clerk')) })

    const ready = await screen.findByRole('region', { name: /Ready to review/ })
    expect(within(ready).getAllByTestId('review-company')).toHaveLength(4)

    await user.click(within(ready).getByRole('button', { name: 'Show all (6)' }))
    expect(within(ready).getAllByTestId('review-company')).toHaveLength(6)
  })

  it('sums up each employer feedback and shows the dispute note once', async () => {
    renderPage({ employer_feedback: [feedback(1, greenCycle, [3, 3, 5, 5], 'Maybe'), feedback(2, ichiTech, [4, 4, 4, 4], 'Yes')] })

    const section = await screen.findByRole('region', { name: 'Feedback from employers' })
    const [first] = within(section).getAllByTestId('employer-feedback')
    expect(within(first).getByText('4.0')).toBeInTheDocument()
    expect(within(first).queryByText(/hire again/i)).not.toBeInTheDocument()
    expect(within(first).getByRole('link', { name: 'GreenCycle Solutions' })).toHaveAttribute('href', '/seeker/employers/3')
    expect(within(section).getAllByText(/Think something here is unfair/)).toHaveLength(1)
  })

  it('links each of the seeker\'s own reviews to the company page', async () => {
    renderPage({ reviews: [{ id: 9, status: 'published', employer: ichiTech, job_title: 'Chef', average: 4, recommend: true, type: 'recruitment' }] })

    const mine = await screen.findByRole('region', { name: /Your reviews/ })
    expect(within(mine).getByRole('link', { name: 'IchiTech Solutions' })).toHaveAttribute('href', '/seeker/employers/5')
  })
})
