import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import ReviewFormDialog from '../ReviewFormDialog'
import { reviewService } from '@/services/reviewService'

vi.mock('@/services/reviewService', () => ({ reviewService: { submit: vi.fn(), update: vi.fn() } }))

const justApplied = { key: 'application-14', type: 'recruitment', source: 'application', sourceId: 14, employerName: 'Rice Mill', jobTitle: 'Operator' }

// Rates every star group shown with 4 stars.
async function rateAll() {
  for (const group of screen.getAllByRole('group').filter((node) => node.querySelector('input[type="radio"][aria-label]'))) {
    await userEvent.click(within(group).getByLabelText(/^4 of 5 stars/))
  }
}

describe('ReviewFormDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reviews the hiring process, with no choice of "working here"', async () => {
    reviewService.submit.mockResolvedValue({ message: 'Thanks for your review.' })
    const onSaved = vi.fn()
    renderWithProviders(<ReviewFormDialog target={justApplied} onClose={vi.fn()} onSaved={onSaved} />)

    expect(screen.getByText('Review Rice Mill')).toBeInTheDocument()
    expect(screen.queryByText('What are you reviewing?')).not.toBeInTheDocument()
    expect(screen.queryByText(/working here/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /I started working/ })).not.toBeInTheDocument()
    for (const aspect of ['Communication', 'Recruitment process', 'Professionalism', 'Job posting accuracy']) {
      expect(screen.getByText(aspect)).toBeInTheDocument()
    }

    await rateAll()
    await userEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /honest experience/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit review' }))

    expect(reviewService.submit).toHaveBeenCalledWith(expect.objectContaining({
      type: 'recruitment', application_id: 14, agree_guidelines: true,
      ratings: { communication: 4, process: 4, professionalism: 4, posting_accuracy: 4 },
    }))
    expect(onSaved).toHaveBeenCalled()
  })

  it('lets an older working-here review be edited with its own questions', async () => {
    reviewService.update.mockResolvedValue({ message: 'Your review was updated.' })
    const existing = {
      id: 9, type: 'employment', application_id: 12, employer: { name: 'Rice Mill' }, job_title: 'Operator', recommend: true, comment: null,
      ratings_map: { work_environment: 5, management: 5, job_accuracy: 5, overall: 5 },
    }
    renderWithProviders(<ReviewFormDialog existing={existing} onClose={vi.fn()} onSaved={vi.fn()} />)

    expect(screen.getByText('Work environment')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /I started working/ })).not.toBeInTheDocument()
    await rateAll()
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(reviewService.update).toHaveBeenCalledWith(9, expect.objectContaining({
      type: 'employment', ratings: { work_environment: 4, management: 4, job_accuracy: 4, overall: 4 },
    }))
  })
})
