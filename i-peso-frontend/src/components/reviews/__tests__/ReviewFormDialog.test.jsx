import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/utils'
import ReviewFormDialog from '../ReviewFormDialog'
import { reviewService } from '@/services/reviewService'

vi.mock('@/services/reviewService', () => ({ reviewService: { submit: vi.fn(), update: vi.fn() } }))

const justApplied = {
  key: 'application-14', types: ['recruitment'], type: 'recruitment', source: 'application', sourceId: 14,
  employerName: 'Rice Mill', jobTitle: 'Operator', employmentReason: 'Only for people this employer hired.',
}

// Rates every star group shown with 4 stars.
async function rateAll() {
  for (const group of screen.getAllByRole('group').filter((node) => node.querySelector('input[type="radio"][aria-label]'))) {
    await userEvent.click(within(group).getByLabelText(/^4 of 5 stars/))
  }
}

describe('ReviewFormDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reviews the hiring process right after applying, with working here closed until hired', async () => {
    reviewService.submit.mockResolvedValue({ message: 'Thanks for your review.' })
    const onSaved = vi.fn()
    renderWithProviders(<ReviewFormDialog target={justApplied} onClose={vi.fn()} onSaved={onSaved} />)

    expect(screen.getByText('Review Rice Mill')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /The hiring process/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Working here/ })).toBeDisabled()
    expect(screen.getByText('Only for people this employer hired.')).toBeInTheDocument()
    // All four hiring aspects, not the old two-aspect "no response" form.
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

  it('lets a hire switch their review to working here, after confirming they started', async () => {
    reviewService.update.mockResolvedValue({ message: 'Your review was updated.' })
    const existing = {
      id: 9, type: 'recruitment', application_id: 12, allowed_types: ['recruitment', 'employment'], employer: { name: 'Rice Mill' },
      job_title: 'Operator', recommend: true, comment: null, ratings_map: { communication: 5, process: 5, professionalism: 5, posting_accuracy: 5 },
    }
    renderWithProviders(<ReviewFormDialog existing={existing} onClose={vi.fn()} onSaved={vi.fn()} />)

    await userEvent.click(screen.getByRole('radio', { name: /Working here/ }))
    expect(screen.getByText('Work environment')).toBeInTheDocument()
    await rateAll()

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('Please confirm that you started working here.')).toBeInTheDocument()
    expect(reviewService.update).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('checkbox', { name: /I started working/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(reviewService.update).toHaveBeenCalledWith(9, expect.objectContaining({
      type: 'employment', confirm_started: true,
      // Only the workplace ratings are sent, not the old hiring ones.
      ratings: { work_environment: 4, management: 4, job_accuracy: 4, overall: 4 },
    }))
  })
})
