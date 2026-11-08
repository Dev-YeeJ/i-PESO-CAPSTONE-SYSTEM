import { CalendarDays, MapPin, Target, Users } from 'lucide-react'
import { createElement } from 'react'
import { formatCompanySize, formatIndustry, formatMemberSince } from '@/utils/employerProfile'

/**
 * The at-a-glance facts about a company, as a description list. Missing
 * values read "Not provided" in a muted tone rather than disappearing, so the
 * seeker can tell the employer left it blank (vs. the page failing to load it).
 */
export default function CompanyFacts({ employer, columns = 2 }) {
  const facts = [
    { icon: Target, label: 'Industry', value: formatIndustry(employer.industry) },
    { icon: Users, label: 'Company size', value: formatCompanySize(employer.company_size) },
    { icon: MapPin, label: 'Location', value: employer.full_address, wide: true },
    { icon: CalendarDays, label: 'On i-PESO since', value: formatMemberSince(employer.created_at) },
  ]

  return (
    <dl className={`grid gap-x-6 gap-y-4 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
      {facts.map(({ icon, label, value, wide }) => (
        // <dt>/<dd> must be direct children of the <div> inside <dl>, so the
        // icon sits absolutely inside <dt> instead of in a wrapper.
        <div key={label} className={`relative min-h-8 min-w-0 pl-11 ${wide && columns === 2 ? 'sm:col-span-2' : ''}`}>
          <dt className="text-xs font-semibold text-slate-500">
            <span className="absolute left-0 top-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-brand-navy" aria-hidden="true">
              {createElement(icon, { className: 'h-4 w-4' })}
            </span>
            {label}
          </dt>
          <dd className={`mt-0.5 break-words text-sm ${value ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
            {value || 'Not provided'}
          </dd>
        </div>
      ))}
    </dl>
  )
}
