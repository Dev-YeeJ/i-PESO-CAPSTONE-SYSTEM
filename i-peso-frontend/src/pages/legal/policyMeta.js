import { Scale, ShieldCheck, Star } from 'lucide-react'
import PrivacyPolicyPage from './PrivacyPolicyPage'
import ReviewGuidelinesPage from './ReviewGuidelinesPage'
import TermsOfServicePage from './TermsOfServicePage'

/**
 * The fixed page chrome for each policy. Staff edit the text of a policy in
 * Site Content → Policy pages; the badge, title and description stay here.
 * `Builtin` is the original hand-written page (version 1), shown until PESO
 * publishes a new version.
 */
export const POLICY_META = {
  'privacy-policy': {
    Builtin: PrivacyPolicyPage,
    badge: 'Republic Act No. 10173 · Data Privacy Act of 2012',
    badgeIcon: ShieldCheck,
    title: 'Privacy Policy',
    description: 'This policy explains what personal data the i-PESO Urdaneta City Employment Portal collects, why, and what rights you have over it.',
    crossLink: { to: '/terms-of-service', label: 'Terms of Service' },
  },
  'terms-of-service': {
    Builtin: TermsOfServicePage,
    badge: 'Terms of Service Agreement',
    badgeIcon: Scale,
    title: 'Terms of Service',
    description: 'The rules for using the i-PESO Urdaneta City Employment Portal, for both job seekers and employers.',
    crossLink: { to: '/privacy-policy', label: 'Privacy Policy' },
  },
  'review-guidelines': {
    Builtin: ReviewGuidelinesPage,
    badge: 'Verified reviews · i-PESO Urdaneta City',
    badgeIcon: Star,
    title: 'Review Guidelines',
    description: 'How job seekers and employers give feedback on i-PESO, what is allowed, and how PESO keeps it fair for both sides.',
    crossLink: { to: '/privacy-policy', label: 'Privacy Policy' },
  },
}

/** "2026-09-09" → "September 9, 2026" (a calendar date, so no timezone shift). */
export function formatPolicyDate(value) {
  if (!value) return ''
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
