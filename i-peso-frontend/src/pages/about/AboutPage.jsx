import { createElement } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Compass, ExternalLink, Landmark, Target } from 'lucide-react'
import IPesoLogo from '@/components/branding/IPesoLogo'
import { useSiteContent } from '@/components/site-content/useSiteContent'
import { useSystemStatus } from '@/components/system/useSystemStatus'
import OfficeContactCard from '@/components/site-content/OfficeContactCard'
import RichText from '@/components/site-content/RichText'
import { SERVICE_AUDIENCES } from '@/components/site-content/siteContentDefaults'

const isInternal = (url) => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')
const audienceLabel = (value) => SERVICE_AUDIENCES.find((a) => a.value === value)?.label ?? 'Everyone'

/**
 * /about — who PESO Urdaneta City is and what it offers. Every word comes
 * from Content Modules → About PESO; blocks PESO has not filled in (mission,
 * vision) are simply not shown.
 */
export default function AboutPage() {
  const navigate = useNavigate()
  const { about, office } = useSiteContent()
  const { chatbot_enabled: assistantOn } = useSystemStatus()
  const statements = [
    about.mission && { icon: Target, label: 'Mission', text: about.mission },
    about.vision && { icon: Compass, label: 'Vision', text: about.vision },
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-[#0A192F] font-sans text-white">
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
        <div className="flex cursor-pointer items-center gap-3" onClick={() => navigate('/')}>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-blue-500/20">
            <IPesoLogo className="h-full w-full" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none tracking-wide text-white">i-PESO</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-blue-300">Urdaneta City</p>
          </div>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </nav>

      <header className="relative z-10 mx-auto max-w-4xl px-6 pb-14 pt-6 text-center sm:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/30 px-4 py-2 text-xs font-medium text-slate-300 backdrop-blur-sm">
          <Landmark className="h-4 w-4 text-yellow-500" aria-hidden="true" /> Public Employment Service Office
        </span>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{about.headline}</h1>
        <RichText text={about.intro} office={office} className="mx-auto mt-4 max-w-2xl space-y-3 text-base leading-7 text-slate-400" linkClass="font-semibold text-white underline" />
      </header>

      <main className="relative z-10 bg-[#F8F7F2] text-slate-900">
        <div className="mx-auto max-w-5xl space-y-12 px-6 py-14 sm:px-8">
          {statements.length > 0 && (
            <section aria-label="Mission and vision" className={`grid gap-4 ${statements.length > 1 ? 'md:grid-cols-2' : ''}`}>
              {statements.map(({ icon, label, text }) => (
                <div key={label} className="rounded-2xl border border-[#0A192F]/10 bg-white p-6">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#B45309]">
                    {createElement(icon, { className: 'h-4 w-4', 'aria-hidden': true })} {label}
                  </p>
                  <RichText text={text} office={office} className="mt-3 space-y-2 text-base leading-7 text-slate-800" />
                </div>
              ))}
            </section>
          )}

          {about.services?.length > 0 && (
            <section aria-labelledby="services-heading">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B45309]">What we offer</p>
              <h2 id="services-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A192F]">PESO services</h2>
              <p className="mt-2 text-sm text-slate-600">All PESO employment services are free.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {about.services.map((service, index) => (
                  <article key={`${index}-${service.title}`} className="flex flex-col rounded-2xl border border-[#0A192F]/10 bg-white p-5">
                    <span className="w-fit rounded-full bg-[#0A192F]/5 px-2.5 py-0.5 text-[11px] font-bold text-[#0A192F]">{audienceLabel(service.audience)}</span>
                    <h3 className="mt-3 font-bold text-[#0A192F]">{service.title}</h3>
                    <p className="mt-1.5 flex-1 text-sm leading-6 text-slate-600">{service.description}</p>
                    {service.link_url && (
                      isInternal(service.link_url) ? (
                        <Link to={service.link_url} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#0A192F] hover:text-[#B45309]">
                          {service.link_label || 'Learn more'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      ) : (
                        <a href={service.link_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#0A192F] hover:text-[#B45309]">
                          {service.link_label || 'Learn more'} <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                      )
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {about.mandate && (
            <section aria-labelledby="mandate-heading" className="rounded-2xl border border-[#0A192F]/10 bg-white p-6">
              <h2 id="mandate-heading" className="text-xs font-black uppercase tracking-wide text-slate-500">Our mandate</h2>
              <RichText text={about.mandate} office={office} className="mt-2 space-y-2 text-sm leading-7 text-slate-700" />
            </section>
          )}

          <OrgChart people={about.org_chart ?? []} />

          <OfficeContactCard office={office} />
          {assistantOn && (
            <p className="text-center text-sm text-slate-600">
              Have a question? Ask the <strong className="text-[#0A192F]">i-PESO assistant</strong> — the chat button at the bottom right of the page.
            </p>
          )}
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 bg-[#071122] px-6 py-8 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-3 font-semibold text-slate-400">
          <Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <Link to="/terms-of-service" className="hover:text-white">Terms of Service</Link>
        </div>
      </footer>
    </div>
  )
}

const initialsOf = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

/**
 * The office's organization chart, from Content Modules → About PESO. Office
 * head on top, then each unit head with the staff who share their unit name;
 * anyone else is listed under "Other staff". Not shown while PESO hasn't
 * entered it.
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
    <section aria-labelledby="team-heading">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B45309]">Who we are</p>
      <h2 id="team-heading" className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A192F]">Our team</h2>

      {heads.length > 0 && (
        <ul className="mt-6 flex flex-wrap justify-center gap-4">
          {heads.map((person, index) => (
            <li key={`head-${index}`} className="flex min-w-[16rem] items-center gap-3 rounded-2xl bg-[#0A192F] px-5 py-4 text-white">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-[#0A192F]" aria-hidden="true">{initialsOf(person.name)}</span>
              <span>
                <span className="block font-bold">{person.name}</span>
                <span className="block text-sm text-slate-300">{person.position}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {heads.length > 0 && (units.length > 0 || others.length > 0) && (
        <div className="mx-auto h-8 w-px bg-[#0A192F]/20" aria-hidden="true" />
      )}

      {units.length > 0 && (
        <ul className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${heads.length ? '' : 'mt-6'}`}>
          {units.map(({ head, members }, index) => (
            <li key={`unit-${index}`} className="rounded-2xl border border-[#0A192F]/10 bg-white p-5">
              {head.unit && <p className="text-[11px] font-black uppercase tracking-wide text-[#B45309]">{head.unit}</p>}
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A192F]/5 text-xs font-black text-[#0A192F]" aria-hidden="true">{initialsOf(head.name)}</span>
                <span>
                  <span className="block font-bold text-[#0A192F]">{head.name}</span>
                  <span className="block text-sm text-slate-600">{head.position}</span>
                </span>
              </div>
              {members.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-[#0A192F]/10 pt-4">
                  {members.map((person, memberIndex) => (
                    <li key={`member-${memberIndex}`} className="text-sm">
                      <span className="font-semibold text-slate-800">{person.name}</span>
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
        <div className="mt-6 rounded-2xl border border-[#0A192F]/10 bg-white p-5">
          <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">{units.length ? 'Other staff' : 'Staff'}</h3>
          <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((person, index) => (
              <li key={`staff-${index}`} className="text-sm">
                <span className="font-semibold text-slate-800">{person.name}</span>
                <span className="text-slate-500">, {person.position}{person.unit ? ` (${person.unit})` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
