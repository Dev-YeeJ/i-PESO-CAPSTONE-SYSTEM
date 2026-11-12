import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { CalendarClock, ExternalLink, FilePenLine, ScrollText } from 'lucide-react'
import { Badge, Button, Card, ErrorState, LoadingSkeleton } from '@/components/ui'
import { adminPolicyService } from '@/services/siteContentService'
import { formatPolicyDate } from '@/pages/legal/policyMeta'
import PolicyEditor from './PolicyEditor'
import { formatWhen } from './formStyles'

/** Site Content → Policy pages: one card per policy, or the editor for one of them. */
export default function PoliciesTab({ canEdit, office }) {
  const [params, setParams] = useSearchParams()
  const selected = params.get('policy')
  const query = useQuery({ queryKey: ['admin-policies'], queryFn: adminPolicyService.list })

  const open = (slug) => {
    const next = new URLSearchParams(params)
    if (slug) next.set('policy', slug)
    else next.delete('policy')
    setParams(next)
  }

  if (selected) {
    return <PolicyEditor slug={selected} canEdit={canEdit} office={office} onBack={() => open(null)} tokens={query.data?.tokens ?? []} />
  }

  if (query.isLoading) return <LoadingSkeleton variant="card" rows={3} />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-black text-slate-950">Policy pages</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Legal text is never edited in place. Each change becomes a new <strong>version</strong> with its own effective date;
          earlier versions stay readable so anyone can see exactly what they agreed to. Readers see nothing new until you publish.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {query.data.policies.map((policy) => (
          <Card key={policy.slug} className="flex flex-col">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy/5 text-brand-navy"><ScrollText className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0">
                <h3 className="font-black text-slate-950">{policy.title}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Version {policy.current.version} · effective {formatPolicyDate(policy.current.effective_at)}
                  {policy.current.is_builtin ? ' · original text' : ''}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {policy.upcoming && (
                <Badge variant="review"><CalendarClock className="h-3 w-3" aria-hidden="true" /> Version {policy.upcoming.version} from {formatPolicyDate(policy.upcoming.effective_at)}</Badge>
              )}
              {policy.draft && <Badge variant="pending">Draft v{policy.draft.version} · edited {formatWhen(policy.draft.updated_at)}{policy.draft.updated_by ? ` by ${policy.draft.updated_by}` : ''}</Badge>}
              <Badge variant="neutral">{policy.version_count} version{policy.version_count === 1 ? '' : 's'}</Badge>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <Button size="sm" variant={policy.draft ? 'navy' : 'outline'} icon={FilePenLine} onClick={() => open(policy.slug)}>
                {policy.draft ? 'Continue draft' : canEdit ? 'Open' : 'View'}
              </Button>
              <Button size="sm" variant="ghost" icon={ExternalLink} to={`/${policy.slug}`} target="_blank">View page</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
