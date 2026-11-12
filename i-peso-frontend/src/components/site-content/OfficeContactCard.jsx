import { createElement } from 'react'
import { Clock, ExternalLink, Globe, Mail, MapPin, Phone, Wallet } from 'lucide-react'
import { mapLinkFor, telHref } from './siteContentDefaults'

/**
 * PESO office contact details from Site Content → Office info. Fields left
 * blank ("not on record") are simply not shown.
 */
export default function OfficeContactCard({ office, role = null, className = '' }) {
  if (!office) return null
  const mapLink = mapLinkFor(office)

  const rows = [
    office.address && { icon: MapPin, label: 'Address', value: office.address, href: mapLink, linkLabel: 'Get directions', external: true },
    office.hours && { icon: Clock, label: 'Office hours', value: office.hours },
    office.phone && { icon: Phone, label: 'Phone', value: office.phone, href: telHref(office.phone) },
    office.email && { icon: Mail, label: 'Email', value: office.email, href: `mailto:${office.email}` },
    office.facebook && { icon: Globe, label: 'Facebook', value: 'PESO Urdaneta City', href: office.facebook, external: true },
    office.fees_policy && { icon: Wallet, label: 'Fees', value: office.fees_policy },
    role === 'employer' && office.employer_approval_time && { icon: Clock, label: 'Account approval', value: office.employer_approval_time },
  ].filter(Boolean)

  return (
    <section aria-labelledby="office-contact-heading" className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Still need help?</p>
      <h2 id="office-contact-heading" className="mt-1 text-lg font-black tracking-tight text-slate-950">{office.office_name || 'PESO Urdaneta City'}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Visit the PESO office of Urdaneta City.</p>
      ) : (
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {rows.map(({ icon, label, value, href, linkLabel, external }) => (
            <div key={label} className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-navy/5 text-brand-navy">
                {createElement(icon, { className: 'h-4 w-4', 'aria-hidden': true })}
              </span>
              <div className="min-w-0">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="mt-0.5 break-words text-sm font-semibold text-slate-900">
                  {href && !linkLabel ? (
                    <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className="text-brand-navy underline-offset-2 hover:underline">
                      {value}
                    </a>
                  ) : value}
                  {href && linkLabel && (
                    <a href={href} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-xs font-bold text-brand-navy hover:underline">
                      {linkLabel} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
