import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, History } from 'lucide-react'
import { publicSiteContentService } from '@/services/siteContentService'
import { useOfficeInfo } from '@/components/site-content/useSiteContent'
import RichText from '@/components/site-content/RichText'
import LegalPageLayout, { PolicySection } from './LegalPageLayout'
import { POLICY_META, formatPolicyDate } from './policyMeta'

const linkClass = 'font-semibold text-brand-navy underline decoration-brand-gold/50 decoration-2 underline-offset-2 hover:decoration-brand-gold'

/**
 * /privacy-policy, /terms-of-service, /review-guidelines.
 *
 * Shows the version in effect today. Until PESO publishes a change in
 * Site Content → Policy pages that is the original page (version 1); after
 * that it is the published text. `?version=N` opens an earlier version, and
 * a version that takes effect later is announced at the top.
 */
export default function PolicyRoute({ slug }) {
  const meta = POLICY_META[slug]
  const office = useOfficeInfo()
  const [params] = useSearchParams()
  const requested = Number(params.get('version')) || null

  const query = useQuery({
    queryKey: ['policy', slug, requested],
    queryFn: () => (requested ? publicSiteContentService.policyVersion(slug, requested) : publicSiteContentService.policy(slug)),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const { Builtin, ...chrome } = meta
  const data = query.data
  const shown = requested ? data?.requested : data?.current

  if (query.isLoading) {
    return (
      <LegalPageLayout {...chrome} effectiveDate="…" sections={[]}>
        <div role="status" aria-busy="true" className="space-y-4 motion-safe:animate-pulse">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-slate-200/70" />)}
        </div>
      </LegalPageLayout>
    )
  }

  // Can't reach the API (or no such version): the original text is always a safe answer.
  if (query.isError || !shown) return <Builtin />

  const notice = <PolicyNotice slug={slug} data={data} shown={shown} requested={requested} />
  const after = <VersionList slug={slug} versions={data.versions} shownVersion={shown.version} />

  if (shown.is_builtin) return <Builtin notice={notice} after={after} />

  return (
    <LegalPageLayout
      {...chrome}
      effectiveDate={formatPolicyDate(shown.effective_at)}
      sections={shown.sections.map((section) => ({ id: section.id, label: section.title }))}
      notice={notice}
      after={after}
    >
      {shown.summary?.body && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p className="font-bold">{shown.summary.title || 'Summary'}</p>
          <RichText text={shown.summary.body} office={office} className="mt-1 space-y-2" linkClass={linkClass} />
        </div>
      )}
      {shown.sections.map((section, index) => (
        <PolicySection key={section.id} id={section.id} number={index + 1} title={section.title}>
          <RichText text={section.body} office={office} className="space-y-4" linkClass={linkClass} />
        </PolicySection>
      ))}
    </LegalPageLayout>
  )
}

function PolicyNotice({ slug, data, shown, requested }) {
  const current = data.current
  const upcoming = data.upcoming

  if (requested && shown.version !== current.version) {
    const isUpcoming = upcoming && shown.version === upcoming.version
    return (
      <div role="note" className="mb-6 flex items-start gap-3 rounded-xl border border-[#c4d9f7] bg-[#e8f0fc] px-4 py-3 text-sm leading-6 text-brand-navy">
        <History className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          {isUpcoming
            ? <>You are reading <strong>version {shown.version}</strong>, which takes effect on {formatPolicyDate(shown.effective_at)}. </>
            : <>You are reading <strong>version {shown.version}</strong> (effective {formatPolicyDate(shown.effective_at)}). This is not the current version. </>}
          <Link to={`/${slug}`} className={linkClass}>Read the current version</Link>.
        </p>
      </div>
    )
  }

  if (!requested && upcoming) {
    return (
      <div role="note" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-[#fffbeb] px-4 py-3 text-sm leading-6 text-amber-950">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          An updated version takes effect on <strong>{formatPolicyDate(upcoming.effective_at)}</strong>
          {upcoming.change_note ? <>: {upcoming.change_note}</> : null}.{' '}
          <Link to={`/${slug}?version=${upcoming.version}`} className={linkClass}>Read it now</Link>.
        </p>
      </div>
    )
  }

  return null
}

function VersionList({ slug, versions = [], shownVersion }) {
  if (versions.length < 2) return null

  return (
    <section aria-labelledby="policy-versions" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 id="policy-versions" className="font-semibold text-slate-900">Version history</h2>
      <ol className="mt-3 space-y-3 border-l border-slate-200 pl-4 text-sm">
        {versions.map((version) => (
          <li key={version.version} className="relative">
            <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${version.version === shownVersion ? 'bg-brand-navy' : 'bg-slate-300'}`} aria-hidden="true" />
            {version.version === shownVersion ? (
              <p className="font-semibold text-slate-900">Version {version.version} <span className="font-normal text-slate-500">(shown)</span></p>
            ) : (
              <Link to={version.is_current ? `/${slug}` : `/${slug}?version=${version.version}`} className="font-semibold text-brand-navy hover:underline">Version {version.version}</Link>
            )}
            <p className="text-slate-500">
              {version.is_upcoming ? 'Takes effect ' : 'Effective '}{formatPolicyDate(version.effective_at)}
              {version.is_current && <span className="ml-1 font-semibold text-emerald-700">(current)</span>}
            </p>
            {version.change_note && <p className="text-slate-600">{version.change_note}</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}
