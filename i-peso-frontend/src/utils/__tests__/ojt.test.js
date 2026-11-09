import { describe, expect, it } from 'vitest'
import { daysLeftLabel, formatClock, formatHours, toTimeInput, todayInManila } from '../ojt'

describe('ojt formatting', () => {
  it('shows times in Philippine time regardless of the device timezone', () => {
    // 01:00 UTC is 9:00 AM in Manila.
    expect(formatClock('2026-11-10T01:00:00+00:00')).toMatch(/9:00\s?(AM|am)/)
    expect(toTimeInput('2026-11-10T09:30:00+00:00')).toBe('17:30')
  })

  it('works out the Manila date even when UTC is still on the previous day', () => {
    expect(todayInManila(new Date('2026-11-10T23:30:00Z'))).toBe('2026-11-11')
  })

  it('formats hours', () => {
    expect(formatHours(8)).toBe('8 hrs')
    expect(formatHours(1)).toBe('1 hr')
    expect(formatHours(7.25)).toBe('7.25 hrs')
    expect(formatHours(null)).toBe('—')
  })

  it('describes the days left', () => {
    expect(daysLeftLabel({ days_left: 0 })).toBe('Last day today')
    expect(daysLeftLabel({ days_left: 1 })).toBe('1 day left')
    expect(daysLeftLabel({ days_left: 12 })).toBe('12 days left')
    expect(daysLeftLabel({ ended: true, days_left: -3 })).toBe('Internship ended')
  })
})
