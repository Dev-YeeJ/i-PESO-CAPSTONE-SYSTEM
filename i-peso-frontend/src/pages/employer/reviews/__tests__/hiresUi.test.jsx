import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HireAvatar from '../HireAvatar'
import { sortHires } from '../sortHires'

const service = vi.hoisted(() => ({ employerFeedbackService: { getHirePhoto: vi.fn() } }))
vi.mock('@/services/employerFeedbackService', () => service)

const hire = (id, overrides) => ({ source: 'application', source_id: id, name: `Hire ${id}`, can_give_feedback: true, feedback: null, ...overrides })

describe('sortHires', () => {
  it('puts hires waiting for feedback first, then ones not open yet, then rated ones', () => {
    const rated = hire(1, { feedback: { id: 9 } })
    const later = hire(2, { can_give_feedback: false, start_date: '2099-01-01' })
    const waiting = hire(3)
    const noStartDate = hire(4, { start_date: null })

    expect(sortHires([rated, later, waiting, noStartDate]).map((item) => item.source_id)).toEqual([3, 4, 2, 1])
  })

  it('keeps the original order inside each group and does not change the input', () => {
    const input = [hire(5), hire(6), hire(7)]
    expect(sortHires(input).map((item) => item.source_id)).toEqual([5, 6, 7])
    expect(input.map((item) => item.source_id)).toEqual([5, 6, 7])
  })
})

describe('HireAvatar', () => {
  beforeEach(() => {
    service.employerFeedbackService.getHirePhoto.mockReset()
    URL.createObjectURL = vi.fn(() => 'blob:photo')
    URL.revokeObjectURL = vi.fn()
  })

  it('shows the photo when the hire has one', async () => {
    service.employerFeedbackService.getHirePhoto.mockResolvedValue(new Blob(['jpg']))
    render(<HireAvatar seekerId={8} name="Leonardo Molar" hasPhoto />)

    expect(await screen.findByRole('img', { name: 'Leonardo Molar' })).toHaveAttribute('src', 'blob:photo')
    expect(service.employerFeedbackService.getHirePhoto).toHaveBeenCalledWith(8)
  })

  it('falls back to initials when the photo cannot be loaded', async () => {
    service.employerFeedbackService.getHirePhoto.mockRejectedValue(new Error('404'))
    render(<HireAvatar seekerId={8} name="Leonardo Molar" hasPhoto />)

    await waitFor(() => expect(service.employerFeedbackService.getHirePhoto).toHaveBeenCalled())
    expect(screen.getByText('LM')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('never asks for a photo the hire does not have', () => {
    render(<HireAvatar seekerId={8} name="Rubilisa Valdez" hasPhoto={false} />)

    expect(screen.getByText('RV')).toBeInTheDocument()
    expect(service.employerFeedbackService.getHirePhoto).not.toHaveBeenCalled()
  })
})
