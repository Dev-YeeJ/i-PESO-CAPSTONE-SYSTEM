import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import JobMapCard from '../JobMapCard'
import { formatKm } from '../jobMapFormat'

const job = (overrides = {}) => ({
  post_id: 7,
  job_title: 'Chef',
  employer_name: 'IchiTech Solutions',
  match_percentage: 34,
  full_work_address: '220 Primicias Street, San Fabian, Pangasinan',
  distance_km: 0,
  employment_type: 'permanent',
  missing_skills: [],
  has_applied: false,
  application_status: null,
  is_saved: false,
  ...overrides,
})

const renderCard = (overrides, handlers = {}) => render(
  <JobMapCard job={job(overrides)} onClick={vi.fn()} onView={vi.fn()} onApply={vi.fn()} onSave={vi.fn()} onTraining={vi.fn()} onJobFair={vi.fn()} {...handlers} />,
)

describe('formatKm', () => {
  it('says "under 0.1 km" instead of 0.0 km', () => {
    expect(formatKm(0)).toBe('under 0.1 km')
    expect(formatKm(0.04)).toBe('under 0.1 km')
    expect(formatKm(12.44)).toBe('12.4 km')
  })
})

describe('JobMapCard', () => {
  it('lets a seeker apply to a job they have not applied to', async () => {
    const onApply = vi.fn()
    renderCard({}, { onApply })

    expect(screen.getByText('under 0.1 km')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onApply).toHaveBeenCalled()
  })

  it('shows a withdrawn application as withdrawn, not applied, and opens it instead of a dead button', async () => {
    const onViewApplication = vi.fn()
    renderCard({ has_applied: true, application_status: 'withdrawn' }, { onViewApplication })

    expect(screen.getByText('Withdrawn')).toBeInTheDocument()
    expect(screen.queryByText(/^Applied/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^apply/i })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'View application' }))
    expect(onViewApplication).toHaveBeenCalled()
  })

  it.each([
    ['pending', 'Applied'],
    ['interview', 'Interview'],
    ['hired', 'Hired'],
    ['rejected', 'Not selected'],
  ])('labels a %s application "%s"', (status, label) => {
    renderCard({ has_applied: true, application_status: status })
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
