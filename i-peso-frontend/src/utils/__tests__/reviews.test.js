import { describe, expect, it } from 'vitest'
import { aspectsFor, findRequestedReview, groupActionsByCompany, isReviewed, openActions } from '../reviews'

const opportunities = [
  {
    source: 'application', source_id: 12, employer: { id: 7, name: 'Rice Mill', logo: 'company_logos/rice.png' }, job_title: 'Operator',
    recruitment: { allowed: true, limited: false, review_id: null },
    employment: null,
    review: null,
  },
  {
    // Already reviewed: one review per application.
    source: 'application', source_id: 13, employer: { name: 'Bakeshop' }, job_title: 'Baker',
    recruitment: { allowed: true, limited: false, review_id: 9 },
    employment: null,
    review: { id: 9, type: 'recruitment', status: 'published' },
  },
  {
    // Older apps may still receive placement hires; there is nothing to review for them now.
    source: 'placement', source_id: 4, employer: { name: 'Hardware' }, job_title: 'Clerk',
    recruitment: null,
    employment: { allowed: true, review_id: null },
    review: null,
  },
]

describe('openActions', () => {
  it('offers one hiring-process review per application not reviewed yet', () => {
    expect(openActions(opportunities)).toEqual([
      { key: 'application-12', type: 'recruitment', source: 'application', sourceId: 12, employerId: 7, employerName: 'Rice Mill', employerLogo: 'company_logos/rice.png', jobTitle: 'Operator' },
    ])
  })
})

describe('groupActionsByCompany', () => {
  const action = (key, employerId, employerName, jobTitle) => ({ key, employerId, employerName, employerLogo: null, jobTitle })

  it('puts every job at one company under a single row, in first-seen order', () => {
    const groups = groupActionsByCompany([
      action('application-1', 3, 'GreenCycle Solutions', 'Service Crew'),
      action('application-2', 5, 'IchiTech Solutions', 'Chef'),
      action('application-3', 3, 'GreenCycle Solutions', 'Janitor'),
    ])

    expect(groups.map((group) => group.employerName)).toEqual(['GreenCycle Solutions', 'IchiTech Solutions'])
    expect(groups[0]).toMatchObject({ employerId: 3, employerLogo: null })
    expect(groups[0].jobs.map((job) => job.jobTitle)).toEqual(['Service Crew', 'Janitor'])
    expect(groups[1].jobs).toHaveLength(1)
  })

  it('returns nothing for no actions', () => {
    expect(groupActionsByCompany([])).toEqual([])
  })
})

describe('isReviewed', () => {
  it('counts an existing review', () => {
    expect(isReviewed(opportunities[1])).toBe(true)
    expect(isReviewed(opportunities[0])).toBe(false)
  })
})

describe('findRequestedReview', () => {
  const actions = openActions(opportunities)
  const reviews = [{ id: 9, application_id: 13, type: 'recruitment' }]

  it('opens the job a notification names, whatever kind the link mentions', () => {
    expect(findRequestedReview('application-12-recruitment', actions, reviews).action).toMatchObject({ key: 'application-12' })
    expect(findRequestedReview('application-12-employment', actions, reviews).action).toMatchObject({ key: 'application-12' })
  })

  it('opens the existing review when the job was already reviewed', () => {
    expect(findRequestedReview('application-13-recruitment', actions, reviews).review).toMatchObject({ id: 9 })
    expect(findRequestedReview(null, actions, reviews)).toEqual({})
  })
})

describe('aspectsFor', () => {
  it('rates every hiring aspect, and keeps the workplace aspects for older reviews', () => {
    expect(Object.keys(aspectsFor('recruitment', false))).toHaveLength(4)
    expect(Object.keys(aspectsFor('employment'))).toContain('work_environment')
  })
})
