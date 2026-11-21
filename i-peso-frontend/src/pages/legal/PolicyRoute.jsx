import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, History } from 'lucide-react'
import { publicSiteContentService } from '@/services/siteContentService'
import { useOfficeInfo } from '@/components/site-content/useSiteContent'
import RichText from '@/components/site-content/RichText'
import LegalPageLayout, { PolicySection } from './LegalPageLayout'
import { POLICY_META, formatPolicyDate } from './policyMeta'

const linkClass = 'font-semibold text-[#0A192F] underline decoration-[#B45309]/50 decoration-2 underline-offset-2 hover:decoration-[#B45309]'

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
      <div role="note" className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">
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
      <div role="note" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          An updated version takes effect on <strong>{formatPolicyDate(upcoming.effective_at)}</strong>
          {upcoming.change_note ? <> — {upcoming.change_note}</> : null}.{' '}
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
    <section aria-labelledby="policy-versions" className="mt-10 rounded-2xl border border-[#0A192F]/10 bg-white p-5">
      <h2 id="policy-versions" className="text-xs font-black uppercase tracking-wide text-slate-400">All versions</h2>
      <ol className="mt-3 divide-y divide-slate-100">
        {versions.map((version) => (
          <li key={version.version} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-baseline sm:gap-4">
            <span className="w-44 shrink-0 font-semibold text-[#0A192F]">
              {version.version === shownVersion ? (
                <>Version {version.version} <span className="text-xs font-bold text-[#B45309]">(shown)</span></>
              ) : (
                <Link to={version.is_current ? `/${slug}` : `/${slug}?version=${version.version}`} className={linkClass}>Version {version.version}</Link>
              )}
            </span>
            <span className="w-40 shrink-0 text-slate-500">
              {version.is_upcoming ? 'Takes effect ' : 'Effective '}{formatPolicyDate(version.effective_at)}
              {version.is_current && <span className="ml-1 text-xs font-bold text-emerald-700">· current</span>}
            </span>
            <span className="text-slate-600">{version.change_note}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
