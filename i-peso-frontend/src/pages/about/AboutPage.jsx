import { createElement } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Building2, Compass, ExternalLink, Scale, Target, UserRound, Users } from 'lucide-react'
import { useSiteContent } from '@/components/site-content/useSiteContent'
import { useSystemStatus } from '@/components/system/useSystemStatus'
import OfficeContactCard from '@/components/site-content/OfficeContactCard'
import RichText from '@/components/site-content/RichText'
import { PublicFooter, PublicHeader } from '@/components/landing/PublicChrome'

const isInternal = (url) => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')

// Services are grouped by who they are for, in this order.
const AUDIENCE_GROUPS = [
  { value: 'seekers', label: 'For job seekers', icon: UserRound },
  { value: 'employers', label: 'For employers', icon: Building2 },
  { value: 'everyone', label: 'For everyone', icon: Users },
]

/**
 * /about — who PESO Urdaneta City is and what it offers. Every word comes
 * from Content Modules → About PESO; blocks PESO has not filled in (mission,
 * vision) are simply not shown.
 */
export default function AboutPage() {
  const { about, office } = useSiteContent()
  const { chatbot_enabled: assistantOn } = useSystemStatus()
  const statements = [
    about.mission && { icon: Target, label: 'Mission', text: about.mission },
    about.vision && { icon: Compass, label: 'Vision', text: about.vision },
  ].filter(Boolean)
  const groups = AUDIENCE_GROUPS
    .map((group) => ({ ...group, services: (about.services ?? []).filter((service) => (service.audience || 'everyone') === group.value) }))
    .filter((group) => group.services.length > 0)

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-slate-900">
      <PublicHeader />

      <main className="flex-1">
        <section className={`mx-auto grid max-w-[1280px] gap-10 px-4 pb-14 pt-12 sm:px-8 sm:pt-16 ${about.mandate ? 'lg:grid-cols-[1.1fr_0.9fr] lg:gap-16' : ''}`}>
          <div>
            <h1 className="font-display text-[40px] leading-[1.08] tracking-tight text-brand-navy sm:text-[56px] sm:leading-[1.05]">{about.headline}</h1>
            <RichText text={about.intro} office={office} className="mt-6 max-w-[62ch] space-y-3 text-lg leading-8 text-slate-700" linkClass="font-semibold text-brand-navy underline" />
          </div>
          {about.mandate && (
            <figure className="self-end rounded-2xl bg-brand-navy p-6 text-white sm:p-7">
              <RichText text={about.mandate} office={office} className="space-y-2 text-[17px] leading-7" linkClass="font-semibold text-white underline" />
              <figcaption className="mt-4 flex items-center gap-2 text-sm text-white/70">
                <Scale className="h-4 w-4 text-brand-gold" aria-hidden="true" /> Our legal mandate
              </figcaption>
            </figure>
          )}
        </section>

        {statements.length > 0 && (
          <section aria-label="Mission and vision" className={`mx-auto grid max-w-[1280px] gap-5 px-4 pb-14 sm:px-8 ${statements.length > 1 ? 'md:grid-cols-2' : ''}`}>
            {statements.map(({ icon, label, text }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  {createElement(icon, { className: 'h-5 w-5 text-brand-navy', 'aria-hidden': true })} {label}
                </h2>
                <RichText text={text} office={office} className="mt-3 space-y-2 text-base leading-7 text-slate-700" />
              </div>
            ))}
          </section>
        )}

        {groups.length > 0 && (
          <section aria-labelledby="services-heading" className="bg-brand-canvas py-14 sm:py-16">
            <div className="mx-auto grid max-w-[1280px] gap-10 px-4 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <h2 id="services-heading" className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px] sm:leading-10">What we do</h2>
                <p className="mt-3 max-w-[40ch] text-[15px] leading-7 text-slate-600">Every PESO employment service is free. Some happen online through i-PESO; government programs are applied for in person at the office.</p>
              </div>
              <div className={`grid gap-x-10 gap-y-8 ${groups.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {groups.map((group) => (
                  <div key={group.value}>
                    <h3 className="flex items-center gap-2 pb-2 text-sm font-semibold text-slate-500">
                      {createElement(group.icon, { className: 'h-4 w-4', 'aria-hidden': true })} {group.label}
                    </h3>
                    <ul>
                      {group.services.map((service, index) => (
                        <li key={`${index}-${service.title}`} className="flex gap-4 border-t border-slate-200 py-5">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fc] text-brand-navy"><BadgeCheck className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                          <div>
                            <h4 className="font-semibold text-slate-900">{service.title}</h4>
                            <p className="mt-1 text-[15px] leading-6 text-slate-600">{service.description}</p>
                            {service.link_url && (
                              isInternal(service.link_url) ? (
                                <Link to={service.link_url} className="mt-3 inline-flex text-sm font-semibold text-brand-navy hover:underline">
                                  {service.link_label || 'Learn more'}
                                </Link>
                              ) : (
                                <a href={service.link_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-navy hover:underline">
                                  {service.link_label || 'Learn more'} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                </a>
                              )
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <OrgChart people={about.org_chart ?? []} />

        <section className="mx-auto max-w-[1280px] space-y-5 px-4 py-14 sm:px-8 sm:py-16">
          <OfficeContactCard office={office} />
          {assistantOn && (
            <p className="text-sm text-slate-600">
              Have a question? Ask the <strong className="text-brand-navy">i-PESO assistant</strong> with the chat button at the bottom right of the page.
            </p>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

const initialsOf = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

/**
 * The office's organization chart, from Content Modules. Office head on top,
 * then each unit head with the staff who share their unit name; anyone else
 * is listed under "Other staff". Not shown at all while PESO hasn't entered it.
 */
function OrgChart({ people }) {
  if (!people.length) return null

  const heads = people.filter((p) => p.level === 'head')
  const unitHeads = people.filter((p) => p.level === 'unit_head')
  const staff = people.filter((p) => p.level !== 'head' && p.level !== 'unit_head')
  const unitKey = (unit) => String(unit || '').trim().toLowerCase()
  const headedUnits = new Set(unitHeads.map((p) => unitKey(p.unit)).filter(Boolean))
  const units = unitHeads.map((head) => ({
    head,
    members: head.unit ? staff.filter((p) => unitKey(p.unit) === unitKey(head.unit)) : [],
  }))
  const others = staff.filter((p) => !headedUnits.has(unitKey(p.unit)))

  return (
    <section aria-labelledby="team-heading" className="mx-auto max-w-[1280px] px-4 pt-14 sm:px-8 sm:pt-16">
      <h2 id="team-heading" className="text-[28px] font-bold leading-9 tracking-tight sm:text-[32px] sm:leading-10">Our team</h2>
      <p className="mt-3 max-w-[60ch] text-[15px] leading-7 text-slate-600">The people of PESO Urdaneta City and how the office is organized.</p>

      {heads.length > 0 && (
        <ul className="mt-8 flex flex-wrap justify-center gap-4">
          {heads.map((person, index) => (
            <li key={`head-${index}`} className="flex min-w-[16rem] items-center gap-3 rounded-2xl bg-brand-navy px-5 py-4 text-white">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold" aria-hidden="true">{initialsOf(person.name)}</span>
              <span>
                <span className="block font-semibold">{person.name}</span>
                <span className="block text-sm text-white/75">{person.position}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {heads.length > 0 && (units.length > 0 || others.length > 0) && (
        <div className="mx-auto h-8 w-px bg-slate-300" aria-hidden="true" />
      )}

      {units.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units.map(({ head, members }, index) => (
            <li key={`unit-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              {head.unit && <p className="text-xs font-semibold text-brand-navy">{head.unit}</p>}
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f0fc] text-xs font-bold text-brand-navy" aria-hidden="true">{initialsOf(head.name)}</span>
                <span>
                  <span className="block font-semibold text-slate-900">{head.name}</span>
                  <span className="block text-sm text-slate-600">{head.position}</span>
                </span>
              </div>
              {members.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  {members.map((person, memberIndex) => (
                    <li key={`member-${memberIndex}`} className="text-sm">
                      <span className="font-medium text-slate-800">{person.name}</span>
                      <span className="text-slate-500">, {person.position}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-500">{units.length ? 'Other staff' : 'Staff'}</h3>
          <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((person, index) => (
              <li key={`staff-${index}`} className="text-sm">
                <span className="font-medium text-slate-800">{person.name}</span>
                <span className="text-slate-500">, {person.position}{person.unit ? ` (${person.unit})` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
