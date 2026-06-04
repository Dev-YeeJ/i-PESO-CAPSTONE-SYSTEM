// i-peso-frontend/src/components/admin/StatusBadge.jsx

const statusStyles = {
  // Application statuses
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
  reviewed: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Reviewed' },
  shortlisted: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Shortlisted' },
  interview: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Interview' },
  hired: { bg: 'bg-green-50', text: 'text-green-700', label: 'Hired' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected' },

  // Program statuses
  open: { bg: 'bg-green-50', text: 'text-green-700', label: 'Open' },
  closed: { bg: 'bg-slate-50', text: 'text-slate-700', label: 'Closed' },
  ongoing: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Ongoing' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', label: 'Completed' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', label: 'Approved' },

  // Vacancy & Job Fair statuses
  active: { bg: 'bg-green-50', text: 'text-green-700', label: 'Active' },
  draft: { bg: 'bg-slate-50', text: 'text-slate-700', label: 'Draft' },
  upcoming: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Upcoming' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Cancelled' },

  // User roles
  seeker: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Job Seeker' },
  employer: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Employer' },
  admin: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Admin' },
}

export function StatusBadge({ status, type = 'application' }) {
  const style = statusStyles[status.toLowerCase()] || statusStyles.pending

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

export default StatusBadge