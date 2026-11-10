// Shared by the review screens (job seekers' reviews of employers).
// Mirrors i-peso-frontend/src/utils/reviews.js — keep the two in step.
import type { OwnReview, ReviewOpportunity, ReviewSource, ReviewType } from '@/services/seekerService'

export const MY_REVIEWS_KEY = ['seeker', 'reviews'] as const

/** Community guidelines live on the website; the app opens them in the browser. */
export const REVIEW_GUIDELINES_URL = 'https://ipeso.website/review-guidelines'

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

/** A review the seeker can still write — what the form needs. */
export interface ReviewAction {
  /** e.g. "application-12-recruitment" — also the `review` route param. */
  key: string
  type: ReviewType
  source: ReviewSource
  sourceId: number
  employerName: string | null | undefined
  jobTitle: string | null | undefined
  limited: boolean
}

const REVIEW_TYPES: ReviewType[] = ['recruitment', 'employment']

/** The review actions still open to the seeker, from the API's opportunities list. */
export function openActions(opportunities: ReviewOpportunity[] = []): ReviewAction[] {
  return opportunities.flatMap((item) => REVIEW_TYPES
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

/**
 * Resolves a `review` deep-link key ("application-12-recruitment") the way MyReviewsPage
 * does: the open action for it, else the seeker's existing review for it.
 */
export function resolveReviewKey(
  key: string | undefined,
  actions: ReviewAction[],
  reviews: OwnReview[],
): { action?: ReviewAction; review?: OwnReview } {
  if (!key) return {}
  const action = actions.find((item) => item.key === key)
  if (action) return { action }
  const [source, id, type] = key.split('-')
  const mine = reviews.find((review) => review.type === type
    && String(review[source === 'placement' ? 'placement_record_id' : 'application_id']) === id)
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
