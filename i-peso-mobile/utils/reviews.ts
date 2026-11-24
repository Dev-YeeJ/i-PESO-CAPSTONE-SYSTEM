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

/** The review the seeker can still write for one application — what the form needs. */
export interface ReviewAction {
  /** e.g. "application-12" — a `review` route param may add a kind ("application-12-recruitment"). */
  key: string
  type: ReviewType
  source: ReviewSource
  sourceId: number
  employerId: number | null | undefined
  employerName: string | null | undefined
  /** Stored logo path (see utils/companyLogoUrl). */
  employerLogo: string | null
  jobTitle: string | null | undefined
}

/** One company in the "Ready to review" list, with every job there still to review. */
export interface ReviewCompanyGroup {
  employerId: number | null | undefined
  employerName: string | null | undefined
  employerLogo: string | null
  jobs: ReviewAction[]
}

/** Has the seeker already reviewed this application? */
export const isReviewed = (item: ReviewOpportunity | undefined): boolean =>
  !!(item?.review || item?.recruitment?.review_id || item?.employment?.review_id)

/** ONE review of the hiring process per application not reviewed yet, from the API's opportunities list. */
export function openActions(opportunities: ReviewOpportunity[] = []): ReviewAction[] {
  return opportunities
    .filter((item) => item.source === 'application' && !isReviewed(item) && item.recruitment?.allowed)
    .map((item) => ({
      key: `${item.source}-${item.source_id}`,
      type: 'recruitment' as ReviewType,
      source: item.source,
      sourceId: item.source_id,
      employerId: item.employer?.id,
      employerName: item.employer?.name,
      employerLogo: item.employer?.logo ?? null,
      jobTitle: item.job_title,
    }))
}

/** One row per company for "Ready to review", each with its jobs, in first-seen order (mirrors the web helper). */
export function groupActionsByCompany(actions: ReviewAction[] = []): ReviewCompanyGroup[] {
  const groups = new Map<string | number, ReviewCompanyGroup>()
  for (const action of actions) {
    const key = action.employerId ?? action.employerName ?? action.key
    if (!groups.has(key)) {
      groups.set(key, { employerId: action.employerId, employerName: action.employerName, employerLogo: action.employerLogo, jobs: [] })
    }
    groups.get(key)!.jobs.push(action)
  }
  return [...groups.values()]
}

/**
 * Resolves a `review` deep-link key ("application-12-recruitment") the way MyReviewsPage
 * does: the open review for that application, else the seeker's existing review for it.
 * Any kind named in the key is ignored.
 */
export function resolveReviewKey(
  key: string | undefined,
  actions: ReviewAction[],
  reviews: OwnReview[],
): { action?: ReviewAction; review?: OwnReview } {
  if (!key) return {}
  const [source, id] = key.split('-')
  const action = actions.find((item) => item.key === `${source}-${id}`)
  if (action) return { action }
  const mine = reviews.find((review) => String(review[source === 'placement' ? 'placement_record_id' : 'application_id']) === id)
  return mine ? { review: mine } : {}
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
