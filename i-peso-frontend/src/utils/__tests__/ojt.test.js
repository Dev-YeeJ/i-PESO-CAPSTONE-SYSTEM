import { describe, expect, it } from 'vitest'
import { daysLeftLabel, earliestStartDate, endDateFor, formatClock, formatHours, toTimeInput, todayInManila, workingDaysBetween, workingDaysNeeded } from '../ojt'

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

describe('internship planning', () => {
  it('needs one working day per 8 hours, rounding up', () => {
    expect(workingDaysNeeded(486)).toBe(61)
    expect(workingDaysNeeded(240)).toBe(30)
    expect(workingDaysNeeded('')).toBe(0)
  })

  it('counts Monday to Friday only when working out the end date', () => {
    // Monday Nov 16, 2026 + 5 working days → Friday Nov 20.
    expect(endDateFor('2026-11-16', 40)).toBe('2026-11-20')
    // Starting on a Saturday: the first working day is Monday.
    expect(endDateFor('2026-11-14', 8)).toBe('2026-11-16')
    // 486 hours from Monday Nov 16 → 61 working days: 60 end Friday Feb 5, so Monday Feb 8, 2027.
    expect(endDateFor('2026-11-16', 486)).toBe('2027-02-08')
    expect(endDateFor('', 486)).toBe('')
  })

  it('counts working days between two dates', () => {
    expect(workingDaysBetween('2026-11-16', '2026-11-22')).toBe(5)
    expect(workingDaysBetween('2026-11-20', '2026-11-16')).toBe(0)
  })

  it('allows start dates up to 30 days back', () => {
    expect(earliestStartDate('2026-11-12')).toBe('2026-10-13')
  })
})
