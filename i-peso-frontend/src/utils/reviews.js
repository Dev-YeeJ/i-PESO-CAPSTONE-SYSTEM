// Shared by the review screens (job seekers' reviews of employers).

export const MY_REVIEWS_KEY = ['seeker', 'reviews']

export const RECRUITMENT_ASPECTS = {
  communication: 'Communication',
  process: 'Recruitment process',
  professionalism: 'Professionalism',
  posting_accuracy: 'Job posting accuracy',
}

/** An application the employer never answered: only these can be rated. */
export const LIMITED_ASPECTS = ['communication', 'posting_accuracy']

export const EMPLOYMENT_ASPECTS = {
  work_environment: 'Work environment',
  management: 'Management',
  job_accuracy: 'Job matches the posting',
  overall: 'Overall experience',
}

export function aspectsFor(type, limited) {
  if (type === 'employment') return EMPLOYMENT_ASPECTS
  if (limited) return Object.fromEntries(LIMITED_ASPECTS.map((key) => [key, RECRUITMENT_ASPECTS[key]]))
  return RECRUITMENT_ASPECTS
}

/** Has the seeker already reviewed this application or hire (either kind)? */
export const isReviewed = (item) => !!(item?.review || item?.recruitment?.review_id || item?.employment?.review_id)

/**
 * The reviews still open to the seeker, from the API's opportunities list:
 * ONE per application, about the company's hiring process.
 */
export function openActions(opportunities = []) {
  return opportunities
    .filter((item) => item.source === 'application' && !isReviewed(item) && item.recruitment?.allowed)
    .map((item) => ({
      key: `${item.source}-${item.source_id}`,
      type: 'recruitment',
      source: item.source,
      sourceId: item.source_id,
      employerId: item.employer?.id,
      employerName: item.employer?.name,
      employerLogo: item.employer?.logo ?? null,
      jobTitle: item.job_title,
    }))
}

/** One row per company for the "Ready to review" list, each with its jobs, in first-seen order. */
export function groupActionsByCompany(actions = []) {
  const groups = new Map()
  for (const action of actions) {
    const key = action.employerId ?? action.employerName
    if (!groups.has(key)) {
      groups.set(key, { employerId: action.employerId, employerName: action.employerName, employerLogo: action.employerLogo, jobs: [] })
    }
    groups.get(key).jobs.push(action)
  }
  return [...groups.values()]
}

/**
 * A notification links to `?review=application-12-recruitment` (older ones may
 * name another kind; it's ignored). Returns the open review for that job, or
 * the seeker's existing review for it.
 */
export function findRequestedReview(wanted, actions = [], reviews = []) {
  if (!wanted) return {}
  const [source, id] = wanted.split('-')
  const action = actions.find((item) => item.key === `${source}-${id}`)
  if (action) return { action }
  const column = source === 'placement' ? 'placement_record_id' : 'application_id'
  const mine = reviews.find((review) => String(review[column]) === id)
  return mine ? { review: mine } : {}
}
