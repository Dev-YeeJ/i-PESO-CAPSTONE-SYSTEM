// Shared by the review screens (job seekers' reviews of employers).
// Mirrors i-peso-frontend/src/utils/reviews.js — keep the two in step.
import type { OwnReview, ReviewOpportunity, ReviewSource, ReviewType } from '@/services/seekerService'

export const MY_REVIEWS_KEY = ['seeker', 'reviews'] as const

/** Community guidelines live on the website; the app opens them in the browser. Defined in utils/links.ts. */
export { REVIEW_GUIDELINES_URL } from './links'

export const RECRUITMENT_ASPECTS: Record<string, string> = {
  communication: 'Communication',
  process: 'Recruitment process',
  professionalism: 'Professionalism',
  posting_accuracy: 'Job posting accuracy',
}

/** An application the employer never answered: only these can be rated. */
export const LIMITED_ASPECTS = ['communication', 'posting_accuracy']

export const EMPLOYMENT_ASPECTS: Record<string, string> = {
  work_environment: 'Work environment',
  management: 'Management',
  job_accuracy: 'Job matches the posting',
  overall: 'Overall experience',
}

export function aspectsFor(type: ReviewType, limited?: boolean): Record<string, string> {
  if (type === 'employment') return EMPLOYMENT_ASPECTS
  if (limited) return Object.fromEntries(LIMITED_ASPECTS.map((key) => [key, RECRUITMENT_ASPECTS[key]]))
  return RECRUITMENT_ASPECTS
}

export const REVIEW_TYPE_OPTIONS: Record<ReviewType, { label: string; hint: string }> = {
  recruitment: { label: 'The hiring process', hint: 'Applying, interviews and how they kept you informed.' },
  employment: { label: 'Working here', hint: 'What it is like to work for this company.' },
}

/** The review the seeker can still write for one job — what the form needs. */
export interface ReviewAction {
  /** e.g. "application-12" — a `review` route param may add the kind ("application-12-employment"). */
  key: string
  /** What it may be about: the hiring process (from applying) and/or working there (verified hires). */
  types: ReviewType[]
  /** Preselected kind. */
  type: ReviewType
  source: ReviewSource
  sourceId: number
  employerName: string | null | undefined
  jobTitle: string | null | undefined
  /** Why "Working here" isn't open yet (applications only). */
  employmentReason: string | null
}

/** Has the seeker already reviewed this application or hire (either kind)? */
export const isReviewed = (item: ReviewOpportunity | undefined): boolean =>
  !!(item?.review || item?.recruitment?.review_id || item?.employment?.review_id)

/** ONE review per application or hire that isn't reviewed yet, from the API's opportunities list. */
export function openActions(opportunities: ReviewOpportunity[] = []): ReviewAction[] {
  return opportunities
    .filter((item) => !isReviewed(item) && (item.recruitment?.allowed || item.employment?.allowed))
    .map((item) => {
      const types = (['recruitment', 'employment'] as ReviewType[]).filter((type) => item[type]?.allowed)
      return {
        key: `${item.source}-${item.source_id}`,
        types,
        // Someone who worked there most likely wants to review the workplace.
        type: types.includes('employment') ? 'employment' : types[0],
        source: item.source,
        sourceId: item.source_id,
        employerName: item.employer?.name,
        jobTitle: item.job_title,
        employmentReason: item.source === 'application' && !item.employment?.allowed ? item.employment?.reason ?? null : null,
      }
    })
}

/**
 * Resolves a `review` deep-link key ("application-12-employment") the way MyReviewsPage
 * does: the open review for that job with that kind preselected (when allowed), else the
 * seeker's existing review for it.
 */
export function resolveReviewKey(
  key: string | undefined,
  actions: ReviewAction[],
  reviews: OwnReview[],
): { action?: ReviewAction; review?: OwnReview & { preferredType?: ReviewType } } {
  if (!key) return {}
  const [source, id, type] = key.split('-')
  const action = actions.find((item) => item.key === `${source}-${id}`)
  if (action) return { action: action.types.includes(type as ReviewType) ? { ...action, type: type as ReviewType } : action }
  const mine = reviews.find((review) => String(review[source === 'placement' ? 'placement_record_id' : 'application_id']) === id)
  if (!mine) return {}
  return { review: type && (mine.allowed_types ?? []).includes(type as ReviewType) ? { ...mine, preferredType: type as ReviewType } : mine }
}

/** The `review` route param a review_invitation notification points at, or null. */
export function reviewKeyFromNotification(data: {
  review_type?: string | null
  application_id?: number | string | null
  placement_record_id?: number | string | null
}): string | null {
  if (!data.review_type) return null
  if (data.application_id) return `application-${data.application_id}-${data.review_type}`
  if (data.placement_record_id) return `placement-${data.placement_record_id}-${data.review_type}`
  return null
}

/** "2026-11-25" → "November 25, 2026" (en-PH), parsed as a local date. */
export function formatReviewDate(value: string, withYear = true): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-PH', withYear ? { month: 'long', day: 'numeric', year: 'numeric' } : { month: 'long', day: 'numeric' })
}
