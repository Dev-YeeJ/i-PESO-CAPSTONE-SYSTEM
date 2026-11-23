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

export const REVIEW_TYPES = {
  recruitment: { label: 'The hiring process', hint: 'Applying, interviews and how they kept you informed.' },
  employment: { label: 'Working here', hint: 'What it is like to work for this company.' },
}

/** Has the seeker already reviewed this application or hire (either kind)? */
export const isReviewed = (item) => !!(item?.review || item?.recruitment?.review_id || item?.employment?.review_id)

/**
 * The reviews still open to the seeker, from the API's opportunities list:
 * ONE per application or hire. `types` lists what it may be about — the
 * hiring process (from the moment they apply) and/or working there (verified
 * hires, from their start date).
 */
export function openActions(opportunities = []) {
  return opportunities
    .filter((item) => !isReviewed(item) && (item.recruitment?.allowed || item.employment?.allowed))
    .map((item) => {
      const types = ['recruitment', 'employment'].filter((type) => item[type]?.allowed)
      return {
        key: `${item.source}-${item.source_id}`,
        types,
        // Someone who worked there most likely wants to review the workplace.
        type: types.includes('employment') ? 'employment' : types[0],
        source: item.source,
        sourceId: item.source_id,
        employerName: item.employer?.name,
        jobTitle: item.job_title,
        // Shown under a "Working here" option that isn't open yet.
        employmentReason: item.source === 'application' && !item.employment?.allowed ? item.employment?.reason : null,
      }
    })
}

/**
 * A notification links to `?review=application-12-employment` (older ones may
 * name either kind). Returns the open action with that kind preselected when
 * it is allowed, or the seeker's existing review for that job.
 */
export function findRequestedReview(wanted, actions = [], reviews = []) {
  if (!wanted) return {}
  const [source, id, type] = wanted.split('-')
  const action = actions.find((item) => item.key === `${source}-${id}`)
  if (action) return { action: action.types.includes(type) ? { ...action, type } : action }
  const column = source === 'placement' ? 'placement_record_id' : 'application_id'
  const mine = reviews.find((review) => String(review[column]) === id)
  if (!mine) return {}
  return { review: type && (mine.allowed_types ?? []).includes(type) ? { ...mine, preferredType: type } : mine }
}
