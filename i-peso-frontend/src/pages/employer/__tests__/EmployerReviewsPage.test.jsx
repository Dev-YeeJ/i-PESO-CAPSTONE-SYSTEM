import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import EmployerReviewsPage from '../EmployerReviewsPage'
import { employerFeedbackService } from '@/services/employerFeedbackService'

vi.mock('@/services/employerFeedbackService', () => ({
  employerFeedbackService: {
    getReviews: vi.fn(),
    getHires: vi.fn(),
    reply: vi.fn(),
    deleteReply: vi.fn(),
    saveWorkerFeedback: vi.fn(),
  },
}))

const review = (id, extra = {}) => ({
  id,
  type: 'recruitment',
  reviewer: 'Verified applicant',
  month: 'November 2026',
  limited: false,
  ratings: [{ key: 'communication', label: 'Communication', value: 4 }],
  average: 4,
  recommend: true,
  comment: `Review number ${id}.`,
  edited: false,
  own_reply: null,
  ...extra,
})

const overall = {
  reviewers: 4,
  enough: true,
  average: 4.2,
  recommend_percent: 75,
  aspects: { communication: { label: 'Communication', average: 4.2, ratings: 4 } },
  distribution: [{ stars: 5, count: 1 }, { stars: 4, count: 3 }, { stars: 3, count: 0 }, { stars: 2, count: 0 }, { stars: 1, count: 0 }],
  strengths: ['communication'],
  to_improve: [],
}

// One unified summary and list: no hiring/working-here split, no disputes.
const response = (reviews) => ({
  summary: { min_reviews: 3, overall },
  counts: { all: 2, needs_reply: 1 },
  reviews: { data: reviews, current_page: 1, last_page: 1 },
})

describe('EmployerReviewsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    employerFeedbackService.getReviews.mockImplementation(async ({ filter } = {}) => (
      filter === 'needs_reply'
        ? response([review(2)])
        : response([review(1, { own_reply: { body: 'Thank you for applying.', status: 'published', edited: false } }), review(2)])
    ))
    employerFeedbackService.getHires.mockResolvedValue({ hires: [], aspects: {}, would_rehire: {} })
  })

  it('shows the summary, star distribution and reviews', async () => {
    renderWithProviders(<EmployerReviewsPage />, { route: '/employer/reviews' })

    expect(await screen.findByText('Review number 2.')).toBeInTheDocument()
    expect(screen.queryByText('Review number 1.')).not.toBeInTheDocument()
    expect(screen.getByRole('table', { name: /each overall star rating/i })).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('Company rating')).toBeInTheDocument()
    // No type tabs and no dispute.
    expect(screen.queryByText('Working here')).not.toBeInTheDocument()
    expect(screen.queryByText('Hiring process')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dispute/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /disputed/i })).not.toBeInTheDocument()
  })

  it('opens on reviews that still need a reply', async () => {
    renderWithProviders(<EmployerReviewsPage />, { route: '/employer/reviews' })
    await screen.findByText('Review number 2.')

    await waitFor(() => expect(employerFeedbackService.getReviews).toHaveBeenLastCalledWith({ page: 1, filter: 'needs_reply' }))
    await waitFor(() => expect(screen.queryByText('Review number 1.')).not.toBeInTheDocument())
    expect(screen.getByText('Review number 2.')).toBeInTheDocument()
  })

  it('lets employers switch back to all reviews', async () => {
    renderWithProviders(<EmployerReviewsPage />, { route: '/employer/reviews' })
    await screen.findByText('Review number 2.')

    await userEvent.click(screen.getByRole('radio', { name: /^all\d*$/i }))

    expect(await screen.findByText('Review number 1.')).toBeInTheDocument()
    expect(screen.getByText('Thank you for applying.')).toBeInTheDocument()
  })

  it('opens the hires tab from the URL', async () => {
    renderWithProviders(<EmployerReviewsPage />, { route: '/employer/reviews?tab=hires' })

    expect(await screen.findByText('No hires yet')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /feedback on your hires/i })).toHaveAttribute('aria-selected', 'true')
  })
})
