import { describe, expect, it } from 'vitest'
import { aspectsFor, findRequestedReview, isReviewed, openActions } from '../reviews'

const opportunities = [
  {
    // Hired and started: may review either the hiring process or working there.
    source: 'application', source_id: 12, employer: { name: 'Rice Mill' }, job_title: 'Operator',
    recruitment: { allowed: true, limited: false, review_id: null },
    employment: { allowed: true, review_id: null },
    review: null,
  },
  {
    // Already reviewed: one review per job, whatever kind it is.
    source: 'application', source_id: 13, employer: { name: 'Bakeshop' }, job_title: 'Baker',
    recruitment: { allowed: true, limited: false, review_id: 9 },
    employment: { allowed: false, reason: 'Only for people this employer hired.', review_id: 9 },
    review: { id: 9, type: 'recruitment', status: 'published' },
  },
  {
    // Just applied: only the hiring process, with the reason working-here is closed.
    source: 'application', source_id: 14, employer: { name: 'Clinic' }, job_title: 'Aide',
    recruitment: { allowed: true, limited: false, review_id: null },
    employment: { allowed: false, reason: 'Only for people this employer hired.', review_id: null },
    review: null,
  },
  {
    source: 'placement', source_id: 4, employer: { name: 'Hardware' }, job_title: 'Clerk',
    recruitment: null,
    employment: { allowed: true, review_id: null },
    review: null,
  },
]

describe('openActions', () => {
  it('offers one review per job that is not reviewed yet', () => {
    expect(openActions(opportunities).map((action) => action.key)).toEqual(['application-12', 'application-14', 'placement-4'])
  })

  it('says what each review may be about, preferring working there for hires', () => {
    const [hired, applied, placement] = openActions(opportunities)
    expect(hired).toMatchObject({ types: ['recruitment', 'employment'], type: 'employment', employmentReason: null })
    expect(applied).toMatchObject({ types: ['recruitment'], type: 'recruitment', employmentReason: 'Only for people this employer hired.' })
    expect(placement).toMatchObject({ types: ['employment'], type: 'employment', source: 'placement', sourceId: 4, employerName: 'Hardware' })
  })
})

describe('isReviewed', () => {
  it('counts a review of either kind', () => {
    expect(isReviewed(opportunities[1])).toBe(true)
    expect(isReviewed(opportunities[0])).toBe(false)
  })
})

describe('findRequestedReview', () => {
  const actions = openActions(opportunities)
  const reviews = [{ id: 9, application_id: 13, type: 'recruitment', allowed_types: ['recruitment'] }]

  it('opens the job a notification names, with its kind preselected when allowed', () => {
    expect(findRequestedReview('application-12-recruitment', actions, reviews).action).toMatchObject({ key: 'application-12', type: 'recruitment' })
    // A kind that isn't open falls back to what is.
    expect(findRequestedReview('application-14-employment', actions, reviews).action).toMatchObject({ key: 'application-14', type: 'recruitment' })
  })

  it('opens the existing review when the job was already reviewed', () => {
    expect(findRequestedReview('application-13-employment', actions, reviews).review).toMatchObject({ id: 9 })
    expect(findRequestedReview('application-13-employment', actions, reviews).review.preferredType).toBeUndefined()
    expect(findRequestedReview(null, actions, reviews)).toEqual({})
  })
})

describe('aspectsFor', () => {
  it('rates every hiring aspect, and the workplace aspects for working there', () => {
    expect(Object.keys(aspectsFor('recruitment', false))).toHaveLength(4)
    expect(Object.keys(aspectsFor('employment'))).toContain('work_environment')
  })
})
