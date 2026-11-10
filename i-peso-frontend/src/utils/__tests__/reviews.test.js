import { describe, expect, it } from 'vitest'
import { aspectsFor, openActions } from '../reviews'

describe('openActions', () => {
  const opportunities = [
    {
      source: 'application', source_id: 12, employer: { name: 'Rice Mill' }, job_title: 'Operator',
      recruitment: { allowed: true, limited: false, review_id: null },
      employment: { allowed: true, review_id: null },
    },
    {
      source: 'application', source_id: 13, employer: { name: 'Bakeshop' }, job_title: 'Baker',
      recruitment: { allowed: true, limited: true, review_id: 9 },
      employment: { allowed: false, reason: 'Only for people this employer hired.' },
    },
    {
      source: 'placement', source_id: 4, employer: { name: 'Hardware' }, job_title: 'Clerk',
      recruitment: null,
      employment: { allowed: true, review_id: null },
    },
  ]

  it('lists only reviews that are allowed and not written yet', () => {
    expect(openActions(opportunities).map((action) => action.key)).toEqual([
      'application-12-recruitment',
      'application-12-employment',
      'placement-4-employment',
    ])
  })

  it('keeps what the form needs', () => {
    expect(openActions(opportunities)[2]).toMatchObject({ type: 'employment', source: 'placement', sourceId: 4, employerName: 'Hardware' })
  })
})

describe('aspectsFor', () => {
  it('limits an unanswered application to communication and posting accuracy', () => {
    expect(Object.keys(aspectsFor('recruitment', true))).toEqual(['communication', 'posting_accuracy'])
    expect(Object.keys(aspectsFor('recruitment', false))).toHaveLength(4)
    expect(Object.keys(aspectsFor('employment'))).toContain('work_environment')
  })
})
