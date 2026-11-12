// Defaults and limits for Site Content. They mirror
// i-peso-backend/app/Support/SiteContentRegistry.php: the pages render these
// while the API loads or if it can't be reached, so the landing page and
// footer are never blank.

import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  FileBadge,
  FileSearch,
  Landmark,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'

export const OFFICE_DEFAULTS = {
  office_name: 'Public Employment Service Office — Urdaneta City',
  address: 'XHG8+FV3, Alexander St, Urdaneta City, Pangasinan',
  map_url: null,
  hours: null,
  phone: '0923 810 2011',
  email: 'pesourdanetacity@gmail.com',
  facebook: 'https://www.facebook.com/profile.php?id=100069233858883',
  fees_policy: null,
  employer_approval_time: null,
}

export const LANDING_DEFAULTS = {
  hero_badge: 'Urdaneta City PESO Employment Portal',
  headline_lead: 'Find Your',
  headline_highlight: 'Perfect Match',
  headline_tail: 'Powered by Smart Technology',
  subheadline: 'Browse job openings, join local job fairs, and browse government programs like SPES and TUPAD — all from one i-PESO account.',
  highlights: ['Free to Use', 'Skill-Tag Matching', 'Verified Opportunities'],
  features_eyebrow: 'What you get',
  features_heading: 'Built for finding work and talent.',
  features: [
    { icon: 'target', title: 'Skill-tag matching', body: 'Stop guessing keywords. We score your skills against requirements to show you the best fits.' },
    { icon: 'map-pin', title: 'Location-Aware', body: 'See jobs available in your immediate vicinity and across the region, instantly sorted by distance.' },
    { icon: 'file-search', title: 'Ranked Applicants', body: 'Instantly see who actually has the required skills with our automated matching score.' },
    { icon: 'users', title: 'Centralized Screening', body: 'Review applications, schedule interviews, and hire directly from your dashboard.' },
  ],
  footer_tagline: 'Urdaneta City PESO Employment Portal',
}

/** Character limits — the same numbers the API enforces. */
export const OFFICE_LIMITS = {
  office_name: 120,
  address: 200,
  map_url: 500,
  hours: 150,
  phone: 30,
  email: 120,
  facebook: 300,
  fees_policy: 300,
  employer_approval_time: 150,
}

export const LANDING_LIMITS = {
  hero_badge: 60,
  headline_lead: 40,
  headline_highlight: 40,
  headline_tail: 60,
  subheadline: 220,
  highlight: 30,
  features_eyebrow: 30,
  features_heading: 70,
  feature_title: 40,
  feature_body: 160,
  footer_tagline: 100,
}

export const FEATURE_ICONS = {
  target: { icon: Target, label: 'Target' },
  'map-pin': { icon: MapPin, label: 'Map pin' },
  'file-search': { icon: FileSearch, label: 'Document search' },
  users: { icon: Users, label: 'People' },
  briefcase: { icon: Briefcase, label: 'Briefcase' },
  'calendar-days': { icon: CalendarDays, label: 'Calendar' },
  'check-circle': { icon: CheckCircle2, label: 'Check mark' },
  'file-badge': { icon: FileBadge, label: 'Certificate' },
  landmark: { icon: Landmark, label: 'Government building' },
  search: { icon: Search, label: 'Search' },
  sparkles: { icon: Sparkles, label: 'Sparkles' },
  'shield-check': { icon: ShieldCheck, label: 'Shield' },
}

export const featureIcon = (name) => FEATURE_ICONS[name]?.icon ?? Target

export const FAQ_TOPICS = [
  { value: 'account', label: 'Registration & account' },
  { value: 'jobs', label: 'Jobs & applications' },
  { value: 'verification', label: 'Employer verification' },
  { value: 'job_fairs', label: 'Job fairs' },
  { value: 'programs', label: 'Government programs' },
  { value: 'reports', label: 'Employer reports' },
  { value: 'office', label: 'Office & services' },
]

export const FAQ_AUDIENCES = [
  { value: 'everyone', label: 'Everyone', help: 'Public Help page, the landing page (if featured), and both portals.' },
  { value: 'seekers', label: 'Job seekers', help: 'Only signed-in job seekers (web and mobile app).' },
  { value: 'employers', label: 'Employers', help: 'Only signed-in employers, including those still being verified.' },
]

/** Merge an API payload over defaults; keeps a saved null (blank = not on record). */
export function withDefaults(defaults, values) {
  if (!values || typeof values !== 'object') return { ...defaults }
  const merged = { ...defaults }
  Object.keys(defaults).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) merged[key] = values[key]
  })
  return merged
}

/** A Google Maps search link for the address, used when no map link is saved. */
export const mapLinkFor = (office) =>
  office?.map_url || (office?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(office.address)}` : null)

/** Digits-only phone for tel: links. */
export const telHref = (phone) => (phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null)
