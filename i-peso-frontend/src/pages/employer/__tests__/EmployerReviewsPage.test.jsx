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
    dispute: vi.fn(),
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
  dispute: null,
  ...extra,
})

const response = (reviews) => ({
  summary: {
    min_reviews: 3,
    recruitment: {
      reviewers: 4,
      enough: true,
      average: 4.2,
      recommend_percent: 75,
      aspects: { communication: { label: 'Communication', average: 4.2, ratings: 4 } },
      distribution: [{ stars: 5, count: 1 }, { stars: 4, count: 3 }, { stars: 3, count: 0 }, { stars: 2, count: 0 }, { stars: 1, count: 0 }],
      strengths: ['communication'],
      to_improve: [],
    },
    employment: { reviewers: 1, enough: false },
  },
  counts: { recruitment: { all: 2, needs_reply: 1, disputed: 0 }, employment: { all: 0, needs_reply: 0, disputed: 0 } },
  reviews: { data: reviews, current_page: 1, last_page: 1 },
  dispute_reasons: { false_information: 'False or misleading' },
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

    expect(await screen.findByText('Review number 1.')).toBeInTheDocument()
    expect(screen.getByText('Thank you for applying.')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /each overall star rating/i })).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    // Working-here isn't public yet: 1 of the 3 reviewers needed.
    expect(screen.getByText('1 of 3 reviews needed')).toBeInTheDocument()
  })

  it('filters to reviews that still need a reply', async () => {
    renderWithProviders(<EmployerReviewsPage />, { route: '/employer/reviews' })
    await screen.findByText('Review number 1.')

    await userEvent.click(screen.getByRole('radio', { name: /needs reply/i }))

    await waitFor(() => expect(employerFeedbackService.getReviews).toHaveBeenLastCalledWith({ type: 'recruitment', page: 1, filter: 'needs_reply' }))
    await waitFor(() => expect(screen.queryByText('Review number 1.')).not.toBeInTheDocument())
    expect(screen.getByText('Review number 2.')).toBeInTheDocument()
  })

  it('opens the hires tab from the URL', async () => {
    renderWithProviders(<EmployerReviewsPage />, { route: '/employer/reviews?tab=hires' })

    expect(await screen.findByText('No hires yet')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /feedback on your hires/i })).toHaveAttribute('aria-selected', 'true')
  })
})
