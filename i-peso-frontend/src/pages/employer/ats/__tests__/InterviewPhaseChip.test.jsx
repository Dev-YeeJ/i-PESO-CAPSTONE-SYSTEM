import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NOW_TICK_MS } from '@/hooks/useNow'
import InterviewSummary, { InterviewPhaseChip } from '../InterviewSummary'

const START = new Date('2026-11-10T09:00:00+08:00')
const interview = {
  mode_of_interview: 'online',
  schedule: START.toISOString(),
  ends_at: new Date(START.getTime() + 60 * 60_000).toISOString(),
  phase: 'upcoming', // as loaded, before the interview started
  venue_or_link: 'https://meet.jit.si/ipeso-room',
}

describe('interview labels update on their own', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(new Date(START.getTime() - 10_000)) // 10 seconds before it starts
  })
  afterEach(() => vi.useRealTimers())

  it('flips the applicant chip from the time to "Happening now" without a reload', () => {
    render(<InterviewPhaseChip interview={interview} />)
    expect(screen.queryByText('Happening now')).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(NOW_TICK_MS) })

    expect(screen.getByText('Happening now')).toBeInTheDocument()
  })

  it('moves the interview card to "Call ended" once the hour is over, dropping the join link', () => {
    vi.setSystemTime(new Date(START.getTime() + 59 * 60_000 + 50_000)) // ten seconds before the end
    render(<InterviewSummary interview={interview} applicationStatus="interview" />)
    expect(screen.getByRole('link', { name: /Join call/ })).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(NOW_TICK_MS) })

    expect(screen.getAllByText('Call ended').length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /Join call/ })).not.toBeInTheDocument()
  })
})
