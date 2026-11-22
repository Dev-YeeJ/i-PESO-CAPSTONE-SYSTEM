import { describe, expect, it } from 'vitest'
import { earliestStartDate, todayInManila } from '../ojt'

describe('internship dates', () => {
  it('works out the Manila date even when UTC is still on the previous day', () => {
    expect(todayInManila(new Date('2026-11-10T23:30:00Z'))).toBe('2026-11-11')
  })

  it('allows start dates up to 30 days back', () => {
    expect(earliestStartDate('2026-11-12')).toBe('2026-10-13')
  })
})
