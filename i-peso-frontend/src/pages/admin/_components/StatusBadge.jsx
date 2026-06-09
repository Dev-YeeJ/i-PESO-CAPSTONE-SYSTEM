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
}

export function StatusBadge({ status = 'pending' }) {
  const normalized = String(status).toLowerCase()
  return <Badge variant={normalized}>{labels[normalized] ?? status}</Badge>
}

export default StatusBadge
