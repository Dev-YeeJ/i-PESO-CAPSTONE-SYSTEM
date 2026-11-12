import { Building2, MapPin, UsersRound } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui'
import CompanyFacts from '@/components/employers/CompanyFacts'
import CompanyLogo from '@/components/employers/CompanyLogo'
import { employerDisplayName, employerRegisteredName, formatCompanySize, formatIndustry } from '@/utils/employerProfile'

const STATUS = {
  verified: 'Verified by PESO',
  approved: 'Verified by PESO',
  pending: 'Verification in progress',
  rejected: 'Needs attention',
}

export default function EmployerProfilePreview({ employer, verificationStatus }) {
  const name = employerDisplayName(employer)
  const registeredName = employerRegisteredName(employer)
  const industry = formatIndustry(employer?.industry)
  const status = verificationStatus ?? employer?.verification_status
  const address = employer?.full_address
    ?? employer?.business_address
    ?? [employer?.house_unit_street, employer?.barangay, employer?.city_municipality, employer?.province].filter(Boolean).join(', ')
  const profile = {
    ...employer,
    full_address: address,
    company_logo_url: employer?.company_logo_url ?? employer?.company_logo,
  }

  return (
    <div className="space-y-5">
      <header className="relative isolate overflow-hidden rounded-[28px] bg-brand-navy text-white shadow-[0_24px_60px_-28px_rgba(18,53,99,0.65)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-brand-gold/25 blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 h-80 w-[28rem] rounded-full bg-sky-400/15 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px]" />
        </div>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:p-8">
          <CompanyLogo src={profile.company_logo_url} name={name} size="xl" className="shrink-0 rounded-3xl border-white/90 shadow-xl" />
          <div className="min-w-0 flex-1">
            {STATUS[status] && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
                {STATUS[status]}
              </span>
            )}
            <h1 className="mt-3 break-words text-2xl font-black tracking-tight sm:text-3xl">{name}</h1>
            {registeredName && registeredName !== name && <p className="mt-1 text-sm text-blue-100/80">Registered as {registeredName}</p>}
            <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-blue-50" aria-label="Company highlights">
              {industry && <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15"><Building2 className="h-3.5 w-3.5" aria-hidden />{industry}</li>}
              {profile.company_size && <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15"><UsersRound className="h-3.5 w-3.5" aria-hidden />{formatCompanySize(profile.company_size)}</li>}
              {profile.city_municipality && <li className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15"><MapPin className="h-3.5 w-3.5" aria-hidden />{profile.city_municipality}</li>}
            </ul>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]">
        <Card className="rounded-3xl border-slate-200/80 p-6 shadow-sm sm:p-7">
          <CardHeader title="About the company" />
          {profile.company_description?.trim()
            ? <p className="max-w-prose whitespace-pre-line text-[15px] leading-7 text-slate-700">{profile.company_description}</p>
            : <p className="text-sm text-slate-500">This employer hasn't added a company description yet.</p>}
        </Card>
        <Card className="rounded-3xl border-slate-200/80 p-6 shadow-sm sm:p-7">
          <CardHeader title="Company facts" />
          <CompanyFacts employer={profile} columns={1} />
        </Card>
      </div>
    </div>
  )
}
