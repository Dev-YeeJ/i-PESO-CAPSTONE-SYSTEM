import Badge from '@/components/ui/Badge'

const labels = {
  pending: 'Pending',
  reviewed: 'Reviewed',
  shortlisted: 'Shortlisted',
  interview: 'Interviewing',
  hired: 'Hired',
  rejected: 'Rejected',
  open: 'Open',
  closed: 'Closed',
  ongoing: 'Ongoing',
  completed: 'Completed',
  approved: 'Approved',
  verified: 'Verified',
  active: 'Active',
  draft: 'Draft',
  upcoming: 'Upcoming',
  cancelled: 'Cancelled',
  seeker: 'Job Seeker',
  employer: 'Employer',
  admin: 'Admin',
  // Government program application vocabulary
  under_review: 'Under review',
  qualified: 'Qualified',
  for_interview: 'For interview',
  pending_review: 'Pending review',
}

/** Statuses whose name differs from the Badge variant that should render it. */
const variants = {
  under_review: 'review',
  pending_review: 'review',
  qualified: 'matched',
  for_interview: 'interview',
  completed: 'approved',
  cancelled: 'closed',
}

export function StatusBadge({ status = 'pending' }) {
  const normalized = String(status).toLowerCase()

  return (
    <Badge variant={variants[normalized] ?? normalized}>
      {labels[normalized] ?? status}
    </Badge>
  )
}

export default StatusBadge
