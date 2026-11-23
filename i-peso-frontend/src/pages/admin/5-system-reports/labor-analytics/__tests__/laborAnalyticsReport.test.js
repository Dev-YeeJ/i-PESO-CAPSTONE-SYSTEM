import { describe, expect, it } from 'vitest'
import { buildAnalyticsSpecs, buildForecastAppendix, buildSummary, coverageLines } from '../laborAnalyticsReport'

const data = {
  trends: {
    registered_job_seekers: [{ period: '2026-10', value: 4 }, { period: '2026-11', value: 6 }],
    job_applications_submitted: [{ period: '2026-11', value: 9 }],
  },
  distributions: { gender: [{ label: 'Female', value: 3 }], vacancy_status: [{ label: 'open_for_applications', value: 2 }] },
  top_lists: { companies_with_highest_hires: [{ label: 'Acme', value: 5 }] },
  summary: { total_registered_applicants: 1200, active_participants_definition: 'Seekers who applied or updated a profile.' },
  meta: { unemployment_note: 'Status history is not stored.' },
  forecast: { available: false },
}

describe('Labor Analytics downloads', () => {
  it('describes all 17 chart cards in page order, grouped into the page sections', () => {
    const specs = buildAnalyticsSpecs(data, { period: 'monthly' })
    expect(specs).toHaveLength(17)
    expect(specs[0].title).toBe('Registered Job Seekers vs Job Applications Submitted')
    expect(specs.at(-1).title).toBe('Job Vacancies by Category / Occupation')
    expect([...new Set(specs.map((s) => s.section))]).toEqual([
      'Applicant and employment trends', 'Skills and job demand', 'Location analytics', 'Company and vacancy analytics',
    ])
  })

  it('lines up the two trend series by period, filling gaps with zero', () => {
    const [trend] = buildAnalyticsSpecs(data, { period: 'monthly' })
    expect(trend.rows).toEqual([{ x: '2026-10', a: 4, b: 0 }, { x: '2026-11', a: 6, b: 9 }])
  })

  it('keeps the screen notes and readable labels', () => {
    const specs = buildAnalyticsSpecs(data, { period: 'monthly' })
    expect(specs.find((s) => s.id === 'employment-status').notes).toContain('Status history is not stored.')
    expect(specs.find((s) => s.id === 'vacancies-by-status').items[0].label).toBe('Open For Applications')
    expect(specs.find((s) => s.id === 'companies-highest-hires').unit).toBe('hires')
  })

  it('prints the applied filters as coverage lines', () => {
    expect(coverageLines({ date_from: '2026-11-01', date_to: '2026-11-23', period: 'monthly' }, [['city', 'Urdaneta City']])).toEqual([
      'Coverage: Nov 1, 2026 – Nov 23, 2026', 'Period: Monthly', 'City: Urdaneta City',
    ])
  })

  it('summarises every headline number and skips the forecast when there is none', () => {
    const summary = buildSummary(data)
    expect(summary.rows).toHaveLength(12)
    expect(summary.rows[0]).toEqual(['Total registered applicants', '1,200', '0 complete, 0 incomplete profiles'])
    expect(summary.notes[0]).toBe('Active participants: Seekers who applied or updated a profile.')
    expect(buildForecastAppendix(data)).toEqual([])
  })
})
