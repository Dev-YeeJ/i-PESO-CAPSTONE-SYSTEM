import { describe, expect, it } from 'vitest'
import { calendarEventPhase, interviewPhase, interviewPhaseLabel, nextInterviewOf } from '../interview'

const start = new Date('2026-11-10T09:00:00+08:00').getTime()
const online = { mode_of_interview: 'online', schedule: '2026-11-10T09:00:00+08:00', ends_at: '2026-11-10T10:00:00+08:00', phase: 'upcoming' }

describe('interviewPhase', () => {
  it('moves from upcoming to happening now to ended on the clock, even with a stale server phase', () => {
    expect(interviewPhase(online, start - 1)).toBe('upcoming')
    expect(interviewPhase(online, start + 10 * 60_000)).toBe('in_progress')
    expect(interviewPhase(online, start + 60 * 60_000)).toBe('ended')
  })

  it('trusts the server when it says ended or cancelled', () => {
    expect(interviewPhase({ ...online, phase: 'cancelled' }, start + 2 * 60 * 60_000)).toBe('cancelled')
    expect(interviewPhase({ ...online, phase: 'ended' }, start - 1)).toBe('ended')
  })

  it('assumes a one-hour interview when ends_at is missing', () => {
    const legacy = { mode_of_interview: 'phone', schedule: online.schedule }
    expect(interviewPhase(legacy, start + 59 * 60_000)).toBe('in_progress')
    expect(interviewPhase(legacy, start + 60 * 60_000)).toBe('ended')
  })
})

describe('interviewPhaseLabel', () => {
  it('says "Call ended" for calls and "Interview ended" for face-to-face', () => {
    const after = start + 2 * 60 * 60_000
    expect(interviewPhaseLabel(online, after).label).toBe('Call ended')
    expect(interviewPhaseLabel({ ...online, mode_of_interview: 'face_to_face' }, after).label).toBe('Interview ended')
  })
})

describe('calendarEventPhase', () => {
  it('reads a calendar event (start/end) against the clock, not the phase it was loaded with', () => {
    const event = { start: online.schedule, end: online.ends_at, phase: 'upcoming', mode_of_interview: 'online' }
    expect(calendarEventPhase(event, start + 5 * 60_000)).toBe('in_progress')
    expect(calendarEventPhase(event, start + 61 * 60_000)).toBe('ended')
  })
})

describe('nextInterviewOf', () => {
  const at = (iso, extra = {}) => ({ status: 'interview', interview: { mode_of_interview: 'online', schedule: iso, ...extra } })

  it('keeps an interview that is happening now ahead of later ones', () => {
    const live = at('2026-11-10T09:00:00+08:00')
    const later = at('2026-11-10T13:00:00+08:00')
    expect(nextInterviewOf([later, live], start + 15 * 60_000)).toBe(live)
  })

  it('otherwise picks the soonest upcoming one and skips ended, cancelled and non-interview applications', () => {
    const ended = at('2026-11-09T09:00:00+08:00')
    const cancelled = at('2026-11-10T15:00:00+08:00', { phase: 'cancelled' })
    const soon = at('2026-11-10T11:00:00+08:00')
    const later = at('2026-11-11T09:00:00+08:00')
    const hired = { status: 'hired', interview: { schedule: '2026-11-10T10:30:00+08:00' } }
    expect(nextInterviewOf([later, ended, cancelled, hired, soon], start + 90 * 60_000)).toBe(soon)
    expect(nextInterviewOf([ended], start)).toBeNull()
  })
})
