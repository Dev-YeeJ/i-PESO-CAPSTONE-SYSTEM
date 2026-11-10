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

/** The review actions still open to the seeker, from the API's opportunities list. */
export function openActions(opportunities = []) {
  return opportunities.flatMap((item) => ['recruitment', 'employment']
    .filter((type) => item[type]?.allowed && !item[type]?.review_id)
    .map((type) => ({
      key: `${item.source}-${item.source_id}-${type}`,
      type,
      source: item.source,
      sourceId: item.source_id,
      employerName: item.employer?.name,
      jobTitle: item.job_title,
      limited: !!item[type]?.limited,
    })))
}
